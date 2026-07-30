const { db } = require('../config/firebase');

// ==========================================
// HELPER 1: Credits Pool & Categories Count
// ==========================================
const getCategoriesAndCreditsPool = async () => {
  try {
    const catsSnapshot = await db.collection('exam_categories')
      .where('status', '!=', 'deleted')
      .get();
    
    const totalCategories = catsSnapshot.size;
    let totalCreditsPool = 0;

    for (const catDoc of catsSnapshot.docs) {
      const catData = catDoc.data();
      const catId = catDoc.id;

      const levelsSnapshot = await db.collection(`exam_categories/${catId}/levels`).get();

      if (!levelsSnapshot.empty) {
        levelsSnapshot.forEach(levelDoc => {
          const levelData = levelDoc.data();
          if (levelData.status !== 'deleted') {
            const cost = Number(
              levelData.credit_cost !== undefined ? levelData.credit_cost : (levelData.credits || 0)
            );
            totalCreditsPool += cost;
          }
        });
      } else {
        if (catData.status !== 'deleted') {
          const cost = Number(
            catData.credit_cost !== undefined ? catData.credit_cost : (catData.credits || 0)
          );
          totalCreditsPool += cost;
        }
      }
    }

    return { totalCategories, totalCreditsPool };

  } catch (error) {
    console.error("Error calculating credits pool & categories:", error);
    return { totalCategories: 0, totalCreditsPool: 0 };
  }
};

// ==========================================
// HELPER 2: Subscription Plans Metrics
// ==========================================
const getSubscriptionPlansMetrics = async () => {
  try {
    const snapshot = await db.collection('subscription_plans').get();
    const totalPlans = snapshot.size;
    let activePlans = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const isActive = data.active === true || data.active === 'true' || data.status === 'approved' || data.status === 'active';
      if (isActive) activePlans += 1;
    });

    return { totalPlans, activePlans };
  } catch (error) {
    console.error("Error fetching subscription plans metrics:", error);
    return { totalPlans: 0, activePlans: 0 };
  }
};

// ==========================================
// HELPER 3: Active Users Count
// ==========================================
const fetchActiveUsersCount = async () => {
  try {
    const snapshot = await db.collection('users')
      .where('status', '==', 'active')
      .get();
      
    return snapshot.size;
  } catch (error) {
    console.warn("Count aggregation failed:", error.message);
    return 0;
  }
};

// ==========================================
// 1. GET DASHBOARD STATS
// ==========================================
exports.getFinanceStats = async (req, res) => {
  try {
    let totalRevenue = 0;
    let currentMonthRevenue = 0;
    let prevMonthRevenue = 0;
    let successfulTxCount = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const startCurrent = new Date(currentYear, currentMonth, 1);
    const startPrev = new Date(prevYear, prevMonth, 1);
    const endPrev = new Date(prevYear, prevMonth + 1, 1);

    const [txSnapshot, examCategoryMetrics, activeUsers, plansMetrics] = await Promise.all([
      db.collection('transactions').get(),
      getCategoriesAndCreditsPool(),
      fetchActiveUsersCount(),
      getSubscriptionPlansMetrics()
    ]);

    const totalTxCount = txSnapshot.size;

    txSnapshot.forEach(doc => {
      const data = doc.data();
      const statusFormatted = String(data.status || '').toLowerCase().trim();
      
      if (statusFormatted === 'success' || statusFormatted === 'completed') {
        const amt = Number(data.amount_paid !== undefined ? data.amount_paid : (data.amount || 0));
        totalRevenue += amt;
        successfulTxCount += 1;

        if (data.created_at) {
          const date = data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at);
          if (!isNaN(date.getTime())) {
            if (date >= startCurrent) currentMonthRevenue += amt;
            else if (date >= startPrev && date < endPrev) prevMonthRevenue += amt;
          }
        }
      }
    });

    const avgTransaction = successfulTxCount > 0 ? Math.round(totalRevenue / successfulTxCount) : 0;

    let growth = 0;
    if (prevMonthRevenue > 0) {
      growth = ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;
    } else if (currentMonthRevenue > 0) {
      growth = 100; 
    }

    res.status(200).json({
      totalRevenue,
      activeCredits: examCategoryMetrics.totalCreditsPool,
      totalCategories: examCategoryMetrics.totalCategories,
      totalPlans: plansMetrics.totalPlans,
      activePlans: plansMetrics.activePlans,
      activeUsers,
      growth: Math.round(growth),
      totalTxCount,
      successfulTxCount,
      avgTransaction
    });

  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 2. GET RECENT TRANSACTIONS (LIMIT 5) 
// ✅ FIXED: Date format now includes date + time
// ==========================================
exports.getRecentTransactions = async (req, res) => {
  try {
    const snapshot = await db.collection('transactions')
      .orderBy('created_at', 'desc')
      .limit(5)
      .get();

    const userCache = {};

    const transactionsPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let userName = data.student_name || '';

      const studentId = data.student_id || data.studentId;
      if (!userName && studentId) {
        if (userCache[studentId]) {
          userName = userCache[studentId];
        } else {
          try {
            const userDoc = await db.collection('users').doc(studentId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              userName = userData.name || userData.fullName || userData.displayName || userData.email || `Student (${studentId.slice(0, 5)})`;
              userCache[studentId] = userName;
            }
          } catch (e) {
            userName = `Student (${studentId.slice(0, 5)})`;
          }
        }
      }

      if (!userName) userName = 'Student User';

      const amount = data.amount_paid !== undefined ? data.amount_paid : (data.amount || 0);
      const planName = data.plan_name || 'Standard';
      const credits = data.credits_added !== undefined ? data.credits_added : (data.credits || 0);
      const typeFormatted = data.type === 'subscription_purchase' ? 'Subscription' : (data.type || 'Payment');

      // ✅ FIXED: Date format with both date and time
      let formattedDate = 'N/A';
      if (data.created_at) {
        const dateObj = data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }

      return {
        id: data.transaction_id || doc.id,
        user: userName,
        amount: `LKR ${Number(amount).toLocaleString()}`,
        planName,
        credits,
        type: typeFormatted,
        status: data.status || 'Completed',
        time: formattedDate,  // Now shows "Jan 15, 2025, 02:30 PM"
        avatar: userName.charAt(0).toUpperCase()
      };
    });

    const transactions = await Promise.all(transactionsPromises);
    res.status(200).json(transactions);

  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    res.status(200).json([]);
  }
};

