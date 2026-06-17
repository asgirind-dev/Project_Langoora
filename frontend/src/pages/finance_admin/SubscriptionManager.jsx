import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Crown, Sparkles, 
  Zap, Rocket, CheckCircle, XCircle,
  DollarSign, Users, Clock, TrendingUp,
  Shield, Star, Gift, Layers,
  BookOpen, Award, Save,
  X, AlertCircle, Database, RefreshCw
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { subscriptionService } from '../../services';

const iconMap = {
  Zap: Zap,
  Rocket: Rocket,
  Crown: Crown,
  Star: Star,
  Shield: Shield
};

export default function SubscriptionManager() {
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [examCategories, setExamCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('plan');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    credits: '',
    features: [''],
    popular: false,
  });
  const [examFormData, setExamFormData] = useState({
    name: '',
    credits: '',
    exams: '',
    status: 'active'
  });

  // Load plans from API
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getPlans();
      setPlans(response.plans || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPlan = async () => {
    try {
      const planData = {
        name: formData.name,
        price: parseInt(formData.price),
        credits: parseInt(formData.credits),
        features: formData.features.filter(f => f.trim() !== ''),
        popular: formData.popular,
        color: 'from-purple-400 to-pink-500',
        icon: 'Rocket'
      };
      const response = await subscriptionService.createPlan(planData);
      if (response.success) {
        setPlans([...plans, response.plan]);
        resetForm();
      }
    } catch (error) {
      console.error('Error adding plan:', error);
    }
  };

  const updatePlan = async () => {
    try {
      const planData = {
        name: formData.name,
        price: parseInt(formData.price),
        credits: parseInt(formData.credits),
        features: formData.features.filter(f => f.trim() !== ''),
        popular: formData.popular
      };
      const response = await subscriptionService.updatePlan(editingItem.id, planData);
      if (response.success) {
        setPlans(plans.map(p => p.id === editingItem.id ? response.plan : p));
        resetForm();
      }
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  const deletePlan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      const response = await subscriptionService.deletePlan(id);
      if (response.success) {
        setPlans(plans.filter(p => p.id !== id));
        loadPlans();
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const togglePlanStatus = async (id) => {
    try {
      const response = await subscriptionService.togglePlanStatus(id);
      if (response.success) {
        setPlans(plans.map(p => 
          p.id === id ? { ...p, isActive: response.isActive } : p
        ));
        loadPlans();
      }
    } catch (error) {
      console.error('Error toggling plan:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', price: '', credits: '', features: [''], popular: false });
    setEditingItem(null);
    setShowModal(false);
  };

  const resetExamForm = () => {
    setExamFormData({ name: '', credits: '', exams: '', status: 'active' });
    setEditingItem(null);
    setShowModal(false);
  };

  const openEditPlan = (plan) => {
    setEditingItem(plan);
    setFormData({
      name: plan.name,
      price: plan.price?.toString() || '',
      credits: plan.credits?.toString() || '',
      features: plan.features || [''],
      popular: plan.popular || false
    });
    setModalType('plan');
    setShowModal(true);
  };

  const openEditExam = (exam) => {
    setModalType('exam');
    setEditingItem(exam);
    setExamFormData({
      name: exam.name,
      credits: exam.credits.toString(),
      exams: exam.exams.toString(),
      status: exam.status
    });
    setShowModal(true);
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeatureField = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const removeFeatureField = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  const toggleExamStatus = (id) => {
    setExamCategories(examCategories.map(cat => 
      cat.id === id ? { ...cat, status: cat.status === 'active' ? 'inactive' : 'active' } : cat
    ));
  };

  const deleteExamCategory = (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    setExamCategories(examCategories.filter(cat => cat.id !== id));
  };

  const addExamCategory = () => {
    const newExam = {
      id: Date.now(),
      name: examFormData.name,
      credits: parseInt(examFormData.credits),
      exams: parseInt(examFormData.exams) || 0,
      status: examFormData.status
    };
    setExamCategories([...examCategories, newExam]);
    resetExamForm();
  };

  const updateExamCategory = () => {
    setExamCategories(examCategories.map(cat => 
      cat.id === editingItem.id ? {
        ...cat,
        name: examFormData.name,
        credits: parseInt(examFormData.credits),
        exams: parseInt(examFormData.exams) || 0,
        status: examFormData.status
      } : cat
    ));
    resetExamForm();
  };

  // Stats
  const stats = [
    { label: 'Total Plans', value: plans.length, icon: Crown, color: 'text-purple-400' },
    { label: 'Active Plans', value: plans.filter(p => p.isActive !== false).length, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Total Credits', value: plans.reduce((sum, p) => sum + (p.credits || 0), 0), icon: Database, color: 'text-amber-400' },
    { label: 'Popular Plans', value: plans.filter(p => p.popular && p.isActive !== false).length, icon: Star, color: 'text-yellow-400' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={40} className="text-blue-400 animate-spin" />
          <p className="text-gray-400">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/10">
              <Crown size={22} className="text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Credit Architecture Core
            </h1>
          </div>
          <p className="text-sm text-gray-400 mt-1 ml-14">
            Configure subscription tiers and assign fixed exam valuation weights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadPlans}
            className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
          >
            <RefreshCw size={16} className="text-gray-400" />
          </motion.button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="p-4 border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className={`p-2 bg-${stat.color.split('-')[1]}/10 rounded-xl`}>
                  <stat.icon size={18} className={stat.color} />
                </div>
                <span className="text-xs text-gray-400">{stat.label}</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('plans')}
          className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'plans'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers size={16} />
          Subscription Plans ({plans.length})
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('exams')}
          className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'exams'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Award size={16} />
          Exam Category Credit Fixer ({examCategories.length})
        </motion.button>
      </div>

      {/* Content - Plans Tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'plans' ? (
          <motion.div
            key="plans"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Subscription Plans</h2>
                <p className="text-sm text-gray-400">Manage student subscription tiers and pricing</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ name: '', price: '', credits: '', features: [''], popular: false });
                  setModalType('plan');
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 flex items-center gap-2"
              >
                <Plus size={16} />
                Add Plan
              </motion.button>
            </div>

            {plans.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-6 bg-white/5 rounded-full w-fit mx-auto mb-4">
                  <Database size={48} className="text-gray-500" />
                </div>
                <p className="text-gray-400">No subscription plans found</p>
                <p className="text-sm text-gray-500 mt-1">Click "Add Plan" to create your first plan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan, index) => {
                  const Icon = iconMap[plan.icon] || Zap;
                  const isActive = plan.isActive !== false;
                  return (
                    <motion.div
                      key={plan.id || index}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -8, transition: { type: 'spring', stiffness: 300 } }}
                      className="relative group"
                    >
                      <GlassCard 
                        className={`p-6 border transition-all duration-300 hover:shadow-2xl ${
                          isActive 
                            ? 'border-white/10 hover:border-purple-500/30 hover:shadow-purple-500/10'
                            : 'border-red-500/30 opacity-70 hover:border-red-500/50 bg-red-500/[0.02]'
                        }`}
                      >
                        {!isActive && (
                          <div className="absolute top-3 right-3 px-3 py-1 bg-red-500/30 rounded-lg border border-red-500/30">
                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Inactive</span>
                          </div>
                        )}
                        
                        {plan.popular && isActive && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                              <Star size={10} /> Most Popular
                            </span>
                          </div>
                        )}

                        <div className={`flex items-start justify-between mb-4 ${!isActive ? 'opacity-50' : ''}`}>
                          <div>
                            <div className="p-3 bg-white/5 rounded-xl w-fit mb-3">
                              <Icon size={24} className={`${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                            </div>
                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                          </div>
                        </div>

                        <div className={`mb-4 ${!isActive ? 'opacity-50' : ''}`}>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">LKR {plan.price}</span>
                            <span className="text-xs text-gray-400">/month</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Sparkles size={12} className="text-amber-400" />
                            <span className="text-xs text-gray-400">{plan.credits} credits included</span>
                          </div>
                        </div>

                        <div className={`space-y-2 mb-6 ${!isActive ? 'opacity-50' : ''}`}>
                          {plan.features?.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <CheckCircle size={14} className={`${isActive ? 'text-emerald-400' : 'text-gray-500'} flex-shrink-0`} />
                              <span className={isActive ? 'text-gray-300' : 'text-gray-500'}>{feature}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => togglePlanStatus(plan.id)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                              isActive
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20'
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openEditPlan(plan)}
                            className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
                          >
                            <Edit size={16} className="text-gray-400" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => deletePlan(plan.id)}
                            className="p-2.5 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/10"
                          >
                            <Trash2 size={16} className="text-red-400" />
                          </motion.button>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="exams"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Exam Category Credit Fixer</h2>
                <p className="text-sm text-gray-400">Assign fixed credit values to each exam category</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setModalType('exam');
                  setEditingItem(null);
                  setExamFormData({ name: '', credits: '', exams: '', status: 'active' });
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 flex items-center gap-2"
              >
                <Plus size={16} />
                Add Category
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {examCategories.map((category, index) => (
                <motion.div
                  key={category.id || index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="relative group"
                >
                  <GlassCard 
                    className={`p-6 border transition-all duration-300 hover:shadow-xl ${
                      category.status === 'active'
                        ? 'border-white/10 hover:border-blue-500/30 hover:shadow-blue-500/10'
                        : 'border-red-500/20 opacity-60 hover:border-red-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="p-3 bg-blue-500/10 rounded-xl w-fit mb-3">
                          <BookOpen size={24} className="text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">{category.name}</h3>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        category.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/20 text-red-400 border border-red-500/20'
                      }`}>
                        {category.status === 'active' ? 'Active' : 'Inactive'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                        <span className="text-sm text-gray-400">Credits Required</span>
                        <span className="text-xl font-bold text-white">{category.credits}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                        <span className="text-sm text-gray-400">Total Exams</span>
                        <span className="text-lg font-semibold text-white">{category.exams}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleExamStatus(category.id)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                          category.status === 'active'
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20'
                        }`}
                      >
                        {category.status === 'active' ? 'Active' : 'Inactive'}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openEditExam(category)}
                        className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
                      >
                        <Edit size={16} className="text-gray-400" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => deleteExamCategory(category.id)}
                        className="p-2.5 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/10"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </motion.button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-[#0f1629] to-[#1a1f3a] border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {modalType === 'plan' 
                      ? (editingItem ? 'Edit Plan' : 'Add New Plan')
                      : (editingItem ? 'Edit Exam Category' : 'Add Exam Category')
                    }
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {modalType === 'plan' 
                      ? 'Configure subscription tier details'
                      : 'Set credit value for exam category'
                    }
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowModal(false)}
                  className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X size={18} className="text-gray-400" />
                </motion.button>
              </div>

              {modalType === 'plan' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Plan Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500/50 focus:outline-none transition-colors text-sm"
                      placeholder="e.g. Pro"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Price (LKR)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500/50 focus:outline-none transition-colors text-sm"
                      placeholder="e.g. 2500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Credits per Month</label>
                    <input
                      type="number"
                      value={formData.credits}
                      onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500/50 focus:outline-none transition-colors text-sm"
                      placeholder="e.g. 100"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Features</label>
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => handleFeatureChange(index, e.target.value)}
                          className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500/50 focus:outline-none transition-colors text-sm"
                          placeholder="e.g. 24/7 Support"
                        />
                        {formData.features.length > 1 && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeFeatureField(index)}
                            className="p-2.5 bg-red-500/20 rounded-xl hover:bg-red-500/30 transition-colors"
                          >
                            <X size={16} className="text-red-400" />
                          </motion.button>
                        )}
                      </div>
                    ))}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addFeatureField}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Feature
                    </motion.button>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-400">Popular Plan</label>
                    <input
                      type="checkbox"
                      checked={formData.popular}
                      onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                      className="w-4 h-4 accent-purple-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Category Name</label>
                    <input
                      type="text"
                      value={examFormData.name}
                      onChange={(e) => setExamFormData({ ...examFormData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500/50 focus:outline-none transition-colors text-sm"
                      placeholder="e.g. JLPT N5"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Credits Required</label>
                    <input
                      type="number"
                      value={examFormData.credits}
                      onChange={(e) => setExamFormData({ ...examFormData, credits: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500/50 focus:outline-none transition-colors text-sm"
                      placeholder="e.g. 20"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Total Exams in Category</label>
                    <input
                      type="number"
                      value={examFormData.exams}
                      onChange={(e) => setExamFormData({ ...examFormData, exams: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500/50 focus:outline-none transition-colors text-sm"
                      placeholder="e.g. 12"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Status</label>
                    <select
                      value={examFormData.status}
                      onChange={(e) => setExamFormData({ ...examFormData, status: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500/50 focus:outline-none transition-colors text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors text-sm"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (modalType === 'plan') {
                      editingItem ? updatePlan() : addPlan();
                    } else {
                      editingItem ? updateExamCategory() : addExamCategory();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                >
                  <Save size={16} />
                  {editingItem ? 'Update' : 'Create'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}