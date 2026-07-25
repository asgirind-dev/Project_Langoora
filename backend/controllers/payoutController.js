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
// 2. GET ALL PAYOUTS (සංශෝධිත)
// ============================================
exports.getAllPayouts = async (req, res) => {
    try {
        // 1. Tutor Payouts සියල්ල ගන්න
        const payoutSnapshot = await db.collection('tutor_payouts').get();
        const payouts = payoutSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // 2. Settled Payouts (transactionCreated === true)
        const settledPayouts = payouts.filter(p => p.status === 'Settled' && p.transactionCreated === true);

        // 3. Total Credits ගණනය කරන්න (සියලුම completed Payout transactions වලින්)
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
        res.status(500).json({
            success: false,
            error: error.message
        });
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

        const payouts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            success: true,
            payouts: payouts,
            count: payouts.length
        });
    } catch (error) {
        console.error("Error in getSettledPayouts:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 4. GET TOTAL USED CREDITS
// ============================================
exports.getTotalUsedCredits = async (req, res) => {
    try {
        console.log("🔍 Fetching total used credits from transactions...");
        
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

        console.log(`✅ Total used credits: ${totalCredits}, Total amount: ${totalAmount}`);

        res.status(200).json({
            success: true,
            totalCredits: totalCredits,
            totalAmount: totalAmount,
            count: snapshot.size
        });
    } catch (error) {
        console.error("Error in getTotalUsedCredits:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 5. UPDATE PAYOUT STATUS (SETTLE PAYOUT - ප්‍රධාන ක්‍රියාවලිය)
// ============================================
exports.updatePayoutStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // 1. Payout document එක ලබා ගන්න
        const payoutDoc = await db.collection('tutor_payouts').doc(id).get();
        if (!payoutDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "Payout not found"
            });
        }

        const payoutData = payoutDoc.data();

        // ============================================
        // 2. SETTLE කරන විට transaction එකක් සාදන්න
        // ============================================
        if (status === 'Settled') {
            // A. transaction document එක සාදන්න
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
                processedAt: new Date().toISOString(),
                paymentMethod: 'Bank Transfer',
                description: `Payout settlement for tutor ${payoutData.tutorId}`
            };

            // B. Transaction එක Firestore එකට save කරන්න
            const transactionRef = await db.collection('transactions').add(transactionData);
            console.log(`✅ Transaction created: ${transactionRef.id}`);

            // C. Payout document එක update කරන්න
            await db.collection('tutor_payouts').doc(id).update({
                status: 'Settled',
                transactionId: transactionRef.id,
                transactionCreated: true,
                settledAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // D. Tutor ගේ credits ගණනය කර update කරන්න (පවතින credits වලින් අඩු කරන්න)
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

            // E. Success response
            return res.status(200).json({
                success: true,
                message: "Payout settled successfully! Transaction created and added to card.",
                data: {
                    payoutId: id,
                    transactionId: transactionRef.id,
                    amount: payoutData.totalAmount,
                    credits: payoutData.totalTokens,
                    transaction: transactionData
                }
            });
        }

        // ============================================
        // 3. DECLINED කරන විට - transaction එකක් හදන්න එපා
        // ============================================
        if (status === 'Declined') {
            await db.collection('tutor_payouts').doc(id).update({
                status: 'Declined',
                declinedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            return res.status(200).json({
                success: true,
                message: "Payout declined successfully! No transaction created."
            });
        }

        // ============================================
        // 4. PENDING තත්වයට යාවත්කාලීන කිරීම
        // ============================================
        await db.collection('tutor_payouts').doc(id).update({
            status: status,
            updatedAt: new Date().toISOString()
        });

        res.status(200).json({
            success: true,
            message: `Payout status updated to ${status}!`
        });

    } catch (error) {
        console.error("Error in updatePayoutStatus:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 6. GET ACTIVE TUTORS FOR PAYOUTS
// ============================================
// ============================================
// 6. GET ACTIVE TUTORS FOR PAYOUTS (With Bank Cards from Sub-collection)
// ============================================
exports.getActiveTutorsPayouts = async (req, res) => {
    try {
        console.log("🔍 Fetching active tutors from Firestore...");
        console.log("📋 Query: users collection where role=tutor and status=active");
        
        const snapshot = await db.collection('users')
            .where('role', '==', 'tutor')
            .where('status', '==', 'active')
            .get();

        console.log(`📊 Query executed. Empty: ${snapshot.empty}`);

        if (snapshot.empty) {
            console.log("⚠️ No active tutors found");
            return res.status(200).json({
                success: true,
                tutors: [],
                message: "No active tutors found",
                count: 0
            });
        }

        const tutors = [];
        
        // ⭐ Loop through each tutor to get bank cards from sub-collection
        for (const doc of snapshot.docs) {
            const data = doc.data();
            console.log(`📝 Tutor document: ${doc.id}`, data);
            
            // ⭐ Get bank cards from sub-collection
            let bankName = "Not Specified";
            let bankAccount = "N/A";
            
            try {
                const cardsSnapshot = await db.collection('users')
                    .doc(doc.id)
                    .collection('bankCards')
                    .limit(1)
                    .get();
                
                if (!cardsSnapshot.empty) {
                    const cardData = cardsSnapshot.docs[0].data();
                    bankName = cardData.bankName || "Not Specified";
                    bankAccount = cardData.accountNo || cardData.account || "N/A";
                    console.log(`✅ Bank card found for ${doc.id}: ${bankName} - ${bankAccount}`);
                } else {
                    console.log(`ℹ️ No bank cards found for ${doc.id}`);
                }
            } catch (error) {
                console.log(`⚠️ Error fetching bank cards for ${doc.id}:`, error.message);
            }
            
            tutors.push({
                id: doc.id,
                tutor: data.name || data.tutorName || "Unknown Tutor",
                credits: data.credits || data.totalTokens || 0,
                bank: bankName,
                account: bankAccount,
                status: 'Pending',
                email: data.email || "",
                phone: data.phone || "",
                avatar: (data.name || data.tutorName || "T")[0].toUpperCase(),
                university: data.university || "",
                qualifications: data.qualifications || "",
                language: data.language || "",
                verifiedAt: data.verifiedAt || null,
                createdAt: data.createdAt || new Date().toISOString(),
                rawData: data
            });
        }

        console.log(`✅ Found ${tutors.length} active tutors`);
        if (tutors.length > 0) {
            console.log("📝 Sample tutor:", tutors[0]);
        }

        res.status(200).json({
            success: true,
            tutors: tutors,
            count: tutors.length
        });
    } catch (error) {
        console.error("Error in getActiveTutorsPayouts:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch active tutors",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// ============================================
// 7. GET SINGLE TUTOR DETAILS
// ============================================
exports.getTutorDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        const tutorDoc = await db.collection('users').doc(id).get();
        if (!tutorDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "Tutor not found"
            });
        }
        
        const data = tutorDoc.data();
        res.status(200).json({
            success: true,
            tutor: {
                id: tutorDoc.id,
                ...data
            }
        });
    } catch (error) {
        console.error("Error in getTutorDetails:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 8. UPDATE TUTOR CREDITS
// ============================================
exports.updateTutorCredits = async (req, res) => {
    try {
        const { id } = req.params;
        const { credits } = req.body;
        
        await db.collection('users').doc(id).update({
            credits: credits,
            updatedAt: new Date().toISOString()
        });
        
        res.status(200).json({
            success: true,
            message: "Credits updated successfully"
        });
    } catch (error) {
        console.error("Error in updateTutorCredits:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


// ============================================
// 9. GET DECLINED PAYOUTS
// ============================================
exports.getDeclinedPayouts = async (req, res) => {
    try {
        const snapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Declined')
            .get();

        const payouts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            success: true,
            payouts: payouts,
            count: payouts.length
        });
    } catch (error) {
        console.error("Error in getDeclinedPayouts:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 10. DELETE PAYOUT (Declined only)
// ============================================
exports.deletePayout = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Payout document එක ගන්න
        const payoutDoc = await db.collection('tutor_payouts').doc(id).get();
        if (!payoutDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "Payout not found"
            });
        }
        
        const payoutData = payoutDoc.data();
        
        // 2. Declined payouts පමණක් delete කළ හැක
        if (payoutData.status !== 'Declined') {
            return res.status(400).json({
                success: false,
                message: "Only Declined payouts can be deleted"
            });
        }
        
        // 3. Transaction එකක් තිබේ නම් එයත් delete කරන්න
        if (payoutData.transactionId) {
            await db.collection('transactions').doc(payoutData.transactionId).delete();
            console.log(`✅ Transaction ${payoutData.transactionId} deleted`);
        }
        
        // 4. Payout document එක delete කරන්න
        await db.collection('tutor_payouts').doc(id).delete();
        
        res.status(200).json({
            success: true,
            message: "Payout deleted successfully!"
        });
    } catch (error) {
        console.error("Error in deletePayout:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 11. DELETE ALL DECLINED PAYOUTS
// ============================================
exports.deleteAllDeclinedPayouts = async (req, res) => {
    try {
        // 1. All declined payouts ගන්න
        const snapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Declined')
            .get();
        
        if (snapshot.empty) {
            return res.status(200).json({
                success: true,
                message: "No declined payouts to delete",
                deletedCount: 0
            });
        }
        
        let deletedCount = 0;
        let deletedTransactions = 0;
        
        // 2. Each payout එක delete කරන්න
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Transaction තිබේ නම් delete කරන්න
            if (data.transactionId) {
                await db.collection('transactions').doc(data.transactionId).delete();
                deletedTransactions++;
            }
            
            // Payout document එක delete කරන්න
            await db.collection('tutor_payouts').doc(doc.id).delete();
            deletedCount++;
        }
        
        res.status(200).json({
            success: true,
            message: `Successfully deleted ${deletedCount} declined payouts`,
            deletedCount: deletedCount,
            deletedTransactions: deletedTransactions
        });
    } catch (error) {
        console.error("Error in deleteAllDeclinedPayouts:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 12. GET PENDING PAYOUTS
// ============================================
exports.getPendingPayouts = async (req, res) => {
    try {
        const snapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Pending')
            .get();

        const payouts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            success: true,
            payouts: payouts,
            count: payouts.length
        });
    } catch (error) {
        console.error("Error in getPendingPayouts:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 13. GET PAYOUT BY ID
// ============================================
exports.getPayoutById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const payoutDoc = await db.collection('tutor_payouts').doc(id).get();
        if (!payoutDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "Payout not found"
            });
        }
        
        const data = payoutDoc.data();
        
        // Transaction details ගන්න (ඇත්නම්)
        let transaction = null;
        if (data.transactionId) {
            const transactionDoc = await db.collection('transactions').doc(data.transactionId).get();
            if (transactionDoc.exists) {
                transaction = {
                    id: transactionDoc.id,
                    ...transactionDoc.data()
                };
            }
        }
        
        res.status(200).json({
            success: true,
            payout: {
                id: payoutDoc.id,
                ...data,
                transaction: transaction
            }
        });
    } catch (error) {
        console.error("Error in getPayoutById:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 14. BULK UPDATE PAYOUT STATUS
// ============================================
exports.bulkUpdatePayoutStatus = async (req, res) => {
    try {
        const { payoutIds, status } = req.body;
        
        if (!payoutIds || !Array.isArray(payoutIds) || payoutIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "payoutIds array is required"
            });
        }
        
        const results = [];
        for (const id of payoutIds) {
            try {
                // Update කරන්න
                await db.collection('tutor_payouts').doc(id).update({
                    status: status,
                    updatedAt: new Date().toISOString(),
                    ...(status === 'Settled' ? { settledAt: new Date().toISOString() } : {}),
                    ...(status === 'Declined' ? { declinedAt: new Date().toISOString() } : {})
                });
                results.push({ id, success: true });
            } catch (error) {
                results.push({ id, success: false, error: error.message });
            }
        }
        
        res.status(200).json({
            success: true,
            message: `Updated ${results.filter(r => r.success).length} payouts`,
            results: results
        });
    } catch (error) {
        console.error("Error in bulkUpdatePayoutStatus:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 15. GET PAYOUT STATISTICS DASHBOARD
// ============================================
exports.getPayoutStatistics = async (req, res) => {
    try {
        // Total payouts
        const totalSnapshot = await db.collection('tutor_payouts').get();
        const totalPayouts = totalSnapshot.size;
        
        // By status
        const pendingSnapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Pending')
            .get();
        const pendingCount = pendingSnapshot.size;
        
        const settledSnapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Settled')
            .get();
        const settledCount = settledSnapshot.size;
        
        const declinedSnapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Declined')
            .get();
        const declinedCount = declinedSnapshot.size;
        
        // Total amounts
        let totalAmount = 0;
        let totalTutorShare = 0;
        let totalPlatformShare = 0;
        totalSnapshot.forEach(doc => {
            const data = doc.data();
            totalAmount += data.totalAmount || 0;
            totalTutorShare += data.tutorShare || 0;
            totalPlatformShare += data.platformShare || 0;
        });
        
        // Total credits from transactions
        const transactionSnapshot = await db.collection('transactions')
            .where('status', '==', 'completed')
            .where('type', '==', 'Payout')
            .get();
        
        let totalCreditsUsed = 0;
        transactionSnapshot.forEach(doc => {
            const data = doc.data();
            totalCreditsUsed += data.credits || 0;
        });
        
        res.status(200).json({
            success: true,
            statistics: {
                totalPayouts: totalPayouts,
                pending: pendingCount,
                settled: settledCount,
                declined: declinedCount,
                totalAmount: totalAmount,
                totalTutorShare: totalTutorShare,
                totalPlatformShare: totalPlatformShare,
                totalCreditsUsed: totalCreditsUsed,
                completionRate: totalPayouts > 0 ? (settledCount / totalPayouts * 100).toFixed(2) : 0
            }
        });
    } catch (error) {
        console.error("Error in getPayoutStatistics:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 16. REVERT SETTLED PAYOUT (Admin only)
// ============================================
exports.revertSettledPayout = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Payout document එක ගන්න
        const payoutDoc = await db.collection('tutor_payouts').doc(id).get();
        if (!payoutDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "Payout not found"
            });
        }
        
        const payoutData = payoutDoc.data();
        
        // Settled payouts පමණක් revert කළ හැක
        if (payoutData.status !== 'Settled') {
            return res.status(400).json({
                success: false,
                message: "Only Settled payouts can be reverted"
            });
        }
        
        // Transaction එක delete කරන්න
        if (payoutData.transactionId) {
            await db.collection('transactions').doc(payoutData.transactionId).delete();
            console.log(`✅ Transaction ${payoutData.transactionId} deleted`);
        }
        
        // Tutor credits ආපසු add කරන්න
        const tutorDoc = await db.collection('users').doc(payoutData.tutorId).get();
        if (tutorDoc.exists) {
            const tutorData = tutorDoc.data();
            const currentCredits = tutorData.credits || 0;
            const newCredits = currentCredits + (payoutData.totalTokens || 0);
            
            await db.collection('users').doc(payoutData.tutorId).update({
                credits: newCredits,
                updatedAt: new Date().toISOString()
            });
            console.log(`✅ Tutor credits reverted: ${currentCredits} -> ${newCredits}`);
        }
        
        // Payout status එක Pending ලෙස update කරන්න
        await db.collection('tutor_payouts').doc(id).update({
            status: 'Pending',
            transactionId: null,
            transactionCreated: false,
            settledAt: null,
            updatedAt: new Date().toISOString()
        });
        
        res.status(200).json({
            success: true,
            message: "Payout reverted successfully!"
        });
    } catch (error) {
        console.error("Error in revertSettledPayout:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};