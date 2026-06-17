import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, Clock, CheckCircle, Percent, ArrowDownRight, 
  RefreshCw, XCircle, TrendingUp, DollarSign, Users,
  Wallet, Banknote, ArrowUpRight, Download, Filter,
  Search, ChevronDown, Shield, Sparkles, Crown,
  AlertCircle, ExternalLink, PieChart, Calendar,
  Award, Gem, Star, Zap, Mail, Phone, Building,
  CreditCard, Send, Coins, Layers, Activity
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const CREDIT_RATE = 5.00;
const PLATFORM_COMMISSION = 0.10;

const initialPayouts = [
  { 
    id: 'PAY-2026-001', 
    tutor: 'Prof. Amilal Asanka', 
    credits: 10000, 
    bank: 'Commercial Bank', 
    account: '8010443219', 
    status: 'Pending',
    date: '2026-01-15',
    email: 'a.asanka@university.lk',
    phone: '+94 77 123 4567',
    avatar: 'AA'
  },
  { 
    id: 'PAY-2026-002', 
    tutor: 'Dr. Hiroshi Tanaka', 
    credits: 25000, 
    bank: 'Sampath Bank', 
    account: '0134992104', 
    status: 'Pending',
    date: '2026-01-14',
    email: 'hiroshi.t@language.edu',
    phone: '+81 80 1234 5678',
    avatar: 'HT'
  },
  { 
    id: 'PAY-2026-003', 
    tutor: 'Ms. Nisha Kumari', 
    credits: 5000, 
    bank: 'NSB Bank', 
    account: '0257883321', 
    status: 'Settled',
    date: '2026-01-12',
    email: 'nisha.k@edu.lk',
    phone: '+94 71 234 5678',
    avatar: 'NK'
  },
  { 
    id: 'PAY-2026-004', 
    tutor: 'Mr. Suresh Rajan', 
    credits: 15000, 
    bank: 'HNB Bank', 
    account: '0399221456', 
    status: 'Declined',
    date: '2026-01-10',
    email: 'suresh.r@tutor.lk',
    phone: '+94 76 345 6789',
    avatar: 'SR'
  },
  { 
    id: 'PAY-2026-005', 
    tutor: 'Dr. Chaminda Perera', 
    credits: 8000, 
    bank: 'People\'s Bank', 
    account: '0567882211', 
    status: 'Pending',
    date: '2026-01-13',
    email: 'chaminda.p@edu.lk',
    phone: '+94 75 456 7890',
    avatar: 'CP'
  },
];

