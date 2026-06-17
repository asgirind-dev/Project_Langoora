import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, CheckCircle, Star, ArrowRight, RefreshCw, Rocket, Crown, Infinity, Award, Layers } from 'lucide-react';
import axios from 'axios';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import Button from '../../components/ui/Button';

// SubscriptionManager eke wage ma icon map eka
const iconMap = {
  Zap: Zap,
  Rocket: Rocket,
  Crown: Crown,
  Infinity: Infinity,
  Star: Star,
  Award: Award,
  Layers: Layers
};

export default function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        // Backend API eka
        const res = await axios.get('http://localhost:5000/api/subscription-management/plans');
        setPlans(res.data);
      } catch (e) { 
        console.error("Error loading plans:", e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-[#060d1f] text-white">
      <Navbar />
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">Choose Your Plan</h1>
            <p className="text-gray-400 text-lg">Select the perfect plan to boost your exam performance.</p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans.map((plan) => {
                const IconComponent = iconMap[plan.icon] || Zap;
                
                return (
                  <motion.div 
                    key={plan.id}
                    whileHover={{ y: -10 }}
                    // Popular check eka - border eka wenas wenawa
                    className={`relative bg-[#0b1221] border ${plan.popular ? 'border-blue-500' : 'border-white/10'} rounded-3xl p-8 flex flex-col shadow-2xl hover:border-blue-500/50 transition-all`}
                  >
                    {/* MOST POPULAR Badge eka */}
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg z-10 whitespace-nowrap">
                        MOST POPULAR
                      </div>
                    )}

                    {/* Header: Icon and Name */}
                    <div className="flex items-center gap-4 mb-6 mt-2">
                      <div className="p-3 bg-blue-500/10 rounded-2xl">
                        <IconComponent className="text-blue-500" size={28} />
                      </div>
                      <h3 className="text-2xl font-bold capitalize">{plan.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-5xl font-bold">LKR {plan.price}</span>
                      <span className="text-gray-400 font-medium">/mo</span>
                    </div>

                    {/* Credits Badge */}
                    {plan.credits && (
                      <div className="bg-amber-500/10 text-amber-400 text-xs font-semibold px-4 py-2 rounded-full w-fit mb-6 flex items-center gap-2 border border-amber-500/20">
                        <Star size={12} /> {plan.credits} Credits Included
                      </div>
                    )}

                    {/* Features List */}
                    <ul className="space-y-4 mb-8 flex-grow">
                      {plan.features?.map((f, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                          <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    <Button 
                      variant={plan.popular ? "primary" : "outline"} 
                      size="lg" 
                      fullWidth 
                      onClick={() => navigate('/auth/register')}
                      className={plan.popular ? "bg-blue-600 hover:bg-blue-700" : ""}
                    >
                      Choose {plan.name} <ArrowRight size={18} className="ml-2" />
                    </Button>
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