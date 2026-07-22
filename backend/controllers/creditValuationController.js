const { db } = require('../config/firebase');
const creditService = require('../services/CreditValuationService');

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

exports.updateLevelCredits = async (req, res) => {
  try {
    const { categoryId, levelId } = req.params;
    const { credits } = req.body;
    const creditsInt = parseInt(credits);

    const levelRef = db.collection(`exam_categories/${categoryId}/levels`).doc(levelId);
    const levelDoc = await levelRef.get();
    if (!levelDoc.exists) return res.status(404).json({ message: "Level not found" });

    const previousCredits = levelDoc.data().credits || 0;
    const levelName = levelDoc.data().level_name || levelDoc.data().name || levelId;

    await levelRef.update({
      credits: creditsInt,
      updated_at: new Date().toISOString()
    });

    await logCategoryActivity(categoryId, "CREDIT_UPDATE", {
      previousCredits: parseInt(previousCredits),
      newCredits: creditsInt,
      levelId,
      levelName
    });

    res.status(200).json({ success: true, categoryId, levelId, previousCredits, newCredits: creditsInt });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCategoryCredits = async (req, res) => {
  try {
    const { id } = req.params;
    const { credits } = req.body;
    const creditsInt = parseInt(credits);

    const catDoc = await db.collection('exam_categories').doc(id).get();
    if (!catDoc.exists) return res.status(404).json({ message: "Category not found" });

    const previousCredits = catDoc.data().credits || 0;
    const categoryName = catDoc.data().category_name || catDoc.data().name || id;

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

    res.status(200).json({ success: true, id, previousCredits, newCredits: creditsInt });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

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
            id: log.logId || `history_${Date.now()}`,
            examName,
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

exports.clearCreditHistory = async (req, res) => {
  try {
    await creditService.clearCreditHistory();
    res.status(200).json({ success: true, message: "Cleared credit history" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};