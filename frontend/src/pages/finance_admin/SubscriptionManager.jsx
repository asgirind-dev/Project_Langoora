import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Crown, Sparkles, 
  Zap, Infinity, CheckCircle,
  BookOpen, Save, X, RefreshCw, 
  Rocket, Star, Layers, Award, Database, History 
} from 'lucide-react'; 
import GlassCard from '../../components/ui/GlassCard';
import SubscriptionService from '../../services/subscriptionService'; 

const iconMap = { Zap, Rocket, Crown, Infinity, Star };

export default function SubscriptionManager() {
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [examCategories, setExamCategories] = useState([]);
  const [exams, setExams] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('plan');
  const [editingItem, setEditingItem] = useState(null);
  
  // Credit ඉතිහාසය (History Logs) රඳවා ගැනීමට අලුත් state එකක්
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [creditHistory, setCreditHistory] = useState([
    // ආරම්භක නියැදි දත්ත (Sample Data) - බැලීමට පමණි
    { id: 1, category: 'n5', previous: 3, updated: 5, date: '2026-07-06 14:32' },
    { id: 2, category: 'JLPT N3', previous: 5, updated: 3, date: '2026-07-05 09:15' },
    { id: 3, category: 'TOPIK-I Level 1', previous: 10, updated: 15, date: '2026-07-02 18:20' },
  ]);
  
  const [tempCredits, setTempCredits] = useState({});
  const [formData, setFormData] = useState({
    name: '', price: '', credits: '', features: [''], popular: false,
  });

  const handleCreditChange = (id, value) => {
    setTempCredits((prev) => ({ ...prev, [id]: value }));
  };

  const handleUpdateSubmit = async (categoryId, currentCredit, categoryName) => {
    const creditToUpdate = tempCredits[categoryId] !== undefined ? tempCredits[categoryId] : currentCredit;
    
    try {
      setLoadingData(true);
      await SubscriptionService.updateCategoryCredits(categoryId, { credits: parseInt(creditToUpdate) });
      
      // ඉතිහාස ලොගයට අලුත් Record එකක් එක් කිරීම
      const newHistoryLog = {
        id: Date.now(),
        category: categoryName,
        previous: currentCredit,
        updated: parseInt(creditToUpdate),
        date: new Date().toISOString().replace('T', ' ').substring(0, 16) // දැනට පවතින දිනය සහ වෙලාව සකසා ගැනීම
      };
      setCreditHistory(prev => [newHistoryLog, ...prev]);

      setExamCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId ? { ...cat, credits: parseInt(creditToUpdate) } : cat
        )
      );
      
      setTempCredits((prev) => {
        const updated = { ...prev };
        delete updated[categoryId];
        return updated;
      });
      
      alert('Credits requirement updated successfully!');
    } catch (error) {
      console.error("Update failed:", error);
      alert('Failed to update credits. Please try again.');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [plansData, catsData, examsData] = await Promise.all([
        SubscriptionService.getAllPlans(),
        SubscriptionService.getAllCategories(),
        SubscriptionService.getAllExams()
      ]);
      setPlans(plansData);
      setExamCategories(catsData);
      setExams(examsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = [
    { label: 'Total Plans', value: plans.length, icon: Crown, color: 'text-purple-400' },
    { label: 'Active Plans', value: plans.filter(p => p.active).length, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Exam Categories', value: examCategories.length, icon: BookOpen, color: 'text-blue-400' },
    { label: 'Total Credits Pool', value: examCategories.reduce((acc, cat) => acc + (cat.credits || 0), 0), icon: Database, color: 'text-amber-400' },
  ];

  const addPlan = async () => {
    try {
      const res = await SubscriptionService.createNewPlan(formData);
      setPlans([...plans, res]);
      resetForm();
    } catch (error) { console.error("Add plan failed:", error); }
  };

  const updatePlan = async () => {
    try {
      await SubscriptionService.updateExistingPlan(editingItem.id, formData);
      setPlans(plans.map(p => p.id === editingItem.id ? { ...p, ...formData, price: parseInt(formData.price), credits: parseInt(formData.credits) } : p));
      resetForm();
    } catch (error) { console.error("Update plan failed:", error); }
  };

  const deletePlan = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await SubscriptionService.deleteExistingPlan(id);
      setPlans(plans.filter(p => p.id !== id));
    } catch (error) { console.error("Delete failed:", error); }
  };

  const togglePlanStatus = async (id, currentStatus) => {
    try {
      await SubscriptionService.updateExistingPlan(id, { active: !currentStatus });
      setPlans(plans.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
    } catch (error) { console.error("Toggle plan status failed:", error); }
  };

  const resetForm = () => { setFormData({ name: '', price: '', credits: '', features: [''], popular: false }); setEditingItem(null); setShowModal(false); };
  const handleFeatureChange = (index, val) => { const f = [...formData.features]; f[index] = val; setFormData({ ...formData, features: f }); };
  const addFeatureField = () => { setFormData({ ...formData, features: [...formData.features, ''] }); };
  const removeFeatureField = (idx) => { setFormData({ ...formData, features: formData.features.filter((_, i) => i !== idx) }); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/10">
              <Crown size={22} className="text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Credit Architecture Core
            </h1>
          </div>
          <p className="text-sm text-gray-400 mt-1 ml-14">Configure subscription tiers and assign fixed exam valuation weights</p>
        </div>
        <button onClick={fetchData} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 border border-white/5 transition-colors">
          <RefreshCw size={16} className={`text-gray-400 ${loadingData ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loadingData ? (
        <div className="text-center py-20 text-gray-400">Loading architecture components from Firestore...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-white/10 pb-4">
            <button onClick={() => setActiveTab('plans')} className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}><Layers size={16} className="inline mr-2"/>Subscription Plans</button>
            <button onClick={() => setActiveTab('exams')} className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'exams' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}><Award size={16} className="inline mr-2"/>Exam Category Credit Fixer</button>
          </div>

          {/* Core Panes */}
          <AnimatePresence mode="wait">
            {activeTab === 'plans' ? (
              <motion.div key="plans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex justify-between items-center mb-6">
                  <div><h2 className="text-lg font-semibold text-white">Subscription Plans</h2><p className="text-sm text-gray-400">Manage student levels and structure weights</p></div>
                  <button onClick={() => { setModalType('plan'); setEditingItem(null); resetForm(); setShowModal(true); }} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-sm font-medium flex items-center gap-2 text-white"><Plus size={16}/>Add Plan</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map((plan) => {
                    const Icon = iconMap[plan.icon] || Zap;
                    return (
                      <GlassCard key={plan.id} className={`p-6 relative transition-all ${plan.active ? 'border-white/10' : 'border-red-500/20 opacity-50'}`}>
                        {plan.popular && plan.active && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-[10px] font-bold uppercase tracking-wider">Most Popular</div>}
                        <div className="p-3 bg-white/5 rounded-xl w-fit mb-3"><Icon size={24} className="text-purple-400" /></div>
                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="text-2xl font-bold text-white mb-4">LKR {plan.price} <span className="text-xs text-gray-400">/month</span></div>
                        <div className="text-xs text-amber-400 mb-4 flex items-center gap-1"><Sparkles size={12}/>{plan.credits} credits granted</div>
                        <div className="space-y-2 mb-6">
                          {plan.features?.map((f, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle size={14} className="text-emerald-400"/>{f}</div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => togglePlanStatus(plan.id, plan.active)} className={`flex-1 py-2 rounded-xl text-xs font-medium ${plan.active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{plan.active ? 'Active' : 'Inactive'}</button>
                          <button onClick={() => { setModalType('plan'); setEditingItem(plan); setFormData({ name: plan.name, price: plan.price.toString(), credits: plan.credits.toString(), features: plan.features || [''], popular: plan.popular }); setShowModal(true); }} className="p-2 bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white"><Edit size={16}/></button>
                          <button onClick={() => deletePlan(plan.id)} className="p-2 bg-red-500/10 border border-red-500/10 rounded-xl text-red-400 hover:bg-red-500/20"><Trash2 size={16}/></button>
                        </div>
                      </GlassCard>
                    )
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div key="exams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Exam Category Credit Fixer</h2>
                    <p className="text-sm text-gray-400 mt-1">Assign and manually update fixed credit costs for entry tokens</p>
                  </div>
                  <button 
                    onClick={() => setShowHistoryModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-sm font-medium flex items-center gap-2 text-white shadow-lg shadow-blue-500/10 transition-all"
                  >
                    <History size={16}/>View History
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {examCategories.map((cat, index) => (
                    <motion.div 
                      key={cat.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GlassCard className="p-6 relative border-white/10 hover:border-white/20 transition-all group">
                        <div className="flex justify-between items-start mb-5">
                          <div>
                            <h3 className="text-xl font-bold text-white tracking-wide">{cat.name || cat.category_name}</h3>
                            {cat.language && (
                              <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-gray-300 mt-2 inline-block">
                                {cat.language}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md uppercase font-semibold">
                            {cat.status || 'Active'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 mb-4 border border-white/5">
                          <span className="text-sm text-gray-400 font-medium">Credits Required</span>
                          <input 
                            type="number"
                            min="0"
                            value={tempCredits[cat.id] !== undefined ? tempCredits[cat.id] : (cat.credits || 0)} 
                            onChange={(e) => handleCreditChange(cat.id, e.target.value)}
                            className="w-20 bg-slate-950/60 border border-white/10 rounded-lg px-2 py-1 text-white text-sm font-bold text-center focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleUpdateSubmit(cat.id, cat.credits, (cat.name || cat.category_name))}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white border border-white/10 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <Save size={16} /> Update
                          </button>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Plan Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 overflow-y-auto max-h-[90vh] text-white"
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
                    placeholder="e.g. Gold Access"
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
                      placeholder="e.g. 50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                    <span>Features Included</span>
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
                    Feature this plan as "Most Popular"
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

      {/* Credit History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl p-6 overflow-hidden flex flex-col max-h-[80vh] text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="text-purple-400" size={20}/>
                  <h3 className="text-xl font-bold">Credit Valuation Logs</h3>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mt-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-gray-400 uppercase">
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold text-center">Previous</th>
                      <th className="py-3 px-4 font-semibold text-center">Updated</th>
                      <th className="py-3 px-4 font-semibold text-right">Date Changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditHistory.map((log) => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-200">{log.category}</td>
                        <td className="py-3 px-4 text-center text-red-400 font-bold">{log.previous}</td>
                        <td className="py-3 px-4 text-center text-emerald-400 font-bold">{log.updated}</td>
                        <td className="py-3 px-4 text-right text-xs text-gray-400">{log.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}