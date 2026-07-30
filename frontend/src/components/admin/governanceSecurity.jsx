// frontend/src/components/admin/governanceSecurity.jsx
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RefreshCw, Hourglass, Power, AlertTriangle, CheckCircle, Calendar, X } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import studentApi from '../../services/examExecutionService';
import Portal from '../ui/Portal';

const GovernanceSecurity = forwardRef((props, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // ✅ Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [securityConfig, setSecurityConfig] = useState({
    enableAntiCheat: true,
    maxViolationWarnings: 3,
    maintenanceMode: false,
    maintenanceEstimatedTime: '',
    maintenanceMessage: '',
    sessionTimeouts: { 
      super_admin: 15,
      finance_admin: 10,
      finance: 10,
      validator: 15,
      tutor: 20,
      student: 45 
    }
  });

  // ✅ Toast function
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const getEstimatedTimeDisplay = () => {
    if (!securityConfig.maintenanceEstimatedTime) return 'Not set';
    const estimatedDate = new Date(securityConfig.maintenanceEstimatedTime);
    const now = new Date();
    const diffMs = estimatedDate - now;
    
    if (diffMs <= 0) return 'Any moment now';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    
    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m remaining`;
    }
    return `${diffMins} minutes remaining`;
  };

  const getTimeColor = () => {
    if (!securityConfig.maintenanceEstimatedTime) return 'text-gray-400';
    const estimatedDate = new Date(securityConfig.maintenanceEstimatedTime);
    const now = new Date();
    const diffMs = estimatedDate - now;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins <= 0) return 'text-green-400';
    if (diffMins <= 15) return 'text-amber-400';
    return 'text-blue-400';
  };

  const formatRoleName = (role) => {
    const roleMap = {
      'super_admin': 'Super Admin',
      'finance_admin': 'Finance Admin',
      'finance': 'Finance',
      'validator': 'Validator',
      'tutor': 'Tutor',
      'student': 'Student'
    };
    return roleMap[role] || role.replace('_', ' ').toUpperCase();
  };

  useImperativeHandle(ref, () => ({
    getSecurityConfig: () => {
      const cleanConfig = { ...securityConfig };
      if (cleanConfig.sessionTimeouts && cleanConfig.sessionTimeouts.admin !== undefined) {
        const { admin, ...rest } = cleanConfig.sessionTimeouts;
        cleanConfig.sessionTimeouts = rest;
      }
      return cleanConfig;
    },
    setSecurityConfig: (config) => {
      if (config.sessionTimeouts && config.sessionTimeouts.admin !== undefined) {
        const { admin, ...rest } = config.sessionTimeouts;
        config.sessionTimeouts = rest;
      }
      setSecurityConfig(config);
    },
    saveSecurityConfig: async () => {
      try {
        setIsSaving(true);
        const cleanConfig = { ...securityConfig };
        if (cleanConfig.sessionTimeouts && cleanConfig.sessionTimeouts.admin !== undefined) {
          const { admin, ...rest } = cleanConfig.sessionTimeouts;
          cleanConfig.sessionTimeouts = rest;
        }
        const response = await studentApi.post('/system-settings/security', cleanConfig);
        if (response.data.success) {
          showNotification('✅ Security policies saved successfully!', 'success');
        } else {
          showNotification('❌ ' + (response.data.message || 'Failed to save security settings'), 'error');
        }
        return { success: response.data.success, message: response.data.message };
      } catch (error) {
        showNotification('❌ ' + (error.message || 'Failed to save security settings'), 'error');
        return { success: false, message: error.message };
      } finally {
        setIsSaving(false);
      }
    }
  }));

  useEffect(() => {
    loadSecuritySpecs();
  }, []);

  const loadSecuritySpecs = async () => {
    try {
      setIsLoading(true);
      const res = await studentApi.get('/system-settings/security');
      if (res.data.success) {
        let config = res.data.data;
        if (config.sessionTimeouts && config.sessionTimeouts.admin !== undefined) {
          const { admin, ...rest } = config.sessionTimeouts;
          config.sessionTimeouts = rest;
        }
        setSecurityConfig(config);
      }
    } catch (error) {
      console.error("Error fetching secure specifications:", error);
      showNotification('❌ Failed to load security settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimeoutField = (role, val) => {
    if (role === 'admin') {
      console.warn('⚠️ Attempted to update "admin" role - blocked');
      return;
    }
    
    setSecurityConfig(p => ({
      ...p,
      sessionTimeouts: { ...p.sessionTimeouts, [role]: Number(val) }
    }));
  };

  const getSortedRoles = () => {
    if (!securityConfig.sessionTimeouts) return [];
    const roles = Object.keys(securityConfig.sessionTimeouts);
    const filteredRoles = roles.filter(role => role !== 'admin');
    const priorityOrder = ['super_admin', 'finance_admin', 'finance', 'validator', 'tutor', 'student'];
    return filteredRoles.sort((a, b) => {
      const indexA = priorityOrder.indexOf(a);
      const indexB = priorityOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  };

  return (
    <div className="max-w-4xl space-y-6 mx-auto relative">
      {/* ✅ Toast Notification - Top Right */}
      <AnimatePresence>
        {toast.show && (
          <Portal>
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
                  : <AlertTriangle size={18} className="text-rose-400" />
                }
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider opacity-60">Governance</p>
                <p className="text-sm font-medium mt-0.5 leading-tight">{toast.message}</p>
              </div>
              <button 
                onClick={() => setToast(p => ({ ...p, show: false }))} 
                className="text-gray-400 hover:text-white p-1 transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      {/* 1. Anti-Cheat Engine Settings */}
      <GlassCard className="p-6 space-y-6 border-white/10">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <Shield className="text-blue-400" size={22} />
          <div>
            <h3 className="text-lg font-bold text-white">Anti-Cheat Engine Settings (CBT Focus Lock)</h3>
            <p className="text-xs text-gray-400">Track student visibility matrices and browser tab switching triggers</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-gray-400 font-mono">
            <RefreshCw className="animate-spin mr-2" size={14} /> Syncing secure configurations...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div className="md:col-span-2 space-y-0.5">
                <p className="text-sm font-semibold text-white">Maximum Disciplinary Violation Threshold</p>
                <p className="text-xs text-gray-400">Total window blur signals allowed before forcing automatic evaluation sheet commits</p>
              </div>
              <input
                type="number"
                min="1"
                max="10"
                value={securityConfig.maxViolationWarnings}
                onChange={(e) => setSecurityConfig(p => ({ ...p, maxViolationWarnings: Number(e.target.value) }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 text-center font-mono"
              />
            </div>
          </>
        )}
      </GlassCard>

      {/* 2. Secure Session Timeout Controller Panel */}
      <GlassCard className="p-6 space-y-6 border-white/10">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <Hourglass className="text-purple-400" size={22} />
          <div>
            <h3 className="text-lg font-bold text-white">Secure Session Timeouts (Inactivity Management)</h3>
            <p className="text-xs text-gray-400">Define automatic account logout windows in minutes across infrastructure roles</p>
          </div>
        </div>

        {!isLoading && securityConfig.sessionTimeouts && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {getSortedRoles().map((role) => (
              <div key={role} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block truncate">
                  {formatRoleName(role)}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={securityConfig.sessionTimeouts[role] || ''}
                    onChange={(e) => updateTimeoutField(role, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-center font-mono text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-gray-500">min</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* 3. Global Maintenance Mode Switch */}
      <GlassCard className="p-6 space-y-6 border-white/10">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <Power className="text-red-400" size={22} />
          <div>
            <h3 className="text-lg font-bold text-white">Global Platform Status (Maintenance Toggle)</h3>
            <p className="text-xs text-gray-400">Freeze assessment pipeline servers immediately during software updates</p>
          </div>
        </div>

        {!isLoading && (
          <div className={`flex flex-col gap-4 p-4 rounded-2xl border transition-colors duration-300 ${
            securityConfig.maintenanceMode ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/20'
          }`}>
            <div className="flex items-center gap-3">
              {securityConfig.maintenanceMode ? (
                <>
                  <AlertTriangle size={20} className="text-red-400 animate-pulse" />
                  <span className="text-red-400 font-bold text-sm">MAINTENANCE MODE ACTIVE</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} className="text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-sm">PLATFORM OPERATIONAL</span>
                </>
              )}
            </div>

            {securityConfig.maintenanceMode && securityConfig.maintenanceEstimatedTime && (
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <Calendar size={18} className={`${getTimeColor()}`} />
                <div>
                  <span className="text-xs text-gray-400">Estimated Completion:</span>
                  <span className={`ml-2 text-sm font-bold ${getTimeColor()}`}>
                    {getEstimatedTimeDisplay()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-white">Activate Platform Maintenance Slate</p>
                <p className="text-xs text-gray-400">
                  {securityConfig.maintenanceMode 
                    ? '⚠️ All non-admin users will see maintenance page. Admin access remains available.' 
                    : 'Enable to restrict student and tutor access during updates'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                <input 
                  type="checkbox" 
                  checked={securityConfig.maintenanceMode} 
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    if (newValue) {
                      if (!window.confirm('⚠️ Enabling maintenance mode will restrict access for all non-admin users. Are you sure?')) {
                        e.target.checked = !newValue;
                        return;
                      }
                    }
                    setSecurityConfig(p => ({ ...p, maintenanceMode: newValue }));
                  }} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-white"></div>
              </label>
            </div>

            {securityConfig.maintenanceMode && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 pt-3 border-t border-white/10"
              >
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Estimated Completion Time
                  </label>
                  <input
                    type="datetime-local"
                    value={securityConfig.maintenanceEstimatedTime || ''}
                    onChange={(e) => setSecurityConfig(p => ({ 
                      ...p, 
                      maintenanceEstimatedTime: e.target.value 
                    }))}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Set the expected completion time. Users will see a countdown on the maintenance page.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Custom Message (Optional)
                  </label>
                  <input
                    type="text"
                    value={securityConfig.maintenanceMessage || ''}
                    onChange={(e) => setSecurityConfig(p => ({ 
                      ...p, 
                      maintenanceMessage: e.target.value 
                    }))}
                    placeholder="e.g., We're updating our servers..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </motion.div>
            )}

            {securityConfig.maintenanceMode && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <p className="text-xs text-red-400 flex items-start gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Warning:</strong> Maintenance mode is currently <strong>ENABLED</strong>. 
                    All non-admin users will see a maintenance page. Click "Save Configuration" to apply changes.
                  </span>
                </p>
              </motion.div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
});

GovernanceSecurity.displayName = 'GovernanceSecurity';

export default GovernanceSecurity;