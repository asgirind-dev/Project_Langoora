import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, RefreshCw, Rocket, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import axios from 'axios';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

// Helper function to safely normalize features array
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
        const response = await axios.get('http://localhost:5000/api/subscription-management/plans');
        setPlans(response.data || []);
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
      <div className="min-h-screen bg-[#060d1f] text-white flex flex-col justify-between">
        <Navbar />
        <section className="pt-32 pb-20 px-4 relative overflow-hidden flex-1">
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="animate-spin text-purple-400" size={36} />
              <p className="text-gray-400 text-sm font-medium">Loading dynamic subscription tiers...</p>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#060d1f] text-white flex flex-col justify-between">
        <Navbar />
        <section className="pt-32 pb-20 px-4 relative overflow-hidden flex-1">
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <AlertCircle className="text-red-400" size={36} />
              <p className="text-gray-400 text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-4 py-2 bg-purple-600 rounded-xl text-xs font-bold hover:bg-purple-500 transition-all cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const activePlans = plans.filter(plan => plan.active !== false);

  return (
    <div className="min-h-screen bg-[#060d1f] text-white selection:bg-purple-500/30 font-sans flex flex-col justify-between">
      <Navbar />
      
      <section className="pt-32 pb-24 px-4 relative overflow-hidden flex-1">
        {/* Glowing Background Blur Effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Header Title */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Flexible Plans for Every Learner
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Choose the right plan to supercharge your exam preparation with fixed token weights and real-time practice.
            </p>
          </motion.div>

          {/* Cards Grid or Empty State */}
          {activePlans.length === 0 ? (
            <div className="text-center py-24 text-gray-400 bg-white/[0.01] border border-white/5 rounded-3xl p-8 max-w-md mx-auto">
              <AlertCircle className="mx-auto text-gray-500 mb-2" size={32} />
              <p className="text-sm font-semibold text-white">No active subscription plans available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePlans.map((plan) => {
                const features = normalizeFeatures(plan.features);
                const isPopular = plan.popular || false;
                
                return (
                  <motion.div 
                    key={plan._id || plan.id}
                    whileHover={{ y: -6 }}
                    className={`relative rounded-3xl flex flex-col transition-all duration-300 ${
                      isPopular ? 'shadow-2xl shadow-purple-500/10' : ''
                    }`}
                  >
                    {/* MOST POPULAR BADGE */}
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                        <span className="px-3.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md shadow-purple-500/20">
                          MOST POPULAR
                        </span>
                      </div>
                    )}

                    {/* CARD CONTAINER */}
                    <div className={`p-6 border-2 text-left transition-all duration-300 relative rounded-2xl bg-[#0f1424]/90 backdrop-blur-xl flex flex-col h-full ${
                      isPopular 
                        ? 'border-purple-500/40 shadow-2xl shadow-purple-500/10' 
                        : 'border-white/10 hover:border-white/20'
                    }`}>
                      
                      {/* Rocket Icon Container */}
                      <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center mb-3">
                        <Rocket size={18} className="text-purple-400" />
                      </div>

                      {/* Plan Title */}
                      <h2 className="text-xl font-bold text-white tracking-wide uppercase">{plan.name}</h2>

                      {/* Price Display */}
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-white tracking-tight">
                          LKR {Number(plan.price || 0).toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-gray-400">/month</span>
                      </div>

                      {/* Credits Granted Badge */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mt-2.5 mb-4">
                        <Sparkles size={13} className="fill-amber-400/20" />
                        <span>{plan.credits || 0} credits granted</span>
                      </div>

                      {/* Features List */}
                      <div className="space-y-2.5 my-4 flex-1">
                        {features.length > 0 ? (
                          features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-xs font-medium text-gray-300">
                              <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500 italic">No features listed</div>
                        )}
                      </div>

                      {/* CTA Button */}
                      <div className="mt-auto pt-4 border-t border-white/5">
                        <button
                          onClick={() => navigate('/auth/register')}
                          className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
                            isPopular 
                              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-purple-500/20' 
                              : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/20'
                          }`}
                        >
                          <span>Choose {plan.name}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}