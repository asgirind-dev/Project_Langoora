import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';
import { DollarSign, Activity, Wallet, TrendingUp, Sparkles, Calendar, Zap, ChevronRight, Download, CircleDot, Clock, ArrowUpRight, ArrowDownRight, PieChart, Coins, Shield } from 'lucide-react';
import FinanceService from '../../services/financeService'; 
import GlassCard from '../../components/ui/GlassCard';

export default function FinanceDashboard() {
  const [stats, setStats] = useState({ 
    totalRevenue: 'LKR 0', 
    activeCredits: '0', 
    growth: 0,
    activeUsers: 0 
  });
  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  const kpiData = [
    { label: 'Total Revenue', value: stats.totalRevenue, icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: 'up', change: '+12%' },
    { label: 'Active Credits', value: stats.activeCredits, icon: Wallet, color: 'text-purple-400', bg: 'bg-purple-500/10', trend: 'up', change: '+8%' },
    { label: 'Growth', value: `${stats.growth}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: 'up', change: '+5%' },
    { label: 'Active Users', value: stats.activeUsers, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10', trend: 'up', change: '+5%' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, txData, chartDataRes] = await Promise.all([
          FinanceService.getDashboardStats(),
          FinanceService.getRecentTransactions(),
          FinanceService.getRevenueChartData()
        ]);

        setStats({
          totalRevenue: statsData?.totalRevenue !== undefined ? `LKR ${statsData.totalRevenue.toLocaleString()}` : 'LKR 0',
          activeCredits: statsData?.activeCredits?.toString() || '0',
          growth: statsData?.growth || 0,
          activeUsers: statsData?.activeUsers || 0
        });

        setTransactions(txData || []);
        setChartData(chartDataRes || []);
      } catch (err) {
        console.error("Data load failed", err);
        setStats({ totalRevenue: 'LKR 0', activeCredits: '0', growth: 0, activeUsers: 0 });
        setTransactions([]);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const displayedTransactions = showAllTransactions ? transactions : transactions.slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0e1a]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Financial Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-[#0a0e1a] min-h-screen">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/3 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/10">
                <Sparkles size={22} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Finance Overview
                </h1>
                <div className="flex items-center gap-3 mt-0.5 ml-1">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar size={12} />
                    Last updated: Today, {new Date().toLocaleTimeString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-xs text-emerald-400">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 flex items-center gap-2">
              <Zap size={16} />
              Export Report
            </button>
          </div>
        </div>
      </motion.div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <motion.div 
            key={index} 
            className="relative group" 
            onMouseEnter={() => setHoveredCard(index)} 
            onMouseLeave={() => setHoveredCard(null)}
          >
            <GlassCard className={`p-5 border-white/10 transition-all duration-500 hover:scale-[1.02] ${hoveredCard === index ? 'shadow-2xl shadow-blue-500/10' : ''}`}>
              <div className="flex items-start justify-between">
                <div className={`p-2.5 ${kpi.bg} rounded-xl`}>
                  <kpi.icon size={20} className={kpi.color} />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${kpi.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {kpi.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {kpi.change}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-white tracking-tight">{kpi.value}</div>
                <div className="text-xs text-gray-400 mt-1">{kpi.label}</div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <GlassCard className="p-6 border-white/10 hover:border-blue-500/20 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-400" /> 
                  Revenue Overview
                </h3>
                <p className="text-xs text-gray-500 mt-1">Monthly revenue vs credit transactions</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full" />
                  <span className="text-xs text-gray-400">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full" />
                  <span className="text-xs text-gray-400">Credits</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.length > 0 ? chartData : [
                { month: 'No Data', revenue: 0, credits: 0 }
              ]}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="credGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 22, 41, 0.95)', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)',
                    padding: '12px'
                  }} 
                  labelStyle={{ color: '#9ca3af', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
                <Area type="monotone" dataKey="credits" stroke="#8b5cf6" strokeWidth={2} fill="url(#credGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6 border-white/10 hover:border-purple-500/20 transition-all duration-300 h-full">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
              <PieChart size={18} className="text-purple-400" /> 
              Quick Stats
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Total Transactions', value: transactions.length.toString(), icon: Activity, color: 'text-blue-400', change: '+18%' },
                { label: 'Avg. Transaction', value: transactions.length > 0 ? `LKR ${Math.round(transactions.reduce((acc, t) => acc + parseInt(t.amount.replace(/[^0-9]/g,'') || 0), 0) / transactions.length).toLocaleString()}` : 'LKR 0', icon: DollarSign, color: 'text-emerald-400', change: '+5%' },
                { label: 'Credit Pool', value: stats.activeCredits.toString(), icon: Coins, color: 'text-amber-400', change: '+12%' },
                { label: 'Active Users', value: stats.activeUsers.toString(), icon: Shield, color: 'text-purple-400', change: '+5%' },
              ].map((stat, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon size={14} className={stat.color} />
                    </div>
                    <div>
                      <span className="text-sm text-gray-300">{stat.label}</span>
                      <div className="text-[10px] text-gray-500">{stat.change} from last month</div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white">{stat.value}</span>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Recent Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <GlassCard className="p-6 border-white/10 hover:border-blue-500/20 transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity size={18} className="text-blue-400" /> 
                Recent Transactions
              </h3>
              <p className="text-xs text-gray-500 mt-1">Latest platform financial activities</p>
            </div>
            <div className="flex items-center gap-3">
              {transactions.length > 3 && (
                <button 
                  onClick={() => setShowAllTransactions(!showAllTransactions)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  {showAllTransactions ? 'Show Less' : 'View All'} 
                  <ChevronRight size={12} className={showAllTransactions ? 'rotate-90' : ''} />
                </button>
              )}
              <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                <Download size={12} />
                Export
              </button>
            </div>
          </div>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No transactions found. Start making sales to see data here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-white/5">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransactions.map((tx, idx) => (
                    <motion.tr 
                      key={tx.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + idx * 0.1 }}
                      className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                            {tx.avatar || 'U'}
                          </div>
                          <span className="text-sm text-white">{tx.user}</span>
                        </div>
                      </td>
                      <td className="py-3 text-sm font-medium text-white">{tx.amount}</td>
                      <td className="py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.type === 'Payout' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                          tx.type === 'Refund' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                          tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          tx.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          <CircleDot size={10} className={tx.status === 'Completed' ? 'text-emerald-400' : tx.status === 'Pending' ? 'text-amber-400' : 'text-red-400'} />
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-400 text-right flex items-center justify-end gap-1">
                        <Clock size={12} />
                        {tx.time}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}