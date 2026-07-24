const crypto = require('crypto');
const subscriptionService = require('../services/SubscriptionService');
const { db } = require('../config/firebase'); 

// ==========================================
// 🔒 HELPER FUNCTION: PayHere Hash Generator
// ==========================================
function generatePayhereHash(merchantId, orderId, amount, currency, merchantSecret) {
    let hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    let amountFormatted = Number(amount).toFixed(2);
    let mainString = merchantId + orderId + amountFormatted + currency + hashedSecret;
    return crypto.createHash('md5').update(mainString).digest('hex').toUpperCase();
}

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
      console.log("❌ Error: Student ID missing");
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!planId) {
      console.log("❌ Error: Plan ID missing");
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }

    // 1. Subscription Plan එක කියවා ගැනීම
    const planRef = db.collection('subscription_plans').doc(planId);
    const planDoc = await planRef.get();

    if (!planDoc.exists) {
      console.log(`❌ Error: Subscription Plan '${planId}' not found in Firestore`);
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }
    const planData = planDoc.data();

    // 2. ශිෂ්‍යයාගේ (Student) විස්තර කියවීම
    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) {
      console.log(`❌ Error: Student '${studentId}' not found in Firestore`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userData = userDoc.data();

    const orderId = "ORD-" + Date.now();
    const amount = planData.price;
    const currency = "LKR";

    const merchantId = process.env.PAYHERE_MERCHANT_ID || "1226871"; 
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || "MockSecretKey12345"; 
    
    const hash = generatePayhereHash(merchantId, orderId, amount, currency, merchantSecret);

    // 📝 Firestore එකේ 'pending' Transaction එක සේව් කිරීම
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

    // Frontend (React) එකට PayHere SDK එකට අවශ්‍ය Data Return කිරීම
    return res.status(200).json({
      success: true,
      payhereData: {
        sandbox: true, 
        merchant_id: merchantId,
        return_url: 'http://localhost:5173/payment-success',
        cancel_url: 'http://localhost:5173/student/subscription',
        notify_url: 'https://slit-wound-wince.ngrok-free.dev/api/subscription-management/payhere-notify', 
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
    
    // 1. .env එකෙන් Merchant Secret එක ගැනීම
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || "MockSecretKey12345";
    
    // 2. Secret එක MD5 Hash කර Uppercase කිරීම
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();

    // 3. Amount එක Decimal ස්ථාන 2කට Format කිරීම
    const formattedAmount = Number(payhere_amount || 0).toFixed(2);

    // 4. Final Verification Hash එක සැකසීම
    const localMd5sig = crypto.createHash('md5')
      .update(merchant_id + order_id + formattedAmount + payhere_currency + status_code + hashedSecret)
      .digest('hex')
      .toUpperCase();

    // 🔍 EXACT DEBUG LOGS
    console.log("----------------------------------------");
    console.log("👉 Webhook Notification Received");
    console.log("👉 Received MD5sig :", `'${md5sig}'`);
    console.log("👉 Local MD5sig    :", `'${localMd5sig}'`);
    console.log("👉 Hash Match      :", localMd5sig === md5sig);
    console.log("----------------------------------------");

    if (localMd5sig === md5sig && status_code === "2") {
      const transactionRef = db.collection('transactions').doc(order_id);
      const txnDoc = await transactionRef.get();

      if (txnDoc.exists && txnDoc.data()?.status === 'pending') {
        const txnData = txnDoc.data() || {};
        const studentId = txnData.student_id;

        // 🛠️ FIX: Transaction status එක 'completed' කිරීම සහ Actual PayHere Amount එක Save කිරීම
        await transactionRef.update({ 
          status: 'completed', 
          amount_paid: Number(payhere_amount),
          currency: payhere_currency,
          payhere_payment_id: req.body.payment_id || null,
          updated_at: new Date().toISOString() 
        });

        if (studentId) {
          // Student Wallet & Subscription Update කිරීම
          const userRef = db.collection('users').doc(studentId);
          const userDoc = await userRef.get();

          if (userDoc.exists) {
            const userData = userDoc.data() || {};
            const currentBalance = userData.wallet_balance || 0;
            const newBalance = currentBalance + (txnData.credits_added || 0);

            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);

            await userRef.update({
              wallet_balance: newBalance,
              subscription: {
                plan_id: txnData.plan_id || 'default_plan',
                plan_name: txnData.plan_name || 'Standard Plan',
                status: 'active',
                expires_at: expiryDate.toISOString()
              }
            });

            console.log(`✅ Success! Updated Firestore for Student: ${studentId}`);
          }
        }
      }
    }

    return res.status(200).send("Notification Processed");

  } catch (error) {
    console.error("PayHere Webhook Notification Error:", error);
    return res.status(500).send(error.message);
  }
};

// ==========================================
// 4. EXAM CATEGORY CONTROLLER
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