export default function TutorPayoutsPage() {
  const [payouts, setPayouts] = useState(initialPayouts);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const pendingCount = payouts.filter(p => p.status === 'Pending').length;
  const settledCount = payouts.filter(p => p.status === 'Settled').length;
  const declinedCount = payouts.filter(p => p.status === 'Declined').length;
  const totalCredits = payouts.reduce((sum, p) => sum + p.credits, 0);
  const totalPayout = payouts.reduce((sum, p) => {
    const gross = p.credits * CREDIT_RATE;
    const commission = gross * PLATFORM_COMMISSION;
    return sum + (gross - commission);
  }, 0);

  const filteredPayouts = payouts.filter(p => {
    const matchFilter = filter === 'all' || p.status.toLowerCase() === filter.toLowerCase();
    const matchSearch = p.tutor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.bank.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleProcessPayout = (id, action) => {
    setProcessingId(id);
    setTimeout(() => {
      setPayouts(payouts.map(p => 
        p.id === id ? { 
          ...p, 
          status: action === 'approve' ? 'Settled' : 'Declined',
          processedAt: new Date().toISOString()
        } : p
      ));
      setProcessingId(null);
    }, 1000);
  };

  const getStatusConfig = (status) => {
    const configs = {
      'Pending': { 
        color: '#f59e0b', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        icon: Clock,
        glow: 'shadow-amber-500/10'
      },
      'Settled': { 
        color: '#10b981', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        icon: CheckCircle,
        glow: 'shadow-emerald-500/10'
      },
      'Declined': { 
        color: '#ef4444', 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/20',
        text: 'text-red-400',
        icon: XCircle,
        glow: 'shadow-red-500/10'
      }
    };
    return configs[status] || configs['Pending'];
  };

  const statsCards = [
    { 
      label: 'Pending Requests', 
      value: pendingCount, 
      icon: Clock, 
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    },
    { 
      label: 'Settled Payouts', 
      value: settledCount, 
      icon: CheckCircle, 
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    { 
      label: 'Declined', 
      value: declinedCount, 
      icon: XCircle, 
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20'
    },
    { 
      label: 'Total Credits', 
      value: totalCredits.toLocaleString(), 
      icon: Coins, 
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20'
    },
  ];

  return (
    <div className="space-y-6">
      {/* ===== HERO HEADER ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/5 pb-3"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-extrabold">
            Liquidation Core Engine
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Instructor Settlement Engine
        </h1>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl font-medium">
          Convert tutor asset execution tokens into fiat LKR liquidation blocks after commission cuts.
        </p>
      </motion.div>

      {/* ===== STATS ROW ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
          >
            <GlassCard className={`p-5 border ${stat.border} hover:border-opacity-50 transition-all duration-300 hover:scale-[1.02]`}>
              <div className="flex items-center justify-between">
                <div className={`p-2.5 ${stat.bg} rounded-xl`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* ===== CONVERSION RATE CARD ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-4 border-white/10 hover:border-emerald-500/20 transition-all duration-300">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              {/* Rate */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <Percent size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Exchange Rate</p>
                  <p className="text-base font-bold text-white">1 Credit = LKR {CREDIT_RATE.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="hidden md:block w-px h-10 bg-white/10" />
              
              {/* Commission */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <Shield size={18} className="text-rose-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Platform Commission</p>
                  <p className="text-base font-bold text-white">{(PLATFORM_COMMISSION * 100).toFixed(0)}%</p>
                </div>
              </div>
              
              <div className="hidden md:block w-px h-10 bg-white/10" />
              
              {/* Total */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <DollarSign size={18} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Total Payout</p>
                  <p className="text-base font-bold text-white">LKR {totalPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">Live</span>
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
              className="pl-10 pr-3.5 py-2 bg-[#0a1628] border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none transition-all duration-300 w-64"
            />
          </div>
          <div className="flex gap-1.5 bg-white/5 rounded-xl p-1 border border-white/10">
            {['All', 'Pending', 'Settled', 'Declined'].map((status) => (
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

      {/* ===== PAYOUT CARDS ===== */}
      <AnimatePresence>
        {filteredPayouts.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredPayouts.map((payout, index) => {
              const statusConfig = getStatusConfig(payout.status);
              const grossAmount = payout.credits * CREDIT_RATE;
              const commission = grossAmount * PLATFORM_COMMISSION;
              const netPayout = grossAmount - commission;
              const StatusIcon = statusConfig.icon;
              const isProcessing = processingId === payout.id;

              return (
                <motion.div
                  key={payout.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.06 }}
                  whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400 } }}
                >
                  <GlassCard className={`p-5 border transition-all duration-300 ${statusConfig.border} hover:border-opacity-50 relative overflow-hidden min-h-[340px]`}>
                    {/* Glow Effect */}
                    <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-5 ${statusConfig.glow}`} />
                    
                    {/* Header */}
                    <div className="flex items-start justify-between relative">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center text-base font-bold text-white`}>
                          {payout.avatar || payout.tutor.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">{payout.tutor}</h3>
                            {payout.status === 'Pending' && (
                              <span className="px-2 py-0.5 bg-amber-500/20 rounded-full text-[8px] font-bold text-amber-400 uppercase animate-pulse">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono">{payout.id}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 ${statusConfig.bg} rounded-lg border ${statusConfig.border}`}>
                        <StatusIcon size={13} className={statusConfig.text} />
                        <span className={`text-xs font-bold ${statusConfig.text}`}>{payout.status}</span>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-black/30 rounded-xl border border-white/5">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Tokens</p>
                        <p className="text-lg font-bold text-white">{payout.credits.toLocaleString()}</p>
                      </div>
                      <div className="text-center border-x border-white/10">
                        <p className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">Platform Fee (10%)</p>
                        <p className="text-lg font-bold text-rose-400">-{commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Net Payout</p>
                        <p className="text-xl font-bold text-emerald-400">LKR {netPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>

                    {/* Bank Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white/[0.02] rounded-lg border border-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                          <Landmark size={14} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{payout.bank}</p>
                          <p className="text-xs text-gray-400 font-mono">{payout.account}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Mail size={11} className="text-gray-500" />
                          <span className="text-xs text-gray-400">{payout.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone size={11} className="text-gray-500" />
                          <span className="text-xs text-gray-400">{payout.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {payout.status === 'Pending' ? (
                      <div className="flex gap-2.5 mt-4 justify-end">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleProcessPayout(payout.id, 'reject')}
                          disabled={isProcessing}
                          className="px-4 py-2 border border-red-500/20 text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-red-500/10 transition-all duration-300 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            'Decline'
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleProcessPayout(payout.id, 'approve')}
                          disabled={isProcessing}
                          className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Send size={12} />
                              Approve
                            </>
                          )}
                        </motion.button>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 justify-end text-xs font-mono font-bold text-gray-500">
                        <CheckCircle size={14} className={payout.status === 'Settled' ? 'text-emerald-400' : 'text-red-400'} />
                        {payout.status === 'Settled' ? 'Completed' : 'Declined'} • Archived
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <GlassCard className="p-12 text-center border-white/10">
              <div className="flex flex-col items-center gap-3">
                <div className="p-5 bg-white/5 rounded-full">
                  <Search size={40} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">No Requests Found</h3>
                <p className="text-sm text-gray-400">Try adjusting your search or filter settings</p>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}