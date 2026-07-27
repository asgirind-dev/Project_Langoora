// backend/controllers/planController.js
const planService = require('../services/PlanService');

// ✅ ADD: Audit Log Service
const auditLogService = require('../services/auditLogService');

// ✅ Helper for non-blocking audit logging
const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

// =========================================================================
// GET PLANS (NO AUDIT - READ ONLY)
// =========================================================================
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

// =========================================================================
// GET PLANS BY STATUS (NO AUDIT - READ ONLY)
// =========================================================================
exports.getPlansByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const plans = await planService.getPlansByStatus(status);
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: "Plans fetch error", error: error.message });
  }
};

// =========================================================================
// CREATE PLAN - WITH AUDIT LOG
// =========================================================================
exports.createPlan = async (req, res) => {
  try {
    if (!req.body.name || req.body.price === undefined) {
      return res.status(400).json({ message: "Name and Price are required" });
    }
    const newPlan = await planService.createNewPlan(req.body);

    // ✅ PLAN MANAGEMENT AUDIT LOG - CREATED
    logAudit(auditLogService.logPlanManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'created',
      entityId: newPlan.id,
      entityName: req.body.name,
      changes: req.body,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    res.status(201).json(newPlan);
  } catch (error) {
    res.status(500).json({ message: "Plan creation error", error: error.message });
  }
};

// =========================================================================
// UPDATE PLAN - WITH AUDIT LOG
// =========================================================================
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Get old plan data before update
    const db = require('../config/firebase').db;
    const oldPlanDoc = await db.collection('subscription_plans').doc(id).get();
    const oldPlanData = oldPlanDoc.exists ? oldPlanDoc.data() : null;

    const result = await planService.updateExistingPlan(id, req.body);

    // ✅ PLAN MANAGEMENT AUDIT LOG - UPDATED
    const changes = {};
    const fieldsToTrack = ['name', 'price', 'credits', 'features', 'popular', 'active', 'sortOrder'];
    fieldsToTrack.forEach(field => {
      if (oldPlanData && oldPlanData[field] !== req.body[field] && req.body[field] !== undefined) {
        changes[field] = { old: oldPlanData[field], new: req.body[field] };
      }
    });

    logAudit(auditLogService.logPlanManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'updated',
      entityId: id,
      entityName: req.body.name || oldPlanData?.name || id,
      changes: changes,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    res.status(200).json({
      message: "Plan updated successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ message: "Plan update error", error: error.message });
  }
};

// =========================================================================
// DELETE PLAN - WITH AUDIT LOG
// =========================================================================
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Get plan data before deletion
    const db = require('../config/firebase').db;
    const planDoc = await db.collection('subscription_plans').doc(id).get();
    const planData = planDoc.exists ? planDoc.data() : null;

    await planService.deleteExistingPlan(id);

    // ✅ PLAN MANAGEMENT AUDIT LOG - DELETED
    logAudit(auditLogService.logPlanManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'deleted',
      entityId: id,
      entityName: planData?.name || id,
      changes: { deleted_plan: planData },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    res.status(200).json({ message: "Plan deleted successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Plan deletion error", error: error.message });
  }
};

// =========================================================================
// APPROVE PLAN - WITH AUDIT LOG
// =========================================================================
exports.approvePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Get plan data before approval
    const db = require('../config/firebase').db;
    const planDoc = await db.collection('subscription_plans').doc(id).get();
    const planData = planDoc.exists ? planDoc.data() : null;

    const result = await planService.approvePlan(id, notes);

    // ✅ PLAN MANAGEMENT AUDIT LOG - APPROVED
    logAudit(auditLogService.logPlanManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'approved',
      entityId: id,
      entityName: planData?.name || id,
      changes: { notes: notes || 'No notes', status: 'approved' },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    res.status(200).json({
      message: "Plan approved successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ message: "Plan approval error", error: error.message });
  }
};

// =========================================================================
// REJECT PLAN - WITH AUDIT LOG
// =========================================================================
exports.rejectPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Get plan data before rejection
    const db = require('../config/firebase').db;
    const planDoc = await db.collection('subscription_plans').doc(id).get();
    const planData = planDoc.exists ? planDoc.data() : null;

    const result = await planService.rejectPlan(id, notes);

    // ✅ PLAN MANAGEMENT AUDIT LOG - REJECTED
    logAudit(auditLogService.logPlanManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'rejected',
      entityId: id,
      entityName: planData?.name || id,
      changes: { notes: notes || 'No notes', status: 'rejected' },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    res.status(200).json({
      message: "Plan rejected successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ message: "Plan rejection error", error: error.message });
  }
};