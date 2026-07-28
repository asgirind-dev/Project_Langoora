// backend/controllers/creditValuationController.js
const { db } = require('../config/firebase');
const creditService = require('../services/CreditValuationService');

// ✅ ADD: Audit Log Service
const auditLogService = require('../services/auditLogService');

// ✅ Helper for non-blocking audit logging
const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

const logCategoryActivity = async (id, actionType, logDetails) => {
  try {
    const newHistoryLog = {
      logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: actionType,
      ...logDetails,
      updatedAt: new Date().toISOString()
    };

    const docRef = db.collection('exam_categories').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return;

    const data = doc.data() || {};
    const existingHistory = Array.isArray(data.creditHistory) ? data.creditHistory : [];
    await docRef.update({
      creditHistory: [newHistoryLog, ...existingHistory]
    });
  } catch (error) {
    console.error(`Error logging activity:`, error);
  }
};

// =========================================================================
// GET CATEGORIES (NO AUDIT - READ ONLY)
// ✅ FIXED: Use credit_cost instead of credits
// ✅ FIXED: Properly handle isCreditSet field
// ✅ FIXED: Added debug logging for troubleshooting
// =========================================================================
exports.getCategories = async (req, res) => {
  try {
    console.log('📊 Fetching categories with credit data...');
    
    const catsSnapshot = await db.collection('exam_categories').get();
    const flattenedList = [];

    for (const catDoc of catsSnapshot.docs) {
      const catId = catDoc.id;
      const catData = catDoc.data();
      console.log(`📂 Processing category: ${catId}`);
      
      const levelsSnapshot = await db.collection(`exam_categories/${catId}/levels`).get();

      if (!levelsSnapshot.empty) {
        console.log(`📂 Found ${levelsSnapshot.size} levels for ${catId}`);
        
        levelsSnapshot.forEach(levelDoc => {
          const levelData = levelDoc.data();
          const levelId = levelDoc.id;
          
          // ✅ Get credit values with proper defaults
          const creditCost = levelData.credit_cost !== undefined ? levelData.credit_cost : 0;
          const isCreditSet = levelData.isCreditSet === true;
          
          console.log(`  📊 Level ${levelId}: credit_cost=${creditCost}, isCreditSet=${isCreditSet}`);
          
          flattenedList.push({
            id: levelId,
            categoryId: catId,
            categoryName: catData.category_name || catData.name || catId,
            name: levelData.level_name || levelData.name || levelId,
            credits: creditCost,                    // ✅ Use credit_cost
            isCreditSet: isCreditSet,               // ✅ Boolean value
            active: levelData.is_active !== 0,
            status: levelData.status || 'active',
            hasSubLevels: true
          });
        });
      } else {
        // ✅ Category without levels
        const creditCost = catData.credit_cost !== undefined ? catData.credit_cost : (catData.credits || 0);
        const isCreditSet = catData.isCreditSet === true;
        
        console.log(`  📊 Category ${catId}: credit_cost=${creditCost}, isCreditSet=${isCreditSet}`);
        
        flattenedList.push({
          id: catId,
          categoryId: catId,
          categoryName: catData.category_name || catData.name || catId,
          name: catData.category_name || catData.name || catId,
          credits: creditCost,                      // ✅ Use credit_cost
          isCreditSet: isCreditSet,                 // ✅ Boolean value
          active: catData.is_active !== 0,
          status: catData.status || 'active',
          hasSubLevels: false
        });
      }
    }
    
    console.log(`✅ Returning ${flattenedList.length} items`);
    res.status(200).json(flattenedList);
    
  } catch (error) {
    console.error('❌ Get Categories Error:', error);
    res.status(500).json({ 
      message: "Categories fetch error", 
      error: error.message 
    });
  }
};

