// frontend/src/components/admin/globalConfigurations.jsx
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  DollarSign, TrendingUp, Mail, AlertTriangle, RefreshCw,
  CheckCircle, XCircle
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { fetchGlobalConfig, saveGlobalConfig, sendTestEmail } from '../../services/globalConfigService';

const GlobalConfigurations = forwardRef((props, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testEmailLogs, setTestEmailLogs] = useState([]);

  const [globalConfig, setGlobalConfig] = useState({
    creditPrice: 50,
    signupBonus: 10,
    platformCommission: 20,
    minPayoutThreshold: 5000,
    senderEmail: 'asgirind186@gmail.com',
    senderName: 'Langoora',
    showAnnouncement: false,
    announcementText: '',
    announcementColor: 'amber'
  });

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getGlobalConfig: () => globalConfig,
    setGlobalConfig: (config) => setGlobalConfig(config),
    getConfig: () => globalConfig,
    saveGlobalConfig: async () => {
      try {
        setIsSaving(true);
        const response = await saveGlobalConfig(globalConfig);
        return { success: true, message: 'Global configurations saved successfully', data: response };
      } catch (error) {
        return { success: false, message: error.message };
      } finally {
        setIsSaving(false);
      }
    }
  }));

  useEffect(() => {
    loadGlobalConfigData();
  }, []);

  const loadGlobalConfigData = async () => {
    try {
      setIsLoading(true);
      const config = await fetchGlobalConfig();
      if (config) {
        setGlobalConfig(config);
      }
    } catch (error) {
      console.error("Error fetching global configurations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateGlobalConfig = (field, value) => {
    setGlobalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTestEmail = async () => {
    try {
      const result = await sendTestEmail(globalConfig.senderEmail, globalConfig.senderName);

      setTestEmailLogs(prev => [{
        email: globalConfig.senderEmail,
        name: globalConfig.senderName,
        status: 'sent',
        timestamp: new Date().toLocaleString()
      }, ...prev].slice(0, 5));

      alert('✅ Test email sent successfully! Check your inbox.');
    } catch (error) {
      setTestEmailLogs(prev => [{
        email: globalConfig.senderEmail,
        name: globalConfig.senderName,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toLocaleString()
      }, ...prev].slice(0, 5));

      alert('❌ Failed to send test email: ' + error.message);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 mx-auto">

      {/* 1. Currency & Credit Configuration */}
      <GlassCard className="p-6 space-y-6 border-white/10">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <DollarSign className="text-emerald-400" size={22} />
          <div>
            <h3 className="text-lg font-bold text-white">Currency & Credit Framework</h3>
            <p className="text-xs text-gray-400">Core financial parameters for the Langoora ecosystem</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-gray-400 font-mono">
            <RefreshCw className="animate-spin mr-2" size={14} /> Loading configurations...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
              <label className="text-xs text-gray-400 font-medium block">Base Credit Price (LKR)</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">LKR</span>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={globalConfig.creditPrice || ''}
                  onChange={(e) => updateGlobalConfig('creditPrice', Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <p className="text-[10px] text-gray-500">1 Credit = LKR {globalConfig.creditPrice || 'N/A'}</p>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
              <label className="text-xs text-gray-400 font-medium block">Signup Bonus Credits</label>
              <input
                type="number"
                min="0"
                max="100"
                value={globalConfig.signupBonus || ''}
                onChange={(e) => updateGlobalConfig('signupBonus', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
              <p className="text-[10px] text-gray-500">New students get {globalConfig.signupBonus || 0} free credits</p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* 2. Platform Fee & Revenue Share */}
      <GlassCard className="p-6 space-y-6 border-white/10">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <TrendingUp className="text-cyan-400" size={22} />
          <div>
            <h3 className="text-lg font-bold text-white">Revenue & Commission Structure</h3>
            <p className="text-xs text-gray-400">Platform commission and tutor payout configurations</p>
          </div>
        </div>

        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
              <label className="text-xs text-gray-400 font-medium block">Platform Commission (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={globalConfig.platformCommission || ''}
                  onChange={(e) => updateGlobalConfig('platformCommission', Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
                <span className="text-gray-500 text-sm">%</span>
              </div>
              <p className="text-[10px] text-gray-500">
                Platform: {globalConfig.platformCommission || 0}% |
                Tutor: {100 - (globalConfig.platformCommission || 20)}%
              </p>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
              <label className="text-xs text-gray-400 font-medium block">Min Tutor Payout (LKR)</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">LKR</span>
                <input
                  type="number"
                  min="100"
                  max="100000"
                  step="100"
                  value={globalConfig.minPayoutThreshold || ''}
                  onChange={(e) => updateGlobalConfig('minPayoutThreshold', Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <p className="text-[10px] text-gray-500">
                Minimum earnings for tutor payout: LKR {globalConfig.minPayoutThreshold || 0}
              </p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* 3. Email System Configuration */}
      <GlassCard className="p-6 space-y-6 border-white/10">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <Mail className="text-purple-400" size={22} />
          <div>
            <h3 className="text-lg font-bold text-white">Email System Configuration</h3>
            <p className="text-xs text-gray-400">Configure email sender details and test email delivery</p>
          </div>
        </div>

        {!isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                <label className="text-xs text-gray-400 font-medium block">Sender Email Address</label>
                <input
                  type="email"
                  value={globalConfig.senderEmail || ''}
                  onChange={(e) => updateGlobalConfig('senderEmail', e.target.value)}
                  placeholder="e.g., noreply@langoora.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
                <p className="text-[10px] text-gray-500">Email address used as the "From" address for all platform emails</p>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                <label className="text-xs text-gray-400 font-medium block">Sender Display Name</label>
                <input
                  type="text"
                  value={globalConfig.senderName || 'Langoora'}
                  onChange={(e) => updateGlobalConfig('senderName', e.target.value)}
                  placeholder="e.g., Langoora, My Language School, etc."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
                <p className="text-[10px] text-gray-500">Display name that appears in the "From" field</p>
                <p className="text-[10px] text-blue-400">
                  Current: <span className="font-medium">{globalConfig.senderName || 'Langoora'}</span>
                </p>
              </div>
            </div>

            {/* Test Email Section with History */}
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-blue-300 font-medium">Test Email Configuration</p>
                    <p className="text-[10px] text-blue-400/70">Send a test email to verify SMTP settings are working correctly</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={handleTestEmail}
                      >
                        <Mail size={12} /> Send Test Email
                      </Button>
                      <span className="text-[10px] text-gray-500">
                        To: {globalConfig.senderEmail || 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge color="blue">SMTP Ready</Badge>
              </div>

              {/* Test Email History */}
              {testEmailLogs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-blue-500/10">
                  <p className="text-[10px] font-medium text-gray-400 mb-2">Recent Test History</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {testEmailLogs.map((log, index) => (
                      <div key={index} className="flex items-center justify-between text-[10px] p-2 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2">
                          {log.status === 'sent' ? (
                            <CheckCircle size={12} className="text-emerald-400" />
                          ) : (
                            <XCircle size={12} className="text-red-400" />
                          )}
                          <span className="text-gray-300">{log.email}</span>
                          <span className="text-gray-500">({log.name || 'Langoora'})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={log.status === 'sent' ? 'green' : 'red'} className="text-[8px]">
                            {log.status}
                          </Badge>
                          <span className="text-gray-500">{log.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Email Configuration Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px]">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center">
                <span className="text-gray-500">SMTP Host</span>
                <p className="text-white font-mono">{import.meta.env.VITE_SMTP_HOST || 'smtp.gmail.com'}</p>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center">
                <span className="text-gray-500">SMTP Port</span>
                <p className="text-white font-mono">{import.meta.env.VITE_SMTP_PORT || '587'}</p>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center">
                <span className="text-gray-500">Status</span>
                <p className="text-emerald-400 font-medium">● Connected</p>
              </div>
            </div>
          </>
        )}
      </GlassCard>

      {/* 4. Public Notice / Announcement Banner */}
      <GlassCard className="p-6 space-y-6 border-white/10">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <AlertTriangle className="text-amber-400" size={22} />
          <div>
            <h3 className="text-lg font-bold text-white">Public Notice / Announcement Banner</h3>
            <p className="text-xs text-gray-400">Display global announcements on the homepage</p>
          </div>
        </div>

        {!isLoading && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalConfig.showAnnouncement || false}
                  onChange={(e) => updateGlobalConfig('showAnnouncement', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 peer-checked:after:bg-white"></div>
              </label>
              <span className="text-sm text-white">Display Announcement Banner</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium block">Announcement Message</label>
              <textarea
                rows={2}
                value={globalConfig.announcementText || ''}
                onChange={(e) => updateGlobalConfig('announcementText', e.target.value)}
                placeholder="e.g., Next Sunday system update from 2.00 AM to 4.00 AM"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-medium block">Banner Color</label>
                <select
                  value={globalConfig.announcementColor || 'amber'}
                  onChange={(e) => updateGlobalConfig('announcementColor', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                >
                  <option value="amber">Amber (Warning)</option>
                  <option value="blue">Blue (Info)</option>
                  <option value="red">Red (Critical)</option>
                  <option value="green">Green (Success)</option>
                  <option value="purple">Purple (Event)</option>
                </select>
              </div>
              <div className="flex items-end">
                <div className={`p-3 rounded-xl w-full text-center text-xs font-medium border border-${globalConfig.announcementColor || 'amber'}-500/20 bg-${globalConfig.announcementColor || 'amber'}-500/10 text-${globalConfig.announcementColor || 'amber'}-400`}>
                  Preview: {globalConfig.announcementText || 'Announcement will appear here'}
                </div>
              </div>
            </div>
          </div>
        )}
      </GlassCard>

    </div>
  );
});

GlobalConfigurations.displayName = 'GlobalConfigurations';

export default GlobalConfigurations;