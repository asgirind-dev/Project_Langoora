const { db } = require('../config/firebase');

// ============================================
// 1. CREATE PAYOUT REQUEST
// ============================================
exports.createPayoutRequest = async (req, res) => {
    try {
        const { tutorId, tokens, creditValue } = req.body;
        const totalAmount = tokens * creditValue;
        const payoutData = {
            tutorId,
            totalTokens: tokens,
            totalAmount,
            tutorShare: totalAmount * 0.8,
            platformShare: totalAmount * 0.2,
            createdAt: new Date().toISOString(),
            status: 'Pending'
        };
        
        await db.collection('tutor_payouts').add(payoutData);
        res.status(201).json({ 
            success: true,
            message: "Payout request created successfully!" 
        });
    } catch (error) {
        console.error("Error in createPayoutRequest:", error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// ============================================
// 2. GET ALL PAYOUTS
// ============================================
exports.getAllPayouts = async (req, res) => {
    try {
        const payoutSnapshot = await db.collection('tutor_payouts').get();
        const payouts = payoutSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const settledPayouts = payouts.filter(p => p.status === 'Settled' && p.transactionCreated === true);

        const transactionSnapshot = await db.collection('transactions')
            .where('status', '==', 'completed')
            .where('type', '==', 'Payout')
            .get();
        
        let totalCredits = 0;
        let totalAmount = 0;
        transactionSnapshot.forEach(doc => {
            const data = doc.data();
            totalCredits += data.credits || 0;
            totalAmount += data.amount || 0;
        });

        res.status(200).json({
            success: true,
            payouts: payouts,
            settledPayouts: settledPayouts,
            totalCredits: totalCredits,
            totalAmount: totalAmount,
            stats: {
                pending: payouts.filter(p => p.status === 'Pending').length,
                settled: settledPayouts.length,
                declined: payouts.filter(p => p.status === 'Declined').length,
                totalCredits: totalCredits
            }
        });
    } catch (error) {
        console.error("Error in getAllPayouts:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 3. GET SETTLED PAYOUTS
// ============================================
exports.getSettledPayouts = async (req, res) => {
    try {
        const snapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Settled')
            .where('transactionCreated', '==', true)
            .get();

        const payouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ success: true, payouts, count: payouts.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 4. GET TOTAL USED CREDITS
// ============================================
exports.getTotalUsedCredits = async (req, res) => {
    try {
        const snapshot = await db.collection('transactions')
            .where('status', '==', 'completed')
            .where('type', '==', 'Payout')
            .get();

        let totalCredits = 0;
        let totalAmount = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            totalCredits += data.credits || 0;
            totalAmount += data.amount || 0;
        });

        res.status(200).json({ success: true, totalCredits, totalAmount, count: snapshot.size });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 5. UPDATE PAYOUT STATUS
// ============================================
exports.updatePayoutStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const payoutDoc = await db.collection('tutor_payouts').doc(id).get();
        if (!payoutDoc.exists) {
            return res.status(404).json({ success: false, message: "Payout not found" });
        }

        const payoutData = payoutDoc.data();

        if (status === 'Settled') {
            const transactionData = {
                tutorId: payoutData.tutorId,
                payoutId: id,
                type: 'Payout',
                status: 'completed',
                amount: payoutData.totalAmount || 0,
                credits: payoutData.totalTokens || 0,
                tutorShare: payoutData.tutorShare || 0,
                platformShare: payoutData.platformShare || 0,
                createdAt: new Date().toISOString(),
                processedAt: new Date().toISOString()
            };

            const transactionRef = await db.collection('transactions').add(transactionData);

            await db.collection('tutor_payouts').doc(id).update({
                status: 'Settled',
                transactionId: transactionRef.id,
                transactionCreated: true,
                settledAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            return res.status(200).json({ success: true, message: "Payout settled successfully!" });
        }

        if (status === 'Declined') {
            await db.collection('tutor_payouts').doc(id).update({ status: 'Declined', declinedAt: new Date().toISOString() });
            return res.status(200).json({ success: true, message: "Payout declined!" });
        }

        await db.collection('tutor_payouts').doc(id).update({ status: status });
        res.status(200).json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 6. GET ACTIVE TUTORS FOR PAYOUTS (Actual Data from purchased_exams)
// ============================================
exports.getActiveTutorsPayouts = async (req, res) => {
    try {
        const CREDIT_RATE = 10;          // 1 Credit = 10 LKR
        const TUTOR_SHARE_RATIO = 0.80;  // 80% to Tutor
        const PLATFORM_SHARE_RATIO = 0.20; // 20% to System

        // 1. Fetch all purchased exams
        const purchasedSnapshot = await db.collection('purchased_exams').get();

        console.log(`📊 Total purchased_exams found: ${purchasedSnapshot.size}`);

        if (purchasedSnapshot.empty) {
            return res.status(200).json({ success: true, tutors: [], count: 0 });
        }

        // 2. Aggregate tokens/credits and paper counts per tutor
        const tutorStats = {};

        purchasedSnapshot.forEach(doc => {
            const data = doc.data();
            const tutorId = data.tutor_id;
            const credits = Number(data.credits_deducted || data.credits || 0);

            if (tutorId) {
                if (!tutorStats[tutorId]) {
                    tutorStats[tutorId] = {
                        totalTokens: 0,
                        paperCount: 0,
                        studentIds: new Set()
                    };
                }
                tutorStats[tutorId].totalTokens += credits;
                tutorStats[tutorId].paperCount += 1;
                if (data.student_id) {
                    tutorStats[tutorId].studentIds.add(data.student_id);
                }
            }
        });

        const activeTutorIds = Object.keys(tutorStats);
        console.log(`📋 Active Tutor IDs with sales:`, activeTutorIds);
        const resultTutors = [];

        for (const tutorId of activeTutorIds) {
            const userDoc = await db.collection('users').doc(tutorId).get();
            
            // ටියුටර් යූසර් කෙනෙක් සොයාගත නොහැකි වුවද ඩේටා පෙන්වීමට ෆෝල්බැක් එකක්
            const userData = userDoc.exists ? userDoc.data() : { name: "Asgiri Perera", email: "tutor@gmail.com" };

            let bankName = "Not Specified";
            let accountNo = "N/A";

            const bankSnapshot = await db.collection('users')
                .doc(tutorId)
                .collection('bankCards')
                .limit(1)
                .get();

            if (!bankSnapshot.empty) {
                const card = bankSnapshot.docs[0].data();
                bankName = card.bankName || "Not Specified";
                accountNo = card.accountNo || card.account || "N/A";
            }

            const stats = tutorStats[tutorId];
            const totalTokens = stats.totalTokens;
            const grossAmount = totalTokens * CREDIT_RATE;
            const netPayout = grossAmount * TUTOR_SHARE_RATIO;
            const commissionAmount = grossAmount * PLATFORM_SHARE_RATIO;

            resultTutors.push({
                id: tutorId,
                tutor: userData.name || userData.tutorName || "Asgiri Perera",
                email: userData.email || "",
                phone: userData.phone || "",
                avatar: (userData.name || "A")[0].toUpperCase(),
                bank: bankName,
                account: accountNo,
                totalTokens: totalTokens,
                paperCount: stats.paperCount,
                studentCount: stats.studentIds.size,
                grossAmount: grossAmount,
                netPayout: netPayout,
                commissionAmount: commissionAmount,
                status: 'Pending',
                createdAt: userData.createdAt || new Date().toISOString()
            });
        }

        return res.status(200).json({ success: true, tutors: resultTutors, count: resultTutors.length });

    } catch (error) {
        console.error("Error in getActiveTutorsPayouts:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 7. GET SINGLE TUTOR DETAILS
// ============================================
exports.getTutorDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const tutorDoc = await db.collection('users').doc(id).get();
        if (!tutorDoc.exists) return res.status(404).json({ success: false, message: "Tutor not found" });
        res.status(200).json({ success: true, tutor: { id: tutorDoc.id, ...tutorDoc.data() } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 8. UPDATE TUTOR CREDITS
// ============================================
exports.updateTutorCredits = async (req, res) => {
    try {
        const { id } = req.params;
        const { credits } = req.body;
        await db.collection('users').doc(id).update({ credits, updatedAt: new Date().toISOString() });
        res.status(200).json({ success: true, message: "Credits updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 9. GET DECLINED PAYOUTS
// ============================================
exports.getDeclinedPayouts = async (req, res) => {
    try {
        const snapshot = await db.collection('tutor_payouts').where('status', '==', 'Declined').get();
        const payouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ success: true, payouts, count: payouts.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 10. DELETE PAYOUT
// ============================================
exports.deletePayout = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('tutor_payouts').doc(id).delete();
        res.status(200).json({ success: true, message: "Payout deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 11. DELETE ALL DECLINED PAYOUTS
// ============================================
exports.deleteAllDeclinedPayouts = async (req, res) => {
    try {
        const snapshot = await db.collection('tutor_payouts').where('status', '==', 'Declined').get();
        let deletedCount = 0;
        for (const doc of snapshot.docs) {
            await db.collection('tutor_payouts').doc(doc.id).delete();
            deletedCount++;
        }
        res.status(200).json({ success: true, deletedCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 12. GET PENDING PAYOUTS
// ============================================
exports.getPendingPayouts = async (req, res) => {
    try {
        const snapshot = await db.collection('tutor_payouts').where('status', '==', 'Pending').get();
        const payouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ success: true, payouts, count: payouts.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 13. GET PAYOUT BY ID (⭐ මෙන්න මේ function එක නැතිවයි පෙර error එක ආවේ)
// ============================================
exports.getPayoutById = async (req, res) => {
    try {
        const { id } = req.params;
        const payoutDoc = await db.collection('tutor_payouts').doc(id).get();
        if (!payoutDoc.exists) {
            return res.status(404).json({ success: false, message: "Payout not found" });
        }
        
        const data = payoutDoc.data();
        let transaction = null;
        if (data.transactionId) {
            const transactionDoc = await db.collection('transactions').doc(data.transactionId).get();
            if (transactionDoc.exists) {
                transaction = { id: transactionDoc.id, ...transactionDoc.data() };
            }
        }
        
        res.status(200).json({
            success: true,
            payout: { id: payoutDoc.id, ...data, transaction }
        });
    } catch (error) {
        console.error("Error in getPayoutById:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 14. BULK UPDATE PAYOUT STATUS
// ============================================
exports.bulkUpdatePayoutStatus = async (req, res) => {
    try {
        const { payoutIds, status } = req.body;
        for (const id of payoutIds) {
            await db.collection('tutor_payouts').doc(id).update({ status, updatedAt: new Date().toISOString() });
        }
        res.status(200).json({ success: true, message: "Bulk update successful" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 15. GET PAYOUT STATISTICS DASHBOARD
// ============================================
exports.getPayoutStatistics = async (req, res) => {
    try {
        const totalSnapshot = await db.collection('tutor_payouts').get();
        res.status(200).json({ success: true, statistics: { totalPayouts: totalSnapshot.size } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 16. REVERT SETTLED PAYOUT
// ============================================
exports.revertSettledPayout = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('tutor_payouts').doc(id).update({ status: 'Pending', updatedAt: new Date().toISOString() });
        res.status(200).json({ success: true, message: "Payout reverted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};