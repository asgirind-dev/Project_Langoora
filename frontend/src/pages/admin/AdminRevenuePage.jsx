import { useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, TrendingUp, Users, BookOpen, Calendar, Download } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { recentTransactions } from '../../data/mockData';

const monthlyData = [
  { month: 'Jan', revenue: 1200000, tutors: 580000, platform: 620000 },
  { month: 'Feb', revenue: 1850000, tutors: 920000, platform: 930000 },
  { month: 'Mar', revenue: 1620000, tutors: 800000, platform: 820000 },
  { month: 'Apr', revenue: 2100000, tutors: 1050000, platform: 1050000 },
  { month: 'May', revenue: 2450000, tutors: 1200000, platform: 1250000 },
  { month: 'Jun', revenue: 2980000, tutors: 1450000, platform: 1530000 },
];

export default function AdminRevenuePage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [period, setPeriod] = useState('6m');

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Revenue Analytics</h1>
            <p className="text-gray-400">Platform financial overview and breakdowns</p>
          </div>
          <Button variant="secondary" size="sm"><Download size={14} /> Export CSV</Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: 'LKR 18.4M', icon: DollarSign, color: 'text-emerald-400', sub: '+24% YoY' },
          { label: 'Platform Share', value: 'LKR 9.2M', icon: TrendingUp, color: 'text-blue-400', sub: '50% cut' },
          { label: 'Tutor Payouts', value: 'LKR 9.2M', icon: Users, color: 'text-cyan-400', sub: 'This year' },
          { label: 'Avg. per Exam', value: 'LKR 2,850', icon: BookOpen, color: 'text-amber-400', sub: 'Across 1,847 exams' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className="p-5">
              <s.icon size={20} className={`${s.color} mb-3`} />
              <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
              <div className="text-xs text-emerald-400 mt-1">{s.sub}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Date Filter Bar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {[
              { label: '7D', value: '7d' },
              { label: '1M', value: '1m' },
              { label: '3M', value: '3m' },
              { label: '6M', value: '6m' },
              { label: '1Y', value: '1y' },
              { label: 'All', value: 'all' },
            ].map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p.value ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" />
            <span className="text-gray-500 text-xs">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-5">Revenue Breakdown</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
            <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={v => [`LKR ${v.toLocaleString()}`, '']} />
            <Bar dataKey="tutors" fill="#3b82f6" radius={[4,4,0,0]} name="Tutor Payouts" stackId="a" />
            <Bar dataKey="platform" fill="#06b6d4" radius={[4,4,0,0]} name="Platform Share" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Transaction History</h3>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <input type="date" className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" />
            <span className="text-gray-500 text-xs">to</span>
            <input type="date" className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['ID', 'User', 'Exam', 'Amount', 'Date', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentTransactions.map(t => (
                <tr key={t.id} className="hover:bg-white/3">
                  <td className="py-3 pr-4 text-xs text-blue-400 font-mono">{t.id}</td>
                  <td className="py-3 pr-4 text-sm text-gray-300">{t.user}</td>
                  <td className="py-3 pr-4 text-sm text-gray-300">{t.exam}</td>
                  <td className="py-3 pr-4 text-sm font-semibold text-white">LKR {t.amount.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-xs text-gray-500">{t.date}</td>
                  <td className="py-3">
                    <Badge color={t.status === 'completed' ? 'green' : t.status === 'pending' ? 'yellow' : 'red'}>{t.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
