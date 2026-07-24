// backend/routes/emailLogRoutes.js
const express = require('express');
const router = express.Router();
const emailLogController = require('../controllers/emailLogController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// All routes require authentication and admin role
router.use(protect);
router.use(authorizeRoles('admin', 'super_admin'));

// Get email logs
router.get('/logs', emailLogController.getLogs);

// Get email analytics
router.get('/analytics', emailLogController.getAnalytics);

// Rate limit management
router.get('/rate-limit', emailLogController.getRateLimitStatus);
router.post('/rate-limit', emailLogController.updateRateLimits);

// Clean old logs
router.delete('/clean', emailLogController.cleanLogs);

module.exports = router;