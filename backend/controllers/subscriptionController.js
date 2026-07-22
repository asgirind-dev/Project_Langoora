const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const subscriptionService = require('../services/SubscriptionService');

// ===== Helper: Activity log (FIXED FIELDVALUE ISSUE) =====
const logCategoryActivity = async (id, actionType, logDetails) => {
  try {
    const newHistoryLog = {
      logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: actionType,
      ...logDetails,
      updatedAt: new Date().toISOString()
    };

    console.log(`📝 Logging activity for ${id}:`, actionType, newHistoryLog.logId);

    const docRef = db.collection('exam_categories').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.error(`❌ Document ${id} not found in Firestore!`);
      return;
    }

    const data = doc.data() || {};
    // පරණ history array එක අරගෙන ඒකට අලුත් log එක එකතු කරනවා
    const existingHistory = Array.isArray(data.creditHistory) ? data.creditHistory : [];
    const updatedHistory = [newHistoryLog, ...existingHistory];

    // Array එක direct update කරනවා (FieldValue.arrayUnion Crash වීම් නැත)
    await docRef.update({
      creditHistory: updatedHistory
    });

    console.log(`✅ History successfully logged for ${id} - ${newHistoryLog.logId}`);
  } catch (error) {
    console.error(`❌ Error logging activity:`, error);
  }
};
// 1. SUBSCRIPTION PLANS
exports.getPlans = async (req, res) => {
  try {
    const plans = await subscriptionService.getAllPlans(); 
    const activePlans = plans.filter(plan => plan.active === true);
    res.status(200).json(activePlans);
  } catch (error) {
    res.status(500).json({ message: "Plans fetch error", error: error.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    if (!req.body.name || !req.body.price) {
      return res.status(400).json({ message: "Name and Price are required" });
    }
    const newPlan = await subscriptionService.createNewPlan(req.body);
    res.status(201).json(newPlan);
  } catch (error) {
    res.status(500).json({ message: "Plan creation error", error: error.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    await subscriptionService.updateExistingPlan(id, req.body);
    res.status(200).json({ message: "Plan updated successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Plan update error", error: error.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    await subscriptionService.deleteExistingPlan(id);
    res.status(200).json({ message: "Plan deleted successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Plan deletion error", error: error.message });
  }
};

// 2. GET CATEGORIES
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
          flattenedList.push({
            id: levelDoc.id,
            categoryId: catId,
            categoryName: catData.category_name || catData.name || catId,
            name: levelData.level_name || levelData.name || levelDoc.id,
            credits: levelData.credits || 0,
            language: levelData.language || catData.language || '',
            active: levelData.is_active !== 0,
            status: levelData.status || 'active',
            hasSubLevels: true
          });
        });
      } else {
        flattenedList.push({
          id: catId,
          categoryId: catId,
          categoryName: catData.category_name || catData.name || catId,
          name: catData.category_name || catData.name || catId,
          credits: catData.credits || 0,
          language: catData.language || '',
          active: catData.is_active !== 0,
          status: catData.status || 'active',
          hasSubLevels: false
        });
      }
    }

    res.status(200).json(flattenedList);
  } catch (error) {
    res.status(500).json({ message: "Categories fetch error", error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    if (!req.body.name || req.body.credits === undefined) {
      return res.status(400).json({ message: "Category Name and Credits are required" });
    }
    const newCategory = await subscriptionService.createNewCategory(req.body);
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ message: "Category creation error", error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const catDoc = await db.collection('exam_categories').doc(id).get();
    if (!catDoc.exists) return res.status(404).json({ message: "Category not found" });
    const oldData = catDoc.data();

    await subscriptionService.updateExistingCategory(id, req.body);

    if (req.body.credits !== undefined && oldData.credits !== req.body.credits) {
      await logCategoryActivity(id, "CREDIT_UPDATE", {
        previousCredits: oldData.credits || 0,
        newCredits: req.body.credits,
        levelId: null,
        levelName: oldData.category_name || oldData.name || id
      });
    }

    res.status(200).json({ message: "Category updated successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Category update error", error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const catDoc = await db.collection('exam_categories').doc(id).get();
    if (!catDoc.exists) return res.status(404).json({ message: "Category not found" });
    const oldData = catDoc.data();

    await db.collection('exam_categories').doc(id).update({
      status: 'deleted',
      is_active: 0,
      active: false
    });

    await logCategoryActivity(id, "DELETED", {
      previousCredits: oldData.credits || 0,
      newCredits: 0
    });

    res.status(200).json({ message: "Category deleted successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Category deletion error", error: error.message });
  }
};

// 3. UPDATE LEVEL CREDITS
exports.updateLevelCredits = async (req, res) => {
  try {
    const { categoryId, levelId } = req.params;
    const { credits } = req.body;
    const creditsInt = parseInt(credits);

    if (creditsInt < 0) {
      return res.status(400).json({ success: false, message: "Credits cannot be negative." });
    }

    const levelRef = db.collection(`exam_categories/${categoryId}/levels`).doc(levelId);
    const levelDoc = await levelRef.get();

    if (!levelDoc.exists) {
      return res.status(404).json({ message: "Level not found" });
    }

    const levelData = levelDoc.data();
    const previousCredits = levelData.credits || 0;
    const levelName = levelData.level_name || levelData.name || levelId;

    await levelRef.update({
      credits: creditsInt,
      updated_at: new Date().toISOString(),
      isCreditSet: true
    });

    await logCategoryActivity(categoryId, "CREDIT_UPDATE", {
      previousCredits: parseInt(previousCredits),
      newCredits: creditsInt,
      levelId: levelId,
      levelName: levelName
    });

    res.status(200).json({ 
      success: true,
      message: `Level credits updated successfully`, 
      categoryId, 
      levelId,
      previousCredits,
      newCredits: creditsInt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. UPDATE CATEGORY CREDITS
exports.updateCategoryCredits = async (req, res) => {
  try {
    const { id } = req.params;
    const { credits } = req.body;
    const creditsInt = parseInt(credits);

    if (creditsInt < 0) {
      return res.status(400).json({ success: false, message: "Credits cannot be negative." });
    }

    const catDoc = await db.collection('exam_categories').doc(id).get();
    if (!catDoc.exists) return res.status(404).json({ success: false, message: "Category not found" });

    const oldData = catDoc.data();
    const previousCredits = oldData.credits || 0;
    const categoryName = oldData.category_name || oldData.name || id;

    await db.collection('exam_categories').doc(id).update({
      credits: creditsInt,
      updated_at: new Date().toISOString()
    });

    await logCategoryActivity(id, "CREDIT_UPDATE", {
      previousCredits: parseInt(previousCredits),
      newCredits: creditsInt,
      levelId: null,
      levelName: categoryName
    });

    res.status(200).json({ 
      success: true,
      message: "Category credits updated successfully",
      id,
      previousCredits,
      newCredits: creditsInt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 5. EXAMS
exports.getExams = async (req, res) => {
  try {
    const snapshot = await db.collection('exams').get(); 
    const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===== 6. FIXED: GET CREDIT HISTORY WITH PREVIOUS & NEW CREDITS =====
exports.getCreditHistory = async (req, res) => {
  try {
    const categoriesSnapshot = await db.collection('exam_categories').get();
    let allHistory = [];

    for (const catDoc of categoriesSnapshot.docs) {
      const categoryData = catDoc.data();
      const categoryName = categoryData.category_name || categoryData.name || catDoc.id;

      if (categoryData.creditHistory && Array.isArray(categoryData.creditHistory)) {
        categoryData.creditHistory.forEach(log => {
          let examName = categoryName;
          if (log.levelName && log.levelName !== categoryName) {
            examName = `${categoryName} - ${log.levelName}`;
          }
          
          allHistory.push({
            id: log.logId || `history_${Date.now()}_${Math.random()}`,
            examName: examName,
            previousCredits: log.previousCredits ?? 0,
            newCredits: log.newCredits ?? 0,
            updatedAt: log.updatedAt || new Date().toISOString()
          });
        });
      }
    }

    allHistory.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.status(200).json(allHistory);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 7. CLEAR CREDIT HISTORY
exports.clearCreditHistory = async (req, res) => {
  try {
    const categoriesSnapshot = await db.collection('exam_categories').get();
    let clearedCount = 0;

    for (const catDoc of categoriesSnapshot.docs) {
      const categoryData = catDoc.data();
      if (categoryData.creditHistory && Array.isArray(categoryData.creditHistory) && categoryData.creditHistory.length > 0) {
        await db.collection('exam_categories').doc(catDoc.id).update({
          creditHistory: []
        });
        clearedCount++;
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Cleared credit history from ${clearedCount} categories`,
      clearedCount 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};