import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios'; 
import { 
  Search, Users, UserCheck, UserX, Mail, Shield, CheckCircle, X, 
  UserPlus, Building, ShieldAlert, Loader, Radio, Zap, Activity, Globe 
} from 'lucide-react';

// --- UI COMPONENTS IMPORTS ---
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ThemeToggle from '../../components/ui/ThemeToggle'; 

// --- THEME CONTEXT ---
import { useTheme } from '../../context/ThemeContext'; 

// Dynamic Privileges Matrix ordered by Functional Dashboard Frameworks
const AVAILABLE_PRIVILEGES = [
  // Academic Validator Framework Frameworks
  { key: 'verify_tutors', role: 'validator', label: 'Tutor Verification Power', desc: 'Grants access to TutorVerificationPage.jsx to approve/reject external partner academy tutors.' },
  { key: 'audit_exams', role: 'validator', label: 'Exam Quality Audit Power', desc: 'Grants access to ExamQualityAuditsPage.jsx to inspect question matrices and structures.' },
  { key: 'resolve_disputes', role: 'validator', label: 'Resolve Content Disputes', desc: 'Grants access to ContentDisputePage.jsx to settle student arguments and rechecks.' },
  
  // Finance Admin Framework Frameworks
  { key: 'manage_subscriptions', role: 'finance', label: 'Subscription Framework Manager', desc: 'Grants access to SubscriptionManager.jsx to modify packages, pricing, and active credit values.' },
  { key: 'approve_payouts', role: 'finance', label: 'Tutor Payouts Approver', desc: 'Grants access to TutorPayoutsPage.jsx to validate accumulated tutor credits and release bank transfers.' },
  { key: 'view_ledger', role: 'finance', label: 'Transaction Ledger Auditor', desc: 'Grants access to TransactionLedger.jsx to view full platform financial inflows and outflows.' }
];

