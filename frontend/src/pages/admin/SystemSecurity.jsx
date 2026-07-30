// frontend/src/pages/admin/SystemSettings.jsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, Shield, Layout, Sliders, Activity, CheckCircle, XCircle, X, AlertCircle
} from 'lucide-react';
import Button from '../../components/ui/Button';
import HomepageCMS from '../../components/admin/homepageCMS';
import GovernanceSecurity from '../../components/admin/governanceSecurity';
import GlobalConfigurations from '../../components/admin/globalConfigurations';
import EmailAnalytics from '../../components/admin/emailAnalytics';
import { saveHeroBanners } from '../../services/cmsService';
import studentApi from '../../services/examExecutionService';
import { saveGlobalConfig } from '../../services/globalConfigService';
import Portal from '../../components/ui/Portal';
import AdminNotifications from '../../components/admin/AdminNotifications';

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('cms');
  const [isSaving, setIsSaving] = useState(false);
  
  // ✅ Toast state - Same as UserManagementPage
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Refs to access child component methods
  const cmsRef = useRef();
  const securityRef = useRef();
  const globalRef = useRef();

  const tabs = [
    { id: 'cms', label: 'Homepage CMS', icon: Layout, component: HomepageCMS, ref: cmsRef },
    { id: 'security', label: 'Governance & Security', icon: Shield, component: GovernanceSecurity, ref: securityRef },
    { id: 'global', label: 'Global Configurations', icon: Sliders, component: GlobalConfigurations, ref: globalRef },
    { id: 'email-analytics', label: 'Email Analytics', icon: Activity, component: EmailAnalytics },
  ];

  // ✅ Toast notification function - Same as UserManagementPage
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setToast({ show: false, message: '', type: 'success' });
    
    try {
      let success = true;
      let message = '';
      
      // Save based on current active tab
      switch (activeTab) {
        case 'cms':
          // Get banners from the child component
          const banners = cmsRef.current?.getBanners();
          if (banners && banners.length > 0) {
            await saveHeroBanners(banners);
            message = 'Hero banners saved successfully!';
          } else {
            throw new Error('No banners to save');
          }
          break;
          
        case 'security':
          // Get security config from child component
          const securityConfig = securityRef.current?.getSecurityConfig();
          if (securityConfig) {
            const response = await studentApi.post('/system-settings/security', securityConfig);
            if (response.data.success) {
              message = 'Security policies saved successfully!';
            } else {
              throw new Error(response.data.message || 'Failed to save security settings');
            }
          } else {
            throw new Error('No security configuration to save');
          }
          break;
          
        case 'global':
          // Get global config from child component
          const globalConfig = globalRef.current?.getGlobalConfig();
          if (globalConfig) {
            const response = await saveGlobalConfig(globalConfig);
            if (response && response.success === true) {
              message = response.message || 'Global configurations saved successfully!';
            } else {
              throw new Error(response?.message || 'Failed to save global settings');
            }
          } else {
            throw new Error('No global configuration to save');
          }
          break;
          
        default:
          console.warn('No save handler for tab:', activeTab);
          success = false;
          message = 'No save handler for this tab';
      }
      
      if (success) {
        showNotification(message, 'success');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showNotification(error.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Get the component for the active tab
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;
  const activeRef = tabs.find(tab => tab.id === activeTab)?.ref;

  return (
    <div className="space-y-8 text-left relative">
      {/* Toast Notification */}
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
                  : <AlertCircle size={18} className="text-rose-400" />
                }
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider opacity-60">System Settings</p>
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

      {/* Header with Bell */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">System Settings</h1>
            <p className="text-gray-400">Manage platform assets and overlay configurations</p>
          </div>
          <div className="flex items-center gap-3">
            {/* ✅ Notification Bell - Same level as Save button */}
            <AdminNotifications />
            <Button 
              variant="primary" 
              onClick={handleSave} 
              disabled={isSaving}
              className="min-w-[160px]"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'border-blue-500 text-blue-400 bg-white/3' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {ActiveComponent && <ActiveComponent ref={activeRef} />}
      </motion.div>
    </div>
  );
}