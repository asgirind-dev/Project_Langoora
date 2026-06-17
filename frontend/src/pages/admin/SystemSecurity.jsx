import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, Key, Lock, EyeOff, Globe, Server, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function SystemSecurity() {
  // Mock State for Security Toggles
  const [twoFactorRequired, setTwoFactorRequired] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [passwordExpiry, setPasswordExpiry] = useState('90');
  
  // Mock Banned IPs List
  const [bannedIps, setBannedIps] = useState([
    { ip: '185.220.101.5', reason: 'Brute-force attack on admin login', date: '2026-06-09' },
    { ip: '45.144.22.112', reason: 'Suspicious API scraping requests', date: '2026-06-08' },
  ]);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');

  // System Health Status Mock
  const securityMetrics = [
    { label: 'SSL Certificate', status: 'Valid', sub: 'Expires in 245 days', color: 'green' },
    { label: 'Database Backup', status: 'Automated', sub: 'Last backup: 4h ago', color: 'green' },
    { label: 'Firewall Status', status: 'Active', sub: 'Mitigating 3 threats today', color: 'green' },
    { label: 'API Rate Limiting', status: 'Enabled', sub: '100 req/min per IP', color: 'blue' },
  ];

  const handleBlockIp = (e) => {
    e.preventDefault();
    if (!newIp) return;
    const today = new Date().toISOString().split('T')[0];
    setBannedIps([{ ip: newIp, reason: newReason || 'Manual Admin Block', date: today }, ...bannedIps]);
    setNewIp('');
    setNewReason('');
  };

  const handleUnbanIp = (ipToUnban) => {
    setBannedIps(bannedIps.filter(item => item.ip !== ipToUnban));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
          <Shield className="text-red-500" size={32} /> System Security
        </h1>
        <p className="text-gray-400">Monitor core network infrastructure, restrict access, and manage authorization policies</p>
      </motion.div>

      {/* Security Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {securityMetrics.map((metric, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="p-4 flex items-start justify-between border-white/10">
              <div>
                <div className="text-xs text-gray-400 font-medium mb-1">{metric.label}</div>
                <div className="text-lg font-bold text-white mb-0.5">{metric.status}</div>
                <div className="text-xs text-gray-500">{metric.sub}</div>
              </div>
              <Badge color={metric.color}>Secure</Badge>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Policy Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Global Access Policies */}
          <GlassCard className="p-6 border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Key size={18} className="text-blue-400" /> Authentication & Access Policies
            </h2>
            
            <div className="space-y-6 divide-y divide-white/5">
              {/* Toggle 1: 2FA */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-sm font-medium text-white">Enforce Two-Factor Authentication (2FA)</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Require all Admin and Tutor accounts to verify via secondary OTP.</p>
                </div>
                <button 
                  onClick={() => setTwoFactorRequired(!twoFactorRequired)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${twoFactorRequired ? 'bg-blue-500' : 'bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${twoFactorRequired ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle 2: Maintenance Mode */}
              <div className="flex items-center justify-between pt-4">
                <div>
                  <h3 className="text-sm font-medium text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Global Maintenance Mode
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Lock public route access and display a deployment/maintenance screen to users.</p>
                </div>
                <button 
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${maintenanceMode ? 'bg-amber-500' : 'bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${maintenanceMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Input Choice: Password Expiry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 gap-2">
                <div>
                  <h3 className="text-sm font-medium text-white">Password Expiry Interval</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Force credentials resets after a specified threshold.</p>
                </div>
                <select 
                  value={passwordExpiry} 
                  onChange={(e) => setPasswordExpiry(e.target.value)}
                  className="bg-[#0f1629] text-sm border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="30">Every 30 Days</option>
                  <option value="90">Every 90 Days</option>
                  <option value="180">Every 180 Days</option>
                  <option value="never">Never Expire</option>
                </select>
              </div>
            </div>
          </GlassCard>

          {/* IP Blacklisting / Threat Control */}
          <GlassCard className="p-6 border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Globe size={18} className="text-red-400" /> Network Firewalls & IP Restrictions
            </h2>

            {/* Block New IP Form */}
            <form onSubmit={handleBlockIp} className="flex flex-col sm:flex-row gap-3 mb-6">
              <input 
                type="text" placeholder="IPv4 or IPv6 Address (e.g. 192.168.1.1)"
                value={newIp} onChange={e => setNewIp(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
              />
              <input 
                type="text" placeholder="Reason for restriction..."
                value={newReason} onChange={e => setNewReason(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
              />
              <Button variant="danger" size="sm" type="submit" className="whitespace-nowrap">Block IP</Button>
            </form>

            {/* Banned IP Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500">
                    <th className="pb-2 pr-4">IP Address</th>
                    <th className="pb-2 pr-4">Violation Context</th>
                    <th className="pb-2 pr-4">Banned Date</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bannedIps.map((b) => (
                    <tr key={b.ip} className="text-sm">
                      <td className="py-3 pr-4 font-mono text-red-400">{b.ip}</td>
                      <td className="py-3 pr-4 text-gray-300 text-xs">{b.reason}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{b.date}</td>
                      <td className="py-3 text-right">
                        <button 
                          onClick={() => handleUnbanIp(b.ip)}
                          className="text-xs text-emerald-400 hover:underline bg-transparent border-none cursor-pointer"
                        >
                          Revoke Block
                        </button>
                      </td>
                    </tr>
                  ))}
                  {bannedIps.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center text-gray-500 py-4 text-xs">No active network IP blockades detected.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Right Column - Server Environment & Logs */}
        <div className="space-y-6">
          {/* Security Node Parameters */}
          <GlassCard className="p-6 border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Server size={18} className="text-emerald-400" /> Environment Nodes
            </h2>
            <div className="space-y-4">
              <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400 font-medium">Node Environment</span>
                  <Badge color="green">Production</Badge>
                </div>
                <p className="text-sm font-mono text-white">api-cluster-asia-south1</p>
              </div>

              <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400 font-medium">Encryption Standard</span>
                  <span className="text-xs text-gray-500">AES-256-GCM</span>
                </div>
                <p className="text-sm font-mono text-blue-400">TLS_AES_256_GCM_SHA384</p>
              </div>

              <Button variant="secondary" className="w-full flex items-center justify-center gap-2 text-xs py-2.5">
                <RefreshCw size={12} /> Purge Application Cache
              </Button>
            </div>
          </GlassCard>

          {/* Quick Threat Logs */}
          <GlassCard className="p-6 border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-400" /> Recent Warnings
            </h2>
            <div className="space-y-3">
              {[
                { event: 'Multiple invalid admin passcodes', target: 'admin_test@lnbti.com', time: '20 mins ago' },
                { event: 'CORS policy mismatch block', target: 'Origin: unauthorized-domain.xyz', time: '1 hr ago' },
                { event: 'Root config file modified', target: 'firebaseConfig.js structurally sound', time: '1 day ago' },
              ].map((log, index) => (
                <div key={index} className="text-xs p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <div className="font-medium text-amber-400">{log.event}</div>
                  <div className="text-gray-400 mt-0.5 font-mono text-[11px] truncate">{log.target}</div>
                  <div className="text-gray-500 mt-1 text-[10px] text-right">{log.time}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}