import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Download, CheckCircle, XCircle, Clock, AlertCircle, Printer,
  Activity, DollarSign, CreditCard, TrendingUp, Crown, Copy, Loader2
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { getRates } from '../../services/globalConfigService';
import { createPayout, getActiveTutors } from '../../services/payoutService';

const EXCHANGE_RATE = 20.00;
const PLATFORM_COMMISSION = 0.20;

export default function TutorPayoutsPage() {
  const [creditRate, setCreditRate] = useState(EXCHANGE_RATE);
  const [platformCommission, setPlatformCommission] = useState(PLATFORM_COMMISSION);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGateway, setFilterGateway] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // ============================================
  // ⭐ OPTIMIZED SINGLE FETCH FUNCTION
  // ============================================
  const fetchLedgerData = useCallback(async () => {
    setLoading(true);
    try {
      // Direct Axios duplicate call එක අයින් කර FinanceService එක විතරක් භාවිත කර ඇත.
      const data = await FinanceService.getAllTransactions();
      const rawLogs = Array.isArray(data) ? data : [];
      
      const transformedLogs = rawLogs.map(tx => ({
        ref: tx.id || tx.transactionId || tx.ref || `TXN-${Date.now()}`,
        student: tx.student_name || tx.userName || tx.student || tx.user || 'Unknown Student',
        tier: tx.plan || tx.subscriptionType || 'Standard Plan',
        amount: Number(tx.amount || 0),
        gateway: tx.gateway || tx.paymentMethod || 'Stripe',
        status: tx.status || 'Pending',
        timestamp: tx.created_at || tx.createdAt || tx.timestamp || new Date().toISOString(),
        email: tx.email || tx.student_email || 'N/A',
        plan: tx.plan || tx.subscriptionType || 'Standard Plan',
        credits: tx.credits || 0,
        transactionId: tx.id || tx.transactionId
      }));

      setLogs(transformedLogs);
    } catch (error) {
      console.error("Failed to load transaction audit logs:", error);
      setLogs([]);
    } finally { // Fixed fontFinally typo
      setLoading(false);
    }
  }, []);

  // Run initial fetch ONCE on mount
  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  // SUMMARY STATS
  const totalTransactions = logs.length;
  const totalRevenue = logs.reduce((sum, log) => sum + (log.status === 'Success' || log.status === 'Completed' ? Number(log.amount || 0) : 0), 0);
  const successCount = logs.filter(l => l.status === 'Success' || l.status === 'Completed').length;
  const successRate = totalTransactions > 0 ? ((successCount / totalTransactions) * 100).toFixed(1) : '0.0';
  const failedCount = logs.filter(l => l.status === 'Failed' || l.status === 'Declined').length;

  // SEARCH & FILTERS
  const filteredLogs = logs.filter(log => {
    const matchSearch = (log.student || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (log.ref || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (log.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || (log.status || '').toLowerCase() === filterStatus.toLowerCase();
    const matchGateway = filterGateway === 'all' || (log.gateway || '').toLowerCase().includes(filterGateway.toLowerCase());
    return matchSearch && matchStatus && matchGateway;
  });

  const getStatusConfig = (status) => {
    const statusMap = {
      'Success': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle, label: 'Success' },
      'Completed': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle, label: 'Completed' },
      'Failed': { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Failed' },
      'Declined': { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Declined' },
      'Pending': { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: Clock, label: 'Pending' },
      'Error': { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Error' }
    };
    return statusMap[status] || statusMap['Pending'];
  };

  // ⭐ Get declined count
  useEffect(() => {
    const fetchDeclinedCount = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const response = await axios.get(`${API_URL}/api/payouts/declined`);
        if (response.data && response.data.success) {
          setDeclinedCount(response.data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching declined count:', error);
      }
    };
    fetchDeclinedCount();
  }, []);

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

  const handleExportPDF = () => {
    if (filteredLogs.length === 0) return alert("No transaction records available to export.");

    setExporting(true);
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();

      doc.setFillColor(15, 22, 41);
      doc.rect(0, 0, 210, 42, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('LANGOORA EDUCATIONAL PLATFORM', 14, 18);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text('Transaction Ledger Audit & Financial Statement', 14, 28);

      doc.setFontSize(8);
      doc.text(`Generated: ${timestamp}`, 140, 28);

      const successfulTxs = filteredLogs.filter(t => t.status === 'Success' || t.status === 'Completed');
      const filteredRev = successfulTxs.reduce((sum, log) => sum + Number(log.amount || 0), 0);

      doc.setFillColor(241, 245, 249);
      doc.rect(14, 47, 182, 14, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Total Records: ${filteredLogs.length}`, 20, 56);
      doc.text(`Successful Sales: ${successfulTxs.length}`, 80, 56);
      doc.text(`Total Revenue: LKR ${filteredRev.toLocaleString()}`, 140, 56);

      const tableRows = filteredLogs.map(l => [
        l.ref || 'N/A',
        l.student || 'Unknown',
        l.plan || 'Standard',
        `LKR ${Number(l.amount || 0).toLocaleString()}`,
        `+${l.credits || 0} c`,
        l.gateway || 'Card',
        l.status || 'Pending',
        formatDate(l.timestamp)
      ]);

      autoTable(doc, {
        startY: 66,
        head: [['Reference ID', 'Student', 'Plan', 'Amount', 'Credits', 'Gateway', 'Status', 'Date & Time']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3.5 },
        columnStyles: {
          0: { cellWidth: 32, fontStyle: 'bold' },
          1: { cellWidth: 32 },
          2: { cellWidth: 20 },
          3: { cellWidth: 24, fontStyle: 'bold' },
          4: { cellWidth: 16 },
          5: { cellWidth: 20 },
          6: { cellWidth: 18 },
          7: { cellWidth: 20 }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 6) {
            if (data.cell.raw === 'Success' || data.cell.raw === 'Completed') {
              data.cell.styles.textColor = [16, 185, 129];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw === 'Failed' || data.cell.raw === 'Declined') {
              data.cell.styles.textColor = [239, 68, 68];
              data.cell.styles.fontStyle = 'bold';
            } else {
              setTutors(prevTutors => prevTutors.filter(t => t.id !== tutorId));
              console.log('❌ Payout declined');
            }
          }
        }
      }

    } catch (error) {
      console.error('Error processing payout:', error);
      alert('Error processing payout: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  // ⭐ Delete declined payout
  const handleDeleteDeclined = async (id) => {
    if (!confirm('Delete this declined payout?')) return;
    try {
      setProcessingId(id);
      const API_URL = import.meta.env.VITE_API_URL || '';
      await axios.delete(`${API_URL}/api/payouts/${id}`);
      setTutors(tutors.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setProcessingId(null);
    }
  };

  // ⭐ Clear all declined
  const clearAllDeclined = async () => {
    if (!confirm(`Delete all ${declinedCount} declined payouts?`)) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await axios.get(`${API_URL}/api/payouts/declined`);
      if (response.data && response.data.success) {
        const declinedIds = response.data.payouts.map(p => p.id);
        for (const id of declinedIds) {
          await axios.delete(`${API_URL}/api/payouts/${id}`);
        }
        setDeclinedCount(0);
        alert(`Deleted ${declinedIds.length} declined payouts`);
      }
    } catch (error) {
      console.error('Error deleting declined:', error);
    }
  };

  // ⭐ Add new payout using payoutService
  const handleAddPayout = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const result = await createPayout({
        tutorId: newPayout.tutorId,
        tutorName: newPayout.tutorName,
        totalTokens: parseInt(newPayout.totalTokens) || 0,
        netPayout: parseFloat(newPayout.netPayout) || 0,
        bankName: newPayout.bankName || 'Not Specified',
        accountNo: newPayout.accountNo || 'N/A',
        tutorEmail: newPayout.tutorEmail || '',
        tutorPhone: newPayout.tutorPhone || '',
        university: newPayout.university || '',
        qualifications: newPayout.qualifications || ''
      });

      if (result && result.success) {
        alert('✅ Payout added successfully!');
        setShowAddModal(false);
        setNewPayout({
          tutorId: '',
          tutorName: '',
          totalTokens: '',
          netPayout: '',
          bankName: '',
          accountNo: '',
          tutorEmail: '',
          tutorPhone: '',
          university: '',
          qualifications: ''
        });
        fetchTutors();
      } else {
        alert('❌ Failed to add payout');
      }
    } catch (error) {
      console.error('Error adding payout:', error);
      alert('❌ Failed to add payout: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ⭐ Statistics
  const pendingCount = tutors.filter(t => t.status === 'Pending').length;
  const settledCount = tutors.filter(t => t.status === 'Settled').length;
  const totalTokensAll = tutors.reduce((sum, t) => sum + (t.totalTokens || 0), 0);
  const totalPayout = tutors.reduce((sum, t) => sum + (t.netPayout || 0), 0);

  console.log('📊 UI Stats:', { pendingCount, settledCount, totalTokensAll });

  // ⭐ Filter logic
  const filteredTutors = tutors.filter(t => {
    if (t.status === 'Declined') return false;
    const matchFilter = filter === 'all' || t.status.toLowerCase() === filter.toLowerCase();
    const matchSearch = (t.tutor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (t.bank || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  // ⭐ Status config
  const getStatusConfig = (status) => {
    const configs = {
      'Pending': { 
        color: '#f59e0b', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        icon: Clock,
      },
      'Settled': { 
        color: '#10b981', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        icon: CheckCircle,
      }
    };
    return configs[status] || configs['Pending'];
  };

  // ⭐ Loading
  if (loading || settingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <RefreshCw size={40} className="animate-spin text-emerald-400" />
        <p className="text-gray-400">Loading tutor data from database...</p>
      </div>
    );
  }

  // ⭐ Render
  return (
    <div className="space-y-6 font-sans">
      {/* HERO HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="border-b border-white/5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono tracking-widest uppercase px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-extrabold">
            Auditing Core Engine
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Financial Ledger Audit</h1>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl font-medium">Immutable historic system tracking data logs for user real-money subscription execution nodes.</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono">{logs.length} total transactions</span>
          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">live data</span>
        </div>
      </motion.div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tokens', value: totalTokensAll.toLocaleString(), icon: Star, color: 'text-amber-400' },
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-amber-400' },
          { label: 'Settled', value: settledCount, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Total Credits Used', value: transactions.totalCredits?.toLocaleString() || 0, icon: Coins, color: 'text-purple-400' },
        ].map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
            <GlassCard className="p-5 border-white/10 hover:border-blue-500/30 transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 ${stat.bg} rounded-xl`}><stat.icon size={20} className={stat.color} /></div>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="mt-2"><div className="text-2xl font-bold text-white">{stat.value}</div></div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* CONVERSION RATE */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <GlassCard className="p-4 border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <Percent size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase">Exchange Rate</p>
                  <p className="text-base font-bold text-white">1 Credit = LKR {creditRate.toFixed(2)}</p>
                </div>
              </div>
              <div className="hidden md:block w-px h-10 bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <Shield size={18} className="text-rose-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase">Platform Commission</p>
                  <p className="text-base font-bold text-white">{(platformCommission * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div className="hidden md:block w-px h-10 bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <DollarSign size={18} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase">Total Payout</p>
                  <p className="text-base font-bold text-white">LKR {totalPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search student, ref or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:outline-none transition-all duration-300 w-72"
            />
          </div>
          <div className="flex gap-1.5 bg-white/5 rounded-xl p-1 border border-white/10">
            {['All', 'Pending', 'Settled'].map((status) => (
              <motion.button
                key={status}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilter(status.toLowerCase())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                  filter === status.toLowerCase()
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {status}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{filteredLogs.length} transactions</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-300 flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <Printer size={16} /> Print
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={exporting}
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-xl text-white text-sm font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting ? 'Generating PDF...' : 'Export PDF'}
          </motion.button>
        </div>
      </div>

      {/* LEDGER TABLE */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-0 border-white/10 overflow-hidden hover:border-blue-500/20 transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/10">
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Reference</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Plan</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Gateway</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log, index) => {
                      const statusConfig = getStatusConfig(log.status);
                      const StatusIcon = statusConfig.icon;

                      return (
                        <motion.tr
                          key={log.ref || index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-white/[0.02] transition-all duration-300 group"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-bold text-blue-400">{log.ref}</span>
                              <button onClick={() => copyToClipboard(log.ref)} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Copy size={14} className="text-gray-500 hover:text-white" />
                              </button>
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{formatDate(log.timestamp)}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div>
                              <div className="text-sm font-semibold text-white">{log.student}</div>
                              <div className="text-xs text-gray-400">{log.email || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Crown size={16} className="text-amber-400" />
                              <span className="text-sm font-medium text-white">{log.plan || 'Standard'}</span>
                              {log.credits > 0 && <span className="text-xs text-gray-400">({log.credits}c)</span>}
                            </div>
                          </td>
                          <td className="px-5 py-4"><span className="text-sm font-bold text-white">LKR {Number(log.amount || 0).toLocaleString()}</span></td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <CreditCard size={16} className="text-gray-400" />
                              <span className="text-sm text-gray-300">{log.gateway || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${statusConfig.bg} border ${statusConfig.border} rounded-lg`}>
                              <StatusIcon size={14} className={statusConfig.text} />
                              <span className={`text-xs font-bold ${statusConfig.text}`}>{statusConfig.label}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => { setSelectedLog(log); setShowModal(true); }}
                              className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Search size={16} className="text-gray-400 hover:text-white" />
                            </motion.button>
                          </td>
                        </motion.tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-5 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-6 bg-white/5 rounded-full"><Search size={48} className="text-gray-500" /></div>
                          <h3 className="text-lg font-semibold text-white">No Transactions Found</h3>
                          <p className="text-sm text-gray-400">There are no real transactions recorded in the system yet.</p>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{tutor.tutor}</h3>
                          <p className="text-xs text-gray-400 font-mono">{tutor.id}</p>
                          {tutor.email && (
                            <p className="text-[10px] text-gray-500">{tutor.email}</p>
                          )}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 ${statusConfig.bg} rounded-lg border ${statusConfig.border}`}>
                        <StatusIcon size={13} className={statusConfig.text} />
                        <span className={`text-xs font-bold ${statusConfig.text}`}>{tutor.status}</span>
                      </div>
                    </div>

          <div className="px-5 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="text-xs text-gray-400">Showing {filteredLogs.length} of {logs.length} transactions</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" /><span className="text-xs text-gray-400">Success</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-400 rounded-full" /><span className="text-xs text-gray-400">Failed</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-400 rounded-full" /><span className="text-xs text-gray-400">Pending</span></div>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <GlassCard className="p-12 text-center border-white/10">
              <div className="flex flex-col items-center gap-3">
                <div className="p-5 bg-white/5 rounded-full">
                  <Users size={40} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">No Active Tutors Found</h3>
                <p className="text-sm text-gray-400">
                  {searchTerm ? 'Try adjusting your search' : 'No pending or settled payouts'}
                </p>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⭐ ADD PAYOUT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0a1628] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">Transaction Details</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-2">{selectedLog.ref}</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white cursor-pointer">✕</button>
              </div>
              
              <form onSubmit={handleAddPayout} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Tutor ID *</label>
                  <input
                    type="text"
                    value={newPayout.tutorId}
                    onChange={(e) => setNewPayout({...newPayout, tutorId: e.target.value})}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="Enter tutor ID"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Tutor Name *</label>
                  <input
                    type="text"
                    value={newPayout.tutorName}
                    onChange={(e) => setNewPayout({...newPayout, tutorName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="Enter tutor name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Plan</p>
                    <p className="text-base font-bold text-white mt-1">{selectedLog.plan || 'Standard'}</p>
                    {selectedLog.credits > 0 && <p className="text-sm text-gray-400">{selectedLog.credits} Credits</p>}
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Amount</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">LKR {Number(selectedLog.amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Gateway</p>
                    <p className="text-base font-semibold text-white mt-1">{selectedLog.gateway || 'N/A'}</p>
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Status</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${getStatusConfig(selectedLog.status).bg} border ${getStatusConfig(selectedLog.status).border} rounded-lg`}>
                        {selectedLog.status === 'Success' && <CheckCircle size={14} className="text-emerald-400" />}
                        {selectedLog.status === 'Completed' && <CheckCircle size={14} className="text-emerald-400" />}
                        {selectedLog.status === 'Failed' && <XCircle size={14} className="text-red-400" />}
                        {selectedLog.status === 'Declined' && <XCircle size={14} className="text-red-400" />}
                        {selectedLog.status === 'Pending' && <Clock size={14} className="text-amber-400" />}
                        {selectedLog.status === 'Error' && <XCircle size={14} className="text-red-400" />}
                        <span className={`text-sm font-bold ${getStatusConfig(selectedLog.status).text}`}>{selectedLog.status || 'Pending'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Net Payout (LKR) *</label>
                  <input
                    type="number"
                    value={newPayout.netPayout}
                    onChange={(e) => setNewPayout({...newPayout, netPayout: e.target.value})}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="Enter net payout"
                    required
                  />
                </div>

      {/* COPY NOTIFICATION */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 px-5 py-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl backdrop-blur-lg z-50"
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-white">Copied to clipboard</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}