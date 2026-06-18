import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Lock, Server, RefreshCw, AlertTriangle, CheckCircle, Users, Eye } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function SystemSecurity() {
  // Security Configurations Toggles
  const [twoFactorRequired, setTwoFactorRequired] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [passwordComplexity, setPasswordComplexity] = useState('high');
  
  // Realistic Security Audit Logs (Great for Viva presentation!)
  const securityLogs = [
    { event: 'Admin Login Successful', user: 'admin@novacore.com', time: 'Just now', type: 'success' },
    { event: 'Staff Provision Authorization', user: 'System Trigger', time: '20 mins ago', type: 'info' },
    { event: 'Failed Password Attempt', user: 'tutor.test@lnbti.com', time: '1 hour ago', type: 'warning' },
    { event: 'JWT Security Token Refreshed', user: 'student.node@lnbti.com', time: '2 hours ago', type: 'success' },
  ];

  // System Core Metrics
  const securityMetrics = [
    { label: 'Authentication Provider', status: 'Firebase Auth', sub: 'Secure identity nodes', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { label: 'Central Registry', status: 'Firestore DB', sub: 'Encrypted at rest', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { label: 'Authorization Gateway', status: 'JWT Enabled', sub: '1-Day session tokens', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { label: 'Input Protection', status: 'Backend Validated', sub: 'Double-layer registry locks', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  ];

  return (
    <div className="space-y-6 p-2">
      {/* --- UNIFORM DASHBOARD HEADER --- */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
          <Shield className="text-blue-500" size={28} /> System Security
        </h1>
        <p className="text-gray-400 mt-1">Monitor authentication infrastructure, handle global configurations, and review access logs</p>
      </motion.div>

      {/* --- SECURITY METRICS GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {securityMetrics.map((metric, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="p-4 flex items-center justify-between bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm">
              <div>
                <div className="text-xs text-slate-400 font-medium mb-1">{metric.label}</div>
                <div className="text-lg font-extrabold text-white tracking-tight">{metric.status}</div>
                <div className="text-xs text-slate-500 mt-0.5">{metric.sub}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border uppercase ${metric.color}`}>
                Active
              </span>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- LEFT COLUMN: CORE POLICY CONTROLS --- */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
              <Key size={16} className="text-blue-500" /> Authentication & Access Policies
            </h2>
            
            <div className="space-y-5 divide-y divide-slate-100 dark:divide-white/5">
              {/* Policy 1: Enforce 2FA */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h3 className="text-sm font-semibold text-white">Enforce Two-Factor Authentication (2FA)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Require multi-factor validation credentials for administrative staff access gateways.</p>
                </div>
                <button 
                  onClick={() => setTwoFactorRequired(!twoFactorRequired)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${twoFactorRequired ? 'bg-blue-600' : 'bg-slate-200 dark:bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${twoFactorRequired ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Policy 2: Global Maintenance Screen */}
              <div className="flex items-center justify-between pt-4">
                <div>
                  <h3 className="text-sm font-semibold text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Global Maintenance Mode
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Lock public route access levels and display a structural maintenance screen to incoming students.</p>
                </div>
                <button 
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${maintenanceMode ? 'bg-amber-500' : 'bg-slate-200 dark:bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${maintenanceMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Policy 3: Password Complexity Choice */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">Registration Password Policy Complexity</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Enforce structural registration rules via backend token policy layer configurations.</p>
                </div>
                <select 
                  value={passwordComplexity} 
                  onChange={(e) => setPasswordComplexity(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 text-xs border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="standard">Standard (Min 6 Characters)</option>
                  <option value="high">Enterprise (8-12 Chars + Dynamic Mix)</option>
                  <option value="maximum">Maximum Lockdown (Alpha-Numeric-Special)</option>
                </select>
              </div>
            </div>
          </GlassCard>

          {/* --- ENVIRONMENT PARAMETERS MODULE --- */}
          <GlassCard className="p-5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
              <Server size={16} className="text-emerald-500" /> Platform Deployment Context
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400 font-medium">Node Environment</span>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-semibold text-[10px]">Local Dev Mode</Badge>
                </div>
                <p className="text-sm font-mono text-white">localhost:5000 (Express Core)</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400 font-medium">Identity Middleware</span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">Bearer Token Framework</span>
                </div>
                <p className="text-sm font-mono text-blue-400">authMiddleware.protect</p>
              </div>
            </div>
            
            <div className="mt-4">
              <Button variant="secondary" className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                <RefreshCw size={13} /> Clear Platform Memory Caches
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* --- RIGHT COLUMN: ACTIVE SECURITY AUDIT LOGS --- */}
        <div className="space-y-6">
          <GlassCard className="p-5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
              <CheckCircle size={16} className="text-indigo-500" /> Recent Security Logs
            </h2>
            <div className="space-y-3">
              {securityLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`text-xs p-3 rounded-xl border ${
                    log.type === 'warning' ? 'bg-rose-500/5 border-rose-500/10 text-rose-400' :
                    log.type === 'info' ? 'bg-blue-500/5 border-blue-500/10 text-blue-400' :
                    'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{log.event}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{log.time}</span>
                  </div>
                  <div className="text-slate-400 mt-1 font-mono text-[11px] truncate">{log.user}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}