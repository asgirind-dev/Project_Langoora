export default function Input({ label, error, icon: Icon, type = 'text', className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
        <input
          type={type}
          className={`
            w-full bg-white/5 border ${error ? 'border-red-500/60' : 'border-white/10'}
            rounded-xl px-4 py-3 text-white placeholder-gray-500
            focus:outline-none focus:border-blue-500/60 focus:bg-white/8
            transition-all duration-200 text-sm
            ${Icon ? 'pl-10' : ''}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
