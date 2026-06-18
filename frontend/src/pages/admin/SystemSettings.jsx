import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Shield, Layout, Globe, Sliders, RefreshCw, AlertTriangle } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('cms');
  const [isSaving, setIsSaving] = useState(false);

  // Mock UI states for visual demonstration
  const [mfaStaff, setMfaStaff] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const tabs = [
    { id: 'cms', label: 'Homepage CMS', icon: Layout },
    { id: 'security', label: 'Governance & Security', icon: Shield },
    { id: 'global', label: 'Global Configurations', icon: Sliders },
  ];

  const handleFakeSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('System configuration parameters staged successfully!');
    }, 1000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">System Settings</h1>
            <p className="text-gray-400">Manage platform thresholds, core governance infrastructure, and homepage CMS state</p>
          </div>
          <Button variant="primary" onClick={handleFakeSave} disabled={isSaving}>
            <Save size={16} /> {isSaving ? 'Syncing...' : 'Save Configuration'}
          </Button>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400 bg-white/3'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/1'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Dynamic Layer */}
      <motion.div key={activeTab} initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
        
        {/* TAB 1: HOMEPAGE CMS */}
        {activeTab === 'cms' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <GlassCard className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Globe size={18} className="text-blue-400" /> Hero Section Metrics
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Main Title / Catchphrase</label>
                    <input type="text" defaultValue="Master New Languages with Expert Live Tutors" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Sub-headline Description</label>
                    <textarea rows={3} defaultValue="Access simulation exams tailored for JLPT, IELTS, and standard proficiency tests with structured evaluations and immediate feedback architectures." 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none" />
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Layout size={18} className="text-cyan-400" /> Announcement Banner Alert
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Banner Notification Text</label>
                    <input type="text" defaultValue="🚀 Flash Sale: 20% off on all mock packages this week!" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Banner Accent Type</label>
                    <select className="w-full bg-[#131b2e] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50">
                      <option value="info">Info Blue</option>
                      <option value="warning">Warning Amber</option>
                      <option value="danger">Danger Red</option>
                    </select>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Sidebar Preview Recommendation */}
            <div className="space-y-6">
              <GlassCard className="p-6 border-blue-500/20 bg-blue-500/5">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Layout size={14} className="text-blue-400" /> Live Preview Monitor
                </h4>
                <div className="p-4 bg-slate-950/60 rounded-xl border border-white/5 space-y-3">
                  <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] py-1 px-2 rounded text-center">
                    🚀 Flash Sale: 20% off on all mock packages this week!
                  </div>
                  <div className="space-y-1 py-4 text-center">
                    <h5 className="text-sm font-bold text-white leading-tight">Master New Languages with Expert Live Tutors</h5>
                    <p className="text-[10px] text-gray-400 px-2">Access simulation exams tailored for JLPT, IELTS, and standard proficiency tests...</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                  💡 <b>Recommendation:</b> This frame binds directly to your landing metadata configuration block without triggering state full reloads.
                </p>
              </GlassCard>
            </div>
          </div>
        )}

        {/* TAB 2: GOVERNANCE & SECURITY */}
        {activeTab === 'security' && (
          <div className="max-w-3xl space-y-6">
            <GlassCard className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <Shield size={18} className="text-emerald-400" /> Security Policies & Thresholds
                </h3>
                <p className="text-xs text-gray-400">Maps directly to firestore <code className="text-cyan-400 font-mono">security_policies</code> architectural collection document</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Max Login Attempts Before Lockout</label>
                  <input type="number" defaultValue={5} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Session Timeout (Minutes)</label>
                  <input type="number" defaultValue={60} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>

              <div className="divide-y divide-white/5 pt-2">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-white">Enforce Multi-Factor Auth (MFA) for Staff</p>
                    <p className="text-xs text-gray-400 mt-0.5">Mandatory security layer verification protocols for admins and validators.</p>
                  </div>
                  <input type="checkbox" checked={mfaStaff} onChange={() => setMfaStaff(!mfaStaff)}
                    className="w-9 h-5 bg-white/10 checked:bg-blue-500 rounded-full appearance-none cursor-pointer relative checked:before:translate-x-4 before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform" />
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* TAB 3: GLOBAL CONFIGURATIONS */}
        {activeTab === 'global' && (
          <div className="max-w-3xl space-y-6">
            <GlassCard className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Sliders size={18} className="text-amber-400" /> Platform Deployment Mode
              </h3>
              
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start">
                <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-medium text-amber-300">Global System Maintenance Mode</h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Enabling this routing parameter will isolate all services, routing endpoints, and database write transactions to a fallback splash screen for clients, except authorized staff IDs.
                  </p>
                  <div className="mt-3">
                    <input type="checkbox" checked={maintenanceMode} onChange={() => setMaintenanceMode(!maintenanceMode)}
                      className="w-9 h-5 bg-white/10 checked:bg-amber-500 rounded-full appearance-none cursor-pointer relative checked:before:translate-x-4 before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button variant="secondary" className="border-white/10 text-gray-300 text-xs">
                  <RefreshCw size={12} /> Clear Architecture Cache
                </Button>
              </div>
            </GlassCard>
          </div>
        )}
      </motion.div>
    </div>
  );
}