// =========================================================================
// UPDATE LEVEL CREDITS - WITH AUDIT LOG
// ✅ FIXED: Update credit_cost instead of credits
// ✅ FIXED: Set isCreditSet = true when finance admin sets credits
// ✅ FIXED: Properly track pending status
// =========================================================================
exports.updateLevelCredits = async (req, res) => {
  try {
    const { categoryId, levelId } = req.params;
    const { credits } = req.body;
    const creditsInt = parseInt(credits);

    console.log(`💰 Updating credits for level: ${levelId} in category: ${categoryId}`);
    console.log(`💰 New credits value: ${creditsInt}`);

    const levelRef = db.collection(`exam_categories/${categoryId}/levels`).doc(levelId);
    const levelDoc = await levelRef.get();
    
    if (!levelDoc.exists) {
      return res.status(404).json({ message: "Level not found" });
    }

    const levelData = levelDoc.data();
    const previousCredits = levelData.credit_cost !== undefined ? levelData.credit_cost : 0;
    const wasPending = levelData.isCreditSet !== true;
    const levelName = levelData.level_name || levelData.name || levelId;

    console.log(`💰 Previous credits: ${previousCredits}, wasPending: ${wasPending}`);

    // ✅ Update credit_cost and set isCreditSet to true
    await levelRef.update({
      credit_cost: creditsInt,          // ✅ Update credit_cost
      isCreditSet: true,               // ✅ Mark as set by Finance Admin
      updated_at: new Date().toISOString()
    });

    // ✅ Existing category activity log
    await logCategoryActivity(categoryId, "CREDIT_UPDATE", {
      previousCredits: parseInt(previousCredits),
      newCredits: creditsInt,
      levelId,
      levelName,
      wasPending: wasPending
    });

    // ✅ CREDIT MANAGEMENT AUDIT LOG - LEVEL CREDITS UPDATED
    logAudit(auditLogService.logCreditManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'updated',
      entityType: 'level',
      entityId: levelId,
      entityName: levelName,
      previousCredits: previousCredits,
      newCredits: creditsInt,
      wasPending: wasPending,           // ✅ Track if it was pending
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    console.log(`✅ Level ${levelId} credits updated from ${previousCredits} to ${creditsInt}`);

    res.status(200).json({ 
      success: true, 
      categoryId, 
      levelId, 
      previousCredits, 
      newCredits: creditsInt,
      isCreditSet: true,
      wasPending: wasPending
    });
    
  } catch (error) {
    console.error('❌ Update Level Credits Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// =========================================================================
// UPDATE CATEGORY CREDITS - WITH AUDIT LOG
// ✅ FIXED: Use credit_cost instead of credits
// ✅ FIXED: Set isCreditSet = true when finance admin sets credits
// =========================================================================
exports.updateCategoryCredits = async (req, res) => {
  try {
    const { id } = req.params;
    const { credits } = req.body;
    const creditsInt = parseInt(credits);

    console.log(`💰 Updating category credits for: ${id}`);
    console.log(`💰 New credits value: ${creditsInt}`);

    const catDoc = await db.collection('exam_categories').doc(id).get();
    
    if (!catDoc.exists) {
      return res.status(404).json({ message: "Category not found" });
    }

    const catData = catDoc.data();
    const previousCredits = catData.credit_cost !== undefined ? catData.credit_cost : (catData.credits || 0);
    const categoryName = catData.category_name || catData.name || id;
    const wasPending = catData.isCreditSet !== true;

    console.log(`💰 Previous credits: ${previousCredits}, wasPending: ${wasPending}`);

    // ✅ Update credit_cost and set isCreditSet to true
    await db.collection('exam_categories').doc(id).update({
      credit_cost: creditsInt,           // ✅ Update credit_cost
      isCreditSet: true,                // ✅ Mark as set by Finance Admin
      updated_at: new Date().toISOString()
    });

    // ✅ Existing category activity log
    await logCategoryActivity(id, "CREDIT_UPDATE", {
      previousCredits: parseInt(previousCredits),
      newCredits: creditsInt,
      levelId: null,
      levelName: categoryName,
      wasPending: wasPending
    });

    // ✅ CREDIT MANAGEMENT AUDIT LOG - CATEGORY CREDITS UPDATED
    logAudit(auditLogService.logCreditManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'updated',
      entityType: 'category',
      entityId: id,
      entityName: categoryName,
      previousCredits: previousCredits,
      newCredits: creditsInt,
      wasPending: wasPending,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    console.log(`✅ Category ${id} credits updated from ${previousCredits} to ${creditsInt}`);

    res.status(200).json({ 
      success: true, 
      id, 
      previousCredits, 
      newCredits: creditsInt,
      isCreditSet: true,
      wasPending: wasPending
    });
    
  } catch (error) {
    console.error('❌ Update Category Credits Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// =========================================================================
// GET CREDIT HISTORY (NO AUDIT - READ ONLY)
// ✅ FIXED: Use credit_cost instead of credits
// ✅ FIXED: Properly display pending status
// =========================================================================
exports.getCreditHistory = async (req, res) => {
  try {
    console.log('📊 Fetching credit history...');
    
    const categoriesSnapshot = await db.collection('exam_categories').get();
    let allHistory = [];

    for (const catDoc of categoriesSnapshot.docs) {
      const categoryData = catDoc.data();
      const categoryName = categoryData.category_name || categoryData.name || catDoc.id;

      if (Array.isArray(categoryData.creditHistory)) {
        categoryData.creditHistory.forEach(log => {
          let examName = categoryName;
          if (log.levelName && log.levelName !== categoryName) {
            examName = `${categoryName} - ${log.levelName}`;
          }
          allHistory.push({
            id: log.logId || `history_${Date.now()}`,
            examName,
            previousCredits: log.previousCredits ?? 0,
            newCredits: log.newCredits ?? 0,
            wasPending: log.wasPending || false,
            updatedAt: log.updatedAt || new Date().toISOString()
          });
        });
      }
    }
    
    // ✅ Sort by most recent first
    allHistory.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    console.log(`✅ Found ${allHistory.length} history entries`);
    res.status(200).json(allHistory);
    
  } catch (error) {
    console.error('❌ Get Credit History Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// =========================================================================
// CLEAR CREDIT HISTORY - WITH AUDIT LOG
// =========================================================================
exports.clearCreditHistory = async (req, res) => {
  try {
    console.log('🗑️ Clearing credit history...');
    
    // ✅ Get count of history entries before clearing
    let historyCount = 0;
    const categoriesSnapshot = await db.collection('exam_categories').get();
    for (const catDoc of categoriesSnapshot.docs) {
      const categoryData = catDoc.data();
      if (Array.isArray(categoryData.creditHistory)) {
        historyCount += categoryData.creditHistory.length;
      }
    }

    await creditService.clearCreditHistory();

    // ✅ CREDIT MANAGEMENT AUDIT LOG - HISTORY CLEARED
    logAudit(auditLogService.logCreditManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'cleared',
      entityType: 'credit_history',
      entityId: 'all',
      entityName: 'Credit History',
      changes: { entries_cleared: historyCount },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    console.log(`✅ Cleared ${historyCount} history entries`);
    res.status(200).json({ 
      success: true, 
      message: "Cleared credit history",
      entriesCleared: historyCount 
    });
    
  } catch (error) {
    console.error('❌ Clear Credit History Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};