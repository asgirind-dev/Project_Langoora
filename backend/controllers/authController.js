// backend/controllers/authController.js
const { db, auth } = require('../config/firebase'); 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Service Layer Link integration
const authService = require('../services/authService');
const tutorValidationService = require('../services/tutorValidationService');

// ✅ ADD: Audit Log Service
const auditLogService = require('../services/auditLogService');

// ✅ Helper for non-blocking audit logging
const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

// ==========================================
// 1. REGISTER LOGIC - FIXED FOR PRE-AUTHORIZED STAFF & USERS
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
    let additionalStaffData = { 
      privileges: [],
      organization: '',
      institution: '',
      languageScope: ''
    };
    let isPreAuthStaff = false;

    if (preAuthDoc.exists) {
      const preAuthData = preAuthDoc.data();
      
      const preAuthRole = preAuthData.roleId || preAuthData.role || userRole;
      finalRole = preAuthRole;
      
      const isFinance = finalRole === 'finance' || finalRole === 'finance_admin';
      
      additionalStaffData = {
        privileges: preAuthData.privileges || [],
        organization: isFinance ? (preAuthData.organization || 'Novacore Solutions') : '',
        institution: isFinance ? '' : (preAuthData.institution || 'Langoora'),
        languageScope: isFinance ? '' : (preAuthData.languageScope || 'All'),
        roleId: preAuthData.roleId || preAuthData.role || null
      };
      isPreAuthStaff = true;
      console.log(`✅ Pre-authorized staff found: ${formattedEmail} with role: ${finalRole}`);
      console.log(`📋 Organization: ${additionalStaffData.organization}`);
      console.log(`📋 Language Scope: ${additionalStaffData.languageScope}`);
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

    // Check if user already exists in Firebase Auth or Create
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: formattedEmail,
        password: password,
        displayName: userData.name || 'User'
      });
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        logAudit(auditLogService.logAuthentication, {
          userId: null,
          userEmail: formattedEmail,
          action: 'register',
          success: false,
          error: 'Email already exists',
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown'
        });
        return res.status(400).json({ message: 'The email address is already registered in our system.' });
      } else {
        throw authError;
      }
    }

    // Hash password for Firestore storage
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const isFinance = finalRole === 'finance' || finalRole === 'finance_admin';
    const isValidator = finalRole === 'validator';
    
    const userProfile = {
      uid: userRecord.uid,
      email: formattedEmail,
      password: hashedPassword,
      role: finalRole || 'student',
      roleId: finalRole || 'student',
      status: finalRole === 'tutor' ? 'pending' : 'active',
      credits: finalRole === 'student' ? 300 : 0,
      joined: new Date().toISOString().split('T')[0],
      name: userData.name?.trim() || 'User',
      phone: userData.phone?.trim() || '',
      dob: userData.dob || '',
      createdAt: new Date().toISOString()
    };

    // Add staff-specific fields for pre-authorized staff
    if (isPreAuthStaff) {
      if (isFinance) {
        userProfile.organization = additionalStaffData.organization || 'Novacore Solutions';
        console.log(`💰 Finance Admin detected: ${formattedEmail} - Organization: ${userProfile.organization}`);
      } else if (isValidator) {
        userProfile.validatorStatus = 'active';
        userProfile.languageScope = additionalStaffData.languageScope || 'Japanese';
        userProfile.languageGroup = (additionalStaffData.languageScope || 'Japanese').toLowerCase();
        userProfile.institution = additionalStaffData.institution || 'Langoora';
        console.log(`✅ Validator detected: ${formattedEmail} - Language Scope: ${userProfile.languageScope}`);
      } else {
        userProfile.institution = additionalStaffData.institution || 'Langoora';
        userProfile.languageScope = additionalStaffData.languageScope || 'All';
      }
      
      userProfile.privileges = additionalStaffData.privileges;
      userProfile.isPreAuthorized = true;
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

    console.log(`📝 Creating user profile with role: ${userProfile.role}, roleId: ${userProfile.roleId}`);

    // Save user to Firestore
    await db.collection('users').doc(userRecord.uid).set(userProfile);

    // Handle tutor application
    if (finalRole === 'tutor') {
      console.log(`LOG: Spawning tutor application node for UID: ${userRecord.uid}`);
      await tutorValidationService.createApplication(userRecord.uid, {
        qualifications: userData.qualifications?.trim() || 'JLPT Level Unspecified',
        certificateData: userData.certificateData || ''
      });
    }

    // Delete pre-authorization doc after success
    if (isPreAuthStaff && preAuthDoc.exists) {
      await preAuthRef.delete();
      console.log(`✅ Pre-authorization document deleted for ${formattedEmail}`);
    }

    // Remove password hash before sending response
    delete userProfile.password;

    const appToken = jwt.sign(
      { id: userRecord.uid, role: finalRole || 'student', roleId: finalRole || 'student' },
      process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
      { expiresIn: '1d' }
    );

    logAudit(auditLogService.logAuthentication, {
      userId: userRecord.uid,
      userEmail: formattedEmail,
      action: 'register',
      role: finalRole || 'student',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      success: true
    });

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
    
    logAudit(auditLogService.logAuthentication, {
      userId: null,
      userEmail: req.body.email,
      action: 'register',
      success: false,
      error: error.message,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(500).json({ message: error.message || 'Server error during registration.' });
  }
};

// ==========================================
// 2. UNIFIED LOGIN GATEWAY LOGIC - ✅ IMPROVED ERROR RESPONSES
// ==========================================
exports.loginUser = async (req, res) => {
  const { idToken, email, password } = req.body;

  try {
    // Option A: Firebase ID Token Authentication
    if (idToken) {
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const emailFromToken = decodedToken.email;
      const nameFromToken = decodedToken.name || 'User';

      let userDoc = await db.collection('users').doc(uid).get();

      if (!userDoc.exists) {
        logAudit(auditLogService.logAuthentication, {
          userId: uid,
          userEmail: emailFromToken,
          action: 'login',
          role: 'unregistered',
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          error: 'Profile incomplete - needs registration completion'
        });
        return res.status(200).json({
          status: 'profile_incomplete',
          uid: uid,
          email: emailFromToken,
          name: nameFromToken
        });
      }

      const userData = userDoc.data();
      const userRole = userData.roleId || userData.role || 'student';

      const restrictedPublicRoles = ['admin', 'validator', 'finance', 'finance_admin'];
      if (restrictedPublicRoles.includes(userRole?.toLowerCase().trim())) {
        logAudit(auditLogService.logAuthentication, {
          userId: uid,
          userEmail: emailFromToken,
          action: 'login',
          role: userRole,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          error: 'Restricted role - use staff login'
        });
        return res.status(403).json({ 
          success: false, 
          message: 'Access Denied: Staff accounts must use the Staff Login portal.' 
        });
      }

      if (userData.status === 'suspended') {
        logAudit(auditLogService.logAuthentication, {
          userId: uid,
          userEmail: emailFromToken,
          action: 'login',
          role: userRole,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          error: 'Account suspended'
        });
        return res.status(403).json({ 
          success: false, 
          message: 'Your account has been suspended. Please contact support.' 
        });
      }

      const appToken = jwt.sign(
        { id: uid, role: userRole, roleId: userRole },
        process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
        { expiresIn: '1d' }
      );

      delete userData.password;

      logAudit(auditLogService.logAuthentication, {
        userId: uid,
        userEmail: emailFromToken,
        action: 'login',
        role: userRole || 'student',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true
      });

      return res.status(200).json({ 
        token: appToken, 
        user: { id: uid, uid: uid, ...userData } 
      });
    }

    // Option B: Legacy Email & Password Authentication - ✅ IMPROVED
    if (email && password) {
      const formattedEmail = email.toLowerCase().trim();
      const userSnapshot = await db.collection('users').where('email', '==', formattedEmail).get();
      
      if (userSnapshot.empty) {
        logAudit(auditLogService.logAuthentication, {
          userId: null,
          userEmail: formattedEmail,
          action: 'login',
          success: false,
          error: 'User not found',
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown'
        });
        // ✅ Clearer error message for user not found
        return res.status(404).json({ 
          success: false, 
          message: 'No account found with this email address. Please check your email or register.' 
        });
      }

      let userData = null;
      let userId = null;
      userSnapshot.forEach(doc => {
        userData = doc.data();
        userId = doc.id;
      });

      const userRole = userData.roleId || userData.role || 'student';

      const restrictedPublicRoles = ['admin', 'validator', 'finance', 'finance_admin'];
      if (restrictedPublicRoles.includes(userRole?.toLowerCase().trim())) {
        logAudit(auditLogService.logAuthentication, {
          userId: userId,
          userEmail: formattedEmail,
          action: 'login',
          role: userRole,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          error: 'Restricted role - use staff login'
        });
        return res.status(403).json({ 
          success: false, 
          message: 'Access Denied: Staff accounts must use the Staff Login portal.' 
        });
      }

      if (userData.status === 'suspended') {
        logAudit(auditLogService.logAuthentication, {
          userId: userId,
          userEmail: formattedEmail,
          action: 'login',
          role: userRole,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          error: 'Account suspended'
        });
        return res.status(403).json({ 
          success: false, 
          message: 'Your account has been suspended. Please contact support.' 
        });
      }

      const isMatch = await bcrypt.compare(password, userData.password || '');
      if (!isMatch) {
        logAudit(auditLogService.logAuthentication, {
          userId: userId,
          userEmail: formattedEmail,
          action: 'login',
          success: false,
          error: 'Invalid credentials',
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown'
        });
        // ✅ Clearer error message for wrong password
        return res.status(401).json({ 
          success: false, 
          message: 'Incorrect password. Please try again or click "Forgot password" to reset.' 
        });
      }

      const appToken = jwt.sign(
        { id: userId, role: userRole, roleId: userRole },
        process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
        { expiresIn: '1d' }
      );

      delete userData.password; 
      
      logAudit(auditLogService.logAuthentication, {
        userId: userId,
        userEmail: formattedEmail,
        action: 'login',
        role: userRole || 'student',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true
      });

      return res.status(200).json({ 
        token: appToken, 
        user: { id: userId, uid: userId, ...userData } 
      });
    }

    return res.status(400).json({ 
      success: false, 
      message: 'Please provide valid credentials or an identity idToken.' 
    });

  } catch (error) {
    console.error('Login Failure:', error);
    
    logAudit(auditLogService.logAuthentication, {
      userId: null,
      userEmail: req.body.email || 'unknown',
      action: 'login',
      success: false,
      error: error.message,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    // ✅ Generic error for unexpected failures
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication. Please try again later.' 
    });
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

    const finalRole = role || 'student';
    const newGoogleProfile = {
      uid: uid,
      email: email.toLowerCase().trim(),
      name: name || 'User',
      phone: phone.trim(),
      dob: dob,
      role: finalRole,
      roleId: finalRole,
      status: 'active',
      credits: finalRole === 'student' ? 300 : 0,
      joined: new Date().toISOString().split('T')[0], 
      privileges: [],
      createdAt: new Date().toISOString()
    };

    if (finalRole === 'validator') {
      newGoogleProfile.languageScope = 'Japanese';
      newGoogleProfile.languageGroup = 'japanese';
      newGoogleProfile.validatorStatus = 'active';
    }

    await db.collection('users').doc(uid).set(newGoogleProfile);

    const appToken = jwt.sign(
      { id: uid, role: newGoogleProfile.role, roleId: newGoogleProfile.roleId },
      process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
      { expiresIn: '1d' }
    );

    logAudit(auditLogService.logAuthentication, {
      userId: uid,
      userEmail: email.toLowerCase().trim(),
      action: 'register',
      role: finalRole,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      success: true
    });

    return res.status(201).json({ token: appToken, user: { id: uid, ...newGoogleProfile } });

  } catch (error) {
    console.error('Google Profile Finalization Failure:', error);
    
    logAudit(auditLogService.logAuthentication, {
      userId: req.body.uid || null,
      userEmail: req.body.email || 'unknown',
      action: 'register',
      success: false,
      error: error.message,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

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
      logAudit(auditLogService.logAuthentication, {
        userId: null,
        userEmail: formattedEmail,
        action: 'staff_login',
        success: false,
        error: 'User not found',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      return res.status(404).json({ 
        success: false,
        message: 'Staff account not found. Please check your email.' 
      });
    }

    let userData = null;
    let userId = null;

    userSnapshot.forEach(doc => {
      userData = doc.data();
      userId = doc.id;
    });

    const userRole = userData.roleId || userData.role || 'student';

    const allowedStaffRoles = ['super_admin', 'admin', 'validator', 'finance', 'finance_admin'];
    if (!allowedStaffRoles.includes(userRole)) {
      logAudit(auditLogService.logAuthentication, {
        userId: userId,
        userEmail: formattedEmail,
        action: 'staff_login',
        success: false,
        error: `Unauthorized role: ${userRole}`,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You do not have staff privileges.'
      });
    }

    if (userData.status === 'suspended') {
      logAudit(auditLogService.logAuthentication, {
        userId: userId,
        userEmail: formattedEmail,
        action: 'staff_login',
        success: false,
        error: 'Account suspended',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      return res.status(403).json({ 
        success: false,
        message: 'Your account has been suspended. Please contact support.' 
      });
    }

    const savedPassword = userData.password || userData.passwordHash;
    if (!savedPassword) {
      logAudit(auditLogService.logAuthentication, {
        userId: userId,
        userEmail: formattedEmail,
        action: 'staff_login',
        success: false,
        error: 'Missing password hash',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      return res.status(400).json({ 
        success: false,
        message: 'Authentication error. Please contact support.' 
      });
    }

    const isMatch = await bcrypt.compare(password, savedPassword);
    if (!isMatch) {
      logAudit(auditLogService.logAuthentication, {
        userId: userId,
        userEmail: formattedEmail,
        action: 'staff_login',
        success: false,
        error: 'Invalid credentials',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Incorrect password. Please try again.' 
      });
    }

    const appToken = jwt.sign(
      { id: userId, role: userRole, roleId: userRole },
      process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
      { expiresIn: '1d' }
    );

    delete userData.password;
    delete userData.passwordHash;

    logAudit(auditLogService.logAuthentication, {
      userId: userId,
      userEmail: formattedEmail,
      action: 'staff_login',
      role: userRole,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      success: true
    });

    return res.status(200).json({
      success: true,
      token: appToken,
      user: { id: userId, uid: userId, ...userData }
    });

  } catch (error) {
    console.error('Staff Gateway Critical Runtime Failure:', error.message);
    
    logAudit(auditLogService.logAuthentication, {
      userId: null,
      userEmail: req.body.email || 'unknown',
      action: 'staff_login',
      success: false,
      error: error.message,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(500).json({
      success: false,
      message: 'Internal Server Error during gateway verification setup phase.'
    });
  }
};

// ==========================================
// 5. FORGOT PASSWORD - Send Reset Email (Real Email)
// ==========================================
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email address is required.' 
      });
    }

    const formattedEmail = email.toLowerCase().trim();
    
    const userSnapshot = await db.collection('users')
      .where('email', '==', formattedEmail)
      .get();

    // ✅ Security: Don't reveal if email exists or not
    if (userSnapshot.empty) {
      console.log(`📧 Password reset requested for non-existent email: ${formattedEmail}`);
      return res.status(200).json({ 
        success: true, 
        message: 'If an account exists, a password reset link has been sent.' 
      });
    }

    let userData = null;
    let userId = null;
    userSnapshot.forEach(doc => {
      userData = doc.data();
      userId = doc.id;
    });

    const resetLink = await auth.generatePasswordResetLink(formattedEmail);

    console.log(`📧 Password reset link generated for: ${formattedEmail}`);
    console.log(`🔗 Reset link: ${resetLink}`);

    const emailService = require('../services/emailService');
    const emailResult = await emailService.sendPasswordResetEmail({
      to: formattedEmail,
      name: userData.name || 'User',
      resetLink: resetLink,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    });

    if (!emailResult.success) {
      console.error('❌ Failed to send reset email:', emailResult.error);
    } else {
      console.log(`✅ Password reset email sent to ${formattedEmail}`);
    }

    const auditLogService = require('../services/auditLogService');
    await auditLogService.logAuthentication({
      userId: userId,
      userEmail: formattedEmail,
      action: 'password_reset_requested',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      success: true
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Password reset link has been sent to your email address.' 
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    
    const auditLogService = require('../services/auditLogService');
    await auditLogService.logAuthentication({
      userId: null,
      userEmail: req.body.email,
      action: 'password_reset_requested',
      success: false,
      error: error.message,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process password reset request. Please try again later.' 
    });
  }
};

// ==========================================
// 6. RESET PASSWORD - Confirm New Password
// ==========================================
exports.resetPassword = async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  try {
    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, new password, and confirmation are required.' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match.' 
      });
    }

    const authService = require('../services/authService');
    if (!authService.validatePasswordPolicy(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be 8-12 characters with at least 3 of: uppercase, lowercase, number, or symbol.' 
      });
    }

    const formattedEmail = email.toLowerCase().trim();

    const userSnapshot = await db.collection('users')
      .where('email', '==', formattedEmail)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    let userId = null;
    userSnapshot.forEach(doc => {
      userId = doc.id;
    });

    try {
      const userRecord = await auth.getUserByEmail(formattedEmail);
      await auth.updateUser(userRecord.uid, {
        password: newPassword
      });
      console.log(`✅ Firebase password updated for: ${formattedEmail}`);
    } catch (authError) {
      console.error('Firebase password update error:', authError);
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to update password. Please try again.' 
      });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await db.collection('users').doc(userId).update({
      password: hashedPassword,
      passwordUpdatedAt: new Date().toISOString()
    });
    console.log(`✅ Firestore password hash updated for: ${formattedEmail}`);

    const auditLogService = require('../services/auditLogService');
    await auditLogService.logAuthentication({
      userId: userId,
      userEmail: formattedEmail,
      action: 'password_reset_completed',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      success: true
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Password has been reset successfully. Please login with your new password.' 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    
    const auditLogService = require('../services/auditLogService');
    await auditLogService.logAuthentication({
      userId: null,
      userEmail: req.body.email,
      action: 'password_reset_completed',
      success: false,
      error: error.message,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password. Please try again later.' 
    });
  }
};