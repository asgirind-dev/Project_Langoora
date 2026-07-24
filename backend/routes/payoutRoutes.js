// routes/payoutRoutes.js

const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const payoutController = require('../controllers/payoutController');

// ============================================
// PAYOUT ROUTES
// ============================================

// Create a new payout request
router.post('/request', payoutController.createPayoutRequest);

// Get all payouts with statistics
router.get('/get-all', payoutController.getAllPayouts);

// Get settled payouts only
router.get('/settled', payoutController.getSettledPayouts);

// Get declined payouts only
router.get('/declined', payoutController.getDeclinedPayouts);

// Get pending payouts only
router.get('/pending', payoutController.getPendingPayouts);

// Get total credits from all transactions
router.get('/total-credits', payoutController.getTotalUsedCredits);

// Update payout status (Settle/Decline)
router.patch('/update-status/:id', payoutController.updatePayoutStatus);

// Get active tutors for payouts
router.get('/active-tutors', payoutController.getActiveTutorsPayouts);

// Get single tutor details
router.get('/tutor/:id', payoutController.getTutorDetails);

// Update tutor credits
router.put('/tutor/:id/credits', payoutController.updateTutorCredits);

// Get payout statistics dashboard
router.get('/statistics/dashboard', payoutController.getPayoutStatistics);

// 🗑️ Delete all declined payouts (MUST come before /:id)
router.delete('/declined/all', payoutController.deleteAllDeclinedPayouts);

// Get payout by ID with transaction details
router.get('/:id', payoutController.getPayoutById);

// 🗑️ Delete payout (Declined only)
router.delete('/:id', payoutController.deletePayout);

// Bulk update payout status
router.patch('/bulk-update', payoutController.bulkUpdatePayoutStatus);

// Revert settled payout (Admin only)
router.post('/revert/:id', payoutController.revertSettledPayout);

// ============================================
// UPDATE PAYOUT STATUS (Alternative route - Keep for backward compatibility)
// ============================================
router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
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