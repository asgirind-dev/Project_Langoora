import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Users, CheckCircle, ShieldAlert, Clock, Eye, MessageSquare, ShieldCheck, Flag 
} from 'lucide-react';
import { db } from '../../firebaseConfig'; 
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

// Quality Analytics Mock Data matching Admin Layout specifications
const flagTrendsData = [
  { month: 'Jan', resolved: 45, unresolved: 12 },
  { month: 'Feb', resolved: 60, unresolved: 8 },
  { month: 'Mar', resolved: 55, unresolved: 19 },
  { month: 'Apr', resolved: 85, unresolved: 5 },
  { month: 'May', resolved: 92, unresolved: 14 },
  { month: 'Jun', resolved: 110, unresolved: 7 },
];

const issueDistribution = [
  { name: 'Duplicated Answers', value: 40, color: '#f59e0b' },
  { name: 'Audio/Media Lag', value: 25, color: '#06b6d4' },
  { name: 'Typo / Content Error', value: 20, color: '#3b82f6' },
  { name: 'Out of Syllabus', value: 15, color: '#ef4444' },
];

// Placeholder Mock data for Exams flags before full marketplace connection
const initialFlaggedExams = [
  { id: 'f1', examTitle: 'IELTS Reading Master Pack', reportedBy: 'UGC0423035', issue: 'Question #14 has a duplicated answer option.', severity: 'high', date: '2026-06-02' },
  { id: 'f2', examTitle: 'JLPT N4 Kanji Simulation Pack', reportedBy: 'Rojitha98', issue: 'Listening Section B audio file terminates prematurely at 02:40.', severity: 'medium', date: '2026-06-01' },
];

