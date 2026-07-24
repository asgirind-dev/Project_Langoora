import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, Zap, Shield, Star, Rocket, Infinity, Award, Layers, RefreshCw } from 'lucide-react';
import axios from 'axios';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SubscriptionCheckoutModal from './SubscriptionCheckoutModal';

const iconMap = { Zap, Rocket, Crown, Infinity, Star, Award, Layers, Shield };

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  
  // 🏦 Student profile state එක මුලින් null තියෙන්නේ
  const [studentDetails, setStudentDetails] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('token'); 
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };

        console.log("📡 STARTING DATA FETCHING...");

        // 1️⃣. SUBSCRIPTION PLANS FETCH කිරීම
        try {
          const plansRes = await axios.get('http://localhost:5000/api/subscription-management/plans');
          console.log("🎯 PLANS RECEIVED:", plansRes.data);
          setPlans(plansRes.data);
        } catch (planError) {
          console.error("❌ ERROR FETCHING PLANS:", planError.message);
        }

        // 2️⃣. STUDENT PROFILE FETCH කිරීම
        // 2️⃣. STUDENT PROFILE FETCH කිරීම
// 2️⃣. STUDENT PROFILE FETCH කිරීම (Fix version with check-out profile)
try {
  // 💡 අපි කෙලින්ම userController.getStudentProfile එක වැඩ කරන /checkout-profile එකට කතා කරනවා
  const profileRes = await axios.get('http://localhost:5000/api/users/checkout-profile', config);
  console.log("🎯 PROFILE RECEIVED:", profileRes.data);
  
  // Backend එකෙන් සාමාන්‍යයෙන් එන්නේ { success: true, data: { ... } } හෝ කෙලින්ම object එකක්
  const responseData = profileRes.data.data || profileRes.data.user || profileRes.data;

  if (responseData) {
    setStudentDetails({
      bankName: responseData.bankName || responseData.bank_name || null,
      accountNo: responseData.accountNo || responseData.account_no || null,
      accountHolder: responseData.accountHolder || responseData.account_holder || responseData.name || 'Student'
    });
  }
} catch (profileError) {
  console.error("❌ ERROR FETCHING PROFILE:", profileError.response ? profileError.response.data : profileError.message);
  setStudentDetails({ bankName: null, accountNo: null, accountHolder: 'Student' });
}

      } catch (e) { 
        console.error("❌ GENERAL FETCH ERROR:", e); 
      } finally { 
        setLoading(false); 
      }
    };
    
    fetchData();
  }, []);

  const handleUpgradeClick = (plan) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  return (
    <div className="space-y-8 p-6">
      {/* Title section */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Subscription Plans</h1>
        <p className="text-gray-400">Choose the right plan for your exam preparation</p>
      </motion.div>

      {/* Current Active Plan Card */}
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

      {/* Loading Spinner */}
      {loading ? (
        <div className="flex justify-center py-10">
          <RefreshCw className="animate-spin text-blue-500" />
        </div>
      ) : (
        /* Plans Grid View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans
            .filter(plan => plan.active === true)
            .map((plan, i) => {
              const IconComponent = iconMap[plan.icon] || Zap;
              const formattedPrice = `LKR ${Number(plan.price).toLocaleString()}`;
              
              return (
                <motion.div 
                  key={plan.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.1 }}
                >
                  <GlassCard className={`p-7 h-full relative flex flex-col justify-between ${plan.popular ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
                    <div>
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
                        <span className="text-4xl font-bold text-white">{formattedPrice}</span>
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
                    </div>

                    <Button 
                      variant={plan.popular ? 'primary' : 'secondary'} 
                      fullWidth 
                      onClick={() => handleUpgradeClick({
                        id: plan.id,
                        name: plan.name,
                        price: formattedPrice,
                        credits: plan.credits || 100
                      })}
                    >
                      Upgrade to {plan.name}
                    </Button>
                  </GlassCard>
                </motion.div>
              );
            })}
        </div>
      )}

      {/* 👑 CHECKOUT MODAL INTERACTION */}
      {/* studentDetails එක ආවට පස්සේ විතරක් Modal එක open කරන්න දාලා තියෙන්නේ බටන් එක හරියට පෙන්නන්න */}
      {showCheckout && studentDetails && (
        <SubscriptionCheckoutModal 
          plan={selectedPlan} 
          userDetails={studentDetails} 
          onClose={() => setShowCheckout(false)} 
          onPaymentSuccess={(newCredits) => {
            setShowCheckout(false);
            window.location.reload(); 
          }} 
        />
      )}
    </div>
  );
}