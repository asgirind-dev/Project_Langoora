import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, BookOpen, Clock, Flame, ArrowRight, 
  Play, CalendarDays, CheckCircle2, Circle, Lock, Coins 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import CircularProgress from '../../components/ui/CircularProgress';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // STUDY PLANNER WIDGET STATES
  const [todayPlans, setTodayPlans] = useState([]);
  const [isPlannerLocked, setIsPlannerLocked] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(true);

  // DYNAMIC RECENT EXAMS STATES
  const [recentExams, setRecentExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);

  // FIRESTORE LIVE DATA STATES
  const [credits, setCredits] = useState(0);
  const [stats, setStats] = useState({ examsTaken: 0, studyHours: '0h', avgScore: '0%', streak: 12 });
  const [chartData, setChartData] = useState([]);
  const [dynamicSectionScores, setDynamicSectionScores] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const studentId = user?.uid || user?.id;

  // 1. FETCH TODAY'S BLUEPRINTS FROM API
  useEffect(() => {
    const fetchTodayPlans = async () => {
      if (!studentId) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/planner/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (response.status === 403 || result.isLocked) {
          setIsPlannerLocked(true);
        } else if (result.success) {
          const today = new Date();
          const offset = today.getTimezoneOffset();
          const localToday = new Date(today.getTime() - (offset * 60 * 1000));
          const todayStr = localToday.toISOString().split('T')[0];
          
          const filtered = (result.plans || []).filter(p => {
            const planDate = p.scheduled_date ? p.scheduled_date.split('T')[0] : '';
            return planDate === todayStr;
          });
          
          setTodayPlans(filtered);
          setIsPlannerLocked(false);
        }
      } catch (error) {
        console.error("Dashboard planner widget sync failure:", error);
      } finally {
        setPlannerLoading(false);
      }
    };

    fetchTodayPlans();
  }, [studentId]);

  // 2. FETCH RECENT EXAMS DYNAMICALLY FROM API
  useEffect(() => {
    const fetchRecentExams = async () => {
      if (!studentId) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/exams/recent', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success && result.exams) {
          setRecentExams(result.exams);
        } else {
          setRecentExams([
            { id: 1, title: 'JLPT N2 Grammar Section', score: 78, total: 100, date: '2024-06-08', status: 'passed', time: '45 min' },
            { id: 2, title: 'EPS-TOPIK Listening Mock', score: 62, total: 100, date: '2024-06-06', status: 'failed', time: '35 min' }
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch dynamic recent exams:", error);
        setRecentExams([
          { id: 1, title: 'JLPT N2 Grammar Section (Backup)', score: 78, total: 100, date: '2024-06-08', status: 'passed', time: '45 min' },
          { id: 2, title: 'EPS-TOPIK Listening Mock (Backup)', score: 62, total: 100, date: '2024-06-06', status: 'failed', time: '35 min' }
        ]);
      } finally {
        setExamsLoading(false);
      }
    };

    fetchRecentExams();
  }, [studentId]);

  // 3. FETCH USER METRICS & WALLET FROM FIRESTORE (⚠️ මෙන්න මෙතනට තමා අලුත් කෝඩ් එක ආවේ)
  useEffect(() => {
    if (!studentId) return; 

    const fetchStudentFirestoreData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Backend එකට uid එක query param එකක් විදිහට පාස් කරනවා
        const userResponse = await fetch(`http://localhost:5000/api/users/profile?uid=${studentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userResponse.json();
        
        console.log("Backend User Data Response:", userData);

        // 💡 userData.user වෙනුවට userData.data එක check කරනවා
        if (userData.success && userData.data) {
          const user = userData.data; // 👈 මෙතනට data එක ගන්නවා
          
          const walletBalance = 
            (user.subscription && user.subscription.wallet_balance) !== undefined ? user.subscription.wallet_balance :
            user.wallet_balance !== undefined ? user.wallet_balance :
            user.credits !== undefined ? user.credits : 
            (user.subscription && user.subscription.credits) !== undefined ? user.subscription.credits : 0;

          setCredits(walletBalance);
          setStats(prev => ({ ...prev, streak: user.streak || 12 }));
        }

        const perfResponse = await fetch('http://localhost:5000/api/performance/student-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const perfResult = await perfResponse.json();

        if (perfResult.success) {
          setStats(prev => ({
            ...prev,
            examsTaken: perfResult.summary.examsTaken || 0,
            avgScore: `${perfResult.summary.avgScore || 0}%`,
            studyHours: perfResult.summary.studyHours || '0h'
          }));
          setChartData(perfResult.chartData || []);
          setDynamicSectionScores(perfResult.sectionScores || []);
        }
      } catch (error) {
        console.error("Firestore dashboard sync failure:", error);
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchStudentFirestoreData();
  }, [studentId]); 

  // QUICK TOGGLE STATUS FROM PLANNER WIDGET
  const handleToggleWidgetStatus = async (planId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/planner/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const result = await response.json();

      if (result.success) {
        setTodayPlans(prev => prev.map(p => p.id === planId ? { ...p, status: nextStatus } : p));
      }
    } catch (error) {
      console.error("Widget interactive modifier error:", error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0] || 'Student'} 👋</h1>
            <p className="text-gray-400 mt-1">You're on a <span className="text-amber-400 font-semibold">{stats.streak}-day streak!</span> Keep it up.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
              <Coins size={14} className="text-amber-400" />
              <span className="text-sm font-bold text-amber-400">{credits} Credits</span>
            </div>
            <Button variant="primary" onClick={() => navigate('/student/marketplace')}>
              <Play size={16} /> Continue Practice
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Live Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Exams Taken', value: stats.examsTaken, icon: BookOpen, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20' },
          { label: 'Study Hours', value: stats.studyHours, icon: Clock, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/20' },
          { label: 'Avg. Score', value: stats.avgScore, icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20' },
          { label: 'Day Streak', value: stats.streak, icon: Flame, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/20' },
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
            <AreaChart data={chartData}>
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
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
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
            {dynamicSectionScores && dynamicSectionScores.slice(0, 3).map(s => (
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

      {/* Bottom Grid (Recent Exams & Planner) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">Recent Exams</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/student/exams')}>View All <ArrowRight size={14} /></Button>
          </div>
          <div className="space-y-3">
            {examsLoading ? (
              <p className="text-xs text-gray-500 animate-pulse py-6 text-center">Fetching your latest exam metrics...</p>
            ) : recentExams.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">
                📊 You haven't taken any exams yet. Start your first practice test!
              </div>
            ) : (
              recentExams.map(exam => (
                <div key={exam.id} className="flex items-center gap-4 p-3 bg-white/3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    exam.status === 'passed' || exam.score >= 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {exam.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{exam.title}</p>
                    <p className="text-xs text-gray-500">{exam.date?.split('T')[0]} · {exam.time || 'N/A'}</p>
                  </div>
                  <Badge color={exam.status === 'passed' || exam.score >= 50 ? 'green' : 'red'}>
                    {exam.status || (exam.score >= 50 ? 'passed' : 'failed')}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* STUDY PLANNER WIDGET */}
        <GlassCard className="p-6 border-white/5 relative flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-400" /> Today's Blueprints
              </h3>
              <Button variant="ghost" size="xs" className="text-xs text-blue-400 p-0" onClick={() => navigate('/student/planner')}>
                Manage <ArrowRight size={12} />
              </Button>
            </div>

            {isPlannerLocked ? (
              <div className="py-8 text-center flex flex-col items-center justify-center h-full">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 mb-3 animate-pulse">
                  <Lock size={16} />
                </div>
                <p className="text-xs text-gray-400 font-medium max-w-[200px] leading-relaxed">
                  Study Planner features are locked. Upgrade to premium plan to access workflows.
                </p>
              </div>
            ) : plannerLoading ? (
              <p className="text-xs text-gray-500 animate-pulse py-6 text-center">Syncing schedule items...</p>
            ) : todayPlans.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-500">
                🎉 No core tasks scheduled for today. Take a quick mock exam!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-0.5">
                <AnimatePresence>
                  {todayPlans.map((plan) => (
                    <motion.div 
                      key={plan.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all ${
                        plan.status === 'completed' ? 'bg-emerald-500/[0.01] border-emerald-500/10 text-gray-500' : 'bg-white/5 border-white/5 text-white'
                      }`}
                    >
                      <button 
                        onClick={() => handleToggleWidgetStatus(plan.id, plan.status)}
                        className={`transition-colors focus:outline-none shrink-0 ${plan.status === 'completed' ? 'text-emerald-400' : 'text-gray-400 hover:text-white'}`}
                      >
                        {plan.status === 'completed' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </button>
                      <span className={`text-xs font-medium truncate ${plan.status === 'completed' ? 'line-through text-gray-600' : 'text-gray-200'}`}>
                        {plan.title}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-gray-500 font-medium flex items-center justify-between">
            <span>Module status: Active (Local Timezone)</span>
            <span className="text-blue-500 font-bold uppercase tracking-wider">Live DB Sync</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}