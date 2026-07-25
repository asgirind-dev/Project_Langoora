// frontend/src/pages/PricingPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, CheckCircle, ArrowRight, RefreshCw, Rocket,
  AlertCircle, Sparkles, Layers, Crown, Star, Award,
  Infinity, Gem, Target, Shield, Flame, Medal,
  Users
} from 'lucide-react';
import axios from 'axios';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import Button from '../../components/ui/Button';

const iconMap = {
  Zap, Rocket, Crown, Infinity, Star, Award, Layers,
  Gem, Target, Shield, Flame, Medal, Users
};

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

export default function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/subscription-plans');
        const filteredPlans = (response.data || []).filter(plan =>
          plan.active === true && plan.status === 'approved'
        );
        const sortedPlans = filteredPlans.sort((a, b) =>
          (a.sortOrder || 999) - (b.sortOrder || 999)
        );
        setPlans(sortedPlans);
      } catch (error) {
        console.error("Error loading plans:", error);
        setError('Failed to load pricing plans. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060d1f] text-white">
        <Navbar />
        <section className="pt-32 pb-20 px-4 relative overflow-hidden">
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="animate-spin text-blue-500" size={36} />
              <p className="text-gray-400 text-sm font-medium">Loading plans...</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#060d1f] text-white">
        <Navbar />
        <section className="pt-32 pb-20 px-4 relative overflow-hidden">
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <AlertCircle className="text-red-400" size={36} />
              <p className="text-gray-400 text-sm">{error}</p>
              <Button variant="primary" onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060d1f] text-white selection:bg-purple-500/30 font-sans flex flex-col justify-between">
      <Navbar />

      <section className="pt-32 pb-24 px-4 relative overflow-hidden flex-1">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-blue-500/10 border border-blue-400/30 rounded-full"
            >
              <Sparkles size={14} className="text-blue-400" />
              <span className="text-xs font-medium text-blue-300 tracking-wider">FLEXIBLE PLANS</span>
              <Sparkles size={14} className="text-blue-400" />
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Choose Your{' '}
              </span>
              <br className="sm:hidden" />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Success Path
              </span>
            </h1>

            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Unlock premium features and accelerate your exam preparation with
              <span className="text-blue-400 font-medium"> flexible plans</span> designed for every learner
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield size={14} className="text-emerald-400" />
                <span>30-Day Money Back</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Users size={14} className="text-blue-400" />
                <span>24,000+ Students</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Award size={14} className="text-amber-400" />
                <span>94% Pass Rate</span>
              </div>
            </div>
          </motion.div>

          {plans.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24 text-gray-400 bg-white/[0.01] border border-white/5 rounded-2xl"
            >
              <AlertCircle className="mx-auto text-gray-600 mb-2" size={24} />
              <p className="text-sm">No active plans available at the moment.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans.map((plan, index) => {
                const IconComponent = iconMap[plan.icon] || Zap;
                const isPopular = plan.popular || false;
                const features = normalizeFeatures(plan.features);
                return (
                  <motion.div
                    key={plan.id || plan._id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className={`relative bg-[#0b1221]/60 backdrop-blur-md border rounded-3xl p-8 flex flex-col shadow-2xl transition-all duration-300 ${isPopular
                        ? 'border-blue-500 shadow-blue-500/20 hover:shadow-blue-500/30'
                        : 'border-white/10 hover:border-white/20'
                      }`}
                  >
                    {isPopular && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10"
                      >
                        <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-bold px-4 py-1 rounded-full shadow-lg shadow-blue-500/30 tracking-wider uppercase">
                          <Flame size={12} />
                          Most Popular
                        </span>
                      </motion.div>
                    )}
                    <div className="flex items-center gap-4 mb-6 mt-2">
                      <div className={`p-3 rounded-2xl transition-all duration-300 ${isPopular
                          ? 'bg-blue-500/20 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                          : 'bg-blue-500/10 border border-blue-500/20'
                        }`}>
                        <IconComponent className={isPopular ? 'text-cyan-400' : 'text-blue-400'} size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold capitalize tracking-wide text-white">{plan.name}</h3>
                        {isPopular && (
                          <span className="text-[10px] text-blue-400 font-medium">⭐ Best Value</span>
                        )}
                      </div>
                    </div>
                    <div className="mb-4">
                      <span className="text-4xl sm:text-5xl font-extrabold text-white">
                        LKR {Number(plan.price).toLocaleString()}
                      </span>
                      <span className="text-gray-400 text-sm font-light ml-1">/mo</span>
                      {isPopular && (
                        <div className="mt-1">
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Save 20% vs monthly
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-4">
                      <Sparkles size={13} className="fill-amber-400/20" />
                      <span>{plan.credits || 0} credits granted monthly</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-grow">
                      {features.length > 0 ? (
                        features.map((feature, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + idx * 0.05 }}
                            className="flex items-start gap-3 text-sm text-gray-300 font-light"
                          >
                            <CheckCircle size={16} className={`${isPopular ? 'text-cyan-400' : 'text-emerald-400'
                              } mt-0.5 flex-shrink-0`} />
                            <span>{feature}</span>
                          </motion.li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500 font-light">No features listed</li>
                      )}
                    </ul>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="mt-auto pt-4 border-t border-white/5"
                    >
                      <Button
                        variant={isPopular ? "primary" : "outline"}
                        size="lg"
                        fullWidth
                        onClick={() => navigate('/auth/register')}
                        className={`group ${isPopular ? 'shadow-lg shadow-blue-500/30' : ''}`}
                      >
                        <span>Get {plan.name}</span>
                        <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-center"
          >
            <div className="inline-flex items-center gap-6 px-6 py-3 bg-white/[0.02] border border-white/5 rounded-full">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle size={12} className="text-emerald-400" />
                <span>No hidden fees</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle size={12} className="text-emerald-400" />
                <span>Cancel anytime</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle size={12} className="text-emerald-400" />
                <span>Secure payments</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}