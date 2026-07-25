const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const payoutController = require('../controllers/payoutController');

// 1. Dashboard Stats
router.get('/stats', financeController.getFinanceStats);

// 2. Recent Transactions (Limit 5)
router.get('/transactions', financeController.getRecentTransactions);

// 3. Ledger Audit (All Transactions)
router.get('/all-transactions', financeController.getAllTransactions);

// 4. Revenue Chart Data
router.get('/revenue-chart', financeController.getRevenueChartData);

// 5. Active Users
router.get('/active-users', financeController.getActiveUsers);

// ============================================
// TEST ROUTE
// ============================================
router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: "Finance API is working!",
        timestamp: new Date().toISOString()
    });
});

// ============================================
// ACTIVE TUTORS ROUTE
// ============================================
router.get('/active-tutors', payoutController.getActiveTutorsPayouts);

// ============================================
// ⭐ GET ALL TUTORS WITH TOKENS FROM PURCHASED_EXAMS
// ============================================
router.get('/tutors-tokens', financeController.getAllTutorsWithTokens);


// ============================================
// TOTAL USED CREDITS ROUTE
// ============================================
router.get('/total-used-credits', payoutController.getTotalUsedCredits);

// ============================================
// ✅ GET DECLINED PAYOUTS
// ============================================
router.get('/declined', payoutController.getDeclinedPayouts);

// ============================================
// ✅ GET PENDING PAYOUTS
// ============================================
router.get('/pending', payoutController.getPendingPayouts);

// ============================================
// ✅ GET SETTLED PAYOUTS
// ============================================
router.get('/settled', payoutController.getSettledPayouts);

// ============================================
// ✅ GET TOTAL CREDITS (alias for total-used-credits)
// ============================================
router.get('/total-credits', payoutController.getTotalUsedCredits);


// ============================================
// PAYOUT ROUTES
// ============================================
// Create a new payout request
router.post('/request', payoutController.createPayoutRequest);

// Get all payouts
router.get('/get-all', payoutController.getAllPayouts);

// Update payout status
router.patch('/update-status/:id', payoutController.updatePayoutStatus);

// Get single tutor details
router.get('/tutor/:id', payoutController.getTutorDetails);


// Update tutor credits
router.put('/tutor/:id/credits', payoutController.updateTutorCredits);

// ============================================
// ✅ GET PAYOUT BY ID (MUST come before /:id delete)
// ============================================
router.get('/:id', payoutController.getPayoutById);

// ============================================
// ✅ DELETE ALL DECLINED PAYOUTS (MUST come before /:id)
// ============================================
router.delete('/declined/all', payoutController.deleteAllDeclinedPayouts);

// ============================================
// ✅ DELETE PAYOUT (Declined only)
// ============================================
router.delete('/:id', payoutController.deletePayout);

// ============================================
// ✅ BULK UPDATE PAYOUT STATUS
// ============================================
router.patch('/bulk-update', payoutController.bulkUpdatePayoutStatus);

// ============================================
// ✅ GET PAYOUT STATISTICS DASHBOARD
// ============================================
router.get('/statistics/dashboard', payoutController.getPayoutStatistics);

// ============================================
// ✅ REVERT SETTLED PAYOUT (Admin only)
// ============================================
router.post('/revert/:id', payoutController.revertSettledPayout);

// ============================================
// UPDATE PAYOUT STATUS (Alternative route)
// ============================================
router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const { db } = require('../config/firebase');
        await db.collection('tutor_payouts').doc(id).update({ 
            status: status, 
            processedAt: new Date().toISOString() 
        });
        res.status(200).json({ 
            success: true,
            message: "Status updated successfully!" 
        });
    } catch (error) {
        console.log("Backend Error Details:", error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

module.exports = router;