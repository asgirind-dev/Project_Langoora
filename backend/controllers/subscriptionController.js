const { db } = require('../config/firebase');

const COLLECTION = 'subscriptions';

// Get all active plans
const getPlans = async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION).where('isActive', '==', true).get();
    const plans = [];
    snapshot.forEach(doc => {
      plans.push({ id: doc.id, ...doc.data() });
    });
    res.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create plan
const createPlan = async (req, res) => {
  try {
    const { name, price, credits, features, popular, color, icon } = req.body;

    if (!name || !price || !credits) {
      return res.status(400).json({ error: 'Name, price and credits are required' });
    }

    const planData = {
      name,
      price: parseFloat(price),
      credits: parseInt(credits),
      features: features || [],
      popular: popular || false,
      color: color || 'from-purple-400 to-pink-500',
      icon: icon || 'Rocket',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection(COLLECTION).add(planData);
    const newPlan = { id: docRef.id, ...planData };

    res.status(201).json({ success: true, plan: newPlan });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update plan
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, credits, features, popular, color, icon, isActive } = req.body;

    const updateData = {
      ...(name && { name }),
      ...(price && { price: parseFloat(price) }),
      ...(credits && { credits: parseInt(credits) }),
      ...(features && { features }),
      ...(popular !== undefined && { popular }),
      ...(color && { color }),
      ...(icon && { icon }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date().toISOString()
    };

    await db.collection(COLLECTION).doc(id).update(updateData);
    const doc = await db.collection(COLLECTION).doc(id).get();
    res.json({ success: true, plan: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete plan
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection(COLLECTION).doc(id).delete();
    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Toggle plan status
const togglePlanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const currentStatus = doc.data().isActive;
    const newStatus = !currentStatus;
    
    await db.collection(COLLECTION).doc(id).update({
      isActive: newStatus,
      updatedAt: new Date().toISOString()
    });

    const updatedDoc = await db.collection(COLLECTION).doc(id).get();
    res.json({ success: true, isActive: newStatus, plan: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    console.error('Toggle plan error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus
};