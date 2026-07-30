const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const payoutController = require('../controllers/payoutController');
const { manualSettlement, startTestSettlement } = require('../services/autoSettleService');

// ============================================
// PAYOUT ROUTES
// ============================================

// 1. Active tutors ගන්න (purchased exams තියෙන අය විතරයි)
router.get('/active-tutors', payoutController.getActiveTutorsPayouts);

// 2. Payout request එකක් create කරන්න
router.post('/request', payoutController.createPayoutRequest);

// 3. All payouts ගන්න
router.get('/get-all', payoutController.getAllPayouts);

// 4. Settled payouts ගන්න
router.get('/settled', payoutController.getSettledPayouts);

// 5. Pending payouts ගන්න
router.get('/pending', payoutController.getPendingPayouts);

// 6. Declined payouts ගන්න
router.get('/declined', payoutController.getDeclinedPayouts);

// 7. Total credits ගන්න
router.get('/total-credits', payoutController.getTotalUsedCredits);

// 8. Payout status update කරන්න (Settle/Decline)
router.patch('/update-status/:id', payoutController.updatePayoutStatus);

// 9. Payout by ID ගන්න
router.get('/:id', payoutController.getPayoutById);

// 10. Delete payout (Declined only)
router.delete('/:id', payoutController.deletePayout);

// 11. Delete all declined payouts
router.delete('/declined/all', payoutController.deleteAllDeclinedPayouts);

// 12. Payout statistics
router.get('/statistics/dashboard', payoutController.getPayoutStatistics);

// 13. Revert settled payout
router.post('/revert/:id', payoutController.revertSettledPayout);

// 14. Bulk update payout status
router.patch('/bulk-update', payoutController.bulkUpdatePayoutStatus);

// 15. Tutors tokens (purchased exams වලින් පමණයි)
router.get('/tutors-tokens', payoutController.getTutorsTokens);

// 16. Single tutor details
router.get('/tutor/:id', payoutController.getTutorDetails);

// 17. Update tutor credits (Auto-sync included)
router.put('/tutor/:id/credits', payoutController.updateTutorCredits);

// ============================================
// 🔥 ROUTE: Add Tutor Payout (Auto-create Collection)
// ============================================
router.post('/add-payout', payoutController.addTutorPayout);

// ============================================
// 🔥 AUTO SYNC ROUTES
// ============================================

// 18. Auto-sync specific tutor - User update එකෙන් පස්සේ call කරන්න
router.post('/auto-sync/:tutorId', payoutController.autoSyncUser);

// 19. Sync all tutors - හැම tutor ගේම payouts sync කරන්න
router.post('/sync-all-tutors', payoutController.syncAllTutors);

// 20. Manual sync specific tutor (GET method - browser එකෙන් test කරන්න)
router.get('/sync/:tutorId', payoutController.autoSyncUser);

router.post('/revert-all-settled', payoutController.revertAllSettled);

// ============================================
// 🔥 WEBHOOK: User update auto-sync endpoint
// ============================================
router.post('/webhook/user-update', async (req, res) => {
    try {
        const { tutorId, updatedFields } = req.body;
        
        console.log(`📨 Webhook received for tutor: ${tutorId}`);
        console.log(`📊 Updated fields:`, updatedFields);
        
        if (!tutorId) {
            return res.status(400).json({
                success: false,
                message: "tutorId is required"
            });
        }
        
        const result = await payoutController.autoSyncUserInternal(tutorId);
        
        res.status(200).json({
            success: true,
            message: `Synced ${result.updated} payout(s)`,
            data: result
        });
        
    } catch (error) {
        console.error("❌ Webhook error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// 🔥 AUTO SETTLE ROUTES
// ============================================

// 21. Manual settlement trigger - Admin එකෙන් call කරන්න
// POST /api/payouts/manual-settle
router.post('/manual-settle', async (req, res) => {
    try {
        console.log('📝 Manual settlement triggered by admin');
        
        // Check if user is admin (optional - add your auth check)
        // if (req.user.role !== 'admin') {
        //     return res.status(403).json({ success: false, message: 'Admin access required' });
        // }
        
        const result = await manualSettlement();
        
        res.status(200).json({
            success: true,
            message: 'Manual settlement completed',
            data: result
        });
    } catch (error) {
        console.error('❌ Manual settlement error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 22. Start test mode - හැම මිනිත්තුවකම settlement run වෙන්න (Development only)
// POST /api/payouts/start-test
router.post('/start-test', async (req, res) => {
    try {
        console.log('🧪 Test mode started - settlement runs every minute');
        startTestSettlement();
        
        res.status(200).json({
            success: true,
            message: 'Test mode started - settlement runs every minute'
        });
    } catch (error) {
        console.error('❌ Start test error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 23. Check settlement status
// GET /api/payouts/settlement-status
router.get('/settlement-status', async (req, res) => {
    try {
        // Get pending count
        const pendingSnapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Pending')
            .get();
        
        // Get settled count
        const settledSnapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Settled')
            .get();
        
        res.status(200).json({
            success: true,
            data: {
                pending: pendingSnapshot.size,
                settled: settledSnapshot.size,
                total: pendingSnapshot.size + settledSnapshot.size,
                nextSettlement: 'Every 25th at 12:00 AM'
            }
        });
    } catch (error) {
        console.error('❌ Settlement status error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 24. ✅ DIRECT SETTLEMENT ROUTE - සෑම මසකම 25 වෙනිදා Call කරන්න
// POST /api/payouts/settle-monthly
router.post('/settle-monthly', payoutController.settlePendingPayouts);

// ============================================
// Alternative update route
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