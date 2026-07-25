// backend/controllers/planController.js
const planService = require('../services/PlanService');

exports.getPlans = async (req, res) => {
  try {
    const { status } = req.query;
    let plans;
    if (status) {
      plans = await planService.getPlansByStatus(status);
    } else {
      plans = await planService.getAllPlans();
    }
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: "Plans fetch error", error: error.message });
  }
};

exports.getPlansByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const plans = await planService.getPlansByStatus(status);
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: "Plans fetch error", error: error.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    if (!req.body.name || req.body.price === undefined) {
      return res.status(400).json({ message: "Name and Price are required" });
    }
    const newPlan = await planService.createNewPlan(req.body);
    res.status(201).json(newPlan);
  } catch (error) {
    res.status(500).json({ message: "Plan creation error", error: error.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await planService.updateExistingPlan(id, req.body);
    res.status(200).json({
      message: "Plan updated successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ message: "Plan update error", error: error.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    await planService.deleteExistingPlan(id);
    res.status(200).json({ message: "Plan deleted successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Plan deletion error", error: error.message });
  }
};

exports.approvePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const result = await planService.approvePlan(id, notes);
    res.status(200).json({
      message: "Plan approved successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ message: "Plan approval error", error: error.message });
  }
};

exports.rejectPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const result = await planService.rejectPlan(id, notes);
    res.status(200).json({
      message: "Plan rejected successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ message: "Plan rejection error", error: error.message });
  }
};