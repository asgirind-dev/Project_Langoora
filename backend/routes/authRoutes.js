const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // Import the protection middleware

// ==========================================
// PUBLIC ROUTES (No Token Required)
// ==========================================

// Handle email/password registration workflow
router.post('/register', authController.registerUser);

// Handle unified identity gateway validation for both standard & initial Google logins
router.post('/login', authController.loginUser);

// Isolated Enterprise Staff Gateway Route
router.post('/staff-login', authController.loginStaff);

// Finalize extended profiles for onboarded Google accounts
router.post('/complete-google-registration', authController.completeGoogleRegistration);

// ==========================================
// ✅ PASSWORD RESET ROUTES (No Token Required)
// ==========================================

// Request password reset - sends email with reset link
router.post('/forgot-password', authController.forgotPassword);

// Confirm new password after receiving reset link
router.post('/reset-password', authController.resetPassword);

// ==========================================
// PROTECTED ROUTES (Valid Session Token Required)
// ==========================================

router.get('/me', protect, (req, res) => {
  // At this point, req.user is populated securely via the protect middleware
  res.status(200).json({
    success: true,
    message: "User context resolved successfully.",
    user: req.user
  });
});

module.exports = router;