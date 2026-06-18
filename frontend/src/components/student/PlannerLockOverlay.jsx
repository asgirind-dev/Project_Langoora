import { motion } from 'framer-motion';
import { Crown, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button'; 

export default function PlannerLockOverlay() {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-40 bg-[#060d1f]/60 backdrop-blur-xl flex flex-col items-center justify-center text-center p-6 rounded-3xl border border-white/5 min-h-[550px]"
    >
      
      <motion.div 
        initial={{ scale: 0.8, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          repeat: Infinity,
          repeatType: "reverse",
          duration: 2
        }}
        className="relative mb-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/5">
          <Crown size={38} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center text-gray-400 shadow-md">
          <Lock size={12} />
        </div>
      </motion.div>

      {/* Text Context */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-md space-y-3"
      >
        <h2 className="text-2xl font-extrabold text-white tracking-tight uppercase sm:text-3xl">
          Unlock Your Study Planner
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed px-4">
          Dynamic milestone mapping, countdown exam trackers, and daily micro-task tracking are premium features. Subscribe to an elite package to unlock this workspace.
        </p>
      </motion.div>

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 w-full max-w-xs"
      >
        <Button 
          variant="primary" 
          fullWidth
          onClick={() => navigate('/student/subscription')}
          className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 font-bold py-3 rounded-xl shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-2 tracking-wide text-xs"
        >
          Upgrade To Premium Framework <ArrowRight size={14} />
        </Button>
      </motion.div>

      {/* Bottom Footer Meta */}
      <div className="absolute bottom-6 text-[11px] text-gray-600 font-mono tracking-wider uppercase">
        Langoora Governance Infrastructure · 2026
      </div>
    </motion.div>
  );
}