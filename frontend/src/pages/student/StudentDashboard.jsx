import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, BookOpen, Clock, Flame, Crown, ArrowRight, Target, Award, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import CircularProgress from '../../components/ui/CircularProgress';
import { studentPerformanceData, sectionScores, featuredExams } from '../../data/mockData';

const radarData = [
  { section: 'Grammar', score: 78 },
  { section: 'Vocab', score: 85 },
  { section: 'Listen', score: 70 },
  { section: 'Reading', score: 88 },
  { section: 'Writing', score: 65 },
];

const recentExams = [
  { id: 1, title: 'JLPT N2 Grammar Section', score: 78, total: 100, date: '2024-06-08', status: 'passed', time: '45 min' },
  { id: 2, title: 'EPS-TOPIK Listening Mock', score: 62, total: 100, date: '2024-06-06', status: 'failed', time: '35 min' },
  { id: 3, title: 'JLPT N2 Vocabulary', score: 85, total: 100, date: '2024-06-04', status: 'passed', time: '38 min' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0] || 'Student'} 👋</h1>
            <p className="text-gray-400 mt-1">You're on a <span className="text-amber-400 font-semibold">12-day streak!</span> Keep it up.</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/student/marketplace')}>
            <Play size={16} /> Continue Practice
          </Button>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Exams Taken', value: '24', icon: BookOpen, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20' },
          { label: 'Study Hours', value: '142h', icon: Clock, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/20' },
          { label: 'Avg. Score', value: '78%', icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20' },
          { label: 'Day Streak', value: '12', icon: Flame, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/20' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <GlassCard className={`p-5 bg-gradient-to-br ${stat.bg} border ${stat.border}`}>
              <div className="flex items-center justify-between mb-3">
                <stat.icon size={20} className={stat.color} />
                <span className="text-xs text-gray-400">This month</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <GlassCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Score Progress</h3>
              <p className="text-sm text-gray-400">JLPT N2 readiness over time</p>
            </div>
            <Badge color="green">+8% this month</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={studentPerformanceData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} domain={[50, 100]} />
              <Tooltip
                contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="target" stroke="#06b6d4" strokeWidth={2} fill="url(#targetGrad)" strokeDasharray="5 5" name="Target" />
              <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} fill="url(#scoreGrad)" name="Score" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* JLPT Readiness */}
        <GlassCard className="p-6 flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold text-white mb-2">Exam Readiness</h3>
          <p className="text-sm text-gray-400 mb-6 text-center">JLPT N2 · Next exam in 45 days</p>
          <CircularProgress value={74} size={150} strokeWidth={12} color="#3b82f6" sublabel="Ready" />
          <div className="mt-6 w-full space-y-3">
            {sectionScores && sectionScores.slice(0, 3).map(s => (
              <div key={s.section}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{s.section}</span>
                  <span className="text-white font-medium">{s.score}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${s.score}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exams */}
        <GlassCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">Recent Exams</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/student/exams')}>View All <ArrowRight size={14} /></Button>
          </div>
          <div className="space-y-3">
            {recentExams && recentExams.map(exam => (
              <div key={exam.id} className="flex items-center gap-4 p-3 bg-white/3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  exam.status === 'passed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {exam.score}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{exam.title}</p>
                  <p className="text-xs text-gray-500">{exam.date} · {exam.time}</p>
                </div>
                <Badge color={exam.status === 'passed' ? 'green' : 'red'}>
                  {exam.status}
                </Badge>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Subscription Card */}
        <GlassCard className="p-6 bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-blue-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={20} className="text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Pro Plan</h3>
          </div>
          <div className="mb-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">Monthly exams used</span>
              <span className="text-white font-medium">24 / ∞</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full">
              <div className="h-full w-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
            </div>
          </div>
          <div className="space-y-2 mb-5">
            {['Unlimited mock exams', 'Advanced analytics', 'All exam categories'].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                {f}
              </div>
            ))}
          </div>
          <Button variant="primary" size="sm" fullWidth onClick={() => navigate('/student/subscription')}>
            <Crown size={14} /> Upgrade to Elite
          </Button>
        </GlassCard>
      </div>

      {/* Recommended Exams */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Recommended For You</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/student/marketplace')}>Browse All <ArrowRight size={14} /></Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredExams && featuredExams.slice(0, 3).map((exam, i) => (
            <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard hover className="p-4" onClick={() => navigate(`/exam/${exam.id}/preview`)}>
                <div className="flex gap-3">
                  <img src={exam.thumbnail} alt={exam.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white line-clamp-2 leading-snug mb-1">{exam.title}</p>
                    <p className="text-xs text-gray-400">{exam.tutor}</p>
                    <div className="flex items-center justify-between mt-2">
                      {/* FIXED LINE: Safely checks for price and provides default 0 if it's undefined */}
                      <span className="text-blue-400 font-semibold text-sm">
                        LKR {exam?.price ? exam.price.toLocaleString() : '0'}
                      </span>
                      <Badge color="blue">{exam.level}</Badge>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}