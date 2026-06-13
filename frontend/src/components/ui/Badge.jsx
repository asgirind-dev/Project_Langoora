const colorMap = {
  blue: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  green: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  red: 'bg-red-500/20 text-red-300 border border-red-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  gray: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
  amber: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
};

export default function Badge({ children, color = 'blue', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[color] || colorMap.blue} ${className}`}>
      {children}
    </span>
  );
}
