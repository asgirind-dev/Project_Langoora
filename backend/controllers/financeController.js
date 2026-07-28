// backend/controllers/financeController.js
const { db } = require('../config/firebase');

// ==========================================
// HELPER 1: Credits Pool
// ==========================================
const getTotalCreditsPool = async () => {
  try {
    const catsSnapshot = await db.collection('exam_categories')
      .where('status', '!=', 'deleted')
      .get();
    
    const poolPromises = catsSnapshot.docs.map(async (catDoc) => {
      const catData = catDoc.data();
      
      const levelsSnapshot = await db.collection(`exam_categories/${catDoc.id}/levels`).get();
      let subTotal = 0;

      if (!levelsSnapshot.empty) {
        levelsSnapshot.forEach(levelDoc => {
          const levelData = levelDoc.data();
          if (levelData.status !== 'deleted' && levelData.is_active !== 0) {
            subTotal += parseInt(levelData.credits, 10) || 0;
          }
        });
      } else {
        subTotal += parseInt(catData.credits, 10) || 0;
      }
      return subTotal;
    });

    const results = await Promise.all(poolPromises);
    return results.reduce((sum, val) => sum + val, 0);

  } catch (error) {
    console.error("Error calculating credits pool:", error);
    return 0;
  }
};

// ==========================================
// HELPER 2: Active Users Count
// ==========================================
const fetchActiveUsersCount = async () => {
  try {
    const snapshot = await db.collection('users')
      .where('status', '==', 'active')
      .where('role', 'in', ['student', 'tutor'])
      .count()
      .get();
      
    return snapshot.data().count;
  } catch (error) {
    console.warn("Count aggregation failed, fallback used:", error.message);
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

    const [txSnapshot, activeCredits, activeUsers] = await Promise.all([
      db.collection('transactions')
        .where('status', 'in', ['success', 'completed', 'Success', 'Completed'])
        .get(),
      getTotalCreditsPool(),
      fetchActiveUsersCount()
    ]);

    const totalTxCount = txSnapshot.size;

    txSnapshot.forEach(doc => {
      const data = doc.data();
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
      activeCredits,
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
      const planName = data.plan_name || 'Lite';
      const credits = data.credits_added !== undefined ? data.credits_added : (data.credits || 0);
      const typeFormatted = data.type === 'subscription_purchase' ? 'Subscription' : (data.type || 'Payment');

      let formattedDate = 'N/A';
      if (data.created_at) {
        const dateObj = data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }

      return {
        id: doc.id,
        user: userName,
        amount: `LKR ${Number(amount).toLocaleString()}`,
        planName,
        credits,
        type: typeFormatted,
        status: 'Completed',
        time: formattedDate,
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
// 3. GET REVENUE CHART DATA
// ==========================================
exports.getRevenueChartData = async (req, res) => {
  try {
    const months = [];
    const now = new Date();
    
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: m.toLocaleString('default', { month: 'short' }),
        start: m,
        end: new Date(m.getFullYear(), m.getMonth() + 1, 1)
      });
    }

    const txSnapshot = await db.collection('transactions')
      .where('created_at', '>=', sixMonthsAgo)
      .get();

    const chartData = months.map(({ month, start, end }) => {
      let revenue = 0;
      let credits = 0;

      txSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.created_at) {
          const date = data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at);
          if (date >= start && date < end) {
            revenue += Number(data.amount_paid !== undefined ? data.amount_paid : (data.amount || 0));
            credits += Number(data.credits_added !== undefined ? data.credits_added : (data.credits || 0));
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
// 4. GET ALL TRANSACTIONS
// ==========================================
exports.getAllTransactions = async (req, res) => {
  try {
    const snapshot = await db.collection('transactions')
      .orderBy('created_at', 'desc')
      .limit(100) 
      .get();

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

      let formattedTimestamp = 'N/A';
      if (data.created_at) {
        const dateObj = data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at);
        if (!isNaN(dateObj.getTime())) {
          const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = dateObj.toISOString().slice(0, 10);
          formattedTimestamp = `${dateStr} ${timeStr}`;
        }
      }

      return {
        ref: data.transaction_id || doc.id,
        student: userName,
        email: userEmail,
        plan: planName,
        tier: planName,
        amount: Number(amount),
        credits,
        gateway,
        status: statusFormatted,
        timestamp: formattedTimestamp
      };
    });

    const transactions = await Promise.all(transactionsPromises);
    res.status(200).json(transactions);

  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 5. GET ACTIVE USERS
// ==========================================
exports.getActiveUsers = async (req, res) => {
  try {
    const activeUsers = await fetchActiveUsersCount();
    res.status(200).json({ activeUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 6. GET ALL TUTORS WITH TOKENS
// ==========================================
exports.getAllTutorsWithTokens = async (req, res) => {
  try {
    const purchasedSnapshot = await db.collection('purchased_exams')
      .where('status', '==', 'completed')
      .get();
    
    const tutorMap = {};

    purchasedSnapshot.forEach(doc => {
      const data = doc.data();
      const tutorId = data.tutor_id;
      
      if (!tutorId) return;
      
      if (!tutorMap[tutorId]) {
        tutorMap[tutorId] = {
          tutorId: tutorId,
          tutorName: data.tutor_name || 'Unknown',
          totalTokens: 0,
          paperCount: 0,
          studentIds: [],
          examIds: []
        };
      }
      
      tutorMap[tutorId].totalTokens += data.credits_deducted || 0;
      tutorMap[tutorId].paperCount += 1;
      
      if (data.student_id && !tutorMap[tutorId].studentIds.includes(data.student_id)) {
        tutorMap[tutorId].studentIds.push(data.student_id);
      }
      if (data.exam_id && !tutorMap[tutorId].examIds.includes(data.exam_id)) {
        tutorMap[tutorId].examIds.push(data.exam_id);
      }
    });

    const settingsRef = db.collection('system_settings').doc('global_config');
    const settingsDoc = await settingsRef.get();
    const settings = settingsDoc.data() || {};
    const exchangeRate = settings.creditPrice || 10;
    const commission = settings.platformCommission || 20;

    const tutors = Object.values(tutorMap).map(tutor => {
      const grossAmount = tutor.totalTokens * exchangeRate;
      const commissionAmount = grossAmount * (commission / 100);
      const netPayout = grossAmount - commissionAmount;

      return {
        ...tutor,
        studentCount: tutor.studentIds.length,
        examCount: tutor.examIds.length,
        grossAmount,
        commissionAmount,
        netPayout,
        exchangeRate,
        commission,
        tokensPerPaper: tutor.paperCount > 0 ? Math.round(tutor.totalTokens / tutor.paperCount) : 0
      };
    });

    res.status(200).json({
      success: true,
      data: tutors
    });

  } catch (error) {
    console.error('Error fetching tutors tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ✅ NO module.exports needed!
// All functions are exported using exports.
// Just leave it like this!