export default function AcademicValidatorDashboard() {
  const [activeTab, setActiveTab] = useState('tutors'); // 'tutors' | 'flags'
  const [tutors, setTutors] = useState([]);
  const [flags, setFlags] = useState(initialFlaggedExams);
  const [loading, setLoading] = useState(true);

  // 1. FETCH PENDING TUTORS FROM FIRESTORE
  const fetchPendingTutors = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      // Queries matching user document structure (role: 'tutor', status: 'pending')
      const q = query(usersRef, where('role', '==', 'tutor'), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const pendingList = [];
      querySnapshot.forEach((doc) => {
        pendingList.push({ id: doc.id, ...doc.data() });
      });
      setTutors(pendingList);
    } catch (error) {
      console.error("Firestore retrieval exception:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTutors();
  }, []);

  // 2. APPROVE TUTOR ACTION
  const handleApprove = async (tutorId) => {
    try {
      const tutorRef = doc(db, 'users', tutorId);
      await updateDoc(tutorRef, { status: 'active' });
      setTutors(prev => prev.filter(t => t.id !== tutorId));
      alert("Instructor account status updated to active successfully!");
    } catch (error) {
      console.error("Approval state synchronization crashed:", error);
      alert("Failed to synchronize active state to database.");
    }
  };

  // 3. REJECT TUTOR ACTION
  const handleReject = async (tutorId) => {
    if (window.confirm("Reject this tutor credentials application?")) {
      try {
        const tutorRef = doc(db, 'users', tutorId);
        await updateDoc(tutorRef, { status: 'rejected' });
        setTutors(prev => prev.filter(t => t.id !== tutorId));
      } catch (error) {
        console.error("Rejection state synchronization crashed:", error);
      }
    }
  };

  // 4. RESOLVE EXAM FLAG ACTION (Instant post-flag handler)
  const handleResolveFlag = (flagId) => {
    setFlags(prev => prev.filter(f => f.id !== flagId));
    alert("Flag parameters archived and resolved.");
  };

  return (
    <div className="space-y-8 p-2">
      {/* Dynamic Upper Layout Heading */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
              Academic Validator Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Platform standard verification and exam quality audits</p>
          </div>
          {tutors.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/15 border border-blue-500/30 rounded-xl">
              <ShieldAlert size={16} className="text-blue-400" />
              <span className="text-blue-300 text-sm font-medium">{tutors.length} applications pending</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Grid Quick Statistical Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Tutors', value: tutors.length, icon: Users, color: 'text-blue-400' },
          { label: 'Active Flags', value: flags.length, icon: Flag, color: 'text-amber-400' },
          { label: 'Resolved Audits', value: '384', icon: ShieldCheck, color: 'text-emerald-400' },
          { label: 'System Accuracy', value: '98.2%', icon: CheckCircle, color: 'text-cyan-400' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <GlassCard className="p-4 border-white/10">
              <s.icon size={18} className={`${s.color} mb-2`} />
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts Layer - Visual Analytics Alignment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6 border-white/10">
          <h3 className="text-lg font-semibold text-white mb-5">Audit Resolution Velocity</h3>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={flagTrendsData}>
              <defs>
                <linearGradient id="validatorAuditGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
              <Legend wrapperStyle={{ fontSize: '12px', pt: '10px' }} />
              <Area type="monotone" name="Resolved Flags" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} fill="url(#validatorAuditGrad)" />
              <Area type="monotone" name="Unresolved" dataKey="unresolved" stroke="#ef4444" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6 border-white/10">
          <h3 className="text-lg font-semibold text-white mb-5">Issue Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={issueDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">
                {issueDistribution.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Control Tab Switch Routing Infrastructure */}
      <div className="flex border-b border-white/10 gap-6">
        <button
          onClick={() => setActiveTab('tutors')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'tutors' ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          Instructor Approvals ({tutors.length})
          {activeTab === 'tutors' && <motion.div layoutId="valTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
        </button>
        <button
          onClick={() => setActiveTab('flags')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'flags' ? 'text-amber-400 font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          Quality Flags Auditing ({flags.length})
          {activeTab === 'flags' && <motion.div layoutId="valTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
        </button>
      </div>

      {/* Context Content Queue Rendering Block */}
      <div className="space-y-4">
        {loading && activeTab === 'tutors' ? (
          <div className="text-sm text-gray-500 animate-pulse py-4">Validating secure live database streams...</div>
        ) : activeTab === 'tutors' ? (
          tutors.length === 0 ? (
            <p className="text-gray-500 text-sm p-4 bg-white/2 rounded-xl border border-white/5">No instructors currently pending authorization gates.</p>
          ) : (
            tutors.map((t) => (
              <div key={t.id} className="flex items-center gap-4 p-4 bg-white/3 rounded-xl border border-white/8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {t.name ? t.name.charAt(0) : 'T'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{t.name || 'Anonymous Instructor'}</p>
                  <p className="text-xs text-gray-400">{t.email} · {t.university || 'Independent Instructor'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Updated to match 'qualifications' field in your actual Firestore doc */}
                    <Badge color="blue">{t.qualifications || 'Language Educator'}</Badge>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={11} /> UID: {t.id.substring(0, 8)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" onClick={() => handleApprove(t.id)}>Approve</Button>
                  <Button variant="danger" size="sm" onClick={() => handleReject(t.id)}>Reject</Button>
                </div>
              </div>
            ))
          )
        ) : (
          flags.length === 0 ? (
            <p className="text-gray-500 text-sm p-4 bg-white/2 rounded-xl border border-white/5">All dynamic marketplace content parameters checked. Zero flags.</p>
          ) : (
            flags.map((flag) => (
              <div key={flag.id} className="p-5 bg-white/3 border border-white/8 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-white text-sm">{flag.examTitle}</h4>
                      <Badge color={flag.severity === 'high' ? 'red' : 'yellow'}>{flag.severity.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Reported by: <span className="text-gray-400">{flag.reportedBy}</span> · {flag.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-xs border border-white/10 text-gray-300 gap-1">
                      <Eye size={12} /> View Details
                    </Button>
                    <Button variant="success" size="sm" className="text-xs" onClick={() => handleResolveFlag(flag.id)}>
                      Resolve Issue
                    </Button>
                  </div>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-start gap-2.5 text-xs text-gray-300 font-sans">
                  <MessageSquare size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="italic">"{flag.issue}"</p>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}