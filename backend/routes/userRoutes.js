const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {
  protect,
  authorizeRoles,
  requirePermission,
  requireLevel
} = require('../middleware/authMiddleware');
const { db, admin } = require('../config/firebase');

// ======================================================================
// 🔓 1. PUBLIC ROUTES (Login වීම අවශ්‍ය නැත / Authentication NOT required)
// ======================================================================

/**
 * ✅ Check if an email is pre-authorized for staff registration
 * GET /api/users/preauth-check?email=user@example.com
 */
router.get('/preauth-check', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required for pre-authorization check.' 
      });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format.' 
      });
    }

    const formattedEmail = email.toLowerCase().trim();
    
    // Check if email exists in pre_authorized_staff collection
    const preAuthDoc = await db.collection('pre_authorized_staff').doc(formattedEmail).get();

    if (preAuthDoc.exists) {
      const data = preAuthDoc.data();
      
      // Check if this pre-auth record is still valid (not expired)
      const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      const now = new Date();
      
      if (expiresAt && expiresAt < now) {
        return res.status(200).json({
          success: true,
          isPreAuthorized: false,
          expired: true,
          message: 'This invitation has expired. Please contact your administrator.'
        });
      }

      return res.status(200).json({
        success: true,
        isPreAuthorized: true,
        role: data.role || 'validator',
        languageScope: data.languageScope || 'All',
        institution: data.institution || 'Langoora',
        privileges: data.privileges || [],
        name: data.name || '',
        expiresAt: data.expiresAt || null
      });
    }

    return res.status(200).json({
      success: true,
      isPreAuthorized: false
    });

  } catch (error) {
    console.error('Pre-authorization check error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to check pre-authorization status.',
      error: error.message 
    });
  }
});

// ======================================================================
// 🔒 2. PROTECTED ROUTES (මෙතැනින් පහළ සියලුම Routes සඳහා Auth Token එකක් අවශ්‍ය වේ)
// ======================================================================
router.use(protect);

// ----------------------------------------------------------------------
// 👤 STUDENT / USER PROFILE ENDPOINTS
// ----------------------------------------------------------------------

// 🔄 Get student profile
router.get('/profile', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false, message: "User ID (uid) is required" });
    
    let doc = await db.collection('users').doc(uid).get();
    
    if (!doc.exists) {
      doc = await db.collection('students').doc(uid).get();
    }
    
    if (!doc.exists) {
      return res.status(200).json({ success: true, data: {} });
    }
    
    res.status(200).json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("Backend Fetch Profile Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 💳 Checkout Autofill Endpoint
router.get('/checkout-profile', userController.getStudentProfile);

// 🔄 Update student profile
router.put('/profile/update', async (req, res) => {
  try {
    const { uid, name, phone, dob, city, targetExam, targetDate } = req.body;
    if (!uid) return res.status(400).json({ success: false, message: "User ID is required" });
    await db.collection('students').doc(uid).set({
      name, phone, dob, city, targetExam, targetDate,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.status(200).json({ success: true, message: "Profile updated successfully!" });
  } catch (error) {
    console.error("Backend Profile Update Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------------------------
// ⚙️ USER SETTINGS ENDPOINTS
// ----------------------------------------------------------------------

// 🔄 Update language settings
router.put('/settings/language', async (req, res) => {
  try {
    const { uid, language } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID is required" });
    await db.collection('students').doc(uid).set({
      language, updatedAt: new Date().toISOString()
    }, { merge: true });
    res.status(200).json({ success: true, message: "Language updated successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔄 Update password
router.put('/settings/password', async (req, res) => {
  try {
    const { uid, newPassword } = req.body;
    if (!uid || !newPassword) return res.status(400).json({ message: "Missing required fields" });
    await admin.auth().updateUser(uid, { password: newPassword });
    res.status(200).json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ======================================================================
// 🛡️ 3. ADMIN PRIVILEGED ROUTES (Admin හට පමණක් සීමා වේ)
// ======================================================================
router.use(authorizeRoles('admin'));

// ---- User Management ----
router.get(
  '/',
  requirePermission('manage_users'),
  userController.getAllUsers
);

router.post(
  '/provision',
  requirePermission('manage_users'),
  userController.provisionStaffNode
);

router.put(
  '/:uid/privileges',
  requirePermission('manage_users'),
  userController.updatePrivileges
);

router.put(
  '/:uid/lifecycle',
  requirePermission('manage_users'),
  userController.toggleUserLifecycle
);

router.delete(
  '/:uid',
  requirePermission('manage_users'),
  userController.deleteUserNode
);

// ---- Role Management ----
router.get(
  '/roles',
  requirePermission('manage_roles'),
  userController.getRoles
);

router.post(
  '/roles',
  requirePermission('manage_roles'),
  requireLevel(2),
  userController.createRole
);

router.put(
  '/roles/:roleId',
  requirePermission('manage_roles'),
  requireLevel(2),
  userController.updateRole
);

router.delete(
  '/roles/:roleId',
  requirePermission('manage_roles'),
  requireLevel(2),
  userController.deleteRole
);

// ---- Bulk Pre-authorization Check ----
router.post(
  '/preauth-bulk-check',
  requirePermission('manage_users'),
  async (req, res) => {
    try {
      const { emails } = req.body;
      
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Emails array is required.' 
        });
      }

      const results = [];
      
      for (const email of emails) {
        const formattedEmail = email.toLowerCase().trim();
        const preAuthDoc = await db.collection('pre_authorized_staff').doc(formattedEmail).get();
        
        if (preAuthDoc.exists) {
          const data = preAuthDoc.data();
          results.push({
            email: formattedEmail,
            isPreAuthorized: true,
            role: data.role || 'validator',
            languageScope: data.languageScope || 'All',
            institution: data.institution || 'Langoora'
          });
        } else {
          results.push({
            email: formattedEmail,
            isPreAuthorized: false
          });
        }
      }

      return res.status(200).json({
        success: true,
        results
      });

    } catch (error) {
      console.error('Bulk pre-authorization check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to check pre-authorization statuses.',
        error: error.message 
      });
    }
  }
);

module.exports = router;