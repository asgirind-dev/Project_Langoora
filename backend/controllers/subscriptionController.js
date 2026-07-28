// backend/controllers/subscriptionController.js
const crypto = require('crypto');
const subscriptionService = require('../services/SubscriptionService');
const { db } = require('../config/firebase');

// ✅ ADD: Audit Log Service
const auditLogService = require('../services/auditLogService');

// ✅ Helper for non-blocking audit logging
const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

// 🟢 1. Services Import (Capitalization matched with file names)
const emailService = require('../services/emailService');
const notificationService = require('../services/NotificationService');

// ==========================================
// 🔒 HELPER FUNCTION: PayHere Hash Generator
// ==========================================
function generatePayhereHash(merchantId, orderId, amount, currency, merchantSecret) {
  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const amountFormatted = Number(amount).toFixed(2);
  const mainString = merchantId + orderId + amountFormatted + currency + hashedSecret;
  return crypto.createHash('md5').update(mainString).digest('hex').toUpperCase();
}

// ==========================================
// 1. SUBSCRIPTION PLANS CONTROLLER
// ==========================================

// GET PLANS (NO AUDIT - READ ONLY)
exports.getPlans = async (req, res) => {
  try {
    const plans = await subscriptionService.getAllPlans();
    const activePlans = plans.filter(plan => plan.active === true);
    return res.status(200).json(activePlans);
  } catch (error) {
    return res.status(500).json({ message: "Plans fetch error", error: error.message });
  }
};

// CREATE PLAN - WITH AUDIT LOG
exports.createPlan = async (req, res) => {
  try {
    if (!req.body.name || req.body.price === undefined) {
      return res.status(400).json({ message: "Name and Price are required" });
    }
    const newPlan = await subscriptionService.createNewPlan(req.body);

    // ✅ FINANCIAL AUDIT LOG - PLAN CREATED
    logAudit(auditLogService.logFinancial, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'subscription',
      entityType: 'plan',
      entityId: newPlan.id,
      amount: newPlan.price || 0,
      credits: newPlan.credits || 0,
      status: 'created',
      paymentMethod: 'N/A',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(201).json(newPlan);
  } catch (error) {
    return res.status(500).json({ message: "Plan creation error", error: error.message });
  }
};

// UPDATE PLAN - WITH AUDIT LOG
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Get old plan data before update
    const oldPlanDoc = await db.collection('subscription_plans').doc(id).get();
    const oldPlanData = oldPlanDoc.exists ? oldPlanDoc.data() : null;

    await subscriptionService.updateExistingPlan(id, req.body);

    // ✅ FINANCIAL AUDIT LOG - PLAN UPDATED
    const changes = {};
    const fieldsToTrack = ['name', 'price', 'credits', 'features', 'popular', 'active'];
    fieldsToTrack.forEach(field => {
      if (oldPlanData && oldPlanData[field] !== req.body[field]) {
        changes[field] = { old: oldPlanData[field], new: req.body[field] };
      }
    });

    logAudit(auditLogService.logFinancial, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'subscription',
      entityType: 'plan',
      entityId: id,
      changes: changes,
      status: 'updated',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({ message: "Plan updated successfully", id });
  } catch (error) {
    return res.status(500).json({ message: "Plan update error", error: error.message });
  }
};

// DELETE PLAN - WITH AUDIT LOG
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Get plan data before deletion
    const planDoc = await db.collection('subscription_plans').doc(id).get();
    const planData = planDoc.exists ? planDoc.data() : null;

    await subscriptionService.deleteExistingPlan(id);

    // ✅ FINANCIAL AUDIT LOG - PLAN DELETED
    logAudit(auditLogService.logFinancial, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'subscription',
      entityType: 'plan',
      entityId: id,
      entityName: planData?.name || id,
      status: 'deleted',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({ message: "Plan deleted successfully", id });
  } catch (error) {
    return res.status(500).json({ message: "Plan deletion error", error: error.message });
  }
};

