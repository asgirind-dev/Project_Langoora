// backend/controllers/payoutController.js
const { db } = require('../config/firebase');

// ✅ ADD: Audit Log Service
const auditLogService = require('../services/auditLogService');

// ✅ Helper for non-blocking audit logging
const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

// ============================================
// HELPER: Get Exchange Rate from global_config
// ============================================
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

// ============================================
// HELPER: Get Platform Commission from global_config
// ============================================
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

// ============================================
// HELPER: Get Min Payout Threshold
// ============================================
const getMinPayoutThreshold = async () => {
    try {
        const settingsDoc = await db.collection('system_settings').doc('global_config').get();
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            return settings.minPayoutThreshold || 5000;
        }
        return 5000;
    } catch (error) {
        console.log(`⚠️ Error fetching min payout threshold: ${error.message}`);
        return 5000;
    }
};

// ============================================
// 🔥 HELPER: Get Tutor Bank Details
// ============================================
const getTutorBankDetails = async (tutorId) => {
    try {
        let bankName = "Not Specified";
        let bankAccount = "N/A";
        let bankCardId = null;
        
        const cardsSnapshot = await db.collection('users')
            .doc(tutorId)
            .collection('bankCards')
            .limit(1)
            .get();
        
        if (!cardsSnapshot.empty) {
            const cardData = cardsSnapshot.docs[0].data();
            bankName = cardData.bankName || cardData.name || "Not Specified";
            bankAccount = cardData.accountNo || cardData.account || "N/A";
            bankCardId = cardsSnapshot.docs[0].id;
        }
        
        return { bankName, bankAccount, bankCardId };
    } catch (error) {
        console.log(`⚠️ Error fetching bank cards: ${error.message}`);
        return { bankName: "Not Specified", bankAccount: "N/A", bankCardId: null };
    }
};

// ============================================
// 🔥 HELPER: Sync Tutor Data from Users to Tutor Payouts
// ============================================
const syncTutorToPayouts = async (tutorId, updateData) => {
    try {
        console.log(`🔄 Syncing tutor data to payouts: ${tutorId}`);
        console.log(`📝 Update data:`, updateData);
        
        // Get all payouts for this tutor
        const payoutSnapshot = await db.collection('tutor_payouts')
            .where('tutorId', '==', tutorId)
            .get();
        
        if (payoutSnapshot.empty) {
            console.log(`   ℹ️ No payouts found for tutor: ${tutorId}`);
            return { updated: 0 };
        }
        
        let updatedCount = 0;
        const batch = db.batch();
        
        payoutSnapshot.forEach(doc => {
            batch.update(doc.ref, {
                ...updateData,
                updatedAt: new Date().toISOString()
            });
            updatedCount++;
        });
        
        await batch.commit();
        console.log(`   ✅ Updated ${updatedCount} payout(s) with new data`);
        return { updated: updatedCount };
        
    } catch (error) {
        console.error(`   ❌ Error syncing tutor data: ${error.message}`);
        throw error;
    }
};

// ============================================
// 🔥 HELPER: Build Sync Data from User Document
// ============================================
const buildSyncDataFromUser = (tutorData, bankDetails = null) => {
    const syncData = {
        tutorName: tutorData.name || tutorData.tutorName || "Unknown Tutor",
        tutorEmail: tutorData.email || "",
        tutorPhone: tutorData.phone || "",
        tutorUniversity: tutorData.university || "",
        tutorQualifications: tutorData.qualifications || "",
        tutorAvatar: (tutorData.name || tutorData.tutorName || "T")[0].toUpperCase(),
        tutorCredits: tutorData.credits || 0,
        tutorRole: tutorData.role || 'tutor',
        tutorStatus: tutorData.status || 'active',
        tutorProfilePic: tutorData.profilePicUrl || null,
        tutorDob: tutorData.dob || null,
        tutorJoined: tutorData.joined || null,
        tutorAddress: tutorData.address || null,
        tutorLanguage: tutorData.language || null,
        tutorCertificate: tutorData.certificateData || null
    };
    
    if (bankDetails) {
        syncData.bankName = bankDetails.bankName;
        syncData.bankAccount = bankDetails.bankAccount;
        syncData.bankCardId = bankDetails.bankCardId;
    }
    
    return syncData;
};

// ============================================
// 🔥 AUTO SYNC: User Update එකක් වෙන හැම වෙලාවකම මේ function එක call කරන්න
// ============================================
const autoSyncUserToPayouts = async (tutorId) => {
    try {
        console.log(`🔄 Auto-sync triggered for tutor: ${tutorId}`);
        
        // Get updated user data
        const tutorDoc = await db.collection('users').doc(tutorId).get();
        if (!tutorDoc.exists) {
            console.log(`   ❌ Tutor not found: ${tutorId}`);
            return { success: false, message: "Tutor not found" };
        }
        
        const tutorData = tutorDoc.data();
        
        // Tutor නම් පමනක් sync වෙන්න ඕන
        if (tutorData.role !== 'tutor') {
            console.log(`   ⚠️ User is not a tutor (role: ${tutorData.role}), skipping sync`);
            return { success: false, message: "User is not a tutor" };
        }
        
        // Get bank details
        const bankDetails = await getTutorBankDetails(tutorId);
        
        // Build sync data
        const syncData = buildSyncDataFromUser(tutorData, bankDetails);
        
        // Sync to payouts
        const result = await syncTutorToPayouts(tutorId, syncData);
        
        return { 
            success: true, 
            updated: result.updated,
            syncData: syncData
        };
        
    } catch (error) {
        console.error(`   ❌ Auto-sync error: ${error.message}`);
        return { success: false, error: error.message };
    }
};

