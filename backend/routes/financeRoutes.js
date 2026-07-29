const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const payoutController = require('../controllers/payoutController');

// ============================================
// 1. DASHBOARD & STATS ROUTES
// ============================================
router.get('/stats', financeController.getFinanceStats);
router.get('/transactions', financeController.getRecentTransactions);
router.get('/all-transactions', financeController.getAllTransactions);
router.get('/revenue-chart', financeController.getRevenueChartData);
router.get('/active-users', financeController.getActiveUsers);

// Test Route
router.get('/test', (req, res) => {
res.json({ 
    success: true, 
    message: "Finance API is working!",
    timestamp: new Date().toISOString()
});
});

// ============================================
// 2. TUTOR PAYOUT ROUTES
// ============================================
if (payoutController.getActiveTutorsPayouts) {
router.get('/active-tutors', payoutController.getActiveTutorsPayouts);
}

if (payoutController.getTotalUsedCredits) {
router.get('/total-used-credits', payoutController.getTotalUsedCredits);
router.get('/total-credits', payoutController.getTotalUsedCredits);
}

if (payoutController.getDeclinedPayouts) router.get('/declined', payoutController.getDeclinedPayouts);
if (payoutController.getPendingPayouts) router.get('/pending', payoutController.getPendingPayouts);
if (payoutController.getSettledPayouts) router.get('/settled', payoutController.getSettledPayouts);

if (payoutController.createPayoutRequest) router.post('/request', payoutController.createPayoutRequest);
if (payoutController.getAllPayouts) router.get('/get-all', payoutController.getAllPayouts);
if (payoutController.updatePayoutStatus) router.patch('/update-status/:id', payoutController.updatePayoutStatus);
if (payoutController.getTutorDetails) router.get('/tutor/:id', payoutController.getTutorDetails);
if (payoutController.updateTutorCredits) router.put('/tutor/:id/credits', payoutController.updateTutorCredits);

if (payoutController.deleteAllDeclinedPayouts) router.delete('/declined/all', payoutController.deleteAllDeclinedPayouts);
if (payoutController.deletePayout) router.delete('/:id', payoutController.deletePayout);
if (payoutController.getPayoutById) router.get('/:id', payoutController.getPayoutById);
if (payoutController.bulkUpdatePayoutStatus) router.patch('/bulk-update', payoutController.bulkUpdatePayoutStatus);
if (payoutController.getPayoutStatistics) router.get('/statistics/dashboard', payoutController.getPayoutStatistics);
if (payoutController.revertSettledPayout) router.post('/revert/:id', payoutController.revertSettledPayout);

module.exports = router;