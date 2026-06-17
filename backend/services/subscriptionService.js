const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

class SubscriptionService {
  // ==========================================
  // PLANS METHODS
  // ==========================================
  async getAllPlans() {
    const snapshot = await db.collection('subscription_plans').get();
    const plans = [];
    snapshot.forEach(doc => plans.push({ id: doc.id, ...doc.data() }));
    return plans;
  }

  async createNewPlan(planData) {
    const newPlan = {
      name: planData.name,
      price: parseInt(planData.price),
      credits: parseInt(planData.credits),
      features: planData.features || [],
      popular: planData.popular || false,
      active: true,
      icon: 'Rocket',
      bg: 'bg-purple-500/10',
      color: 'from-purple-400 to-pink-500',
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('subscription_plans').add(newPlan);
    return { id: docRef.id, ...newPlan };
  }

 
  async updateExistingPlan(id, planData) {
    const updateData = {};
    if (planData.name !== undefined) updateData.name = planData.name;
    if (planData.price !== undefined) updateData.price = parseInt(planData.price);
    if (planData.credits !== undefined) updateData.credits = parseInt(planData.credits);
    if (planData.features !== undefined) updateData.features = planData.features;
    if (planData.popular !== undefined) updateData.popular = planData.popular;
    if (planData.active !== undefined) updateData.active = planData.active;

    return await db.collection('subscription_plans').doc(id).update(updateData);
  }

  async deleteExistingPlan(id) {
    return await db.collection('subscription_plans').doc(id).delete();
  }

  // ==========================================
  // CATEGORY METHODS
  // ==========================================
  async getAllCategories() {
    const snapshot = await db.collection('exam_categories').get();
    const categories = [];
    snapshot.forEach(doc => categories.push({ id: doc.id, ...doc.data() }));
    return categories;
  }

  async createNewCategory(catData) {
    const newCategory = {
      name: catData.name,
      credits: parseInt(catData.credits),
      exams: parseInt(catData.exams) || 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('exam_categories').add(newCategory);
    return { id: docRef.id, ...newCategory };
  }

  
  async updateExistingCategory(id, catData) {
    const updateData = {};
    if (catData.name !== undefined) updateData.name = catData.name;
    if (catData.credits !== undefined) updateData.credits = parseInt(catData.credits);
    if (catData.exams !== undefined) updateData.exams = parseInt(catData.exams);
    if (catData.status !== undefined) updateData.status = catData.status;

    return await db.collection('exam_categories').doc(id).update(updateData);
  }

  
  async deleteExistingCategory(id) {
    return await db.collection('exam_categories').doc(id).delete();
  }
}

module.exports = new SubscriptionService();