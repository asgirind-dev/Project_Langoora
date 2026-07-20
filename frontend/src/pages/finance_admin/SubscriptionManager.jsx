import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Crown, Sparkles, 
  Zap, CheckCircle,
  BookOpen, Save, X, RefreshCw, 
  Rocket, Star, Layers, Award, Database, History, Coins, Lock, ChevronDown, Loader2, Trash
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import SubscriptionService from '../../services/subscriptionService';

const normalizeFeatures = (features) => {
  if (!features) return [];
  if (Array.isArray(features)) {
    return features
      .map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          return item.name || item.label || item.title || Object.keys(item)[0] || '';
        }
        return String(item);
      })
      .filter(f => f && f.trim() !== '');
  }
  if (typeof features === 'object') {
    return Object.keys(features).filter(key => features[key] === true || features[key]);
  }
  return [];
};

function SubscriptionManager() {
  const [activeTab, setActiveTab] = useState('exams');
  const [plans, setPlans] = useState([]);
  const [allLevels, setAllLevels] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('plan');
  const [editingItem, setEditingItem] = useState(null);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [creditHistory, setCreditHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  
  const [tempCredits, setTempCredits] = useState({});
  const [formData, setFormData] = useState({
    name: '', price: '', credits: '', features: [''], popular: false,
  });

  // ===== STATS =====
  const [stats, setStats] = useState([
    { label: 'Total Plans', value: 0, icon: Crown, color: 'text-purple-400' },
    { label: 'Active Plans', value: 0, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Active Exams', value: 0, icon: BookOpen, color: 'text-blue-400' },
    { label: 'Total Credits Pool', value: 0, icon: Database, color: 'text-amber-400' },
  ]);

  const isCategoryDeleted = (cat) => {
    return cat.status === 'deleted';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const calculateStats = (plansData, levelsData) => {
    const activeLevels = levelsData.filter(lvl => 
      !isCategoryDeleted(lvl) && lvl.hasSubLevels === true && lvl.active !== false
    );
    
    const activeCategories = levelsData.filter(lvl => 
      !isCategoryDeleted(lvl) && lvl.hasSubLevels === false && lvl.active !== false
    );
    
    const activeExams = activeLevels.length + activeCategories.length;
    
    const totalCredits = levelsData.reduce((acc, lvl) => {
      if (!isCategoryDeleted(lvl)) {
        return acc + (parseInt(lvl.credits) || 0);
      }
      return acc;
    }, 0);
    
    return [
      { label: 'Total Plans', value: plansData.length, icon: Crown, color: 'text-purple-400' },
      { label: 'Active Plans', value: plansData.filter(p => p.active).length, icon: CheckCircle, color: 'text-emerald-400' },
      { label: 'Active Exams', value: activeExams, icon: BookOpen, color: 'text-blue-400' },
      { label: 'Total Credits Pool', value: totalCredits, icon: Database, color: 'text-amber-400' },
    ];
  };

  // ===== Fetch Credit History =====
  const fetchCreditHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await SubscriptionService.getCreditHistory();
      if (Array.isArray(data)) {
        setCreditHistory(data);
      }
    } catch (error) {
      console.error("Error fetching credit history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ===== Clear Credit History =====
  const clearCreditHistory = async () => {
    if (!window.confirm('⚠️ Are you sure you want to clear ALL credit history logs? This action cannot be undone!')) return;
    
    setClearingHistory(true);
    try {
      await SubscriptionService.clearCreditHistory();
      setCreditHistory([]);
      alert('✅ Credit history cleared successfully!');
    } catch (error) {
      console.error("Error clearing credit history:", error);
      alert('❌ Failed to clear credit history. Please try again.');
    } finally {
      setClearingHistory(false);
    }
  };

  // ===== Fetch Data =====
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [plansData, levelsData] = await Promise.all([
        SubscriptionService.getAllPlans(),
        SubscriptionService.getAllCategories()
      ]);
      
      const normalizedPlans = plansData.map(plan => ({
        ...plan,
        features: normalizeFeatures(plan.features),
        price: parseInt(plan.price) || 0,
        credits: parseInt(plan.credits) || 0
      }));
      
      setPlans(normalizedPlans);
      setAllLevels(levelsData);
      
      const uniqueCategories = [...new Set(levelsData.map(l => l.categoryId))];
      if (uniqueCategories.length > 0 && !selectedCategory) {
        setSelectedCategory(uniqueCategories[0]);
      }
      
      setStats(calculateStats(normalizedPlans, levelsData));
      
      // Also fetch history initially
      fetchCreditHistory();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (allLevels.length > 0 || plans.length > 0) {
      setStats(calculateStats(plans, allLevels));
    }
  }, [allLevels, plans]);

  const getUniqueCategories = () => {
    const categoriesMap = {};
    allLevels.forEach(item => {
      if (!categoriesMap[item.categoryId]) {
        categoriesMap[item.categoryId] = item.categoryName;
      }
    });
    return Object.entries(categoriesMap).map(([id, name]) => ({ id, name }));
  };

  const filteredLevels = allLevels.filter(lvl => lvl.categoryId === selectedCategory);

  const handleCreditChange = (id, value) => {
    setTempCredits((prev) => ({ ...prev, [id]: value }));
  };

  // ===== FIXED: UPDATE LEVEL WITH INSTANT HISTORY LOG =====
  const handleUpdateLevel = async (categoryId, levelId, currentCredit, levelName) => {
    const creditToUpdate = tempCredits[levelId] !== undefined ? tempCredits[levelId] : currentCredit;
    const parentCategory = allLevels.find(l => l.categoryId === categoryId);
    const parentName = parentCategory ? parentCategory.categoryName : '';
    const fullExamName = parentName ? `${parentName} - ${levelName}` : levelName;

    try {
      setLoadingData(true);
      await SubscriptionService.updateCategoryCredits(categoryId, levelId, { credits: parseInt(creditToUpdate) });
      
      // 1. Instant update to local level state
      const updatedLevels = allLevels.map((lvl) =>
        lvl.id === levelId && lvl.categoryId === categoryId 
          ? { ...lvl, credits: parseInt(creditToUpdate) } 
          : lvl
      );
      setAllLevels(updatedLevels);

      // 2. Instant update to History state
      const newHistoryLog = {
        id: `local_${Date.now()}`,
        examName: fullExamName,
        previousCredits: parseInt(currentCredit) || 0,
        newCredits: parseInt(creditToUpdate),
        updatedAt: new Date().toISOString()
      };
      setCreditHistory(prev => [newHistoryLog, ...prev]);

      // 3. Clear temporary inputs
      setTempCredits((prev) => {
        const updated = { ...prev };
        delete updated[levelId];
        return updated;
      });

      setStats(calculateStats(plans, updatedLevels));
      alert(`✅ Credits for ${levelName} updated successfully!`);
    } catch (error) {
      console.error("Update failed:", error);
      alert('❌ Failed to update level credits. Please try again.');
    } finally {
      setLoadingData(false);
    }
  };

  // ===== FIXED: UPDATE CATEGORY WITH INSTANT HISTORY LOG =====
  const handleUpdateCategory = async (categoryId, currentCredit, categoryName) => {
    const creditToUpdate = tempCredits[categoryId] !== undefined ? tempCredits[categoryId] : currentCredit;
    try {
      setLoadingData(true);
      await SubscriptionService.updateCategoryCreditsDirect(categoryId, { credits: parseInt(creditToUpdate) });
      
      const updatedLevels = allLevels.map((lvl) =>
        lvl.id === categoryId && lvl.categoryId === categoryId 
          ? { ...lvl, credits: parseInt(creditToUpdate) } 
          : lvl
      );
      setAllLevels(updatedLevels);

      const newHistoryLog = {
        id: `local_${Date.now()}`,
        examName: categoryName,
        previousCredits: parseInt(currentCredit) || 0,
        newCredits: parseInt(creditToUpdate),
        updatedAt: new Date().toISOString()
      };
      setCreditHistory(prev => [newHistoryLog, ...prev]);

      setTempCredits((prev) => {
        const updated = { ...prev };
        delete updated[categoryId];
        return updated;
      });

      setStats(calculateStats(plans, updatedLevels));
      alert(`✅ Credits for ${categoryName} updated successfully!`);
    } catch (error) {
      console.error("Update failed:", error);
      alert('❌ Failed to update category credits. Please try again.');
    } finally {
      setLoadingData(false);
    }
  };

  // ===== Plan CRUD =====
  const addPlan = async () => {
    try {
      const payload = {
        ...formData,
        price: parseInt(formData.price),
        credits: parseInt(formData.credits),
        features: formData.features.filter(f => f.trim() !== '')
      };
      const res = await SubscriptionService.createNewPlan(payload);
      const newPlan = { ...res, features: normalizeFeatures(res.features) };
      const newPlans = [...plans, newPlan];
      setPlans(newPlans);
      setStats(calculateStats(newPlans, allLevels));
      resetForm();
    } catch (error) { console.error("Add plan failed:", error); }
  };

  const updatePlan = async () => {
    try {
      const payload = {
        ...formData,
        price: parseInt(formData.price),
        credits: parseInt(formData.credits),
        features: formData.features.filter(f => f.trim() !== '')
      };
      await SubscriptionService.updateExistingPlan(editingItem.id, payload);
      const newPlans = plans.map(p => p.id === editingItem.id ? { ...p, ...payload } : p);
      setPlans(newPlans);
      setStats(calculateStats(newPlans, allLevels));
      resetForm();
    } catch (error) { console.error("Update plan failed:", error); }
  };

  const deletePlan = async (id) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    try {
      await SubscriptionService.deleteExistingPlan(id);
      const newPlans = plans.filter(p => p.id !== id);
      setPlans(newPlans);
      setStats(calculateStats(newPlans, allLevels));
    } catch (error) { console.error("Delete failed:", error); }
  };

  const togglePlanStatus = async (id, currentStatus) => {
    try {
      await SubscriptionService.updateExistingPlan(id, { active: !currentStatus });
      const newPlans = plans.map(p => p.id === id ? { ...p, active: !currentStatus } : p);
      setPlans(newPlans);
      setStats(calculateStats(newPlans, allLevels));
    } catch (error) { console.error("Toggle plan status failed:", error); }
  };

  const resetForm = () => { setFormData({ name: '', price: '', credits: '', features: [''], popular: false }); setEditingItem(null); setShowModal(false); };
  const handleFeatureChange = (index, val) => { const f = [...formData.features]; f[index] = val; setFormData({ ...formData, features: f }); };
  const addFeatureField = () => { setFormData({ ...formData, features: [...formData.features, ''] }); };
  const removeFeatureField = (idx) => { setFormData({ ...formData, features: formData.features.filter((_, i) => i !== idx) }); };

  const handleEditClick = (plan) => {
    setModalType('plan');
    setEditingItem(plan);
    const featureStrings = normalizeFeatures(plan.features);
    setFormData({
      name: plan.name,
      price: plan.price.toString(),
      credits: plan.credits.toString(),
      features: featureStrings.length ? featureStrings : [''],
      popular: plan.popular
    });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100 p-6 md:p-12 font-sans">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/10">
              <Crown size={22} className="text-purple-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Credit Architecture Core
            </h1>
          </div>
          <p className="text-sm text-gray-400 mt-1 ml-14">Configure subscription tiers and assign fixed exam valuation weights</p>
        </div>
        <button onClick={fetchData} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 border border-white/5 transition-colors self-start md:self-center">
          <RefreshCw size={16} className={`text-gray-400 ${loadingData ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loadingData && allLevels.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Loading dynamic configurations...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-8">
            {stats.map((stat, i) => (
              <GlassCard key={i} className="p-4 border-white/10 hover:border-white/20 transition-all">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-white/5 rounded-xl"><stat.icon size={18} className={stat.color} /></div>
                  <span className="text-xs text-gray-400">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold text-white mt-2">{stat.value}</div>
              </GlassCard>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10 pb-4 max-w-6xl mx-auto">
            <button onClick={() => setActiveTab('plans')} className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
              <Layers size={16} className="inline mr-2"/>Subscription Plans
            </button>
            <button onClick={() => setActiveTab('exams')} className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'exams' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
              <Award size={16} className="inline mr-2"/>Exam Level Credit Fixer
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'plans' ? (
              <motion.div key="plans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6 mt-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Subscription Plans</h2>
                    <p className="text-sm text-gray-400">Manage student levels and structure weights</p>
                  </div>
                  <button 
                    onClick={() => { setModalType('plan'); setEditingItem(null); resetForm(); setShowModal(true); }} 
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-sm font-medium flex items-center gap-2 text-white shadow-lg"
                  >
                    <Plus size={16}/>Add Plan
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {plans.map((plan, idx) => {
                    const features = plan.features || [];
                    const isPopular = plan.popular && plan.active;

                    return (
                      <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative pt-3 h-full"
                      >
                        {isPopular && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                            <span className="px-5 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20">
                              Most Popular
                            </span>
                          </div>
                        )}

                        <GlassCard className={`p-8 border-2 text-left transition-all relative rounded-3xl bg-[#0f1424]/90 flex flex-col h-full ${
                          plan.active 
                            ? isPopular 
                              ? 'border-purple-500/30 shadow-2xl shadow-purple-500/5' 
                              : 'border-white/5 hover:border-white/10' 
                            : 'border-red-500/20 opacity-50'
                        }`}>
                          <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-5">
                            <Rocket size={24} className="text-purple-400" />
                          </div>

                          <h2 className="text-2xl font-bold text-white tracking-wide">{plan.name}</h2>

                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-3xl font-extrabold text-white tracking-tight">LKR {plan.price}</span>
                            <span className="text-sm font-medium text-gray-400">/month</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-400 mt-4 mb-6">
                            <Sparkles size={15} className="fill-amber-400/20" />
                            <span>{plan.credits} credits granted</span>
                          </div>

                          <div className="space-y-3.5 my-6 flex-1">
                            {features.map((f, fi) => (
                              <div key={fi} className="flex items-start gap-3 text-sm font-medium text-gray-300">
                                <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/5">
                            <button 
                              onClick={() => togglePlanStatus(plan.id, plan.active)} 
                              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border transition-all ${
                                plan.active 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                              }`}
                            >
                              {plan.active ? 'Active' : 'Inactive'}
                            </button>

                            <button 
                              onClick={() => handleEditClick(plan)} 
                              className="p-3 bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <Edit size={18} />
                            </button>

                            <button 
                              onClick={() => deletePlan(plan.id)} 
                              className="p-3 bg-red-500/10 border border-transparent rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div key="exams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mt-6 mb-6 pb-6 border-b border-white/5">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <Coins className="text-amber-400" size={22} />
                      Exam Level Credit Fixer
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Select a top-level category to distribute custom token weights across individual sub-levels
                    </p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="relative">
                      <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="appearance-none bg-[#0f1424] text-white border border-white/10 px-4 py-2.5 pr-10 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 transition-all cursor-pointer shadow-lg min-w-[180px]"
                      >
                        {getUniqueCategories().map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    <button 
                      onClick={() => {
                        fetchCreditHistory();
                        setShowHistoryModal(true);
                      }}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/10"
                    >
                      <History size={16} /> View History
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLevels.length > 0 ? (
                    filteredLevels.map((item, index) => {
                      const isDeleted = isCategoryDeleted(item);
                      const hasLevels = item.hasSubLevels === true;
                      const displayName = hasLevels ? item.name : item.categoryName;
                      const parentName = hasLevels ? item.categoryName : null;
                      
                      return (
                        <motion.div 
                          key={`${item.categoryId}-${item.id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <GlassCard className={`p-6 relative border-white/10 hover:border-white/20 transition-all group ${
                            isDeleted ? 'border-red-500/20 bg-red-950/5 ring-1 ring-red-500/10' : ''
                          }`}>
                            
                            {isDeleted && (
                              <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] rounded-2xl pointer-events-none z-0" />
                            )}

                            <div className="flex justify-between items-start mb-5 relative z-10">
                              <div>
                                <h3 className={`text-xl font-bold tracking-wide flex items-center gap-2 ${isDeleted ? 'text-gray-400' : 'text-white'}`}>
                                  {displayName.toUpperCase()}
                                  {isDeleted && (
                                    <span className="text-red-400/80 text-xs font-semibold bg-red-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <Lock size={12} /> Locked
                                    </span>
                                  )}
                                </h3>
                                {parentName && (
                                  <span className="text-xs text-purple-400 font-medium block mt-1">
                                    Parent: {parentName}
                                  </span>
                                )}
                                {item.language && (
                                  <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-gray-300 mt-2 inline-block">
                                    {item.language}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-semibold ${
                                  isDeleted
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm shadow-red-900/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {isDeleted ? 'DELETED' : 'ACTIVE'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 mb-4 border border-white/5 relative z-10">
                              <span className={`text-sm font-medium ${isDeleted ? 'text-gray-500' : 'text-gray-400'}`}>
                                Credits Required
                              </span>
                              <input 
                                type="number"
                                min="0"
                                disabled={isDeleted}
                                value={tempCredits[item.id] !== undefined ? tempCredits[item.id] : (item.credits || 0)} 
                                onChange={(e) => handleCreditChange(item.id, e.target.value)}
                                className={`w-20 bg-slate-950/60 border rounded-lg px-2 py-1 text-sm font-bold text-center focus:outline-none focus:border-blue-500 transition-all ${
                                  isDeleted 
                                    ? 'border-gray-800 text-gray-600 bg-slate-950/20 cursor-not-allowed select-none' 
                                    : 'border-white/10 text-white'
                                }`}
                              />
                            </div>

                            {hasLevels ? (
                              <button 
                                onClick={() => handleUpdateLevel(item.categoryId, item.id, item.credits, item.name)}
                                disabled={isDeleted}
                                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 relative z-10 ${
                                  isDeleted 
                                    ? 'bg-gray-800/40 text-gray-500 border border-gray-700/30 cursor-not-allowed'
                                    : 'bg-slate-900 hover:bg-slate-800 text-white border border-white/10 shadow-md'
                                }`}
                              >
                                {isDeleted ? (
                                  <>
                                    <Lock size={14} className="text-gray-500" /> Action Disabled
                                  </>
                                ) : (
                                  <>
                                    <Save size={16} /> Update Level
                                  </>
                                )}
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleUpdateCategory(item.categoryId, item.credits, item.categoryName)}
                                disabled={isDeleted}
                                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 relative z-10 ${
                                  isDeleted 
                                    ? 'bg-gray-800/40 text-gray-500 border border-gray-700/30 cursor-not-allowed'
                                    : 'bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-500/20 shadow-md'
                                }`}
                              >
                                {isDeleted ? (
                                  <>
                                    <Lock size={14} className="text-gray-500" /> Action Disabled
                                  </>
                                ) : (
                                  <>
                                    <Save size={16} /> Update Category
                                  </>
                                )}
                              </button>
                            )}
                          </GlassCard>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-16">
                      <div className="inline-block p-6 bg-white/5 rounded-2xl border border-white/10">
                        <BookOpen size={48} className="text-gray-500 mx-auto mb-3 opacity-40" />
                        <p className="text-gray-400 text-lg font-medium">No items found</p>
                        <p className="text-gray-500 text-sm mt-1">This category does not have any sub-levels defined yet.</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Plan Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0f1424] border border-white/10 rounded-2xl p-6 overflow-y-auto max-h-[90vh] text-white"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{editingItem ? 'Edit Subscription Plan' : 'Create New Plan'}</h3>
                <button onClick={resetForm} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Plan Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Lite"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Price (LKR)</label>
                    <input 
                      type="number" 
                      value={formData.price} 
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g. 1500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Monthly Credits</label>
                    <input 
                      type="number" 
                      value={formData.credits} 
                      onChange={e => setFormData({ ...formData, credits: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g. 150"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                    <span>Features</span>
                    <button onClick={addFeatureField} className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1 font-bold">
                      <Plus size={14} /> Add Line
                    </button>
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {formData.features.map((feat, index) => (
                      <div key={index} className="flex gap-2">
                        <input 
                          type="text" 
                          value={feat} 
                          onChange={e => handleFeatureChange(index, e.target.value)}
                          className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                          placeholder={`Feature #${index + 1}`}
                        />
                        <button onClick={() => removeFeatureField(index)} className="p-2 hover:bg-red-500/10 rounded-xl text-red-400 border border-transparent hover:border-red-500/20">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 mt-4">
                  <input 
                    type="checkbox" 
                    id="popular"
                    checked={formData.popular} 
                    onChange={e => setFormData({ ...formData, popular: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-black/20 border-white/10 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="popular" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                    Mark as "Most Popular"
                  </label>
                </div>

                <button 
                  onClick={editingItem ? updatePlan : addPlan}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-sm font-bold text-white mt-6 transition-all shadow-lg"
                >
                  {editingItem ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== HISTORY MODAL ===== */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-[#0f1424] border border-white/10 rounded-2xl p-6 overflow-hidden flex flex-col max-h-[80vh] text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="text-purple-400" size={20}/>
                  <h3 className="text-xl font-bold">Credit Valuation Logs</h3>
                  {loadingHistory && (
                    <Loader2 size={18} className="text-blue-400 animate-spin ml-2" />
                  )}
                  <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                    {creditHistory.length} entries
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {creditHistory.length > 0 && (
                    <button 
                      onClick={clearCreditHistory}
                      disabled={clearingHistory}
                      className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {clearingHistory ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash size={14} />
                      )}
                      {clearingHistory ? 'Clearing...' : 'Clear All'}
                    </button>
                  )}
                  <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mt-2">
                {loadingHistory ? (
                  <div className="text-center py-12">
                    <Loader2 size={32} className="mx-auto animate-spin text-blue-400" />
                    <p className="text-gray-400 text-sm mt-2">Loading history...</p>
                  </div>
                ) : creditHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    <History size={48} className="mx-auto text-gray-600 mb-4 opacity-30" />
                    No credit history logs found.
                    <br />
                    <span className="text-xs text-gray-500">Update any exam or level to see logs here.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold">Exam / Level</th>
                          <th className="py-3 px-4 font-semibold text-center">Previous</th>
                          <th className="py-3 px-4 font-semibold text-center">Updated</th>
                          <th className="py-3 px-4 font-semibold text-right">Date & Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditHistory.map((log, index) => (
                          <tr 
                            key={log.id || index} 
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-gray-200">
                              {log.examName || 'Unknown Exam'}
                            </td>
                            <td className="py-3 px-4 text-center text-red-400 font-bold">
                              {log.previousCredits ?? 0}
                            </td>
                            <td className="py-3 px-4 text-center text-emerald-400 font-bold">
                              {log.newCredits ?? 0}
                            </td>
                            <td className="py-3 px-4 text-right text-xs text-gray-400 font-mono">
                              {log.updatedAt ? formatDate(log.updatedAt) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {creditHistory.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs text-gray-500">
                  <span>Showing {creditHistory.length} log entries</span>
                  <span className="text-gray-600">Latest updates first</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SubscriptionManager;