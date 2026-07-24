import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, Award, Target, BookOpen } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import axios from 'axios'; // 💡 API Calls සඳහා

export default function PerformancePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    summary: { bestScore: '0%', bestExamTitle: 'N/A', avgScore: '0%', completedCount: 0, targetScore: '85%' },
    scoreHistory: [],
    sectionScores: []
  });

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        const token = localStorage.getItem('token'); // හෝ ඔයා Auth Context එකෙන් ගන්නා ක්‍රමය
        const response = await axios.get('http://localhost:5000/api/performance/student-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error("Error loading performance charts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Performance Analytics</h1>
        <p className="text-gray-400">Track your exam progress and identify areas for improvement in real-time</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Best Score', value: stats.summary.bestScore, icon: Award, color: 'text-amber-400', sub: stats.summary.bestExamTitle },
          { label: 'Average Score', value: stats.summary.avgScore, icon: TrendingUp, color: 'text-blue-400', sub: 'All completed exams' },
          { label: 'Exams Completed', value: stats.summary.completedCount.toString(), icon: BookOpen, color: 'text-emerald-400', sub: 'Total finished' },
          { label: 'Target Score', value: stats.summary.targetScore, icon: Target, color: 'text-cyan-400', sub: 'JLPT pass criteria' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className="p-5">
              <s.icon size={20} className={`${s.color} mb-3`} />
              <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm text-gray-300">{s.label}</div>
              <div className="text-xs text-gray-500 mt-1">{s.sub}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5">Score History</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats.scoreHistory}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
              <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} fill="url(#sg)" name="Score" />
              <Area type="monotone" dataKey="target" stroke="#06b6d4" strokeWidth={1.5} fill="none" strokeDasharray="5 5" name="Target" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Radar Chart */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5">Section Radar</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={stats.sectionScores}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="section" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Progress Bars (Section Breakdown) */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-5">Section Breakdown</h3>
        <div className="space-y-4">
          {stats.sectionScores.map((s, i) => (
            <motion.div key={s.section} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">{s.section}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">{s.score}%</span>
                  <Badge color={s.score >= 80 ? 'green' : s.score >= 60 ? 'yellow' : 'red'}>
                    {s.score >= 80 ? 'Strong' : s.score >= 60 ? 'Average' : 'Weak'}
                  </Badge>
                </div>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${s.score}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className={`h-full rounded-full ${
                    s.score >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                    s.score >= 60 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                    'bg-gradient-to-r from-red-500 to-rose-500'
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}