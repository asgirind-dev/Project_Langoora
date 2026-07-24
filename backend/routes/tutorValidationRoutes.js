// backend/routes/tutorValidationRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const tutorValidationController = require('../controllers/tutorValidationController');

// 🔒 Protect all routes - require authentication and validator role
router.use(protect);
router.use(authorizeRoles('validator', 'admin', 'super_admin'));

// 📋 Get pending tutor applications
router.get('/pending-queue', tutorValidationController.getPendingQueue);

// ✅ Approve tutor (sends approval email)
router.put('/approve/:id', tutorValidationController.approveTutor);

// ❌ Reject tutor with optional reason (sends rejection email)
router.put('/reject/:id', tutorValidationController.rejectTutor);

// 📝 Update rejection reason (optional)
router.put('/rejection-reason/:id', tutorValidationController.updateRejectionReason);

module.exports = router;