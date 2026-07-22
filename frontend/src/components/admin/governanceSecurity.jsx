// frontend/src/components/admin/governanceSecurity.jsx
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Shield, RefreshCw, Hourglass, Power } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import studentApi from '../../services/examExecutionService';

const GovernanceSecurity = forwardRef((props, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [securityConfig, setSecurityConfig] = useState({
    enableAntiCheat: true,
    maxViolationWarnings: 3,
    maintenanceMode: false,
    sessionTimeouts: { admin: 15, tutor: 20, student: 45, finance: 10, validator: 15 }
  });

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getSecurityConfig: () => securityConfig,
    setSecurityConfig: (config) => setSecurityConfig(config),
    saveSecurityConfig: async () => {
      try {
        setIsSaving(true);
        const response = await studentApi.post('/system-settings/security', securityConfig);
        return { success: response.data.success, message: response.data.message };
      } catch (error) {
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
        setSecurityConfig(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching secure specifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimeoutField = (role, val) => {
    setSecurityConfig(p => ({
      ...p,
      sessionTimeouts: { ...p.sessionTimeouts, [role]: Number(val) }
    }));
  };

  return (
    <div className="max-w-4xl space-y-6 mx-auto">

      {/* 1. Focus Lock Monitoring */}
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
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-white">Enable Global Focus Monitoring</p>
                <p className="text-xs text-gray-400">Actively block tab translation behaviors inside live simulated exam templates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={securityConfig.enableAntiCheat} onChange={(e) => setSecurityConfig(p => ({ ...p, enableAntiCheat: e.target.checked }))} className="sr-only peer"/>
                <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
              </label>
            </div>

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
                disabled={!securityConfig.enableAntiCheat}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 text-center font-mono disabled:opacity-35"
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.keys(securityConfig.sessionTimeouts).map((role) => (
              <div key={role} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block truncate">{role} Role</label>
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
          <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors duration-300 ${
            securityConfig.maintenanceMode ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/5'
          }`}>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-white">Activate Platform Maintenance Slate</p>
              <p className="text-xs text-gray-400">Restrict student execution terminals while allowing dashboard edits</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={securityConfig.maintenanceMode} onChange={(e) => setSecurityConfig(p => ({ ...p, maintenanceMode: e.target.checked }))} className="sr-only peer"/>
              <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-white"></div>
            </label>
          </div>
        )}
      </GlassCard>

    </div>
  );
});

GovernanceSecurity.displayName = 'GovernanceSecurity';

export default GovernanceSecurity;