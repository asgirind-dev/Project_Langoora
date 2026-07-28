const cron = require('node-cron');
const { db } = require('../config/firebase');

// ============================================
// AUTO SETTLE SERVICE - හැම මාසේම 25 වෙනිදා
// ============================================

// Exchange Rate ගන්න
const getExchangeRate = async () => {
    try {
        const settingsDoc = await db.collection('system_settings').doc('global_config').get();
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            return settings.creditPrice || settings.exchangeRate || 20.00;
        }
        return 20.00;
    } catch (error) {
        console.log(`⚠️ Error fetching exchange rate: ${error.message}`);
        return 20.00;
    }
};

// Platform Commission ගන්න
const getPlatformCommission = async () => {
    try {
        const settingsDoc = await db.collection('system_settings').doc('global_config').get();
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            return (settings.platformCommission || 20) / 100;
        }
        return 0.20;
    } catch (error) {
        console.log(`⚠️ Error fetching platform commission: ${error.message}`);
        return 0.20;
    }
};

// Payout එක Auto-Settle කරන්න
const autoSettlePayout = async (payoutId, payoutData) => {
    try {
        console.log(`🔄 Auto-settling payout: ${payoutId}`);
        
        const exchangeRate = payoutData.exchangeRate || await getExchangeRate();
        const platformCommission = payoutData.platformCommission || await getPlatformCommission();
        
        // Transaction data create කරන්න
        const transactionData = {
            tutorId: payoutData.tutorId,
            tutorName: payoutData.tutorName,
            tutorEmail: payoutData.tutorEmail,
            tutorPhone: payoutData.tutorPhone,
            tutorUniversity: payoutData.tutorUniversity,
            payoutId: payoutId,
            type: 'Payout',
            status: 'completed',
            amount: payoutData.totalAmount || 0,
            credits: payoutData.totalTokens || 0,
            tutorShare: payoutData.netPayout || 0,
            platformShare: payoutData.platformShare || 0,
            creditValue: exchangeRate,
            exchangeRate: exchangeRate,
            platformCommission: platformCommission,
            bankName: payoutData.bankName,
            bankAccount: payoutData.bankAccount,
            createdAt: new Date().toISOString(),
            processedAt: new Date().toISOString(),
            paymentMethod: 'Bank Transfer',
            description: `Auto-settled payout for ${payoutData.tutorName || payoutData.tutorId}`
        };

        // Transaction create කරන්න
        const transactionRef = await db.collection('transactions').add(transactionData);
        console.log(`✅ Transaction created: ${transactionRef.id}`);

        // Payout status update කරන්න
        await db.collection('tutor_payouts').doc(payoutId).update({
            status: 'Settled',
            transactionId: transactionRef.id,
            transactionCreated: true,
            settledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Tutor credits deduct කරන්න
        const tutorDoc = await db.collection('users').doc(payoutData.tutorId).get();
        if (tutorDoc.exists) {
            const tutorData = tutorDoc.data();
            const currentCredits = tutorData.credits || 0;
            const newCredits = currentCredits - (payoutData.totalTokens || 0);
            
            await db.collection('users').doc(payoutData.tutorId).update({
                credits: Math.max(0, newCredits),
                lastPayoutAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            console.log(`✅ Tutor credits updated: ${currentCredits} -> ${Math.max(0, newCredits)}`);
        }

        return { success: true, transactionId: transactionRef.id };
        
    } catch (error) {
        console.error(`❌ Error auto-settling payout ${payoutId}:`, error);
        return { success: false, error: error.message };
    }
};

// හැම මාසේම 25 වෙනිදා Run වෙන function එක
const runMonthlySettlement = async () => {
    try {
        console.log(`🔄 Running monthly settlement for ${new Date().toISOString()}`);
        
        // Get all pending payouts
        const pendingSnapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Pending')
            .get();
        
        if (pendingSnapshot.empty) {
            console.log('ℹ️ No pending payouts to settle');
            return { total: 0, settled: 0, failed: 0 };
        }
        
        console.log(`📊 Found ${pendingSnapshot.size} pending payouts`);
        
        let settled = 0;
        let failed = 0;
        const results = [];
        
        for (const doc of pendingSnapshot.docs) {
            const payoutData = doc.data();
            const payoutId = doc.id;
            
            console.log(`📝 Processing payout: ${payoutId} - ${payoutData.tutorName}`);
            
            const result = await autoSettlePayout(payoutId, payoutData);
            
            if (result.success) {
                settled++;
                results.push({ payoutId, status: 'settled', transactionId: result.transactionId });
            } else {
                failed++;
                results.push({ payoutId, status: 'failed', error: result.error });
            }
        }
        
        console.log(`✅ Settlement complete: ${settled} settled, ${failed} failed`);
        
        return { total: pendingSnapshot.size, settled, failed, results };
        
    } catch (error) {
        console.error('❌ Error in monthly settlement:', error);
        throw error;
    }
};

// ============================================
// CRON JOB - හැම මාසේම 25 වෙනිදා 12:00 AM
// ============================================

// 0 0 25 * * = හැම මාසේම 25 වෙනිදා මධ්‍යම රාත්‍රී 12ට
const scheduleMonthlySettlement = () => {
    cron.schedule('0 0 25 * *', async () => {
        console.log(`📅 Running scheduled monthly settlement on 25th`);
        try {
            await runMonthlySettlement();
        } catch (error) {
            console.error('❌ Scheduled settlement failed:', error);
        }
    });
    
    console.log('✅ Monthly settlement scheduled for every 25th at 12:00 AM');
};

// ============================================
// MANUAL SETTLEMENT - Admin එකෙන් call කරන්න
// ============================================
const manualSettlement = async () => {
    return await runMonthlySettlement();
};

// ============================================
// TEST SETTLEMENT - Test කරන්න (හැම මිනිත්තුවකම)
// ============================================
const startTestSettlement = () => {
    console.log('🧪 TEST MODE: Settlement running every minute');
    cron.schedule('* * * * *', async () => {
        console.log(`🧪 TEST: Running settlement every minute at ${new Date().toISOString()}`);
        try {
            await runMonthlySettlement();
        } catch (error) {
            console.error('❌ Test settlement failed:', error);
        }
    });
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
    scheduleMonthlySettlement,
    manualSettlement,
    runMonthlySettlement,
    autoSettlePayout,
    startTestSettlement
};