import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', hover = false, onClick }) {
const base = 'bg-white/80 dark:bg-white/5 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none transition-all duration-250';  
  if (hover) {
    return (
      <motion.div
        whileHover={{ 
          y: -4, 
          boxShadow: '0 20px 40px rgba(0,0,0,0.06)' 
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        className={`${base} cursor-pointer hover:shadow-md dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] ${className}`}
      >
        {children}
      </motion.div>
    );
  }
  
  return (
    <div className={`${base} ${className}`}>
      {children}
    </div>
  );
}