import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Users, CheckCircle, ShieldAlert, Clock, Eye, MessageSquare, ShieldCheck, Flag, 
  Mail, GraduationCap, Check, X, AlertCircle, AlertTriangle 
} from 'lucide-react';
import { db } from '../../firebaseConfig'; 
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

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

const initialFlaggedExams = [
  { id: 'f1', examTitle: 'IELTS Reading Master Pack', reportedBy: 'UGC0423035', issue: 'Question #14 has a duplicated answer option.', severity: 'high', date: '2026-06-02' },
  { id: 'f2', examTitle: 'JLPT N4 Kanji Simulation Pack', reportedBy: 'Rojitha98', issue: 'Listening Section B audio file terminates prematurely at 02:40.', severity: 'medium', date: '2026-06-01' },
];

export default function AcademicValidatorDashboard() {
  const [activeTab, setActiveTab] = useState('tutors'); 
  const [tutors, setTutors] = useState([]);
  const [flags, setFlags] = useState(initialFlaggedExams);
  const [loading, setLoading] = useState(true);

  // Custom UI Component States
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmRejectModal, setConfirmRejectModal] = useState({ show: false, tutorId: null });

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const fetchPendingTutors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch("http://localhost:5000/api/validator/tutors/pending-queue", {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setTutors(result.data || []); 
      }
    } catch (error) {
      console.error("Dashboard profile synchronization crashed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTutors();
  }, []);

  const handleApprove = async (tutorId) => {
    try {
      const tutorRef = doc(db, 'users', tutorId);
      await updateDoc(tutorRef, { status: 'active' });
      setTutors(prev => prev.filter(t => t.id !== tutorId));
      showNotification("Instructor application approved successfully. Credentials synced.", "success");
    } catch (error) {
      console.error("Approval state synchronization crashed:", error);
      showNotification("Failed to synchronize active state change.", "error");
    }
  };

  // Triggers the Custom UI confirmation dialog setup instead of native blocks
  const triggerRejectConfirmation = (tutorId) => {
    setConfirmRejectModal({ show: true, tutorId });
  };

  // Executed only after validation check passes from the custom UI prompt
  const handleConfirmReject = async () => {
    const tutorId = confirmRejectModal.tutorId;
    if (!tutorId) return;

    try {
      const tutorRef = doc(db, 'users', tutorId);
      await updateDoc(tutorRef, { status: 'rejected' });
      setTutors(prev => prev.filter(t => t.id !== tutorId));
      
      // Clean up interface visibility states
      setConfirmRejectModal({ show: false, tutorId: null });
      showNotification("Instructor credentials rejected. Profile access suspended.", "error");
    } catch (error) {
      console.error("Rejection state synchronization crashed:", error);
      showNotification("Failed to process rejection routine metrics.", "error");
    }
  };

  const handleResolveFlag = (flagId) => {
    setFlags(prev => prev.filter(f => f.id !== flagId));
    showNotification("Flag metrics processed and archived successfully.", "success");
  };

  return (
    <div className="space-y-8 p-2 selection:bg-blue-500/30 relative">
      
      {/* Dynamic Slide-in Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl max-w-sm ${
              toast.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200 shadow-emerald-950/20' 
                : 'bg-rose-950/40 border-rose-500/30 text-rose-200 shadow-rose-950/20'
            }`}
          >
            <div className={`p-1.5 rounded-xl border ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'
            }`}>
              {toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-400" /> : <AlertCircle size={18} className="text-rose-400" />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider opacity-60">System Notice</p>
              <p className="text-sm font-medium mt-0.5 leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => setToast(p => ({ ...p, show: false }))} className="text-gray-400 hover:text-white p-1">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          CUSTOM RED DESIGNED CONFIRMATION MODAL (No window.confirm!)
         ========================================== */}
      <AnimatePresence>
        {confirmRejectModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0f1629] border border-rose-500/30 rounded-2xl p-6 shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirm Rejection</h3>
                  <p className="text-xs text-gray-400">Critical workflow authorization</p>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                Are you absolutely sure you want to permanently reject this tutor's credentials application? This profile tracking state will shift immediately.
              </p>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  className="text-xs border border-white/5 bg-white/5 hover:bg-white/10"
                  onClick={() => setConfirmRejectModal({ show: false, tutorId: null })}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors"
                >
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upper Heading Layout */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent tracking-tight">
              Academic Validator Dashboard
            </h1>
            <p className="text-gray-400 mt-1 text-sm">Platform standard verification and exam quality audits</p>
          </div>
          {tutors.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl self-start sm:self-center">
              <ShieldAlert size={15} className="text-blue-400 animate-pulse" />
              <span className="text-blue-300 text-xs font-semibold tracking-wide uppercase">{tutors.length} Action Required</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Grid Status Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
        {[
          { label: 'Pending Tutors', value: tutors.length, icon: Users, color: 'text-blue-400 border-blue-500/10 bg-blue-500/5' },
          { label: 'Active Flags', value: flags.length, icon: Flag, color: 'text-amber-400 border-amber-500/10 bg-amber-500/5' },
          { label: 'Resolved Audits', value: '384', icon: ShieldCheck, color: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5' },
          { label: 'System Accuracy', value: '98.2%', icon: CheckCircle, color: 'text-cyan-400 border-cyan-500/10 bg-cyan-500/5' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className={`p-5 border ${s.color} rounded-2xl flex flex-col justify-between h-28 hover:scale-[1.02] transition-all`}>
              <s.icon size={18} className="opacity-80" />
              <div>
                <div className="text-2xl font-extrabold text-white tracking-tight">{s.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mt-0.5">{s.label}</div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6 border-white/5 bg-white/[0.01]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-5">Audit Resolution Velocity</h3>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={flagTrendsData}>
              <defs>
                <linearGradient id="validatorAuditGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Area type="monotone" name="Resolved Flags" dataKey="resolved" stroke="#10b981" strokeWidth={2} fill="url(#validatorAuditGrad)" />
              <Area type="monotone" name="Unresolved" dataKey="unresolved" stroke="#ef4444" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6 border-white/5 bg-white/[0.01]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-5">Issue Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={issueDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value">
                {issueDistribution.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Legend iconSize={6} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Nav Tab Controls */}
      <div className="flex border-b border-white/5 gap-6 select-none">
        <button
          onClick={() => setActiveTab('tutors')}
          className={`pb-3 text-xs uppercase tracking-wider font-bold transition-all relative ${
            activeTab === 'tutors' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          Instructor Approvals ({tutors.length})
          {activeTab === 'tutors' && <motion.div layoutId="valTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
        </button>
        <button
          onClick={() => setActiveTab('flags')}
          className={`pb-3 text-xs uppercase tracking-wider font-bold transition-all relative ${
            activeTab === 'flags' ? 'text-amber-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          Quality Flags Auditing ({flags.length})
          {activeTab === 'flags' && <motion.div layoutId="valTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
        </button>
      </div>

      {/* Dynamic Queue Content Block */}
      <div className="space-y-4">
        {loading && activeTab === 'tutors' ? (
          <div className="space-y-3">
            {[1, 2].map(n => (
              <div key={n} className="w-full h-20 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse flex items-center justify-between p-4">
                <div className="flex items-center gap-4 w-2/3">
                  <div className="w-10 h-10 bg-white/5 rounded-xl" />
                  <div className="space-y-2 w-1/2">
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-2 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
                <div className="flex gap-2 w-24">
                  <div className="h-7 bg-white/5 rounded-lg flex-1" />
                  <div className="h-7 bg-white/5 rounded-lg flex-1" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'tutors' ? (
          tutors.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/5 bg-white/[0.01] rounded-2xl flex flex-col items-center justify-center text-gray-500">
              <CheckCircle size={28} className="text-gray-600 mb-2 animate-pulse" />
              <p className="text-sm font-medium">No instructors currently pending authorization gates.</p>
            </div>
          ) : (
            tutors.map((t) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/5 transition-all">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md select-none uppercase">
                    {t.name ? t.name.charAt(0) : 'T'}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white text-sm capitalize leading-none">{t.name || 'Anonymous Instructor'}</p>
                      <Badge color="blue">{t.qualifications || 'Language Educator'}</Badge>
                    </div>
                    
                    <div className="flex flex-col gap-0.5 text-xs text-gray-400 pt-0.5">
                      <span className="flex items-center gap-1.5"><Mail size={12} className="text-gray-500"/> {t.email}</span>
                      <span className="flex items-center gap-1.5"><GraduationCap size={12} className="text-blue-500/70"/> {t.university || 'Independent Instructor'}</span>
                    </div>

                    <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-1">
                      <Clock size={11} /> Application Reference ID: {t.id.substring(0, 8).toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 {`self-end sm:self-center`}">
                  <Button variant="success" size="sm" onClick={() => handleApprove(t.id)} className="bg-emerald-600 hover:bg-emerald-500 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"><Check size={12}/> Approve</Button>
                  
                  {/* Fixed Target: Handled exclusively via custom reactive UI trigger wrappers */}
                  <Button variant="danger" size="sm" onClick={() => triggerRejectConfirmation(t.id)} className="bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/20 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"><X size={12}/> Reject</Button>
                </div>
              </motion.div>
            ))
          )
        ) : (
          flags.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/5 bg-white/[0.01] rounded-2xl flex flex-col items-center justify-center text-gray-500">
              <AlertCircle size={28} className="text-gray-600 mb-2" />
              <p className="text-sm font-medium">All dynamic marketplace content parameters checked. Zero flags.</p>
            </div>
          ) : (
            flags.map((flag) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={flag.id} className="p-5 bg-white/[0.02] border border-white/5 hover:border-white/[0.04] rounded-2xl space-y-3 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-white text-sm tracking-wide">{flag.examTitle}</h4>
                      <Badge color={flag.severity === 'high' ? 'red' : 'yellow'}>{flag.severity.toUpperCase()}</Badge>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">Reported by: <span className="text-gray-400 font-mono">{flag.reportedBy}</span> · {flag.date}</p>
                  </div>
                  <div className="flex gap-2 self-start sm:self-center">
                    <Button variant="ghost" size="sm" className="text-xs border border-white/5 bg-white/5 hover:bg-white/10 text-gray-300 gap-1 rounded-xl py-1.5">
                      <Eye size={12} /> View Details
                    </Button>
                    <Button variant="success" size="sm" className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 rounded-xl py-1.5" onClick={() => handleResolveFlag(flag.id)}>
                      Resolve Issue
                    </Button>
                  </div>
                </div>
                <div className="bg-black/20 border border-white/5 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed">
                  <MessageSquare size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="italic text-gray-300">"{flag.issue}"</p>
                </div>
              </motion.div>
            ))
          )
        )}
      </div>
    </div>
  );
}