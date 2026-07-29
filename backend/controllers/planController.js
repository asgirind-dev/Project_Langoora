const planService = require('../services/PlanService');
const auditLogService = require('../services/auditLogService');
const notificationService = require('../services/NotificationService');
const emailServiceInstance = require('../services/emailService');
const { db } = require('../config/firebase');

const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

// 🔔 Helper: Guaranteed Safe In-App Notification Trigger
const triggerInAppNotification = async (target, notifData) => {
  try {
    if (!notificationService) return;
    
    if (Array.isArray(target)) {
      await notificationService.sendToRole(target, notifData);
    } else if (typeof target === 'string') {
      await notificationService.sendToUser(target, notifData);
    }
    console.log('✅ In-App Notification dispatched successfully');
  } catch (err) {
    console.error('❌ In-App Notification Error (Plan):', err.message);
  }
};

// 🔥 Direct Admin Target Email
const getAdminTargetEmail = () => {
  return process.env.ADMIN_EMAIL || 'asgirind186@gmail.com';
};

const validatePlanInput = async (data, currentPlanId = null) => {
  const rawName = data.name !== undefined && data.name !== null ? String(data.name) : '';
  const name = rawName.trim();
  const priceVal = data.price;
  const creditsVal = data.credits;
  const features = data.features;

  const scriptRegex = /<[^>]*>/g;

  if (!rawName) return "Plan name is required.";
  if (rawName.length > 0 && name.length === 0) return "Plan name cannot consist of only blank spaces.";
  if (name.length < 3) return "Plan name must be at least 3 characters.";
  if (name.length > 50) return "Plan name cannot exceed 50 characters.";
  if (scriptRegex.test(name)) return "Invalid characters detected. HTML or script tags are not allowed.";

  const plansSnapshot = await db.collection('subscription_plans').get();
  let isDuplicate = false;
  plansSnapshot.forEach(doc => {
    const plan = doc.data();
    if (doc.id !== currentPlanId && plan.name && plan.name.toLowerCase() === name.toLowerCase()) {
      isDuplicate = true;
    }
  });
  if (isDuplicate) return "A subscription plan with this name already exists.";

  if (priceVal === undefined || priceVal === null || String(priceVal).trim() === '') return "Price is required.";
  const priceStr = String(priceVal).trim();
  const priceNum = Number(priceStr);
  if (isNaN(priceNum)) return "Please enter a valid price.";
  if (priceNum <= 0) return "Price must be greater than 0.";
  if (priceStr.length > 6) return "Price cannot exceed 999999 LKR.";
  if (priceStr.includes('.')) {
    const decimalParts = priceStr.split('.');
    if (decimalParts[1] && decimalParts[1].length > 2) return "Price cannot have more than 2 decimal places.";
  }

  if (creditsVal === undefined || creditsVal === null || String(creditsVal).trim() === '') return "Monthly credits are required.";
  const creditsNum = Number(creditsVal);
  if (isNaN(creditsNum) || !Number.isInteger(creditsNum)) return "Please enter a valid credit amount.";
  if (creditsNum <= 0) return "Credits must be greater than 0.";
  if (String(creditsVal).trim().length > 6 || creditsNum > 999999) return "Monthly credits cannot exceed 999999.";

  if (!features || !Array.isArray(features) || features.length === 0) return "Please add at least one feature.";

  let seenFeatures = [];
  for (let i = 0; i < features.length; i++) {
    const feat = features[i] ? String(features[i]).trim() : '';
    if (!feat) return "Feature cannot be empty.";
    if (feat.length > 100) return "Feature cannot exceed 100 characters.";
    if (seenFeatures.includes(feat.toLowerCase())) return "Duplicate features are not allowed.";
    seenFeatures.push(feat.toLowerCase());
  }

  return null;
};

