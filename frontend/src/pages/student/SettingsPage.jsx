import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Lock, Globe, Moon, Eye, EyeOff, Save } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({ email: true, push: true, streak: true, results: true });
  const [language, setLanguage] = useState('en');
  const [showPass, setShowPass] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  return (
    <div className="space-y-8 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-gray-400">Manage your account preferences</p>
      </motion.div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><Bell size={18} className="text-blue-400" /> Notifications</h3>
        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email notifications', desc: 'Receive exam reminders and updates via email' },
            { key: 'push', label: 'Push notifications', desc: 'Get real-time alerts on your device' },
            { key: 'streak', label: 'Streak reminders', desc: 'Daily reminders to maintain your study streak' },
            { key: 'results', label: 'Results & feedback', desc: 'Notifications when exam results are ready' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-white/3 rounded-xl">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => setNotifications(p => ({ ...p, [item.key]: !p[item.key] }))}
                className={`w-12 h-6 rounded-full transition-all relative ${notifications[item.key] ? 'bg-blue-500' : 'bg-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications[item.key] ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><Globe size={18} className="text-emerald-400" /> Language & Region</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Interface Language</label>
          <select value={language} onChange={e => setLanguage(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none w-64">
            <option value="en" className="bg-[#0f1629]">English</option>
            <option value="si" className="bg-[#0f1629]">සිංහල (Sinhala)</option>
            <option value="ta" className="bg-[#0f1629]">தமிழ் (Tamil)</option>
          </select>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><Lock size={18} className="text-amber-400" /> Change Password</h3>
        <div className="space-y-4 max-w-sm">
          {[
            { key: 'current', label: 'Current Password' },
            { key: 'new', label: 'New Password' },
            { key: 'confirm', label: 'Confirm New Password' },
          ].map(f => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">{f.label}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passwords[f.key]}
                  onChange={e => setPasswords(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/60"
                />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          <Button variant="primary" size="md"><Save size={15} /> Update Password</Button>
        </div>
      </GlassCard>
    </div>
  );
}
