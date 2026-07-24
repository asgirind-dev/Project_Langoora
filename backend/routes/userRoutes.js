const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { db, admin } = require('../config/firebase');

// 🔒 සියලුම Routes සඳහා Auth Middleware එක ක්‍රියාත්මක කිරීම
router.use(protect);

// ==========================================
// 👤 STUDENT / USER PROFILE ENDPOINTS
// ==========================================

// 🔄 CRUD: Read (Updated with Fallback Collection Lookup)
router.get('/profile', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false, message: "User ID (uid) is required" });
    
    // 1. මුලින්ම ප්‍රධාන 'users' collection එකේ බලනවා
    let doc = await db.collection('users').doc(uid).get();
    
    // 2. 'users' එකේ නැත්නම් විතරක් 'students' එකේ බලනවා
    if (!doc.exists) {
      doc = await db.collection('students').doc(uid).get();
    }
    
    // 3. දෙකේම නැත්නම් හිස් object එකක් දෙනවා
    if (!doc.exists) {
      return res.status(200).json({ success: true, data: {} });
    }
    
    // 4. ඩේටා තියෙනවා නම් id එකත් එක්කම Frontend එකට යවනවා
    res.status(200).json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("Backend Fetch Profile Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 👈 💳 NEW: FRONTEND CHECKOUT AUTOFILL ENDPOINT
// Frontend එකේ Checkout Modal එක ඇතුළේ බැංකු විස්තර dynamic ඇදලා ගන්න කතා කරන්නේ මේකටයි.
// (router.use(protect) උඩින් දාලා තියෙන නිසා මේකත් auto-protect වෙනවා මචන්)
router.get('/checkout-profile', userController.getStudentProfile);

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

// ==========================================
// ⚙️ USER SETTINGS ENDPOINTS
// ==========================================
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

// ==========================================
// 🛡️ ADMIN PRIVILEGED BLOCK ENFORCEMENTS
// ==========================================
router.use(authorizeRoles('admin'));

router.get('/', userController.getAllUsers);
router.post('/provision', userController.provisionStaffNode);
router.put('/:uid/privileges', userController.updatePrivileges);
router.put('/:uid/lifecycle', userController.toggleUserLifecycle);
router.delete('/:uid', userController.deleteUserNode); 

module.exports = router;