const { db, auth } = require('../config/firebase'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// 1. REGISTER LOGIC
// ==========================================
exports.registerUser = async (req, res) => {
  const { email, password, role, userData } = req.body;

  try {
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Missing required registration fields.' });
    }

    const formattedEmail = email.toLowerCase().trim();

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

    const userRecord = await auth.createUser({
      email: formattedEmail,
      password: password,
      displayName: userData.name || 'User'
    });

    const userProfile = {
      uid: userRecord.uid,
      email: formattedEmail,
      role: finalRole, 
      status: finalRole === 'tutor' ? 'pending' : 'active',
      joined: new Date().toISOString().split('T')[0],
      ...userData,
      ...additionalStaffData, 
      createdAt: new Date().toISOString()
    };

    await db.collection('users').doc(userRecord.uid).set(userProfile);

    if (isPreAuthStaff) {
      await preAuthRef.delete();
    }

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
// 2. UNIFIED LOGIN GATEWAY LOGIC
// ==========================================
exports.loginUser = async (req, res) => {
  const { email, password, idToken } = req.body;

  try {
    // ------------------------------------------
    // PATHWAY A: ID TOKEN VALIDATION (Frontend Firebase Auth Integrations)
    // ------------------------------------------
    if (idToken) {
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const emailFromToken = decodedToken.email;
      const nameFromToken = decodedToken.name || 'User';

      let userDoc = await db.collection('users').doc(uid).get();


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

      const appToken = jwt.sign(
        { id: uid, role: userData.role },
        process.env.JWT_SECRET || 'fallback_secret_key',
        { expiresIn: '1d' }
      );


      return res.status(200).json({ 
        token: appToken, 
        user: { 
          id: uid, 
          uid: uid, 
          ...userData 
        } 
      });
    }

    // ------------------------------------------
    // PATHWAY B: LEGACY BACKEND AUTHENTICATION (Bcrypt / Postman Flow)
    // ------------------------------------------
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide valid credentials or an identity idToken.' });
    }

    const userSnapshot = await db.collection('users').where('email', '==', email.toLowerCase().trim()).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ message: 'User not found!' });
    }

    let userData = null;
    let userId = null;
    userSnapshot.forEach(doc => {
      userData = doc.data();
      userId = doc.id;
    });

    if (userData.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended!' });
    }

    // Bcrypt Password Verification
    if (userData.password && (userData.password.startsWith('$2a$') || userData.password.startsWith('$2b$'))) {
      const isMatch = await bcrypt.compare(password, userData.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials!' });

      const appToken = jwt.sign(
        { id: userId, role: userData.role },
        process.env.JWT_SECRET || 'fallback_secret_key',
        { expiresIn: '1d' }
      );

      delete userData.password; 
      
      return res.status(200).json({ 
        token: appToken, 
        user: { 
          id: userId, 
          uid: userId, 
          ...userData 
        } 
      });
    }

    return res.status(400).json({ message: 'Invalid identity target authentication method.' });

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

    const userCheck = await db.collection('users').doc(uid).get();
    if (userCheck.exists) {
      return res.status(400).json({ message: 'Profile configuration already established.' });
    }

    const newGoogleProfile = {
      uid: uid,
      email: email.toLowerCase().trim(),
      name: name,
      phone: phone,
      dob: dob,
      role: role || 'student',
      status: 'active',
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