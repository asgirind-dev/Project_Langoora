const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); 

// ==========================================
// 🔄 PUBLIC / WEBHOOK ENDPOINT (NO AUTH)
// ==========================================
router.post('/payhere-notify', subscriptionController.handlePayhereNotification);

// ==========================================
// 🔒 PROTECTED USER ENDPOINTS (ALL LOGGED-IN USERS)
// ==========================================
router.get('/plans', protect, subscriptionController.getPlans);
router.get('/categories', protect, subscriptionController.getCategories);
router.post('/charge', protect, subscriptionController.upgradeSubscription);

// ==========================================
// 🛡️ ADMIN ONLY ENDPOINTS
// ==========================================
router.use(protect, authorizeRoles('admin'));

router.post('/plans', subscriptionController.createPlan);
router.put('/plans/:id', subscriptionController.updatePlan);
router.delete('/plans/:id', subscriptionController.deletePlan);

router.post('/categories', subscriptionController.createCategory);
router.put('/categories/:id', subscriptionController.updateCategory);
router.delete('/categories/:id', subscriptionController.deleteCategory);

module.exports = router;