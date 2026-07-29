const { db } = require('../config/firebase');
const auditLogService = require('../services/auditLogService');
const emailService = require('../services/emailService');

// 💡 Helper for logging category & level activity
const logCategoryActivity = async (categoryId, levelId, actionType, logDetails) => {
  try {
    const newHistoryLog = {
      logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: actionType,
      ...logDetails,
      updatedAt: new Date().toISOString()
    };

    if (levelId) {
      const levelRef = db.collection(`exam_categories/${categoryId}/levels`).doc(levelId);
      const levelDoc = await levelRef.get();
      if (levelDoc.exists) {
        const data = levelDoc.data() || {};
        const existingHistory = Array.isArray(data.creditHistory) ? data.creditHistory : [];
        await levelRef.set({ creditHistory: [newHistoryLog, ...existingHistory] }, { merge: true });
      }
    } else {
      const docRef = db.collection('exam_categories').doc(categoryId);
      const doc = await docRef.get();
      if (doc.exists) {
        const data = doc.data() || {};
        const existingHistory = Array.isArray(data.creditHistory) ? data.creditHistory : [];
        await docRef.set({ creditHistory: [newHistoryLog, ...existingHistory] }, { merge: true });
      }
    }

    console.log(`✅ Activity logged successfully for Category: ${categoryId}${levelId ? `, Level: ${levelId}` : ''}`);
  } catch (error) {
    console.error(`❌ Error logging category activity:`, error);
  }
};

const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

// =========================================================================
// 📋 GET CATEGORIES & SUB-LEVELS
// =========================================================================
exports.getCategories = async (req, res) => {
  try {
    const catsSnapshot = await db.collection('exam_categories').get();
    const flattenedList = [];

    for (const catDoc of catsSnapshot.docs) {
      const catId = catDoc.id;
      const catData = catDoc.data();
      
      const levelsSnapshot = await db.collection(`exam_categories/${catId}/levels`).get();

      if (!levelsSnapshot.empty) {
        levelsSnapshot.forEach(levelDoc => {
          const levelData = levelDoc.data();
          const levelId = levelDoc.id;
          
          const creditCost = levelData.credit_cost !== undefined ? levelData.credit_cost : 0;
          const isCreditSet = levelData.isCreditSet === true;
          
          flattenedList.push({
            id: levelId,
            categoryId: catId,
            categoryName: catData.category_name || catData.name || catId,
            name: levelData.level_name || levelData.name || levelId,
            credits: creditCost,
            isCreditSet: isCreditSet,
            active: levelData.is_active !== 0,
            status: levelData.status || 'active',
            hasSubLevels: true
          });
        });
      } else {
        const creditCost = catData.credit_cost !== undefined ? catData.credit_cost : (catData.credits || 0);
        const isCreditSet = catData.isCreditSet === true;
        
        flattenedList.push({
          id: catId,
          categoryId: catId,
          categoryName: catData.category_name || catData.name || catId,
          name: catData.category_name || catData.name || catId,
          credits: creditCost,
          isCreditSet: isCreditSet,
          active: catData.is_active !== 0,
          status: catData.status || 'active',
          hasSubLevels: false
        });
      }
    }
    
    res.status(200).json(flattenedList);
  } catch (error) {
    console.error('❌ Get Categories Error:', error);
    res.status(500).json({ message: "Categories fetch error", error: error.message });
  }
};

