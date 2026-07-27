// frontend/src/pages/finance_admin/TutorPayoutsPage.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, Clock, CheckCircle, Percent, 
  RefreshCw, DollarSign, Users,
  Search, Shield, Mail, 
  Send, Coins, Trash2, Star,
  Plus, X
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
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [transactions, setTransactions] = useState({ totalCredits: 0, totalAmount: 0, count: 0 });
  const [declinedCount, setDeclinedCount] = useState(0);
  
  // Add Payout Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPayout, setNewPayout] = useState({
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

  // ⭐ Fetch system settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setSettingsLoading(true);
        const response = await getRates();
        if (response.success && response.data) {
          setCreditRate(response.data.exchangeRate || EXCHANGE_RATE);
          setPlatformCommission((response.data.platformCommission || 20) / 100);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // ⭐ Fetch tutors with REAL data AND status from payouts
  const fetchTutors = async () => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = import.meta.env.VITE_API_URL || '';
      
      // Fetch both tutors and payouts in parallel
      const [tutorsRes, payoutsRes] = await Promise.all([
        axios.get(`${API_URL}/api/payouts/active-tutors`),
        axios.get(`${API_URL}/api/payouts/get-all`)
      ]);
      
      if (tutorsRes.data?.success) {
        const allPayouts = payoutsRes.data?.payouts || [];
        const stats = payoutsRes.data?.stats || {};
        
        // ✅ Map tutors with status from payouts
        const tutorsWithStatus = (tutorsRes.data.tutors || []).map(tutor => {
          // Check if tutor has a settled payout
          const hasSettledPayout = allPayouts.some(p => 
            p.tutorId === tutor.id && 
            (p.status === 'Settled' || p.status === 'settled')
          );
          
          // Check if tutor has a pending payout
          const hasPendingPayout = allPayouts.some(p => 
            p.tutorId === tutor.id && 
            (p.status === 'Pending' || p.status === 'pending')
          );
          
          return {
            ...tutor,
            status: hasSettledPayout ? 'Settled' : 
                    hasPendingPayout ? 'Pending' : 
                    tutor.status || 'Pending'
          };
        });
        
        setTutors(tutorsWithStatus);
        console.log('✅ Tutors with REAL data and status:', tutorsWithStatus);
        
        // ✅ Update stats from API
        setTransactions({
          totalCredits: stats.totalTokens || 0,
          totalAmount: stats.totalAmount || 0,
          count: payoutsRes.data.settledPayouts?.length || 0
        });
        
      } else {
        setError('Failed to fetch tutors');
        setTutors([]);
      }

      // Fetch transactions
      const txRes = await axios.get(`${API_URL}/api/payouts/total-credits`);
      if (txRes.data?.success) {
        setTransactions({
          totalCredits: txRes.data.totalCredits || 0,
          totalAmount: txRes.data.totalAmount || 0,
          count: txRes.data.count || 0
        });
      }

    } catch (error) {
      console.error('Error fetching tutors:', error);
      setError(error.message || 'Network error');
      setTutors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  // ⭐ Fetch transactions
  const fetchTransactions = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await axios.get(`${API_URL}/api/payouts/total-credits`);
      
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

  // ⭐ Process payout (Settle/Decline)
  const handleProcessPayout = async (tutorId, action) => {
    try {
      setProcessingId(tutorId);
      const newStatus = action === 'approve' ? 'Settled' : 'Declined';

      const tutor = tutors.find(t => t.id === tutorId);
      if (!tutor) {
        throw new Error('Tutor not found');
      }

      const API_URL = import.meta.env.VITE_API_URL || '';
      
      const payoutData = {
        tutorId: tutorId,
        tokens: tutor.totalTokens || 0,
        creditValue: creditRate
      };

      const createResponse = await axios.post(`${API_URL}/api/payouts/request`, payoutData);
      
      if (createResponse.data.success) {
        const payoutId = createResponse.data.payoutId;
        
        if (payoutId) {
          const updateResponse = await axios.patch(`${API_URL}/api/payouts/update-status/${payoutId}`, {
            status: newStatus
          });

          if (updateResponse.data.success) {
            if (newStatus === 'Settled') {
              setTutors(prevTutors => 
                prevTutors.map(t => 
                  t.id === tutorId ? { ...t, status: 'Settled' } : t
                )
              );
              await fetchTransactions();
              console.log('✅ Payout settled successfully!');
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
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/5 pb-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-extrabold">
                Liquidation Core Engine
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Instructor Settlement Engine
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Convert tutor asset execution tokens into fiat LKR liquidation blocks after commission cuts.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-gray-500 font-mono">{tutors.length} active tutors loaded</span>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                role: tutor | status: active
              </span>
              {declinedCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
                  {declinedCount} declined (hidden)
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 🔥 ADD PAYOUT BUTTON */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-500/30 transition-all duration-300"
            >
              <Plus size={16} />
              Add Payout
            </motion.button>
            
            {declinedCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearAllDeclined}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-red-500/20 transition-all duration-300"
              >
                <Trash2 size={16} />
                Clear All Declined ({declinedCount})
              </motion.button>
            )}
          </div>
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
            <GlassCard className="p-5 border border-white/10 hover:border-opacity-50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 bg-white/5 rounded-xl`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <span className="text-xs text-gray-400 font-medium">{stat.label}</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{stat.value}</div>
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{filteredTutors.length} tutors</span>
        </div>
      </div>

      {/* TUTOR CARDS */}
      <AnimatePresence>
        {filteredTutors.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredTutors.map((tutor, index) => {
              const statusConfig = getStatusConfig(tutor.status);
              const StatusIcon = statusConfig.icon;
              const isProcessing = processingId === tutor.id;

              const totalTokens = tutor.totalTokens || 0;
              const paperCount = tutor.paperCount || 0;
              const studentCount = tutor.studentCount || 0;
              const tokensPerPaper = tutor.tokensPerPaper || 0;
              const commissionAmount = tutor.commissionAmount || 0;
              const netPayout = tutor.netPayout || 0;
              const grossAmount = tutor.grossAmount || 0;

              return (
                <motion.div
                  key={tutor.id || index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <GlassCard className="p-5 border border-white/10 relative overflow-hidden">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center text-base font-bold text-white`}>
                          {tutor.avatar || (tutor.tutor || 'T')[0].toUpperCase()}
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

                    {/* REAL DATA DISPLAY */}
                    <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-black/30 rounded-xl border border-white/5">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Total Credits</p>
                        <p className="text-lg font-bold text-white">{payout.totalTokens} Credits</p>
                        <p className="text-[10px] text-gray-500">
                          {payout.paperCount} papers • {payout.studentCount} students
                        </p>
                        {paperCount > 0 && (
                          <p className="text-[10px] text-emerald-400/60">
                            {paperCount} × {tokensPerPaper} = {totalTokens}
                          </p>
                        )}
                      </div>

                      <div className="text-center border-x border-white/10">
                        <p className="text-[10px] text-rose-400 uppercase font-bold">System Commission (20%)</p>
                        <p className="text-lg font-bold text-rose-400">
                          - LKR {payout.commissionAmount?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[8px] text-gray-500">
                          {grossAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} × {(platformCommission * 100).toFixed(0)}%
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-[10px] text-emerald-400 uppercase font-bold">Net Tutor Payout (80%)</p>
                        <p className="text-xl font-bold text-emerald-400">
                          LKR {payout.netPayout?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[8px] text-gray-500">
                          {grossAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} × 80%
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
                          <p className="text-sm font-semibold text-white">{tutor.bank || 'Not Specified'}</p>
                          <p className="text-xs text-gray-400 font-mono">
                            {tutor.account && tutor.account !== 'N/A' 
                              ? `${'*'.repeat(Math.max(0, tutor.account.length - 4))}${tutor.account.slice(-4)}` 
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                      {tutor.university && (
                        <div className="text-xs text-gray-400">
                          {tutor.university}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {tutor.status === 'Pending' && (
                      <div className="mt-4 flex items-center gap-2 justify-end">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleProcessPayout(tutor.id, 'decline')}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-red-500/20 transition-all duration-300 disabled:opacity-50"
                        >
                          {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          Decline
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleProcessPayout(tutor.id, 'approve')}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-emerald-500/20 transition-all duration-300 disabled:opacity-50"
                        >
                          {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                          Settle
                        </motion.button>
                      </div>
                    )}

                    {/* Completed Message */}
                    {tutor.status === 'Settled' && (
                      <div className="mt-4 flex items-center gap-2 justify-end text-xs font-mono font-bold text-gray-500">
                        <CheckCircle size={14} className="text-emerald-400" />
                        Completed • Transaction Added to Card
                      </div>
                    )}
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus size={20} className="text-emerald-400" />
                  Add New Payout
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
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

                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Total Tokens *</label>
                  <input
                    type="number"
                    value={newPayout.totalTokens}
                    onChange={(e) => setNewPayout({...newPayout, totalTokens: e.target.value})}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="Enter total tokens"
                    required
                  />
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

                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={newPayout.bankName}
                    onChange={(e) => setNewPayout({...newPayout, bankName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="Enter bank name"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Account Number</label>
                  <input
                    type="text"
                    value={newPayout.accountNo}
                    onChange={(e) => setNewPayout({...newPayout, accountNo: e.target.value})}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="Enter account number"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm font-medium hover:bg-white/10 transition-all duration-300"
                    disabled={submitting}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-all duration-300 disabled:opacity-50"
                  >
                    {submitting ? (
                      <RefreshCw size={16} className="animate-spin mx-auto" />
                    ) : (
                      'Add Payout'
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}