import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, Zap, Shield, Star, Rocket, Infinity, Award, Layers, RefreshCw } from 'lucide-react';
import axios from 'axios';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

const iconMap = { Zap, Rocket, Crown, Infinity, Star, Award, Layers, Shield };

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState('monthly');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await axios.get('http://localhost:5000/api/subscription-management/plans');
        setPlans(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchPlans();
  }, []);

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

      {/* Current Plan Card  */}
      <GlassCard className="p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <Crown size={22} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Current Plan: <span className="text-amber-400">Active Plan</span></p>
            <p className="text-sm text-gray-400">Upgrade to unlock more features</p>
          </div>
          <Badge color="amber">Active</Badge>
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const IconComponent = iconMap[plan.icon] || Zap;
            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <GlassCard className={`p-7 h-full relative ${plan.popular ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">MOST POPULAR</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mb-4">
                    <IconComponent size={20} className="text-blue-400" />
                    <h3 className="text-xl font-bold text-white capitalize">{plan.name}</h3>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">LKR {plan.price.toLocaleString()}</span>
                    <span className="text-gray-400 text-sm">/mo</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features?.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-gray-300">
                        <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button variant={plan.popular ? 'primary' : 'secondary'} fullWidth onClick={() => handleUpgrade(plan)}>
                    Upgrade to {plan.name}
                  </Button>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={`Upgrade to ${selected?.name}`}>
        {selected && (
          <div className="space-y-5">
            <p className="text-gray-300">You're upgrading to <span className="text-white font-semibold">{selected.name}</span> plan.</p>
            <Button variant="primary" fullWidth onClick={() => setModal(false)}>Confirm Upgrade</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}