import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, BookOpen, DollarSign, UserCheck, AlertCircle, Activity } from 'lucide-react';
import { db } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

// --- MOCK DATA FOR CHARTS & TRANSACTIONS (keep as is) ---
const revenueData = [
  { month: 'Jan', revenue: 1200000 },
  { month: 'Feb', revenue: 1850000 },
  { month: 'Mar', revenue: 1620000 },
  { month: 'Apr', revenue: 2100000 },
  { month: 'May', revenue: 2450000 },
  { month: 'Jun', revenue: 2980000 },
];

const examDistribution = [
  { name: 'JLPT (N1 - N5)', value: 55, color: '#3b82f6' },
  { name: 'EPS-TOPIK', value: 30, color: '#06b6d4' },
  { name: 'TOPIK I', value: 15, color: '#10b981' },
];

const recentTransactions = [
  { id: 'TX-1001', user: 'Saman Kumara', exam: 'JLPT N4', amount: 12500, date: '2025-01-15', status: 'completed' },
  { id: 'TX-1002', user: 'Nimal Perera', exam: 'EPS-TOPIK', amount: 15000, date: '2025-01-14', status: 'pending' },
];

// --- Helper: Axios instance with auth token ---
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeStudents: 0,
    activeTutors: 0,
    pendingTutors: 0,
  });
  const [pendingTutorsList, setPendingTutorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch combined users from your backend API ---
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      if (response.data.success) {
        const allUsers = response.data.users;

        // Compute counts from the combined list
        const total = allUsers.length;
        const activeStudents = allUsers.filter(u => u.role === 'student' && u.status === 'active').length;
        const activeTutors = allUsers.filter(u => u.role === 'tutor' && u.status === 'active').length;
        const pendingTutors = allUsers.filter(u => u.role === 'tutor' && u.status === 'pending');

        setStats({
          totalUsers: total,
          activeStudents,
          activeTutors,
          pendingTutors: pendingTutors.length,
        });
        setPendingTutorsList(pendingTutors);
      } else {
        console.error('API returned success: false');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // --- Tutor approval / rejection (direct Firestore update) ---
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      // Update Firestore directly (you may later switch to an API endpoint)
      await updateDoc(doc(db, 'users', id), { status: newStatus });
      // Remove from pending list and update stats locally
      setPendingTutorsList(prev => prev.filter(t => t.id !== id));
      setStats(prev => ({
        ...prev,
        pendingTutors: prev.pendingTutors - 1,
        activeTutors: newStatus === 'active' ? prev.activeTutors + 1 : prev.activeTutors,
      }));
      alert(`Tutor status updated to ${newStatus}!`);
    } catch (err) {
      console.error('Error processing status update:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Platform overview, revenue matrix, and system monitoring telemetry</p>
          </div>
          {stats.pendingTutors > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl">
              <AlertCircle size={16} className="text-amber-400" />
              <span className="text-amber-300 text-sm font-medium">{stats.pendingTutors} Pending Approvals</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Performance Metrics – NOW WITH REAL COUNTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Users', value: loading ? '...' : stats.totalUsers, icon: Users, color: 'text-blue-400' },
          { label: 'Active Students', value: loading ? '...' : stats.activeStudents, icon: Users, color: 'text-cyan-400' },
          { label: 'Active Tutors', value: loading ? '...' : stats.activeTutors, icon: UserCheck, color: 'text-emerald-400' },
          { label: 'Total Exams', value: '0', icon: BookOpen, color: 'text-amber-400' }, // placeholder
          { label: 'Total Revenue', value: 'LKR 18.4M', icon: DollarSign, color: 'text-green-400' }, // placeholder
          { label: 'Pending Tutors', value: loading ? '...' : stats.pendingTutors, icon: AlertCircle, color: 'text-amber-400' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="p-4 border-white/10">
              <s.icon size={18} className={`${s.color} mb-2`} />
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts (mock data) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6 border-white/10">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Activity size={18} className="text-blue-400" /> Platform Revenue Matrix
          </h3>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={v => [`LKR ${v?.toLocaleString() ?? 0}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#adminRevGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6 border-white/10">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <BookOpen size={18} className="text-cyan-400" /> Exam Allocation Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={examDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {examDistribution.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Live Tutor Verification Gate */}
      <GlassCard className="p-6 border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserCheck size={18} className="text-amber-400" /> Live Tutor Verification Gate
            <Badge color="amber">{stats.pendingTutors}</Badge>
          </h3>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500 animate-pulse">Streaming database records...</p>
          ) : pendingTutorsList.length === 0 ? (
            <p className="text-sm text-gray-500">No instructors currently awaiting verification parameters.</p>
          ) : (
            pendingTutorsList.map((t) => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/3 rounded-xl border border-white/8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {t.name ? t.name.charAt(0) : 'T'}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{t.name || 'Independent Tutor'}</p>
                    <p className="text-xs text-gray-400">{t.email} · {t.institution || 'Global Educator'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color="blue">{t.qualifications || 'Language Verification Pending'}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 self-end sm:self-center">
                  <Button variant="success" size="sm" onClick={() => handleStatusUpdate(t.id, 'active')}>Approve</Button>
                  <Button variant="danger" size="sm" onClick={() => handleStatusUpdate(t.id, 'rejected')}>Reject</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Recent Transactions (mock data) */}
      <GlassCard className="p-6 border-white/10">
        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <Activity size={18} className="text-blue-400" /> Recent Transactions Registry
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Transaction ID', 'Student Name', 'Enrolled Exam', 'Amount', 'Date', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentTransactions.map(t => (
                <tr key={t.id} className="hover:bg-white/3 transition-colors">
                  <td className="py-3 pr-4 text-xs text-blue-400 font-mono select-all">{t.id}</td>
                  <td className="py-3 pr-4 text-sm text-gray-300">{t.user}</td>
                  <td className="py-3 pr-4 text-sm text-gray-300">{t.exam}</td>
                  <td className="py-3 pr-4 text-sm font-semibold text-white">LKR {t.amount.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-xs text-gray-500">{t.date}</td>
                  <td>
                    <Badge color={t.status === 'completed' ? 'green' : 'yellow'}>{t.status}</Badge>
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