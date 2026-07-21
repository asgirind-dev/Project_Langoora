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
// 🔓 PUBLIC ROUTE - Pre-authorization check (NO authentication required)
// ======================================================================

/**
 * ✅ Check if an email is pre-authorized for staff registration
 * This route is PUBLIC so users can check before registering
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
        // Pre-authorization has expired
        return res.status(200).json({
          success: true,
          isPreAuthorized: false,
          expired: true,
          message: 'This invitation has expired. Please contact your administrator.'
        });
      }

      // ✅ FIX: Changed default institution from "LNBTI" to "Langoora"
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

    // Not pre-authorized
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
// 🔒 ALL ROUTES BELOW ARE PROTECTED (require authentication)
// ======================================================================

// All routes are protected by authentication
router.use(protect);

// ======================================================================
// STUDENT PROFILE ROUTES (No admin permissions required)
// ======================================================================

// 🔄 Get student profile
router.get('/profile', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false, message: "User ID (uid) is required" });
    const doc = await db.collection('students').doc(uid).get();
    if (!doc.exists) return res.status(200).json({ success: true, data: {} });
    res.status(200).json({ success: true, data: doc.data() });
  } catch (error) {
    console.error("Backend Fetch Profile Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

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
// ADMIN ROUTES – require specific permissions
// ======================================================================

// ---- User Management ----
// GET all users (requires 'manage_users' permission)
router.get(
  '/',
  requirePermission('manage_users'),
  userController.getAllUsers
);

// Provision a new staff member (requires 'manage_users')
router.post(
  '/provision',
  requirePermission('manage_users'),
  userController.provisionStaffNode
);

// Update user privileges (requires 'manage_users')
router.put(
  '/:uid/privileges',
  requirePermission('manage_users'),
  userController.updatePrivileges
);

// Toggle user lifecycle (suspend/activate) – requires 'manage_users'
router.put(
  '/:uid/lifecycle',
  requirePermission('manage_users'),
  userController.toggleUserLifecycle
);

// Delete a user – requires 'manage_users'
router.delete(
  '/:uid',
  requirePermission('manage_users'),
  userController.deleteUserNode
);

// ======================================================================
// ROLE MANAGEMENT – only for users with 'manage_roles' permission
// We also require level < 2 (Super Admin) to enforce hierarchy
// ======================================================================

// Get all roles (view)
router.get(
  '/roles',
  requirePermission('manage_roles'),
  userController.getRoles
);

// Create a new role (Super Admin only)
router.post(
  '/roles',
  requirePermission('manage_roles'),
  requireLevel(2),
  userController.createRole
);

// Update a role (Super Admin only)
router.put(
  '/roles/:roleId',
  requirePermission('manage_roles'),
  requireLevel(2),
  userController.updateRole
);

// Delete a role (Super Admin only)
router.delete(
  '/roles/:roleId',
  requirePermission('manage_roles'),
  requireLevel(2),
  userController.deleteRole
);

// ======================================================================
// BULK PRE-AUTHORIZATION CHECK (Admin only)
// ======================================================================

// ✅ Check multiple emails for pre-authorization (admin only)
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
          // ✅ FIX: Changed default institution from "LNBTI" to "Langoora"
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