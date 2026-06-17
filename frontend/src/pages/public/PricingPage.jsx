import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, CheckCircle, Star, ArrowRight, RefreshCw, Rocket, Crown, Infinity, Award, Layers } from 'lucide-react';
import axios from 'axios';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import Button from '../../components/ui/Button';

// Backend එකෙන් එන string icon එක Lucide component එකකට map කරන grid එක
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
        // Backend API Endpoint Loop එකෙන් dynamic data ඇදීම
        const res = await axios.get('http://localhost:5000/api/subscription-management/plans');
        setPlans(res.data);
      } catch (e) { 
        console.error("Error loading subscription plans from backend:", e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-[#060d1f] text-white selection:bg-blue-500/30">
      <Navbar />
      
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Decorative background glow arrays */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[30%] w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 tracking-tight">Choose Your Plan</h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto font-light">
              Select the perfect credit configuration plan to maximize your exam performance metrics.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="animate-spin text-blue-500" size={36} />
              <p className="text-xs text-gray-500 font-mono">Fetching active tiers...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans.map((plan) => {
                const IconComponent = iconMap[plan.icon] || Zap;
                
                return (
                  <motion.div 
                    key={plan.id || plan._id}
                    whileHover={{ y: -6 }}
                    className={`relative bg-[#0b1221]/60 backdrop-blur-md border ${
                      plan.popular ? 'border-blue-500' : 'border-white/10'
                    } rounded-3xl p-8 flex flex-col shadow-2xl hover:border-blue-500/40 transition-all duration-300`}
                  >
                    {/* POPULAR SPEC Badge */}
                    {plan.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-lg z-10 tracking-wider uppercase">
                        MOST POPULAR
                      </div>
                    )}

                    {/* Card Header Profile */}
                    <div className="flex items-center gap-4 mb-6 mt-2">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                        <IconComponent className="text-blue-400" size={24} />
                      </div>
                      <h3 className="text-2xl font-bold capitalize tracking-wide">{plan.name}</h3>
                    </div>

                    {/* Pricing Node */}
                    <div className="mb-6">
                      <span className="text-4xl sm:text-5xl font-extrabold text-white">
                        LKR {plan.price?.toLocaleString()}
                      </span>
                      <span className="text-gray-400 text-sm font-light ml-1">/mo</span>
                    </div>

                    {/* Dynamic Credit Counter Badge */}
                    {plan.credits && (
                      <div className="bg-amber-500/10 text-amber-400 text-xs font-semibold px-4 py-2 rounded-xl w-fit mb-6 flex items-center gap-2 border border-amber-500/20">
                        <Star size={12} className="fill-amber-400/20" /> {plan.credits} System Credits Included
                      </div>
                    )}

                    {/* Dynamic Structural Features */}
                    <ul className="space-y-4 mb-8 flex-grow">
                      {plan.features?.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-gray-300 font-light">
                          <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Form Action Routing */}
                    <Button 
                      variant={plan.popular ? "primary" : "outline"} 
                      size="lg" 
                      fullWidth 
                      onClick={() => navigate('/auth/register')}
                      className={`rounded-xl font-bold ${
                        plan.popular ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/15" : "border-white/10 hover:bg-white/5"
                      }`}
                    >
                      Choose {plan.name} <ArrowRight size={16} className="ml-2" />
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