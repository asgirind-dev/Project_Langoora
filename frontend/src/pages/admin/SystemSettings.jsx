import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Shield, Layout, Globe, Sliders, RefreshCw, AlertTriangle, Plus, Trash2, Image, Upload, Type, Eye, ToggleLeft, Languages } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { fetchHeroBanners, saveHeroBanners } from '../../services/cmsService';
import imageCompression from 'browser-image-compression'; 

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('cms');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false); 

  const [heroBanners, setHeroBanners] = useState([]);
  const [base64Image, setBase64Image] = useState('');
  const [fileName, setFileName] = useState('');

  // Active Selected Banner for Context Management & Editing
  const [selectedBannerId, setSelectedBannerId] = useState(null);

  // Default Badges Dropdown Array
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
    loadConfiguredBanners();
  }, [activeTab]);

  const handleFileConversion = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsCompressing(true);
    setFileName(`Compressing: ${file.name}...`);

    const options = {
      maxSizeMB: 0.2,          
      maxWidthOrHeight: 1920,   
      useWebWorker: true
    };

    try {
      const compressedBlob = await imageCompression(file, options);
      setFileName(`Compressed (${(compressedBlob.size / 1024).toFixed(1)} KB)`);

      const reader = new FileReader();
      reader.readAsDataURL(compressedBlob);
      reader.onload = () => {
        setBase64Image(reader.result); 
      };
    } catch (error) {
      console.error(error);
      setFileName('');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleQueueBanner = () => {
    if (!base64Image) return alert('මචන්, මුලින්ම පින්තූරයක් තෝරලා ඉන්න!');

    const newId = Date.now();
    const newAssetNode = {
      id: newId,
      url: base64Image,
      alt: 'Langoora CBT Banner',
      title: 'Pass Your Exams on the First Attempt!', 
      subtitle: "Sri Lanka's premier specialized simulator context...",
      badge: '🔥 New',
      // 🎯 Dynamic Ribbon Tag Setup
      showRibbonContainer: true,
      ribbonCustomText: 'JLPT & TOPIK / EPS - TOPIK Prep Simulator',
      // Dynamic Buttons Default States
      showRegisterBtn: true,
      showTestRoomBtn: true,
      showTutorBtn: false 
    };

    const updated = [...heroBanners, newAssetNode];
    setHeroBanners(updated);
    setSelectedBannerId(newId);
    
    setBase64Image('');
    setFileName('');
  };

  const handleRemoveBanner = (id, e) => {
    e.stopPropagation();
    if (heroBanners.length <= 1) return alert('At least one hero banner is required.');
    const filtered = heroBanners.filter(banner => banner.id !== id);
    setHeroBanners(filtered);
    if (selectedBannerId === id) {
      setSelectedBannerId(filtered[0].id);
    }
  };

  const updateActiveFields = (field, val) => {
    setHeroBanners(prev => prev.map(b => b.id === selectedBannerId ? { ...b, [field]: val } : b));
  };

  const activeBanner = heroBanners.find(b => b.id === selectedBannerId) || null;

  const handleActualSave = async () => {
    setIsSaving(true);
    try {
      await saveHeroBanners(heroBanners);
      alert('All layout configurations and Ribbon Elements updated successfully in Firestore!');
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
          <Button variant="primary" onClick={handleActualSave} disabled={isSaving || isLoading || isCompressing}>
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

      {/* CMS Content Dynamic Grid */}
      <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {activeTab === 'cms' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* Left Queue Box */}
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
                          onClick={() => setSelectedBannerId(banner.id)}
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
                          <button
                            type="button"
                            onClick={(e) => handleRemoveBanner(banner.id, e)}
                            className="p-1 text-gray-500 hover:text-red-400 rounded-md self-center"
                          >
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
                  
                  {base64Image && (
                    <Button type="button" variant="secondary" size="sm" fullWidth onClick={handleQueueBanner}>
                      <Plus size={12} /> Staging Asset Node
                    </Button>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Right Editor & Canvas Preview Box */}
            <div className="xl:col-span-7 space-y-6">
              {activeBanner ? (
                <>
                  {/* Live Canvas Preview */}
                  <GlassCard className="p-4 bg-slate-950 border-white/10 overflow-hidden">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-3"><Eye size={12}/> Live Hero Overlay Canvas Preview</div>
                    
                    <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden shadow-inner flex items-center bg-[#060d1f]">
                      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-10" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
                      <img src={activeBanner.url} alt="Simulated live layer" className="w-full h-full object-cover" />

                      {/* Floating overlay container */}
                      <div className="absolute z-20 left-6 right-6 text-left space-y-1.5 pointer-events-none">
                        
                        {/* 🎯 Ribbon Container Live Preview */}
                        {activeBanner.showRibbonContainer !== false && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[8px] text-gray-300 backdrop-blur-sm max-w-sm truncate">
                            <Languages size={9} className="text-red-400" />
                            <span>{activeBanner.ribbonCustomText || 'JLPT & TOPIK Prep Simulator'}</span>
                            {activeBanner.badge && (
                              <span className="ml-1 px-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded text-[7px] font-black uppercase">
                                {activeBanner.badge}
                              </span>
                            )}
                          </div>
                        )}

                        <h2 className="text-sm md:text-xl lg:text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-md">
                          {activeBanner.title}
                        </h2>
                        <p className="text-[9px] md:text-xs text-gray-200 line-clamp-2 max-w-lg font-light opacity-90">
                          {activeBanner.subtitle}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {activeBanner.showRegisterBtn !== false && <span className="text-[7px] px-1.5 py-0.5 bg-blue-500 text-white rounded font-medium">Free Account</span>}
                          {activeBanner.showTestRoomBtn !== false && <span className="text-[7px] px-1.5 py-0.5 bg-white/20 text-white rounded font-medium">Live Test Room</span>}
                          {activeBanner.showTutorBtn && <span className="text-[7px] px-1.5 py-0.5 bg-emerald-500 text-white rounded font-medium">Become Tutor</span>}
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Parameters controller card */}
                  <GlassCard className="p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <Type size={14} className="text-blue-400" /> 2. Configuration Parameters
                    </h3>

                    {/* 🎯 NEW: Dynamic Ribbon Customizer Field Matrix */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] text-gray-400 font-medium">Top Ribbon Container Custom Text</label>
                        <input
                          type="text"
                          value={activeBanner.ribbonCustomText ?? 'JLPT & TOPIK / EPS - TOPIK Prep Simulator'}
                          onChange={(e) => updateActiveFields('ribbonCustomText', e.target.value)}
                          disabled={activeBanner.showRibbonContainer === false}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50 disabled:opacity-35"
                        />
                      </div>
                      <label className="flex flex-col justify-center gap-1 cursor-pointer">
                        <span className="text-[11px] text-gray-400">Ribbon Status</span>
                        <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/5 h-[34px]">
                          <input 
                            type="checkbox"
                            checked={activeBanner.showRibbonContainer !== false}
                            onChange={(e) => updateActiveFields('showRibbonContainer', e.target.checked)}
                            className="rounded border-white/10 text-blue-500 focus:ring-0 bg-transparent"
                          />
                          <span className="text-xs text-gray-300">Show Ribbon</span>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] text-gray-400">Main Header Typography</label>
                        <input
                          type="text"
                          value={activeBanner.title}
                          onChange={(e) => updateActiveFields('title', e.target.value)}
                          placeholder="Header Main Title..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-gray-400">Ribbon Accent Tag</label>
                        <select
                          value={activeBanner.badge || ''}
                          onChange={(e) => updateActiveFields('badge', e.target.value)}
                          disabled={activeBanner.showRibbonContainer === false}
                          className="w-full bg-[#0a1021] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500/50 h-[34px] disabled:opacity-35"
                        >
                          {badgeOptions.map(opt => (
                            <option key={opt} value={opt}>{opt || 'None (Disable Tag)'}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-400">Context Subdescription Matrix</label>
                      <textarea
                        rows={2}
                        value={activeBanner.subtitle}
                        onChange={(e) => updateActiveFields('subtitle', e.target.value)}
                        placeholder="Context Subheadline description..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    {/* Toggle Buttons Section */}
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
                  <Image size={24} className="mb-2 text-gray-600" />
                  Staging array empty. Ingest a layout node from the left channel to configure metadata.
                </div>
              )}
            </div>

          </div>
        )}
      </motion.div>
    </div>
  );
}