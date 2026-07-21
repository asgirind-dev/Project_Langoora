const { db, auth } = require('../config/firebase'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Service Layer Link integration
const authService = require('../services/authService');
const tutorValidationService = require('../services/tutorValidationService'); 

// ==========================================
// 1. REGISTER LOGIC - FIXED FOR PRE-AUTHORIZED STAFF
// ==========================================
exports.registerUser = async (req, res) => {
  const { email, password, role, userData } = req.body;

  try {
    // Check required fields
    if (!email || !password || !userData) {
      return res.status(400).json({ message: 'Missing required registration fields.' });
    }

    // Set default role if not provided
    const userRole = role || 'student';
    const formattedEmail = email.toLowerCase().trim();

    // FIRST: Check if this email is pre-authorized (staff)
    const preAuthRef = db.collection('pre_authorized_staff').doc(formattedEmail);
    const preAuthDoc = await preAuthRef.get();

    let finalRole = userRole;
    let additionalStaffData = { privileges: [] };
    let isPreAuthStaff = false;
    let preAuthData = null;

    if (preAuthDoc.exists) {
      preAuthData = preAuthDoc.data();
      finalRole = preAuthData.role || userRole;
      // ✅ FIX: Changed default institution from "LNBTI" to "Langoora"
      additionalStaffData = {
        institution: preAuthData.institution || 'Langoora',
        privileges: preAuthData.privileges || [],
        languageScope: preAuthData.languageScope || 'All'
      };
      isPreAuthStaff = true;
      console.log(`✅ Pre-authorized staff found: ${formattedEmail} with role ${finalRole}`);
    }

    // Back-end Enterprise Validation
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

    // Check if user already exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: formattedEmail,
        password: password,
        displayName: userData.name || 'User'
      });
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        try {
          userRecord = await auth.getUserByEmail(formattedEmail);
          console.log(`✅ User already exists in Firebase Auth: ${formattedEmail}`);
        } catch (getError) {
          return res.status(400).json({ message: 'The email address is already registered in our system.' });
        }
      } else {
        throw authError;
      }
    }

    // Hash password for Firestore
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Build user profile with proper role
    const userProfile = {
      uid: userRecord.uid,
      email: formattedEmail,
      password: hashedPassword,
      role: finalRole || 'student',
      status: finalRole === 'tutor' ? 'pending' : 'active',
      joined: new Date().toISOString().split('T')[0],
      name: userData.name?.trim() || 'User',
      phone: userData.phone?.trim() || '',
      dob: userData.dob || '',
      createdAt: new Date().toISOString()
    };

    // Add staff-specific fields for pre-authorized staff
    if (isPreAuthStaff) {
      userProfile.institution = additionalStaffData.institution || 'Langoora';
      userProfile.privileges = additionalStaffData.privileges;
      userProfile.languageScope = additionalStaffData.languageScope || 'All';
      userProfile.isPreAuthorized = true;
      
      // Special handling for validator role
      if (finalRole === 'validator') {
        userProfile.validatorStatus = 'active';
        userProfile.languageScope = additionalStaffData.languageScope || 'Japanese';
      }
    }

    // Add tutor-specific fields
    if (finalRole === 'tutor') {
      userProfile.university = userData.university?.trim() || '';
      userProfile.qualifications = userData.qualifications?.trim() || '';
      userProfile.address = userData.address?.trim() || '';
      userProfile.certificateData = userData.certificateData || '';
      userProfile.language = userData.language || '';
    }

    // Remove any undefined values before saving
    Object.keys(userProfile).forEach(key => {
      if (userProfile[key] === undefined) {
        delete userProfile[key];
      }
    });

    // Save to Firestore
    await db.collection('users').doc(userRecord.uid).set(userProfile);

    // Handle tutor application
    if (finalRole === 'tutor') {
      console.log(`LOG: Spawning tutor application node for UID: ${userRecord.uid}`);
      await tutorValidationService.createApplication(userRecord.uid, {
        qualifications: userData.qualifications?.trim() || 'JLPT Level Unspecified',
        certificateData: userData.certificateData || ''
      });
    }

    // Delete the pre-authorization document after successful registration
    if (isPreAuthStaff && preAuthDoc.exists) {
      await preAuthRef.delete();
      console.log(`✅ Pre-authorization document deleted for ${formattedEmail}`);
    }

    // Remove password before sending response
    delete userProfile.password;

    // Generate JWT token
    const appToken = jwt.sign(
      { id: userRecord.uid, role: finalRole || 'student' },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '1d' }
    );

    return res.status(201).json({ 
      success: true,
      token: appToken, 
      user: { 
        id: userRecord.uid, 
        uid: userRecord.uid,
        ...userProfile,
        isPreAuthorized: isPreAuthStaff
      } 
    });

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

      const restrictedPublicRoles = ['admin', 'validator', 'finance', 'finance_admin'];
      if (restrictedPublicRoles.includes(userData.role?.toLowerCase().trim())) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access Denied: Administrative roles must authenticate via the dedicated Staff Secure Gateway Terminal.' 
        });
      }

      if (userData.status === 'suspended') {
        return res.status(403).json({ message: 'Your account has been suspended!' });
      }

      const appToken = jwt.sign(
        { id: uid, role: userData.role },
        process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
        { expiresIn: '1d' }
      );

      return res.status(200).json({ 
        token: appToken, 
        user: { id: uid, uid: uid, ...userData } 
      });
    }

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

    const restrictedPublicRoles = ['admin', 'validator', 'finance', 'finance_admin'];
    if (restrictedPublicRoles.includes(userData.role?.toLowerCase().trim())) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access Denied: Administrative roles must authenticate via the dedicated Staff Secure Gateway Terminal.' 
      });
    }

    if (userData.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended!' });
    }

    if (userData.password && (userData.password.startsWith('$2a$') || userData.password.startsWith('$2b$'))) {
      const isMatch = await bcrypt.compare(password, userData.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials!' });

      const appToken = jwt.sign(
        { id: userId, role: userData.role },
        process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
        { expiresIn: '1d' }
      );

      delete userData.password; 
      
      return res.status(200).json({ 
        token: appToken, 
        user: { id: userId, uid: userId, ...userData } 
      });
    }

    return res.status(400).json({ message: 'Invalid identity target authentication method.' });

  } catch (error) {
    console.error('Login Failure:', error);
    res.status(500).json({ message: 'Server error during authentication processing phase' });
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
      name: name || 'User',
      phone: phone.trim(),
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

// ==========================================
// 4. SECURE STAFF LOGIN GATEWAY
// ==========================================
exports.loginStaff = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Corporate credentials are required.' });
    }

    const formattedEmail = email.toLowerCase().trim();

    const userSnapshot = await db.collection('users').where('email', '==', formattedEmail).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ message: 'Access Denied: Terminal records mismatch.' });
    }

    let userData = null;
    let userId = null;

    userSnapshot.forEach(doc => {
      userData = doc.data();
      userId = doc.id;
    });

    const allowedStaffRoles = ['super_admin', 'admin', 'validator', 'finance'];
    if (!allowedStaffRoles.includes(userData.role)) {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Unauthorized personnel entry attempt logged.'
      });
    }

    if (userData.status === 'suspended') {
      return res.status(403).json({ message: 'Operational Notice: Administrative freeze active on node.' });
    }

    const savedPassword = userData.password || userData.passwordHash;
    if (!savedPassword) {
      return res.status(400).json({ message: 'Authentication registry trace missing valid password hash.' });
    }

    const isMatch = await bcrypt.compare(password, savedPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials!' });
    }

    const appToken = jwt.sign(
      { id: userId, role: userData.role },
      process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
      { expiresIn: '1d' }
    );

    delete userData.password;
    delete userData.passwordHash;

    return res.status(200).json({
      success: true,
      token: appToken,
      user: { id: userId, uid: userId, ...userData }
    });

  } catch (error) {
    console.error('Staff Gateway Critical Runtime Failure:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error during gateway verification setup phase.'
    });
  }
};