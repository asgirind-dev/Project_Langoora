import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios'; // Axios install කරලා නැත්නම් install කරගන්න මචන් (npm i axios)
import { 
  Plus, Edit, Trash2, Crown, Sparkles, 
  Zap, Infinity, CheckCircle,
  DollarSign, BookOpen, Settings, Save,
  X, Database, RefreshCw, Rocket, Star, Layers, Award
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const API_BASE_URL = 'http://localhost:5000/api/subscription-management'; // ඔයාලගේ බැක්එන්ඩ් පෝර්ට් එකට ගැලපෙන්න වෙනස් කරන්න

const iconMap = {
  Zap: Zap,
  Rocket: Rocket,
  Crown: Crown,
  Infinity: Infinity,
  Star: Star
};

export default function SubscriptionManager() {
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [examCategories, setExamCategories] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('plan');
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', price: '', credits: '', features: [''], popular: false,
  });
  const [examFormData, setExamFormData] = useState({
    name: '', credits: '', exams: '', status: 'active'
  });

  // Fetch initial data from database
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const plansRes = await axios.get(`${API_BASE_URL}/plans`);
      const catsRes = await axios.get(`${API_BASE_URL}/categories`);
      setPlans(plansRes.data);
      setExamCategories(catsRes.data);
    } catch (error) {
      console.error("Database fetch error: ", error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Stats Counters
  const stats = [
    { label: 'Total Plans', value: plans.length, icon: Crown, color: 'text-purple-400' },
    { label: 'Active Plans', value: plans.filter(p => p.active).length, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Exam Categories', value: examCategories.length, icon: BookOpen, color: 'text-blue-400' },
    { label: 'Total Credits Pool', value: examCategories.reduce((acc, cat) => acc + (cat.credits || 0), 0), icon: Database, color: 'text-amber-400' },
  ];

  // ==========================================
  // DB CRUD Operations for Plans
  // ==========================================
  const addPlan = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/plans`, formData);
      setPlans([...plans, res.data]);
      resetForm();
    } catch (error) {
      console.error("Add plan failed:", error);
    }
  };

  const updatePlan = async () => {
    try {
      await axios.put(`${API_BASE_URL}/plans/${editingItem.id}`, formData);
      setPlans(plans.map(p => p.id === editingItem.id ? { ...p, ...formData, price: parseInt(formData.price), credits: parseInt(formData.credits) } : p));
      resetForm();
    } catch (error) {
      console.error("Update plan failed:", error);
    }
  };

  const deletePlan = async (id) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/plans/${id}`);
      setPlans(plans.filter(p => p.id !== id));
    } catch (error) {
      console.error("Delete plan failed:", error);
    }
  };

  const togglePlanStatus = async (id, currentStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/plans/${id}`, { active: !currentStatus });
      setPlans(plans.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
    } catch (error) {
      console.error("Toggle plan status failed:", error);
    }
  };

  // ==========================================
  // DB CRUD Operations for Exam Categories
  // ==========================================
  const addExamCategory = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/categories`, examFormData);
      setExamCategories([...examCategories, res.data]);
      resetExamForm();
    } catch (error) {
      console.error("Add category failed:", error);
    }
  };

  const updateExamCategory = async () => {
    try {
      await axios.put(`${API_BASE_URL}/categories/${editingItem.id}`, examFormData);
      setExamCategories(examCategories.map(c => c.id === editingItem.id ? { ...c, ...examFormData, credits: parseInt(examFormData.credits), exams: parseInt(examFormData.exams) } : c));
      resetExamForm();
    } catch (error) {
      console.error("Update category failed:", error);
    }
  };

  const deleteExamCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/categories/${id}`);
      setExamCategories(examCategories.filter(c => c.id !== id));
    } catch (error) {
      console.error("Delete category failed:", error);
    }
  };

  const toggleExamStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await axios.put(`${API_BASE_URL}/categories/${id}`, { status: nextStatus });
      setExamCategories(examCategories.map(c => c.id === id ? { ...c, status: nextStatus } : c));
    } catch (error) {
      console.error("Toggle category status failed:", error);
    }
  };

  // Helpers
  const resetForm = () => { setFormData({ name: '', price: '', credits: '', features: [''], popular: false }); setEditingItem(null); setShowModal(false); };
  const resetExamForm = () => { setExamFormData({ name: '', credits: '', exams: '', status: 'active' }); setEditingItem(null); setShowModal(false); };
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
                  <div><h2 className="text-lg font-semibold text-white">Exam Category Credit Fixer</h2><p className="text-sm text-gray-400">Assign fixed credit costs for entry tokens</p></div>
                  <button onClick={() => { setModalType('exam'); setEditingItem(null); resetExamForm(); setShowModal(true); }} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-sm font-medium flex items-center gap-2 text-white"><Plus size={16}/>Add Category</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {examCategories.map((cat) => (
                    <GlassCard key={cat.id} className={`p-6 relative transition-all ${cat.status === 'active' ? 'border-white/10' : 'border-red-500/20 opacity-50'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-white">{cat.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 border rounded-md uppercase font-semibold ${cat.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{cat.status}</span>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm bg-white/5 p-2 rounded-lg"><span className="text-gray-400">Credits Required</span><span className="font-bold text-white">{cat.credits}</span></div>
                        {/* <div className="flex justify-between text-sm bg-white/5 p-2 rounded-lg"><span className="text-gray-400">Exams Count</span><span className="text-gray-300">{cat.exams}</span></div> */}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toggleExamStatus(cat.id, cat.status)} className={`flex-1 py-2 rounded-xl text-xs font-medium ${cat.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{cat.status === 'active' ? 'Active' : 'Inactive'}</button>
                        <button onClick={() => { setModalType('exam'); setEditingItem(cat); setExamFormData({ name: cat.name, credits: cat.credits.toString(), exams: cat.exams.toString(), status: cat.status }); setShowModal(true); }} className="p-2 bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white"><Edit size={16}/></button>
                        <button onClick={() => deleteExamCategory(cat.id)} className="p-2 bg-red-500/10 border border-red-500/10 rounded-xl text-red-400 hover:bg-red-500/20"><Trash2 size={16}/></button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Shared Configuration Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-gradient-to-br from-[#0f1629] to-[#1a1f3a] border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{modalType === 'plan' ? (editingItem ? 'Edit Tier' : 'Add New Tier') : (editingItem ? 'Edit Exam Category' : 'Add Category')}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 bg-white/5 rounded-xl text-gray-400"><X size={16}/></button>
              </div>

              {modalType === 'plan' ? (
                <div className="space-y-4">
                  <div><label className="text-xs text-gray-400 block mb-1">Plan Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none"/></div>
                  <div><label className="text-xs text-gray-400 block mb-1">Price (LKR)</label><input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none"/></div>
                  <div><label className="text-xs text-gray-400 block mb-1">Credits Per Month</label><input type="number" value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none"/></div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Tiers Feature Nodes</label>
                    {formData.features.map((f, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input type="text" value={f} onChange={(e) => handleFeatureChange(i, e.target.value)} className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none"/>
                        {formData.features.length > 1 && <button onClick={() => removeFeatureField(i)} className="p-2 bg-red-500/10 rounded-xl text-red-400"><X size={16}/></button>}
                      </div>
                    ))}
                    <button onClick={addFeatureField} className="text-xs text-blue-400 mt-1 flex items-center gap-1">+ Add Node Feature</button>
                  </div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={formData.popular} onChange={(e) => setFormData({ ...formData, popular: e.target.checked })} className="accent-purple-500"/><label className="text-xs text-gray-400">Mark Tier as Most Popular</label></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div><label className="text-xs text-gray-400 block mb-1">Category Domain Identifier</label><input type="text" value={examFormData.name} onChange={(e) => setExamFormData({ ...examFormData, name: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none"/></div>
                  <div><label className="text-xs text-gray-400 block mb-1">Valuation Token Weight (Credits)</label><input type="number" value={examFormData.credits} onChange={(e) => setExamFormData({ ...examFormData, credits: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none"/></div>
                  {/* <div><label className="text-xs text-gray-400 block mb-1">Total Loaded Exam Structures</label><input type="number" value={examFormData.exams} onChange={(e) => setExamFormData({ ...examFormData, exams: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none"/></div> */}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-white/5 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={modalType === 'plan' ? (editingItem ? updatePlan : addPlan) : (editingItem ? updateExamCategory : addExamCategory)} className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-sm font-medium flex items-center justify-center gap-2 text-white"><Save size={16}/>{editingItem ? 'Update Node' : 'Save Node'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}