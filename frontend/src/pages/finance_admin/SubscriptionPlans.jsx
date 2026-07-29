import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Crown, Sparkles, CheckCircle, 
  RefreshCw, Rocket, Layers, X, Loader2, Zap
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import PlanService from "../../services/PlanService";
import axios from 'axios';
import FinanceNotifications from '../../components/finance/FinanceNotifications';

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
  const [error, setError] = useState(null);

  // 🔴 Form Field Errors State
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '', price: '', credits: '', features: [''], popular: false
  });

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PlanService.getAllPlans();
      const normalizedPlans = (data || []).map(plan => ({
        ...plan,
        id: plan.id || plan._id,
        features: normalizeFeatures(plan.features),
        price: parseFloat(plan.price) || 0,
        credits: parseInt(plan.credits) || 0,
        active: plan.active !== undefined ? Boolean(plan.active) : false,
        popular: Boolean(plan.popular),
        status: plan.status || 'pending'
      }));
      setPlans(normalizedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      setError(error.message || 'Failed to fetch plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // -------------------------------------------------------------
  // 🛡️ FORM VALIDATION CONTROLLER LOGIC
  // -------------------------------------------------------------
  const validateForm = () => {
    let errs = {};
    const rawName = formData.name !== undefined && formData.name !== null ? String(formData.name) : '';
    const nameVal = rawName.trim();
    const priceStr = formData.price !== undefined && formData.price !== null ? String(formData.price).trim() : '';
    const creditsStr = formData.credits !== undefined && formData.credits !== null ? String(formData.credits).trim() : '';
    
    // Regex for XSS Script/HTML Tags
    const scriptRegex = /<[^>]*>/g;

    // 1. Plan Name Validations
    if (!rawName) {
      errs.name = "Plan name is required.";
    } else if (rawName.length > 0 && nameVal.length === 0) {
      errs.name = "Plan name cannot consist of only blank spaces.";
    } else if (nameVal.length < 3) {
      errs.name = "Plan name must be at least 3 characters.";
    } else if (nameVal.length > 50) {
      errs.name = "Plan name cannot exceed 50 characters.";
    } else if (
      plans.some(
        p => p.name.toLowerCase() === nameVal.toLowerCase() && 
        (!editingItem || (p.id !== editingItem.id && p._id !== editingItem._id))
      )
    ) {
      errs.name = "A subscription plan with this name already exists.";
    } else if (scriptRegex.test(nameVal)) {
      errs.name = "Invalid characters detected. HTML or script tags are not allowed.";
    }

    // 2. Price Validations
    if (!priceStr) {
      errs.price = "Price is required.";
    } else {
      const pNum = Number(priceStr);
      if (isNaN(pNum)) {
        errs.price = "Please enter a valid price.";
      } else if (pNum <= 0) {
        errs.price = "Price must be greater than 0.";
      } else if (priceStr.length > 6) {
        errs.price = "Price cannot exceed 999999 LKR.";
      } else if (priceStr.includes('.')) {
        const decimalParts = priceStr.split('.');
        if (decimalParts[1] && decimalParts[1].length > 2) {
          errs.price = "Price cannot have more than 2 decimal places.";
        }
      }
    }

    // 3. Monthly Credits Validations
    if (!creditsStr) {
      errs.credits = "Monthly credits are required.";
    } else {
      const cNum = Number(creditsStr);
      if (isNaN(cNum) || !Number.isInteger(cNum)) {
        errs.credits = "Please enter a valid credit amount.";
      } else if (cNum <= 0) {
        errs.credits = "Credits must be greater than 0.";
      } else if (creditsStr.length > 6) {
        errs.credits = "Monthly credits cannot exceed 999999.";
      }
    }

    // 4. Features Validations
    if (!formData.features || formData.features.length === 0) {
      errs.features = "Please add at least one feature.";
    } else {
      let seenFeatures = [];
      formData.features.forEach((feat, idx) => {
        const featVal = feat ? feat.trim() : '';
        if (!featVal) {
          errs[`feature_${idx}`] = "Feature cannot be empty.";
        } else if (featVal.length > 100) {
          errs[`feature_${idx}`] = "Feature cannot exceed 100 characters.";
        } else if (seenFeatures.includes(featVal.toLowerCase())) {
          errs[`feature_${idx}`] = "Duplicate features are not allowed.";
        } else {
          seenFeatures.push(featVal.toLowerCase());
        }
      });
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addPlan = async () => {
    if (!validateForm()) return;
    setSavingPlan(true);
    setError(null);
    try {
      const payload = {
        name: formData.name.trim(),
        price: parseFloat(formData.price) || 0,
        credits: parseInt(formData.credits) || 0,
        features: formData.features.filter(f => f && f.trim() !== ''),
        popular: Boolean(formData.popular),
        active: false, // Default inactive until approved
        status: 'pending' // Send for admin review
      };

      const response = await axios.post(
        'http://localhost:5000/api/subscription-plans',
        payload,
        getAuthConfig()
      );

      const newPlan = { 
        ...response.data, 
        id: response.data.id || response.data._id,
        features: normalizeFeatures(response.data.features || payload.features),
        active: false,
        status: 'pending',
        popular: Boolean(payload.popular)
      };

      setPlans([...plans, newPlan]);
      alert("✅ New Subscription Plan Created and Sent for Admin Review!");
      resetForm();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      alert(`❌ Error creating plan: ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setSavingPlan(false);
    }
  };

  const updatePlan = async () => {
    if (!validateForm()) return;
    setSavingPlan(true);
    setError(null);
    try {
      const targetId = editingItem.id || editingItem._id;
      const isRejected = editingItem.status === 'rejected';

      const payload = {
        name: formData.name.trim(),
        price: parseFloat(formData.price) || 0,
        credits: parseInt(formData.credits) || 0,
        features: formData.features.filter(f => f && f.trim() !== ''),
        popular: Boolean(formData.popular),
        ...(isRejected && { status: 'pending', active: false })
      };

      await axios.put(
        `http://localhost:5000/api/subscription-plans/${targetId}`,
        payload,
        getAuthConfig()
      );

      setPlans(plans.map(p => 
        (p.id === targetId || p._id === targetId) 
          ? { 
              ...p, 
              ...payload, 
              status: isRejected ? 'pending' : p.status,
              active: isRejected ? false : p.active,
              features: normalizeFeatures(payload.features) 
            } 
          : p
      ));

      if (isRejected) {
        alert("✅ Plan changes saved and resubmitted to Admin for Approval!");
      } else {
        alert("✅ Plan Updated Successfully!");
      }
      
      resetForm();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      alert(`❌ Error updating plan: ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setSavingPlan(false);
    }
  };

  const deletePlan = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this plan?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/subscription-plans/${id}`, getAuthConfig());
      setPlans(plans.filter(p => p.id !== id && p._id !== id));
      alert("✅ Plan deleted successfully!");
    } catch (error) {
      alert(`❌ Delete failed: ${error.response?.data?.message || error.message}`);
    }
  };

  // 🎯 ACTIVE / INACTIVE TOGGLE FIX
  const togglePlanStatus = async (planId, currentActiveStatus, planStatus) => {
    if (planStatus === 'rejected') {
      alert("❌ This plan was rejected by Admin. Please edit and submit changes for re-approval instead of activating.");
      return;
    }

    if (planStatus === 'pending') {
      alert("⏳ This plan is awaiting Admin approval before it can be activated.");
      return;
    }

    const nextStatus = !currentActiveStatus;

    try {
      // 💡 ONLY send active status so backend guard won't block approved plans!
      const payload = { active: nextStatus };

      await axios.put(`http://localhost:5000/api/subscription-plans/${planId}`, payload, getAuthConfig());

      setPlans(plans.map(p => 
        (p.id === planId || p._id === planId) ? { ...p, active: nextStatus } : p
      ));

      alert(`✅ Plan status updated to ${nextStatus ? 'ACTIVE' : 'INACTIVE'}!`);
    } catch (error) {
      alert(`❌ Status update failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', price: '', credits: '', features: [''], popular: false });
    setFormErrors({});
    setEditingItem(null);
    setShowModal(false);
    setError(null);
  };

  const handleFeatureChange = (index, val) => { 
    const f = [...formData.features]; 
    f[index] = val; 
    setFormData({ ...formData, features: f }); 
    if (formErrors[`feature_${index}`]) {
      setFormErrors({ ...formErrors, [`feature_${index}`]: null, features: null });
    }
  };
  
  const addFeatureField = () => { 
    setFormData({ ...formData, features: [...formData.features, ''] }); 
  };
  
  const removeFeatureField = (idx) => { 
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== idx) }); 
    const newErrs = { ...formErrors };
    delete newErrs[`feature_${idx}`];
    setFormErrors(newErrs);
  };

  // 🔒 Safety Handler: Block editing if the plan is approved
  const handleEditClick = (plan) => {
    if (plan.status === 'approved') {
      alert("⚠️ Action forbidden: Approved subscription plans cannot be edited. You can only change their active/inactive status.");
      return;
    }

    setEditingItem(plan);
    const normalized = normalizeFeatures(plan.features);
    setFormData({
      name: plan.name || '',
      price: (plan.price || 0).toString(),
      credits: (plan.credits || 0).toString(),
      features: normalized.length ? normalized : [''],
      popular: Boolean(plan.popular)
    });
    setFormErrors({});
    setShowModal(true);
  };

  return (
    <div className="space-y-8 text-gray-100 font-sans relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
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

        {/* Top Action Bar */}
        <div className="flex items-center gap-3">
          <FinanceNotifications />

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

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">❌ {error}</div>}

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
                const isRejected = plan.status === 'rejected';
                const isPending = plan.status === 'pending';
                const isApproved = plan.status === 'approved';

                return (
                  <motion.div key={planId || idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
                    <GlassCard className={`p-5 border-2 relative rounded-2xl flex flex-col h-full ${
                      isRejected
                        ? 'bg-[#120a10]/80 border-rose-500/40 shadow-rose-950/20'
                        : isPending
                          ? 'bg-[#13110a]/80 border-amber-500/40 shadow-amber-950/20'
                          : isActive 
                            ? isPopular ? 'bg-[#0f1424]/90 border-purple-500/30 shadow-xl' : 'bg-[#0f1424]/90 border-white/5 hover:border-white/10' 
                            : 'bg-[#0a0d1a]/60 border-red-500/30 opacity-70'
                    }`}>
                      {isPopular && !isRejected && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <span className="px-3.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                            MOST POPULAR
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-3">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                          isRejected 
                            ? 'bg-rose-500/10 border-rose-500/20' 
                            : isPending
                              ? 'bg-amber-500/10 border-amber-500/20'
                              : isActive 
                                ? 'bg-purple-500/10 border-purple-500/20' 
                                : 'bg-red-500/10 border-red-500/20'
                        }`}>
                          <Rocket size={18} className={
                            isRejected ? "text-rose-400" : isPending ? "text-amber-400" : isActive ? "text-purple-400" : "text-red-400/60"
                          } />
                        </div>

                        {/* Status Badges */}
                        {isRejected ? (
                          <span className="text-[10px] bg-rose-500/20 border border-rose-500/40 text-rose-400 px-2 py-0.5 rounded font-mono font-bold tracking-wider">
                            REJECTED
                          </span>
                        ) : isPending ? (
                          <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded font-mono font-bold tracking-wider animate-pulse">
                            PENDING REVIEW
                          </span>
                        ) : !isActive ? (
                          <span className="text-[10px] bg-red-500/20 border border-red-500/40 text-red-400 px-2 py-0.5 rounded font-mono font-bold tracking-wider">
                            INACTIVE
                          </span>
                        ) : null}
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

                      {/* 🎯 Action Toggle Button Section */}
                      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/5">
                        <button 
                          onClick={() => togglePlanStatus(planId, isActive, plan.status)} 
                          disabled={isRejected || isPending}
                          title={
                            isRejected 
                              ? "Admin rejected this plan. Click Edit to resolve issues and resubmit." 
                              : isPending 
                                ? "Awaiting Admin approval before activation." 
                                : ""
                          }
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                            isRejected
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 cursor-not-allowed opacity-90'
                              : isPending
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 cursor-not-allowed opacity-90'
                                : isActive 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer' 
                                  : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30 cursor-pointer'
                          }`}
                        >
                          {isRejected 
                            ? 'Rejected (Edit Required)' 
                            : isPending 
                              ? 'Pending Admin Approval' 
                              : isActive 
                                ? 'Active' 
                                : 'Inactive'}
                        </button>
                        
                        {/* 🔒 Approved plans Edit Button Guard */}
                        {!isApproved ? (
                          <button onClick={() => handleEditClick(plan)} className="p-2 bg-white/5 border border-white/5 rounded-lg text-gray-400 hover:text-white cursor-pointer" title="Edit Plan">
                            <Edit size={15} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => alert("⚠️ Approved subscription plans cannot be edited. You can only change their active/inactive status.")} 
                            className="p-2 bg-white/5 border border-white/5 rounded-lg text-gray-600 cursor-not-allowed opacity-50" 
                            title="Approved plans cannot be edited"
                          >
                            <Edit size={15} />
                          </button>
                        )}

                        <button onClick={() => deletePlan(planId)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 cursor-pointer" title="Delete Plan">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL */}
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
                {/* Plan Name Field */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Plan Name *</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                    }} 
                    className={`w-full bg-slate-950/60 border ${formErrors.name ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors`}
                    placeholder="e.g. ULTIMATE VIP" 
                  />
                  {formErrors.name && (
                    <p className="text-red-400 text-xs mt-1 font-medium">{formErrors.name}</p>
                  )}
                </div>

                {/* Price & Credits Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Price (LKR) *</label>
                    <input 
                      type="number" 
                      step="any"
                      value={formData.price} 
                      onChange={e => {
                        setFormData({ ...formData, price: e.target.value });
                        if (formErrors.price) setFormErrors({ ...formErrors, price: null });
                      }} 
                      className={`w-full bg-slate-950/60 border ${formErrors.price ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors`}
                      placeholder="e.g. 5000" 
                    />
                    {formErrors.price && (
                      <p className="text-red-400 text-xs mt-1 font-medium">{formErrors.price}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Monthly Credits *</label>
                    <input 
                      type="number" 
                      value={formData.credits} 
                      onChange={e => {
                        setFormData({ ...formData, credits: e.target.value });
                        if (formErrors.credits) setFormErrors({ ...formErrors, credits: null });
                      }} 
                      className={`w-full bg-slate-950/60 border ${formErrors.credits ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors`}
                      placeholder="e.g. 600" 
                    />
                    {formErrors.credits && (
                      <p className="text-red-400 text-xs mt-1 font-medium">{formErrors.credits}</p>
                    )}
                  </div>
                </div>

                {/* Features Field */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Features *</label>
                    <button onClick={addFeatureField} type="button" className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1 font-bold cursor-pointer">
                      <Plus size={14} /> Add Line
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {formData.features.map((feat, index) => (
                      <div key={index} className="flex flex-col gap-1">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={feat} 
                            onChange={e => handleFeatureChange(index, e.target.value)} 
                            className={`flex-1 bg-slate-950/60 border ${formErrors[`feature_${index}`] ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-purple-500`}
                            placeholder={`Feature #${index + 1}`} 
                          />
                          <button onClick={() => removeFeatureField(index)} type="button" className="p-2 hover:bg-red-500/10 rounded-xl text-red-400 cursor-pointer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {formErrors[`feature_${index}`] && (
                          <p className="text-red-400 text-[11px] font-medium">{formErrors[`feature_${index}`]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {formErrors.features && (
                    <p className="text-red-400 text-xs mt-1 font-medium">{formErrors.features}</p>
                  )}
                </div>

                {/* Most Popular Checkbox */}
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

                {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-red-400 text-xs">❌ {error}</div>}

                <button 
                  type="button" 
                  disabled={savingPlan} 
                  onClick={editingItem ? updatePlan : addPlan} 
                  className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl text-xs font-bold text-white mt-4 cursor-pointer flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-purple-500/20 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPlan ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  <span>{editingItem ? (editingItem.status === 'rejected' ? 'Save & Resubmit to Admin' : 'Save Changes') : 'Create Subscription Plan'}</span>
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