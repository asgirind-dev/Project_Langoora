import { useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, CreditCard, Activity, TrendingUp } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const financeData = [
  { month: 'Jan', revenue: 450000, credits: 3000 },
  { month: 'Feb', revenue: 520000, credits: 4200 },
  { month: 'Mar', revenue: 480000, credits: 3800 },
  { month: 'Apr', revenue: 610000, credits: 5500 },
  { month: 'May', revenue: 750000, credits: 6200 },
  { month: 'Jun', revenue: 920000, credits: 8100 },
];

export default function FinanceDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white">Finance Overview</h1>
        <p className="text-gray-400 mt-1">Platform revenue matrix and credit economy monitoring</p>
      </motion.div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: 'LKR 3.7M', icon: DollarSign, color: 'text-green-400' },
          { label: 'Active Credits', value: '45,200', icon: CreditCard, color: 'text-blue-400' },
          { label: 'Payouts Pending', value: '12', icon: Activity, color: 'text-amber-400' },
          { label: 'Growth Rate', value: '+14.2%', icon: TrendingUp, color: 'text-emerald-400' },
        ].map((s, i) => (
          <GlassCard key={i} className="p-4 border-white/10">
            <s.icon size={18} className={`${s.color} mb-2`} />
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Analytics Chart */}
      <GlassCard className="p-6 border-white/10">
        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-400" /> Revenue vs Credit Redeemed
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={financeData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}