// ==========================================
// 2. 💳 WALLET UPGRADE & CHARGE LOGIC (PAYHERE INITIATION)
// ==========================================
exports.upgradeSubscription = async (req, res) => {
  try {
    const studentId = req.user?.uid || req.user?.id || req.body.studentId; 
    const { planId, useSavedBank } = req.body; 

    console.log("----------------------------------------");
    console.log("👉 Upgrade Request Received");
    console.log("👉 Student ID:", studentId);
    console.log("👉 Plan ID:", planId);
    console.log("----------------------------------------");

    if (!studentId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }

    // 1. Fetch Subscription Plan
    const planRef = db.collection('subscription_plans').doc(planId);
    const planDoc = await planRef.get();

    if (!planDoc.exists) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }
    const planData = planDoc.data();

    // 2. Fetch Student Details
    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userData = userDoc.data();

    const orderId = "ORD-" + Date.now();
    const amount = planData.price;
    const currency = "LKR";

    const merchantId = process.env.PAYHERE_MERCHANT_ID || "1226871"; 
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || "MockSecretKey12345"; 
    
    const hash = generatePayhereHash(merchantId, orderId, amount, currency, merchantSecret);

    // Save pending Transaction in Firestore
    await db.collection('transactions').doc(orderId).set({
      transaction_id: orderId,
      student_id: studentId,
      type: 'subscription_purchase',
      plan_id: planId,
      plan_name: planData.name,
      amount_paid: Number(amount),
      credits_added: planData.credits || 0,
      payment_method: useSavedBank ? 'Bank Account' : 'Card Payment',
      status: 'pending', 
      created_at: new Date().toISOString()
    });

    console.log(`✅ Transaction Created Successfully: ${orderId}`);

    // ✅ FINANCIAL AUDIT LOG - SUBSCRIPTION INITIATED
    logAudit(auditLogService.logFinancial, {
      userId: studentId,
      userEmail: userData?.email || 'unknown',
      actorId: studentId,
      actorEmail: userData?.email || 'unknown',
      action: 'subscription',
      entityType: 'plan',
      entityId: planId,
      entityName: planData.name,
      amount: Number(amount),
      credits: planData.credits || 0,
      status: 'pending',
      paymentMethod: 'PayHere',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({
      success: true,
      payhereData: {
        sandbox: process.env.NODE_ENV !== 'production', 
        merchant_id: merchantId,
        return_url: process.env.PAYHERE_RETURN_URL || 'http://localhost:5173/payment-success',
        cancel_url: process.env.PAYHERE_CANCEL_URL || 'http://localhost:5173/student/subscription',
        notify_url: process.env.PAYHERE_NOTIFY_URL || 'https://slit-wound-wince.ngrok-free.dev/api/subscription-management/payhere-notify', 
        order_id: orderId,
        items: planData.name,
        amount: Number(amount).toFixed(2),
        currency: currency,
        first_name: userData?.name?.split(' ')[0] || 'Student',
        last_name: userData?.name?.split(' ')[1] || 'User',
        email: userData?.email || '',
        phone: userData?.phone || '0771234567',
        address: userData?.city || 'Colombo',
        city: userData?.city || 'Colombo',
        country: 'Sri Lanka',
        hash: hash
      }
    });

  } catch (error) {
    console.error("❌ Subscription Upgrade Error:", error);
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ==========================================
// 🔄 3. HANDLE PAYHERE NOTIFICATION (Webhook Database Updater)
// ==========================================
exports.handlePayhereNotification = async (req, res) => {
  try {
    const merchant_id = req.body.merchant_id?.trim();
    const order_id = req.body.order_id?.trim();
    const payhere_amount = req.body.payhere_amount;
    const payhere_currency = req.body.payhere_currency?.trim();
    const status_code = String(req.body.status_code || '').trim();
    const md5sig = req.body.md5sig?.trim();
    
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || "MockSecretKey12345";
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const formattedAmount = Number(payhere_amount || 0).toFixed(2);

    const localMd5sig = crypto.createHash('md5')
      .update(merchant_id + order_id + formattedAmount + payhere_currency + status_code + hashedSecret)
      .digest('hex')
      .toUpperCase();

    console.log("----------------------------------------");
    console.log("👉 Webhook Notification Received");
    console.log("👉 Received MD5sig :", `'${md5sig}'`);
    console.log("👉 Local MD5sig    :", `'${localMd5sig}'`);
    console.log("👉 Hash Match      :", localMd5sig === md5sig);
    console.log("----------------------------------------");

    // Check signature match and success status code (2 = Success)
    if (localMd5sig === md5sig && status_code === "2") {
      const transactionRef = db.collection('transactions').doc(order_id);

      let studentDetailsForNotify = null;
      let studentId = null;
      let planId = null;
      let planName = null;
      let creditsAdded = 0;
      let amountPaid = 0;

      // Execute transaction to prevent concurrent modification issues
      await db.runTransaction(async (transaction) => {
        const txnDoc = await transaction.get(transactionRef);

        if (!txnDoc.exists) {
          throw new Error(`Transaction ${order_id} not found.`);
        }

        const txnData = txnDoc.data() || {};

        if (txnData.status === 'completed') {
          console.log(`⚠️ Transaction ${order_id} already marked as completed.`);
          return;
        }

        studentId = txnData.student_id;
        planId = txnData.plan_id;
        planName = txnData.plan_name;
        creditsAdded = txnData.credits_added || 0;
        amountPaid = Number(payhere_amount);

        const userRef = db.collection('users').doc(studentId);
        const userDoc = await transaction.get(userRef);

        // 1. Update Transaction Status
        transaction.update(transactionRef, {
          status: 'completed',
          amount_paid: amountPaid,
          currency: payhere_currency,
          payhere_payment_id: req.body.payment_id || null,
          updated_at: new Date().toISOString()
        });

        // 2. Update Student Wallet & Subscription
        if (userDoc.exists) {
          const userData = userDoc.data() || {};
          const currentBalance = userData.wallet_balance || userData.credits || 0;
          const newBalance = currentBalance + creditsAdded;

          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);

          transaction.update(userRef, {
            wallet_balance: newBalance,
            credits: newBalance,
            subscription: {
              plan_id: planId || 'default_plan',
              plan_name: planName || 'Standard Plan',
              status: 'active',
              expires_at: expiryDate.toISOString()
            }
          });

          // Store values required for sending Notification & Email
          studentDetailsForNotify = {
            studentId,
            studentEmail: userData.email,
            studentName: userData.name || userData.displayName || 'Student',
            planName: txnData.plan_name || 'Subscription Plan',
            amount: Number(payhere_amount),
            credits: txnData.credits_added || 0
          };
        }
      });

      console.log(`✅ Success! Updated Firestore for Order: ${order_id}`);

      // 🟢 3. Trigger In-App Notification and Email Confirmation
      if (studentDetailsForNotify) {
        const { studentId, studentEmail, studentName, planName, amount, credits } = studentDetailsForNotify;

        // Send In-App Notification
        try {
          await notificationService.sendToUser(studentId, {
            type: 'subscription',
            title: 'Subscription Activated! 🎉',
            message: `You have successfully purchased the ${planName} plan. ${credits} credits added to your wallet.`,
            link: '/student/credits'
          });
          console.log('✅ In-App Notification sent');
        } catch (notifErr) {
          console.error('❌ Notification Trigger Error:', notifErr.message);
        }

        // Send Email Confirmation
        if (studentEmail) {
          try {
            await emailService.sendSubscriptionConfirmationEmail(
              studentEmail,
              studentName,
              planName,
              amount,
              credits
            );
            console.log('✅ Purchase Confirmation Email sent');
          } catch (emailErr) {
            console.error('❌ Email Trigger Error:', emailErr.message);
          }
        }
      }
      // ✅ FINANCIAL AUDIT LOG - SUBSCRIPTION COMPLETED (Payment Success)
      logAudit(auditLogService.logFinancial, {
        userId: studentId,
        userEmail: req.body?.email || 'unknown',
        actorId: studentId,
        actorEmail: req.body?.email || 'unknown',
        action: 'subscription',
        entityType: 'plan',
        entityId: planId,
        entityName: planName,
        amount: amountPaid,
        credits: creditsAdded,
        status: 'completed',
        paymentMethod: 'PayHere',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
    } else {
      // ✅ LOG: Webhook validation failed
      console.log(`⚠️ Webhook validation failed for Order: ${order_id}`);
      logAudit(auditLogService.logFinancial, {
        userId: 'system',
        userEmail: 'system@langoora.com',
        actorId: 'system',
        actorEmail: 'system@langoora.com',
        action: 'subscription',
        entityType: 'webhook',
        entityId: order_id || 'unknown',
        status: 'failed',
        error: 'Webhook validation failed - invalid signature or status code',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
    }

    return res.status(200).send("Notification Processed");

  } catch (error) {
    console.error("PayHere Webhook Notification Error:", error);

    // ✅ LOG: Webhook processing error
    logAudit(auditLogService.logFinancial, {
      userId: 'system',
      userEmail: 'system@langoora.com',
      actorId: 'system',
      actorEmail: 'system@langoora.com',
      action: 'subscription',
      entityType: 'webhook',
      entityId: req.body?.order_id || 'unknown',
      status: 'failed',
      error: error.message,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(500).send(error.message);
  }
};

// ==========================================
// 4. EXAM CATEGORY CONTROLLER
// ==========================================

// GET CATEGORIES (NO AUDIT - READ ONLY)
exports.getCategories = async (req, res) => {
  try {
    const categories = await subscriptionService.getAllCategories();
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Categories fetch error", error: error.message });
  }
};

// CREATE CATEGORY - WITH AUDIT LOG
exports.createCategory = async (req, res) => {
  try {
    if (!req.body.name || req.body.credits === undefined) {
      return res.status(400).json({ message: "Category Name and Credits are required" });
    }
    const newCategory = await subscriptionService.createNewCategory(req.body);

    // ✅ FINANCIAL AUDIT LOG - CATEGORY CREATED
    logAudit(auditLogService.logFinancial, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'subscription',
      entityType: 'category',
      entityId: newCategory.id,
      entityName: req.body.name,
      credits: req.body.credits || 0,
      status: 'created',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(201).json(newCategory);
  } catch (error) {
    return res.status(500).json({ message: "Category creation error", error: error.message });
  }
};

// UPDATE CATEGORY - WITH AUDIT LOG
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Get old category data before update
    const oldCategoryDoc = await db.collection('exam_categories').doc(id).get();
    const oldCategoryData = oldCategoryDoc.exists ? oldCategoryDoc.data() : null;

    await subscriptionService.updateExistingCategory(id, req.body);

    // ✅ FINANCIAL AUDIT LOG - CATEGORY UPDATED
    const changes = {};
    const fieldsToTrack = ['name', 'credits', 'exams', 'status'];
    fieldsToTrack.forEach(field => {
      if (oldCategoryData && oldCategoryData[field] !== req.body[field]) {
        changes[field] = { old: oldCategoryData[field], new: req.body[field] };
      }
    });

    logAudit(auditLogService.logFinancial, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'subscription',
      entityType: 'category',
      entityId: id,
      entityName: req.body.name || oldCategoryData?.name || id,
      changes: changes,
      status: 'updated',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({ message: "Category updated successfully", id });
  } catch (error) {
    return res.status(500).json({ message: "Category update error", error: error.message });
  }
};

// DELETE CATEGORY - WITH AUDIT LOG
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Get category data before deletion
    const categoryDoc = await db.collection('exam_categories').doc(id).get();
    const categoryData = categoryDoc.exists ? categoryDoc.data() : null;

    await subscriptionService.deleteExistingCategory(id);

    // ✅ FINANCIAL AUDIT LOG - CATEGORY DELETED
    logAudit(auditLogService.logFinancial, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'subscription',
      entityType: 'category',
      entityId: id,
      entityName: categoryData?.name || id,
      status: 'deleted',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({ message: "Category deleted successfully", id });
  } catch (error) {
    return res.status(500).json({ message: "Category deletion error", error: error.message });
  }
};