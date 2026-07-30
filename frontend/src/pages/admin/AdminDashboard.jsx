// frontend/src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Users, BookOpen, DollarSign, UserCheck, AlertCircle, Activity,
  TrendingUp, Clock, CreditCard, RefreshCw, FileText, CheckCircle,
  XCircle, Clock as ClockIcon, BarChart3, Briefcase
} from 'lucide-react';
import { db } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import FinanceService from '../../services/financeService';
import { fetchAllLanguageSchema } from '../../services/languageService';
import { fetchUsers } from '../../services/userService';
import AdminNotifications from '../../components/admin/AdminNotifications';

// --- Colors for exam categories ---
const CATEGORY_COLORS = [
  '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', 
  '#8b5cf6', '#ec4899', '#f97316', '#14b8a6',
  '#6366f1', '#84cc16', '#22d3ee', '#a78bfa'
];

const getCategoryColor = (id, index) => {
  if (!id) return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
};

// --- Helper: Axios instance with auth token ---
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default function AdminDashboard() {
  // ============================================
  // STATE
  // ============================================
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTutors: 0,
    totalStaff: 0,
    totalRevenue: 0,
    growth: 0,
    totalTxCount: 0,
    avgTransaction: 0,
    activeCredits: 0,
    activeUsers: 0,
    totalExams: 0,
    publishedExams: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [examDistribution, setExamDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // ✅ AUTH CONFIG FOR CREDIT API
  // ============================================
  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // ============================================
  // ✅ FETCH EXAM STATS
  // ============================================
  const fetchExamStats = async () => {
    try {
      const response = await api.get('/exams/all');
      if (response.data.success) {
        const exams = response.data.exams || [];
        const published = exams.filter(e => e.status === 'published' || e.status === 'active').length;
        
        setStats(prev => ({
          ...prev,
          totalExams: exams.length,
          publishedExams: published,
        }));
        
        console.log(`📊 Exam Stats: Total=${exams.length}, Published=${published}`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch exam stats:', error);
    }
  };

  // ============================================
  // ✅ FETCH EXAM DISTRIBUTION WITH CREDITS
  // ============================================
  const fetchExamDistributionWithCredits = async (schemaData) => {
    try {
      console.log('📊 Building exam distribution with credit values...');

      let creditData = [];
      try {
        const creditResponse = await axios.get(
          'http://localhost:5000/api/credit-values/categories',
          getAuthConfig()
        );
        if (creditResponse.data && Array.isArray(creditResponse.data)) {
          creditData = creditResponse.data;
        }
      } catch (creditError) {
        console.warn('⚠️ Could not fetch credit data, using defaults:', creditError.message);
      }

      const creditMap = {};
      creditData.forEach(item => {
        const key = `${item.categoryId}_${item.id}`;
        creditMap[key] = {
          credits: item.credits || 0,
          isCreditSet: item.isCreditSet || false,
          categoryName: item.categoryName || item.categoryId,
          levelName: item.name || item.id
        };
      });

      if (!schemaData || !schemaData.success || !schemaData.schema) {
        console.warn('⚠️ No schema data available');
        return;
      }

      const activeCategories = schemaData.schema
        .filter(cat => cat.status === 'active' || cat.status === undefined);

      const distribution = [];

      activeCategories.forEach((cat, index) => {
        const activeLevels = cat.levels 
          ? cat.levels.filter(l => l.status === 'active' || l.status === undefined)
          : [];

        const categoryName = cat.category_name || cat.language || cat.id || `Category ${index + 1}`;
        const categoryId = cat.id;

        if (activeLevels.length === 0) {
          const creditKey = `${categoryId}_${categoryId}`;
          const creditInfo = creditMap[creditKey] || { credits: 0, isCreditSet: false };

          if (creditInfo.isCreditSet && creditInfo.credits > 0) {
            distribution.push({
              name: `${categoryName} (Category)`,
              value: creditInfo.credits,
              color: getCategoryColor(categoryId, index),
              levelCount: 0,
              isCreditSet: true,
              credits: creditInfo.credits,
              categoryId: categoryId,
              isPending: false,
              tooltip: `${categoryName}: ${creditInfo.credits} credits (No levels)`
            });
          } else {
            distribution.push({
              name: `${categoryName} ⏳ (Category)`,
              value: 1,
              color: '#f59e0b',
              levelCount: 0,
              isCreditSet: false,
              credits: 0,
              categoryId: categoryId,
              isPending: true,
              tooltip: `${categoryName}: Pending credit approval (No levels)`
            });
          }
          return;
        }

        let categoryTotalCredits = 0;
        let creditSetCount = 0;
        const levelCount = activeLevels.length;
        const levelDetails = [];

        activeLevels.forEach(level => {
          const levelId = level.id || level.level_name;
          const creditKey = `${categoryId}_${levelId}`;
          const creditInfo = creditMap[creditKey] || { credits: 0, isCreditSet: false };

          const levelName = level.level_name || level.name || levelId;

          if (creditInfo.isCreditSet && creditInfo.credits > 0) {
            categoryTotalCredits += creditInfo.credits;
            creditSetCount++;
          }

          levelDetails.push({
            levelId,
            levelName,
            credits: creditInfo.credits,
            isCreditSet: creditInfo.isCreditSet
          });
        });

        if (creditSetCount === levelCount && categoryTotalCredits > 0) {
          distribution.push({
            name: categoryName,
            value: categoryTotalCredits,
            color: getCategoryColor(categoryId, index),
            levelCount: levelCount,
            creditSetCount: creditSetCount,
            totalCredits: categoryTotalCredits,
            isFullySet: true,
            isCreditSet: true,
            categoryId: categoryId,
            isPending: false,
            levelDetails: levelDetails,
            tooltip: `${categoryName}: ${categoryTotalCredits} credits (${levelCount} levels)`
          });
        } else if (creditSetCount > 0 && categoryTotalCredits > 0) {
          distribution.push({
            name: `${categoryName} ⚠️`,
            value: categoryTotalCredits,
            color: '#f59e0b',
            levelCount: levelCount,
            creditSetCount: creditSetCount,
            totalCredits: categoryTotalCredits,
            isFullySet: false,
            isCreditSet: true,
            categoryId: categoryId,
            isPending: true,
            levelDetails: levelDetails,
            tooltip: `${categoryName}: ${categoryTotalCredits} credits (${creditSetCount}/${levelCount} levels set)`
          });
        } else {
          distribution.push({
            name: `${categoryName} ⏳`,
            value: 1,
            color: '#f59e0b',
            levelCount: levelCount,
            creditSetCount: 0,
            totalCredits: 0,
            isFullySet: false,
            isCreditSet: false,
            categoryId: categoryId,
            isPending: true,
            levelDetails: levelDetails,
            tooltip: `${categoryName}: ${levelCount} levels - Pending credit approval`
          });
        }
      });

      distribution.sort((a, b) => {
        if (a.isPending && !b.isPending) return 1;
        if (!a.isPending && b.isPending) return -1;
        return b.value - a.value;
      });

      setExamDistribution(distribution);
      console.log('📊 Final Exam Distribution with Credits:', distribution);

    } catch (error) {
      console.error('❌ Failed to fetch exam distribution:', error);
      setExamDistribution([
        { name: 'JLPT', value: 140, color: '#3b82f6', isCreditSet: true, levelCount: 4 },
        { name: 'EPS-TOPIK (Category)', value: 40, color: '#06b6d4', isCreditSet: true, levelCount: 0 },
        { name: 'TOPIK', value: 30, color: '#10b981', isCreditSet: true, levelCount: 1 },
      ]);
    }
  };

  // ============================================
  // FETCH ALL DATA
  // ============================================
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching dashboard data...');

      const [
        usersResponse,
        statsResponse,
        chartResponse,
        transactionsResponse,
        examSchemaResponse,
      ] = await Promise.all([
        fetchUsers(),
        FinanceService.getDashboardStats(),
        FinanceService.getRevenueChartData(),
        FinanceService.getRecentTransactions(),
        fetchAllLanguageSchema(),
      ]);

      console.log('📊 Users response:', usersResponse);
      console.log('📊 Stats response:', statsResponse);
      console.log('📊 Chart response:', chartResponse);
      console.log('📊 Transactions response:', transactionsResponse);
      console.log('📊 Exam schema response:', examSchemaResponse);

      // ============================================
      // ✅ 1. USER STATS
      // ============================================
      if (usersResponse.success) {
        const allUsers = usersResponse.users || [];
        
        const totalStudents = allUsers.filter(u => u.role === 'student').length;
        const totalTutors = allUsers.filter(u => u.role === 'tutor').length;
        const staffRoles = ['admin', 'validator', 'finance', 'super_admin', 'finance_admin'];
        const totalStaff = allUsers.filter(u => 
          staffRoles.includes(u.role)
        ).length;
        const totalUsers = allUsers.length;

        setStats(prev => ({
          ...prev,
          totalUsers: totalUsers,
          totalStudents: totalStudents,
          totalTutors: totalTutors,
          totalStaff: totalStaff,
        }));

        console.log(`📊 Users: Total=${totalUsers}, Students=${totalStudents}, Tutors=${totalTutors}, Staff=${totalStaff}`);
      }

      // ============================================
      // 2. FINANCE STATS
      // ============================================
      if (statsResponse) {
        setStats(prev => ({
          ...prev,
          totalRevenue: statsResponse.totalRevenue || 0,
          growth: statsResponse.growth || 0,
          totalTxCount: statsResponse.totalTxCount || 0,
          avgTransaction: statsResponse.avgTransaction || 0,
          activeCredits: statsResponse.activeCredits || 0,
          activeUsers: statsResponse.activeUsers || 0,
        }));
      }

      // ============================================
      // 3. REVENUE CHART DATA
      // ============================================
      if (chartResponse && chartResponse.length > 0) {
        setRevenueData(chartResponse);
      } else {
        setRevenueData([
          { month: 'Jan', revenue: 1200000 },
          { month: 'Feb', revenue: 1850000 },
          { month: 'Mar', revenue: 1620000 },
          { month: 'Apr', revenue: 2100000 },
          { month: 'May', revenue: 2450000 },
          { month: 'Jun', revenue: 2980000 },
        ]);
      }

      // ============================================
      // 4. RECENT TRANSACTIONS
      // ============================================
      if (transactionsResponse && transactionsResponse.length > 0) {
        setRecentTransactions(transactionsResponse);
      } else {
        setRecentTransactions([
          { id: 'TX-1001', user: 'Saman Kumara', exam: 'JLPT N4', amount: 'LKR 12,500', date: '2025-01-15', status: 'completed' },
          { id: 'TX-1002', user: 'Nimal Perera', exam: 'EPS-TOPIK', amount: 'LKR 15,000', date: '2025-01-14', status: 'pending' },
        ]);
      }

      // ============================================
      // ✅ 5. EXAM STATS
      // ============================================
      await fetchExamStats();

      // ============================================
      // ✅ 6. EXAM DISTRIBUTION
      // ============================================
      await fetchExamDistributionWithCredits(examSchemaResponse);

    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data. Please refresh.');
      
      setRevenueData([
        { month: 'Jan', revenue: 1200000 },
        { month: 'Feb', revenue: 1850000 },
        { month: 'Mar', revenue: 1620000 },
        { month: 'Apr', revenue: 2100000 },
        { month: 'May', revenue: 2450000 },
        { month: 'Jun', revenue: 2980000 },
      ]);
      setExamDistribution([
        { name: 'JLPT', value: 140, color: '#3b82f6', isCreditSet: true, levelCount: 4 },
        { name: 'EPS-TOPIK (Category)', value: 40, color: '#06b6d4', isCreditSet: true, levelCount: 0 },
        { name: 'TOPIK', value: 30, color: '#10b981', isCreditSet: true, levelCount: 1 },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ============================================
  // REFRESH
  // ============================================
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  // ============================================
  // FORMAT HELPERS
  // ============================================
  const formatCurrency = (amount) => {
    if (!amount) return 'LKR 0';
    if (amount >= 1000000) return `LKR ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `LKR ${(amount / 1000).toFixed(1)}K`;
    return `LKR ${amount}`;
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-8">
      {/* Header with Bell */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Platform overview, revenue matrix, and system monitoring telemetry</p>
          </div>
          <div className="flex items-center gap-3">
            {/* ✅ Notification Bell - Same level as Refresh button */}
            <AdminNotifications />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}
      </motion.div>

      {/* ... rest of dashboard content (metrics cards, charts, transactions) ... */}
      {/* Keep existing code for metrics, charts, and transactions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* Metrics cards - keep existing */}
        {[
          { 
            label: 'Total Revenue', 
            value: loading ? '...' : formatCurrency(stats.totalRevenue), 
            icon: DollarSign, 
            color: 'text-green-400',
            sub: stats.growth ? `${stats.growth > 0 ? '↑' : '↓'} ${Math.abs(stats.growth)}%` : ''
          },
          { 
            label: 'Total Students',
            value: loading ? '...' : stats.totalStudents,
            icon: Users, 
            color: 'text-cyan-400',
            sub: 'All students'
          },
          { 
            label: 'Total Tutors',
            value: loading ? '...' : stats.totalTutors,
            icon: UserCheck, 
            color: 'text-emerald-400',
            sub: 'All tutors'
          },
          { 
            label: 'System Staff',
            value: loading ? '...' : stats.totalStaff, 
            icon: Briefcase, 
            color: 'text-purple-400',
            sub: 'Admin staff'
          },
          { 
            label: 'Total Exams', 
            value: loading ? '...' : stats.totalExams, 
            icon: BookOpen, 
            color: 'text-purple-400',
            sub: `${stats.publishedExams || 0} published`
          },
          { 
            label: 'Total Tx', 
            value: loading ? '...' : stats.totalTxCount, 
            icon: Activity, 
            color: 'text-purple-400',
            sub: 'Transactions'
          },
          { 
            label: 'Avg Tx', 
            value: loading ? '...' : formatCurrency(stats.avgTransaction), 
            icon: TrendingUp, 
            color: 'text-amber-400',
            sub: 'Per transaction'
          },
          { 
            label: 'Credits Pool', 
            value: loading ? '...' : stats.activeCredits, 
            icon: CreditCard, 
            color: 'text-indigo-400',
            sub: 'Available credits'
          },
        ].map((s, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.04 }}
          >
            <GlassCard className="p-3 border-white/10">
              <div className="flex items-center justify-between">
                <s.icon size={16} className={s.color} />
                {s.sub && (
                  <span className={`text-[9px] font-medium ${s.sub.includes('↑') ? 'text-green-400' : s.sub.includes('↓') ? 'text-red-400' : 'text-gray-400'}`}>
                    {s.sub}
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-white mt-1">{s.value}</div>
              <div className="text-[10px] text-gray-400">{s.label}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts section - keep existing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <GlassCard className="lg:col-span-2 p-6 border-white/10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-400" /> 
              Platform Revenue Matrix
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                Total: {loading ? '...' : formatCurrency(stats.totalRevenue)}
              </span>
              {stats.growth !== 0 && (
                <Badge color={stats.growth > 0 ? 'green' : 'red'}>
                  {stats.growth > 0 ? '↑' : '↓'} {Math.abs(stats.growth)}%
                </Badge>
              )}
            </div>
          </div>
          
          {loading ? (
            <div className="h-[230px] flex items-center justify-center">
              <div className="text-gray-500 text-sm animate-pulse">Loading chart data...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={v => [`LKR ${v?.toLocaleString() ?? 0}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#adminRevGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        {/* Exam Distribution Pie Chart */}
        <GlassCard className="p-6 border-white/10 flex items-center justify-center">
          {loading ? (
            <div className="h-[200px] flex items-center justify-center w-full">
              <div className="text-gray-500 text-sm animate-pulse">Loading exam data...</div>
            </div>
          ) : examDistribution.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-gray-500 text-sm w-full">
              <BookOpen size={32} className="text-gray-600 mb-2" />
              <p>No exam categories found</p>
              <p className="text-[10px] text-gray-600 mt-1">Add categories in Language Config</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie 
                  data={examDistribution} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50} 
                  outerRadius={80} 
                  dataKey="value"
                  label={({ name, value, percent }) => {
                    if (percent < 0.05) return '';
                    return `${(percent * 100).toFixed(0)}%`;
                  }}
                  labelLine={false}
                >
                  {examDistribution.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Legend 
                  iconSize={10} 
                  wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} 
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => {
                    const item = examDistribution.find(e => e.name === value);
                    if (!item) return value;
                    if (item.isPending) {
                      return <span style={{ color: '#f59e0b' }}>{value}</span>;
                    }
                    if (item.levelCount === 0) {
                      return `${value} (Category)`;
                    }
                    return `${value} (${item.levelCount} levels)`;
                  }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: '#0f1629', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '8px', 
                    color: '#fff', 
                    fontSize: '12px' 
                  }}
                  formatter={(value, name, props) => {
                    const item = examDistribution.find(e => e.name === name);
                    if (!item) return [value, name];
                    if (item.isPending) {
                      return [`⏳ Pending Credit Approval`, name];
                    }
                    if (item.levelCount === 0) {
                      return [`${value} credits (No levels)`, name];
                    }
                    return [`${value} credits (${item.levelCount} levels)`, name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          
          {!loading && examDistribution.length > 0 && (
            <div className="absolute bottom-3 text-center text-[10px] text-gray-500 w-full">
              Total: {examDistribution.reduce((sum, e) => sum + e.value, 0)} credits across {examDistribution.length} categories
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recent Transactions Table - keep existing */}
      <GlassCard className="p-6 border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity size={18} className="text-blue-400" /> 
            Recent Transactions Registry
          </h3>
          <Badge color="blue">{recentTransactions.length}</Badge>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm animate-pulse">Loading transactions...</div>
        ) : recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Transaction ID', 'Student Name', 'Plan / Exam', 'Amount', 'Date / Time', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentTransactions.map((t, i) => (
                  <tr key={t.id || i} className="hover:bg-white/3 transition-colors">
                    <td className="py-3 pr-4 text-xs text-blue-400 font-mono select-all">{t.id || `TX-${String(i+1).padStart(4, '0')}`}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                          {t.user ? t.user.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <span className="text-sm text-gray-300">{t.user || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-300">{t.planName || t.exam || 'Standard'}</td>
                    <td className="py-3 pr-4 text-sm font-semibold text-white">{t.amount || `LKR ${(t.credits || 0) * 20}`}</td>
                    <td className="py-3 pr-4 text-xs text-gray-500">{t.time || t.date || 'N/A'}</td>
                    <td>
                      <Badge color={t.status === 'Completed' || t.status === 'completed' ? 'green' : t.status === 'Pending' || t.status === 'pending' ? 'yellow' : 'red'}>
                        {t.status || 'Pending'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}