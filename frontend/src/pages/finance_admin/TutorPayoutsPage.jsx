// frontend/src/pages/finance_admin/TutorPayoutsPage.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, Clock, CheckCircle, Percent, 
  RefreshCw, DollarSign, Users,
  Search, Shield, Mail, 
  Send, Coins, Trash2
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { getRates } from '../../services/globalConfigService';
import financeService from '../../services/financeService';

// ⭐ Default values
const DEFAULT_CREDIT_RATE = 5.00;
const DEFAULT_PLATFORM_COMMISSION = 0.10;

// Fallback data
const initialPayouts = [
  { 
    id: '0w5xyLtk90dfE2cdFlnvA47d0Iy2', 
    tutor: 'Asgiri Perera', 
    credits: 0, 
    bank: 'Not Specified', 
    account: 'N/A', 
    status: 'Pending',
    email: 'asgirindofficial@gmail.com',
    phone: '',
    avatar: 'AP'
  }
];

export default function TutorPayoutsPage() {
  // ⭐ State
  const [creditRate, setCreditRate] = useState(DEFAULT_CREDIT_RATE);
  const [platformCommission, setPlatformCommission] = useState(DEFAULT_PLATFORM_COMMISSION);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [tutorTokens, setTutorTokens] = useState({});
  const [tokensLoading, setTokensLoading] = useState(true);
  const [payouts, setPayouts] = useState(initialPayouts);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState({ totalCredits: 0, totalAmount: 0, count: 0 });
  const [declinedCount, setDeclinedCount] = useState(0);

  // ============================================
  // ⭐ FETCH SYSTEM SETTINGS
  // ============================================
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setSettingsLoading(true);
        const response = await getRates();
        
        if (response.success) {
          const rate = response.data.exchangeRate || DEFAULT_CREDIT_RATE;
          setCreditRate(rate);
          const commission = response.data.platformCommission || 10;
          setPlatformCommission(commission / 100);
          console.log('✅ Settings loaded:', { creditRate: rate, platformCommission: commission / 100 });
        }
      } catch (error) {
        console.error('❌ Error fetching settings:', error);
        setCreditRate(DEFAULT_CREDIT_RATE);
        setPlatformCommission(DEFAULT_PLATFORM_COMMISSION);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // ============================================
  // ⭐ FETCH TUTORS TOKENS FROM PURCHASED_EXAMS
  // ============================================
  useEffect(() => {
    const fetchTutorsTokens = async () => {
      try {
        setTokensLoading(true);
        console.log('🔄 Fetching tutors tokens...');
        
        const response = await financeService.getTutorsTokens();
        console.log('📊 API Response:', response);
        
        if (response.success) {
          const tokensMap = {};
          const uiTutorId = "0w5xyLtk90dfE2cdFlnvA47d0Iy2";
          
          response.data.forEach(tutor => {
            tokensMap[tutor.tutorId] = tutor;
            tokensMap[uiTutorId] = tutor;
            console.log(`✅ Added tutor: ${tutor.tutorId} - ${tutor.totalTokens} tokens`);
          });
          setTutorTokens(tokensMap);
          console.log('✅ Tutors tokens loaded:', tokensMap);
        }
      } catch (error) {
        console.error('❌ Error fetching tutors tokens:', error);
      } finally {
        setTokensLoading(false);
      }
    };
    fetchTutorsTokens();
  }, []);

  // ============================================
  // ⭐ FETCH TRANSACTIONS (Total Credits)
  // ============================================
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
        console.log('✅ Transactions loaded:', response.data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // ============================================
  // ⭐ FETCH ACTIVE TUTORS
  // ============================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const API_URL = import.meta.env.VITE_API_URL || '';
        const tutorsResponse = await axios.get(`${API_URL}/api/finance/active-tutors`);
        
        if (tutorsResponse.data && tutorsResponse.data.success) {
          const tutorData = tutorsResponse.data.tutors.map(tutor => ({
            id: tutor.id || `TUT-${Date.now()}-${Math.random()}`,
            tutor: tutor.tutor || tutor.name || "Unknown Tutor",
            credits: tutor.credits || 0,
            bank: tutor.bank || tutor.bankName || "Not Specified",
            account: tutor.account || tutor.bankAccount || "N/A",
            status: 'Pending',
            email: tutor.email || "",
            phone: tutor.phone || "",
            avatar: tutor.avatar || (tutor.tutor || "T")[0].toUpperCase(),
            createdAt: tutor.createdAt || new Date().toISOString(),
          }));
          
          setPayouts(tutorData);
        } else {
          setError("Failed to fetch tutors");
          setPayouts(initialPayouts);
        }
        
        // ⭐ Fetch transactions on load
        await fetchTransactions();
        
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message || "Network error");
        setPayouts(initialPayouts);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ============================================
  // STATISTICS
  // ============================================
  const pendingCount = payouts.filter(p => p.status === 'Pending').length;
  const settledCount = payouts.filter(p => p.status === 'Settled').length;
  const totalCredits = payouts.reduce((sum, p) => sum + (p.credits || 0), 0);
  const totalPayout = payouts.reduce((sum, p) => {
    const gross = (p.credits || 0) * creditRate;
    const commission = gross * platformCommission;
    return sum + (gross - commission);
  }, 0);

  // ============================================
  // FILTER LOGIC
  // ============================================
  const filteredPayouts = payouts.filter(p => {
    if (p.status === 'Declined') return false;
    const matchFilter = filter === 'all' || p.status.toLowerCase() === filter.toLowerCase();
    const matchSearch = (p.tutor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (p.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (p.bank || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  // ============================================
  // ⭐ PROCESS PAYOUT - SETTLE (Transaction Create)
  // ============================================
  const handleProcessPayout = async (id, action) => {
    try {
      setProcessingId(id);
      const newStatus = action === 'approve' ? 'Settled' : 'Declined';
      
      const response = await axios.patch(`/api/finance/update-status/${id}`, {
        status: newStatus
      });
      
      if (response.data.success) {
        if (newStatus === 'Settled') {
          setPayouts(payouts.map(p => 
            p.id === id ? { 
              ...p, 
              status: 'Settled',
              processedAt: new Date().toISOString(),
              transactionId: response.data.data?.transactionId,
              transaction: response.data.data?.transaction
            } : p
          ));
          
          // ⭐ IMPORTANT: Refresh transactions after settle
          await fetchTransactions();
          console.log('✅ Transaction added to card!');
          
        } else if (newStatus === 'Declined') {
          setPayouts(prevPayouts => prevPayouts.filter(p => p.id !== id));
          console.log('❌ Payout declined - removed from UI completely');
        }
      }
    } catch (error) {
      console.error("Error processing payout:", error);
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================
  // DELETE DECLINED PAYOUT
  // ============================================
  const handleDeleteDeclined = async (id) => {
    if (!confirm('Delete this declined payout?')) return;
    try {
      setProcessingId(id);
      await axios.delete(`/api/finance/${id}`);
      setPayouts(payouts.filter(p => p.id !== id));
      console.log('🗑️ Deleted declined payout');
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================
  // GET DECLINED COUNT
  // ============================================
  useEffect(() => {
    const fetchDeclinedCount = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const response = await axios.get(`${API_URL}/api/finance/declined`);
        if (response.data && response.data.success) {
          setDeclinedCount(response.data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching declined count:', error);
      }
    };
    fetchDeclinedCount();
  }, []);

  // ============================================
  // STATUS CONFIG
  // ============================================
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

  // ============================================
  // LOADING
  // ============================================
  if (loading || settingsLoading || tokensLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <RefreshCw size={40} className="animate-spin text-emerald-400" />
        <p className="text-gray-400">Loading tutor data...</p>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6 p-6">
      {/* ===== HEADER ===== */}
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
              <span className="text-xs text-gray-500 font-mono">{payouts.length} active tutors loaded</span>
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
          
          {declinedCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                if (!confirm(`Delete all ${declinedCount} declined payouts?`)) return;
                try {
                  const API_URL = import.meta.env.VITE_API_URL || '';
                  const response = await axios.get(`${API_URL}/api/finance/declined`);
                  if (response.data && response.data.success) {
                    const declinedIds = response.data.payouts.map(p => p.id);
                    for (const id of declinedIds) {
                      await axios.delete(`${API_URL}/api/finance/${id}`);
                    }
                    setDeclinedCount(0);
                    alert(`Deleted ${declinedIds.length} declined payouts`);
                  }
                } catch (error) {
                  console.error('Error deleting declined:', error);
                }
              }}
              className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-red-500/20 transition-all duration-300"
            >
              <Trash2 size={16} />
              Clear All Declined ({declinedCount})
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ===== ⭐ STATS ROW - ඉහළ Card 3 ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-amber-400' },
         { label: 'Settled', value: transactions.count || 0, icon: CheckCircle, color: 'text-emerald-400' },
          // ⭐ TOTAL CREDITS - Transactions වලින්
          { label: 'Total Credits', value: transactions.totalCredits?.toLocaleString() || 0, icon: Coins, color: 'text-purple-400' },
        ].map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
            <GlassCard className="p-5 border border-white/10 hover:border-opacity-50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 bg-white/5 rounded-xl`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <span className="text-xs text-gray-400 font-medium uppercase">{stat.label}</span>
              </div>
              <div className="mt-3 text-2xl font-bold text-white">{stat.value}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* ===== ⭐ TRANSACTIONS CARD - පහළ Card ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard className="p-4 border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <Coins size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">💰 Total Used Credits</p>
                <div className="flex items-center gap-4">
                  <p className="text-2xl font-bold text-white">
                    {transactions.totalCredits?.toLocaleString() || 0} Credits
                  </p>
                  <span className="text-sm text-gray-400">
                    = LKR {(transactions.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  From {transactions.count || 0} settled payouts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">Live</span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ===== CONVERSION RATE ===== */}
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
                  <p className="text-[10px] text-gray-500">System settings</p>
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
                  <p className="text-[10px] text-gray-500">System settings</p>
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

      {/* ===== SEARCH & FILTERS ===== */}
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{filteredPayouts.length} requests</span>
        </div>
      </div>

      {/* ===== ⭐ PAYOUT CARDS - DECLINE/APPROVE Buttons REMOVED ===== */}
      <AnimatePresence>
        {filteredPayouts.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredPayouts.map((payout, index) => {
              const statusConfig = getStatusConfig(payout.status);
              const StatusIcon = statusConfig.icon;
              const isProcessing = processingId === payout.id;

              // ⭐ Get token data
              let tokenData = {};
              if (tutorTokens[payout.id]) {
                tokenData = tutorTokens[payout.id];
              } else {
                const found = Object.values(tutorTokens).find(t => {
                  const tokenName = (t.tutorName || '').toLowerCase().trim();
                  const payoutName = (payout.tutor || '').toLowerCase().trim();
                  return tokenName.includes(payoutName) || payoutName.includes(tokenName);
                });
                if (found) tokenData = found;
              }
              if (!tokenData.totalTokens && Object.keys(tutorTokens).length > 0) {
                const firstKey = Object.keys(tutorTokens)[0];
                tokenData = tutorTokens[firstKey];
              }

              const totalTokens = tokenData.totalTokens || 0;
              const paperCount = tokenData.paperCount || 0;
              const studentCount = tokenData.studentCount || 0;
              const netPayout = tokenData.netPayout || 0;
              const commissionAmount = tokenData.commissionAmount || 0;
              const tokensPerPaper = tokenData.tokensPerPaper || 0;

              return (
                <motion.div
                  key={payout.id || index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.06 }}
                  whileHover={{ y: -4 }}
                >
                  <GlassCard className={`p-5 border transition-all duration-300 ${statusConfig.border} relative overflow-hidden`}>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center text-base font-bold text-white`}>
                          {payout.avatar || (payout.tutor || 'T')[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{payout.tutor}</h3>
                          <p className="text-xs text-gray-400 font-mono">{payout.id}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 ${statusConfig.bg} rounded-lg border ${statusConfig.border}`}>
                        <StatusIcon size={13} className={statusConfig.text} />
                        <span className={`text-xs font-bold ${statusConfig.text}`}>{payout.status}</span>
                      </div>
                    </div>

                    {/* Total Tokens Display */}
                    <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-black/30 rounded-xl border border-white/5">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Total Tokens</p>
                        <p className="text-lg font-bold text-white">
                          {totalTokens} ⭐
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {paperCount} papers • {studentCount} students
                        </p>
                        {paperCount > 0 && (
                          <p className="text-[10px] text-emerald-400/60">
                            {paperCount} × {tokensPerPaper} tokens = {totalTokens}
                          </p>
                        )}
                      </div>
                      <div className="text-center border-x border-white/10">
                        <p className="text-[10px] text-rose-400 uppercase font-bold">Platform Fee ({(platformCommission * 100).toFixed(0)}%)</p>
                        <p className="text-lg font-bold text-rose-400">
                          -{commissionAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-emerald-400 uppercase font-bold">Net Payout</p>
                        <p className="text-xl font-bold text-emerald-400">
                          LKR {netPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    {/* Bank Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white/[0.02] rounded-lg border border-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                          <Landmark size={14} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{payout.bank || 'Not Specified'}</p>
                          <p className="text-xs text-gray-400 font-mono">
                            {payout.account && payout.account !== 'N/A' 
                              ? `${'*'.repeat(Math.max(0, payout.account.length - 4))}${payout.account.slice(-4)}` 
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {payout.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={11} className="text-gray-500" />
                            <span className="text-xs text-gray-400">{payout.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ⭐ Completed Message - DECLINE/APPROVE Buttons REMOVED */}
                    {payout.status === 'Settled' && (
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
    </div>
  );
}