const { db } = require('../config/firebase');

exports.getFinanceStats = async (req, res) => {
    try {
        // transactions collection එකෙන් මුළු ආදායම ගන්න
        const txSnapshot = await db.collection('transactions').get();
        let totalRev = 0;
        txSnapshot.forEach(doc => {
            totalRev += doc.data().amount || 0;
        });

        // subscriptions collection එකෙන් active credits ගණනය කරන්න
        const subSnapshot = await db.collection('subscriptions')
                                    .where('status', '==', 'active').get();

        res.status(200).json({
            totalRevenue: `LKR ${totalRev.toLocaleString()}`,
            activeCredits: subSnapshot.size.toString(),
            growth: 12 // මෙය තාවකාලිකව දාන්න, පසුව logic එකක් හදන්න
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Recent Transactions සඳහා:
exports.getRecentTransactions = async (req, res) => {
    try {
        // ඔයාගේ collections ලැයිස්තුවේ තියෙන 'transactions' collection එක පාවිච්චි කරන්න
        const snapshot = await db.collection('transactions')
                                 .orderBy('created_at', 'desc') // ඔබේ field name එක අනුව වෙනස් කරන්න
                                 .limit(5).get();
        
        const data = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            user: doc.data().student_name || "Unknown",
            amount: `LKR ${doc.data().amount}`,
            type: doc.data().type || "Payment",
            status: doc.data().status || "Completed",
            time: "2h ago", // timestamp එකක් convert කරන්න
            avatar: doc.data().student_name?.charAt(0) || "U"
        }));
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getRevenueChartData = async (req, res) => {
    try {
        // Firestore එකෙන් හෝ තාවකාලිකව දත්ත යැවීම
        const chartData = [
            { month: 'Jan', revenue: 4000, credits: 2400, growth: 20 },
            { month: 'Feb', revenue: 3000, credits: 1398, growth: 15 },
            { month: 'Mar', revenue: 5000, credits: 3500, growth: 25 }
        ];
        res.status(200).json(chartData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};