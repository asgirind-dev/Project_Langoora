// frontend/src/pages/finance_admin/TutorPayoutsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, Clock, CheckCircle, Percent, 
  RefreshCw, DollarSign, Users,
  Search, Shield, 
  Coins, Trash2, Star
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { getRates } from '../../services/globalConfigService';

const API_URL = 'http://localhost:5000';
const EXCHANGE_RATE = 20.00;
const PLATFORM_COMMISSION = 0.20;

export default function TutorPayoutsPage() {
  // ========== STATES ==========
  const [creditRate, setCreditRate] = useState(EXCHANGE_RATE);
  const [platformCommission, setPlatformCommission] = useState(PLATFORM_COMMISSION);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [declinedCount, setDeclinedCount] = useState(0);

  // ========== FETCH SETTINGS ==========
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

  // ========== FETCH TUTORS (Auto-Sync ඇතුළත්) ==========
  const fetchTutors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/api/payouts/active-tutors`);
      
      console.log('📡 API Response:', response.data);
      
      if (response.data && response.data.success) {
        const tutorsData = response.data.tutors || [];
        const tutorsWithPapers = tutorsData.filter(t => (t.paperCount || 0) > 0);
        setTutors(tutorsWithPapers);
        console.log('✅ Final tutors set:', tutorsWithPapers);
        
        const declined = tutorsData.filter(t => t.status === 'Declined');
        setDeclinedCount(declined.length);
      } else {
        setError('Failed to fetch tutors');
        setTutors([]);
      }
    } catch (err) {
      console.error('❌ Error fetching tutors:', err);
      setError(err.message || 'Network error');
      setTutors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 👇 UI Refresh වෙන හැම වෙලාවකම fetchTutors call වෙනවා
  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  // ========== CLEAR ALL DECLINED ==========
  const clearAllDeclined = async () => {
    if (!confirm(`Delete all ${declinedCount} declined payouts?`)) return;
    try {
      await axios.delete(`${API_URL}/api/payouts/declined/all`);
      setDeclinedCount(0);
      await fetchTutors(); // refresh data
      alert('✅ All declined payouts deleted.');
    } catch (error) {
      console.error('Error deleting declined:', error);
      alert('Failed to delete declined payouts.');
    }
  };

  // ========== FILTERS ==========
  const filteredTutors = tutors.filter(t => {
    if (t.status === 'Declined') return false;
    const matchFilter = filter === 'all' || t.status.toLowerCase() === filter.toLowerCase();
    const matchSearch = (t.tutor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (t.bank || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  // ========== STATS (ALL tutors, not filtered) ==========
  const totalCreditsUsed = tutors.reduce((sum, t) => sum + (t.totalTokens || 0), 0);
  const totalGross = tutors.reduce((sum, t) => sum + (t.grossAmount || 0), 0);
  const totalPayout = tutors.reduce((sum, t) => sum + (t.netPayout || 0), 0);
  const pendingCount = tutors.filter(t => t.status === 'Pending').length;
  const settledCount = tutors.filter(t => t.status === 'Settled').length;

  // ========== STATUS CONFIG ==========
  const getStatusConfig = (status) => {
    const configs = {
      'Pending': { 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        icon: Clock,
      },
      'Settled': { 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        icon: CheckCircle,
      }
    };
    return configs[status] || configs['Pending'];
  };

  // ========== LOADING ==========
  if (loading || settingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <RefreshCw size={40} className="animate-spin text-emerald-400" />
        <p className="text-gray-400">Loading tutor data from database...</p>
      </div>
    );
  }

  // ========== ERROR ==========
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="text-red-400 text-lg">⚠️ {error}</div>
        <button
          onClick={fetchTutors}
          className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className="space-y-6 p-6 bg-[#050d1a] min-h-screen">
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
            {/* ✅ Add Payout Button ඉවත් කරන ලදී */}
            
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
          { 
            label: 'Platform Fee (20%)', 
            value: `${(totalGross * 0.2).toLocaleString() || 0}`,  
            icon: Percent, 
            color: 'text-rose-400' 
          },
          { 
            label: 'Pending', 
            value: pendingCount, 
            icon: Clock, 
            color: 'text-amber-400' 
          },
          { 
            label: 'Settled', 
            value: settledCount, 
            icon: CheckCircle, 
            color: 'text-emerald-400' 
          },
          { 
            label: 'Total Credits Used', 
            value: totalCreditsUsed.toLocaleString() || 0,  
            icon: Coins, 
            color: 'text-purple-400' 
          },
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

      {/* TUTOR CARDS - WITHOUT ACTION BUTTONS */}
      <AnimatePresence>
        {filteredTutors.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredTutors.map((tutor, index) => {
              const statusConfig = getStatusConfig(tutor.status);
              const StatusIcon = statusConfig.icon;

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

                    {/* Data Display */}
                    <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-black/30 rounded-xl border border-white/5">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Total Credits</p>
                        <p className="text-lg font-bold text-white">{totalTokens} Credits</p>
                        {/* <p className="text-[10px] text-gray-500">
                          {paperCount} papers • {studentCount} students
                        </p> */}
                        {paperCount > 0 && (
                          <p className="text-[10px] text-emerald-400/60">
                            {paperCount} × {tokensPerPaper} = {totalTokens}
                          </p>
                        )}
                      </div>

                      <div className="text-center border-x border-white/10">
                        <p className="text-[10px] text-rose-400 uppercase font-bold">System Commission (20%)</p>
                        <p className="text-lg font-bold text-rose-400">
                           LKR {commissionAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[8px] text-gray-500">
                          {grossAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} × {(platformCommission * 100).toFixed(0)}%
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-[10px] text-emerald-400 uppercase font-bold">Net Tutor Payout (80%)</p>
                        <p className="text-xl font-bold text-emerald-400">
                          LKR {netPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[8px] text-gray-500">
                          {grossAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} × 80%
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

                    {/* ✅ Status Messages - NO ACTION BUTTONS */}
                    {tutor.status === 'Settled' && (
                      <div className="mt-4 flex items-center gap-2 justify-end text-xs font-mono font-bold text-gray-500">
                        <CheckCircle size={14} className="text-emerald-400" />
                        Completed • Transaction Added to Card
                      </div>
                    )}
                    {tutor.status === 'Pending' && (
                      <div className="mt-4 text-right text-xs font-mono text-amber-400/60">
                        ⏳ Pending settlement (auto-settles on 25th)
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
    </div>
  );
}