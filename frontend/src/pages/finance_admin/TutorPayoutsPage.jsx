// frontend/src/pages/finance_admin/TutorPayoutsPage.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, Clock, CheckCircle, Percent, 
  RefreshCw, DollarSign, Users,
  Search, Shield, Mail, Coins, Trash2
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

export default function TutorPayoutsPage() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [transactions, setTransactions] = useState({ totalCredits: 0, totalAmount: 0, count: 0 });

  useEffect(() => {
    fetchData();
    fetchTransactions();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await axios.get(`${API_URL}/api/finance/active-tutors`);
      
      if (response.data && response.data.success) {
        setPayouts(response.data.tutors || []);
      }
    } catch (error) {
      console.error("Error fetching active tutors:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await axios.get(`${API_URL}/api/finance/total-credits`);
      
      if (response.data && response.data.success) {
        setTransactions({
          totalCredits: response.data.totalCredits || 0,
          totalAmount: response.data.totalAmount || 0,
          count: response.data.count || 0
        });
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Statistics
  const pendingCount = payouts.filter(p => p.status === 'Pending').length;
  const settledCount = payouts.filter(p => p.status === 'Settled').length;
  const totalTokens = payouts.reduce((sum, p) => sum + (p.totalTokens || 0), 0);
  const totalPayout = payouts.reduce((sum, p) => sum + (p.netPayout || 0), 0);

  // Filter logic
  const filteredPayouts = payouts.filter(p => {
    if (p.status === 'Declined') return false;
    const matchFilter = filter === 'all' || p.status.toLowerCase() === filter.toLowerCase();
    const matchSearch = (p.tutor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (p.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (p.bank || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Process Payout (Settle)
  const handleProcessPayout = async (id, action) => {
    try {
      setProcessingId(id);
      const newStatus = action === 'approve' ? 'Settled' : 'Declined';
      const API_URL = import.meta.env.VITE_API_URL || '';
      
      const response = await axios.patch(`${API_URL}/api/finance/update-status/${id}`, {
        status: newStatus
      });
      
      if (response.data.success) {
        if (newStatus === 'Settled') {
          setPayouts(payouts.map(p => p.id === id ? { ...p, status: 'Settled' } : p));
          await fetchTransactions();
        } else {
          setPayouts(payouts.filter(p => p.id !== id));
        }
      }
    } catch (error) {
      console.error("Error processing payout:", error);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <RefreshCw size={40} className="animate-spin text-emerald-400" />
        <p className="text-gray-400">Loading actual tutor sales data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="border-b border-white/5 pb-3">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Instructor Settlement Engine
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Displaying tutors with actual exam sales. 80% goes to the tutor, 20% to the system (1 Credit = LKR 10.00).
        </p>
      </motion.div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Tutors with Sales', value: payouts.length, icon: Users, color: 'text-blue-400' },
          { label: 'Pending Payouts', value: pendingCount, icon: Clock, color: 'text-amber-400' },
          { label: 'Settled Payouts', value: settledCount, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Total Credits Used', value: `${totalTokens} Credits`, icon: Coins, color: 'text-purple-400' },
        ].map((stat, idx) => (
          <GlassCard key={idx} className="p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-white/5 rounded-xl">
                <stat.icon size={20} className={stat.color} />
              </div>
              <span className="text-xs text-gray-400 font-medium uppercase">{stat.label}</span>
            </div>
            <div className="mt-3 text-2xl font-bold text-white">{stat.value}</div>
          </GlassCard>
        ))}
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search tutor, ID or bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3.5 py-2 bg-[#0a1628] border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none w-64"
            />
          </div>
          <div className="flex gap-1.5 bg-white/5 rounded-xl p-1 border border-white/10">
            {['All', 'Pending', 'Settled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status.toLowerCase())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === status.toLowerCase()
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PAYOUT CARDS LIST */}
      <AnimatePresence>
        {filteredPayouts.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredPayouts.map((payout, index) => {
              const isSettled = payout.status === 'Settled';
              const isProcessing = processingId === payout.id;

              return (
                <motion.div
                  key={payout.id || index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <GlassCard className="p-5 border border-white/10 relative overflow-hidden">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-base font-bold text-white">
                          {payout.avatar}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{payout.tutor}</h3>
                          <p className="text-xs text-gray-400 font-mono">Tutor ID: {payout.id}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                        isSettled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        <span className="text-xs font-bold">{payout.status}</span>
                      </div>
                    </div>

                    {/* Calculation Summary Card */}
                    <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-black/30 rounded-xl border border-white/5">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Total Credits</p>
                        <p className="text-lg font-bold text-white">{payout.totalTokens} Credits</p>
                        <p className="text-[10px] text-gray-500">
                          {payout.paperCount} papers • {payout.studentCount} students
                        </p>
                      </div>

                      <div className="text-center border-x border-white/10">
                        <p className="text-[10px] text-rose-400 uppercase font-bold">System Commission (20%)</p>
                        <p className="text-lg font-bold text-rose-400">
                          - LKR {payout.commissionAmount?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-[10px] text-emerald-400 uppercase font-bold">Net Tutor Payout (80%)</p>
                        <p className="text-xl font-bold text-emerald-400">
                          LKR {payout.netPayout?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    {/* Bank Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white/[0.02] rounded-lg border border-white/5 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                          <Landmark size={14} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{payout.bank}</p>
                          <p className="text-xs text-gray-400 font-mono">Account: {payout.account}</p>
                        </div>
                      </div>
                      {payout.email && (
                        <div className="flex items-center gap-1">
                          <Mail size={11} className="text-gray-500" />
                          <span className="text-xs text-gray-400">{payout.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                      {!isSettled ? (
                        <>
                          <button
                            onClick={() => handleProcessPayout(payout.id, 'decline')}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold border border-rose-500/20 transition-all"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleProcessPayout(payout.id, 'approve')}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all"
                          >
                            {isProcessing ? 'Processing...' : 'Settle Payout'}
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                          <CheckCircle size={14} />
                          Settled & Saved to Transactions
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <GlassCard className="p-12 text-center border-white/10">
            <div className="flex flex-col items-center gap-3">
              <div className="p-5 bg-white/5 rounded-full">
                <Users size={40} className="text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">No Tutors with Sales Found</h3>
              <p className="text-sm text-gray-400">Only tutors who have received exam purchases will appear here.</p>
            </div>
          </GlassCard>
        )}
      </AnimatePresence>
    </div>
  );
}