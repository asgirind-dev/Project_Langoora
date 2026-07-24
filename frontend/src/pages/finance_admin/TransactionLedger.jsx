// frontend/src/pages/finance_admin/TransactionLedger.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, Search, Download, ArrowDownLeft, ShieldCheck,
  Filter, Calendar, ChevronDown, Eye, Copy, CheckCircle,
  XCircle, Clock, AlertCircle, Printer, Share2,
  Layers, Activity, BarChart3, Users, DollarSign,
  CreditCard, Building, Zap, Sparkles, Crown,
  Wallet, Landmark, TrendingUp, Award, Gem
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import axios from 'axios';

export default function TransactionLedger() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGateway, setFilterGateway] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // ============================================
  // ⭐ FETCH TRANSACTIONS FROM FIRESTORE
  // ============================================
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        const response = await axios.get(`${API_URL}/api/finance/transactions`);
        console.log('📊 Transactions Response:', response.data);
        
        if (response.data && Array.isArray(response.data)) {
          // Transform data to match UI format
          const transformedLogs = response.data.map(tx => ({
            ref: tx.id || tx.transactionId || `TXN-${Date.now()}`,
            student: tx.student_name || tx.userName || tx.user || 'Unknown Student',
            tier: tx.plan || tx.subscriptionType || 'Standard Plan',
            amount: tx.amount || 0,
            gateway: tx.gateway || tx.paymentMethod || 'Stripe',
            status: tx.status || 'Pending',
            timestamp: tx.created_at || tx.createdAt || new Date().toISOString(),
            email: tx.email || tx.student_email || '',
            plan: tx.plan || tx.subscriptionType || 'Standard Plan',
            credits: tx.credits || 0,
            transactionId: tx.id,
            paymentMethod: tx.paymentMethod || tx.gateway || 'Stripe'
          }));
          
          setLogs(transformedLogs);
        } else {
          console.log('⚠️ No transactions found');
          setLogs([]);
        }
      } catch (error) {
        console.error('❌ Error fetching transactions:', error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, []);

  // Summary Stats
  const totalTransactions = logs.length;
  const totalRevenue = logs.reduce((sum, log) => sum + (log.status === 'Success' || log.status === 'Completed' ? log.amount : 0), 0);
  const successCount = logs.filter(l => l.status === 'Success' || l.status === 'Completed').length;
  const successRate = totalTransactions > 0 ? ((successCount / totalTransactions) * 100).toFixed(1) : 0;
  const failedCount = logs.filter(l => l.status === 'Failed' || l.status === 'Declined').length;

  const filteredLogs = logs.filter(log => {
    const matchSearch = (log.student || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (log.ref || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (log.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || (log.status || '').toLowerCase() === filterStatus.toLowerCase();
    const matchGateway = filterGateway === 'all' || (log.gateway || '').toLowerCase() === filterGateway.toLowerCase();
    return matchSearch && matchStatus && matchGateway;
  });

  const getStatusConfig = (status) => {
    const statusMap = {
      'Success': { 
        color: '#10b981', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        icon: CheckCircle,
        label: 'Success'
      },
      'Completed': { 
        color: '#10b981', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        icon: CheckCircle,
        label: 'Completed'
      },
      'Failed': { 
        color: '#ef4444', 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/20',
        text: 'text-red-400',
        icon: XCircle,
        label: 'Failed'
      },
      'Declined': { 
        color: '#ef4444', 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/20',
        text: 'text-red-400',
        icon: XCircle,
        label: 'Declined'
      },
      'Pending': { 
        color: '#f59e0b', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        icon: Clock,
        label: 'Pending'
      }
    };
    return statusMap[status] || statusMap['Pending'];
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-LK', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-gray-400">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== HERO HEADER ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/5 pb-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono tracking-widest uppercase px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-extrabold">
            Auditing Core Engine
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Financial Ledger Audit
        </h1>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl font-medium">
          Immutable historic system tracking data logs for user real-money subscription execution nodes.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono">{logs.length} total transactions</span>
          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
            live data
          </span>
        </div>
      </motion.div>

      {/* ===== STATS ROW ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Transactions', value: totalTransactions, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Total Revenue', value: `LKR ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Failed', value: failedCount, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
          >
            <GlassCard className="p-5 border-white/10 hover:border-blue-500/30 transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 ${stat.bg} rounded-xl`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* ===== SEARCH & FILTERS ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by student, reference or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:outline-none transition-all duration-300 w-72"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all duration-300 cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '36px'
              }}
            >
              <option value="all" className="bg-[#0a1628] text-white hover:bg-blue-500/20">All Status</option>
              <option value="success" className="bg-[#0a1628] text-white hover:bg-blue-500/20">Success</option>
              <option value="completed" className="bg-[#0a1628] text-white hover:bg-blue-500/20">Completed</option>
              <option value="failed" className="bg-[#0a1628] text-white hover:bg-blue-500/20">Failed</option>
              <option value="declined" className="bg-[#0a1628] text-white hover:bg-blue-500/20">Declined</option>
              <option value="pending" className="bg-[#0a1628] text-white hover:bg-blue-500/20">Pending</option>
            </select>
            
            <select
              value={filterGateway}
              onChange={(e) => setFilterGateway(e.target.value)}
              className="px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all duration-300 cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '36px'
              }}
            >
              <option value="all" className="bg-[#0a1628] text-white hover:bg-blue-500/20">All Gateways</option>
              <option value="stripe" className="bg-[#0a1628] text-white hover:bg-blue-500/20">Stripe</option>
              <option value="payhere" className="bg-[#0a1628] text-white hover:bg-blue-500/20">Payhere</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{filteredLogs.length} transactions</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-300 flex items-center gap-2 text-sm font-medium"
          >
            <Printer size={16} />
            Print
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white text-sm font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </motion.button>
        </div>
      </div>

      {/* ===== LEDGER TABLE ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
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
                              <button
                                onClick={() => copyToClipboard(log.ref)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
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
                              {log.credits > 0 && (
                                <span className="text-xs text-gray-400">({log.credits}c)</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-bold text-white">LKR {log.amount.toLocaleString()}</span>
                          </td>
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
                              onClick={() => {
                                setSelectedLog(log);
                                setShowModal(true);
                              }}
                              className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <Eye size={16} className="text-gray-400 hover:text-white" />
                            </motion.button>
                          </td>
                        </motion.tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-5 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-6 bg-white/5 rounded-full">
                            <Search size={48} className="text-gray-500" />
                          </div>
                          <h3 className="text-lg font-semibold text-white">No Results Found</h3>
                          <p className="text-sm text-gray-400">Try adjusting your search or filter criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="text-xs text-gray-400">
              Showing {filteredLogs.length} of {logs.length} transactions
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                <span className="text-xs text-gray-400">Success</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                <span className="text-xs text-gray-400">Failed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                <span className="text-xs text-gray-400">Pending</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ===== DETAIL MODAL ===== */}
      <AnimatePresence>
        {showModal && selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-[#0f1629] to-[#1a1f3a] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">
                      Transaction Details
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-2">{selectedLog.ref}</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowModal(false)}
                  className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <XCircle size={20} className="text-gray-400" />
                </motion.button>
              </div>

              <div className="space-y-4">
                {/* Student Info */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xl font-bold text-white">
                      {selectedLog.student?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{selectedLog.student || 'Unknown'}</h3>
                      <p className="text-sm text-gray-400">{selectedLog.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Plan</p>
                    <p className="text-base font-bold text-white mt-1">{selectedLog.plan || 'Standard'}</p>
                    {selectedLog.credits > 0 && (
                      <p className="text-sm text-gray-400">{selectedLog.credits} Credits</p>
                    )}
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Amount</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">LKR {selectedLog.amount?.toLocaleString() || 0}</p>
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
                        <span className={`text-sm font-bold ${getStatusConfig(selectedLog.status).text}`}>{selectedLog.status || 'Pending'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Transaction Time</p>
                  <p className="text-sm font-semibold text-white mt-1">{formatDate(selectedLog.timestamp)}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 text-sm"
                  >
                    <Printer size={15} />
                    Print
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-3.5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 flex items-center justify-center gap-1.5 text-sm"
                  >
                    <Share2 size={15} />
                    Share
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Notification */}
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