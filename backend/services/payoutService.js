const { db } = require('../config/firebase');

// ============================================
// PAYOUT SERVICE - Database operations
// ============================================

/**
 * නව payout request එකක් Firestore එකට add කරන්න
 */
const createPayout = async (payoutData) => {
    return await db.collection('tutor_payouts').add({
        ...payoutData,
        createdAt: new Date().toISOString(),
        status: 'Pending',
        transactionCreated: false
    });
};

/**
 * Tutor ගේ bank details ගන්න
 */
const getTutorBankDetails = async (tutorId) => {
    try {
        const tutorDoc = await db.collection('users').doc(tutorId).get();
        if (!tutorDoc.exists) return null;
        
        const tutorData = tutorDoc.data();
        
        const cardsSnapshot = await db.collection('users')
            .doc(tutorId)
            .collection('bankCards')
            .limit(1)
            .get();
        
        let bankCard = null;
        if (!cardsSnapshot.empty) {
            bankCard = cardsSnapshot.docs[0].data();
        }
        
        return {
            ...tutorData,
            bankCard: bankCard
        };
    } catch (error) {
        console.error("Error fetching tutor bank details:", error);
        return null;
    }
};

/**
 * Tutor ගේ tokens ගණනය කරන්න (purchased_exams වලින් පමණයි)
 */
const calculateTutorTokens = async (tutorId) => {
    try {
        let totalTokens = 0;
        let paperCount = 0;
        let studentCount = 0;
        let totalPurchases = 0;
        let uniqueExams = new Set();
        
        // Exam categories ගන්න (levels සමඟ)
        const categoriesSnapshot = await db.collection('exam_categories').get();
        const categoriesMap = {};
        categoriesSnapshot.forEach(doc => {
            const data = doc.data();
            const categoryId = doc.id;
            
            let levels = {};
            if (data.levels) {
                Object.keys(data.levels).forEach(levelKey => {
                    const levelData = data.levels[levelKey];
                    if (levelData && typeof levelData === 'object') {
                        levels[levelKey] = levelData.credits || 0;
                    }
                });
            }
            
            categoriesMap[categoryId] = {
                credits: data.credits || 0,
                levels: levels
            };
        });
        
        // මෙම tutor ගේ purchased exams ගන්න
        const purchasedSnapshot = await db.collection('purchased_exams')
            .where('tutor_id', '==', tutorId)
            .get();
        
        totalPurchases = purchasedSnapshot.size;
        
        const purchasedExamIds = new Set();
        purchasedSnapshot.forEach(doc => {
            const data = doc.data();
            const examId = data.examId || data.exam_id;
            if (examId) {
                purchasedExamIds.add(examId);
            }
        });
        
        uniqueExams = purchasedExamIds;
        
        // Tutor ගේ exams ගන්න (level data සමඟ)
        const examsSnapshot = await db.collection('exams')
            .where('tutor_id', '==', tutorId)
            .get();
        
        paperCount = examsSnapshot.size;
        
        for (const examDoc of examsSnapshot.docs) {
            const examData = examDoc.data();
            const examId = examDoc.id;
            const categoryId = examData.category_id;
            const levelId = examData.level_id || examData.levelId || '';
            
            if (!purchasedExamIds.has(examId)) {
                continue;
            }
            
            let examTokens = 0;
            
            if (categoryId && categoriesMap[categoryId]) {
                // Check level first
                if (levelId && categoriesMap[categoryId].levels && categoriesMap[categoryId].levels[levelId]) {
                    examTokens = categoriesMap[categoryId].levels[levelId];
                } else {
                    examTokens = categoriesMap[categoryId].credits || 0;
                }
            } else {
                examTokens = examData.total_questions || examData.total_problems || 20;
            }
            totalTokens += examTokens;
            
            const examPurchasedSnapshot = await db.collection('purchased_exams')
                .where('examId', '==', examId)
                .get();
            studentCount += examPurchasedSnapshot.size;
        }
        
        return {
            totalTokens,
            paperCount,
            studentCount,
            totalPurchases,
            uniqueExamsPurchased: uniqueExams.size,
            tokensPerPaper: paperCount > 0 ? Math.round(totalTokens / paperCount) : 0
        };
    } catch (error) {
        console.error("Error calculating tutor tokens:", error);
        return {
            totalTokens: 0,
            paperCount: 0,
            studentCount: 0,
            totalPurchases: 0,
            uniqueExamsPurchased: 0,
            tokensPerPaper: 0
        };
    }
};

/**
 * Payout එකක් settle කරන්න (transaction create + credits deduct)
 */
const settlePayout = async (payoutId) => {
    try {
        const payoutDoc = await db.collection('tutor_payouts').doc(payoutId).get();
        if (!payoutDoc.exists) {
            throw new Error('Payout not found');
        }
        
        const payoutData = payoutDoc.data();
        
        const transactionData = {
            tutorId: payoutData.tutorId,
            payoutId: payoutId,
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
        
        const transactionRef = await db.collection('transactions').add(transactionData);
        
        await db.collection('tutor_payouts').doc(payoutId).update({
            status: 'Settled',
            transactionId: transactionRef.id,
            transactionCreated: true,
            settledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
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
        }
        
        return {
            success: true,
            payoutId: payoutId,
            transactionId: transactionRef.id,
            transaction: transactionData
        };
    } catch (error) {
        console.error("Error settling payout:", error);
        throw error;
    }
};

module.exports = {
    createPayout,
    getTutorBankDetails,
    calculateTutorTokens,
    settlePayout
};