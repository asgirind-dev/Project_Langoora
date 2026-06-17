import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ArrowDownToLine, Clock, CheckCircle } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { tutorRevenueData, recentTransactions } from '../../data/mockData';

export default function TutorEarningsPage() {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Earnings & Payouts</h1>
        <p className="text-gray-400">Track your revenue and manage withdrawals</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Earned', value: 'LKR 1.5M', icon: DollarSign, color: 'text-emerald-400' },
          { label: 'This Month', value: 'LKR 112K', icon: DollarSign, color: 'text-blue-400' },
          { label: 'Pending', value: 'LKR 65K', icon: Clock, color: 'text-amber-400' },
          { label: 'Withdrawn', value: 'LKR 1.02M', icon: CheckCircle, color: 'text-cyan-400' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className="p-5">
              <s.icon size={20} className={`${s.color} mb-3`} />
              <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-white mb-5">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tutorRevenueData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${((v || 0)/1000).toFixed(0)}K`} />
              <Tooltip 
                contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} 
                formatter={v => [`LKR ${(v ?? 0).toLocaleString()}`, 'Revenue']} 
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border-emerald-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Withdraw Funds</h3>
          <div className="text-center mb-5">
            <div className="text-3xl font-bold text-emerald-400">LKR 485,000</div>
            <div className="text-sm text-gray-400 mt-1">Available balance</div>
          </div>
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Bank Account</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
                <option className="bg-[#0f1629]">Commercial Bank **** 4521</option>
                <option className="bg-[#0f1629]">Sampath Bank **** 7823</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Amount (LKR)</label>
              <input type="number" placeholder="Enter amount" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/60" />
            </div>
          </div>
          <Button variant="success" fullWidth><ArrowDownToLine size={16} /> Request Withdrawal</Button>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-5">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Transaction ID', 'Student', 'Exam', 'Amount', 'Date', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(recentTransactions || []).map(t => (
                <tr key={t?.id} className="hover:bg-white/3 transition-colors">
                  <td className="py-3 text-xs text-blue-400 font-mono">{t?.id || 'N/A'}</td>
                  <td className="py-3 text-sm text-gray-300">{t?.user || 'Unknown'}</td>
                  <td className="py-3 text-sm text-gray-300">{t?.exam || 'N/A'}</td>
                  <td className="py-3 text-sm font-semibold text-white">
                    LKR {(t?.amount ?? 0).toLocaleString()}
                  </td>
                  <td className="py-3 text-xs text-gray-500">{t?.date || 'N/A'}</td>
                  <td className="py-3">
                    <Badge color={t?.status === 'completed' ? 'green' : t?.status === 'pending' ? 'yellow' : 'red'}>
                      {t?.status || 'unknown'}
                    </Badge>
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