// ============================================
// 1. GET ACTIVE TUTORS WITH PURCHASED EXAMS ONLY
// ============================================
exports.getActiveTutorsPayouts = async (req, res) => {
    try {
        console.log("🔍 Fetching active tutors with purchased exams ONLY...");
        
        const creditRate = await getExchangeRate();
        const platformCommission = await getPlatformCommission();
        const minPayoutThreshold = await getMinPayoutThreshold();
        
        console.log(`💰 Exchange Rate: LKR ${creditRate}/credit`);
        console.log(`📊 Platform Commission: ${platformCommission * 100}%`);
        console.log(`📊 Min Payout Threshold: LKR ${minPayoutThreshold}`);
        
        const tutorsSnapshot = await db.collection('users')
            .where('role', '==', 'tutor')
            .where('status', '==', 'active')
            .get();

        console.log(`📊 Found ${tutorsSnapshot.size} active tutors`);

        if (tutorsSnapshot.empty) {
            return res.status(200).json({
                success: true,
                tutors: [],
                exchangeRate: creditRate,
                platformCommission: platformCommission,
                minPayoutThreshold: minPayoutThreshold,
                message: "No active tutors found",
                count: 0
            });
        }

        // Categories Load
        const categoriesSnapshot = await db.collection('exam_categories').get();
        const categoriesMap = {};
        const categoriesLowerMap = {};

        for (const doc of categoriesSnapshot.docs) {
            const data = doc.data();
            const categoryId = doc.id;
            
            console.log(`📂 Processing category: ${categoryId}`);
            
            let levels = {};
            
            try {
                const levelsSnapshot = await db.collection('exam_categories')
                    .doc(categoryId)
                    .collection('levels')
                    .get();
                
                if (!levelsSnapshot.empty) {
                    console.log(`   ✅ Found ${levelsSnapshot.size} levels in subcollection`);
                    
                    levelsSnapshot.forEach(levelDoc => {
                        const levelData = levelDoc.data();
                        const levelId = levelDoc.id;
                        
                        const credits = levelData.credits || 0;
                        levels[levelId] = {
                            level_name: levelData.level_name || levelId,
                            credits: credits,
                            credit_cost: levelData.credit_cost || 0,
                            isCreditSet: levelData.isCreditSet || false,
                            is_active: levelData.is_active || 1
                        };
                        console.log(`         ✅ Added: ${levelId} -> ${credits} credits`);
                    });
                } else {
                    if (data.levels !== undefined && data.levels !== null) {
                        console.log(`   ✅ levels field found in document (fallback)`);
                        
                        if (typeof data.levels === 'object' && !Array.isArray(data.levels)) {
                            const levelKeys = Object.keys(data.levels);
                            
                            levelKeys.forEach(levelKey => {
                                const levelData = data.levels[levelKey];
                                if (levelData && typeof levelData === 'object') {
                                    const credits = levelData.credits || 0;
                                    levels[levelKey] = {
                                        level_name: levelData.level_name || levelKey,
                                        credits: credits,
                                        credit_cost: levelData.credit_cost || 0,
                                        isCreditSet: levelData.isCreditSet || false,
                                        is_active: levelData.is_active || 1
                                    };
                                    console.log(`         ✅ Added: ${levelKey} -> ${credits} credits (fallback)`);
                                }
                            });
                        }
                    } else {
                        console.log(`   ⚠️ No levels found anywhere`);
                    }
                }
            } catch (error) {
                console.log(`   ⚠️ Error fetching levels: ${error.message}`);
            }
            
            categoriesMap[categoryId] = {
                id: categoryId,
                credits: data.credits || 0,
                category_name: data.category_name || data.categoryName || '',
                levels: levels
            };
            
            categoriesLowerMap[categoryId.toLowerCase()] = categoriesMap[categoryId];
            
            console.log(`   📊 Final levels count: ${Object.keys(levels).length}`);
        }

        console.log('📊 Categories with levels (FINAL):');
        Object.keys(categoriesMap).forEach(key => {
            const cat = categoriesMap[key];
            console.log(`   ${key}: credits=${cat.credits}, levels=${Object.keys(cat.levels).length}`);
            Object.keys(cat.levels).forEach(levelKey => {
                console.log(`      ${levelKey}: ${cat.levels[levelKey].credits} credits (${cat.levels[levelKey].level_name})`);
            });
        });

        // Load exams
        const examsSnapshot = await db.collection('exams').get();
        const examDataMap = {};
        examsSnapshot.forEach(doc => {
            const data = doc.data();
            examDataMap[doc.id] = {
                category_id: data.category_id || '',
                category_name: data.category_name || data.categoryName || '',
                level_id: data.level_id || data.levelId || '',
                title: data.title || 'Untitled',
                tutor_id: data.tutor_id || null,
                total_questions: data.total_questions || 0,
                total_problems: data.total_problems || 0
            };
        });
        console.log(`📊 Loaded ${Object.keys(examDataMap).length} exams`);

        // Get purchased exams
        const allPurchasedSnapshot = await db.collection('purchased_exams').get();
        const purchasedExamsMap = {};
        
        console.log(`📊 Total purchased exams: ${allPurchasedSnapshot.size}`);
        
        allPurchasedSnapshot.forEach(doc => {
            const data = doc.data();
            const examId = data.examId || data.exam_id;
            
            console.log(`📝 Exam: ${examId}`);
            
            const examData = examDataMap[examId];
            if (!examData) {
                console.log(`   ⚠️ Exam not found`);
                return;
            }
            
            const tutorId = examData.tutor_id;
            if (!tutorId) {
                console.log(`   ⚠️ No tutor_id`);
                return;
            }
            
            console.log(`   ✅ tutor_id: ${tutorId}`);
            console.log(`   ✅ category_id: ${examData.category_id || 'none'}`);
            console.log(`   ✅ level_id: ${examData.level_id || 'none'}`);
            
            if (!purchasedExamsMap[tutorId]) {
                purchasedExamsMap[tutorId] = {
                    examIds: new Set(),
                    totalPurchases: 0,
                    studentIds: new Set(),
                    examDetails: []
                };
            }
            
            purchasedExamsMap[tutorId].examIds.add(examId);
            if (data.student_id) {
                purchasedExamsMap[tutorId].studentIds.add(data.student_id);
            }
            purchasedExamsMap[tutorId].totalPurchases++;
        });

        console.log(`📊 Tutors with purchased exams: ${Object.keys(purchasedExamsMap).length}`);

        const tutors = [];
        
        for (const doc of tutorsSnapshot.docs) {
            const data = doc.data();
            const tutorId = doc.id;
            
            console.log(`\n📝 Processing: ${tutorId} - ${data.name}`);
            
            const tutorPurchasedData = purchasedExamsMap[tutorId];
            if (!tutorPurchasedData || tutorPurchasedData.totalPurchases === 0) {
                console.log(`   ⚠️ SKIPPING`);
                continue;
            }
            
            console.log(`   ✅ ${tutorPurchasedData.totalPurchases} purchases`);
            
            // Bank cards
            let bankName = "Not Specified";
            let bankAccount = "N/A";
            let bankCardId = null;
            
            try {
                const cardsSnapshot = await db.collection('users')
                    .doc(tutorId)
                    .collection('bankCards')
                    .limit(1)
                    .get();
                
                if (!cardsSnapshot.empty) {
                    const cardData = cardsSnapshot.docs[0].data();
                    bankName = cardData.bankName || cardData.name || "Not Specified";
                    bankAccount = cardData.accountNo || cardData.account || "N/A";
                    bankCardId = cardsSnapshot.docs[0].id;
                }
            } catch (error) {
                console.log(`   ⚠️ Error fetching bank cards: ${error.message}`);
            }
            
            // Tokens Calculation
            let totalTokens = 0;
            let paperCount = 0;
            let studentCount = 0;
            let totalCreditsDeducted = 0;
            
            for (const examId of tutorPurchasedData.examIds) {
                const examData = examDataMap[examId];
                if (!examData) continue;
                
                paperCount++;
                
                const categoryId = examData.category_id;
                const levelId = examData.level_id;
                let examTokens = 0;
                let matched = false;
                
                if (categoryId && categoriesMap[categoryId]) {
                    const category = categoriesMap[categoryId];
                    
                    if (levelId && category.levels && category.levels[levelId]) {
                        examTokens = category.levels[levelId].credits || 0;
                        console.log(`   ✅ ${examId} -> ${examTokens} tokens (level: ${levelId})`);
                        matched = true;
                    }
                    
                    if (!matched) {
                        examTokens = category.credits || 0;
                        console.log(`   ✅ ${examId} -> ${examTokens} tokens (category: ${categoryId})`);
                        matched = true;
                    }
                }
                
                if (!matched && categoryId) {
                    const lowerCategoryId = categoryId.toLowerCase();
                    if (categoriesLowerMap[lowerCategoryId]) {
                        const category = categoriesLowerMap[lowerCategoryId];
                        
                        if (levelId && category.levels && category.levels[levelId]) {
                            examTokens = category.levels[levelId].credits || 0;
                            console.log(`   ✅ ${examId} -> ${examTokens} tokens (level: ${levelId}, case-insensitive)`);
                            matched = true;
                        } else {
                            examTokens = category.credits || 0;
                            console.log(`   ✅ ${examId} -> ${examTokens} tokens (category: ${lowerCategoryId}, case-insensitive)`);
                            matched = true;
                        }
                    }
                }
                
                if (!matched) {
                    examTokens = examData.total_questions || examData.total_problems || 20;
                    console.log(`   ⚠️ ${examId} -> ${examTokens} tokens (fallback)`);
                }
                
                totalTokens += examTokens;
                
                try {
                    const purchasedSnapshot = await db.collection('purchased_exams')
                        .where('examId', '==', examId)
                        .get();
                    studentCount += purchasedSnapshot.size;
                } catch (error) {
                    console.log(`   ⚠️ Error: ${error.message}`);
                }
            }
            
            console.log(`   📊 Total: ${totalTokens} tokens, ${paperCount} papers`);
            
            const grossAmount = totalTokens * creditRate;
            const commissionAmount = grossAmount * platformCommission;
            const netPayout = grossAmount * (1 - platformCommission);
            const tokensPerPaper = paperCount > 0 ? Math.round(totalTokens / paperCount) : 0;
            
            const meetsMinThreshold = netPayout >= minPayoutThreshold;
            
            tutors.push({
                id: tutorId,
                tutor: data.name || data.tutorName || "Unknown Tutor",
                email: data.email || "",
                phone: data.phone || "",
                avatar: (data.name || data.tutorName || "T")[0].toUpperCase(),
                bank: bankName,
                account: bankAccount,
                bankCardId: bankCardId,
                status: 'Pending',
                credits: data.credits || 0,
                totalTokens: totalTokens,
                paperCount: paperCount,
                studentCount: studentCount,
                totalPurchases: tutorPurchasedData.totalPurchases,
                uniqueExamsPurchased: tutorPurchasedData.examIds.size,
                uniqueStudents: tutorPurchasedData.studentIds.size,
                totalCreditsDeducted: totalCreditsDeducted,
                tokensPerPaper: tokensPerPaper,
                grossAmount: grossAmount,
                commissionAmount: commissionAmount,
                netPayout: netPayout,
                exchangeRate: creditRate,
                platformCommission: platformCommission,
                minPayoutThreshold: minPayoutThreshold,
                meetsMinThreshold: meetsMinThreshold,
                university: data.university || "",
                qualifications: data.qualifications || "",
                language: data.language || "",
                createdAt: data.createdAt || new Date().toISOString()
            });
        }

        console.log(`\n✅ Found ${tutors.length} tutors`);

        res.status(200).json({
            success: true,
            tutors: tutors,
            count: tutors.length,
            categories: categoriesMap,
            exchangeRate: creditRate,
            platformCommission: platformCommission,
            minPayoutThreshold: minPayoutThreshold,
            message: `Showing ${tutors.length} tutors`
        });
        
    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch active tutors",
            error: error.message
        });
    }
};

