const { db } = require('../config/firebase');

// ==========================================
// HELPER 1: Fast Parallel Credits Pool Calculation
// ==========================================
const getTotalCreditsPool = async () => {
  try {
    const catsSnapshot = await db.collection('exam_categories').get();
    
    // 🚀 Parallel execution for sub-collections reading
    const poolPromises = catsSnapshot.docs.map(async (catDoc) => {
      const catId = catDoc.id;
      const catData = catDoc.data();
      
      if (catData.status === 'deleted') return 0;
      
      const levelsSnapshot = await db.collection(`exam_categories/${catId}/levels`).get();
      let subTotal = 0;

      if (!levelsSnapshot.empty) {
        levelsSnapshot.forEach(levelDoc => {
          const levelData = levelDoc.data();
          if (levelData.status !== 'deleted' && levelData.is_active !== 0) {
            subTotal += parseInt(levelData.credits) || 0;
          }
        });
      } else {
        subTotal += parseInt(catData.credits) || 0;
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
// HELPER 2: Get active students & tutors count
// ==========================================
const fetchActiveUsersCount = async () => {
  try {
    const snapshot = await db.collection('users')
      .where('status', '==', 'active')
      .where('role', 'in', ['student', 'tutor'])
      .get();
      
    return snapshot.size;
  } catch (error) {
    try {
      const fallbackSnapshot = await db.collection('users').where('status', '==', 'active').get();
      const filtered = fallbackSnapshot.docs.filter(doc => {
        const role = doc.data().role;
        return role === 'student' || role === 'tutor';
      });
      return filtered.length;
    } catch (e) {
      return 0;
    }
  }
};

// ==========================================
// 1. GET DASHBOARD STATS (SUPER FAST)
// ==========================================
exports.getFinanceStats = async (req, res) => {
  try {
    let totalRevenue = 0;
    let currentMonthRevenue = 0;
    let prevMonthRevenue = 0;
    let successfulTxCount = 0;
    let totalTxCount = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const startCurrent = new Date(currentYear, currentMonth, 1);
    const startPrev = new Date(prevYear, prevMonth, 1);
    const endPrev = new Date(prevYear, prevMonth + 1, 1);

    // 🚀 Parallel Execution for Independent Database Queries
    const [txSnapshot, activeCredits, activeUsers] = await Promise.all([
      db.collection('transactions').get(),
      getTotalCreditsPool(),
      fetchActiveUsersCount()
    ]);

    totalTxCount = txSnapshot.size;

    txSnapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.created_at !== undefined && data.created_at !== null) {
        const status = String(data.status || '').toLowerCase().trim();
        
        if (status === 'success' || status === 'completed') {
          const amt = Number(data.amount_paid !== undefined ? data.amount_paid : (data.amount || 0));
          totalRevenue += amt;
          successfulTxCount += 1;

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
      totalRevenue: totalRevenue,
      activeCredits: activeCredits,
      activeUsers: activeUsers,
      growth: Math.round(growth),
      totalTxCount: totalTxCount,
      successfulTxCount: successfulTxCount,
      avgTransaction: avgTransaction
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
    const snapshot = await db.collection('transactions').get();

    const filteredDocs = snapshot.docs.filter(doc => doc.data().created_at);

    const transactionsPromises = filteredDocs.map(async (doc) => {
      const data = doc.data();
      let userName = data.student_name || '';

      if (!userName && data.student_id) {
        try {
          const userDoc = await db.collection('users').doc(data.student_id).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userName = userData.name || userData.fullName || userData.displayName || userData.email || `Student (${data.student_id.slice(0, 5)})`;
          } else {
            userName = `Student (${data.student_id.slice(0, 5)})`;
          }
        } catch (e) {
          userName = `Student (${data.student_id.slice(0, 5)})`;
        }
      }

      if (!userName) userName = 'Student User';

      const amount = data.amount_paid !== undefined ? data.amount_paid : (data.amount || 0);
      const planName = data.plan_name || 'Lite';
      const credits = data.credits_added !== undefined ? data.credits_added : (data.credits || 0);
      const typeFormatted = data.type === 'subscription_purchase' ? 'Subscription' : (data.type || 'Payment');

      let formattedDate = 'N/A';
      let rawDateObj = new Date(0);
      if (data.created_at) {
        const dateObj = data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at);
        if (!isNaN(dateObj.getTime())) {
          rawDateObj = dateObj;
          formattedDate = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }

      return {
        id: doc.id,
        user: userName,
        amount: `LKR ${Number(amount).toLocaleString()}`,
        planName: planName,
        credits: credits,
        type: typeFormatted,
        status: 'Completed',
        time: formattedDate,
        avatar: userName.charAt(0).toUpperCase(),
        _rawDate: rawDateObj
      };
    });

    const transactions = await Promise.all(transactionsPromises);
    transactions.sort((a, b) => b._rawDate - a._rawDate);

    const recentFive = transactions.slice(0, 5).map(({ _rawDate, ...rest }) => rest);

    res.status(200).json(recentFive);

  } catch (error) {
    console.error("Error fetching transactions:", error);
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
// 4. GET ACTIVE USERS
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
// 5. GET ALL TRANSACTIONS
// ==========================================
exports.getAllTransactions = async (req, res) => {
  try {
    const snapshot = await db.collection('transactions').get();

    const filteredDocs = snapshot.docs.filter(doc => doc.data().created_at);

    const transactionsPromises = filteredDocs.map(async (doc) => {
      const data = doc.data();
      let userName = data.student_name || '';
      let userEmail = data.student_email || '';

      const userId = data.student_id || data.studentId;
      if ((!userName || !userEmail) && userId) {
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userName = userName || userData.name || userData.fullName || userData.displayName || 'Student User';
            userEmail = userEmail || userData.email || 'N/A';
          }
        } catch (e) {
          console.warn("User fetch warning:", e.message);
        }
      }

      if (!userName) userName = 'Student User';

      const amount = data.amount_paid !== undefined ? data.amount_paid : (data.amount || 0);
      const planName = data.plan_name || data.planName || 'Standard Plan';
      const credits = data.credits_added !== undefined ? data.credits_added : (data.credits || 0);
      const gateway = data.payment_method || data.paymentMethod || 'Card Payment';

      let statusFormatted = 'Pending';
      if (data.status) {
        const s = String(data.status).toLowerCase();
        if (s === 'completed' || s === 'success') statusFormatted = 'Success';
        else if (s === 'failed' || s === 'declined') statusFormatted = 'Failed';
      }

      let formattedTimestamp = 'N/A';
      let rawDateObj = new Date(0);

      if (data.created_at) {
        const dateObj = data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at);
        if (!isNaN(dateObj.getTime())) {
          rawDateObj = dateObj;
          formattedTimestamp = dateObj.toISOString().replace('T', ' ').slice(0, 16);
        }
      }

      return {
        ref: data.transaction_id || doc.id,
        student: userName,
        email: userEmail,
        plan: planName,
        tier: planName,
        amount: Number(amount),
        credits: credits,
        gateway: gateway,
        status: statusFormatted,
        timestamp: formattedTimestamp,
        _rawDate: rawDateObj
      };
    });

    const transactions = await Promise.all(transactionsPromises);
    transactions.sort((a, b) => b._rawDate - a._rawDate);

    const finalTransactions = transactions.map(({ _rawDate, ...rest }) => rest);

    res.status(200).json(finalTransactions);

  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: error.message });
  }
};