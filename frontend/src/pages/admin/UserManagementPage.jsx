import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, UserCheck, UserX, Mail, Shield, CheckCircle, X,
  UserPlus, Building, ShieldAlert, Loader, Radio, Zap, Activity, Globe,
  AlertCircle, Check, Ban, Trash2, AlertTriangle, Plus, Settings, Edit, Trash
} from 'lucide-react';

import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Portal from '../../components/ui/Portal';

import {
  fetchUsers,
  toggleUserLifecycle,
  softDeleteUser,
  saveUserPrivileges,
  provisionUser,
  fetchRoles,
  createRole,
  updateRole,
  deleteRole
} from '../../services/userService';

const AVAILABLE_PRIVILEGES = [
  { key: 'verify_tutors', role: 'validator', label: 'Tutor Verification Power', desc: 'Approve or reject external partner academy tutors.' },
  { key: 'audit_exams', role: 'validator', label: 'Exam Quality Audit Power', desc: 'Inspect question matrices and structures for quality assurance.' },
  { key: 'resolve_disputes', role: 'validator', label: 'Resolve Content Disputes', desc: 'Settle student arguments and recheck requests.' },
  { key: 'manage_subscriptions', role: 'finance', label: 'Subscription Framework Manager', desc: 'Modify packages, pricing, and active credit values.' },
  { key: 'approve_payouts', role: 'finance', label: 'Tutor Payouts Approver', desc: 'Validate accumulated tutor credits and authorize bank transfers.' },
  { key: 'view_ledger', role: 'finance', label: 'Transaction Ledger Auditor', desc: 'View full platform financial inflows and outflows ledger.' }
];

const ALL_PERMISSION_KEYS = [
  'manage_users',
  'manage_roles',
  'approve_tutors',
  'view_reports',
  'manage_exams',
  'manage_finance',
  'manage_system'
];

const PERMISSION_LABELS = {
  manage_users: 'Manage Users',
  manage_roles: 'Manage Roles (Create/Edit/Delete)',
  approve_tutors: 'Approve Tutors',
  view_reports: 'View Reports',
  manage_exams: 'Manage Exams',
  manage_finance: 'Manage Finance',
  manage_system: 'Manage System Settings'
};

