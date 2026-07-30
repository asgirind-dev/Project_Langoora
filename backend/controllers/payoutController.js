const { db } = require('../config/firebase');

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
        
        const tutorDoc = await db.collection('users').doc(tutorId).get();
        if (!tutorDoc.exists) {
            console.log(`   ❌ Tutor not found: ${tutorId}`);
            return { success: false, message: "Tutor not found" };
        }
        
        const tutorData = tutorDoc.data();
        
        if (tutorData.role !== 'tutor') {
            console.log(`   ⚠️ User is not a tutor (role: ${tutorData.role}), skipping sync`);
            return { success: false, message: "User is not a tutor" };
        }
        
        const bankDetails = await getTutorBankDetails(tutorId);
        const syncData = buildSyncDataFromUser(tutorData, bankDetails);
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
// 1. GET ACTIVE TUTORS WITH PURCHASED EXAMS ONLY - FIXED CATEGORY MATCHING
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

        // ============================================
        // 🔥 FIXED: Categories Load with Normalized Keys
        // ============================================
        const categoriesSnapshot = await db.collection('exam_categories').get();
        const categoriesMap = {};
        const categoriesNormalizedMap = {};

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
                        levels[levelId] = {
                            level_name: levelData.level_name || levelId,
                            credits: levelData.credits || 0,
                            credit_cost: levelData.credit_cost || 0,
                            isCreditSet: levelData.isCreditSet || false,
                            is_active: levelData.is_active || 1
                        };
                        console.log(`         ✅ Added: ${levelId} -> credit_cost: ${levels[levelId].credit_cost}, credits: ${levels[levelId].credits}`);
                    });
                } else {
                    if (data.levels !== undefined && data.levels !== null) {
                        console.log(`   ✅ levels field found in document (fallback)`);
                        if (typeof data.levels === 'object' && !Array.isArray(data.levels)) {
                            Object.keys(data.levels).forEach(levelKey => {
                                const levelData = data.levels[levelKey];
                                if (levelData && typeof levelData === 'object') {
                                    levels[levelKey] = {
                                        level_name: levelData.level_name || levelKey,
                                        credits: levelData.credits || 0,
                                        credit_cost: levelData.credit_cost || 0,
                                        isCreditSet: levelData.isCreditSet || false,
                                        is_active: levelData.is_active || 1
                                    };
                                    console.log(`         ✅ Added: ${levelKey} -> credit_cost: ${levels[levelKey].credit_cost}, credits: ${levels[levelKey].credits} (fallback)`);
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
                credit_cost: data.credit_cost || 0,
                credits: data.credits || 0,
                category_name: data.category_name || data.categoryName || '',
                levels: levels
            };
            
            const normalizedKey = categoryId.replace(/[-_]/g, '').toLowerCase();
            categoriesNormalizedMap[normalizedKey] = categoriesMap[categoryId];
            console.log(`   📌 Normalized key: ${categoryId} -> ${normalizedKey}`);
        }

        console.log('📊 Categories with levels (FINAL):');
        Object.keys(categoriesMap).forEach(key => {
            const cat = categoriesMap[key];
            console.log(`   ${key}: credit_cost=${cat.credit_cost}, credits=${cat.credits}, levels=${Object.keys(cat.levels).length}`);
            Object.keys(cat.levels).forEach(levelKey => {
                const lvl = cat.levels[levelKey];
                console.log(`      ${levelKey}: credit_cost=${lvl.credit_cost}, credits=${lvl.credits} (${lvl.level_name})`);
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
        console.log(`📊 Total purchased exams: ${allPurchasedSnapshot.size}`);

        // Build Student Count Map
        const examStudentCountMap = {};
        allPurchasedSnapshot.forEach(doc => {
            const data = doc.data();
            const examId = data.examId || data.exam_id;
            const studentId = data.student_id;
            if (!examId) return;
            if (!examStudentCountMap[examId]) {
                examStudentCountMap[examId] = new Set();
            }
            if (studentId) {
                examStudentCountMap[examId].add(studentId);
            }
        });

        // Group by Tutor
        const purchasedExamsMap = {};
        allPurchasedSnapshot.forEach(doc => {
            const data = doc.data();
            const examId = data.examId || data.exam_id;
            const examData = examDataMap[examId];
            if (!examData || !examData.tutor_id) return;
            const tutorId = examData.tutor_id;
            if (!purchasedExamsMap[tutorId]) {
                purchasedExamsMap[tutorId] = {
                    examIds: new Set(),
                    studentIds: new Set(),
                    totalPurchases: 0
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
        let payoutUpdates = 0;
        let payoutCreates = 0;
        
        for (const doc of tutorsSnapshot.docs) {
            const data = doc.data();
            const tutorId = doc.id;
            
            console.log(`\n📝 Processing: ${tutorId} - ${data.name}`);
            
            const tutorPurchasedData = purchasedExamsMap[tutorId];
            if (!tutorPurchasedData || tutorPurchasedData.totalPurchases === 0) {
                console.log(`   ⚠️ SKIPPING - No purchases`);
                continue;
            }
            
            console.log(`   ✅ ${tutorPurchasedData.totalPurchases} purchases`);
            
            // Bank cards (1 read per tutor)
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
            
            // ============================================
            // 🔥 TOKENS CALCULATION - ALWAYS USE credit_cost FIRST
            // ============================================
            let totalTokens = 0;
            let paperCount = 0;
            let studentCount = 0;
            let categoryCreditCost = 0;
            let usedCategoryId = null;
            
            for (const examId of tutorPurchasedData.examIds) {
                const examData = examDataMap[examId];
                if (!examData) continue;
                
                paperCount++;
                
                const categoryId = examData.category_id;
                const levelId = examData.level_id;
                let examTokens = 0;
                let matched = false;
                
                // 🔥 STEP 1: Try exact match on category ID
                if (categoryId && categoriesMap[categoryId]) {
                    const category = categoriesMap[categoryId];
                    if (levelId && category.levels && category.levels[levelId]) {
                        examTokens = category.levels[levelId].credit_cost || category.levels[levelId].credits || 0;
                        matched = true;
                        categoryCreditCost = category.credit_cost || 0;
                        usedCategoryId = categoryId;
                        console.log(`   ✅ EXACT match (level): ${examId} -> ${examTokens} (level: ${levelId})`);
                    }
                    if (!matched) {
                        examTokens = category.credit_cost || category.credits || 0;
                        matched = true;
                        categoryCreditCost = category.credit_cost || 0;
                        usedCategoryId = categoryId;
                        console.log(`   ✅ EXACT match (category): ${examId} -> ${examTokens} (category: ${categoryId})`);
                    }
                }
                
                // 🔥 STEP 2: Try NORMALIZED match (remove hyphens/underscores)
                if (!matched && categoryId) {
                    const normalizedInput = categoryId.replace(/[-_]/g, '').toLowerCase();
                    if (categoriesNormalizedMap[normalizedInput]) {
                        const category = categoriesNormalizedMap[normalizedInput];
                        if (levelId && category.levels && category.levels[levelId]) {
                            examTokens = category.levels[levelId].credit_cost || category.levels[levelId].credits || 0;
                            matched = true;
                            categoryCreditCost = category.credit_cost || 0;
                            usedCategoryId = categoryId;
                            console.log(`   ✅ NORMALIZED match (level): ${examId} -> ${examTokens} (level: ${levelId})`);
                        } else {
                            examTokens = category.credit_cost || category.credits || 0;
                            matched = true;
                            categoryCreditCost = category.credit_cost || 0;
                            usedCategoryId = categoryId;
                            console.log(`   ✅ NORMALIZED match (category): ${examId} -> ${examTokens} (category: ${categoryId})`);
                        }
                    }
                }
                
                // 🔥 STEP 3: Fallback to total_questions
                if (!matched) {
                    examTokens = examData.total_questions || examData.total_problems || 20;
                    console.log(`   ⚠️ FALLBACK: ${examId} -> ${examTokens} (no match found)`);
                }
                
                totalTokens += examTokens;
                
                if (examStudentCountMap[examId]) {
                    studentCount += examStudentCountMap[examId].size;
                }
            }
            
            console.log(`   📊 Calculated: ${totalTokens} tokens, ${paperCount} papers, ${studentCount} students`);
            console.log(`   🏷️ Category Credit Cost (used for calculations): ${categoryCreditCost}`);
            // ============================================
            
            // ============================================
            // 💰 FINANCIAL CALCULATIONS
            // ============================================
            const grossAmount = totalTokens * creditRate;
            const commissionAmount = grossAmount * platformCommission;
            const netPayout = grossAmount * (1 - platformCommission);
            const tokensPerPaper = paperCount > 0 ? Math.round(totalTokens / paperCount) : 0;
            const meetsMinThreshold = netPayout >= minPayoutThreshold;
            // ============================================
            
            // ============================================
            // ✅ DB එකෙන් status, transactionId, settledAt ගන්න
            // ============================================
            let tutorStatus = 'Pending';
            let tutorTransactionId = null;
            let tutorSettledAt = null;
            let tutorTransactionCreated = false;

            const existingPayoutCheck = await db.collection('tutor_payouts')
                .where('tutorId', '==', tutorId)
                .limit(1)
                .get();

            if (!existingPayoutCheck.empty) {
                const existingData = existingPayoutCheck.docs[0].data();
                tutorStatus = existingData.status || 'Pending';
                tutorTransactionId = existingData.transactionId || null;
                tutorSettledAt = existingData.settledAt || null;
                tutorTransactionCreated = existingData.transactionCreated || false;
            }

            // Build tutor object for response
            const tutorObj = {
                id: tutorId,
                tutor: data.name || data.tutorName || "Unknown Tutor",
                email: data.email || "",
                phone: data.phone || "",
                avatar: (data.name || data.tutorName || "T")[0].toUpperCase(),
                bank: bankName,
                account: bankAccount,
                bankCardId: bankCardId,
                status: tutorStatus,
                transactionId: tutorTransactionId,
                settledAt: tutorSettledAt,
                transactionCreated: tutorTransactionCreated,
                credits: data.credits || 0,
                totalTokens: totalTokens,
                paperCount: paperCount,
                studentCount: studentCount,
                totalPurchases: tutorPurchasedData.totalPurchases,
                uniqueExamsPurchased: tutorPurchasedData.examIds.size,
                uniqueStudents: tutorPurchasedData.studentIds.size,
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
                createdAt: data.createdAt || new Date().toISOString(),
                categoryCreditCost: categoryCreditCost,
                usedCategoryId: usedCategoryId
            };
            
            tutors.push(tutorObj);
            
            // ============================================
            // ✅ AUTO-SYNC: Update/Create tutor_payouts record
            // ============================================
            try {
                const payoutData = {
                    tutorId: tutorId,
                    tutorName: data.name || data.tutorName || 'Unknown Tutor',
                    tutorEmail: data.email || '',
                    tutorPhone: data.phone || '',
                    tutorUniversity: data.university || '',
                    tutorQualifications: data.qualifications || '',
                    tutorAvatar: (data.name || data.tutorName || 'T')[0].toUpperCase(),
                    tutorCredits: data.credits || 0,
                    bankName: bankName,
                    bankAccount: bankAccount,
                    bankCardId: bankCardId,
                    totalTokens: totalTokens,
                    totalAmount: grossAmount,
                    netPayout: netPayout,
                    platformShare: commissionAmount,
                    creditValue: creditRate,
                    exchangeRate: creditRate,
                    platformCommission: platformCommission,
                    minPayoutThreshold: minPayoutThreshold,
                    meetsMinThreshold: meetsMinThreshold,
                    paperCount: paperCount,
                    studentCount: studentCount,
                    tokensPerPaper: tokensPerPaper,
                    categoryCreditCost: categoryCreditCost,
                    usedCategoryId: usedCategoryId,
                    updatedAt: new Date().toISOString()
                };
                
                const existingPayoutSnapshot = await db.collection('tutor_payouts')
                    .where('tutorId', '==', tutorId)
                    .limit(1)
                    .get();
                
                if (!existingPayoutSnapshot.empty) {
                    const existingPayout = existingPayoutSnapshot.docs[0];
                    const existingData = existingPayout.data();
                    
                    const hasChanged = existingData.totalTokens !== totalTokens || 
                                      existingData.tutorName !== (data.name || data.tutorName) ||
                                      existingData.tutorEmail !== (data.email || '') ||
                                      existingData.tutorPhone !== (data.phone || '') ||
                                      existingData.tutorUniversity !== (data.university || '') ||
                                      existingData.tutorQualifications !== (data.qualifications || '') ||
                                      existingData.tutorAvatar !== (data.name || 'T')[0].toUpperCase() ||
                                      existingData.tutorCredits !== (data.credits || 0) ||
                                      existingData.bankName !== bankName ||
                                      existingData.bankAccount !== bankAccount ||
                                      existingData.paperCount !== paperCount ||
                                      existingData.studentCount !== studentCount ||
                                      existingData.tokensPerPaper !== tokensPerPaper ||
                                      existingData.exchangeRate !== creditRate ||
                                      existingData.totalAmount !== grossAmount ||
                                      existingData.netPayout !== netPayout ||
                                      existingData.platformShare !== commissionAmount ||
                                      existingData.minPayoutThreshold !== minPayoutThreshold ||
                                      existingData.platformCommission !== platformCommission ||
                                      existingData.meetsMinThreshold !== meetsMinThreshold ||
                                      existingData.categoryCreditCost !== categoryCreditCost;
                    
                    if (hasChanged) {
                        await existingPayout.ref.update({
                            ...payoutData,
                            status: 'Pending',
                            createdAt: existingData.createdAt || new Date().toISOString()
                        });
                        payoutUpdates++;
                        console.log(`   ✅ Updated existing payout for ${tutorId} (Total Payout: ${netPayout})`);
                    } else {
                        console.log(`   ⏭️ Skipping update - data unchanged for ${tutorId}`);
                    }
                } else {
                    await db.collection('tutor_payouts').add({
                        ...payoutData,
                        status: 'Pending',
                        createdAt: new Date().toISOString(),
                        requestSource: 'auto_sync_from_api',
                        transactionId: null,
                        transactionCreated: false,
                        settledAt: null,
                        declinedAt: null
                    });
                    payoutCreates++;
                    console.log(`   ✅ Created new payout for ${tutorId}`);
                }
            } catch (syncError) {
                console.error(`   ❌ Error syncing payout for ${tutorId}:`, syncError.message);
            }
        }

        // ============================================
        // 📊 SUMMARY CALCULATION
        // ============================================
        const summary = {
            totalTutors: tutors.length,
            totalStudents: tutors.reduce((sum, t) => sum + t.studentCount, 0),
            totalTokens: tutors.reduce((sum, t) => sum + t.totalTokens, 0),
            totalGrossAmount: tutors.reduce((sum, t) => sum + t.grossAmount, 0),
            totalCommissionAmount: tutors.reduce((sum, t) => sum + t.commissionAmount, 0),
            totalNetPayout: tutors.reduce((sum, t) => sum + t.netPayout, 0),
            exchangeRate: creditRate,
            platformCommission: platformCommission,
            minPayoutThreshold: minPayoutThreshold
        };
        console.log(`\n✅ Summary Total Net Payout: LKR ${summary.totalNetPayout}`);

        console.log(`\n✅ Found ${tutors.length} tutors, synced ${payoutUpdates} updates, ${payoutCreates} new`);

        res.status(200).json({
            success: true,
            tutors: tutors,
            count: tutors.length,
            summary: summary,
            categories: categoriesMap,
            exchangeRate: creditRate,
            platformCommission: platformCommission,
            minPayoutThreshold: minPayoutThreshold,
            message: `Showing ${tutors.length} tutors`,
            _syncStats: {
                updated: payoutUpdates,
                created: payoutCreates,
                totalTutors: tutors.length
            }
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
                        levels[levelDoc.id] = {
                            credit_cost: levelData.credit_cost || 0,
                            credits: levelData.credits || 0
                        };
                        console.log(`         ✅ ${levelDoc.id}: credit_cost=${levels[levelDoc.id].credit_cost}, credits=${levels[levelDoc.id].credits}`);
                    });
                } else {
                    if (data.levels && typeof data.levels === 'object') {
                        Object.keys(data.levels).forEach(levelKey => {
                            const levelData = data.levels[levelKey];
                            if (levelData && typeof levelData === 'object') {
                                levels[levelKey] = {
                                    credit_cost: levelData.credit_cost || 0,
                                    credits: levelData.credits || 0
                                };
                            } else if (typeof levelData === 'number') {
                                levels[levelKey] = { credit_cost: levelData, credits: levelData };
                            }
                        });
                    }
                }
            } catch (error) {
                console.log(`   ⚠️ Error fetching levels for ${categoryId}: ${error.message}`);
            }
            
            categoriesMap[categoryId] = {
                credit_cost: data.credit_cost || 0,
                credits: data.credits || 0,
                levels: levels
            };
        }
        
        console.log('📊 Categories with levels loaded for tokens:');
        Object.keys(categoriesMap).forEach(key => {
            console.log(`   ${key}: credit_cost=${categoriesMap[key].credit_cost}, credits=${categoriesMap[key].credits}, levels=${Object.keys(categoriesMap[key].levels).length}`);
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
                    const cat = categoriesMap[categoryId];
                    if (levelId && cat.levels && cat.levels[levelId] !== undefined) {
                        examTokens = cat.levels[levelId].credit_cost || cat.levels[levelId].credits || 0;
                        console.log(`   ✅ ${examId} -> ${examTokens} tokens (level: ${levelId})`);
                    } else {
                        examTokens = cat.credit_cost || cat.credits || 0;
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
                                    examTokens = cat.levels[levelId].credit_cost || cat.levels[levelId].credits || 0;
                                } else {
                                    examTokens = cat.credit_cost || cat.credits || 0;
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
        
        let exchangeRate = creditValue || await getExchangeRate();
        const platformCommission = await getPlatformCommission();
        const minPayoutThreshold = await getMinPayoutThreshold();
        
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
        
        const totalAmount = tokens * exchangeRate;
        const tutorShare = totalAmount * (1 - platformCommission);
        const platformShare = totalAmount * platformCommission;
        const meetsMinThreshold = tutorShare >= minPayoutThreshold;
        
        const payoutData = {
            tutorId: tutorId,
            tutorName: tutorData.name || tutorData.tutorName || "Unknown Tutor",
            tutorEmail: tutorData.email || "",
            tutorPhone: tutorData.phone || "",
            tutorUniversity: tutorData.university || "",
            tutorQualifications: tutorData.qualifications || "",
            tutorAvatar: (tutorData.name || tutorData.tutorName || "T")[0].toUpperCase(),
            tutorCredits: currentCredits,
            bankName: bankName,
            bankAccount: bankAccount,
            bankCardId: bankCardId,
            totalTokens: tokens,
            totalAmount: totalAmount,
            tutorShare: tutorShare,
            platformShare: platformShare,
            creditValue: exchangeRate,
            exchangeRate: exchangeRate,
            platformCommission: platformCommission,
            minPayoutThreshold: minPayoutThreshold,
            meetsMinThreshold: meetsMinThreshold,
            paperCount: 0,
            studentCount: 0,
            totalPurchases: 0,
            uniqueExamsPurchased: 0,
            uniqueStudents: 0,
            tokensPerPaper: 0,
            status: 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            requestSource: 'admin_dashboard',
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

        const settledPayouts = payouts.filter(p => 
            p.status === 'Settled' || p.status === 'settled'
        );

        const pendingPayouts = payouts.filter(p => 
            p.status === 'Pending' || p.status === 'pending'
        );

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
// 8. GET TOTAL USED CREDITS
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
// 9. UPDATE PAYOUT STATUS (WITH AUTO-SYNC & EMAIL)
// ============================================
exports.updatePayoutStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log(`📝 Updating payout ${id} to status: ${status}`);

        const payoutDoc = await db.collection('tutor_payouts').doc(id).get();
        if (!payoutDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "Payout not found"
            });
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
            console.log(`✅ Transaction created: ${transactionRef.id}`);

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
                
                await autoSyncUserToPayouts(payoutData.tutorId);
            }

            // ============================================================
            // 📧 SEND SETTLEMENT EMAIL TO TUTOR (BCC to Admin)
            // ============================================================
            try {
                const emailService = require('../services/emailService');
                const tutorEmail = payoutData.tutorEmail;
                const tutorName = payoutData.tutorName || 'Tutor';

                if (tutorEmail) {
                    console.log(`      📧 Attempting to send settlement email to ${tutorEmail}...`);
                    
                    const emailResult = await emailService.sendTutorPayoutSettlementEmail(
                        tutorEmail,
                        tutorName,
                        {
                            tutorId: payoutData.tutorId,
                            payoutId: id,
                            transactionId: transactionRef.id,
                            totalTokens: payoutData.totalTokens,
                            totalAmount: payoutData.totalAmount,
                            tutorShare: payoutData.netPayout,
                            platformShare: payoutData.platformShare,
                            exchangeRate: payoutData.exchangeRate,
                            bankName: payoutData.bankName,
                            bankAccount: payoutData.bankAccount
                        },
                        process.env.ADMIN_EMAIL || 'asgirind186@gmail.com'
                    );

                    if (emailResult.success) {
                        console.log(`      ✅ Settlement email SENT successfully to ${tutorEmail}`);
                    } else {
                        console.error(`      ❌ Failed to send settlement email to ${tutorEmail}: ${emailResult.error}`);
                    }
                } else {
                    console.warn(`      ⚠️ No email found for tutor ${payoutData.tutorId}, skipping email.`);
                }
            } catch (emailError) {
                console.error(`      ❌ Error in email sending for ${payoutData.tutorId}:`, emailError.message);
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
        console.error("Error in updatePayoutStatus:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            if (data.transactionId) {
                await db.collection('transactions').doc(data.transactionId).delete();
                deletedTransactions++;
            }
            
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
            return res.status(404).json({
                success: false,
                message: "Payout not found"
            });
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
        for (const id of payoutIds) {
            try {
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
// 🔥 18. ADD NEW TUTOR PAYOUT (Create 'tutor_payouts' Collection) ✅ WITH tutorEmail FIELD
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

        if (!tutorId) {
            return res.status(400).json({
                success: false,
                error: "tutorId is required"
            });
        }

        const tutorDoc = await db.collection('users').doc(tutorId).get();
        let tutorData = {};
        if (tutorDoc.exists) {
            tutorData = tutorDoc.data();
        }

        const bankDetails = await getTutorBankDetails(tutorId);

        const payoutData = {
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
            bankName: bankName || bankDetails.bankName || 'Not Specified',
            bankAccount: accountNo || bankDetails.bankAccount || 'N/A',
            bankCardId: bankDetails.bankCardId || null,
            totalTokens: Number(totalTokens || 0),
            totalAmount: Number(totalAmount || totalTokens * 20 || 0),
            netPayout: Number(netPayout || 0),
            platformShare: Number(platformShare || 0),
            creditValue: Number(creditValue || 20),
            exchangeRate: Number(creditValue || 20),
            platformCommission: 0.2,
            minPayoutThreshold: 5000,
            meetsMinThreshold: Number(netPayout || 0) >= 5000,
            paperCount: Number(paperCount || 0),
            studentCount: Number(studentCount || 0),
            totalPurchases: 0,
            uniqueExamsPurchased: 0,
            uniqueStudents: 0,
            tokensPerPaper: Number(paperCount || 0) > 0 ? Math.round(Number(totalTokens || 0) / Number(paperCount || 0)) : 0,
            status: 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            requestSource: 'admin_dashboard',
            transactionId: null,
            transactionCreated: false,
            settledAt: null,
            declinedAt: null
        };

        const docRef = await db.collection('tutor_payouts').add(payoutData);

        console.log(`✅ Tutor payout created: ${docRef.id}`);
        console.log(`📊 Tutor: ${payoutData.tutorName}, Email: ${payoutData.tutorEmail}, Tokens: ${totalTokens}, Net: ${netPayout}`);

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

// ============================================
// 🔥 22. SETTLE PENDING PAYOUTS (Monthly - 25th) - WITH EMAIL ✅
// ============================================
exports.settlePendingPayouts = async (req, res) => {
    try {
        console.log("💰 Starting monthly payout settlement process...");
        
        // 1️⃣ Get all Pending payouts
        const pendingSnapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Pending')
            .get();
        
        if (pendingSnapshot.empty) {
            console.log("✅ No pending payouts found.");
            return res.status(200).json({
                success: true,
                message: "No pending payouts to settle",
                settledCount: 0
            });
        }
        
        console.log(`📊 Found ${pendingSnapshot.size} pending payouts to settle`);
        
        let settledCount = 0;
        let transactionCount = 0;
        const results = [];
        
        // 2️⃣ Process each pending payout
        for (const doc of pendingSnapshot.docs) {
            const payoutData = doc.data();
            const payoutId = doc.id;
            
            try {
                console.log(`   📝 Processing payout: ${payoutId} for tutor: ${payoutData.tutorName}`);
                
                // 🔹 Get exchange rate and commission
                const exchangeRate = payoutData.exchangeRate || payoutData.creditValue || await getExchangeRate();
                const platformCommission = payoutData.platformCommission || await getPlatformCommission();
                
                // 🔹 Create Transaction Record
                const transactionData = {
                    tutorId: payoutData.tutorId,
                    tutorName: payoutData.tutorName || 'Unknown Tutor',
                    tutorEmail: payoutData.tutorEmail || '',
                    tutorPhone: payoutData.tutorPhone || '',
                    tutorUniversity: payoutData.tutorUniversity || '',
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
                    bankName: payoutData.bankName || 'Not Specified',
                    bankAccount: payoutData.bankAccount || 'N/A',
                    createdAt: new Date().toISOString(),
                    processedAt: new Date().toISOString(),
                    paymentMethod: 'Bank Transfer (Auto-Settlement)',
                    description: `Monthly auto-settlement for tutor ${payoutData.tutorName || payoutData.tutorId} on ${new Date().toLocaleDateString()}`
                };
                
                // 🔹 Save to transactions collection
                const transactionRef = await db.collection('transactions').add(transactionData);
                transactionCount++;
                console.log(`      ✅ Transaction created: ${transactionRef.id}`);
                
                // 🔹 Update payout status to Settled
                await db.collection('tutor_payouts').doc(payoutId).update({
                    status: 'Settled',
                    transactionId: transactionRef.id,
                    transactionCreated: true,
                    settledAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                settledCount++;
                
                // 🔹 Update tutor credits (deduct used credits)
                const tutorDoc = await db.collection('users').doc(payoutData.tutorId).get();
                if (tutorDoc.exists) {
                    const tutorData = tutorDoc.data();
                    const currentCredits = tutorData.credits || 0;
                    const newCredits = Math.max(0, currentCredits - (payoutData.totalTokens || 0));
                    
                    await db.collection('users').doc(payoutData.tutorId).update({
                        credits: newCredits,
                        lastPayoutAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                    console.log(`      ✅ Tutor credits updated: ${currentCredits} -> ${newCredits}`);
                }
                
                // ============================================================
                // 📧 SEND SETTLEMENT EMAIL TO TUTOR (BCC to Admin)
                // ============================================================
                try {
                    const emailService = require('../services/emailService');
                    const tutorEmail = payoutData.tutorEmail;
                    const tutorName = payoutData.tutorName || 'Tutor';

                    if (tutorEmail) {
                        console.log(`      📧 Attempting to send settlement email to ${tutorEmail}...`);
                        
                        const emailResult = await emailService.sendTutorPayoutSettlementEmail(
                            tutorEmail,
                            tutorName,
                            {
                                tutorId: payoutData.tutorId,
                                payoutId: payoutId,
                                transactionId: transactionRef.id,
                                totalTokens: payoutData.totalTokens,
                                totalAmount: payoutData.totalAmount,
                                tutorShare: payoutData.netPayout,
                                platformShare: payoutData.platformShare,
                                exchangeRate: payoutData.exchangeRate,
                                bankName: payoutData.bankName,
                                bankAccount: payoutData.bankAccount
                            },
                            process.env.ADMIN_EMAIL || 'asgirind186@gmail.com'
                        );

                        if (emailResult.success) {
                            console.log(`      ✅ Settlement email SENT successfully to ${tutorEmail}`);
                        } else {
                            console.error(`      ❌ Failed to send settlement email to ${tutorEmail}: ${emailResult.error}`);
                        }
                    } else {
                        console.warn(`      ⚠️ No email found for tutor ${payoutData.tutorId}, skipping email.`);
                    }
                } catch (emailError) {
                    console.error(`      ❌ Error in email sending for ${payoutData.tutorId}:`, emailError.message);
                }
                // ============================================================

                results.push({
                    payoutId: payoutId,
                    tutorId: payoutData.tutorId,
                    tutorName: payoutData.tutorName,
                    transactionId: transactionRef.id,
                    status: 'Settled',
                    amount: payoutData.totalAmount
                });
                
            } catch (error) {
                console.error(`   ❌ Error processing payout ${payoutId}:`, error.message);
                results.push({
                    payoutId: payoutId,
                    tutorId: payoutData.tutorId,
                    tutorName: payoutData.tutorName,
                    error: error.message,
                    status: 'Failed'
                });
            }
        }
        
        console.log(`\n✅ Settlement complete: ${settledCount} payouts settled, ${transactionCount} transactions created`);
        
        return res.status(200).json({
            success: true,
            message: `Successfully settled ${settledCount} payouts and created ${transactionCount} transactions`,
            settledCount: settledCount,
            transactionCount: transactionCount,
            results: results
        });
        
    } catch (error) {
        console.error("❌ Error in settlePendingPayouts:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// 🔥 23. REVERT ALL SETTLED PAYOUTS TO PENDING (Fix existing data)
// ============================================
exports.revertAllSettled = async (req, res) => {
    try {
        console.log("🔄 Reverting all Settled payouts to Pending...");
        
        const snapshot = await db.collection('tutor_payouts')
            .where('status', '==', 'Settled')
            .get();
        
        if (snapshot.empty) {
            return res.status(200).json({
                success: true,
                message: "No Settled payouts found",
                count: 0
            });
        }
        
        let count = 0;
        const batch = db.batch();
        
        snapshot.forEach(doc => {
            batch.update(doc.ref, {
                status: 'Pending',
                settledAt: null,
                transactionId: null,
                transactionCreated: false,
                updatedAt: new Date().toISOString()
            });
            count++;
        });
        
        await batch.commit();
        console.log(`✅ Reverted ${count} payouts to Pending`);
        
        res.status(200).json({
            success: true,
            message: `Reverted ${count} payouts to Pending`,
            count: count
        });
        
    } catch (error) {
        console.error("❌ Error reverting:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

console.log('✅ Payout Controller Loaded Successfully');
console.log('📋 Available functions:', Object.keys(exports).join(', '));