exports.getPlans = async (req, res) => {
  try {
    const { status, activeOnly } = req.query;
    let plans = status ? await planService.getPlansByStatus(status) : await planService.getAllPlans();
    
    if (activeOnly === 'true') {
      plans = plans.filter(p => Boolean(p.active) === true && p.status === 'approved');
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

// 📋 1. CREATE PLAN (SENDS EMAIL ONLY TO ADMIN)
exports.createPlan = async (req, res) => {
  try {
    const validationError = await validatePlanInput(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const creatorEmail = 'himashikashmira30@gmail.com';

    const planPayload = {
      ...req.body,
      createdByEmail: creatorEmail,
      createdBy: req.user?.uid || 'admin',
      status: 'pending_approval'
    };

    const newPlan = await planService.createNewPlan(planPayload);

    logAudit(auditLogService.logPlanManagement, {
      userId: req.user?.uid || 'system',
      userEmail: creatorEmail,
      actorId: req.user?.uid || 'system',
      actorEmail: creatorEmail,
      action: 'created',
      entityId: newPlan.id,
      entityName: req.body.name,
      changes: req.body,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    triggerInAppNotification(['super_admin', 'finance_admin', 'finance'], {
      type: 'plan_created',
      title: '📋 New Subscription Plan Submitted',
      message: `A new plan "${req.body.name}" has been created and requires review.`,
      actionUrl: '/finance-admin/subscriptions',
      planId: newPlan.id
    });

    const adminEmail = getAdminTargetEmail();
    console.log(`📧 Dispatching New Plan Email ONLY to Admin: ${adminEmail}`);

    if (emailServiceInstance && emailServiceInstance.sendNotificationEmail) {
      emailServiceInstance.sendNotificationEmail(
        adminEmail,
        `📋 New Subscription Plan Submitted: ${req.body.name}`,
        `A new subscription plan "${req.body.name}" (Price: LKR ${req.body.price}, Monthly Credits: ${req.body.credits}) has been created by ${creatorEmail} and is pending your review.`
      ).catch(err => console.error('❌ Admin Plan Creation Email Error:', err.message));
    }

    res.status(201).json(newPlan);
  } catch (error) {
    res.status(500).json({ message: "Plan creation error", error: error.message });
  }
};

// 🔄 2. UPDATE PLAN (SENDS EMAIL ONLY TO ADMIN WHEN RESUBMITTED)
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const oldPlanDoc = await db.collection('subscription_plans').doc(id).get();
    
    if (!oldPlanDoc.exists) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    const oldPlanData = oldPlanDoc.data();

    if (oldPlanData.status === 'approved') {
      const isCoreDetailChanged =
        (req.body.name !== undefined && req.body.name !== oldPlanData.name) ||
        (req.body.price !== undefined && req.body.price !== oldPlanData.price) ||
        (req.body.credits !== undefined && req.body.credits !== oldPlanData.credits) ||
        (req.body.features !== undefined && JSON.stringify(req.body.features) !== JSON.stringify(oldPlanData.features));

      if (isCoreDetailChanged) {
        return res.status(403).json({
          message: "Action forbidden: Approved subscription plans cannot be edited. You can only change their active/inactive status."
        });
      }
    } else {
      const isOnlyStatusChange = Object.keys(req.body).every(key => key === 'active' || key === 'status');
      if (!isOnlyStatusChange) {
        const validationError = await validatePlanInput(req.body, id);
        if (validationError) {
          return res.status(400).json({ message: validationError });
        }
      }
    }

    const updatePayload = {
      ...req.body,
      status: oldPlanData.status === 'rejected' ? 'pending_approval' : (req.body.status || oldPlanData.status),
      updatedAt: new Date().toISOString()
    };

    const result = await planService.updateExistingPlan(id, updatePayload);

    const adminEmail = getAdminTargetEmail();
    const planName = req.body.name || oldPlanData.name;

    triggerInAppNotification(['super_admin', 'finance_admin', 'finance'], {
      type: 'plan_updated',
      title: '🔄 Subscription Plan Updated',
      message: `Subscription plan "${planName}" was updated and resubmitted for review.`,
      actionUrl: '/finance-admin/subscriptions',
      planId: id
    });

    console.log(`📧 Dispatching Updated Plan Email ONLY to Admin: ${adminEmail}`);
    if (emailServiceInstance && emailServiceInstance.sendNotificationEmail) {
      emailServiceInstance.sendNotificationEmail(
        adminEmail,
        `🔄 Subscription Plan Resubmitted for Review: ${planName}`,
        `The subscription plan "${planName}" was updated and resubmitted for review. Please check the Finance Admin portal to review and approve/reject.`
      ).catch(err => console.error('❌ Admin Plan Update Email Error:', err.message));
    }

    res.status(200).json({ message: "Plan updated successfully", data: result });
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

// ✅ 3. APPROVE PLAN (SENDS EMAIL ONLY TO HIMI)
exports.approvePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const planDoc = await db.collection('subscription_plans').doc(id).get();
    const planData = planDoc.exists ? planDoc.data() : null;

    const result = await planService.approvePlan(id, notes);

    const planName = planData?.name || id;
    const creatorUserId = planData?.createdBy || planData?.created_by || planData?.userId;

    triggerInAppNotification(['super_admin', 'finance_admin', 'finance'], {
      type: 'plan_approved',
      title: '🎉 Subscription Plan Approved',
      message: `Subscription plan "${planName}" was approved by ${req.user?.email || 'Admin'}.`,
      actionUrl: '/finance-admin/subscriptions',
      planId: id
    });

    if (creatorUserId) {
      triggerInAppNotification(creatorUserId, {
        type: 'plan_approved',
        title: '🎉 Subscription Plan Approved!',
        message: `Your subscription plan "${planName}" has been approved by the Admin.`,
        actionUrl: '/finance-admin/subscriptions',
        planId: id
      });
    }

    const targetEmail = 'himashikashmira30@gmail.com';
    
    console.log(`📧 Dispatching Plan Approval Email ONLY to: ${targetEmail}`);
    if (emailServiceInstance && emailServiceInstance.sendPlanStatusEmail) {
      emailServiceInstance.sendPlanStatusEmail(targetEmail, planName, 'approved', notes)
        .catch(err => console.error('❌ Plan approval email dispatch error:', err));
    }

    res.status(200).json({ message: "Plan approved successfully", data: result });
  } catch (error) {
    res.status(500).json({ message: "Plan approval error", error: error.message });
  }
};

// ❌ 4. REJECT PLAN (SENDS EMAIL ONLY TO HIMI)
exports.rejectPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const planDoc = await db.collection('subscription_plans').doc(id).get();
    const planData = planDoc.exists ? planDoc.data() : null;

    const result = await planService.rejectPlan(id, notes);

    const planName = planData?.name || id;
    const creatorUserId = planData?.createdBy || planData?.created_by || planData?.userId;

    triggerInAppNotification(['super_admin', 'finance_admin', 'finance'], {
      type: 'plan_rejected',
      title: '⚠️ Subscription Plan Rejected',
      message: `Subscription plan "${planName}" was rejected by ${req.user?.email || 'Admin'}. Reason: ${notes || 'None'}`,
      actionUrl: '/finance-admin/subscriptions',
      planId: id
    });

    if (creatorUserId) {
      triggerInAppNotification(creatorUserId, {
        type: 'plan_rejected',
        title: '⚠️ Subscription Plan Rejected',
        message: `Your subscription plan "${planName}" was rejected. Reason: ${notes || 'Not specified'}`,
        actionUrl: '/finance-admin/subscriptions',
        planId: id
      });
    }

    const targetEmail = 'himashikashmira30@gmail.com';
    
    console.log(`📧 Dispatching Plan Rejection Email ONLY to: ${targetEmail}`);
    if (emailServiceInstance && emailServiceInstance.sendPlanStatusEmail) {
      emailServiceInstance.sendPlanStatusEmail(targetEmail, planName, 'rejected', notes)
        .catch(err => console.error('❌ Plan rejection email dispatch error:', err));
    }

    res.status(200).json({ message: "Plan rejected successfully", data: result });
  } catch (error) {
    res.status(500).json({ message: "Plan rejection error", error: error.message });
  }
};