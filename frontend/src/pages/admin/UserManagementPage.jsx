// frontend/src/pages/admin/UserManagementPage.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, UserCheck, UserX, Shield, CheckCircle, X,
  UserPlus, Building, ShieldAlert, Loader, Radio, Zap, Activity, Globe,
  AlertCircle, Check, Ban, Trash2, AlertTriangle
} from 'lucide-react';

import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Portal from '../../components/ui/Portal';
import AdminNotifications from '../../components/admin/AdminNotifications';

import {
  fetchUsers,
  toggleUserLifecycle,
  softDeleteUser,
  saveUserPrivileges,
  provisionUser,
  fetchRoles
} from '../../services/userService';

// ================================================================
// ✅ SYSTEM-WIDE PRIVILEGES
// ================================================================
const SYSTEM_PRIVILEGES = [
  // System Administration
  { 
    key: 'manage_users', 
    roles: ['admin', 'super_admin', 'sub_admin'], 
    label: 'Manage Users', 
    category: 'system',
    desc: 'Create, update, suspend, and delete user accounts' 
  },
  { 
    key: 'manage_roles', 
    roles: ['super_admin'], 
    label: 'Manage Roles (Create/Edit/Delete)', 
    category: 'system',
    desc: 'Create, edit, and delete system roles' 
  },
  { 
    key: 'manage_system', 
    roles: ['admin', 'super_admin'], 
    label: 'System Settings', 
    category: 'system',
    desc: 'Configure system-wide settings and configurations' 
  },
  { 
    key: 'view_audit_logs', 
    roles: ['admin', 'super_admin'], 
    label: 'View Audit Logs', 
    category: 'system',
    desc: 'Access system audit trail and security logs' 
  },
  
  // Academic Operations (Validator)
  { 
    key: 'verify_tutors', 
    roles: ['validator'], 
    label: 'Approve Tutors', 
    category: 'academic',
    desc: 'Verify tutor credentials and approve or reject applications' 
  },
  { 
    key: 'audit_exams', 
    roles: ['validator'], 
    label: 'Audit Exams', 
    category: 'academic',
    desc: 'Review and audit exam quality, accuracy, and content validity' 
  },
  
  // Financial Operations (Finance Admin)
  { 
    key: 'manage_subscriptions', 
    roles: ['finance'], 
    label: 'Manage Subscription Plans', 
    category: 'financial',
    desc: 'Create, modify, and manage subscription plans and pricing' 
  },
  { 
    key: 'manage_credits', 
    roles: ['finance'], 
    label: 'Manage Credit Valuation', 
    category: 'financial',
    desc: 'Set and manage exam credit weights and valuation' 
  },
  { 
    key: 'approve_payouts', 
    roles: ['finance'], 
    label: 'Approve Tutor Payouts', 
    category: 'financial',
    desc: 'Approve and process tutor payout requests' 
  },
  
  // Content Management (Tutor)
  { 
    key: 'create_exams', 
    roles: ['tutor'], 
    label: 'Create Exams', 
    category: 'content',
    desc: 'Create new exams and assessments' 
  },
  { 
    key: 'manage_own_content', 
    roles: ['tutor'], 
    label: 'Manage Own Content', 
    category: 'content',
    desc: 'Edit and delete own content' 
  },
  { 
    key: 'view_student_progress', 
    roles: ['tutor'], 
    label: 'View Student Progress', 
    category: 'content',
    desc: 'Track student performance and progress' 
  },
  
  // 📊 General Access
  { 
    key: 'view_reports', 
    roles: ['admin', 'super_admin', 'sub_admin', 'tutor'], 
    label: 'View Reports', 
    category: 'general',
    desc: 'Access analytics and performance reports' 
  },
  { 
    key: 'view_own_profile', 
    roles: ['admin', 'super_admin', 'sub_admin', 'validator', 'finance', 'tutor', 'student'], 
    label: 'View Own Profile', 
    category: 'general',
    desc: 'Access and manage personal profile' 
  }
];

