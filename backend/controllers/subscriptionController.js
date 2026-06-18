const subscriptionService = require('../services/SubscriptionService');

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
    const categories = await subscriptionService.getAllCategories();
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


exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await subscriptionService.updateExistingCategory(id, req.body);
    res.status(200).json({ message: "Category updated successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Category update error", error: error.message });
  }
};


exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await subscriptionService.deleteExistingCategory(id);
    res.status(200).json({ message: "Category deleted successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Category deletion error", error: error.message });
  }
};