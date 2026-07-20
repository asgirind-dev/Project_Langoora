const { db } = require('../config/firebase');

// ==========================================
// HELPER: Get total credits pool (SAME LOGIC as Subscription Manager)
// ==========================================
const getTotalCreditsPool = async () => {
  let total = 0;
  try {
    const catsSnapshot = await db.collection('exam_categories').get();
    
    for (const catDoc of catsSnapshot.docs) {
      const catId = catDoc.id;
      const catData = catDoc.data();
      
      // ✅ Skip deleted categories (status === 'deleted')
      if (catData.status === 'deleted') continue;
      
      // Check if category has levels subcollection
      const levelsSnapshot = await db.collection(`exam_categories/${catId}/levels`).get();
      
      if (!levelsSnapshot.empty) {
        // ✅ Has levels - sum credits from levels only
        levelsSnapshot.forEach(levelDoc => {
          const levelData = levelDoc.data();
          // ✅ Skip deleted levels
          if (levelData.status === 'deleted') return;
          total += parseInt(levelData.credits) || 0;
        });
      } else {
        // ✅ No levels - use category's own credits
        total += parseInt(catData.credits) || 0;
      }
    }
  } catch (error) {
    console.error("Error calculating credits pool:", error);
  }
  return total;
};

// ==========================================
// HELPER: Get active users count
// ==========================================
const getActiveUsers = async () => {
  try {
    const snapshot = await db.collection('users').where('status', '==', 'active').get();
    return snapshot.size;
  } catch (error) {
    console.error("Error getting active users:", error);
    return 0;
  }
};

// ==========================================
// 1. GET DASHBOARD STATS
// ==========================================
exports.getFinanceStats = async (req, res) => {
  try {
    // --- Total Revenue ---
    let totalRevenue = 0;
    try {
      const txSnapshot = await db.collection('transactions').get();
      txSnapshot.forEach(doc => {
        totalRevenue += doc.data().amount || 0;
      });
    } catch (error) {
      console.warn("No transactions collection found:", error.message);
    }

    // --- Active Credits (Total Credits Pool - SAME LOGIC as Subscription Manager) ---
    const activeCredits = await getTotalCreditsPool();

    // --- Active Users ---
    const activeUsers = await getActiveUsers();

    // --- Growth (month-over-month revenue growth) ---
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const startCurrent = new Date(currentYear, currentMonth, 1);
    const startPrev = new Date(prevYear, prevMonth, 1);
    const endPrev = new Date(prevYear, prevMonth + 1, 1);

    let currentMonthRevenue = 0;
    let prevMonthRevenue = 0;

    try {
      const txSnapshot = await db.collection('transactions').get();
      txSnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.created_at?.toDate?.() || new Date(data.created_at);
        if (date >= startCurrent) currentMonthRevenue += data.amount || 0;
        else if (date >= startPrev && date < endPrev) prevMonthRevenue += data.amount || 0;
      });
    } catch (error) {
      console.warn("No transactions for growth calculation:", error.message);
    }

    let growth = 0;
    if (prevMonthRevenue > 0) {
      growth = ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;
    }
    growth = Math.round(growth);

    res.status(200).json({
      totalRevenue: totalRevenue,
      activeCredits: activeCredits,
      activeUsers: activeUsers,
      growth: growth
    });

  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 2. GET RECENT TRANSACTIONS
// ==========================================
exports.getRecentTransactions = async (req, res) => {
  try {
    const snapshot = await db.collection('transactions')
      .orderBy('created_at', 'desc')
      .limit(5)
      .get();

    const transactions = snapshot.docs.map(doc => {
      const data = doc.data();
      const userName = data.student_name || data.userName || data.user || 'Unknown';
      const amount = data.amount || 0;
      const type = data.type || 'Payment';
      const status = data.status || 'Completed';
      const createdAt = data.created_at?.toDate?.() || new Date(data.created_at);
      
      return {
        id: doc.id,
        user: userName,
        amount: `LKR ${amount.toLocaleString()}`,
        type: type,
        status: status,
        time: createdAt.toLocaleTimeString(),
        avatar: userName.charAt(0).toUpperCase()
      };
    });

    res.status(200).json(transactions);

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

    let txSnapshot;
    try {
      txSnapshot = await db.collection('transactions').get();
    } catch (error) {
      const emptyChart = months.map(({ month }) => ({
        month,
        revenue: 0,
        credits: 0,
        growth: 0
      }));
      return res.status(200).json(emptyChart);
    }

    const chartData = months.map(({ month, start, end }) => {
      let revenue = 0;
      let credits = 0;
      txSnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.created_at?.toDate?.() || new Date(data.created_at);
        if (date >= start && date < end) {
          revenue += data.amount || 0;
          credits += data.credits || 0;
        }
      });
      return { 
        month, 
        revenue: Math.round(revenue), 
        credits: Math.round(credits), 
        growth: 0 
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
    const activeUsers = await getActiveUsers();
    res.status(200).json({ activeUsers });
  } catch (error) {
    console.error("Error fetching active users:", error);
    res.status(500).json({ error: error.message });
  }
};