// Helper to get email domain based on roleId
const getEmailDomain = (roleId) => {
  switch (roleId) {
    case 'admin':
    case 'sub_admin':
    case 'finance':
      return 'novacore.com';
    case 'validator':
      return 'lnbti.com';
    case 'tutor':
    case 'student':
      return 'gmail.com';
    default:
      return 'example.com';
  }
};

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
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ show: false, uid: null, email: null, currentStatus: null });

  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    level: 3,
    permissions: {
      manage_users: false,
      manage_roles: false,
      approve_tutors: false,
      view_reports: false,
      manage_exams: false,
      manage_finance: false,
      manage_system: false
    }
  });
  const [roleFormError, setRoleFormError] = useState('');
  const [isRoleSubmitting, setIsRoleSubmitting] = useState(false);

  // Updated createForm with firstName and lastName
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    roleId: 'validator',
    institution: 'LNBTI',
    languageScope: 'Japanese',
    privileges: []
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchAllUsersAndPreAuth = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      if (data.success) {
        setUsers(data.users.filter(u => u.status !== 'deleted'));
      }
    } catch (error) {
      console.error("Error synchronizing storage directory registry:", error);
      showNotification("Failed to fetch central user repository streams.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRoles = async () => {
    try {
      const data = await fetchRoles();
      if (data.success) {
        // Exclude super_admin from the list for staff creation
        setRoles(data.roles.filter(r => r.id !== 'super_admin'));
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      showNotification("Failed to fetch roles.", "error");
    }
  };

  useEffect(() => {
    fetchAllUsersAndPreAuth();
    fetchAllRoles();
  }, []);

  // --- User lifecycle (unchanged) ---
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
      console.error("Lifecycle runtime transformation failed:", error);
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
      console.error("Soft purge matrix crashed:", error);
      showNotification("Failed to securely tag node to soft-deleted state.", "error");
    }
  };

  // --- Privileges (unchanged) ---
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
      console.error("Failed to commit capability profiles:", error);
      showNotification("Failed to finalize staff permissions matrix update.", "error");
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

  // --- Create user (updated) ---
  const handleProvisionUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    const formattedEmail = createForm.email.toLowerCase().trim();

    // Validate firstName, lastName, email, roleId
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
      // Combine first and last name
      const fullName = `${createForm.firstName.trim()} ${createForm.lastName.trim()}`;
      const payload = {
        name: fullName,
        email: formattedEmail,
        roleId: createForm.roleId,
        institution: createForm.institution,
        languageScope: createForm.languageScope,
        privileges: createForm.privileges
      };
      const data = await provisionUser(payload);
      if (data.success) {
        setUsers(prev => [data.user, ...prev]);
        setIsCreateModalOpen(false);
        setCreateForm({
          firstName: '',
          lastName: '',
          email: '',
          roleId: 'validator',
          institution: 'LNBTI',
          languageScope: 'Japanese',
          privileges: []
        });
        showNotification("Staff provisioning lifecycle executed. Invitation dispatched.", "success");
      }
    } catch (error) {
      setFormError(error.response?.data?.message || "Failed to create user.");
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

  // --- Role Management (unchanged) ---
  const openRoleModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({
        name: role.name,
        level: role.level,
        permissions: role.permissions || {}
      });
    } else {
      setEditingRole(null);
      setRoleForm({
        name: '',
        level: 3,
        permissions: {
          manage_users: false,
          manage_roles: false,
          approve_tutors: false,
          view_reports: false,
          manage_exams: false,
          manage_finance: false,
          manage_system: false
        }
      });
    }
    setRoleFormError('');
    setIsRoleModalOpen(true);
  };

  const handleToggleRolePermission = (permKey) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permKey]: !prev.permissions[permKey]
      }
    }));
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    setRoleFormError('');
    setIsRoleSubmitting(true);
    if (!roleForm.name.trim()) {
      setRoleFormError('Role name is required.');
      setIsRoleSubmitting(false);
      return;
    }
    try {
      let data;
      if (editingRole) {
        data = await updateRole(editingRole.id, roleForm);
      } else {
        data = await createRole(roleForm);
      }
      if (data.success) {
        await fetchAllRoles();
        setIsRoleModalOpen(false);
        showNotification(`Role ${editingRole ? 'updated' : 'created'} successfully!`, 'success');
      }
    } catch (error) {
      setRoleFormError(error.response?.data?.message || `Failed to ${editingRole ? 'update' : 'create'} role.`);
    } finally {
      setIsRoleSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (!window.confirm(`Are you sure you want to delete the role "${roleName}"? This cannot be undone if users are assigned to it.`)) return;
    try {
      const data = await deleteRole(roleId);
      if (data.success) {
        await fetchAllRoles();
        showNotification(`Role "${roleName}" deleted successfully.`, 'success');
      }
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to delete role.', 'error');
    }
  };

  // ---------- Filters ----------
  const filtered = users.filter(u => {
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) &&
        !u.email?.toLowerCase().includes(search.toLowerCase()) &&
        !u.institution?.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  // ---------- Render ----------
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

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white tracking-tight">User Management Hub</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Manage student directories, verify corporate tutors, and configure access permissions for system staff
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end select-none">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
            onClick={() => openRoleModal()}
          >
            <Settings size={14} className="mr-1" /> Manage Roles
          </Button>
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
          { label: 'Total Students', value: users.filter(u => u.role === 'student').length, icon: Users, color: 'text-blue-500 bg-blue-500/5 border-blue-500/10' },
          { label: 'Active Tutors', value: users.filter(u => u.role === 'tutor').length, icon: UserCheck, color: 'text-indigo-500 bg-indigo-500/5 border-indigo-500/10' },
          { label: 'System Staff', value: users.filter(u => u.role === 'validator' || u.role === 'finance' || u.role === 'admin' || u.role === 'super_admin').length, icon: Shield, color: 'text-amber-500 bg-amber-500/5 border-amber-500/10' },
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

      {/* Main Table Card */}
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
              {['all', 'student', 'tutor', 'validator', 'finance', 'admin', 'super_admin'].map(r => (
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

        {/* Table */}
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
                {filtered.map(u => (
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
                            <Building size={10} /> {u.institution || 'Independent Affiliate'}
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
                        u.role === 'super_admin' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                        u.role === 'admin' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' :
                        u.role === 'validator' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' :
                        u.role === 'finance' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                        u.role === 'tutor' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' :
                        'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                      }`}>
                        {u.role === 'super_admin' ? 'Super Admin' : u.role === 'validator' ? 'Validator' : u.role === 'finance' ? 'Finance' : u.role}
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
                        {(u.role === 'validator' || u.role === 'finance' || u.role === 'admin' || u.role === 'super_admin') && (
                          <Button
                            variant="secondary"
                            className="px-2.5 py-1.5 text-xs font-bold border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center gap-1.5 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl transition-all"
                            onClick={() => openPrivilegeModal(u)}
                          >
                            <Shield size={12} /> Permissions
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="p-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-transparent hover:bg-slate-100 rounded-xl">
                          <Mail size={13} className="text-slate-500 dark:text-slate-400" />
                        </Button>
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      {/* --- ADD STAFF MODAL (Updated) --- */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
                <GlassCard className="w-full max-w-lg p-6 bg-white dark:bg-[#070c19] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl relative">
                  <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-white/5 pb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <UserPlus className="text-blue-500" size={18} /> Add New Staff Node
                    </h3>
                    <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl">
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleProvisionUser} className="space-y-4">
                    {formError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
                        <ShieldAlert size={15} /> {formError}
                      </div>
                    )}

                    {/* First Name & Last Name */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">First Name</label>
                        <input
                          type="text" required placeholder="Asgiri"
                          value={createForm.firstName}
                          onChange={e => setCreateForm(p => ({ ...p, firstName: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Last Name</label>
                        <input
                          type="text" required placeholder="Perera"
                          value={createForm.lastName}
                          onChange={e => setCreateForm(p => ({ ...p, lastName: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Email with dynamic placeholder */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Official Corporate Email</label>
                      <input
                        type="email" required
                        placeholder={`username@${getEmailDomain(createForm.roleId)}`}
                        value={createForm.email}
                        onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* System Role + Affiliation/Institution */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">System Role</label>
                        <select
                          value={createForm.roleId}
                          onChange={e => {
                            const selectedRole = roles.find(r => r.id === e.target.value);
                            setCreateForm(p => ({
                              ...p,
                              roleId: e.target.value,
                              privileges: (selectedRole && (selectedRole.id === 'validator' || selectedRole.id === 'finance')) ? p.privileges : []
                            }));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none cursor-pointer"
                        >
                          {roles.length === 0 && <option value="">Loading roles...</option>}
                          {roles.map(role => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        {createForm.roleId === 'validator' ? (
                          <>
                            <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Language Scope</label>
                            <select
                              value={createForm.languageScope}
                              onChange={e => setCreateForm(p => ({ ...p, languageScope: e.target.value }))}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none cursor-pointer"
                            >
                              <option value="Japanese">Japanese Language</option>
                              <option value="Korean">Korean Language</option>
                            </select>
                          </>
                        ) : createForm.roleId === 'finance' || createForm.roleId === 'admin' || createForm.roleId === 'sub_admin' ? (
                          <>
                            <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Affiliation</label>
                            <input
                              type="text"
                              disabled
                              value="NovaCore Operations"
                              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-slate-400 text-sm cursor-not-allowed"
                            />
                          </>
                        ) : (
                          <>
                            <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Institution</label>
                            <input
                              type="text"
                              placeholder="e.g., LNBTI"
                              value={createForm.institution}
                              onChange={e => setCreateForm(p => ({ ...p, institution: e.target.value }))}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {(createForm.roleId === 'validator' || createForm.roleId === 'finance') && (
                      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                          <Zap size={13} className="text-amber-500"/> Assign Action Permissions
                        </label>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                          {AVAILABLE_PRIVILEGES.filter(p => p.role === createForm.roleId).map((p) => {
                            const isChecked = createForm.privileges.includes(p.key);
                            return (
                              <div
                                key={p.key} onClick={() => handleToggleFormPrivilege(p.key)}
                                className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                                  isChecked
                                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 shadow-sm'
                                    : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-white/10'}`}>
                                  {isChecked && <Check size={11} className="text-white" />}
                                </div>
                                <div>
                                  <div className={`text-xs font-bold ${isChecked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>{p.label}</div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1">{p.desc}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(false)} className="text-xs">Cancel</Button>
                      <Button type="submit" variant="success" size="sm" disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm">
                        {isSubmitting ? 'Provisioning...' : 'Authorize User'}
                      </Button>
                    </div>
                  </form>
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
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
                <GlassCard className="w-full max-w-md p-6 bg-white dark:bg-[#070c19] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl relative">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-white/5 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="text-indigo-500" size={18} /> Update Staff Privileges
                      </h3>
                      <p className="text-xs font-semibold text-slate-400 mt-1 capitalize">
                        {selectedUser.name || 'Staff User'} • {selectedUser.role}
                      </p>
                    </div>
                    <button onClick={() => setIsPrivilegeModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl">
                      <X size={18} />
                    </button>
                  </div>

                  {selectedUser.role === 'validator' && (
                    <div className="mb-4 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Modify Assigned Language Scope</label>
                      <select
                        value={selectedUser.languageScope}
                        onChange={e => setSelectedUser(prev => ({ ...prev, languageScope: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none cursor-pointer"
                      >
                        <option value="Japanese">Japanese Language Only</option>
                        <option value="Korean">Korean Language Only</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-2.5 mb-5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                    {AVAILABLE_PRIVILEGES.filter(p => p.role === selectedUser.role).map((p) => {
                      const isChecked = selectedUser.privileges?.includes(p.key);
                      return (
                        <div
                          key={p.key} onClick={() => handleToggleExistingPrivilege(p.key)}
                          className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                            isChecked
                              ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 shadow-sm'
                              : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-white/10 text-gray-400 hover:border-white/20'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-white/10'}`}>
                            {isChecked && <Check size={11} className="text-white" />}
                          </div>
                          <div>
                            <div className={`text-xs font-bold ${isChecked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{p.label}</div>
                            <div className="text-[11px] text-slate-500 mt-1 leading-normal">{p.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                    <Button variant="ghost" size="sm" onClick={() => setIsPrivilegeModalOpen(false)} className="text-xs">Close</Button>
                    <Button variant="success" size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 font-bold px-4 py-2 rounded-xl text-xs shadow-sm" onClick={savePrivileges}>Save Configuration</Button>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* --- ROLE MANAGEMENT MODAL --- */}
      <AnimatePresence>
        {isRoleModalOpen && (
          <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
                <GlassCard className="w-full max-w-2xl p-6 bg-white dark:bg-[#070c19] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl relative max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-white/5 pb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Settings className="text-purple-500" size={18} />
                      {editingRole ? 'Edit Role' : 'Create New Role'}
                    </h3>
                    <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl">
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRole} className="space-y-4">
                    {roleFormError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
                        <ShieldAlert size={15} /> {roleFormError}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Role Name</label>
                        <input
                          type="text" required placeholder="e.g., Sub Admin"
                          value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Privilege Level</label>
                        <input
                          type="number" required min="1" max="10"
                          value={roleForm.level} onChange={e => setRoleForm({ ...roleForm, level: parseInt(e.target.value) || 3 })}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <p className="text-[10px] text-slate-400">Lower number = higher privilege (1 = highest)</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                        <Shield size={13} className="text-purple-500"/> Permissions
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {ALL_PERMISSION_KEYS.map(permKey => (
                          <div
                            key={permKey}
                            onClick={() => handleToggleRolePermission(permKey)}
                            className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                              roleForm.permissions[permKey]
                                ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-sm'
                                : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${roleForm.permissions[permKey] ? 'bg-purple-500 border-purple-500' : 'border-slate-300 dark:border-white/10'}`}>
                              {roleForm.permissions[permKey] && <Check size={11} className="text-white" />}
                            </div>
                            <div>
                              <div className={`text-xs font-bold ${roleForm.permissions[permKey] ? 'text-purple-600 dark:text-purple-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                {PERMISSION_LABELS[permKey] || permKey}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsRoleModalOpen(false)} className="text-xs">Cancel</Button>
                      <Button type="submit" variant="success" size="sm" disabled={isRoleSubmitting} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm">
                        {isRoleSubmitting ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                      </Button>
                    </div>
                  </form>

                  {!editingRole && (
                    <div className="mt-6 border-t border-slate-100 dark:border-white/5 pt-4">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Existing Roles</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {roles.map(role => (
                          <div key={role.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-white">{role.name}</span>
                              <span className="text-[10px] text-slate-400">Level {role.level}</span>
                              <span className="text-[10px] text-slate-500">{Object.keys(role.permissions || {}).filter(k => role.permissions[k]).length} permissions</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openRoleModal(role)}
                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role.id, role.name)}
                                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}