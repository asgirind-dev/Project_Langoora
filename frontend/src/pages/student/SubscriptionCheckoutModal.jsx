import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Lock, AlertCircle, X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function SubscriptionCheckoutModal({ plan, onClose, onPaymentSuccess }) {
  const { user } = useAuth();
  const navigate = useNavigate(); 

  // Plan details unpack
  const planName = plan?.name || "Premium Pro Blueprint";
  const planPrice = plan?.price || "LKR 2,500";
  const planCredits = plan?.credits || 150;

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setPaymentStatus(null);

    try {
      const token = localStorage.getItem('token');
      const studentId = user?.uid || user?.id; 

      // 1️⃣ බැක්-එන්ඩ් එකේ අපි හදපු Upgrade API එකට Request එක යැවීම
      // Note: Backend endpoint එක /api/subscription/upgrade ද /api/subscription/charge ද කියලා ඔයාගේ routes අනුව චෙක් කරගන්න.
      const response = await fetch('http://localhost:5000/api/subscription-management/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          planId: plan.plan_id || plan.id,
          studentId: studentId 
        })
      });

      const result = await response.json();

      if (response.ok && result.payhereData) {
        
        // 2️⃣ PayHere JavaScript SDK එකට Data ටික ලබා දී Popup එක Open කිරීම
        window.payhere.startPayment(result.payhereData);

        // 3️⃣ Payment එක සාර්ථක වූ විට ක්‍රියාත්මක වන Listener එක
        window.payhere.onCompleted = function onCompleted(orderId) {
          console.log("Payment completed for orderId : " + orderId);
          setPaymentStatus('success');
          navigate(`/student/payment-success?order_id=${orderId}`);
          
          if (onPaymentSuccess) {
            onPaymentSuccess(); // Frontend UI එක update කිරීමට
          }

          setTimeout(() => {
            if (onClose) onClose();
            navigate('/student/payment-success', {
              state: {
                paymentDetails: {
                  transactionId: orderId,
                  date: new Date().toLocaleString(),
                  package: planName,
                  amount: planPrice,
                  method: 'PayHere Gateway'
                }
              },
              replace: true 
            });
          }, 1500);
        };

        // 4️⃣ User විසින් Payment එක Cancel කළ විට
        window.payhere.onDismissed = function onDismissed() {
          console.log("Payment dismissed by user");
          setIsProcessing(false);
        };

        // 5️⃣ Payment එකේදී යම් දෝෂයක් ඇති වුවහොත්
        window.payhere.onError = function onError(error) {
          console.error("PayHere SDK Error:", error);
          setPaymentStatus('error');
          setIsProcessing(false);
        };

      } else {
        setPaymentStatus('error');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Secure payment Node routing error:", error);
      setPaymentStatus('error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-xl overflow-hidden bg-[#0a0f1d] border border-white/10 rounded-3xl shadow-2xl relative"
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all">
          <X size={18} />
        </button>

        <form onSubmit={handlePaymentSubmit}>
          <div className="p-6 bg-gradient-to-r from-blue-600/20 via-indigo-600/10 to-transparent border-b border-white/5">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">PayHere Secure Gateway</span>
            <div className="flex justify-between items-end mt-4">
              <div>
                <h3 className="text-xl font-bold text-white">{planName}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Includes full mock exam vaults & answers</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-white">{planPrice}</div>
                <Badge color="amber" className="mt-1">+{planCredits} Exam Credits</Badge>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 💳 GATEWAY NOTICE INFO BOX */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-white/5 to-transparent border border-blue-500/20 shadow-inner flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                <CreditCard size={18} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Method</div>
                <div className="text-sm font-extrabold text-white mt-1">
                  Credit / Debit Card or Mobile Wallets
                </div>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  You will be securely redirected to PayHere Sandbox overlay to complete the transaction. No card details are stored on our servers.
                </p>
              </div>
            </div>

            {paymentStatus === 'success' && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-medium">
                <CheckCircle size={14} className="shrink-0" />
                <span>Payment Verified! Redirecting to success node...</span>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-medium">
                <AlertCircle size={14} className="shrink-0" />
                <span>Gateway Transaction Refused or Cancelled. Please try again.</span>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-white/5 bg-white/1 flex flex-col gap-3">
            <Button 
              type="submit" 
              variant="primary" 
              fullWidth 
              disabled={isProcessing} 
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 py-3.5 font-bold tracking-wide shadow-lg shadow-blue-500/10"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting PayHere Gateway...</span>
                </div>
              ) : (
                `Proceed to Pay ${planPrice}`
              )}
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-medium">
              <Lock size={10} className="text-emerald-500" />
              <span>Encrypted via 256-Bit SSL Gateway. Credits sync automatically upon Webhook approval.</span>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}