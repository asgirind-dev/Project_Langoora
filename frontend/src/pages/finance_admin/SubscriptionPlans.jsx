import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Crown, Sparkles, CheckCircle, 
  RefreshCw, Rocket, Layers, X, Loader2, Zap
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import PlanService from "../../services/PlanService"; // 👈 නිවැරදි PlanService Import එක

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

function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);

  const [formData, setFormData] = useState({
    name: '', price: '', credits: '', features: [''], popular: false
  });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      // ✅ FIXED: SubscriptionService වෙනුවට PlanService භාවිත කිරීම
      const data = await PlanService.getAllPlans();
      const normalizedPlans = (data || []).map(plan => ({
        ...plan,
        id: plan.id || plan._id,
        features: normalizeFeatures(plan.features),
        price: parseInt(plan.price) || 0,
        credits: parseInt(plan.credits) || 0,
        active: plan.active !== undefined ? Boolean(plan.active) : true,
        popular: Boolean(plan.popular)
      }));
      setPlans(normalizedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const addPlan = async () => {
    if (!formData.name.trim()) return alert("⚠️ Please enter a Plan Name.");
    setSavingPlan(true);
    try {
      const payload = {
        name: formData.name.trim(),
        price: parseInt(formData.price) || 0,
        credits: parseInt(formData.credits) || 0,
        features: formData.features.filter(f => f && f.trim() !== ''),
        popular: Boolean(formData.popular),
        active: true
      };

      // ✅ FIXED: SubscriptionService වෙනුවට PlanService භාවිත කිරීම
      const res = await PlanService.createNewPlan(payload);
      setPlans([...plans, { ...res, id: res.id || res._id, features: normalizeFeatures(res.features), active: true, popular: Boolean(formData.popular) }]);
      alert("✅ New Subscription Plan Created!");
      resetForm();
    } catch (error) {
      alert(`❌ Error creating plan: ${error.message}`);
    } finally {
      setSavingPlan(false);
    }
  };

  const updatePlan = async () => {
    if (!formData.name.trim()) return alert("⚠️ Please enter a Plan Name.");
    setSavingPlan(true);
    try {
      const targetId = editingItem.id || editingItem._id;
      const payload = {
        name: formData.name.trim(),
        price: parseInt(formData.price) || 0,
        credits: parseInt(formData.credits) || 0,
        features: formData.features.filter(f => f && f.trim() !== ''),
        popular: Boolean(formData.popular)
      };

      // ✅ FIXED: SubscriptionService වෙනුවට PlanService භාවිත කිරීම
      await PlanService.updateExistingPlan(targetId, payload);
      setPlans(plans.map(p => (p.id === targetId || p._id === targetId) ? { ...p, ...payload } : p));
      alert("✅ Plan Updated Successfully!");
      resetForm();
    } catch (error) {
      alert(`❌ Error updating plan: ${error.message}`);
    } finally {
      setSavingPlan(false);
    }
  };

  const deletePlan = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this plan?")) return;
    try {
      // ✅ FIXED: SubscriptionService වෙනුවට PlanService භාවිත කිරීම
      await PlanService.deleteExistingPlan(id);
      setPlans(plans.filter(p => p.id !== id && p._id !== id));
      alert("✅ Plan deleted successfully!");
    } catch (error) {
      alert("❌ Delete failed.");
    }
  };

  const togglePlanStatus = async (planId, currentActiveStatus) => {
    const nextStatus = !currentActiveStatus;
    const existingPlan = plans.find(p => (p.id === planId || p._id === planId));
    if (!existingPlan) return;

    try {
      const payload = {
        name: existingPlan.name,
        price: existingPlan.price,
        credits: existingPlan.credits,
        features: existingPlan.features,
        popular: Boolean(existingPlan.popular),
        active: nextStatus 
      };

      // ✅ FIXED: SubscriptionService වෙනුවට PlanService භාවිත කිරීම
      await PlanService.updateExistingPlan(planId, payload);
      setPlans(plans.map(p => (p.id === planId || p._id === planId) ? { ...p, active: nextStatus } : p));
    } catch (error) {
      alert("❌ Status update failed.");
    }
  };

  const resetForm = () => {
    setFormData({ name: '', price: '', credits: '', features: [''], popular: false });
    setEditingItem(null);
    setShowModal(false);
  };

  const handleFeatureChange = (index, val) => { const f = [...formData.features]; f[index] = val; setFormData({ ...formData, features: f }); };
  const addFeatureField = () => { setFormData({ ...formData, features: [...formData.features, ''] }); };
  const removeFeatureField = (idx) => { setFormData({ ...formData, features: formData.features.filter((_, i) => i !== idx) }); };

  const handleEditClick = (plan) => {
    setEditingItem(plan);
    const normalized = normalizeFeatures(plan.features);
    setFormData({
      name: plan.name || '',
      price: (plan.price || 0).toString(),
      credits: (plan.credits || 0).toString(),
      features: normalized.length ? normalized : [''],
      popular: Boolean(plan.popular)
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-8 text-gray-100 font-sans relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/20 shadow-lg shadow-purple-500/5">
              <Layers size={24} className="text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">
                  Subscription Tier Architecture
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase tracking-wider">
                  finance Admin Control
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Configure recurring monthly subscription tiers and pricing models</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchPlans} 
            className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/10 transition-all duration-300 text-gray-300 hover:text-white cursor-pointer active:scale-95 shadow-sm"
            title="Refresh Plans"
          >
            <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => { setEditingItem(null); resetForm(); setShowModal(true); }}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl text-sm font-bold flex items-center gap-2 text-white shadow-xl shadow-indigo-500/20 hover:opacity-95 hover:shadow-indigo-500/30 active:scale-95 transition-all cursor-pointer border border-white/10"
          >
            <Plus size={18} /> Add New Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 space-y-4">
          <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/20 animate-bounce">
            <Loader2 className="animate-spin text-purple-400" size={28} />
          </div>
          <span className="text-sm font-medium tracking-wide">Fetching Subscription Tiers...</span>
        </div>
      ) : (
        <>
          {plans.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
              <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-400">
                <Crown size={32} />
              </div>
              <h3 className="text-lg font-bold text-white">No Subscription Tiers Found</h3>
              <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">Get started by creating your first subscription plan for your users.</p>
              <button 
                onClick={() => { setEditingItem(null); resetForm(); setShowModal(true); }}
                className="mt-6 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus size={16} /> Create First Plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan, idx) => {
                const planId = plan.id || plan._id;
                const isActive = plan.active === true;
                const isPopular = Boolean(plan.popular);

                return (
                  <motion.div key={planId || idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
                    <GlassCard className={`p-5 border-2 relative rounded-2xl flex flex-col h-full ${
                      isActive 
                        ? isPopular ? 'bg-[#0f1424]/90 border-purple-500/30 shadow-xl' : 'bg-[#0f1424]/90 border-white/5 hover:border-white/10' 
                        : 'bg-[#0a0d1a]/60 border-red-500/30 opacity-70'
                    }`}>
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <span className="px-3.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                            MOST POPULAR
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-3">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${isActive ? 'bg-purple-500/10 border-purple-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                          <Rocket size={18} className={isActive ? "text-purple-400" : "text-red-400/60"} />
                        </div>
                        {!isActive && (
                          <span className="text-[10px] bg-red-500/20 border border-red-500/40 text-red-400 px-2 py-0.5 rounded font-mono font-bold tracking-wider">
                            INACTIVE
                          </span>
                        )}
                      </div>

                      <h2 className={`text-xl font-bold tracking-wide uppercase ${isActive ? 'text-white' : 'text-gray-400'}`}>{plan.name}</h2>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-white tracking-tight">LKR {plan.price.toLocaleString()}</span>
                        <span className="text-xs font-medium text-gray-400">/month</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mt-2.5 mb-4">
                        <Sparkles size={13} className="fill-amber-400/20" />
                        <span>{plan.credits || 0} credits granted</span>
                      </div>

                      <div className="space-y-2.5 my-4 flex-1">
                        {plan.features.map((f, fi) => (
                          <div key={fi} className="flex items-start gap-2 text-xs font-medium text-gray-300">
                            <CheckCircle size={15} className={isActive ? "text-emerald-400 shrink-0 mt-0.5" : "text-gray-500 shrink-0 mt-0.5"} />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/5">
                        <button 
                          onClick={() => togglePlanStatus(planId, isActive)} 
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button onClick={() => handleEditClick(plan)} className="p-2 bg-white/5 border border-white/5 rounded-lg text-gray-400 hover:text-white cursor-pointer"><Edit size={15} /></button>
                        <button onClick={() => deletePlan(planId)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 cursor-pointer"><Trash2 size={15} /></button>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              className="w-full max-w-lg bg-[#0d1222] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh] text-white shadow-2xl shadow-purple-500/10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                    <Crown size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{editingItem ? 'Edit Subscription Plan' : 'Create New Tier'}</h3>
                </div>
                <button onClick={resetForm} disabled={savingPlan} className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Plan Name *</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors" 
                    placeholder="e.g. ULTIMATE VIP" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Price (LKR)</label>
                    <input 
                      type="number" 
                      value={formData.price} 
                      onChange={e => setFormData({ ...formData, price: e.target.value })} 
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors" 
                      placeholder="e.g. 5000" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Monthly Credits</label>
                    <input 
                      type="number" 
                      value={formData.credits} 
                      onChange={e => setFormData({ ...formData, credits: e.target.value })} 
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors" 
                      placeholder="e.g. 600" 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Features</label>
                    <button onClick={addFeatureField} type="button" className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1 font-bold cursor-pointer">
                      <Plus size={14} /> Add Line
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {formData.features.map((feat, index) => (
                      <div key={index} className="flex gap-2">
                        <input 
                          type="text" 
                          value={feat} 
                          onChange={e => handleFeatureChange(index, e.target.value)} 
                          className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-purple-500" 
                          placeholder={`Feature #${index + 1}`} 
                        />
                        <button onClick={() => removeFeatureField(index)} type="button" className="p-2 hover:bg-red-500/10 rounded-xl text-red-400 cursor-pointer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/[0.07] transition-colors">
                    <input 
                      type="checkbox" 
                      id="popular" 
                      checked={formData.popular} 
                      onChange={e => setFormData({ ...formData, popular: e.target.checked })} 
                      className="w-4 h-4 text-purple-600 rounded cursor-pointer accent-purple-500" 
                    />
                    <label htmlFor="popular" className="text-xs font-semibold text-gray-300 cursor-pointer flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" />
                      Mark as "Most Popular Tier"
                    </label>
                  </div>
                </div>

                <button 
                  type="button" 
                  disabled={savingPlan} 
                  onClick={editingItem ? updatePlan : addPlan} 
                  className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl text-xs font-bold text-white mt-6 cursor-pointer flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-purple-500/20 border border-white/10 disabled:opacity-50"
                >
                  {savingPlan ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  <span>{editingItem ? 'Save Changes' : 'Create Subscription Plan'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SubscriptionPlans;