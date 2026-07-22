const { db } = require('../config/firebase');

class PlanService {
  async getAllPlans() {
    try {
      const snapshot = await db.collection('subscription_plans').get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          popular: data.popular === true || data.popular === 'true',
          active: data.active !== undefined ? (data.active === true || data.active === 'true') : true
        };
      });
    } catch (error) {
      throw new Error(`Error fetching plans: ${error.message}`);
    }
  }

  async createNewPlan(planData) {
    try {
      const payload = {
        ...planData,
        popular: planData.popular === true || planData.popular === 'true',
        active: planData.active !== undefined ? (planData.active === true || planData.active === 'true') : true,
        createdAt: new Date().toISOString()
      };
      const docRef = await db.collection('subscription_plans').add(payload);
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Error creating plan: ${error.message}`);
    }
  }

  async updateExistingPlan(id, planData) {
    try {
      const docRef = db.collection('subscription_plans').doc(id);
      const updatePayload = { ...planData, updatedAt: new Date().toISOString() };

      if (planData.popular !== undefined) updatePayload.popular = planData.popular === true || planData.popular === 'true';
      if (planData.active !== undefined) updatePayload.active = planData.active === true || planData.active === 'true';

      await docRef.update(updatePayload);
      return { id, ...updatePayload };
    } catch (error) {
      throw new Error(`Error updating plan: ${error.message}`);
    }
  }

  async deleteExistingPlan(id) {
    try {
      await db.collection('subscription_plans').doc(id).delete();
      return { id };
    } catch (error) {
      throw new Error(`Error deleting plan: ${error.message}`);
    }
  }
}

module.exports = new PlanService();