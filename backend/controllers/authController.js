const { db, auth } = require('../config/firebase'); 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Service Layer Link integration
const authService = require('../services/authService');
const tutorValidationService = require('../services/tutorValidationService'); 

// ==========================================
// 1. REGISTER LOGIC (පාස්වර්ඩ් එක Firestore එකට යැවීම ඉවත් කර ඇත)
// ==========================================
exports.registerUser = async (req, res) => {
  const { email, password, role, userData } = req.body;

  try {
    if (!email || !password || !role || !userData) {
      return res.status(400).json({ message: 'Missing required registration fields.' });
    }

    //  Back-end Enterprise Validation Interceptions
    if (!authService.validateFullName(userData.name)) {
      return res.status(400).json({ message: 'Invalid name syntax configuration. Use alphabetic letters only.' });
    }
    if (!authService.validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address structure layout.' });
    }
    if (!authService.validatePasswordPolicy(password)) {
      return res.status(400).json({ message: 'Password policy breakdown. Requires 8-12 chars with min 3 dynamic complexity matches.' });
    }
    if (!authService.validateSriLankanPhone(userData.phone)) {
      return res.status(400).json({ message: 'Invalid connection node phone sequence. Drop a valid Sri Lankan mobile sequence.' });
    }
    if (!authService.validateAgeLimit(userData.dob)) {
      return res.status(400).json({ message: 'Age barrier restriction failed. You must be at least 15 years old to hook up.' });
    }

    const formattedEmail = email.toLowerCase().trim();

    // Check pre-authorized staging block
    const preAuthRef = db.collection('pre_authorized_staff').doc(formattedEmail);
    const preAuthDoc = await preAuthRef.get();

    let finalRole = role; 
    let additionalStaffData = { privileges: [] };
    let isPreAuthStaff = false;

    if (preAuthDoc.exists) {
      const preAuthData = preAuthDoc.data();
      finalRole = preAuthData.role; 
      additionalStaffData = {
        institution: preAuthData.institution || 'LNBTI',
        privileges: preAuthData.privileges || []
      };
      isPreAuthStaff = true;
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ Firebase Auth එකේ විතරක් පරිශීලකයාව නිර්මාණය කරයි (පාස්වර්ඩ් එක මෙතැනදී ආරක්ෂිතව Auth එකට යයි)
    const userRecord = await auth.createUser({
      email: formattedEmail,
      password: password,
      displayName: userData.name || 'User'
    });

    const userProfile = {
      uid: userRecord.uid,
      email: formattedEmail,
      password: hashedPassword, 
      // 🛡️ password/hashedPassword field එක සම්පූර්ණයෙන්ම ඉවත් කරන ලදී!
      role: finalRole, 
      status: finalRole === 'tutor' ? 'pending' : 'active',
      credits: finalRole === 'student' ? 300 : 0, // 🪙 Students ලට default credits 300 ක් ලබාදේ
      joined: new Date().toISOString().split('T')[0],
      name: userData.name.trim(),
      phone: userData.phone.trim(),
      dob: userData.dob,
      ...(finalRole === 'tutor' && {
        university: userData.university?.trim() || '',
        qualifications: userData.qualifications?.trim() || '',
        address: userData.address?.trim() || '',
        certificateData: userData.certificateData || ''
      }),
      ...additionalStaffData, 
      createdAt: new Date().toISOString()
    };


    await db.collection('users').doc(userRecord.uid).set(userProfile);


    if (finalRole === 'tutor' || role === 'tutor') {
      console.log(`LOG: Spawning tutor application node for UID: ${userRecord.uid}`);
      await tutorValidationService.createApplication(userRecord.uid, {
        qualifications: userData.qualifications?.trim() || 'JLPT Level Unspecified',
        certificateData: userData.certificateData || ''
      });
    }

    if (isPreAuthStaff) {
      await preAuthRef.delete();
    }


    delete userProfile.password;

    const appToken = jwt.sign(
      { id: userRecord.uid, role: finalRole },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '1d' }
    );

    return res.status(201).json({ token: appToken, user: { id: userRecord.uid, ...userProfile } });

  } catch (error) {
    console.error('Registration Failure:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'The email address is already registered in our system.' });
    }
    return res.status(500).json({ message: error.message || 'Server error during registration.' });
  }
};

// ==========================================
// 2. UNIFIED LOGIN GATEWAY LOGIC (Firebase ID Token මත පමණක් ක්‍රියා කරයි)
// ==========================================
exports.loginUser = async (req, res) => {
  const { idToken } = req.body; // 👈 Frontend එකෙන් එවන Firebase Firebase-Auth ID Token එක

  try {
    if (!idToken) {
      return res.status(400).json({ message: 'Authentication requires a valid Firebase Identity Token.' });
    }

    // 🔒 Firebase Auth හරහා Token එක Verify කර UID එක ලබා ගැනීම
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const emailFromToken = decodedToken.email;
    const nameFromToken = decodedToken.name || 'User';

    let userDoc = await db.collection('users').doc(uid).get();

    // Firestore එකේ තවම ප්‍රොෆයිල් එක හැදිලා නැත්නම් (Google Login වගේ වෙලාවකදී)
    if (!userDoc.exists) {
      return res.status(200).json({
        status: 'profile_incomplete',
        uid: uid,
        email: emailFromToken,
        name: nameFromToken
      });
    }

    const userData = userDoc.data();
    if (userData.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended!' });
    }

    // ඇප් එක ඇතුළේ පාවිච්චි කරන්න අපේම JWT එකක් Sign කිරීම
    const appToken = jwt.sign(
      { id: uid, role: userData.role },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '1d' }
    );

    return res.status(200).json({ 
      token: appToken, 
      user: { id: uid, uid: uid, ...userData } 
    });

  } catch (error) {
    console.error('Login Failure:', error);
    res.status(500).json({ message: 'Server error during authentication processing phase', error: error.message });
  }
};

// ==========================================
// 3. COMPLETE GOOGLE REGISTRATION LOGIC
// ==========================================
exports.completeGoogleRegistration = async (req, res) => {
  const { uid, email, name, phone, dob, role } = req.body;

  try {
    if (!uid || !email || !phone || !dob) {
      return res.status(400).json({ message: 'Missing required parameters.' });
    }

    if (!authService.validateSriLankanPhone(phone)) {
      return res.status(400).json({ message: 'Invalid connection node phone sequence. Drop a valid Sri Lankan mobile sequence.' });
    }
    if (!authService.validateAgeLimit(dob)) {
      return res.status(400).json({ message: 'Age barrier restriction failed. You must be at least 15 years old to hook up.' });
    }

    const userCheck = await db.collection('users').doc(uid).get();
    if (userCheck.exists) {
      return res.status(400).json({ message: 'Profile configuration already established.' });
    }

    const newGoogleProfile = {
      uid: uid,
      email: email.toLowerCase().trim(),
      name: name,
      phone: phone.trim(),
      dob: dob,
      role: role || 'student',
      status: 'active',
      credits: role === 'student' ? 300 : 0,
      joined: new Date().toISOString().split('T')[0], 
      privileges: [],
      createdAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).set(newGoogleProfile);

    const appToken = jwt.sign(
      { id: uid, role: newGoogleProfile.role },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '1d' }
    );

    return res.status(201).json({ token: appToken, user: { id: uid, ...newGoogleProfile } });

  } catch (error) {
    console.error('Google Profile Finalization Failure:', error);
    return res.status(500).json({ message: 'Server error finalizing profile setups.' });
  }
};