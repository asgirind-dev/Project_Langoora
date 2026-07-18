import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, Shield, Layout, Globe, Sliders, RefreshCw, AlertTriangle, 
  Plus, Trash2, Image, Upload, Type, Eye, ToggleLeft, Languages, 
  Edit3, Hourglass, Power, DollarSign, TrendingUp, Mail 
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { fetchHeroBanners, saveHeroBanners } from '../../services/cmsService';
import { fetchGlobalConfig, saveGlobalConfig, sendTestEmail } from '../../services/globalConfigService';
import imageCompression from 'browser-image-compression'; 
import studentApi from '../../services/examExecutionService'; 

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('cms');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false); 
  const [isReplacing, setIsReplacing] = useState(false); 

  const [heroBanners, setHeroBanners] = useState([]);
  const [base64Image, setBase64Image] = useState('');
  const [fileName, setFileName] = useState('');
  const [replaceFileName, setReplaceFileName] = useState(''); 

  // 🎯 UPDATED: Fully Populated Security Object Model
  const [securityConfig, setSecurityConfig] = useState({ 
    enableAntiCheat: true, 
    maxViolationWarnings: 3,
    maintenanceMode: false,
    sessionTimeouts: { admin: 15, tutor: 20, student: 45, finance: 10, validator: 15 }
  });
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);

  // 🌐 Global Config State - Sender Name "Langoora" විතරයි!
  const [globalConfig, setGlobalConfig] = useState({
    creditPrice: 50,
    signupBonus: 10,
    platformCommission: 20,
    minPayoutThreshold: 5000,
    senderEmail: 'asgirind186@gmail.com',
    senderName: 'Langoora',              // ← "Langoora" විතරයි!
    showAnnouncement: false,
    announcementText: '',
    announcementColor: 'amber'
  });
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const [selectedBannerId, setSelectedBannerId] = useState(null);
  const badgeOptions = ['', '🔥 New', '🚀 Target', '💎 Premium', '⚡ Hot', '📢 Notice'];

  const tabs = [
    { id: 'cms', label: 'Homepage CMS', icon: Layout },
    { id: 'security', label: 'Governance & Security', icon: Shield },
    { id: 'global', label: 'Global Configurations', icon: Sliders },
  ];

  useEffect(() => {
    const loadConfiguredBanners = async () => {
      if (activeTab === 'cms') {
        try {
          setIsLoading(true);
          const activeCollection = await fetchHeroBanners();
          if (activeCollection && activeCollection.length > 0) {
            setHeroBanners(activeCollection);
            setSelectedBannerId(activeCollection[0].id);
          }
        } catch (error) {
          console.error(error);
        }
        setIsLoading(false);
      }
    };

    const loadSecuritySpecs = async () => {
      if (activeTab === 'security') {
        try {
          setIsSecurityLoading(true);
          const res = await studentApi.get('/system-settings/security');
          if (res.data.success) {
            setSecurityConfig(res.data.data);
          }
        } catch (error) {
          console.error("Error fetching secure specifications:", error);
        } finally {
          setIsSecurityLoading(false);
        }
      }
    };

    // 🌐 Load Global Config
    const loadGlobalConfigData = async () => {
      if (activeTab === 'global') {
        try {
          setIsGlobalLoading(true);
          const config = await fetchGlobalConfig();
          if (config) {
            setGlobalConfig(config);
          }
        } catch (error) {
          console.error("Error fetching global configurations:", error);
        } finally {
          setIsGlobalLoading(false);
        }
      }
    };

    loadConfiguredBanners();
    loadSecuritySpecs();
    loadGlobalConfigData();
  }, [activeTab]);

  const handleFileConversion = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsCompressing(true);
    setFileName(`Compressing: ${file.name}...`);
    const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1920, useWebWorker: true };
    try {
      const compressedBlob = await imageCompression(file, options);
      setFileName(`Compressed (${(compressedBlob.size / 1024).toFixed(1)} KB)`);
      const reader = new FileReader();
      reader.readAsDataURL(compressedBlob);
      reader.onload = () => setBase64Image(reader.result);
    } catch (error) {
      console.error(error);
      setFileName('');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleReplaceImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedBannerId) return;
    setIsReplacing(true);
    setReplaceFileName(`Processing: ${file.name}...`);
    const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1920, useWebWorker: true };
    try {
      const compressedBlob = await imageCompression(file, options);
      setReplaceFileName(`Updated (${(compressedBlob.size / 1024).toFixed(1)} KB)`);
      const reader = new FileReader();
      reader.readAsDataURL(compressedBlob);
      reader.onload = () => {
        setHeroBanners(prev => prev.map(b => b.id === selectedBannerId ? { ...b, url: reader.result } : b));
      };
    } catch (error) {
      console.error(error);
      alert('An error occurred while replacing the banner image layer. Please try again.');
      setReplaceFileName('');
    } finally {
      setIsReplacing(false);
    }
  };

  const handleQueueBanner = () => {
    if (!base64Image) return alert('Please select an image file before staging the asset node.');
    const newId = Date.now();
    const newAssetNode = {
      id: newId,
      url: base64Image,
      alt: 'Langoora CBT Banner',
      title: 'Pass Your Exams on the First Attempt!', 
      subtitle: "Sri Lanka's premier specialized simulator context...",
      badge: '🔥 New',
      showRibbonContainer: true,
      ribbonCustomText: 'JLPT & TOPIK / EPS - TOPIK Prep Simulator',
      showRegisterBtn: true,
      showTestRoomBtn: true,
      showTutorBtn: false 
    };
    setHeroBanners([...heroBanners, newAssetNode]);
    setSelectedBannerId(newId);
    setBase64Image('');
    setFileName('');
  };

  const handleRemoveBanner = (id, e) => {
    e.stopPropagation();
    if (heroBanners.length <= 1) return alert('At least one hero banner is required.');
    const filtered = heroBanners.filter(banner => banner.id !== id);
    setHeroBanners(filtered);
    if (selectedBannerId === id) setSelectedBannerId(filtered[0].id);
  };

  const updateActiveFields = (field, val) => {
    setHeroBanners(prev => prev.map(b => b.id === selectedBannerId ? { ...b, [field]: val } : b));
  };

  const updateTimeoutField = (role, val) => {
    setSecurityConfig(p => ({
      ...p,
      sessionTimeouts: { ...p.sessionTimeouts, [role]: Number(val) }
    }));
  };

  // 🌐 Update Global Config Field
  const updateGlobalConfig = (field, value) => {
    setGlobalConfig(prev => ({ ...prev, [field]: value }));
  };

  // 🌐 Handle Test Email
  const handleTestEmail = async () => {
    try {
      await sendTestEmail(globalConfig.senderEmail, globalConfig.senderName);
      alert('✅ Test email sent successfully! Check your inbox.');
    } catch (error) {
      alert('❌ Failed to send test email: ' + error.message);
    }
  };

  const activeBanner = heroBanners.find(b => b.id === selectedBannerId) || null;

  const handleActualSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'cms') {
        await saveHeroBanners(heroBanners);
        alert('All layout configurations and Ribbon Elements updated successfully in Firestore!');
      } else if (activeTab === 'security') {
        await studentApi.post('/system-settings/security', securityConfig);
        alert('Global governance and platform security policies committed successfully!');
      } else if (activeTab === 'global') {
        await saveGlobalConfig(globalConfig);
        alert('✅ Global configurations updated successfully!');
      }
    } catch (error) {
      alert('Error updating configuration: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

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
            onClick={handleActualSave} 
            disabled={isSaving || isLoading || isCompressing || isReplacing || isSecurityLoading || isGlobalLoading}
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

      {/* Content Canvas Layout */}
      <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {activeTab === 'cms' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-5 space-y-6">
              <GlassCard className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-gray-400">1. Staged Core Asset Queue</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2">
                    <RefreshCw className="animate-spin text-purple-400" size={18} />
                    <span className="text-xs text-gray-500">Syncing repository...</span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {heroBanners.map((banner) => {
                      const isSelected = banner.id === selectedBannerId;
                      return (
                        <div
                          key={banner.id}
                          onClick={() => { setSelectedBannerId(banner.id); setReplaceFileName(''); }}
                          className={`relative rounded-xl overflow-hidden border p-2 flex gap-3 cursor-pointer transition-all duration-300 ${
                            isSelected ? 'border-blue-500 bg-blue-500/10 shadow-lg' : 'border-white/5 bg-slate-950/40 hover:border-white/20'
                          }`}
                        >
                          <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0">
                            <img src={banner.url} alt={banner.alt} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                              <p className="text-xs font-bold text-white truncate">{banner.title || 'Pure Graphic Banner'}</p>
                              <p className="text-[10px] text-gray-400 truncate">{banner.alt}</p>
                            </div>
                            {banner.badge && <span className="text-[8px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded w-max font-bold">{banner.badge}</span>}
                          </div>
                          <button type="button" onClick={(e) => handleRemoveBanner(banner.id, e)} className="p-1 text-gray-500 hover:text-red-400 rounded-md self-center">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <label className="flex flex-col items-center justify-center border border-dashed border-white/20 bg-white/5 hover:bg-white/10 rounded-xl p-3 cursor-pointer transition-colors">
                    <Upload size={16} className="text-gray-400 mb-1" />
                    <span className="text-[11px] text-gray-400 text-center truncate max-w-xs">{fileName ? fileName : 'Ingest local widescreen picture'}</span>
                    <input type="file" accept="image/*" onChange={handleFileConversion} className="hidden" disabled={isCompressing} />
                  </label>
                  {base64Image && <Button type="button" variant="secondary" size="sm" fullWidth onClick={handleQueueBanner}><Plus size={12} /> Staging Asset Node</Button>}
                </div>
              </GlassCard>
            </div>

            <div className="xl:col-span-7 space-y-6">
              {activeBanner ? (
                <>
                  <GlassCard className="p-4 bg-slate-950 border-white/10 overflow-hidden">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-3"><Eye size={12}/> Live Hero Overlay Canvas Preview</div>
                    <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden shadow-inner flex items-center bg-[#060d1f]">
                      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-10" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
                      <img src={activeBanner.url} alt="Simulated live layer" className="w-full h-full object-cover" />
                      <div className="absolute z-20 left-6 right-6 text-left space-y-1.5 pointer-events-none">
                        {activeBanner.showRibbonContainer !== false && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[8px] text-gray-300 backdrop-blur-sm max-w-sm truncate">
                            <Languages size={9} className="text-red-400" />
                            <span>{activeBanner.ribbonCustomText || 'JLPT & TOPIK Prep Simulator'}</span>
                            {activeBanner.badge && <span className="ml-1 px-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded text-[7px] font-black uppercase">{activeBanner.badge}</span>}
                          </div>
                        )}
                        <h2 className="text-sm md:text-xl lg:text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-md">{activeBanner.title}</h2>
                        <p className="text-[9px] md:text-xs text-gray-200 line-clamp-2 max-w-lg font-light opacity-90">{activeBanner.subtitle}</p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {activeBanner.showRegisterBtn !== false && <span className="text-[7px] px-1.5 py-0.5 bg-blue-500 text-white rounded font-medium">Free Account</span>}
                          {activeBanner.showTestRoomBtn !== false && <span className="text-[7px] px-1.5 py-0.5 bg-white/20 text-white rounded font-medium">Live Test Room</span>}
                          {activeBanner.showTutorBtn && <span className="text-[7px] px-1.5 py-0.5 bg-emerald-500 text-white rounded font-medium">Become Tutor</span>}
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider text-gray-400 flex items-center gap-2"><Type size={14} className="text-blue-400" /> 2. Configuration Parameters</h3>
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-12 rounded bg-slate-900 overflow-hidden border border-white/10"><img src={activeBanner.url} className="w-full h-full object-cover" alt="Selected layout thumbnail" /></div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-white">Banner Image Layer</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[200px] sm:max-w-xs">{replaceFileName ? replaceFileName : 'Swap graphic keeping textual layouts'}</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-medium cursor-pointer transition-all shadow-md shadow-blue-500/10">
                        <Edit3 size={13} /><span>Change Photo</span>
                        <input type="file" accept="image/*" onChange={handleReplaceImage} className="hidden" disabled={isReplacing} />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] text-gray-400 font-medium">Top Ribbon Container Custom Text</label>
                        <input type="text" value={activeBanner.ribbonCustomText ?? ''} onChange={(e) => updateActiveFields('ribbonCustomText', e.target.value)} disabled={activeBanner.showRibbonContainer === false} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50 disabled:opacity-35" />
                      </div>
                      <label className="flex flex-col justify-center gap-1 cursor-pointer">
                        <span className="text-[11px] text-gray-400">Ribbon Status</span>
                        <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/5 h-[34px]">
                          <input type="checkbox" checked={activeBanner.showRibbonContainer !== false} onChange={(e) => updateActiveFields('showRibbonContainer', e.target.checked)} className="rounded border-white/10 text-blue-500 focus:ring-0 bg-transparent" />
                          <span className="text-xs text-gray-300">Show Ribbon</span>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] text-gray-400">Main Header Typography</label>
                        <input type="text" value={activeBanner.title} onChange={(e) => updateActiveFields('title', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-gray-400">Ribbon Accent Tag</label>
                        <select value={activeBanner.badge || ''} onChange={(e) => updateActiveFields('badge', e.target.value)} disabled={activeBanner.showRibbonContainer === false} className="w-full bg-[#0a1021] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500/50 h-[34px] disabled:opacity-35">
                          {badgeOptions.map(opt => <option key={opt} value={opt}>{opt || 'None (Disable Tag)'}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-400">Context Subdescription Matrix</label>
                      <textarea rows={2} value={activeBanner.subtitle} onChange={(e) => updateActiveFields('subtitle', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none focus:outline-none focus:border-blue-500/50" />
                    </div>

                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Toggle Overlay Action Buttons</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                          <input type="checkbox" checked={activeBanner.showRegisterBtn !== false} onChange={(e) => updateActiveFields('showRegisterBtn', e.target.checked)} className="rounded border-white/10 text-blue-500 focus:ring-0 bg-transparent"/>
                          <span className="text-xs text-gray-300">Free Account Btn</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                          <input type="checkbox" checked={activeBanner.showTestRoomBtn !== false} onChange={(e) => updateActiveFields('showTestRoomBtn', e.target.checked)} className="rounded border-white/10 text-blue-500 focus:ring-0 bg-transparent"/>
                          <span className="text-xs text-gray-300">Test Room Btn</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                          <input type="checkbox" checked={activeBanner.showTutorBtn || false} onChange={(e) => updateActiveFields('showTutorBtn', e.target.checked)} className="rounded border-white/10 text-blue-500 focus:ring-0 bg-transparent"/>
                          <span className="text-xs text-gray-300">Become Tutor Btn</span>
                        </label>
                      </div>
                    </div>
                  </GlassCard>
                </>
              ) : (
                <div className="h-64 border border-white/5 bg-slate-950/20 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-gray-500 text-xs">
                  <Image size={24} className="mb-2 text-gray-600" />Staging array empty.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🛡️ GOVERNANCE & SECURITY TAB PANEL */}
        {activeTab === 'security' && (
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

              {isSecurityLoading ? (
                <div className="flex items-center justify-center py-6 text-xs text-gray-400 font-mono"><RefreshCw className="animate-spin mr-2" size={14}/> Syncing secure configurations...</div>
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
                    <input type="number" min="1" max="10" value={securityConfig.maxViolationWarnings} onChange={(e) => setSecurityConfig(p => ({ ...p, maxViolationWarnings: Number(e.target.value) }))} disabled={!securityConfig.enableAntiCheat} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 text-center font-mono disabled:opacity-35" />
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

              {!isSecurityLoading && securityConfig.sessionTimeouts && (
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

              {!isSecurityLoading && (
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
        )}

        {/* 🌐 GLOBAL CONFIGURATIONS TAB PANEL */}
        {activeTab === 'global' && (
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

              {isGlobalLoading ? (
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

              {!isGlobalLoading && (
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

            {/* 3. Email Templates & Notifications */}
            <GlassCard className="p-6 space-y-6 border-white/10">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Mail className="text-purple-400" size={22} />
                <div>
                  <h3 className="text-lg font-bold text-white">Email System Configuration</h3>
                  <p className="text-xs text-gray-400">Automated email sender details and templates</p>
                </div>
              </div>

              {!isGlobalLoading && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                      <label className="text-xs text-gray-400 font-medium block">Sender Email Address</label>
                      <input 
                        type="email" 
                        value={globalConfig.senderEmail || ''}
                        onChange={(e) => updateGlobalConfig('senderEmail', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" 
                      />
                      <p className="text-[10px] text-gray-500">Email address used to send all platform emails</p>
                    </div>

                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                      <label className="text-xs text-gray-400 font-medium block">Sender Display Name</label>
                      <input 
                        type="text" 
                        value="Langoora"
                        disabled
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm opacity-60 cursor-not-allowed" 
                      />
                      <p className="text-[10px] text-amber-400">⚠️ Fixed: Langoora (Cannot be changed)</p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} className="text-amber-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-amber-300 font-medium">Test Email Configuration</p>
                        <p className="text-[10px] text-amber-400/70">Send a test email to verify SMTP settings are working correctly</p>
                        <Button 
                          variant="warning" 
                          size="sm" 
                          className="mt-2"
                          onClick={handleTestEmail}
                        >
                          <Mail size={12} /> Send Test Email
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </GlassCard>

            {/* 4. System Maintenance Banner (Homepage Notice) */}
            <GlassCard className="p-6 space-y-6 border-white/10">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <AlertTriangle className="text-amber-400" size={22} />
                <div>
                  <h3 className="text-lg font-bold text-white">Public Notice / Announcement Banner</h3>
                  <p className="text-xs text-gray-400">Display global announcements on the homepage</p>
                </div>
              </div>

              {!isGlobalLoading && (
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
        )}
      </motion.div>
    </div>
  );
}