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
// ✅ FIXED: CORRECT ROLE DETECTION, organization for Finance Admin
// ✅ FIXED: Remove institution and languageScope for Finance Admin
// ✅ FIXED: Validator Language Scope Save
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
      
      // ✅ CRITICAL FIX: Use roleId if available, fallback to role
      const preAuthRole = preAuthData.roleId || preAuthData.role || userRole;
      finalRole = preAuthRole;
      
      // ✅ Check if this is a Finance Admin
      const isFinance = finalRole === 'finance' || finalRole === 'finance_admin';
      
      additionalStaffData = {
        privileges: preAuthData.privileges || [],
        // ✅ Finance Admin: use organization, no institution/languageScope
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
        // ✅ LOG FAILED REGISTRATION - Email already exists
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

    // Hash password for Firestore storage (if needed by legacy login)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅✅✅ CRITICAL FIX: Build user profile with CORRECT role
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
      // ✅ Finance Admin: use organization, no institution/languageScope
      if (isFinance) {
        userProfile.organization = additionalStaffData.organization || 'Novacore Solutions';
        // ❌ Finance Adminට institution එපා
        // ❌ Finance Adminට languageScope එපා
        console.log(`💰 Finance Admin detected: ${formattedEmail} - Organization: ${userProfile.organization}`);
      } 
      // ✅ Validator: Save languageScope and languageGroup
      else if (isValidator) {
        userProfile.validatorStatus = 'active';
        userProfile.languageScope = additionalStaffData.languageScope || 'Japanese';
        // ✅ languageGroup එකත් save කරන්න (lowercase)
        userProfile.languageGroup = (additionalStaffData.languageScope || 'Japanese').toLowerCase();
        userProfile.institution = additionalStaffData.institution || 'Langoora';
        console.log(`✅ Validator detected: ${formattedEmail} - Language Scope: ${userProfile.languageScope}`);
      } 
      else {
        // ✅ Other staff roles: institution and languageScope
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
    if (isFinance) {
      console.log(`📝 Organization: ${userProfile.organization}`);
    }
    if (isValidator) {
      console.log(`📝 Language Scope: ${userProfile.languageScope}`);
      console.log(`📝 Language Group: ${userProfile.languageGroup}`);
    }

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

    // ✅ Generate JWT token with CORRECT role
    const appToken = jwt.sign(
      { id: userRecord.uid, role: finalRole || 'student', roleId: finalRole || 'student' },
      process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
      { expiresIn: '1d' }
    );

    // ✅ LOG SUCCESSFUL REGISTRATION
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
    
    // ✅ LOG FAILED REGISTRATION
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
// 2. UNIFIED LOGIN GATEWAY LOGIC (Firebase ID Token Support)
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
        // ✅ LOG: Profile incomplete (user exists in Firebase but not Firestore)
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
      
      // ✅ Use roleId if available, fallback to role
      const userRole = userData.roleId || userData.role || 'student';

      const restrictedPublicRoles = ['admin', 'validator', 'finance', 'finance_admin'];
      if (restrictedPublicRoles.includes(userRole?.toLowerCase().trim())) {
        // ✅ LOG: Restricted role attempted to login via public endpoint
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
          message: 'Access Denied: Administrative roles must authenticate via the dedicated Staff Secure Gateway Terminal.' 
        });
      }

      if (userData.status === 'suspended') {
        // ✅ LOG: Suspended user attempted login
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
        return res.status(403).json({ message: 'Your account has been suspended!' });
      }

      const appToken = jwt.sign(
        { id: uid, role: userRole, roleId: userRole },
        process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
        { expiresIn: '1d' }
      );

      delete userData.password;

      // ✅ LOG SUCCESSFUL LOGIN
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

    // Option B: Legacy Email & Password Authentication
    if (email && password) {
      const formattedEmail = email.toLowerCase().trim();
      const userSnapshot = await db.collection('users').where('email', '==', formattedEmail).get();
      
      if (userSnapshot.empty) {
        // ✅ LOG: User not found
        logAudit(auditLogService.logAuthentication, {
          userId: null,
          userEmail: formattedEmail,
          action: 'login',
          success: false,
          error: 'User not found',
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown'
        });
        return res.status(404).json({ message: 'User not found!' });
      }

      let userData = null;
      let userId = null;
      userSnapshot.forEach(doc => {
        userData = doc.data();
        userId = doc.id;
      });

      // ✅ Use roleId if available, fallback to role
      const userRole = userData.roleId || userData.role || 'student';

      const restrictedPublicRoles = ['admin', 'validator', 'finance', 'finance_admin'];
      if (restrictedPublicRoles.includes(userRole?.toLowerCase().trim())) {
        // ✅ LOG: Restricted role attempted to login via public endpoint
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
          message: 'Access Denied: Administrative roles must authenticate via the dedicated Staff Secure Gateway Terminal.' 
        });
      }

      if (userData.status === 'suspended') {
        // ✅ LOG: Suspended user attempted login
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
        return res.status(403).json({ message: 'Your account has been suspended!' });
      }

      const isMatch = await bcrypt.compare(password, userData.password || '');
      if (!isMatch) {
        // ✅ LOG: Invalid password
        logAudit(auditLogService.logAuthentication, {
          userId: userId,
          userEmail: formattedEmail,
          action: 'login',
          success: false,
          error: 'Invalid credentials',
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown'
        });
        return res.status(400).json({ message: 'Invalid credentials!' });
      }

      const appToken = jwt.sign(
        { id: userId, role: userRole, roleId: userRole },
        process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
        { expiresIn: '1d' }
      );

      delete userData.password; 
      
      // ✅ LOG SUCCESSFUL LOGIN
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

    return res.status(400).json({ message: 'Please provide valid credentials or an identity idToken.' });

  } catch (error) {
    console.error('Login Failure:', error);
    
    // ✅ LOG: Unexpected error during login
    logAudit(auditLogService.logAuthentication, {
      userId: null,
      userEmail: req.body.email || 'unknown',
      action: 'login',
      success: false,
      error: error.message,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

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

    // ✅ If Validator, add languageScope
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

    // ✅ LOG SUCCESSFUL GOOGLE REGISTRATION
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
    
    // ✅ LOG: Failed Google registration
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
      // ✅ LOG: Staff user not found
      logAudit(auditLogService.logAuthentication, {
        userId: null,
        userEmail: formattedEmail,
        action: 'staff_login',
        success: false,
        error: 'User not found',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      return res.status(404).json({ message: 'Access Denied: Terminal records mismatch.' });
    }

    let userData = null;
    let userId = null;

    userSnapshot.forEach(doc => {
      userData = doc.data();
      userId = doc.id;
    });

    // ✅ Use roleId if available, fallback to role
    const userRole = userData.roleId || userData.role || 'student';

    const allowedStaffRoles = ['super_admin', 'admin', 'validator', 'finance', 'finance_admin'];
    if (!allowedStaffRoles.includes(userRole)) {
      // ✅ LOG: Unauthorized role attempted staff login
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
        message: 'Security Violation: Unauthorized personnel entry attempt logged.'
      });
    }

    if (userData.status === 'suspended') {
      // ✅ LOG: Suspended staff attempted login
      logAudit(auditLogService.logAuthentication, {
        userId: userId,
        userEmail: formattedEmail,
        action: 'staff_login',
        success: false,
        error: 'Account suspended',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      return res.status(403).json({ message: 'Operational Notice: Administrative freeze active on node.' });
    }

    const savedPassword = userData.password || userData.passwordHash;
    if (!savedPassword) {
      // ✅ LOG: Missing password hash
      logAudit(auditLogService.logAuthentication, {
        userId: userId,
        userEmail: formattedEmail,
        action: 'staff_login',
        success: false,
        error: 'Missing password hash',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      return res.status(400).json({ message: 'Authentication registry trace missing valid password hash.' });
    }

    const isMatch = await bcrypt.compare(password, savedPassword);
    if (!isMatch) {
      // ✅ LOG: Invalid staff password
      logAudit(auditLogService.logAuthentication, {
        userId: userId,
        userEmail: formattedEmail,
        action: 'staff_login',
        success: false,
        error: 'Invalid credentials',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      return res.status(400).json({ message: 'Invalid credentials!' });
    }

    const appToken = jwt.sign(
      { id: userId, role: userRole, roleId: userRole },
      process.env.JWT_SECRET || 'fallback_secret_key_production_2026',
      { expiresIn: '1d' }
    );

    delete userData.password;
    delete userData.passwordHash;

    // ✅ LOG SUCCESSFUL STAFF LOGIN
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
    
    // ✅ LOG: Unexpected error during staff login
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