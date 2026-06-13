import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ShieldCheck, Mail, LogOut, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

export default function UnderReviewPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // Handle logout workflow if tutor wants to sign out
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth/login');
    } catch (err) {
      console.error("Logout failed during review state:", err);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      
      {/* Animated Icon Container */}
      <div className="relative mb-8">
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="w-24 h-24 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400 relative z-10"
        >
          <Clock size={44} className="animate-pulse" />
        </motion.div>
        
        {/* Decorative Outer Glow Ring */}
        <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full scale-75 opacity-50" />
      </div>

      {/* Header Titles */}
      <motion.h2 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-3 tracking-tight"
      >
        Account Under Review
      </motion.h2>
      
      <motion.p 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-gray-400 max-w-md text-sm leading-relaxed mb-8"
      >
        Hi <span className="text-amber-400 font-medium">{user?.name || 'Tutor'}</span>, thank you for joining Langoora! Our team is currently verifying your qualifications and certificates. 
      </motion.p>

      {/* Status Workflow Cards */}
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 text-left space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Verification Progress</h4>
        
        {/* Step 1: Completed */}
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 bg-emerald-500/20 text-emerald-400 p-1 rounded-lg border border-emerald-500/30">
            <ShieldCheck size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Application Submitted</p>
            <p className="text-xs text-gray-400 mt-0.5">Your profile and qualifications metadata have been saved.</p>
          </div>
        </div>

        {/* Step 2: Pending */}
        <div className="flex items-start gap-3.5 pt-2 border-t border-white/5">
          <div className="mt-0.5 bg-amber-500/20 text-amber-400 p-1 rounded-lg border border-amber-500/30 animate-pulse">
            <FileText size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-400">Document Verification</p>
            <p className="text-xs text-gray-400 mt-0.5">We are reviewing your uploaded JLPT/Degree certificate documents. (Takes up to 24-48 hours)</p>
          </div>
        </div>
      </div>

      {/* Info Alert Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 max-w-md flex items-center gap-3 text-left mb-8">
        <Mail size={18} className="text-blue-400 flex-shrink-0" />
        <p className="text-xs text-gray-400 leading-normal">
          We will send a confirmation email to <span className="text-blue-400 font-medium">{user?.email || 'your email'}</span> once your dashboard workspace is ready.
        </p>
      </div>

      {/* Action Dispatcher Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-md justify-center">
        <Button 
          variant="secondary" 
          size="md" 
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-2"
        >
          Check Status <ArrowRight size={16} />
        </Button>
        
        <Button 
          variant="ghost" 
          size="md" 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 text-gray-400 hover:text-white"
        >
          <LogOut size={16} /> Sign Out
        </Button>
      </div>

    </div>
  );
}