// ============================================
// 2. GET TUTOR TOKENS
// ============================================
exports.getTutorsTokens = async (req, res) => {
    try {
        console.log("🔍 Fetching tutors tokens from purchased_exams ONLY...");
        
        const creditRate = await getExchangeRate();
        const platformCommission = await getPlatformCommission();
        
        console.log(`💰 Exchange Rate: LKR ${creditRate}/credit`);
        console.log(`📊 Platform Commission: ${platformCommission * 100}%`);
        
        const tutorsSnapshot = await db.collection('users')
            .where('role', '==', 'tutor')
            .where('status', '==', 'active')
            .get();
        
        if (tutorsSnapshot.empty) {
            return res.status(200).json({
                success: true,
                data: [],
                exchangeRate: creditRate,
                platformCommission: platformCommission,
                message: "No active tutors found"
            });
        }
        
        const examsSnapshot = await db.collection('exams').get();
        const examDataMap = {};
        examsSnapshot.forEach(doc => {
            const data = doc.data();
            examDataMap[doc.id] = {
                category_id: data.category_id,
                level_id: data.level_id || data.levelId || '',
                tutor_id: data.tutor_id,
                total_questions: data.total_questions || 0,
                total_problems: data.total_problems || 0
            };
        });
        
        const categoriesSnapshot = await db.collection('exam_categories').get();
        const categoriesMap = {};
        
        for (const doc of categoriesSnapshot.docs) {
            const data = doc.data();
            const categoryId = doc.id;
            
            let levels = {};
            
            try {
                const levelsSnapshot = await db.collection('exam_categories')
                    .doc(categoryId)
                    .collection('levels')
                    .get();
                
                if (!levelsSnapshot.empty) {
                    console.log(`   ✅ Found ${levelsSnapshot.size} levels in subcollection for ${categoryId}`);
                    
                    levelsSnapshot.forEach(levelDoc => {
                        const levelData = levelDoc.data();
                        const levelId = levelDoc.id;
                        levels[levelId] = levelData.credits || 0;
                        console.log(`         ✅ ${levelId}: ${levels[levelId]} credits`);
                    });
                } else {
                    if (data.levels && typeof data.levels === 'object') {
                        Object.keys(data.levels).forEach(levelKey => {
                            const levelData = data.levels[levelKey];
                            if (levelData && typeof levelData === 'object') {
                                levels[levelKey] = levelData.credits || 0;
                            } else if (typeof levelData === 'number') {
                                levels[levelKey] = levelData;
                            }
                        });
                    }
                }
            } catch (error) {
                console.log(`   ⚠️ Error fetching levels for ${categoryId}: ${error.message}`);
            }
            
            categoriesMap[categoryId] = {
                credits: data.credits || 0,
                levels: levels
            };
        }
        
        console.log('📊 Categories with levels loaded for tokens:');
        Object.keys(categoriesMap).forEach(key => {
            console.log(`   ${key}: levels=${Object.keys(categoriesMap[key].levels).length}`);
        });
        
        const result = [];
        
        for (const tutorDoc of tutorsSnapshot.docs) {
            const tutorData = tutorDoc.data();
            const tutorId = tutorDoc.id;
            
            const purchasedSnapshot = await db.collection('purchased_exams').get();
            let totalTokens = 0;
            let paperCount = 0;
            let studentCount = 0;
            const examIds = new Set();
            
            for (const doc of purchasedSnapshot.docs) {
                const data = doc.data();
                const examId = data.examId || data.exam_id;
                const examData = examDataMap[examId];
                
                if (!examData || examData.tutor_id !== tutorId) continue;
                
                examIds.add(examId);
                paperCount++;
                
                const categoryId = examData.category_id;
                const levelId = examData.level_id;
                let examTokens = 0;
                
                if (categoryId && categoriesMap[categoryId]) {
                    if (levelId && categoriesMap[categoryId].levels && categoriesMap[categoryId].levels[levelId] !== undefined) {
                        examTokens = categoriesMap[categoryId].levels[levelId];
                        console.log(`   ✅ ${examId} -> ${examTokens} tokens (level: ${levelId})`);
                    } else {
                        examTokens = categoriesMap[categoryId].credits || 0;
                        console.log(`   ✅ ${examId} -> ${examTokens} tokens (category: ${categoryId})`);
                    }
                } else {
                    let found = false;
                    if (categoryId) {
                        const lowerCategoryId = categoryId.toLowerCase();
                        for (const key of Object.keys(categoriesMap)) {
                            if (key.toLowerCase() === lowerCategoryId) {
                                const cat = categoriesMap[key];
                                if (levelId && cat.levels && cat.levels[levelId] !== undefined) {
                                    examTokens = cat.levels[levelId];
                                } else {
                                    examTokens = cat.credits || 0;
                                }
                                found = true;
                                console.log(`   ✅ ${examId} -> ${examTokens} tokens (case-insensitive match)`);
                                break;
                            }
                        }
                    }
                    
                    if (!found) {
                        examTokens = examData.total_questions || examData.total_problems || 20;
                        console.log(`   ⚠️ ${examId} -> ${examTokens} tokens (fallback)`);
                    }
                }
                
                totalTokens += examTokens;
                
                if (data.student_id) studentCount++;
            }
            
            if (paperCount === 0) continue;
            
            const grossAmount = totalTokens * creditRate;
            const platformFee = totalTokens * creditRate * platformCommission;
            const tutorShare = totalTokens * creditRate * (1 - platformCommission);
            
            result.push({
                tutorId: tutorId,
                tutorName: tutorData.name || tutorData.tutorName || "Unknown Tutor",
                email: tutorData.email || "",
                totalTokens: totalTokens,
                paperCount: paperCount,
                studentCount: studentCount,
                totalPurchases: paperCount,
                uniqueExamsPurchased: examIds.size,
                tokensPerPaper: paperCount > 0 ? Math.round(totalTokens / paperCount) : 0,
                grossAmount: grossAmount,
                platformFee: platformFee,
                tutorShare: tutorShare,
                exchangeRate: creditRate,
                platformCommission: platformCommission
            });
        }
        
        res.status(200).json({
            success: true,
            data: result,
            count: result.length,
            exchangeRate: creditRate,
            platformCommission: platformCommission,
            message: `Showing ${result.length} tutors who have purchased exams`
        });
        
    } catch (error) {
        console.error("Error in getTutorsTokens:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 3. CREATE PAYOUT REQUEST - Complete UI Data Save
// ============================================
exports.createPayoutRequest = async (req, res) => {
    try {
        const { tutorId, tokens, creditValue } = req.body;
        
        console.log(`📝 Creating payout request for tutor: ${tutorId}`);
        console.log(`📊 Tokens: ${tokens}`);
        
        // Get REAL data from database
        let exchangeRate = creditValue || await getExchangeRate();
        const platformCommission = await getPlatformCommission();
        const minPayoutThreshold = await getMinPayoutThreshold();
        
        // Get tutor details from users collection
        const tutorDoc = await db.collection('users').doc(tutorId).get();
        if (!tutorDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "Tutor not found"
            });
        }
        
        const tutorData = tutorDoc.data();
        const currentCredits = tutorData.credits || 0;
        
        if (currentCredits < tokens) {
            return res.status(400).json({
                success: false,
                message: `Insufficient credits. Available: ${currentCredits}, Requested: ${tokens}`
            });
        }
        
        // Get bank details
        let bankName = "Not Specified";
        let bankAccount = "N/A";
        let bankCardId = null;
        
        try {
            const cardsSnapshot = await db.collection('users')
                .doc(tutorId)
                .collection('bankCards')
                .limit(1)
                .get();
            
            if (!cardsSnapshot.empty) {
                const cardData = cardsSnapshot.docs[0].data();
                bankName = cardData.bankName || cardData.name || "Not Specified";
                bankAccount = cardData.accountNo || cardData.account || "N/A";
                bankCardId = cardsSnapshot.docs[0].id;
            }
        } catch (error) {
            console.log(`   ⚠️ Error fetching bank cards: ${error.message}`);
        }
        
        // Calculate amounts
        const totalAmount = tokens * exchangeRate;
        const tutorShare = totalAmount * (1 - platformCommission);
        const platformShare = totalAmount * platformCommission;
        
        // Check if meets minimum threshold
        const meetsMinThreshold = tutorShare >= minPayoutThreshold;
        
        // 🔥 COMPLETE PAYOUT DATA - UI එකේ පෙන්වන සියලුම data
        const payoutData = {
            // ===== TUTOR INFORMATION =====
            tutorId: tutorId,
            tutorName: tutorData.name || tutorData.tutorName || "Unknown Tutor",
            tutorEmail: tutorData.email || "",
            tutorPhone: tutorData.phone || "",
            tutorUniversity: tutorData.university || "",
            tutorQualifications: tutorData.qualifications || "",
            tutorAvatar: (tutorData.name || tutorData.tutorName || "T")[0].toUpperCase(),
            tutorCredits: currentCredits,
            
            // ===== BANK DETAILS =====
            bankName: bankName,
            bankAccount: bankAccount,
            bankCardId: bankCardId,
            
            // ===== PAYOUT DETAILS =====
            totalTokens: tokens,
            totalAmount: totalAmount,
            tutorShare: tutorShare,
            platformShare: platformShare,
            
            // ===== FINANCIAL SETTINGS =====
            creditValue: exchangeRate,
            exchangeRate: exchangeRate,
            platformCommission: platformCommission,
            minPayoutThreshold: minPayoutThreshold,
            meetsMinThreshold: meetsMinThreshold,
            
            // ===== EXAM STATISTICS =====
            paperCount: 0,
            studentCount: 0,
            totalPurchases: 0,
            uniqueExamsPurchased: 0,
            uniqueStudents: 0,
            tokensPerPaper: 0,
            
            // ===== STATUS & TIMESTAMPS =====
            status: 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            requestSource: 'admin_dashboard',
            
            // ===== TRANSACTION REFERENCE =====
            transactionId: null,
            transactionCreated: false,
            settledAt: null,
            declinedAt: null
        };
        
        const docRef = await db.collection('tutor_payouts').add(payoutData);
        
        console.log(`✅ Payout request created: ${docRef.id}`);
        
        res.status(201).json({ 
            success: true,
            message: "Payout request created successfully!",
            payoutId: docRef.id,
            data: payoutData
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
// 4. GET ALL PAYOUTS (WITH CORRECT SETTLED COUNT)
// ============================================
exports.getAllPayouts = async (req, res) => {
    try {
        console.log("📊 Fetching all payouts...");
        
        const payoutSnapshot = await db.collection('tutor_payouts')
            .orderBy('createdAt', 'desc')
            .get();
        
        const payouts = payoutSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // ✅ CORRECT: Filter settled payouts (status check without transactionCreated)
        const settledPayouts = payouts.filter(p => 
            p.status === 'Settled' || p.status === 'settled'
        );

        // ✅ CORRECT: Filter pending payouts
        const pendingPayouts = payouts.filter(p => 
            p.status === 'Pending' || p.status === 'pending'
        );

        // ✅ CORRECT: Filter declined payouts
        const declinedPayouts = payouts.filter(p => 
            p.status === 'Declined' || p.status === 'declined'
        );

        let totalSettledTokens = 0;
        let totalSettledAmount = 0;
        settledPayouts.forEach(p => {
            totalSettledTokens += p.totalTokens || 0;
            totalSettledAmount += p.totalAmount || 0;
        });

        const totalTokens = payouts.reduce((sum, p) => sum + (p.totalTokens || 0), 0);
        const totalAmount = payouts.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

        console.log(`📊 Stats - Pending: ${pendingPayouts.length}, Settled: ${settledPayouts.length}, Declined: ${declinedPayouts.length}`);

        res.status(200).json({
            success: true,
            payouts: payouts,
            settledPayouts: settledPayouts,
            pendingPayouts: pendingPayouts,
            declinedPayouts: declinedPayouts,
            totalSettledTokens: totalSettledTokens,
            totalSettledAmount: totalSettledAmount,
            stats: {
                pending: pendingPayouts.length,
                settled: settledPayouts.length,
                declined: declinedPayouts.length,
                totalTokens: totalTokens,
                totalAmount: totalAmount
            }
        });
        
    } catch (error) {
        console.error("Error in getAllPayouts:", error);
        
        if (error.code === 8) {
            return res.status(200).json({
                success: true,
                payouts: [],
                settledPayouts: [],
                pendingPayouts: [],
                declinedPayouts: [],
                totalSettledTokens: 0,
                totalSettledAmount: 0,
                stats: {
                    pending: 0,
                    settled: 0,
                    declined: 0,
                    totalTokens: 0,
                    totalAmount: 0
                },
                message: "Quota exceeded - please upgrade to Blaze plan",
                _quotaExceeded: true
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
// ============================================
// 5. GET SETTLED PAYOUTS
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
// 6. GET PENDING PAYOUTS
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
// 7. GET DECLINED PAYOUTS
// ============================================
exports.getDeclinedPayouts = async (req, res) => {
    try {
        const snapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Declined')
            .get();

        const payouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ success: true, payouts, count: payouts.length });
    } catch (error) {
        console.error("Error in getDeclinedPayouts:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 8. GET TOTAL USED CREDITS
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
// 9. UPDATE PAYOUT STATUS (WITH AUTO-SYNC)
// ============================================
exports.updatePayoutStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log(`📝 Updating payout ${id} to status: ${status}`);

        const payoutDoc = await db.collection('tutor_payouts').doc(id).get();
        if (!payoutDoc.exists) {
            return res.status(404).json({ success: false, message: "Payout not found" });
        }

        const payoutData = payoutDoc.data();

        if (status === 'Settled') {
            const exchangeRate = payoutData.exchangeRate || payoutData.creditValue || await getExchangeRate();
            const platformCommission = payoutData.platformCommission || await getPlatformCommission();
            
            const transactionData = {
                tutorId: payoutData.tutorId,
                tutorName: payoutData.tutorName,
                tutorEmail: payoutData.tutorEmail,
                tutorPhone: payoutData.tutorPhone,
                tutorUniversity: payoutData.tutorUniversity,
                payoutId: id,
                type: 'Payout',
                status: 'completed',
                amount: payoutData.totalAmount || 0,
                credits: payoutData.totalTokens || 0,
                tutorShare: payoutData.tutorShare || 0,
                platformShare: payoutData.platformShare || 0,
                creditValue: exchangeRate,
                exchangeRate: exchangeRate,
                platformCommission: platformCommission,
                bankName: payoutData.bankName,
                bankAccount: payoutData.bankAccount,
                createdAt: new Date().toISOString(),
                processedAt: new Date().toISOString(),
                paymentMethod: 'Bank Transfer',
                description: `Payout settlement for tutor ${payoutData.tutorName || payoutData.tutorId}`
            };

            const transactionRef = await db.collection('transactions').add(transactionData);

            await db.collection('tutor_payouts').doc(id).update({
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
                console.log(`✅ Tutor credits updated: ${currentCredits} -> ${Math.max(0, newCredits)}`);
                
                // 🔥 AUTO SYNC: Credits change වෙන නිසා payouts sync කරන්න
                await autoSyncUserToPayouts(payoutData.tutorId);
            }

            return res.status(200).json({
                success: true,
                message: "Payout settled successfully!",
                data: {
                    payoutId: id,
                    transactionId: transactionRef.id,
                    amount: payoutData.totalAmount,
                    credits: payoutData.totalTokens,
                    transaction: transactionData
                }
            });
        }

        if (status === 'Declined') {
            await db.collection('tutor_payouts').doc(id).update({
                status: 'Declined',
                declinedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // ✅ FINANCIAL AUDIT LOG - PAYOUT DECLINED
            logAudit(auditLogService.logFinancial, {
                userId: payoutData.tutorId,
                userEmail: req.user?.email || 'unknown',
                actorId: req.user?.uid || 'system',
                actorEmail: req.user?.email || 'system@langoora.com',
                action: 'payout',
                entityType: 'payout',
                entityId: id,
                amount: payoutData.totalAmount,
                credits: payoutData.totalTokens,
                status: 'declined',
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent'] || 'unknown'
            });

            return res.status(200).json({
                success: true,
                message: "Payout declined successfully!"
            });
        }

        await db.collection('tutor_payouts').doc(id).update({
            status: status,
            updatedAt: new Date().toISOString()
        });

        res.status(200).json({
            success: true,
            message: `Payout status updated to ${status}!`
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 10. GET PAYOUT BY ID
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
// 11. DELETE PAYOUT (Declined only)
// ============================================
exports.deletePayout = async (req, res) => {
    try {
        const { id } = req.params;
        
        const payoutDoc = await db.collection('tutor_payouts').doc(id).get();
        if (!payoutDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "Payout not found"
            });
        }
        
        const payoutData = payoutDoc.data();
        
        if (payoutData.status !== 'Declined') {
            return res.status(400).json({
                success: false,
                message: "Only Declined payouts can be deleted"
            });
        }
        
        if (payoutData.transactionId) {
            await db.collection('transactions').doc(payoutData.transactionId).delete();
        }
        
        await db.collection('tutor_payouts').doc(id).delete();

        // ✅ FINANCIAL AUDIT LOG - PAYOUT DELETED
        logAudit(auditLogService.logFinancial, {
            userId: payoutData.tutorId || 'unknown',
            userEmail: req.user?.email || 'unknown',
            actorId: req.user?.uid || 'system',
            actorEmail: req.user?.email || 'system@langoora.com',
            action: 'payout',
            entityType: 'payout',
            entityId: id,
            amount: payoutData.totalAmount || 0,
            credits: payoutData.totalTokens || 0,
            status: 'deleted',
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || 'unknown'
        });
        
        res.status(200).json({
            success: true,
            message: "Payout deleted successfully!"
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 12. DELETE ALL DECLINED PAYOUTS
// ============================================
exports.deleteAllDeclinedPayouts = async (req, res) => {
    try {
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
        const deletedPayouts = [];
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            deletedPayouts.push({
                id: doc.id,
                tutorId: data.tutorId,
                totalTokens: data.totalTokens || 0,
                totalAmount: data.totalAmount || 0
            });
            
            if (data.transactionId) {
                await db.collection('transactions').doc(data.transactionId).delete();
                deletedTransactions++;
            }
            
            await db.collection('tutor_payouts').doc(doc.id).delete();
            deletedCount++;
        }

        // ✅ FINANCIAL AUDIT LOG - BULK PAYOUT DELETE
        logAudit(auditLogService.logFinancial, {
            userId: 'system',
            userEmail: req.user?.email || 'system@langoora.com',
            actorId: req.user?.uid || 'system',
            actorEmail: req.user?.email || 'system@langoora.com',
            action: 'payout',
            entityType: 'payout',
            action: 'bulk_delete',
            entityId: 'bulk',
            status: 'deleted',
            changes: { count: deletedCount, payouts: deletedPayouts },
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || 'unknown'
        });
        
        res.status(200).json({
            success: true,
            message: `Successfully deleted ${deletedCount} declined payouts`,
            deletedCount: deletedCount,
            deletedTransactions: deletedTransactions
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 13. GET PAYOUT STATISTICS
// ============================================
exports.getPayoutStatistics = async (req, res) => {
    try {
        const totalSnapshot = await db.collection('tutor_payouts').get();
        const totalPayouts = totalSnapshot.size;
        
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
        
        let totalAmount = 0;
        let totalTutorShare = 0;
        let totalPlatformShare = 0;
        let totalTokens = 0;
        
        totalSnapshot.forEach(doc => {
            const data = doc.data();
            totalAmount += data.totalAmount || 0;
            totalTutorShare += data.tutorShare || 0;
            totalPlatformShare += data.platformShare || 0;
            totalTokens += data.totalTokens || 0;
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
                totalTokens: totalTokens,
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
// 14. REVERT SETTLED PAYOUT (WITH AUTO-SYNC)
// ============================================
exports.revertSettledPayout = async (req, res) => {
    try {
        const { id } = req.params;
        const payoutDoc = await db.collection('tutor_payouts').doc(id).get();
        if (!payoutDoc.exists) {
            return res.status(404).json({ success: false, message: "Payout not found" });
        }
        
        const payoutData = payoutDoc.data();
        
        if (payoutData.status !== 'Settled') {
            return res.status(400).json({
                success: false,
                message: "Only Settled payouts can be reverted"
            });
        }
        
        if (payoutData.transactionId) {
            await db.collection('transactions').doc(payoutData.transactionId).delete();
        }
        
        const tutorDoc = await db.collection('users').doc(payoutData.tutorId).get();
        if (tutorDoc.exists) {
            const tutorData = tutorDoc.data();
            const currentCredits = tutorData.credits || 0;
            const newCredits = currentCredits + (payoutData.totalTokens || 0);
            
            await db.collection('users').doc(payoutData.tutorId).update({
                credits: newCredits,
                updatedAt: new Date().toISOString()
            });
            
            // 🔥 AUTO SYNC: Credits revert වෙන නිසා payouts sync කරන්න
            await autoSyncUserToPayouts(payoutData.tutorId);
        }
        
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

// ============================================
// 15. BULK UPDATE PAYOUT STATUS
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
        const updatedPayouts = [];
        
        for (const id of payoutIds) {
            try {
                await db.collection('tutor_payouts').doc(id).update({
                    status: status,
                    updatedAt: new Date().toISOString(),
                    ...(status === 'Settled' ? { settledAt: new Date().toISOString() } : {}),
                    ...(status === 'Declined' ? { declinedAt: new Date().toISOString() } : {})
                });
                
                results.push({ id, success: true });
                if (payoutData) {
                    updatedPayouts.push({
                        id,
                        tutorId: payoutData.tutorId,
                        totalAmount: payoutData.totalAmount || 0,
                        totalTokens: payoutData.totalTokens || 0
                    });
                }
            } catch (error) {
                results.push({ id, success: false, error: error.message });
            }
        }

        // ✅ FINANCIAL AUDIT LOG - BULK STATUS UPDATE
        logAudit(auditLogService.logFinancial, {
            userId: 'system',
            userEmail: req.user?.email || 'system@langoora.com',
            actorId: req.user?.uid || 'system',
            actorEmail: req.user?.email || 'system@langoora.com',
            action: 'bulk_update',
            entityType: 'payout',
            status: status,
            changes: { count: results.filter(r => r.success).length, payouts: updatedPayouts },
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || 'unknown'
        });
        
        res.status(200).json({
            success: true,
            message: `Updated ${results.filter(r => r.success).length} payouts`,
            results: results
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 16. GET SINGLE TUTOR DETAILS
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
        
        let bankCards = [];
        try {
            const cardsSnapshot = await db.collection('users')
                .doc(id)
                .collection('bankCards')
                .get();
            bankCards = cardsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.log(`⚠️ Error fetching bank cards: ${error.message}`);
        }
        
        res.status(200).json({
            success: true,
            tutor: {
                id: tutorDoc.id,
                ...data,
                bankCards: bankCards
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
// 17. UPDATE TUTOR CREDITS (WITH AUTO-SYNC)
// ============================================
exports.updateTutorCredits = async (req, res) => {
    try {
        const { id } = req.params;
        const { credits } = req.body;
        
        await db.collection('users').doc(id).update({
            credits: credits,
            updatedAt: new Date().toISOString()
        });
        
        // 🔥 AUTO SYNC: Credits change වෙන නිසා payouts sync කරන්න
        const syncResult = await autoSyncUserToPayouts(id);
        
        res.status(200).json({
            success: true,
            message: "Credits updated and synced to payouts",
            syncResult: syncResult
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
// 🔥 18. ADD NEW TUTOR PAYOUT (Create 'tutor_payouts' Collection)
// ============================================
exports.addTutorPayout = async (req, res) => {
    try {
        console.log("📝 Adding new tutor payout...");
        
        const { 
            tutorId, 
            tutorName, 
            totalTokens, 
            netPayout, 
            bankName, 
            accountNo,
            tutorEmail,
            tutorPhone,
            totalAmount,
            platformShare,
            creditValue,
            paperCount,
            studentCount,
            university,
            qualifications
        } = req.body;

        // Validate required fields
        if (!tutorId) {
            return res.status(400).json({
                success: false,
                error: "tutorId is required"
            });
        }

        // Get tutor data from users collection
        const tutorDoc = await db.collection('users').doc(tutorId).get();
        let tutorData = {};
        if (tutorDoc.exists) {
            tutorData = tutorDoc.data();
        }

        // Get bank details
        const bankDetails = await getTutorBankDetails(tutorId);

        // Save කිරීමට අවශ්‍ය ඩේටා structure එක
        const payoutData = {
            // ===== TUTOR INFORMATION =====
            tutorId: tutorId,
            tutorName: tutorName || tutorData.name || tutorData.tutorName || 'Unknown Tutor',
            tutorEmail: tutorEmail || tutorData.email || '',
            tutorPhone: tutorPhone || tutorData.phone || '',
            tutorUniversity: university || tutorData.university || '',
            tutorQualifications: qualifications || tutorData.qualifications || '',
            tutorAvatar: (tutorName || tutorData.name || tutorData.tutorName || 'T')[0].toUpperCase(),
            tutorCredits: tutorData.credits || 0,
            tutorRole: tutorData.role || 'tutor',
            tutorStatus: tutorData.status || 'active',
            tutorProfilePic: tutorData.profilePicUrl || null,
            tutorDob: tutorData.dob || null,
            tutorJoined: tutorData.joined || null,
            tutorAddress: tutorData.address || null,
            tutorLanguage: tutorData.language || null,
            tutorCertificate: tutorData.certificateData || null,
            
            // ===== BANK DETAILS =====
            bankName: bankName || bankDetails.bankName || 'Not Specified',
            bankAccount: accountNo || bankDetails.bankAccount || 'N/A',
            bankCardId: bankDetails.bankCardId || null,
            
            // ===== PAYOUT DETAILS =====
            totalTokens: Number(totalTokens || 0),
            totalAmount: Number(totalAmount || totalTokens * 20 || 0),
            netPayout: Number(netPayout || 0),
            platformShare: Number(platformShare || 0),
            
            // ===== FINANCIAL SETTINGS =====
            creditValue: Number(creditValue || 20),
            exchangeRate: Number(creditValue || 20),
            platformCommission: 0.2,
            minPayoutThreshold: 5000,
            meetsMinThreshold: Number(netPayout || 0) >= 5000,
            
            // ===== EXAM STATISTICS =====
            paperCount: Number(paperCount || 0),
            studentCount: Number(studentCount || 0),
            totalPurchases: 0,
            uniqueExamsPurchased: 0,
            uniqueStudents: 0,
            tokensPerPaper: Number(paperCount || 0) > 0 ? Math.round(Number(totalTokens || 0) / Number(paperCount || 0)) : 0,
            
            // ===== STATUS & TIMESTAMPS =====
            status: 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            requestSource: 'admin_dashboard',
            
            // ===== TRANSACTION REFERENCE =====
            transactionId: null,
            transactionCreated: false,
            settledAt: null,
            declinedAt: null
        };

        // Firestore එකේ 'tutor_payouts' නැතත්, මේ කෝඩ් එකෙන් auto-create වෙනවා
        const docRef = await db.collection('tutor_payouts').add(payoutData);

        console.log(`✅ Tutor payout created: ${docRef.id}`);
        console.log(`📊 Tutor: ${payoutData.tutorName}, Tokens: ${totalTokens}, Net: ${netPayout}`);

        return res.status(201).json({
            success: true,
            message: "Tutor payout record created successfully!",
            payoutId: docRef.id,
            data: payoutData
        });

    } catch (error) {
        console.error("❌ Error adding tutor payout:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 🔥 19. AUTO SYNC - User Update එකෙන් පස්සේ call කරන්න
// ============================================
exports.autoSyncUser = async (req, res) => {
    try {
        const { tutorId } = req.params;
        
        console.log(`🔄 Auto-sync requested for tutor: ${tutorId}`);
        
        const result = await autoSyncUserToPayouts(tutorId);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || "Sync failed",
                error: result.error
            });
        }
        
        res.status(200).json({
            success: true,
            message: `Synced ${result.updated} payout(s)`,
            data: {
                tutorId: tutorId,
                updated: result.updated,
                syncData: result.syncData
            }
        });
        
    } catch (error) {
        console.error("Error in autoSyncUser:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 🔥 20. INTERNAL AUTO SYNC - Webhook එකෙන් call කරන්න
// ============================================
exports.autoSyncUserInternal = async (tutorId) => {
    try {
        console.log(`🔄 Internal auto-sync for tutor: ${tutorId}`);
        
        const result = await autoSyncUserToPayouts(tutorId);
        
        return { 
            success: result.success, 
            updated: result.updated || 0,
            syncData: result.syncData || null,
            error: result.error || null
        };
        
    } catch (error) {
        console.error(`   ❌ Internal auto-sync error: ${error.message}`);
        return { success: false, error: error.message, updated: 0 };
    }
};

// ============================================
// 🔥 21. SYNC ALL TUTORS
// ============================================
exports.syncAllTutors = async (req, res) => {
    try {
        console.log(`🔄 Syncing ALL tutors...`);
        
        const tutorsSnapshot = await db.collection('users')
            .where('role', '==', 'tutor')
            .get();
        
        if (tutorsSnapshot.empty) {
            return res.status(200).json({
                success: true,
                message: "No tutors found",
                data: { total: 0, updated: 0 }
            });
        }
        
        console.log(`   📊 Found ${tutorsSnapshot.size} tutors`);
        
        let totalUpdated = 0;
        const results = [];
        
        for (const doc of tutorsSnapshot.docs) {
            const tutorId = doc.id;
            const result = await autoSyncUserToPayouts(tutorId);
            totalUpdated += result.updated || 0;
            results.push({ 
                tutorId, 
                updated: result.updated || 0,
                success: result.success
            });
        }
        
        console.log(`   ✅ Total payouts updated: ${totalUpdated}`);
        
        res.status(200).json({
            success: true,
            message: `Synced ${totalUpdated} payouts for ${tutorsSnapshot.size} tutors`,
            data: {
                totalTutors: tutorsSnapshot.size,
                totalUpdated: totalUpdated,
                results: results
            }
        });
        
    } catch (error) {
        console.error("Error in syncAllTutors:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


console.log('✅ Payout Controller Loaded Successfully');
console.log('📋 Available functions:', Object.keys(exports).join(', '));