// ==========================================
// 3. GET REVENUE CHART DATA (SUCCESSFUL ONLY)
// ==========================================
exports.getRevenueChartData = async (req, res) => {
  try {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: m.toLocaleString('default', { month: 'short' }),
        start: m,
        end: new Date(m.getFullYear(), m.getMonth() + 1, 1)
      });
    }

    const txSnapshot = await db.collection('transactions').get();

    const chartData = months.map(({ month, start, end }) => {
      let revenue = 0;
      let credits = 0;

      txSnapshot.forEach(doc => {
        const data = doc.data();
        const statusFormatted = String(data.status || '').toLowerCase().trim();

        // 🔹 Only consider Success or Completed transactions
        if (statusFormatted === 'success' || statusFormatted === 'completed') {
          if (data.created_at) {
            const date = data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at);
            if (!isNaN(date.getTime()) && date >= start && date < end) {
              revenue += Number(data.amount_paid !== undefined ? data.amount_paid : (data.amount || 0));
              credits += Number(data.credits_added !== undefined ? data.credits_added : (data.credits || 0));
            }
          }
        }
      });

      return { 
        month, 
        revenue: Math.round(revenue), 
        credits: Math.round(credits)
      };
    });

    res.status(200).json(chartData);

  } catch (error) {
    console.error("Error fetching chart data:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 4. GET ALL TRANSACTIONS (SORTED BY NEWEST FIRST)
// ✅ FIXED: Date format now includes date + time
// ==========================================
exports.getAllTransactions = async (req, res) => {
  try {
    const snapshot = await db.collection('transactions').get();
    const userCache = {};

    const transactionsPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let userName = data.student_name || '';
      let userEmail = data.student_email || '';
      const userId = data.student_id || data.studentId;

      if ((!userName || !userEmail) && userId) {
        if (userCache[userId]) {
          userName = userName || userCache[userId].name;
          userEmail = userEmail || userCache[userId].email;
        } else {
          try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              const fetchedName = userData.name || userData.fullName || userData.displayName || 'Student User';
              const fetchedEmail = userData.email || 'N/A';

              userCache[userId] = { name: fetchedName, email: fetchedEmail };
              userName = userName || fetchedName;
              userEmail = userEmail || fetchedEmail;
            }
          } catch (e) {
            console.warn("User fetch warning:", e.message);
          }
        }
      }

      if (!userName) userName = 'Student User';

      const amount = data.amount_paid !== undefined ? data.amount_paid : (data.amount || 0);
      const planName = data.plan_name || data.planName || 'Standard Plan';
      const credits = data.credits_added !== undefined ? data.credits_added : (data.credits || 0);
      const gateway = data.payment_method || data.paymentMethod || 'Card Payment';

      let statusFormatted = 'Pending';
      if (data.status) {
        const s = String(data.status).toLowerCase().trim();
        if (s === 'completed' || s === 'success') statusFormatted = 'Success';
        else if (s === 'failed' || s === 'declined') statusFormatted = 'Failed';
        else if (s === 'pending') statusFormatted = 'Pending';
      }

      let rawDate = 0;
      let formattedTimestamp = 'N/A';
      if (data.created_at) {
        const dateObj = data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at);
        if (!isNaN(dateObj.getTime())) {
          rawDate = dateObj.getTime();
          // ✅ FIXED: Full date + time format
          formattedTimestamp = dateObj.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        }
      }

      return {
        ref: data.transaction_id || doc.id,
        student: userName,
        email: userEmail,
        plan: planName,
        tier: planName,
        amount: Number(amount),
        credits: Number(credits),
        gateway: gateway,
        status: statusFormatted,
        timestamp: formattedTimestamp,
        rawDate: rawDate
      };
    });

    let transactions = await Promise.all(transactionsPromises);
    transactions.sort((a, b) => b.rawDate - a.rawDate);

    res.status(200).json(transactions);

  } catch (error) {
    console.error("Error fetching all transactions:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 5. GET ACTIVE USERS COUNT
// ==========================================
exports.getActiveUsers = async (req, res) => {
  try {
    const activeUsers = await fetchActiveUsersCount();
    res.status(200).json({ activeUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};