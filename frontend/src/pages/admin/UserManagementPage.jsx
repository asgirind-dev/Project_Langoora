import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, UserCheck, UserX, Mail, Shield, CheckCircle, X, UserPlus, Building, ShieldAlert, Loader, Radio, Zap, Activity } from 'lucide-react';

// --- UI COMPONENTS IMPORTS ---
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ThemeToggle from '../../components/ui/ThemeToggle'; 

// --- THEME CONTEXT & FIREBASE CONTROLS ---
import { useTheme } from '../../context/ThemeContext'; 
import { db } from "../../firebaseConfig";
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

const AVAILABLE_PRIVILEGES = [
  { key: 'verify_tutors', label: 'Verify Institutional Tutors', desc: 'Allows approving or rejecting newly registered tutors from partner academies.' },
  { key: 'audit_exams', label: 'Audit Exam Papers', desc: 'Grants control to inspect question matrix structures and verify content accuracy.' },
  { key: 'resolve_disputes', label: 'Resolve Structural Disputes', desc: 'Allows intervening in user exam answer arguments and grading recheck requests.' },
  { key: 'view_analytics', label: 'View Academic Metrics', desc: 'Exposes student aggregate performance indices belonging to the native institute.' },
];

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

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: 'validator', 
    institution: 'LNBTI',
    privileges: []
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAllUsersAndPreAuth = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const registeredUsers = [];
      usersSnapshot.forEach((doc) => { registeredUsers.push({ id: doc.id, ...doc.data() }); });

      const preAuthSnapshot = await getDocs(collection(db, 'pre_authorized_staff'));
      const preAuthUsers = [];
      preAuthSnapshot.forEach((doc) => {
        preAuthUsers.push({ id: doc.id, ...doc.data(), status: 'invited', activityCount: 0 });
      });

      const combinedUsers = [...preAuthUsers, ...registeredUsers];
      combinedUsers.sort((a, b) => {
        const dateA = a.joined ? new Date(a.joined) : new Date(0);
        const dateB = b.joined ? new Date(b.joined) : new Date(0);
        return dateB - dateA;
      });
      setUsers(combinedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllUsersAndPreAuth(); }, []);

  const toggleSuspend = async (uid, currentStatus, email) => {
    try {
      if (currentStatus === 'invited') {
        await deleteDoc(doc(db, 'pre_authorized_staff', email));
        setUsers(prev => prev.filter(u => u.id !== uid));
        return;
      }
      const targetStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
      await updateDoc(doc(db, 'users', uid), { status: targetStatus });
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, status: targetStatus } : u));
    } catch (error) { console.error(error); }
  };

  const handleRoleChange = async (user, newRole) => {
    try {
      const updatedData = { role: newRole };
      if (newRole === 'validator') updatedData.privileges = ['verify_tutors'];
      else if (newRole === 'student' || newRole === 'tutor') updatedData.privileges = [];

      if (user.status === 'invited') {
        await updateDoc(doc(db, 'pre_authorized_staff', user.email), updatedData);
      } else {
        await updateDoc(doc(db, 'users', user.id), updatedData);
      }
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updatedData } : u));
    } catch (error) { console.error(error); }
  };

  const openPrivilegeModal = (user) => {
    setSelectedUser({ ...user, privileges: user.privileges || [] });
    setIsPrivilegeModalOpen(true);
  };

  const handleToggleExistingPrivilege = (privilegeKey) => {
    setSelectedUser(prev => {
      const exists = prev.privileges.includes(privilegeKey);
      return { ...prev, privileges: exists ? prev.privileges.filter(p => p !== privilegeKey) : [...prev.privileges, privilegeKey] };
    });
  };

  const savePrivileges = async () => {
    try {
      if (selectedUser.status === 'invited') {
        await updateDoc(doc(db, 'pre_authorized_staff', selectedUser.email), { privileges: selectedUser.privileges });
      } else {
        await updateDoc(doc(db, 'users', selectedUser.id), { privileges: selectedUser.privileges });
      }
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? selectedUser : u));
      setIsPrivilegeModalOpen(false);
    } catch (error) { console.error(error); }
  };

  const handleToggleFormPrivilege = (privilegeKey) => {
    setCreateForm(prev => {
      const exists = prev.privileges.includes(privilegeKey);
      return { ...prev, privileges: exists ? prev.privileges.filter(p => p !== privilegeKey) : [...prev.privileges, privilegeKey] };
    });
  };

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
      setFormError('Email already exists.');
      setIsSubmitting(false);
      return;
    }

    try {
      const newStaffNode = {
        name: createForm.name,
        email: formattedEmail,
        role: createForm.role,
        joined: new Date().toISOString().split('T')[0],
        institution: createForm.role === 'admin' ? 'System Operations' : createForm.institution,
        privileges: createForm.privileges
      };
      await setDoc(doc(db, 'pre_authorized_staff', formattedEmail), newStaffNode);
      setUsers(prev => [{ id: formattedEmail, ...newStaffNode, status: 'invited', activityCount: 0 }, ...prev]);
      setIsCreateModalOpen(false);
      setCreateForm({ name: '', email: '', role: 'validator', institution: 'LNBTI', privileges: [] });
    } catch (error) {
      setFormError("Database connectivity failed.");
    } finally { setIsSubmitting(false); }
  };

  const filtered = users.filter(u => {
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase()) && !u.institution?.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 p-1 selection:bg-cyan-500/30">
      
      {/* --- HEADER SECTION WITH DYNAMIC THEME TOGGLE --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 bg-cyan-500/10 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 dark:border-cyan-500/20 rounded font-semibold">Identity & Access Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 tracking-tight">
            User Gateways
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Govern dynamic organizational staff provisions, scale functional privileges, and audit active network nodes.
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 select-none">
          <ThemeToggle /> 
          
          <Button 
            variant="primary" 
            onClick={() => setIsCreateModalOpen(true)}
            className="group relative flex items-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-cyan-500/20 dark:shadow-cyan-500/10 text-xs font-semibold tracking-wide py-2.5 px-4 rounded-xl transition-all duration-300 text-white"
          >
            <UserPlus size={14} className="group-hover:rotate-12 transition-transform" /> 
            <span>PROVISION NEW NODE</span>
          </Button>
        </motion.div>
      </div>

      {/* --- METRICS COUNTERS GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Platform Active Students', value: users.filter(u => u.role === 'student').length, icon: Users, color: 'text-cyan-600 dark:text-cyan-400', glow: 'shadow-md shadow-slate-200/50 border-slate-200/80 dark:border-cyan-500/10' },
          { label: 'Verified Tutors & Staff', value: users.filter(u => u.role !== 'student' && u.status === 'active').length, icon: UserCheck, color: 'text-indigo-600 dark:text-indigo-400', glow: 'shadow-md shadow-slate-200/50 border-slate-200/80 dark:border-indigo-500/10' },
          { label: 'Suspended Terminals', value: users.filter(u => u.status === 'suspended').length, icon: UserX, color: 'text-rose-600 dark:text-rose-500', glow: 'shadow-md shadow-slate-200/50 border-slate-200/80 dark:border-rose-500/10' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <GlassCard className={`p-4 flex items-center gap-4 border bg-white dark:bg-slate-900/30 backdrop-blur-md transition-all duration-300 hover:bg-slate-50/50 dark:hover:bg-white/[0.03] ${s.glow}`}>
              <div className="w-11 h-11 bg-slate-100 dark:bg-slate-900/60 rounded-xl flex items-center justify-center border border-slate-200/60 dark:border-white/5 shadow-inner">
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

      {/* --- HUB CONTROLS & FILTER SYSTEM --- */}
      <GlassCard className="p-5 bg-white dark:bg-slate-950/20 border border-slate-200/90 dark:border-white/10 shadow-xl shadow-slate-200/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40" />
        
        <div className="flex flex-col gap-4 mb-6">
          <div className="w-full">
            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-500 transition-colors" />
              <input
                type="text" 
                placeholder="Query nodes by signature, corporate email, or institutional affiliation..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 pl-9 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-cyan-500/60 focus:bg-white dark:focus:bg-slate-900/80 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono shadow-inner"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500 uppercase mr-1 flex items-center gap-1 font-bold"><Activity size={10}/> Role Node:</span>
              {['all', 'student', 'tutor', 'validator', 'admin'].map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono capitalize transition-all duration-200 ${roleFilter === r ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/40 dark:border-cyan-500/30 font-bold' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200/40 dark:border-transparent hover:border-slate-300 dark:hover:border-white/5 hover:bg-slate-200/50'}`}>
                  {r === 'validator' ? 'Academic Validator' : r}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500 uppercase mr-1 flex items-center gap-1 font-bold"><Radio size={10}/> Lifecycle:</span>
              {['all', 'active', 'invited', 'pending', 'suspended'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono capitalize transition-all duration-200 ${statusFilter === s ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/40 dark:border-indigo-500/30 font-bold' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200/40 dark:border-transparent hover:border-slate-300 dark:hover:border-white/5 hover:bg-slate-200/50'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- MAIN REGISTRY TABLE --- */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/10 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 font-mono text-xs">
              <Loader className="animate-spin text-cyan-500" size={20} />
              <span className="tracking-widest animate-pulse">SYNCHRONIZING CENTRAL STORAGE REGISTRY...</span>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.01] text-left text-[10px] font-mono tracking-wider text-slate-600 dark:text-slate-400 uppercase select-none">
                  <th className="p-4 font-bold">Personnel Information</th>
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
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-cyan-700 dark:text-cyan-400 text-xs font-black shadow-sm group-hover:border-cyan-500/50 transition-colors">
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
                      <select
                        value={u.role} onChange={(e) => handleRoleChange(u, e.target.value)}
                        className="bg-white dark:bg-slate-950 text-[11px] font-mono border border-slate-300 dark:border-white/5 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-300 focus:outline-none focus:border-cyan-500/60 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <option value="student">Student</option>
                        <option value="tutor">Tutor</option>
                        <option value="validator">Academic Validator</option>
                        <option value="admin">System Admin</option>
                      </select>
                    </td>

                    <td className="p-4">
                      {u.status === 'active' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/10">ACTIVE</span>
                      ) : u.status === 'invited' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/10">INVITED</span>
                      ) : u.status === 'pending' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/10">PENDING</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/10">SUSPENDED</span>
                      )}
                    </td>

                    <td className="p-4 text-[11px] font-mono text-slate-600 dark:text-slate-400 font-medium">{u.joined || '---'}</td>

                    <td className="p-4 text-center font-mono">
                      <span className="block text-xs font-black text-slate-900 dark:text-slate-200">{u.activityCount || 0}</span>
                      <span className="text-[8px] tracking-wide text-slate-500 dark:text-slate-500 uppercase font-bold">
                        {u.role === 'tutor' ? 'Exams Authored' : u.role === 'validator' ? 'Quality Audits' : u.role === 'admin' ? 'System Changes' : 'Exams Purchased'}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {(u.role === 'validator' || u.role === 'admin') && (
                          <Button 
                            variant="secondary" 
                            className="px-2.5 py-1.5 text-[10px] font-mono border border-cyan-500/30 text-cyan-700 dark:text-cyan-400 flex items-center gap-1 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-lg transition-all font-bold"
                            onClick={() => openPrivilegeModal(u)}
                          >
                            <Shield size={11} /> GOVERN
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="p-2 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg shadow-sm dark:shadow-none">
                          <Mail size={12} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" />
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

      {/* --- MODAL DIALOGS: CREATE INTERNAL STAFF NODE --- */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}>
              <GlassCard className="w-full max-w-lg p-6 bg-white dark:bg-[#070c19] border border-slate-300 dark:border-white/10 shadow-2xl relative">
                <div className="flex justify-between items-center mb-5 border-b border-slate-200 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2 uppercase">
                      <UserPlus className="text-cyan-600 dark:text-cyan-500" size={16} /> Provision Institutional Staff Node
                    </h3>
                  </div>
                  <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleProvisionUser} className="space-y-4 font-sans">
                  {formError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-mono p-3 rounded-xl flex items-center gap-2">
                      <ShieldAlert size={14} /> {formError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">Staff Full Name</label>
                    <input 
                      type="text" required placeholder="e.g., Dr. Alan Turing"
                      value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-cyan-500/60 font-mono shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">Official Corporate Email</label>
                    <input 
                      type="email" required placeholder="e.g., alandev@lnbti.com"
                      value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-cyan-500/60 font-mono shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">System Gateway Role</label>
                      <select
                        value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value, privileges: [] }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs focus:outline-none font-mono cursor-pointer shadow-sm"
                      >
                        <option value="validator">Academic Validator</option>
                        <option value="admin">System Admin</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">Affiliated Institution</label>
                      <div className="relative">
                        <Building size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" disabled={createForm.role === 'admin'}
                          value={createForm.role === 'admin' ? 'Internal Operations' : createForm.institution}
                          onChange={e => setCreateForm(p => ({ ...p, institution: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl px-3 py-2 pl-8 text-slate-800 dark:text-slate-200 text-xs focus:outline-none disabled:opacity-50 font-mono shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/5">
                    <label className="text-[11px] font-mono text-slate-700 dark:text-slate-300 uppercase block flex items-center gap-1 font-bold"><Zap size={11} className="text-cyan-600 dark:text-cyan-500"/> Inject Functional Permissions Matrix</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {AVAILABLE_PRIVILEGES.map((p) => {
                        const isChecked = createForm.privileges.includes(p.key);
                        return (
                          <div 
                            key={p.key} onClick={() => handleToggleFormPrivilege(p.key)}
                            className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                              isChecked ? 'bg-cyan-500/[0.04] dark:bg-cyan-500/[0.06] border-cyan-500/50 dark:border-cyan-500/30' : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                            }`}
                          >
                            <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${isChecked ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300 dark:border-slate-600'}`}>
                              {isChecked && <CheckCircle size={10} className="text-white dark:text-slate-950" />}
                            </div>
                            <div>
                              <div className={`text-[11px] font-mono font-bold ${isChecked ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-800 dark:text-slate-200'}`}>{p.label}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 font-sans font-medium">{p.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/5">
                    <Button type="button" variant="ghost" size="sm" className="font-mono text-[10px] border border-slate-200" onClick={() => setIsCreateModalOpen(false)}>ABORT</Button>
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
                      <Shield className="text-indigo-600 dark:text-indigo-500" size={16} /> Node Capability Rules
                    </h3>
                    <p className="text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider font-bold">{selectedUser.name || 'Staff User'} • {selectedUser.institution}</p>
                  </div>
                  <button onClick={() => setIsPrivilegeModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-2.5 mb-5 max-h-60 overflow-y-auto pr-1">
                  {AVAILABLE_PRIVILEGES.map((p) => {
                    const isChecked = selectedUser.privileges?.includes(p.key);
                    return (
                      <div 
                        key={p.key} onClick={() => handleToggleExistingPrivilege(p.key)}
                        className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                          isChecked ? 'bg-indigo-500/[0.04] dark:bg-indigo-500/[0.06] border-indigo-500/50 dark:border-indigo-500/30' : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                        }`}
                      >
                        <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                          {isChecked && <CheckCircle size={10} className="text-white dark:text-slate-950" />}
                        </div>
                        <div>
                          <div className={`text-[11px] font-mono font-bold ${isChecked ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{p.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal font-sans font-medium">{p.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/5">
                  <Button variant="ghost" size="sm" className="font-mono text-[10px] border border-slate-200" onClick={() => setIsPrivilegeModalOpen(false)}>CLOSE</Button>
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