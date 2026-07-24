const { db } = require('../config/firebase');

class CreditValuationService {
  async getAllCategories() {
    try {
      const snapshot = await db.collection('exam_categories').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error fetching categories: ${error.message}`);
    }
  }

  async updateCategoryCreditsDirect(id, data) {
    try {
      const docRef = db.collection('exam_categories').doc(id);
      await docRef.update({
        credits: data.credits,
        updatedAt: new Date().toISOString()
      });
      return { id, ...data };
    } catch (error) {
      throw new Error(`Error updating category credits: ${error.message}`);
    }
  }

  async updateCategoryCredits(categoryId, levelId, data) {
    try {
      const levelRef = db.collection(`exam_categories/${categoryId}/levels`).doc(levelId);
      await levelRef.update({
        credits: data.credits,
        updatedAt: new Date().toISOString()
      });
      return { categoryId, levelId, ...data };
    } catch (error) {
      throw new Error(`Error updating level credits: ${error.message}`);
    }
  }

  async getCreditHistory() {
    try {
      const snapshot = await db.collection('exam_categories').get();
      let allHistory = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.creditHistory && Array.isArray(data.creditHistory)) {
          allHistory = allHistory.concat(data.creditHistory);
        }
      });
      return allHistory;
    } catch (error) {
      throw new Error(`Error fetching credit history: ${error.message}`);
    }
  }

  async clearCreditHistory() {
    try {
      const snapshot = await db.collection('exam_categories').get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        const docRef = db.collection('exam_categories').doc(doc.id);
        batch.update(docRef, { creditHistory: [] });
      });
      await batch.commit();
      return { success: true };
    } catch (error) {
      throw new Error(`Error clearing credit history: ${error.message}`);
    }
  }
}

module.exports = new CreditValuationService();