// =========================================================================
// 1. UPDATE LEVEL CREDITS (Sends Email to MAIN ADMIN)
// =========================================================================
exports.updateLevelCredits = async (req, res) => {
  try {
    const { categoryId, levelId } = req.params;
    const { credits, isRevision, reason } = req.body;
    const creditsInt = parseInt(credits);

    const levelRef = db.collection(`exam_categories/${categoryId}/levels`).doc(levelId);
    const levelDoc = await levelRef.get();
    
    if (!levelDoc.exists) {
      return res.status(404).json({ message: "Level not found" });
    }

    const levelData = levelDoc.data();
    const previousCredits = levelData.credit_cost !== undefined ? levelData.credit_cost : 0;
    const wasPending = levelData.isCreditSet !== true;
    const levelName = levelData.level_name || levelData.name || levelId;

    const isRevisionRequested = isRevision === true || creditsInt === 0;

    await levelRef.update({
      credit_cost: isRevisionRequested ? 0 : creditsInt,
      isCreditSet: !isRevisionRequested,
      is_active: isRevisionRequested ? 0 : 1,
      status: isRevisionRequested ? 'pending_revision' : 'active',
      updated_at: new Date().toISOString()
    });

    await logCategoryActivity(categoryId, levelId, "CREDIT_UPDATE", {
      previousCredits: parseInt(previousCredits),
      newCredits: isRevisionRequested ? 0 : creditsInt,
      levelId,
      levelName,
      wasPending: wasPending,
      isRevision: isRevisionRequested
    });

    logAudit(auditLogService.logCreditManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'himashikashmira30@gmail.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'himashikashmira30@gmail.com',
      action: isRevisionRequested ? 'revision_requested' : 'approved_and_configured',
      entityType: 'level',
      entityId: levelId,
      entityName: levelName,
      previousCredits: previousCredits,
      newCredits: creditsInt,
      wasPending: wasPending,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const adminEmail = process.env.ADMIN_EMAIL || 'asgirind186@gmail.com';
    
    if (isRevisionRequested) {
      console.log(`📧 Dispatching Credit Revision Email to Admin: ${adminEmail}`);
      if (emailService && emailService.sendCreditRevisionEmail) {
        emailService.sendCreditRevisionEmail(adminEmail, levelName, reason || 'Finance Admin requested a credit revision.', req.user?.email || 'Finance Admin')
          .catch(err => console.error('❌ Admin Revision Email Error:', err.message));
      }
    } else {
      console.log(`📧 Dispatching Credit Configured Email to Admin: ${adminEmail}`);
      if (emailService && emailService.sendCreditConfiguredEmail) {
        emailService.sendCreditConfiguredEmail(adminEmail, levelName, creditsInt, req.user?.email || 'Finance Admin')
          .catch(err => console.error('❌ Admin Credit Configured Email Error:', err.message));
      }
    }

    res.status(200).json({ 
      success: true, 
      categoryId, 
      levelId, 
      previousCredits, 
      newCredits: isRevisionRequested ? 0 : creditsInt,
      isCreditSet: !isRevisionRequested,
      is_active: isRevisionRequested ? 0 : 1,
      status: isRevisionRequested ? 'pending_revision' : 'active',
      wasPending: wasPending
    });
    
  } catch (error) {
    console.error('❌ Update Level Credits Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// =========================================================================
// 2. UPDATE CATEGORY CREDITS (Sends Email to MAIN ADMIN)
// =========================================================================
exports.updateCategoryCredits = async (req, res) => {
  try {
    const { id } = req.params;
    const { credits, isRevision, reason } = req.body;
    const creditsInt = parseInt(credits);

    const catDoc = await db.collection('exam_categories').doc(id).get();
    
    if (!catDoc.exists) {
      return res.status(404).json({ message: "Category not found" });
    }

    const catData = catDoc.data();
    const previousCredits = catData.credit_cost !== undefined ? catData.credit_cost : (catData.credits || 0);
    const categoryName = catData.category_name || catData.name || id;
    const wasPending = catData.isCreditSet !== true;

    const isRevisionRequested = isRevision === true || creditsInt === 0;

    await db.collection('exam_categories').doc(id).update({
      credit_cost: isRevisionRequested ? 0 : creditsInt,
      isCreditSet: !isRevisionRequested,
      is_active: isRevisionRequested ? 0 : 1,
      status: isRevisionRequested ? 'pending_revision' : 'active',
      updated_at: new Date().toISOString()
    });

    await logCategoryActivity(id, null, "CREDIT_UPDATE", {
      previousCredits: parseInt(previousCredits),
      newCredits: isRevisionRequested ? 0 : creditsInt,
      levelId: null,
      levelName: categoryName,
      wasPending: wasPending,
      isRevision: isRevisionRequested
    });

    logAudit(auditLogService.logCreditManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'himashikashmira30@gmail.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'himashikashmira30@gmail.com',
      action: isRevisionRequested ? 'revision_requested' : 'approved_and_configured',
      entityType: 'category',
      entityId: id,
      entityName: categoryName,
      previousCredits: previousCredits,
      newCredits: creditsInt,
      wasPending: wasPending,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const adminEmail = process.env.ADMIN_EMAIL || 'asgirind186@gmail.com';

    if (isRevisionRequested) {
      console.log(`📧 Dispatching Credit Revision Email to Admin: ${adminEmail}`);
      if (emailService && emailService.sendCreditRevisionEmail) {
        emailService.sendCreditRevisionEmail(adminEmail, categoryName, reason || 'Finance Admin requested a credit revision.', req.user?.email || 'Finance Admin')
          .catch(err => console.error('❌ Admin Revision Email Error:', err.message));
      }
    } else {
      console.log(`📧 Dispatching Credit Configured Email to Admin: ${adminEmail}`);
      if (emailService && emailService.sendCreditConfiguredEmail) {
        emailService.sendCreditConfiguredEmail(adminEmail, categoryName, creditsInt, req.user?.email || 'Finance Admin')
          .catch(err => console.error('❌ Admin Category Credit Email Error:', err.message));
      }
    }

    res.status(200).json({ 
      success: true, 
      id, 
      previousCredits, 
      newCredits: isRevisionRequested ? 0 : creditsInt,
      isCreditSet: !isRevisionRequested,
      is_active: isRevisionRequested ? 0 : 1,
      status: isRevisionRequested ? 'pending_revision' : 'active',
      wasPending: wasPending
    });
    
  } catch (error) {
    console.error('❌ Update Category Credits Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// =========================================================================
// 📊 GET CREDIT HISTORY
// =========================================================================
exports.getCreditHistory = async (req, res) => {
  try {
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
            id: log.logId || `history_${Date.now()}_${Math.random()}`,
            examName,
            previousCredits: log.previousCredits ?? 0,
            newCredits: log.newCredits ?? 0,
            wasPending: log.wasPending || false,
            updatedAt: log.updatedAt || new Date().toISOString()
          });
        });
      }

      const levelsSnapshot = await db.collection(`exam_categories/${catDoc.id}/levels`).get();
      if (!levelsSnapshot.empty) {
        levelsSnapshot.forEach(levelDoc => {
          const levelData = levelDoc.data();
          if (Array.isArray(levelData.creditHistory)) {
            levelData.creditHistory.forEach(log => {
              let examName = categoryName;
              if (log.levelName && log.levelName !== categoryName) {
                examName = `${categoryName} - ${log.levelName}`;
              } else if (levelData.level_name || levelData.name) {
                examName = `${categoryName} - ${levelData.level_name || levelData.name}`;
              }

              allHistory.push({
                id: log.logId || `history_${Date.now()}_${Math.random()}`,
                examName,
                previousCredits: log.previousCredits ?? 0,
                newCredits: log.newCredits ?? 0,
                wasPending: log.wasPending || false,
                updatedAt: log.updatedAt || new Date().toISOString()
              });
            });
          }
        });
      }
    }
    
    allHistory.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.status(200).json(allHistory);
  } catch (error) {
    console.error('❌ Get Credit History Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// =========================================================================
// 🗑️ CLEAR CREDIT HISTORY
// =========================================================================
exports.clearCreditHistory = async (req, res) => {
  try {
    let historyCount = 0;
    const categoriesSnapshot = await db.collection('exam_categories').get();
    const batch = db.batch();

    for (const catDoc of categoriesSnapshot.docs) {
      const categoryData = catDoc.data();
      if (Array.isArray(categoryData.creditHistory)) {
        historyCount += categoryData.creditHistory.length;
      }
      const docRef = db.collection('exam_categories').doc(catDoc.id);
      batch.update(docRef, { creditHistory: [] });

      const levelsSnapshot = await db.collection(`exam_categories/${catDoc.id}/levels`).get();
      if (!levelsSnapshot.empty) {
        levelsSnapshot.forEach(levelDoc => {
          const levelData = levelDoc.data();
          if (Array.isArray(levelData.creditHistory)) {
            historyCount += levelData.creditHistory.length;
          }
          batch.update(levelDoc.ref, { creditHistory: [] });
        });
      }
    }

    await batch.commit();
    res.status(200).json({ success: true, message: "Cleared credit history", entriesCleared: historyCount });
  } catch (error) {
    console.error('❌ Clear Credit History Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};