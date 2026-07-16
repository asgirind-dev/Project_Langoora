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
  requireLevel(2), // only users with level < 2 (Super Admin)
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

module.exports = router;