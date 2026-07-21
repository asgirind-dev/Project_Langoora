// frontend/src/pages/admin/SystemSettings.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, Shield, Layout, Sliders, Activity
} from 'lucide-react';
import Button from '../../components/ui/Button';
import HomepageCMS from '../../components/admin/homepageCMS';
import GovernanceSecurity from '../../components/admin/governanceSecurity';
import GlobalConfigurations from '../../components/admin/globalConfigurations';
import EmailAnalytics from '../../components/admin/emailAnalytics';

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('cms');
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: 'cms', label: 'Homepage CMS', icon: Layout, component: HomepageCMS },
    { id: 'security', label: 'Governance & Security', icon: Shield, component: GovernanceSecurity },
    { id: 'global', label: 'Global Configurations', icon: Sliders, component: GlobalConfigurations },
    { id: 'email-analytics', label: 'Email Analytics', icon: Activity, component: EmailAnalytics },
  ];

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="space-y-8 text-left">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">System Settings</h1>
            <p className="text-gray-400">Manage platform assets and overlay configurations</p>
          </div>
          <Button 
            variant="primary" 
            onClick={handleSave} 
            disabled={isSaving}
          >
            <Save size={16} /> {isSaving ? 'Syncing...' : 'Save Configuration'}
          </Button>
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
        {ActiveComponent && <ActiveComponent />}
      </motion.div>
    </div>
  );
}