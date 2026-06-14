import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, BookOpen, Star, TrendingUp, ArrowRight, Plus, Eye, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { tutorRevenueData } from '../../data/mockData';

const myExams = [
  { id: 1, title: 'JLPT N2 Full Mock Exam 2024', students: 342, revenue: 855000, rating: 4.8, status: 'published' },
  { id: 2, title: 'JLPT N3 Grammar Section', students: 218, revenue: 480000, rating: 4.7, status: 'published' },
  { id: 3, title: 'JLPT N2 Vocabulary Deep Dive', students: 89, revenue: 196000, rating: 4.6, status: 'draft' },
];

const recentReviews = [
  { name: 'Kavindu P.', rating: 5, text: 'Excellent exam quality! Perfect for N2 prep.', date: '2024-06-09' },
  { name: 'Dilini R.', rating: 4, text: 'Very detailed questions and good explanations.', date: '2024-06-07' },
];

export default function TutorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Tutor Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome back, {user?.name?.split(' ')[0] || 'Tutor'}</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/tutor/create')}>
            <Plus size={16} /> Create Exam
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: 'LKR 1.5M', icon: DollarSign, color: 'text-emerald-400', sub: '+22% this month', bg: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20' },
          { label: 'Total Students', value: '1,240', icon: Users, color: 'text-blue-400', sub: '+48 this week', bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20' },
          { label: 'Published Exams', value: '8', icon: BookOpen, color: 'text-cyan-400', sub: '2 drafts pending', bg: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/20' },
          { label: 'Avg. Rating', value: '4.8', icon: Star, color: 'text-amber-400', sub: 'Based on 624 reviews', bg: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/20' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <GlassCard className={`p-5 bg-gradient-to-br ${s.bg} border ${s.border}`}>
              <div className="flex items-center justify-between mb-3">
                <s.icon size={20} className={s.color} />
                <TrendingUp size={14} className="text-gray-500" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
              <div className="text-xs text-emerald-400 mt-1">{s.sub}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart + Wallet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Revenue Overview</h3>
              <p className="text-sm text-gray-400">Monthly earnings breakdown</p>
            </div>
            <Badge color="green">+24% vs last month</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={tutorRevenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                formatter={v => [`LKR ${v.toLocaleString()}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border-emerald-500/20">
          <h3 className="text-lg font-semibold text-white mb-5">Wallet</h3>
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-emerald-400 mb-1">LKR 485,000</div>
            <div className="text-sm text-gray-400">Available balance</div>
          </div>
          <div className="space-y-3 mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Pending clearance</span>
              <span className="text-amber-400">LKR 65,000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">This month earned</span>
              <span className="text-white">LKR 112,000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total withdrawn</span>
              <span className="text-white">LKR 1,015,000</span>
            </div>
          </div>
          <Button variant="success" fullWidth onClick={() => navigate('/tutor/earnings')}>
            <DollarSign size={16} /> Withdraw Funds
          </Button>
        </GlassCard>
      </div>

      {/* My Exams */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">My Exams</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/tutor/exams')}>View All <ArrowRight size={14} /></Button>
        </div>
        <div className="space-y-3">
          {myExams.map((exam, i) => (
            <div key={exam.id} className="flex items-center gap-4 p-3 bg-white/3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen size={18} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{exam.title}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                  <span><Users size={10} className="inline mr-1" />{exam.students} students</span>
                  <span className="text-emerald-400">LKR {exam.revenue.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Star size={10} className="text-amber-400" />{exam.rating}</span>
                </div>
              </div>
              <Badge color={exam.status === 'published' ? 'green' : 'yellow'}>{exam.status}</Badge>
              <Button variant="ghost" size="sm"><Eye size={14} /></Button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recent Reviews */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Recent Reviews</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/tutor/reviews')}>View All <ArrowRight size={14} /></Button>
        </div>
        <div className="space-y-4">
          {recentReviews.map((r, i) => (
            <div key={i} className="flex gap-3 p-3 bg-white/3 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {r.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">{r.name}</span>
                  <div className="flex gap-0.5">{[...Array(r.rating)].map((_, j) => <Star key={j} size={11} className="text-amber-400 fill-amber-400" />)}</div>
                  <span className="text-xs text-gray-500">{r.date}</span>
                </div>
                <p className="text-sm text-gray-300">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