// ================================================================
// ROLE PRIVILEGE TEMPLATES - Validator & Finance only
// ================================================================
const ROLE_PRIVILEGE_TEMPLATES = {
  validator: [
    'verify_tutors',
    'audit_exams'
  ],
  finance: [
    'manage_subscriptions',
    'manage_credits',
    'approve_payouts'
  ]
};

// ================================================================
// PRIVILEGE CATEGORIES CONFIGURATION
// ================================================================
const PRIVILEGE_CATEGORIES = {
  system: { 
    label: 'System Administration', 
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30'
  },
  academic: { 
    label: 'Academic Operations', 
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30'
  },
  financial: { 
    label: 'Financial Operations', 
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30'
  },
  content: { 
    label: 'Content Management', 
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30'
  },
  general: { 
    label: 'General Access', 
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30'
  }
};

// ================================================================
// ✅ HELPER FUNCTIONS
// ================================================================
const getAvailablePrivilegesForRole = (roleId) => {
  return SYSTEM_PRIVILEGES.filter(p => p.roles.includes(roleId));
};

const getDisplayRole = (user) => {
  const roleMap = {
    'finance': 'Finance',
    'finance_admin': 'Finance Admin',
    'validator': 'Validator',
    'admin': 'Admin',
    'super_admin': 'Super Admin',
    'tutor': 'Tutor',
    'student': 'Student'
  };
  
  const userRole = user?.roleId || user?.role || 'student';
  return roleMap[userRole] || userRole;
};

const getEmailDomain = (roleId) => {
  switch (roleId) {
    case 'admin':
    case 'sub_admin':
    case 'finance': return 'novacore.com';
    case 'validator': return 'lnbti.com';
    case 'tutor':
    case 'student': return 'gmail.com';
    default: return 'example.com';
  }
};

