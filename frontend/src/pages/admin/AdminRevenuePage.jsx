// frontend/src/pages/admin/AdminRevenuePage.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingUp, Users, BookOpen, Download,
  AlertCircle, RefreshCw, Activity, Loader2, CheckCircle,
  BarChart3, Search, CreditCard, FileText, XCircle,
  Clock, Calendar, Printer, User, Wallet
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import FinanceService from '../../services/financeService';
import PlanApprovals from '../../components/admin/PlanApprovals';
import PlanOrderManagement from '../../components/admin/PlanOrderManagement';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AdminNotifications from '../../components/admin/AdminNotifications';

const API_URL = 'http://localhost:5000/api';

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// Helper to strip HTML tags
const stripHtmlTags = (str) => {
  if (!str) return '';
  return String(str).replace(/<[^>]*>?/gm, '');
};

export default function AdminRevenuePage() {
  // ============================================
  // STATE
  // ============================================
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPayouts, setExportingPayouts] = useState(false);
  
  // All Transactions - Complete Ledger
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGateway, setFilterGateway] = useState('all');
  const [period, setPeriod] = useState('6m');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Revenue Stats - Only 5 cards
  const [stats, setStats] = useState({
    totalRevenue: 0,
    tutorPayouts: 0,
    platformShare: 0,
    avgPerExam: 0,
    successRate: 0,
  });
  
  // Chart Data
  const [chartData, setChartData] = useState([]);
  
  // Tutor Payouts Data
  const [payoutStats, setPayoutStats] = useState({
    totalTutorShare: 0,
    totalPlatformShare: 0,
    totalTokens: 0,
    totalTutors: 0,
    avgPerExam: 0,
  });
  
  // Full Payouts List for Report
  const [allPayouts, setAllPayouts] = useState([]);

  // ============================================
  // FORMAT HELPERS
  // ============================================
  const formatCurrency = (amount) => {
    if (!amount) return 'LKR 0';
    if (amount >= 1000000) return `LKR ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `LKR ${(amount / 1000).toFixed(1)}K`;
    return `LKR ${amount}`;
  };

  const formatCurrencyShort = (amount) => {
    if (!amount) return 'LKR 0';
    if (amount >= 1000000) return `LKR ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `LKR ${(amount / 1000).toFixed(0)}K`;
    return `LKR ${amount}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const dateFormatted = date.toLocaleDateString('en-CA');
      const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${dateFormatted} ${timeFormatted}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Success': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', label: 'Success' },
      'Completed': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', label: 'Completed' },
      'Failed': { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: 'Failed' },
      'Declined': { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: 'Declined' },
      'Pending': { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', label: 'Pending' },
      'Settled': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', label: 'Settled' },
    };
    return statusMap[status] || statusMap['Pending'];
  };

  // ============================================
  // ✅ EXPORT TUTOR PAYOUTS REPORT
  // ============================================
  const handleExportPayoutsReport = () => {
    if (allPayouts.length === 0) {
      alert("No tutor payout records available to export.");
      return;
    }

    setExportingPayouts(true);
    try {
      const doc = new jsPDF('landscape');
      const timestamp = new Date().toLocaleString();

      doc.setFillColor(15, 22, 41);
      doc.rect(0, 0, 297, 42, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('LANGOORA EDUCATIONAL PLATFORM', 14, 18);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text('Tutor Payouts Report', 14, 28);

      doc.setFontSize(8);
      doc.text(`Generated: ${timestamp}`, 220, 28);

      const pendingPayouts = allPayouts.filter(p => p.status === 'Pending' || p.status === 'pending');
      const settledPayouts = allPayouts.filter(p => p.status === 'Settled' || p.status === 'settled');
      const totalAmount = allPayouts.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const totalTutorShare = allPayouts.reduce((sum, p) => sum + (p.netPayout || p.tutorShare || 0), 0);
      const totalPlatformShare = allPayouts.reduce((sum, p) => sum + (p.platformShare || 0), 0);
      const totalTokens = allPayouts.reduce((sum, p) => sum + (p.totalTokens || 0), 0);
      const uniqueTutors = new Set(allPayouts.map(p => p.tutorId)).size;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, 47, 269, 14, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Total: ${allPayouts.length} | Pending: ${pendingPayouts.length} | Settled: ${settledPayouts.length} | Tutors: ${uniqueTutors} | Tokens: ${totalTokens} | Amount: LKR ${totalAmount.toLocaleString()}`, 20, 56);

      const tableRows = allPayouts.map(p => [
        p.tutorName || 'Unknown Tutor',
        p.tutorEmail || 'N/A',
        p.totalTokens || 0,
        `LKR ${(p.totalAmount || 0).toLocaleString()}`,
        `LKR ${(p.netPayout || p.tutorShare || 0).toLocaleString()}`,
        `LKR ${(p.platformShare || 0).toLocaleString()}`,
        p.status || 'Pending',
        formatDate(p.createdAt)
      ]);

      autoTable(doc, {
        startY: 66,
        head: [['Tutor', 'Email', 'Tokens', 'Total Amount', 'Tutor Share', 'Platform Share', 'Status', 'Date']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 40 },
          2: { cellWidth: 20 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 22 },
          7: { cellWidth: 30 },
        }
      });

      doc.save(`Langoora_Tutor_Payouts_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("Payouts PDF Export failed:", error);
      alert(`Failed to export payouts report: ${error.message}`);
    } finally {
      setExportingPayouts(false);
    }
  };

  // ============================================
  // ✅ EXPORT TRANSACTION LEDGER - FULL DATA
  // ============================================
  const handleExportPDF = () => {
    const dataToExport = allTransactions;
    
    if (dataToExport.length === 0) {
      alert("No transaction records available to export.");
      return;
    }

    setExporting(true);
    try {
      const doc = new jsPDF('landscape');
      const timestamp = new Date().toLocaleString();

      doc.setFillColor(15, 22, 41);
      doc.rect(0, 0, 297, 42, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('LANGOORA EDUCATIONAL PLATFORM', 14, 18);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text('Complete Transaction Ledger Report', 14, 28);

      doc.setFontSize(8);
      doc.text(`Generated: ${timestamp}`, 220, 28);

      const successfulTxs = dataToExport.filter(t => 
        t.status === 'Success' || t.status === 'Completed' || t.status === 'completed'
      );
      const totalRevenue = successfulTxs.reduce((sum, log) => sum + Number(log.amount || 0), 0);
      const failedCount = dataToExport.filter(t => 
        t.status === 'Failed' || t.status === 'Declined' || t.status === 'failed'
      ).length;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, 47, 269, 14, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Total Records: ${dataToExport.length}`, 20, 56);
      doc.text(`Successful: ${successfulTxs.length}`, 100, 56);
      doc.text(`Failed: ${failedCount}`, 180, 56);
      doc.text(`Total Revenue: LKR ${totalRevenue.toLocaleString()}`, 220, 56);

      const tableRows = dataToExport.map(t => [
        t.id || t.transactionId || 'N/A',
        t.user || t.student || 'Unknown',
        t.email || t.student_email || 'N/A',
        stripHtmlTags(t.planName || t.plan || t.exam || 'Standard'),
        `LKR ${Number(t.amount || 0).toLocaleString()}`,
        t.credits || t.credits_added || 0,
        t.gateway || t.paymentMethod || 'Card',
        t.status || 'Pending',
        formatDate(t.date || t.time || t.createdAt)
      ]);

      autoTable(doc, {
        startY: 66,
        head: [['Ref ID', 'Student', 'Email', 'Plan', 'Amount', 'Credits', 'Gateway', 'Status', 'Date & Time']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 22 },
          5: { cellWidth: 18 },
          6: { cellWidth: 20 },
          7: { cellWidth: 20 },
          8: { cellWidth: 30 },
        }
      });

      doc.save(`Langoora_Complete_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
      alert(`Failed to export PDF: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  // ============================================
  // FETCH ALL TRANSACTIONS
  // ============================================
  const fetchAllTransactions = async () => {
    try {
      console.log('📊 Fetching all transactions...');
      const data = await FinanceService.getAllTransactions();
      console.log('📊 All Transactions Response:', data?.length || 0);
      
      if (Array.isArray(data) && data.length > 0) {
        const formatted = data.map(t => ({
          id: t.ref || t.transaction_id || t.id || `TXN-${Date.now()}`,
          user: t.student || t.student_name || 'Unknown',
          email: t.email || t.student_email || 'N/A',
          planName: t.plan || t.plan_name || t.tier || 'Standard',
          amount: Number(t.amount || t.amount_paid || 0),
          credits: Number(t.credits || t.credits_added || 0),
          gateway: t.gateway || t.payment_method || 'Card Payment',
          status: t.status || 'Pending',
          date: t.timestamp || t.created_at || new Date().toISOString(),
          time: t.timestamp || t.created_at || new Date().toISOString(),
        }));
        return formatted;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch all transactions:', error);
      return [];
    }
  };

  // ============================================
  // FETCH TUTOR PAYOUTS
  // ============================================
  const fetchTutorPayouts = async () => {
    try {
      console.log('📊 Fetching tutor payouts...');
      
      const response = await axios.get(
        `${API_URL}/payouts/get-all`,
        getAuthConfig()
      );
      
      if (response.data.success) {
        const allPayouts = response.data.payouts || [];
        setAllPayouts(allPayouts);
        
        let totalTutorShare = 0;
        let totalPlatformShare = 0;
        let totalTokens = 0;
        let totalTutors = new Set();
        let totalExams = 0;
        
        allPayouts.forEach(p => {
          totalTutorShare += p.netPayout || p.tutorShare || 0;
          totalPlatformShare += p.platformShare || 0;
          totalTokens += p.totalTokens || 0;
          if (p.tutorId) totalTutors.add(p.tutorId);
          totalExams += p.paperCount || 0;
        });
        
        const avgPerExam = totalExams > 0 ? Math.round((totalTutorShare + totalPlatformShare) / totalExams) : 0;
        
        return {
          totalTutorShare: totalTutorShare,
          totalPlatformShare: totalPlatformShare,
          totalTokens: totalTokens,
          totalTutors: totalTutors.size,
          avgPerExam: avgPerExam,
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to fetch tutor payouts:', error);
      return null;
    }
  };

  // ============================================
  // FETCH ALL DATA
  // ============================================
  const fetchRevenueData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching revenue data...');

      const [statsResponse, chartResponse] = await Promise.all([
        FinanceService.getDashboardStats(),
        FinanceService.getRevenueChartData(),
      ]);

      console.log('📊 Stats Response:', statsResponse);
      console.log('📊 Chart Response:', chartResponse);

      const totalRevenue = statsResponse?.totalRevenue || 0;
      
      if (chartResponse && chartResponse.length > 0) {
        const formattedChartData = chartResponse.map(item => {
          const revenue = item.revenue || 0;
          const platformCommission = 0.20;
          return {
            month: item.month,
            revenue: revenue,
            platform: revenue * platformCommission,
            tutors: revenue * (1 - platformCommission),
          };
        });
        setChartData(formattedChartData);
      }

      const [transactionsData, payoutData] = await Promise.all([
        fetchAllTransactions(),
        fetchTutorPayouts(),
      ]);

      console.log('📊 Transactions Data:', transactionsData?.length || 0);
      console.log('📊 Payout Data:', payoutData);

      const successCount = transactionsData.filter(t => 
        t.status === 'Success' || t.status === 'Completed' || t.status === 'completed'
      ).length;
      const totalTxCount = transactionsData.length;
      const successRate = totalTxCount > 0 ? parseFloat(((successCount / totalTxCount) * 100).toFixed(1)) : 0;
      
      const tutorShare = payoutData?.totalTutorShare || 0;
      const platformShare = payoutData?.totalPlatformShare || 0;
      const avgPerExam = payoutData?.avgPerExam || 0;
      const totalTutors = payoutData?.totalTutors || 0;
      const totalTokens = payoutData?.totalTokens || 0;
      
      setStats({
        totalRevenue: totalRevenue,
        tutorPayouts: tutorShare,
        platformShare: platformShare,
        avgPerExam: avgPerExam,
        successRate: successRate,
      });

      setPayoutStats({
        totalTutorShare: tutorShare,
        totalPlatformShare: platformShare,
        totalTokens: totalTokens,
        totalTutors: totalTutors,
        avgPerExam: avgPerExam,
      });

      setAllTransactions(transactionsData);
      setFilteredTransactions(transactionsData.slice(0, 10));

    } catch (error) {
      console.error('❌ Failed to fetch revenue data:', error);
      setError('Failed to load revenue data. Please refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  // ============================================
  // REFRESH
  // ============================================
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRevenueData();
  };

  // ============================================
  // TABS CONFIGURATION
  // ============================================
  const tabs = [
    { 
      id: 'overview', 
      label: 'Revenue Analytics', 
      icon: DollarSign,
      description: 'Platform financial overview and breakdowns'
    },
    { 
      id: 'approvals', 
      label: 'Plan Approvals', 
      icon: AlertCircle,
      description: 'Review and approve subscription plans'
    },
    { 
      id: 'order', 
      label: 'Plan Order', 
      icon: TrendingUp,
      description: 'Manage subscription plan display order'
    },
  ];

  // ============================================
  // RENDER OVERVIEW TAB
  // ============================================
  const renderOverview = () => (
    <div className="space-y-8">
      {/* 5 Cards Only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { 
            label: 'Total Revenue', 
            value: loading ? '...' : formatCurrency(stats.totalRevenue), 
            icon: DollarSign, 
            color: 'text-green-400',
            sub: 'From subscriptions'
          },
          { 
            label: 'Tutor Payouts', 
            value: loading ? '...' : formatCurrency(stats.tutorPayouts), 
            icon: Users, 
            color: 'text-cyan-400',
            sub: `${payoutStats.totalTutors || 0} tutors`
          },
          { 
            label: 'Platform Share', 
            value: loading ? '...' : formatCurrency(stats.platformShare), 
            icon: TrendingUp, 
            color: 'text-blue-400',
            sub: '20% commission'
          },
          { 
            label: 'Avg. per Exam', 
            value: loading ? '...' : formatCurrency(stats.avgPerExam), 
            icon: BookOpen, 
            color: 'text-amber-400',
            sub: `${payoutStats.totalTokens || 0} tokens`
          },
          { 
            label: 'Success Rate', 
            value: loading ? '...' : `${stats.successRate}%`, 
            icon: CheckCircle, 
            color: 'text-emerald-400',
            sub: 'Transaction success'
          },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="p-4 border-white/10">
              <div className="flex items-center justify-between">
                <s.icon size={18} className={s.color} />
                {s.sub && (
                  <span className="text-[9px] font-medium text-gray-400">
                    {s.sub}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white mt-1">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Date Filter */}
      <GlassCard className="p-4 border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {[
              { label: '7D', value: '7d' },
              { label: '1M', value: '1m' },
              { label: '3M', value: '3m' },
              { label: '6M', value: '6m' },
              { label: '1Y', value: '1y' },
              { label: 'All', value: 'all' },
            ].map(p => (
              <button 
                key={p.value} 
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === p.value 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" 
            />
            <span className="text-gray-500 text-xs">to</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" 
            />
          </div>
        </div>
      </GlassCard>

      {/* Revenue Chart */}
      <GlassCard className="p-6 border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-400" /> 
            Revenue Breakdown
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Total: {loading ? '...' : formatCurrencyShort(stats.totalRevenue)}
            </span>
          </div>
        </div>
        
        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-blue-400" />
              <span className="text-gray-400 text-sm">Loading chart data...</span>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-gray-500 text-sm">
            <Activity size={32} className="text-gray-600 mb-2" />
            <p>No revenue data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} 
                formatter={(v, name) => {
                  if (name === 'tutors') return [`LKR ${v ? v.toLocaleString() : '0'}`, 'Tutor Payouts (80%)'];
                  if (name === 'platform') return [`LKR ${v ? v.toLocaleString() : '0'}`, 'Platform Share (20%)'];
                  return [`LKR ${v ? v.toLocaleString() : '0'}`, name];
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar dataKey="tutors" fill="#3b82f6" radius={[4,4,0,0]} name="Tutor Payouts" stackId="a" />
              <Bar dataKey="platform" fill="#06b6d4" radius={[4,4,0,0]} name="Platform Share" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        )}
        
        {!loading && chartData.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-6 text-[10px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Tutor Payouts (80%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-cyan-400" />
              <span>Platform Share (20%)</span>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Transaction Table - Latest 10 Only */}
      <GlassCard className="p-6 border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText size={18} className="text-blue-400" /> 
              Recent Transactions
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Showing latest {filteredTransactions.length} of {allTransactions.length} transactions
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge color="blue">{allTransactions.length} Total</Badge>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm animate-pulse">
            <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-400" />
            <p>Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            <FileText size={32} className="text-gray-600 mx-auto mb-2" />
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-3 py-3 text-left text-[10px] font-medium text-gray-400">Ref ID</th>
                  <th className="px-3 py-3 text-left text-[10px] font-medium text-gray-400">Student</th>
                  <th className="px-3 py-3 text-left text-[10px] font-medium text-gray-400">Plan</th>
                  <th className="px-3 py-3 text-right text-[10px] font-medium text-gray-400">Amount</th>
                  <th className="px-3 py-3 text-center text-[10px] font-medium text-gray-400">Credits</th>
                  <th className="px-3 py-3 text-left text-[10px] font-medium text-gray-400">Gateway</th>
                  <th className="px-3 py-3 text-left text-[10px] font-medium text-gray-400">Status</th>
                  <th className="px-3 py-3 text-left text-[10px] font-medium text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map((t, i) => {
                  const statusConfig = getStatusBadge(t.status);
                  return (
                    <tr key={t.id || i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-3 text-[11px] text-blue-400 font-mono select-all">{t.id}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{t.user}</span>
                          <span className="text-[10px] text-gray-500">{t.email !== 'N/A' ? t.email : ''}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-300">{stripHtmlTags(t.planName)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-400">LKR {Number(t.amount).toLocaleString()}</td>
                      <td className="px-3 py-3 text-center text-xs text-amber-400 font-medium">+{t.credits}</td>
                      <td className="px-3 py-3 text-xs text-gray-300">{t.gateway}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${statusConfig.bg} border ${statusConfig.border} rounded-lg text-[10px] font-semibold ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-gray-500">{formatDate(t.date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Tutor Payouts Report - Table + Export Button Only */}
      <GlassCard className="p-6 border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wallet size={18} className="text-cyan-400" /> 
              Tutor Payouts Report
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {allPayouts.length} payout records
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge color="cyan">{allPayouts.length} Records</Badge>
          </div>
        </div>

        {allPayouts.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            <Wallet size={32} className="text-gray-600 mx-auto mb-2" />
            <p>No tutor payout records available</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-[#0f1629]">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-400">Tutor</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-400">Tokens</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-400">Amount</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-400">Tutor Share</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-400">Platform</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-400">Status</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allPayouts.map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-xs text-gray-300">{p.tutorName || 'Unknown'}</td>
                    <td className="px-3 py-2 text-xs text-white">{p.totalTokens || 0}</td>
                    <td className="px-3 py-2 text-xs text-emerald-400 text-right">{formatCurrencyShort(p.totalAmount)}</td>
                    <td className="px-3 py-2 text-xs text-cyan-400 text-right">{formatCurrencyShort(p.netPayout || p.tutorShare)}</td>
                    <td className="px-3 py-2 text-xs text-blue-400 text-right">{formatCurrencyShort(p.platformShare)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${p.status === 'Settled' || p.status === 'settled' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {p.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );

  // ============================================
  // RENDER APPROVALS TAB
  // ============================================
  const renderApprovals = () => <PlanApprovals />;

  // ============================================
  // RENDER ORDER TAB
  // ============================================
  const renderOrder = () => <PlanOrderManagement />;

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="space-y-8">
      {/* Header with Bell and Export Buttons */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {activeTab === 'overview' ? 'Revenue Analytics' : 
               activeTab === 'approvals' ? 'Plan Approvals' : 'Plan Order Management'}
            </h1>
            <p className="text-gray-400 mt-1">
              {activeTab === 'overview' 
                ? 'Platform revenue from transactions and tutor payouts' 
                : activeTab === 'approvals'
                ? 'Review and approve subscription plans created by finance team'
                : 'Drag and drop to reorder subscription plans on landing and pricing pages'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* ✅ Notification Bell - Same level as Export buttons */}
            <AdminNotifications />
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>

            <div className="w-px h-8 bg-white/10 hidden sm:block" />

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={exporting || allTransactions.length === 0}
              onClick={handleExportPDF}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-xl text-white text-sm font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Generating...' : 'Export Transactions'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={exportingPayouts || allPayouts.length === 0}
              onClick={handleExportPayoutsReport}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 rounded-xl text-white text-sm font-medium shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
            >
              {exportingPayouts ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              {exportingPayouts ? 'Generating...' : 'Export Payouts'}
            </motion.button>
          </div>
        </div>
        
        {error && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-400 bg-white/3' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div 
        key={activeTab} 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'approvals' && renderApprovals()}
        {activeTab === 'order' && renderOrder()}
      </motion.div>
    </div>
  );
}