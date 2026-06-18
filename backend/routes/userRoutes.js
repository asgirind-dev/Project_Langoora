const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');


const { db, admin } = require('../config/firebase');

router.use(protect);

// 🔄 CRUD: Read 
router.get('/profile', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ success: false, message: "User ID (uid) is required" });
    }

    
    const doc = await db.collection('students').doc(uid).get();
    
    if (!doc.exists) {
     
      return res.status(200).json({ success: true, data: {} });
    }

    res.status(200).json({ success: true, data: doc.data() });
  } catch (error) {
    console.error("Backend Fetch Profile Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

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

router.put('/settings/language', async (req, res) => {
  try {
    const { uid, language } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID is required" });

    await db.collection('students').doc(uid).set({
      language,
      updatedAt: new Date().toISOString()
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

router.use(authorizeRoles('admin'));

router.get('/', userController.getAllUsers);
router.post('/provision', userController.provisionStaffNode);
router.put('/:uid/privileges', userController.updatePrivileges);
router.put('/:uid/lifecycle', userController.toggleUserLifecycle);

module.exports = router;