import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, Zap, Shield, Star } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { subscriptionPlans } from '../../data/mockData';

export default function SubscriptionPage() {
  const [billing, setBilling] = useState('monthly');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);

  const handleUpgrade = (plan) => {
    setSelected(plan);
    setModal(true);
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Subscription Plans</h1>
        <p className="text-gray-400">Choose the right plan for your exam preparation</p>
      </motion.div>

      <GlassCard className="p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <Crown size={22} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Current Plan: <span className="text-amber-400">Pro</span></p>
            <p className="text-sm text-gray-400">Renews on July 12, 2024 · LKR 1,499/month</p>
          </div>
          <Badge color="amber">Active</Badge>
        </div>
      </GlassCard>

      <div className="flex items-center justify-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit mx-auto">
        {['monthly', 'yearly'].map(b => (
          <button
            key={b}
            onClick={() => setBilling(b)}
            className={`px-6 py-2 rounded-lg text-sm font-medium capitalize transition-all ${billing === b ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {b} {b === 'yearly' && <span className="text-xs text-amber-300 ml-1">Save 20%</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subscriptionPlans.map((plan, i) => (
          <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className={`p-7 h-full relative ${plan.popular ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                {plan.id === 'elite' ? <Star size={20} className="text-amber-400" /> : plan.id === 'pro' ? <Zap size={20} className="text-blue-400" /> : <Shield size={20} className="text-gray-400" />}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              </div>
              <div className="mb-6">
                {plan.price === 0 ? (
                  <span className="text-4xl font-bold text-white">Free</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-white">
                      LKR {billing === 'yearly' ? Math.round(plan.price * 0.8).toLocaleString() : plan.price.toLocaleString()}
                    </span>
                    <span className="text-gray-400 text-sm">/month</span>
                  </>
                )}
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.popular ? 'primary' : plan.id === 'free' ? 'ghost' : 'secondary'}
                fullWidth
                disabled={plan.id === 'pro'}
                onClick={() => plan.price > 0 && handleUpgrade(plan)}
              >
                {plan.id === 'pro' ? 'Current Plan' : plan.price === 0 ? 'Downgrade' : `Upgrade to ${plan.name}`}
              </Button>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={`Upgrade to ${selected?.name}`}>
        {selected && (
          <div className="space-y-5">
            <p className="text-gray-300">You're upgrading to <span className="text-white font-semibold">{selected.name}</span> plan.</p>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">{selected.name} Plan ({billing})</span>
                <span className="text-white font-semibold">LKR {selected.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Next billing</span>
                <span className="text-white">July 12, 2024</span>
              </div>
            </div>
            <Button variant="primary" fullWidth onClick={() => setModal(false)}>
              Confirm Upgrade
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