// ================================================================
// ✅ MAIN COMPONENT
// ================================================================
export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedUser, setSelectedUser] = useState(null);
  const [isPrivilegeModalOpen, setIsPrivilegeModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ show: false, uid: null, email: null, currentStatus: null });

  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    roleId: '',
    institution: 'Langoora',
    organization: '',
    languageScope: 'Japanese',
    privileges: []
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  // ----------------------------------------------------------------------------
  // Toast Notification
  // ----------------------------------------------------------------------------
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // ----------------------------------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------------------------------
  const fetchAllUsersAndPreAuth = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      if (data.success) {
        setUsers(data.users.filter(u => u.status !== 'deleted'));
      } else {
        showNotification(data.message || 'Failed to fetch users.', 'error');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        showNotification('You do not have permission to view users.', 'error');
      } else if (error.response?.status === 401) {
        showNotification('Your session has expired. Please login again.', 'error');
        setTimeout(() => window.location.href = '/auth/login', 2000);
      } else {
        showNotification('Failed to fetch users. Please try again later.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRoles = async () => {
    try {
      const data = await fetchRoles();
      if (data.success) {
        const filteredRoles = data.roles.filter(r => r.id === 'validator' || r.id === 'finance');
        setRoles(filteredRoles);
        if (filteredRoles.length > 0) {
          const defaultRole = filteredRoles.find(r => r.id === 'validator') || filteredRoles[0];
          setCreateForm(prev => ({ ...prev, roleId: defaultRole.id }));
        }
        setRolesLoaded(true);
      } else {
        showNotification(data.message || 'Failed to fetch roles.', 'error');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        showNotification('You do not have permission to manage roles.', 'error');
      } else if (error.response?.status === 401) {
        showNotification('Your session has expired. Please login again.', 'error');
        setTimeout(() => window.location.href = '/auth/login', 2000);
      } else {
        showNotification('Failed to fetch roles. Please try again later.', 'error');
      }
    }
  };

  useEffect(() => {
    fetchAllUsersAndPreAuth();
    fetchAllRoles();
  }, []);

  // ----------------------------------------------------------------------------
  // User Lifecycle
  // ----------------------------------------------------------------------------
  const toggleSuspend = async (uid, currentStatus, email) => {
    try {
      const data = await toggleUserLifecycle(uid, currentStatus, email);
      if (data.success) {
        if (data.action === 'revoked') {
          setUsers(prev => prev.filter(u => u.id !== uid));
          showNotification("Staff validation invitation revoked successfully.", "error");
        } else {
          setUsers(prev => prev.map(u => u.id === uid ? { ...u, status: data.targetStatus } : u));
          const msg = data.targetStatus === 'suspended'
            ? "User profile suspended access parameters."
            : "User profile fully activated.";
          showNotification(msg, data.targetStatus === 'suspended' ? 'error' : 'success');
        }
      }
    } catch (error) {
      showNotification("Failed to sync account transformation lifecycle.", "error");
    }
  };

  const triggerDeleteConfirmation = (uid, currentStatus, email) => {
    setConfirmDeleteModal({ show: true, uid, email, currentStatus });
  };

  const handleConfirmSoftDelete = async () => {
    const { uid, currentStatus, email } = confirmDeleteModal;
    if (!uid) return;
    try {
      const data = await softDeleteUser(uid, currentStatus, email);
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== uid));
        setConfirmDeleteModal({ show: false, uid: null, email: null, currentStatus: null });
        showNotification("User profile dropped to deleted storage context successfully.", "error");
      }
    } catch (error) {
      showNotification("Failed to securely tag node to soft-deleted state.", "error");
    }
  };

  // ----------------------------------------------------------------------------
  // Privileges
  // ----------------------------------------------------------------------------
  const savePrivileges = async () => {
    try {
      const payload = {
        privileges: selectedUser.privileges,
        languageScope: selectedUser.languageScope,
        status: selectedUser.status,
        email: selectedUser.email
      };
      const data = await saveUserPrivileges(selectedUser.id, payload);
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? selectedUser : u));
        setIsPrivilegeModalOpen(false);
        showNotification("Security token capability access scopes committed clean.", "success");
      }
    } catch (error) {
      if (error.response?.status === 403) {
        showNotification("You do not have permission to change user privileges.", "error");
      } else if (error.response?.status === 401) {
        showNotification("Your session has expired. Please login again.", "error");
        setTimeout(() => window.location.href = '/auth/login', 2000);
      } else {
        showNotification("Failed to finalize staff permissions matrix update.", "error");
      }
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
      return {
        ...prev,
        privileges: exists
          ? prev.privileges.filter(p => p !== privilegeKey)
          : [...prev.privileges, privilegeKey]
      };
    });
  };

  // ----------------------------------------------------------------------------
  // Create User
  // ----------------------------------------------------------------------------
  const handleProvisionUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    const formattedEmail = createForm.email.toLowerCase().trim();

    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !formattedEmail || !createForm.roleId) {
      setFormError('All fields are mandatory.');
      setIsSubmitting(false);
      return;
    }
    if (users.some(u => u.email === formattedEmail)) {
      setFormError('This email is already registered.');
      setIsSubmitting(false);
      return;
    }

    try {
      const fullName = `${createForm.firstName.trim()} ${createForm.lastName.trim()}`;
      const isFinance = createForm.roleId === 'finance';
      
      const payload = {
        name: fullName,
        email: formattedEmail,
        roleId: createForm.roleId,
        organization: isFinance ? 'Novacore Solutions' : (createForm.organization || ''),
        institution: isFinance ? '' : (createForm.institution || 'Langoora'),
        languageScope: isFinance ? '' : (createForm.languageScope || 'Japanese'),
        privileges: createForm.privileges
      };
      
      const data = await provisionUser(payload);
      if (data.success) {
        setUsers(prev => [data.user, ...prev]);
        setIsCreateModalOpen(false);
        const defaultRole = roles.find(r => r.id === 'validator') || roles[0];
        setCreateForm({
          firstName: '',
          lastName: '',
          email: '',
          roleId: defaultRole?.id || '',
          institution: 'Langoora',
          organization: '',
          languageScope: 'Japanese',
          privileges: []
        });
        showNotification("Staff provisioning lifecycle executed. Invitation dispatched.", "success");
      }
    } catch (error) {
      if (error.response?.status === 403) {
        setFormError('You do not have permission to provision users.');
      } else if (error.response?.status === 401) {
        setFormError('Your session has expired. Please login again.');
        setTimeout(() => window.location.href = '/auth/login', 2000);
      } else {
        setFormError(error.response?.data?.message || "Failed to create user.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFormPrivilege = (privilegeKey) => {
    setCreateForm(prev => {
      const exists = prev.privileges.includes(privilegeKey);
      return {
        ...prev,
        privileges: exists
          ? prev.privileges.filter(p => p !== privilegeKey)
          : [...prev.privileges, privilegeKey]
      };
    });
  };

  // ----------------------------------------------------------------------------
  // Filters
  // ----------------------------------------------------------------------------
  const filtered = users.filter(u => {
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) &&
        !u.email?.toLowerCase().includes(search.toLowerCase()) &&
        !u.institution?.toLowerCase().includes(search.toLowerCase())) return false;
    
    const userRole = u.roleId || u.role || 'student';
    if (roleFilter !== 'all' && userRole !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  // ----------------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------------
  return (
    <div className="space-y-6 p-2 selection:bg-blue-500/30 relative">
      {/* Toast Notification */}
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
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/20'
            }`}>
              {toast.type === 'success'
                ? <CheckCircle size={18} className="text-emerald-400" />
                : <AlertCircle size={18} className="text-rose-400" />
              }
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider opacity-60">Identity Hub</p>
              <p className="text-sm font-medium mt-0.5 leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => setToast(p => ({ ...p, show: false }))} className="text-gray-400 hover:text-white p-1">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteModal.show && (
          <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
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
                    <h3 className="text-lg font-bold text-white">Soft Purge Account</h3>
                    <p className="text-xs text-gray-400">Directory Registry Alteration</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                  Are you sure you want to flag this user node as deleted? Their active login session state parameters will instantly drop from workspace views.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-xs border border-white/5 bg-white/5 hover:bg-white/10"
                    onClick={() => setConfirmDeleteModal({ show: false, uid: null, email: null, currentStatus: null })}
                  >
                    Cancel
                  </Button>
                  <button
                    type="button"
                    onClick={handleConfirmSoftDelete}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Header with Bell */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white tracking-tight">User Management Hub</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Manage student directories, verify corporate tutors, and configure access permissions for system staff
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end select-none">
          {/* ✅ Notification Bell - Same level as Add Staff button */}
          <AdminNotifications />
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:shadow-blue-500/20 shadow-md text-xs font-bold tracking-wide py-2.5 px-4 rounded-xl text-white transition-all"
          >
            <UserPlus size={15} className="group-hover:scale-110 transition-transform" />
            <span>Add Staff Member</span>
          </Button>
        </motion.div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
        {[
          { label: 'Total Students', value: users.filter(u => (u.roleId || u.role) === 'student').length, icon: Users, color: 'text-blue-500 bg-blue-500/5 border-blue-500/10' },
          { label: 'Active Tutors', value: users.filter(u => (u.roleId || u.role) === 'tutor').length, icon: UserCheck, color: 'text-indigo-500 bg-indigo-500/5 border-indigo-500/10' },
          { label: 'System Staff', value: users.filter(u => ['validator', 'finance', 'admin', 'super_admin'].includes(u.roleId || u.role)).length, icon: Shield, color: 'text-amber-500 bg-amber-500/5 border-amber-500/10' },
          { label: 'Suspended Accounts', value: users.filter(u => u.status === 'suspended').length, icon: UserX, color: 'text-rose-500 bg-rose-500/5 border-rose-500/10' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="p-4 flex items-center gap-4 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm hover:scale-[1.01] transition-all">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${s.color}`}>
                <s.icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {loading ? '...' : s.value}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                  {s.label}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Main Table Card - code continues... */}
      <GlassCard className="p-5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 mb-5">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search by user name, official email, or institution..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pt-2 border-t border-slate-100 dark:border-white/5">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1"><Activity size={12}/> Role Type:</span>
              {['all', 'student', 'tutor', 'validator', 'finance', 'super_admin'].map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                    roleFilter === r
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10'
                  }`}>
                  {r === 'super_admin' ? 'Super Admin' : r === 'validator' ? 'Validator' : r === 'finance' ? 'Finance' : r}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1"><Radio size={12}/> Status:</span>
              {['all', 'active', 'invited', 'pending', 'suspended'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                    statusFilter === s
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 font-semibold'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table - abbreviated for brevity, keep existing table code */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 text-sm">
              <Loader className="animate-spin text-blue-500" size={24} />
              <span className="animate-pulse font-medium">Synchronizing Secure User Records...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <AlertCircle size={36} className="text-slate-300 dark:text-slate-600 mb-2" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Users Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">We couldn't find any user profiles matching your filters.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.01] text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4">User Information</th>
                  <th className="p-4">Language Scope</th>
                  <th className="p-4">Role System</th>
                  <th className="p-4">Account Lifecycle</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-center">Activity Matrix</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                {filtered.map(u => {
                  const displayRole = getDisplayRole(u);
                  const userRoleForBadge = u.roleId || u.role || 'student';
                  const userRoleId = u.roleId || u.role || 'student';
                  
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.01] transition-all group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold shadow-sm group-hover:border-blue-500/30 transition-all">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white tracking-wide group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {u.name || 'Anonymous User'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{u.email}</p>
                            <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400">
                              <Building size={10} /> {u.institution || u.organization || 'Independent Affiliate'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <Globe size={13} className="text-slate-400" />
                          <span>{u.languageScope || 'All'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border whitespace-nowrap ${
                          userRoleForBadge === 'super_admin' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                          userRoleForBadge === 'admin' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' :
                          userRoleForBadge === 'validator' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' :
                          userRoleForBadge === 'finance' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                          userRoleForBadge === 'tutor' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' :
                          'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                        }`}>
                          {displayRole}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide capitalize whitespace-nowrap ${
                          u.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          u.status === 'invited' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400' :
                          u.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-500 dark:text-slate-400">{u.joined || '---'}</td>
                      <td className="p-4 text-center">
                        <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{u.activityCount || 0}</span>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                          {u.role === 'tutor' ? 'Exams Authored' : u.role === 'validator' ? 'Audits' : u.role === 'finance' ? 'Ledgers' : 'Exams Taken'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {(userRoleId === 'validator' || userRoleId === 'finance') && (
                            <Button
                              variant="secondary"
                              className="px-2.5 py-1.5 text-xs font-bold border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center gap-1.5 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl transition-all"
                              onClick={() => openPrivilegeModal(u)}
                            >
                              <Shield size={12} /> Permissions
                            </Button>
                          )}
                          <Button
                            variant={u.status === 'suspended' ? 'success' : 'danger'}
                            size="sm"
                            className={`text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 text-white shadow-sm transition-all duration-200 ${
                              u.status === 'suspended' ? 'bg-emerald-600 hover:bg-emerald-500' :
                              u.status === 'invited' ? 'bg-amber-600 hover:bg-amber-500' :
                              'bg-rose-600 hover:bg-rose-500'
                            }`}
                            onClick={() => toggleSuspend(u.id, u.status, u.email)}
                          >
                            {u.status === 'suspended' ? <Check size={12}/> : u.status === 'invited' ? <X size={12}/> : <Ban size={12}/>}
                            <span className="hidden sm:inline">
                              {u.status === 'suspended' ? 'ACTIVATE' : u.status === 'invited' ? 'REVOKE' : 'SUSPEND'}
                            </span>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="p-2 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all"
                            onClick={() => triggerDeleteConfirmation(u.id, u.status, u.email)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      {/* --- ADD STAFF MODAL --- */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-lg"
              >
                <GlassCard className="p-0 bg-white/5 dark:bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
                  
                  {/* Header */}
                  <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 flex-shrink-0">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <UserPlus className="text-blue-400" size={18} /> 
                      <span>Add New Staff Node</span>
                    </h3>
                    <button 
                      onClick={() => setIsCreateModalOpen(false)} 
                      className="text-white/40 hover:text-white/80 p-1 rounded-xl flex-shrink-0 transition-all duration-200 hover:bg-white/5"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                    <form onSubmit={handleProvisionUser} className="space-y-5">
                      {formError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2 font-medium backdrop-blur-sm">
                          <ShieldAlert size={15} /> {formError}
                        </div>
                      )}

                      {/* First Name & Last Name */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold tracking-wider text-white/60 uppercase">First Name</label>
                          <input
                            type="text" required placeholder="Asgiri"
                            value={createForm.firstName}
                            onChange={e => setCreateForm(p => ({ ...p, firstName: e.target.value }))}
                            className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold tracking-wider text-white/60 uppercase">Last Name</label>
                          <input
                            type="text" required placeholder="Perera"
                            value={createForm.lastName}
                            onChange={e => setCreateForm(p => ({ ...p, lastName: e.target.value }))}
                            className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold tracking-wider text-white/60 uppercase">Official Corporate Email</label>
                        <input
                          type="email" required
                          placeholder={`username@${getEmailDomain(createForm.roleId)}`}
                          value={createForm.email}
                          onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>

                      {/* System Role + Affiliation */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold tracking-wider text-white/60 uppercase">System Role</label>
                          <select
                            value={createForm.roleId}
                            onChange={e => {
                              const selectedRole = roles.find(r => r.id === e.target.value);
                              let privileges = [];
                              let organization = '';
                              let languageScope = 'Japanese';
                              
                              if (selectedRole?.id === 'validator') {
                                privileges = [];
                                languageScope = 'Japanese';
                              } else if (selectedRole?.id === 'finance') {
                                privileges = [];
                                organization = 'Novacore Solutions';
                                languageScope = '';
                              }
                              
                              setCreateForm(p => ({
                                ...p,
                                roleId: e.target.value,
                                privileges: privileges,
                                organization: organization,
                                languageScope: languageScope
                              }));
                            }}
                            disabled={!rolesLoaded || roles.length === 0}
                            className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {!rolesLoaded || roles.length === 0 ? (
                              <option value="" className="bg-gray-900">Loading roles...</option>
                            ) : (
                              roles.map(role => (
                                <option key={role.id} value={role.id} className="bg-gray-900 text-white hover:bg-gray-800">
                                  {role.name}
                                </option>
                              ))
                            )}
                          </select>
                          {rolesLoaded && roles.length > 0 && createForm.roleId && (
                            <p className="text-[9px] text-white/40">
                              Selected: <span className="text-blue-400 font-medium">
                                {roles.find(r => r.id === createForm.roleId)?.name || 'None'}
                              </span>
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-1.5">
                          {createForm.roleId === 'validator' ? (
                            <>
                              <label className="text-[10px] font-bold tracking-wider text-white/60 uppercase">Language Scope</label>
                              <select
                                value={createForm.languageScope}
                                onChange={e => setCreateForm(p => ({ ...p, languageScope: e.target.value }))}
                                className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 cursor-pointer"
                              >
                                <option value="Japanese" className="bg-gray-900 text-white hover:bg-gray-800">Japanese Language</option>
                                <option value="Korean" className="bg-gray-900 text-white hover:bg-gray-800">Korean Language</option>
                              </select>
                              <p className="text-[9px] text-blue-400/70">Validator will only see exams in this language</p>
                            </>
                          ) : createForm.roleId === 'finance' ? (
                            <>
                              <label className="text-[10px] font-bold tracking-wider text-white/60 uppercase">Organization</label>
                              <input
                                type="text"
                                disabled
                                value="Novacore Solutions"
                                className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5 text-white/50 text-sm cursor-not-allowed"
                              />
                              <p className="text-[9px] text-emerald-400/70">Auto-assigned for Finance Admin</p>
                            </>
                          ) : createForm.roleId === 'admin' || createForm.roleId === 'sub_admin' ? (
                            <>
                              <label className="text-[10px] font-bold tracking-wider text-white/60 uppercase">Organization</label>
                              <input
                                type="text"
                                disabled
                                value="Novacore Solutions"
                                className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5 text-white/50 text-sm cursor-not-allowed"
                              />
                            </>
                          ) : (
                            <>
                              <label className="text-[10px] font-bold tracking-wider text-white/60 uppercase">Institution</label>
                              <input
                                type="text"
                                placeholder="e.g., Langoora"
                                value={createForm.institution}
                                onChange={e => setCreateForm(p => ({ ...p, institution: e.target.value }))}
                                className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Privileges */}
                      {(createForm.roleId === 'validator' || createForm.roleId === 'finance') && (
                        <div className="space-y-3 pt-4 border-t border-white/5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold tracking-wider text-white/70 uppercase flex items-center gap-1">
                              <Zap size={14} className="text-amber-400"/> Assign Action Permissions
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const template = ROLE_PRIVILEGE_TEMPLATES[createForm.roleId] || [];
                                setCreateForm(prev => ({
                                  ...prev,
                                  privileges: template
                                }));
                              }}
                              className="text-[10px] text-blue-400/70 hover:text-blue-300 transition-colors font-medium px-3 py-1 rounded-lg border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/10"
                            >
                              Apply Template
                            </button>
                          </div>
                          
                          {Object.entries(PRIVILEGE_CATEGORIES).map(([categoryKey, category]) => {
                            if (categoryKey === 'general') return null;
                            
                            const categoryPrivileges = getAvailablePrivilegesForRole(createForm.roleId)
                              .filter(p => p.category === categoryKey);
                            
                            if (categoryPrivileges.length === 0) return null;
                            
                            const checkedCount = createForm.privileges.filter(p => 
                              categoryPrivileges.some(cp => cp.key === p)
                            ).length;
                            
                            return (
                              <div key={categoryKey} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${category.color}`}>
                                    {category.label}
                                  </span>
                                  <span className="text-[9px] text-white/30">
                                    {checkedCount}/{categoryPrivileges.length}
                                  </span>
                                </div>
                                <div className="space-y-2 pl-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                                  {categoryPrivileges.map((p) => {
                                    const isChecked = createForm.privileges.includes(p.key);
                                    return (
                                      <div
                                        key={p.key}
                                        onClick={() => handleToggleFormPrivilege(p.key)}
                                        className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                                          isChecked
                                            ? `${category.bg} ${category.border} shadow-sm`
                                            : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                                        }`}
                                      >
                                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                          isChecked ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/30' : 'border-white/20'
                                        }`}>
                                          {isChecked && <Check size={10} className="text-white" />}
                                        </div>
                                        <div>
                                          <div className={`text-[11px] font-bold ${isChecked ? 'text-blue-400' : 'text-white/80'}`}>
                                            {p.label}
                                          </div>
                                          <div className="text-[10px] text-white/40 leading-normal mt-0.5">
                                            {p.desc}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                          
                          <p className="text-[9px] text-white/30 mt-1">
                            Click "Apply Template" to assign default permissions for this role
                          </p>
                        </div>
                      )}

                      <div className="h-2" />
                    </form>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-white/5 backdrop-blur-sm flex-shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="text-xs text-white/60 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl transition-all duration-200"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="success"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={handleProvisionUser}
                      className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:shadow-blue-500/20 shadow-md text-white font-bold px-5 py-2 rounded-xl text-xs transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader size={14} className="animate-spin" />
                          Provisioning...
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} />
                          Authorize User
                        </>
                      )}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* --- PRIVILEGE GOVERNANCE MODAL --- */}
      <AnimatePresence>
        {isPrivilegeModalOpen && selectedUser && (
          <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-2xl"
              >
                <GlassCard className="p-0 bg-white/5 dark:bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
                  
                  {/* Header */}
                  <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 flex-shrink-0">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Shield className="text-indigo-400" size={18} /> 
                        <span>Update Staff Privileges</span>
                      </h3>
                      <p className="text-[11px] text-white/40 mt-0.5 capitalize">
                        {selectedUser.name || 'Staff User'} • {getDisplayRole(selectedUser)}
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsPrivilegeModalOpen(false)} 
                      className="text-white/40 hover:text-white/80 p-1 rounded-xl flex-shrink-0 transition-all duration-200 hover:bg-white/5"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                    {/* Language Scope - Only for Validator */}
                    {selectedUser.role === 'validator' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold tracking-wider text-white/60 uppercase">
                          Modify Assigned Language Scope
                        </label>
                        <select
                          value={selectedUser.languageScope}
                          onChange={e => setSelectedUser(prev => ({ ...prev, languageScope: e.target.value }))}
                          className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 cursor-pointer"
                        >
                          <option value="Japanese" className="bg-gray-900 text-white hover:bg-gray-800">Japanese Language Only</option>
                          <option value="Korean" className="bg-gray-900 text-white hover:bg-gray-800">Korean Language Only</option>
                        </select>
                      </div>
                    )}

                    {/* Privileges by Category - WITHOUT General Access */}
                    <div className="space-y-4 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                      {Object.entries(PRIVILEGE_CATEGORIES).map(([categoryKey, category]) => {
                        if (categoryKey === 'general') return null;
                        
                        const userRole = selectedUser.roleId || selectedUser.role || 'student';
                        const categoryPrivileges = SYSTEM_PRIVILEGES.filter(p => 
                          p.category === categoryKey && p.roles.includes(userRole)
                        );
                        
                        if (categoryPrivileges.length === 0) return null;
                        
                        const checkedCount = categoryPrivileges.filter(p => 
                          selectedUser.privileges?.includes(p.key)
                        ).length;
                        
                        return (
                          <div key={categoryKey} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-1 h-4 rounded ${category.bg}`} />
                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${category.color}`}>
                                  {category.label}
                                </span>
                              </div>
                              <span className="text-[9px] text-white/30">
                                {checkedCount}/{categoryPrivileges.length}
                              </span>
                            </div>
                            <div className="space-y-2 pl-2">
                              {categoryPrivileges.map((p) => {
                                const isChecked = selectedUser.privileges?.includes(p.key);
                                return (
                                  <div
                                    key={p.key}
                                    onClick={() => handleToggleExistingPrivilege(p.key)}
                                    className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                                      isChecked
                                        ? `${category.bg} ${category.border} shadow-sm`
                                        : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                                    }`}
                                  >
                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                      isChecked 
                                        ? 'bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/30' 
                                        : 'border-white/20'
                                    }`}>
                                      {isChecked && <Check size={10} className="text-white" />}
                                    </div>
                                    <div>
                                      <div className={`text-[11px] font-bold ${
                                        isChecked ? 'text-indigo-400' : 'text-white/80'
                                      }`}>
                                        {p.label}
                                      </div>
                                      <div className="text-[10px] text-white/40 leading-normal mt-0.5">
                                        {p.desc}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="h-2" />
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-white/5 backdrop-blur-sm flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPrivilegeModalOpen(false)}
                      className="text-xs text-white/60 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl transition-all duration-200"
                    >
                      Close
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={savePrivileges}
                      className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:shadow-blue-500/20 shadow-md text-white font-bold px-5 py-2 rounded-xl text-xs transition-all duration-200 flex items-center gap-2"
                    >
                      <Shield size={14} />
                      Save Configuration
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}