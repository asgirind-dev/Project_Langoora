import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/15 dark:shadow-blue-500/25',

  secondary: 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white border border-slate-200 dark:border-white/20',

  ghost: 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white',

  danger: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/15 dark:shadow-red-500/25',

  success: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/15 dark:shadow-emerald-500/25',

  outline: 'border border-blue-600/40 dark:border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-600/5 dark:hover:bg-blue-500/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
  xl: 'px-8 py-4 text-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  fullWidth = false,
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        rounded-xl font-semibold transition-all duration-200 cursor-pointer
        flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}