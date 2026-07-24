import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Download, CheckCircle, XCircle, Clock, AlertCircle, Printer,
  Activity, DollarSign, CreditCard, TrendingUp, Crown, Copy, RefreshCw, Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import GlassCard from '../../components/ui/GlassCard';
import FinanceService from '../../services/financeService';

export default function TransactionLedger() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGateway, setFilterGateway] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // 🎯 Fetch Real Database Transactions
  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const data = await FinanceService.getAllTransactions();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load transaction audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, []);

  // Summary Stats Calculations from Real Data
  const totalTransactions = logs.length;
  const totalRevenue = logs.reduce((sum, log) => sum + (log.status === 'Success' ? Number(log.amount || 0) : 0), 0);
  const successCount = logs.filter(l => l.status === 'Success').length;
  const successRate = totalTransactions > 0 ? ((successCount / totalTransactions) * 100).toFixed(1) : '0.0';
  const failedCount = logs.filter(l => l.status === 'Failed').length;

  // Search & Filters
  const filteredLogs = logs.filter(log => {
    const matchSearch = (log.student || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (log.ref || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (log.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || (log.status || '').toLowerCase() === filterStatus.toLowerCase();
    const matchGateway = filterGateway === 'all' || (log.gateway || '').toLowerCase().includes(filterGateway.toLowerCase());
    return matchSearch && matchStatus && matchGateway;
  });

  const getStatusConfig = (status) => {
    const configs = {
      'Success': { 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        icon: CheckCircle,
        label: 'Success'
      },
      'Failed': { 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/20',
        text: 'text-red-400',
        icon: XCircle,
        label: 'Failed'
      },
      'Pending': { 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        icon: Clock,
        label: 'Pending'
      }
    };
    return configs[status] || configs['Pending'];
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 🎯 PDF Export Handler (Finance Dashboard Style)
  const handleExportPDF = () => {
    if (filteredLogs.length === 0) return alert("No transaction records available to export.");

    setExporting(true);
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();

      // Dark Blue Header Banner
      doc.setFillColor(15, 22, 41);
      doc.rect(0, 0, 210, 42, 'F');

      // Title & Subtitle
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

      // Audit Highlights Box
      const successfulTxs = filteredLogs.filter(t => t.status === 'Success');
      const filteredRev = successfulTxs.reduce((sum, log) => sum + Number(log.amount || 0), 0);

      doc.setFillColor(241, 245, 249);
      doc.rect(14, 47, 182, 14, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Total Records: ${filteredLogs.length}`, 20, 56);
      doc.text(`Successful Sales: ${successfulTxs.length}`, 80, 56);
      doc.text(`Total Revenue: LKR ${filteredRev.toLocaleString()}`, 140, 56);

      // Table Rows Preparation
      const tableRows = filteredLogs.map(l => [
        l.ref || 'N/A',
        l.student || 'Unknown',
        l.plan || 'Standard',
        `LKR ${Number(l.amount || 0).toLocaleString()}`,
        `+${l.credits || 0} c`,
        l.gateway || 'Card',
        l.status || 'Pending',
        l.timestamp || 'N/A'
      ]);

      autoTable(doc, {
        startY: 66,
        head: [['Reference ID', 'Student', 'Plan', 'Amount', 'Credits', 'Gateway', 'Status', 'Date & Time']],
        body: tableRows,
        theme: 'grid',
        headStyles: { 
          fillColor: [30, 41, 59], 
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 3.5 
        },
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
            if (data.cell.raw === 'Success') {
              data.cell.styles.textColor = [16, 185, 129];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw === 'Failed') {
              data.cell.styles.textColor = [239, 68, 68];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [245, 158, 11];
            }
          }
        }
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('Confidential Document - Internal Finance Administration Langoora Platform', 14, 285);

      doc.save(`Langoora_Transaction_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
      alert(`Failed to export PDF: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <RefreshCw className="animate-spin text-blue-500" size={36} />
        <p className="text-gray-400 text-sm">Fetching real-time transaction ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* HERO HEADER */}
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
      </motion.div>

      {/* STATS ROW */}
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

      {/* SEARCH & FILTERS */}
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
              className="px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all duration-300 cursor-pointer appearance-none pr-8"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            
            <select
              value={filterGateway}
              onChange={(e) => setFilterGateway(e.target.value)}
              className="px-4 py-2.5 bg-[#0a1628] border border-white/10 rounded-xl text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all duration-300 cursor-pointer appearance-none pr-8"
            >
              <option value="all">All Gateways</option>
              <option value="stripe">Stripe</option>
              <option value="card">Card / Payhere</option>
            </select>
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
            <Printer size={16} />
            Print
          </motion.button>

          {/* 🎯 Updated Export PDF Button */}
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
                                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <Copy size={14} className="text-gray-500 hover:text-white" />
                              </button>
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{log.timestamp}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div>
                              <div className="text-sm font-semibold text-white">{log.student}</div>
                              <div className="text-xs text-gray-400">{log.email}</div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Crown size={16} className="text-amber-400" />
                              <span className="text-sm font-medium text-white">{log.plan}</span>
                              <span className="text-xs text-gray-400">({log.credits}c)</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-bold text-white">LKR {Number(log.amount || 0).toLocaleString()}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <CreditCard size={16} className="text-gray-400" />
                              <span className="text-sm text-gray-300">{log.gateway}</span>
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
                          <div className="p-6 bg-white/5 rounded-full">
                            <Search size={48} className="text-gray-500" />
                          </div>
                          <h3 className="text-lg font-semibold text-white">No Transactions Found</h3>
                          <p className="text-sm text-gray-400">There are no real transactions recorded in the system yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

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

      {/* DETAIL MODAL */}
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
              className="bg-gradient-to-br from-[#0f1629] to-[#1a1f3a] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto font-sans"
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
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xl font-bold text-white">
                      {selectedLog.student?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{selectedLog.student}</h3>
                      <p className="text-sm text-gray-400">{selectedLog.email}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Plan</p>
                    <p className="text-base font-bold text-white mt-1">{selectedLog.plan}</p>
                    <p className="text-sm text-gray-400">{selectedLog.credits} Credits</p>
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Amount</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">LKR {Number(selectedLog.amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Gateway</p>
                    <p className="text-base font-semibold text-white mt-1">{selectedLog.gateway}</p>
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Status</p>
                    <p className="text-base font-semibold text-emerald-400 mt-1">{selectedLog.status}</p>
                  </div>
                </div>

                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Transaction Time</p>
                  <p className="text-sm font-semibold text-white mt-1">{selectedLog.timestamp}</p>
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