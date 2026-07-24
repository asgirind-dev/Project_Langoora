const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware'); 

// ==========================================
// 1. SUBSCRIPTION PLANS ENDPOINTS
// ==========================================
router.get('/plans', subscriptionController.getPlans);
router.post('/plans', subscriptionController.createPlan);
router.put('/plans/:id', subscriptionController.updatePlan);
router.delete('/plans/:id', subscriptionController.deletePlan);

// ==========================================
// 2. 💳 SECURE CHECKOUT & CHARGE ENDPOINT
// ==========================================
// 💳 PayHere එකට අවශ්‍ය Data Generate කරලා දෙන තැන (Controller එක ඇතුළේ ලියලා තියෙන්නේ)
router.post('/charge', subscriptionController.upgradeSubscription);

// 🔄 PayHere සර්වර් එකෙන් සැබෑ ලෙසම සල්ලි කැපුනම කෝල් කරන Webhook Listener එක
// ⚠️ මේකට 'protect' දාන්න එපා! මොකද මේක කෝල් කරන්නේ යූසර් නෙවෙයි, PayHere සර්වර් එකෙන්.
router.post('/payhere-notify', subscriptionController.handlePayhereNotification);

// ==========================================
// 3. EXAM CATEGORIES ENDPOINTS
// ==========================================
router.get('/categories', subscriptionController.getCategories);
router.post('/categories', subscriptionController.createCategory);
router.put('/categories/:id', subscriptionController.updateCategory);
router.delete('/categories/:id', subscriptionController.deleteCategory);

module.exports = router;