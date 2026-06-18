import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, CheckCircle, Star, ArrowRight, RefreshCw, Rocket, Crown, Infinity, Award, Layers } from 'lucide-react';
import axios from 'axios';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import Button from '../../components/ui/Button';


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
       
        const response = await axios.get('http://localhost:5000/api/subscription-management/plans');
        setPlans(response.data);
      } catch (error) {
        console.error("Error loading plans:", error);
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
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">
              Choose Your Plan
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Choose the plan that best suits you to make your learning journey more successful.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="animate-spin text-blue-500" size={36} />
              <p className="text-gray-400 text-sm">Loading plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p>No plans are currently included.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans
               
                .filter(plan => plan.active === true) 
                .map((plan) => {
                  const IconComponent = iconMap[plan.icon] || Zap;
                  const isPopular = plan.popular || false;
                  
                  return (
                    <motion.div 
                      key={plan._id}
                      whileHover={{ y: -6 }}
                      className={`relative bg-[#0b1221]/60 backdrop-blur-md border rounded-3xl p-8 flex flex-col shadow-2xl transition-all duration-300 ${
                        isPopular ? 'border-blue-500 shadow-blue-500/10' : 'border-white/10'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-lg z-10 tracking-wider uppercase">
                          MOST POPULAR
                        </div>
                      )}

                      <div className="flex items-center gap-4 mb-6 mt-2">
                        <div className={`p-3 rounded-2xl ${isPopular ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                          <IconComponent className={isPopular ? 'text-cyan-400' : 'text-blue-400'} size={24} />
                        </div>
                        <h3 className="text-2xl font-bold capitalize tracking-wide text-white">{plan.name}</h3>
                      </div>

                      <div className="mb-4">
                        <span className="text-4xl sm:text-5xl font-extrabold text-white">
                          LKR {Number(plan.price).toLocaleString()}
                        </span>
                        <span className="text-gray-400 text-sm font-light ml-1">/mo</span>
                      </div>

                      <div className="mb-2">
                        <span className="text-sm text-gray-400">
                          <span className="text-amber-400 font-semibold">{plan.credits || 0}</span> credits 
                        </span>
                      </div>

                      <ul className="space-y-4 mb-8 flex-grow mt-4">
                        {plan.features && plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-gray-300 font-light">
                            <CheckCircle size={16} className={`${isPopular ? 'text-cyan-400' : 'text-emerald-400'} mt-0.5 flex-shrink-0`} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button 
                        variant={isPopular ? "primary" : "outline"} 
                        size="lg" 
                        fullWidth 
                        onClick={() => navigate('/auth/register')}
                        className={isPopular ? "shadow-lg shadow-blue-500/20" : ""}
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
    </div>
  );
}