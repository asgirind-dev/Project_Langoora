import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm dark:shadow-md text-slate-700 dark:text-cyan-400 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all duration-200 focus:outline-none"
      title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <motion.div
        initial={{ scale: 0.6, rotate: 90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.2 }}
        key={isDarkMode ? 'dark' : 'light'}
        className="flex items-center justify-center"
      >
        {isDarkMode ? (
          <Sun size={16} className="text-amber-400 font-bold" />
        ) : (
          <Moon size={16} className="text-indigo-600 font-bold" />
        )}
      </motion.div>
    </button>
  );
}