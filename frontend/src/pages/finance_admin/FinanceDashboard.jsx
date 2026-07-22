import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  DollarSign, Activity, Wallet, TrendingUp, Sparkles, Calendar, Zap, 
  ChevronRight, Clock, ArrowUpRight, ArrowDownRight, PieChart, Coins, 
  Shield, Loader2, Crown, CheckCircle, Award 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FinanceService from '../../services/financeService'; 
import SubscriptionService from '../../services/subscriptionService';
import GlassCard from '../../components/ui/GlassCard';

export default function FinanceDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({ 
    totalRevenue: 'LKR 0', 
    rawRevenue: 0,
    activeCredits: '0', 
    growth: 0,
    activeUsers: 0,
    totalTxCount: 0,
    avgTransaction: 'LKR 0'
  });

  const [plansMetrics, setPlansMetrics] = useState({ totalPlans: 0, activePlans: 0 });
  const [examMetrics, setExamMetrics] = useState({ totalCategories: 0, totalCreditsPool: 0 });

  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  const kpiData = [
    { label: 'Total Revenue', value: stats.totalRevenue, icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: 'up', change: '+12%' },
    { label: 'Active Credits', value: stats.activeCredits, icon: Wallet, color: 'text-purple-400', bg: 'bg-purple-500/10', trend: 'up', change: '+8%' },
    { label: 'Growth', value: `${stats.growth}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: 'up', change: '+5%' },
    { label: 'Active Users', value: stats.activeUsers.toString(), icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10', trend: 'up', change: '+5%' }
  ];

  const secondaryKpiData = [
    { label: 'Total Plans', value: plansMetrics.totalPlans.toString(), icon: Crown, color: 'text-purple-400', bg: 'bg-purple-500/10', change: 'Tiers' },
    { label: 'Active Plans', value: plansMetrics.activePlans.toString(), icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', change: 'Active' },
    { label: 'Exam Categories', value: examMetrics.totalCategories.toString(), icon: Award, color: 'text-blue-400', bg: 'bg-blue-500/10', change: 'Subjects' },
    { label: 'Total Credits Pool', value: examMetrics.totalCreditsPool.toString(), icon: Coins, color: 'text-amber-400', bg: 'bg-amber-500/10', change: 'Pool Weight' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, txData, allTxData, chartDataRes, plansData, categoriesData] = await Promise.all([
          FinanceService.getDashboardStats().catch(() => null),
          FinanceService.getRecentTransactions().catch(() => []),
          FinanceService.getAllTransactions().catch(() => []),
          FinanceService.getRevenueChartData().catch(() => []),
          SubscriptionService.getAllPlans().catch(() => []),
          SubscriptionService.getAllCategories().catch(() => [])
        ]);

        const revenueVal = statsData?.totalRevenue !== undefined ? statsData.totalRevenue : 0;

        setStats({
          totalRevenue: statsData?.totalRevenue !== undefined ? `LKR ${statsData.totalRevenue.toLocaleString()}` : 'LKR 0',
          rawRevenue: revenueVal,
          activeCredits: statsData?.activeCredits?.toString() || '0',
          growth: statsData?.growth || 0,
          activeUsers: statsData?.activeUsers || 0,
          totalTxCount: statsData?.totalTxCount || (Array.isArray(allTxData) ? allTxData.length : 0),
          avgTransaction: statsData?.avgTransaction !== undefined ? `LKR ${statsData.avgTransaction.toLocaleString()}` : 'LKR 0'
        });

        const safePlans = Array.isArray(plansData) ? plansData : [];
        setPlansMetrics({
          totalPlans: safePlans.length,
          activePlans: safePlans.filter(p => p.active !== false).length
        });

        const safeCategories = Array.isArray(categoriesData) ? categoriesData : [];
        const uniqueCatIds = [...new Set(safeCategories.map(c => c.categoryId || c.id))];
        const totalPool = safeCategories.reduce((acc, cat) => acc + (parseInt(cat.credits) || 0), 0);

        setExamMetrics({
          totalCategories: uniqueCatIds.length || safeCategories.length,
          totalCreditsPool: totalPool
        });

        setTransactions(txData || []);
        setChartData(chartDataRes || []);
      } catch (err) {
        console.error("Data load failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();

      doc.setFillColor(15, 22, 41);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('LANGOORA EDUCATIONAL PLATFORM', 14, 20);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text('Financial Overview & Revenue Analytics Report', 14, 30);

      doc.setFontSize(9);
      doc.text(`Generated Date: ${timestamp}`, 135, 30);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('1. Executive Financial Summary', 14, 52);

      const summaryData = [
        ['Metric Description', 'Value'],
        ['Total Cumulative Revenue', stats.totalRevenue],
        ['Active Credits Pool', `${stats.activeCredits} Credits`],
        ['Month-over-Month Growth', `${stats.growth}%`],
        ['Active System Users', `${stats.activeUsers} Users`],
        ['Total Subscription Plans', plansMetrics.totalPlans.toString()],
        ['Active Subscription Plans', plansMetrics.activePlans.toString()],
        ['Exam Categories', examMetrics.totalCategories.toString()],
      ];

      autoTable(doc, {
        startY: 57,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 }
      });

      let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 120;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('2. Recent Platform Transactions', 14, finalY);

      const txTableRows = transactions.map(tx => [
        tx.user || 'Unknown User',
        tx.planName || 'Plan',
        tx.amount || 'LKR 0',
        `+${tx.credits || 0} Credits`,
        tx.type || 'Subscription',
        tx.time || 'N/A'
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Student / User', 'Plan', 'Amount', 'Credits Added', 'Type', 'Date & Time']],
        body: txTableRows.length > 0 ? txTableRows : [['No recent transactions recorded', '-', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] },
        styles: { fontSize: 9 }
      });

      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('Confidential Document - Internal Finance Administration Langoora Platform', 14, 285);

      doc.save(`Langoora_Finance_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
      alert(`Failed to export PDF report: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const displayedTransactions = transactions.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Financial Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-gray-100 font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative">
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
            <button 
              onClick={handleExportPDF}
              disabled={exporting}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all duration-300 flex items-center gap-2 cursor-pointer border border-white/10 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {exporting ? 'Generating PDF...' : 'Export Report'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Row 1 KPIs */}
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

      {/* Row 2 Compact KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {secondaryKpiData.map((kpi, index) => (
          <motion.div key={`sec-${index}`} className="relative group">
            <GlassCard className="p-3.5 border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 ${kpi.bg} rounded-lg shrink-0`}>
                    <kpi.icon size={16} className={kpi.color} />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-white tracking-tight leading-none">
                      {kpi.value}
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium mt-1">
                      {kpi.label}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-white/5 text-gray-400 border border-white/5 uppercase tracking-wider">
                  {kpi.change}
                </span>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <GlassCard className="p-6 border-white/10 hover:border-blue-500/20 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-400" /> Revenue Overview
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

            {/* 🎯 Updated AreaChart with Formatted Tooltip and Y-Axis */}
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.length > 0 ? chartData : [{ month: 'No Data', revenue: 0, credits: 0 }]}>
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
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 12 }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `LKR ${val.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? `LKR ${Number(value).toLocaleString()}` : `${value} Credits`,
                    name === 'revenue' ? 'Revenue' : 'Credits'
                  ]}
                  contentStyle={{ 
                    background: 'rgba(15, 22, 41, 0.95)', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    borderRadius: '12px',
                    padding: '12px'
                  }} 
                />
                <Area type="monotone" name="revenue" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
                <Area type="monotone" name="credits" dataKey="credits" stroke="#8b5cf6" strokeWidth={2} fill="url(#credGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>

        {/* 🎯 Quick Stats Section with Live Data */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <GlassCard className="p-6 border-white/10 hover:border-purple-500/20 transition-all duration-300 h-full">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
              <PieChart size={18} className="text-purple-400" /> Quick Stats
            </h3>
            <div className="space-y-4">
              {[
                { 
                  label: 'Total Transactions', 
                  value: stats.totalTxCount.toString(), 
                  icon: Activity, 
                  color: 'text-blue-400', 
                  change: `${stats.growth}% MoM Growth` 
                },
                { 
                  label: 'Avg. Transaction', 
                  value: stats.avgTransaction, 
                  icon: DollarSign, 
                  color: 'text-emerald-400', 
                  change: 'Based on Revenue' 
                },
                { 
                  label: 'Credit Pool', 
                  value: stats.activeCredits.toString(), 
                  icon: Coins, 
                  color: 'text-amber-400', 
                  change: 'System Pool Weight' 
                },
                { 
                  label: 'Active Users', 
                  value: stats.activeUsers.toString(), 
                  icon: Shield, 
                  color: 'text-purple-400', 
                  change: 'Students & Tutors' 
                },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300 group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5">
                      <stat.icon size={16} className={stat.color} />
                    </div>
                    <div>
                      <span className="text-sm text-gray-300 font-medium">{stat.label}</span>
                      <div className="text-[10px] text-gray-400 mt-0.5">{stat.change}</div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white">{stat.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Recent Transactions Table Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <GlassCard className="p-6 border-white/10 hover:border-blue-500/20 transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity size={18} className="text-blue-400" /> Recent Transactions
              </h3>
              <p className="text-xs text-gray-500 mt-1">Latest platform subscription purchases and payments</p>
            </div>
            
            <button 
              onClick={() => navigate('/finance-admin/ledger')} 
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>

          {displayedTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-white/5">
                    <th className="pb-3 font-medium">Student / User</th>
                    <th className="pb-3 font-medium">Plan</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Credits Added</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium text-right">Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransactions.map((tx, idx) => (
                    <tr key={tx.id || idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                            {tx.avatar || 'U'}
                          </div>
                          <span className="text-sm font-medium text-white">{tx.user}</span>
                        </div>
                      </td>
                      <td className="py-3 text-sm font-semibold text-purple-300">{tx.planName || 'Custom'}</td>
                      <td className="py-3 text-sm font-bold text-emerald-400">{tx.amount}</td>
                      <td className="py-3 text-sm text-gray-300">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                          +{tx.credits || 0} Credits
                        </span>
                      </td>
                      <td className="py-3 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-400 text-right flex items-center justify-end gap-1">
                        <Clock size={12} /> {tx.time}
                      </td>
                    </tr>
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