const { db } = require('../config/firebase');
const admin = require('firebase-admin'); // arrayUnion පාවිච්චි කිරීමට admin import කරගන්න
const subscriptionService = require('../services/SubscriptionService');

// Helper function එකක් - Activity එකක් category document එක ඇතුළේ ලොග් කිරීමට
const logCategoryActivity = async (id, actionType, logDetails) => {
  const newHistoryLog = {
    logId: db.collection('exam_categories').doc().id, // unique ID එකක්
    action: actionType, // "CREDIT_UPDATE" | "STATUS_CHANGE" | "DELETED"
    ...logDetails,
    updatedAt: new Date().toISOString()
  };

  await db.collection('exam_categories').doc(id).update({
    creditHistory: admin.firestore.FieldValue.arrayUnion(newHistoryLog) // පැරණි array නමම පාවිච්චි කළා frontend එක බිඳෙන්නේ නැති වෙන්න
  });
};

// ==========================================
// 1. SUBSCRIPTION PLANS CONTROLLER
// ==========================================
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

// ==========================================
// 2. EXAM CATEGORY CONTROLLER
// ==========================================
exports.getCategories = async (req, res) => {
  try {
    const snapshot = await db.collection('exam_categories').get();
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(categories);
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

// Category එක Update කරද්දී (උදා: Active/Inactive status එක වෙනස් කරද්දී)
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // කලින් තිබූ තොරතුරු ගන්නවා
    const catDoc = await db.collection('exam_categories').doc(id).get();
    if (!catDoc.exists) {
      return res.status(404).json({ message: "Category not found" });
    }
    const oldData = catDoc.data();

    // Update එක සිදු කරනවා
    await subscriptionService.updateExistingCategory(id, req.body);

    // Status එක වෙනස් වෙලා නම් ඒක log එකක් විදිහට සේව් කරනවා
    if (req.body.active !== undefined && oldData.active !== req.body.active) {
      await logCategoryActivity(id, "STATUS_CHANGE", {
        previousState: oldData.active ? "Active" : "Inactive",
        newState: req.body.active ? "Active" : "Inactive",
        previousCredits: oldData.credits || 0,
        newCredits: oldData.credits || 0
      });
    }

    res.status(200).json({ message: "Category updated successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Category update error", error: error.message });
  }
};

// Category එක Soft-Delete කරද්දී
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const catDoc = await db.collection('exam_categories').doc(id).get();
    if (!catDoc.exists) {
      return res.status(404).json({ message: "Category not found" });
    }
    const oldData = catDoc.data();

    // 1. Database එකෙන් මකන්නේ නැතුව Soft-Delete (status: 'deleted' / active: false) කරනවා
    await db.collection('exam_categories').doc(id).update({
      status: 'deleted',
      active: false
    });

    // 2. Delete කළ බවට history එකට එකතු කරනවා
    await logCategoryActivity(id, "DELETED", {
      previousState: oldData.active ? "Active" : "Inactive",
      newState: "Deleted",
      previousCredits: oldData.credits || 0,
      newCredits: 0
    });

    res.status(200).json({ message: "Category deleted successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Category deletion error", error: error.message });
  }
};

exports.getExams = async (req, res) => {
  try {
    const snapshot = await db.collection('exams').get(); 
    const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(exams);
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ error: error.message });
  }
};

// Credits කෙලින්ම වෙනස් කළ විට
exports.updateCategoryCredits = async (req, res) => {
  try {
    const { id } = req.params; 
    const { credits } = req.body; 

    const catDoc = await db.collection('exam_categories').doc(id).get();
    if (!catDoc.exists) {
      return res.status(404).json({ message: "Category not found" });
    }
    const previousCredits = catDoc.data().credits || 0;

    // 1. Credits update කිරීම
    await db.collection('exam_categories').doc(id).update({
      credits: parseInt(credits) 
    });

    // 2. History ලොග් කිරීම
    await logCategoryActivity(id, "CREDIT_UPDATE", {
      previousCredits: parseInt(previousCredits),
      newCredits: parseInt(credits),
      previousState: catDoc.data().active ? "Active" : "Inactive",
      newState: catDoc.data().active ? "Active" : "Inactive"
    });

    res.status(200).json({ message: "Credits updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// සියලුම ඉතිහාස දත්ත (Credit updates, Status changes, Deletions) එකට එකතු කර ලබාදීම
exports.getCreditHistory = async (req, res) => {
  try {
    const snapshot = await db.collection('exam_categories').get();
    let allHistory = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.creditHistory && Array.isArray(data.creditHistory)) {
        data.creditHistory.forEach(log => {
          allHistory.push({
            id: log.logId,
            categoryId: doc.id,
            categoryName: data.name || "Unknown Exam",
            action: log.action || "CREDIT_UPDATE", // Default type
            previousCredits: log.previousCredits,
            newCredits: log.newCredits,
            previousState: log.previousState || "N/A",
            newState: log.newState || "N/A",
            updatedAt: log.updatedAt
          });
        });
      }
    });

    // අලුත්ම දත්ත උඩට එන ලෙස sort කිරීම
    allHistory.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.status(200).json(allHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};