// Configure Axios base instance for cleaner routing requests
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Axios Interceptor to automatically hook the Bearer token into headers before dispatching
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default function UserManagementPage() {
  const { isDarkMode } = useTheme(); 
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPrivilegeModalOpen, setIsPrivilegeModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Update Form State to support Validator & Finance + Language Scope Selection
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: 'validator', 
    institution: 'LNBTI',
    languageScope: 'Japanese', 
    privileges: []
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch entire registry dataset via backend endpoint
const fetchAllUsersAndPreAuth = async () => {
  try {
    setLoading(true);
    
    const token = localStorage.getItem('token'); 
    const response = await axios.get('http://localhost:5000/api/users', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.data.success) {
      setUsers(response.data.users);
    }
  } catch (error) {
    console.error("Error synchronizing storage directory registry:", error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchAllUsersAndPreAuth(); }, []);

  // 2. Adjust lifecycle status (Suspend / Unsuspend / Revoke Invite)
  const toggleSuspend = async (uid, currentStatus, email) => {
    try {
      const response = await api.put(`/users/${uid}/lifecycle`, { currentStatus, email });
      if (response.data.success) {
        if (response.data.action === 'revoked') {
          setUsers(prev => prev.filter(u => u.id !== uid));
        } else {
          setUsers(prev => prev.map(u => u.id === uid ? { ...u, status: response.data.targetStatus } : u));
        }
      }
    } catch (error) { 
      console.error("Lifecycle runtime transformation failed:", error); 
    }
  };

  // 3. Commit granular role privilege and capability matrices
  const savePrivileges = async () => {
    try {
      const response = await api.put(`/users/${selectedUser.id}/privileges`, {
        privileges: selectedUser.privileges,
        languageScope: selectedUser.languageScope,
        status: selectedUser.status,
        email: selectedUser.email
      });
      if (response.data.success) {
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? selectedUser : u));
        setIsPrivilegeModalOpen(false);
      }
    } catch (error) { 
      console.error("Failed to commit capability profiles:", error); 
    }
  };

  // 4. Provision a new internal administrative staff node
  const handleProvisionUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    const formattedEmail = createForm.email.toLowerCase().trim();

    if (!createForm.name.trim() || !formattedEmail) {
      setFormError('Fields are mandatory.');
      setIsSubmitting(false);
      return;
    }
    if (users.some(u => u.email === formattedEmail)) {
      setFormError('Email already exists in terminal records.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await api.post('/users/provision', createForm);
      if (response.data.success) {
        setUsers(prev => [response.data.user, ...prev]);
        setIsCreateModalOpen(false);
        setCreateForm({ name: '', email: '', role: 'validator', institution: 'LNBTI', languageScope: 'Japanese', privileges: [] });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Database connectivity failed.";
      setFormError(errorMsg);
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const openPrivilegeModal = (user) => {
    setSelectedUser({ 
      ...user, 
      privileges: user.privileges || [],
      languageScope: user.languageScope || 'All'
    });
    setIsPrivilegeModalOpen(true);
  };

  const handleToggleExistingPrivilege = (privilegeKey) => {
    setSelectedUser(prev => {
      const exists = prev.privileges.includes(privilegeKey);
      return { ...prev, privileges: exists ? prev.privileges.filter(p => p !== privilegeKey) : [...prev.privileges, privilegeKey] };
    });
  };

  const handleToggleFormPrivilege = (privilegeKey) => {
    setCreateForm(prev => {
      const exists = prev.privileges.includes(privilegeKey);
      return { ...prev, privileges: exists ? prev.privileges.filter(p => p !== privilegeKey) : [...prev.privileges, privilegeKey] };
    });
  };

  const filtered = users.filter(u => {
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase()) && !u.institution?.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 p-1 selection:bg-cyan-500/30">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 rounded font-semibold">Identity & Access Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 tracking-tight">
            User Gateways
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Govern structural platform nodes, inject granular framework privileges, and authorize internal administrative staff.
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 select-none">
          <ThemeToggle /> 
          
          <Button 
            variant="primary" 
            onClick={() => setIsCreateModalOpen(true)}
            className="group relative flex items-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:opacity-90 shadow-lg text-xs font-semibold tracking-wide py-2.5 px-4 rounded-xl text-white"
          >
            <UserPlus size={14} className="group-hover:rotate-12 transition-transform" /> 
            <span>PROVISION STAFF NODE</span>
          </Button>
        </motion.div>
      </div>

      {/* --- METRICS COUNTERS GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Platform Active Students', value: users.filter(u => u.role === 'student').length, icon: Users, color: 'text-cyan-600 dark:text-cyan-400', glow: 'border-slate-200/80 dark:border-cyan-500/10' },
          { label: 'Verified Institutional Tutors', value: users.filter(u => u.role === 'tutor').length, icon: UserCheck, color: 'text-indigo-600 dark:text-indigo-400', glow: 'border-slate-200/80 dark:border-indigo-500/10' },
          { label: 'Internal System Users', value: users.filter(u => u.role === 'validator' || u.role === 'finance').length, icon: Shield, color: 'text-amber-600 dark:text-amber-400', glow: 'border-slate-200/80 dark:border-amber-500/10' },
          { label: 'Suspended Terminals', value: users.filter(u => u.status === 'suspended').length, icon: UserX, color: 'text-rose-600 dark:text-rose-500', glow: 'border-slate-200/80 dark:border-rose-500/10' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <GlassCard className={`p-4 flex items-center gap-4 border bg-white dark:bg-slate-900/30 backdrop-blur-md hover:bg-slate-50/50 dark:hover:bg-white/[0.03] transition-all ${s.glow}`}>
              <div className="w-11 h-11 bg-slate-100 dark:bg-slate-900/60 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/5">
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{loading ? '...' : s.value}</div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{s.label}</div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* --- FILTER SYSTEM --- */}
      <GlassCard className="p-5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/10 shadow-xl relative overflow-hidden">
        <div className="flex flex-col gap-4 mb-6">
          <input
            type="text" 
            placeholder="Query nodes by signature, corporate email, or institutional affiliation..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-cyan-500/60 font-mono shadow-inner"
          />
          
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase mr-1 flex items-center gap-1 font-bold"><Activity size={10}/> Role Node:</span>
              {['all', 'student', 'tutor', 'validator', 'finance', 'admin'].map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono capitalize transition-all ${roleFilter === r ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/40 font-bold' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>
                  {r === 'validator' ? 'Academic Validator' : r === 'finance' ? 'Finance Admin' : r}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase mr-1 flex items-center gap-1 font-bold"><Radio size={10}/> Lifecycle:</span>
              {['all', 'active', 'invited', 'pending', 'suspended'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono capitalize transition-all ${statusFilter === s ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/40 font-bold' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- MAIN REGISTRY TABLE --- */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 font-mono text-xs">
              <Loader className="animate-spin text-cyan-500" size={20} />
              <span className="tracking-widest animate-pulse">SYNCHRONIZING CENTRAL STORAGE REGISTRY...</span>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.01] text-left text-[10px] font-mono tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                  <th className="p-4 font-bold">Personnel Information</th>
                  <th className="p-4 font-bold">Scope Context</th>
                  <th className="p-4 font-bold">Routing Authority</th>
                  <th className="p-4 font-bold">Operational Lifecycle</th>
                  <th className="p-4 font-bold">Timestamp</th>
                  <th className="p-4 text-center font-bold">Metrics Index</th>
                  <th className="p-4 text-right font-bold">Access Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-cyan-700 dark:text-cyan-400 text-xs font-black shadow-sm group-hover:border-cyan-500/50">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white tracking-wide group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">{u.name || 'Anonymous Node'}</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5 font-medium">{u.email}</p>
                          <div className="inline-block mt-1 px-1.5 py-0.5 bg-blue-50 dark:bg-indigo-500/5 border border-blue-200 dark:border-indigo-500/10 rounded text-[9px] font-mono font-bold text-blue-700 dark:text-indigo-300">
                            {u.institution || 'Independent Affiliate'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        <Globe size={11} className="text-slate-400" />
                        <span className="font-semibold">{u.languageScope || 'All'}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wide border ${
                        u.role === 'admin' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                        u.role === 'validator' ? 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' :
                        u.role === 'finance' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        u.role === 'tutor' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' :
                        'bg-slate-500/10 text-slate-600 border-slate-500/20'
                      }`}>
                        {u.role === 'validator' ? 'Academic Validator' : u.role === 'finance' ? 'Finance Admin' : u.role}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                        u.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                        u.status === 'invited' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400' : 
                        u.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400' : 
                        'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400'
                      }`}>
                        {u.status?.toUpperCase()}
                      </span>
                    </td>

                    <td className="p-4 text-[11px] font-mono text-slate-600 dark:text-slate-400 font-medium">{u.joined || '---'}</td>

                    <td className="p-4 text-center font-mono">
                      <span className="block text-xs font-black text-slate-900 dark:text-slate-200">{u.activityCount || 0}</span>
                      <span className="text-[8px] tracking-wide text-slate-500 uppercase font-bold">
                        {u.role === 'tutor' ? 'Exams Authored' : u.role === 'validator' ? 'Quality Audits' : u.role === 'finance' ? 'Ledger Rows' : 'Exams Taken'}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {(u.role === 'validator' || u.role === 'finance' || u.role === 'admin') && (
                          <Button 
                            variant="secondary" 
                            className="px-2.5 py-1.5 text-[10px] font-mono border border-cyan-500/30 text-cyan-700 dark:text-cyan-400 flex items-center gap-1 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-lg transition-all font-bold"
                            onClick={() => openPrivilegeModal(u)}
                          >
                            <Shield size={11} /> GOVERN
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="p-2 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent rounded-lg">
                          <Mail size={12} className="text-slate-600 dark:text-slate-400" />
                        </Button>
                        <Button 
                          variant={u.status === 'suspended' ? 'success' : 'danger'} 
                          size="sm" className="text-[10px] font-mono py-1.5 rounded-lg text-white font-bold"
                          onClick={() => toggleSuspend(u.id, u.status, u.email)}
                        >
                          {u.status === 'suspended' ? 'ACTIVATE' : u.status === 'invited' ? 'REVOKE' : 'SUSPEND'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      {/* --- MODAL DIALOGS: PROVISION INTERNAL SYSTEM STAFF NODES --- */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}>
              <GlassCard className="w-full max-w-lg p-6 bg-white dark:bg-[#070c19] border border-slate-300 dark:border-white/10 shadow-2xl relative">
                <div className="flex justify-between items-center mb-5 border-b border-slate-200 dark:border-white/5 pb-4">
                  <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2 uppercase">
                    <UserPlus className="text-cyan-600" size={16} /> Provision Internal System Node
                  </h3>
                  <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleProvisionUser} className="space-y-4 font-sans">
                  {formError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[11px] font-mono p-3 rounded-xl flex items-center gap-2">
                      <ShieldAlert size={14} /> {formError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">Staff Full Name</label>
                    <input 
                      type="text" required placeholder="e.g., Prof. Rojitha Sethsika"
                      value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs font-mono shadow-inner focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">Official Corporate Email</label>
                    <input 
                      type="email" required placeholder="e.g., validator.se@lnbti.com"
                      value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs font-mono shadow-inner focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">System Role</label>
                      <select
                        value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value, privileges: [] }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs font-mono"
                      >
                        <option value="validator">Academic Validator</option>
                        <option value="finance">Finance Admin</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      {createForm.role === 'validator' ? (
                        <>
                          <label className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">Language Scope Context</label>
                          <select
                            value={createForm.languageScope} onChange={e => setCreateForm(p => ({ ...p, languageScope: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs font-mono"
                          >
                            <option value="Japanese">Japanese Language Scope</option>
                            <option value="Korean">Korean Language Scope</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <label className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">Affiliated Institute</label>
                          <input 
                            type="text" disabled value="LNBTI Finance Operations"
                            className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/5 rounded-xl px-3 py-2 text-slate-500 text-xs font-mono"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/5">
                    <label className="text-[11px] font-mono text-slate-700 dark:text-slate-300 uppercase block flex items-center gap-1 font-bold">
                      <Zap size={11} className="text-cyan-600"/> Inject Functional Dashboard Frameworks
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {AVAILABLE_PRIVILEGES.filter(p => p.role === createForm.role).map((p) => {
                        const isChecked = createForm.privileges.includes(p.key);
                        return (
                          <div 
                            key={p.key} onClick={() => handleToggleFormPrivilege(p.key)}
                            className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                              isChecked ? 'bg-cyan-500/[0.04] border-cyan-500/50' : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-white/5'
                            }`}
                          >
                            <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${isChecked ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300'}`}>
                              {isChecked && <CheckCircle size={10} className="text-white dark:text-slate-950" />}
                            </div>
                            <div>
                              <div className={`text-[11px] font-mono font-bold ${isChecked ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-800 dark:text-slate-200'}`}>{p.label}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">{p.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/5">
                    <Button type="button" variant="ghost" size="sm" className="font-mono text-[10px]" onClick={() => setIsCreateModalOpen(false)}>ABORT</Button>
                    <Button type="submit" variant="success" size="sm" disabled={isSubmitting} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-mono text-[10px] tracking-widest px-4">
                      {isSubmitting ? 'PROVISIONING...' : 'INITIALIZE NODE'}
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PRIVILEGE ACCESS GOVERNANCE MODAL --- */}
      <AnimatePresence>
        {isPrivilegeModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}>
              <GlassCard className="w-full max-w-md p-6 bg-white dark:bg-[#070c19] border border-slate-300 dark:border-white/10 shadow-2xl relative">
                <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2 uppercase">
                      <Shield className="text-indigo-600" size={16} /> Dynamic Capability Configuration
                    </h3>
                    <p className="text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider font-bold">{selectedUser.name || 'Staff User'} • {selectedUser.role?.toUpperCase()}</p>
                  </div>
                  <button onClick={() => setIsPrivilegeModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg">
                    <X size={16} />
                  </button>
                </div>

                {selectedUser.role === 'validator' && (
                  <div className="mb-4 space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Modify Assigned Language Scope</label>
                    <select
                      value={selectedUser.languageScope}
                      onChange={e => setSelectedUser(prev => ({ ...prev, languageScope: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs font-mono"
                    >
                      <option value="Japanese">Japanese Language Only</option>
                      <option value="Korean">Korean Language Only</option>
                    </select>
                  </div>
                )}

                <div className="space-y-2.5 mb-5 max-h-60 overflow-y-auto pr-1">
                  {AVAILABLE_PRIVILEGES.filter(p => p.role === selectedUser.role).map((p) => {
                    const isChecked = selectedUser.privileges?.includes(p.key);
                    return (
                      <div 
                        key={p.key} onClick={() => handleToggleExistingPrivilege(p.key)}
                        className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                          isChecked ? 'bg-indigo-500/[0.04] border-indigo-500/50' : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-white/5'
                        }`}
                      >
                        <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                          {isChecked && <CheckCircle size={10} className="text-white dark:text-slate-950" />}
                        </div>
                        <div>
                          <div className={`text-[11px] font-mono font-bold ${isChecked ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{p.label}</div>
                          <div className="text-[10px] text-slate-500 mt-1 leading-normal">{p.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/5">
                  <Button variant="ghost" size="sm" className="font-mono text-[10px]" onClick={() => setIsPrivilegeModalOpen(false)}>CLOSE</Button>
                  <Button variant="success" size="sm" className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-mono text-[10px] tracking-wider px-4 font-bold" onClick={savePrivileges}>COMMIT CONFIG</Button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}