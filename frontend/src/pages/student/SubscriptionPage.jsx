import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, RefreshCw, Rocket, Sparkles } from 'lucide-react';
import axios from 'axios';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

// Normalize features array if coming in different formats
const normalizeFeatures = (features) => {
  if (!features) return [];
  if (Array.isArray(features)) {
    return features
      .map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          return item.name || item.label || item.title || Object.keys(item)[0] || '';
        }
        return String(item);
      })
      .filter(f => f && f.trim() !== '');
  }
  return [];
};

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        // 🎯 Fixed correct API Endpoint
        const res = await axios.get('http://localhost:5000/api/subscription-plans');
        setPlans(res.data || []);
      } catch (e) { 
        console.error("Error fetching plans:", e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchPlans();
  }, []);

  const handleUpgrade = (plan) => {
    setSelected(plan);
    setModal(true);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Subscription Plans</h1>
        <p className="text-gray-400">Choose the right plan for your exam preparation</p>
      </motion.div>

      {/* Current Active Plan Status Banner */}
      <GlassCard className="p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
            <Crown size={22} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Current Plan: <span className="text-amber-400">Active Plan</span></p>
            <p className="text-sm text-gray-400">Upgrade to unlock more exam credits and features</p>
          </div>
          <Badge color="amber">Active</Badge>
        </div>
      </GlassCard>

      {/* Loading Spinner */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        /* Plans Grid - 3 Columns with Exact Admin Card Template */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans
            .filter(plan => plan.active !== false)
            .map((plan, i) => {
              const features = normalizeFeatures(plan.features);
              const isPopular = plan.popular;

              return (
                <motion.div 
                  key={plan.id || plan._id || i} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.1 }}
                  className="relative pt-2 h-full"
                >
                  {/* MOST POPULAR BADGE */}
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                      <span className="px-3.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md shadow-purple-500/20">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  {/* GLASS CARD CONTENT */}
                  <GlassCard className={`p-6 border-2 text-left transition-all relative rounded-2xl bg-[#0f1424]/90 flex flex-col h-full ${
                    isPopular 
                      ? 'border-purple-500/30 shadow-xl shadow-purple-500/5' 
                      : 'border-white/5 hover:border-white/10'
                  }`}>
                    {/* Rocket Icon */}
                    <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center mb-3">
                      <Rocket size={18} className="text-purple-400" />
                    </div>

                    {/* Plan Name */}
                    <h2 className="text-xl font-bold text-white tracking-wide uppercase">{plan.name}</h2>

                    {/* Price */}
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-white tracking-tight">
                        LKR {Number(plan.price || 0).toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-gray-400">/month</span>
                    </div>

                    {/* Credits Badge */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mt-2.5 mb-4">
                      <Sparkles size={13} className="fill-amber-400/20" />
                      <span>{plan.credits || 0} credits granted</span>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2.5 my-4 flex-1">
                      {features.map((f, j) => (
                        <div key={j} className="flex items-start gap-2 text-xs font-medium text-gray-300">
                          <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <div className="mt-auto pt-4 border-t border-white/5">
                      <button
                        onClick={() => handleUpgrade(plan)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-lg active:scale-95 ${
                          isPopular 
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-purple-500/20' 
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/20'
                        }`}
                      >
                        Upgrade to {plan.name}
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
        </div>
      )}

      {/* Upgrade Confirmation Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={`Upgrade to ${selected?.name}`}>
        {selected && (
          <div className="space-y-5">
            <p className="text-gray-300">
              You're upgrading to the <span className="text-white font-semibold">{selected.name}</span> plan for <span className="text-emerald-400 font-bold">LKR {Number(selected.price || 0).toLocaleString()}</span>.
            </p>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 flex items-center gap-2">
              <Sparkles size={16} />
              <span>You will receive +{selected.credits} exam credits immediately upon payment.</span>
            </div>
            <Button variant="primary" fullWidth onClick={() => setModal(false)}>
              Confirm & Proceed to Payment
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}