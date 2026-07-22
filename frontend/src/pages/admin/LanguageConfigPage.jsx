import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Plus, Layers, ShieldAlert, Loader, CheckCircle,
  AlertCircle, X, ChevronRight, Zap, User,
  Search, Filter, RefreshCw, Award, TrendingUp,
  Power, Trash2, AlertTriangle, Percent, Settings,
  Target, BarChart3, Sliders, ListChecks, Eye
} from 'lucide-react';
import {
  fetchLanguageSchema,
  createLanguageCategory,
  createCategoryLevel,
  updateCategoryStatus,
  deleteCategory
} from '../../services/languageService';
import GlassCard from '/src/components/ui/GlassCard';
import Button from '/src/components/ui/Button';
import axios from 'axios';

// ------------------------------------------------------------------------------
// API Configuration
// ------------------------------------------------------------------------------
const API_URL = 'http://localhost:5000/api/languages';

// ✅ Auth config helper (defined here since it's not exported from languageService)
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  console.log('🔑 getAuthConfig called, token:', token ? 'present' : 'missing');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// ------------------------------------------------------------------------------
// Passing Type Configuration Constants
// ------------------------------------------------------------------------------
const PASSING_TYPES = [
  { 
    value: 'TOTAL_AND_SECTION', 
    label: 'JLPT (Total + Section)', 
    description: 'Check total score AND each section minimum',
    icon: BarChart3,
    color: 'blue'
  },
  { 
    value: 'CUT_OFF_SCORE', 
    label: 'EPS-TOPIK (Cut-off)', 
    description: 'Compare total score with cut-off score',
    icon: Target,
    color: 'amber'
  },
  { 
    value: 'LEVEL_RANGE', 
    label: 'TOPIK I (Level Range)', 
    description: 'Determine level from score range',
    icon: Layers,
    color: 'purple'
  },
  { 
    value: 'SIMPLE_PERCENTAGE', 
    label: 'Simple Percentage', 
    description: 'Simple pass/fail based on percentage',
    icon: Percent,
    color: 'gray'
  }
];

// ------------------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------------------
export default function LanguageConfigPage() {
  // State
  const [schema, setSchema] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isLvlModalOpen, setIsLvlModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [activeLevelId, setActiveLevelId] = useState('');
  const [configMode, setConfigMode] = useState('category'); // 'category' or 'level'

  const [catForm, setCatForm] = useState({ 
    category_name: '', 
    language: '',
    passing_type: 'TOTAL_AND_SECTION',
    passing_config: {
      overallPassScore: 80,
      sections: [
        { name: 'Language Knowledge + Reading', minimumScore: 38 },
        { name: 'Listening', minimumScore: 19 }
      ]
    }
  });

  const [lvlForm, setLvlForm] = useState({ 
    level_name: '', 
    credit_cost: 15,
    passing_type: '',
    passing_config: {}
  });

  // Config form state
  const [configForm, setConfigForm] = useState({
    passingType: 'TOTAL_AND_SECTION',
    passingConfig: {}
  });

  const [error, setError] = useState('');

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState({ show: false, categoryId: null, categoryName: '' });

  // ----------------------------------------------------------------------------
  // Helper: Toast notifications
  // ----------------------------------------------------------------------------
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // ----------------------------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------------------------
  const syncLanguageSchema = async () => {
    try {
      setLoading(true);
      const data = await fetchLanguageSchema();
      if (data.success) {
        setSchema(data.schema);
      }
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to resolve database structural mapping.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncLanguageSchema();
  }, []);

  // ----------------------------------------------------------------------------
  // Category CRUD
  // ----------------------------------------------------------------------------
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setError('');
    if (!catForm.category_name.trim() || !catForm.language.trim()) {
      return setError('All structural fields are mandatory.');
    }

    try {
      const data = await createLanguageCategory({
        category_name: catForm.category_name,
        language: catForm.language,
        passing_type: catForm.passing_type,
        passing_config: catForm.passing_config
      });
      if (data.success) {
        setIsCatModalOpen(false);
        setCatForm({ 
          category_name: '', 
          language: '',
          passing_type: 'TOTAL_AND_SECTION',
          passing_config: {
            overallPassScore: 80,
            sections: [
              { name: 'Language Knowledge + Reading', minimumScore: 38 },
              { name: 'Listening', minimumScore: 19 }
            ]
          }
        });
        showNotification('New system language boundary deployed successfully.');
        syncLanguageSchema();
      }
    } catch (err) {
      setError(err.message || 'Execution node error.');
    }
  };

  const handleToggleStatus = async (categoryId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const result = await updateCategoryStatus(categoryId, newStatus);
      if (result.success) {
        setSchema((prev) =>
          prev.map((cat) =>
            cat.id === categoryId ? { ...cat, status: newStatus } : cat
          )
        );
        showNotification(`Category ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
      }
    } catch (err) {
      showNotification('Failed to update category status.', 'error');
    }
  };

  const handleRestoreCategory = async (categoryId) => {
    try {
      const result = await updateCategoryStatus(categoryId, 'inactive');
      if (result.success) {
        setSchema((prev) =>
          prev.map((cat) =>
            cat.id === categoryId ? { ...cat, status: 'inactive' } : cat
          )
        );
        showNotification('Category restored successfully. You can now activate it.', 'success');
      }
    } catch (err) {
      showNotification('Failed to restore category.', 'error');
    }
  };

  const handleDeleteCategory = async () => {
    const { categoryId } = confirmDelete;
    if (!categoryId) return;
    try {
      const result = await deleteCategory(categoryId);
      if (result.success) {
        setSchema((prev) => prev.filter((cat) => cat.id !== categoryId));
        setConfirmDelete({ show: false, categoryId: null, categoryName: '' });
        showNotification('Category archived successfully. It can be restored later.', 'success');
      }
    } catch (err) {
      showNotification('Failed to archive category.', 'error');
    }
  };

  // ----------------------------------------------------------------------------
  // Level management
  // ----------------------------------------------------------------------------
  const handleCreateLevel = async (e) => {
    e.preventDefault();
    setError('');
    if (!lvlForm.level_name.trim()) return setError('Level assignment title is required.');

    try {
      const data = await createCategoryLevel(activeCategoryId, {
        level_name: lvlForm.level_name,
        credit_cost: lvlForm.credit_cost,
        passing_type: lvlForm.passing_type || undefined,
        passing_config: lvlForm.passing_config || {}
      });
      if (data.success) {
        setIsLvlModalOpen(false);
        setLvlForm({ level_name: '', credit_cost: 15, passing_type: '', passing_config: {} });
        showNotification('Dynamic level schema bound under target matrix.');
        syncLanguageSchema();
      }
    } catch (err) {
      setError(err.message || 'Execution node error.');
    }
  };

  // ----------------------------------------------------------------------------
  // Open Config Modal
  // ----------------------------------------------------------------------------
  const openConfigModal = (categoryId, levelId = null) => {
    const category = schema.find(c => c.id === categoryId);
    if (!category) return;

    setActiveCategoryId(categoryId);
    setActiveLevelId(levelId);
    setConfigMode(levelId ? 'level' : 'category');

    if (levelId) {
      // Level config
      const level = category.levels?.find(l => l.id === levelId);
      if (level) {
        setConfigForm({
          passingType: level.passing_type || category.passing_type || 'TOTAL_AND_SECTION',
          passingConfig: level.passing_config || category.passing_config || {}
        });
      }
    } else {
      // Category config
      setConfigForm({
        passingType: category.passing_type || 'TOTAL_AND_SECTION',
        passingConfig: category.passing_config || {}
      });
    }

    setIsConfigModalOpen(true);
  };

  // ----------------------------------------------------------------------------
  // Save Config Function
  // ----------------------------------------------------------------------------
  const handleSaveConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists?', token ? 'Yes' : 'No');
      
      if (!token) {
        showNotification('Please login again. Token missing.', 'error');
        return;
      }

      const category = schema.find(c => c.id === activeCategoryId);
      if (!category) {
        showNotification('Category not found.', 'error');
        return;
      }

      const updateData = {
        passing_type: configForm.passingType,
        passing_config: configForm.passingConfig
      };

      const url = configMode === 'level' 
        ? `${API_URL}/categories/${activeCategoryId}/levels/${activeLevelId}`
        : `${API_URL}/categories/${activeCategoryId}`;

      console.log('📤 Sending update to:', url);
      console.log('📤 Data:', updateData);

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      let response;
      if (configMode === 'level') {
        response = await axios.put(url, updateData, config);
      } else {
        response = await axios.put(url, updateData, config);
      }

      console.log('📥 Response:', response.data);

      if (response.data.success) {
        showNotification(
          configMode === 'level' 
            ? 'Level passing rules updated successfully!' 
            : 'Category passing rules updated successfully!'
        );
        setIsConfigModalOpen(false);
        syncLanguageSchema();
      } else {
        showNotification(response.data.message || 'Failed to update.', 'error');
      }
    } catch (err) {
      console.error('❌ Save error:', err);
      console.error('Response data:', err.response?.data);
      console.error('Status:', err.response?.status);
      
      if (err.response?.status === 401) {
        showNotification('Session expired. Please login again.', 'error');
      } else if (err.response?.status === 403) {
        showNotification('You do not have permission to update passing rules.', 'error');
      } else if (err.response?.status === 404) {
        showNotification('Category or Level not found. Please refresh and try again.', 'error');
      } else if (err.response?.status === 400) {
        showNotification(err.response?.data?.message || 'Invalid data format.', 'error');
      } else if (err.response?.status === 500) {
        showNotification('Server error. Please check backend logs.', 'error');
      } else {
        showNotification(err.response?.data?.message || 'Failed to update passing rules. Please try again.', 'error');
      }
    }
  };

  // ----------------------------------------------------------------------------
  // Render Passing Type Badge
  // ----------------------------------------------------------------------------
  const renderPassingTypeBadge = (passingType) => {
    const type = PASSING_TYPES.find(t => t.value === passingType);
    if (!type) return <span className="text-[10px] text-gray-500">Not configured</span>;
    
    const colorMap = {
      'blue': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'amber': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'purple': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'gray': 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${colorMap[type.color]}`}>
        {type.label}
      </span>
    );
  };

  // ----------------------------------------------------------------------------
  // Render Config Summary
  // ----------------------------------------------------------------------------
  const renderConfigSummary = (passingType, passingConfig) => {
    if (!passingType) return <span className="text-xs text-gray-500">Not configured</span>;

    switch(passingType) {
      case 'TOTAL_AND_SECTION':
        const overall = passingConfig?.overallPassScore || 80;
        const sections = passingConfig?.sections || [];
        return (
          <div className="text-xs text-gray-400">
            <span className="text-emerald-400">Overall: {overall}%</span>
            {sections.map((s, i) => (
              <span key={i} className="ml-2 text-gray-500">
                {s.name}: <span className="text-blue-400">{s.minimumScore}%</span>
              </span>
            ))}
          </div>
        );
      
      case 'CUT_OFF_SCORE':
        return (
          <span className="text-xs text-amber-400">
            Cut-off: {passingConfig?.cutOffScore || 65}%
          </span>
        );
      
      case 'LEVEL_RANGE':
        const ranges = passingConfig?.ranges || [];
        return (
          <div className="text-xs text-gray-400 flex gap-1 flex-wrap">
            {ranges.map((r, i) => (
              <span key={i} className={`px-1.5 py-0.5 rounded ${r.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                {r.min}-{r.max}: {r.level}
              </span>
            ))}
          </div>
        );
      
      default:
        return <span className="text-xs text-gray-500">Default configuration</span>;
    }
  };

  // ----------------------------------------------------------------------------
  // Metrics & filtering
  // ----------------------------------------------------------------------------
  const totalLanguages = new Set(schema.map((c) => c.language)).size;
  const totalActiveExams = schema.filter((c) => c.status === 'active').length;
  const totalLevels = schema.reduce((acc, curr) => acc + (curr.levels?.length || 0), 0);
  const avgCredits = (() => {
    if (totalLevels === 0) return '—';
    const totalCredits = schema.reduce(
      (acc, curr) => acc + curr.levels.reduce((s, l) => s + l.credit_cost, 0),
      0
    );
    return (totalCredits / totalLevels).toFixed(0);
  })();

  const filteredSchema = schema.filter((cat) => {
    if (
      searchTerm &&
      !cat.category_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !cat.language.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    if (statusFilter !== 'all' && cat.status !== statusFilter) return false;
    return true;
  });

  // ----------------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------------
  return (
    <div className="space-y-8 selection:bg-blue-500/30">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
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
            <div
              className={`p-1.5 rounded-xl border ${
                toast.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-rose-500/10 border-rose-500/20'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle size={18} className="text-emerald-400" />
              ) : (
                <AlertCircle size={18} className="text-rose-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider opacity-60">Config Hub</p>
              <p className="text-sm font-medium mt-0.5 leading-tight">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast((p) => ({ ...p, show: false }))}
              className="text-gray-400 hover:text-white p-1"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Language Cluster Configuration</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Configure global metadata frameworks, dynamic level tokens, passing scores, and exam rules
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
            onClick={syncLanguageSchema}
          >
            <RefreshCw size={14} className="mr-1" /> Sync
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsCatModalOpen(true)}
            className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:shadow-blue-500/20 shadow-md text-xs font-bold tracking-wide py-2.5 px-4 rounded-xl text-white transition-all"
          >
            <Plus size={15} className="group-hover:scale-110 transition-transform" />
            <span>Deploy Language Scope</span>
          </Button>
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
        {[
          {
            label: 'Total Languages',
            value: totalLanguages,
            icon: Globe,
            color: 'text-blue-500 bg-blue-500/5 border-blue-500/10',
            sub: 'Distinct cores',
          },
          {
            label: 'Active Exams',
            value: totalActiveExams,
            icon: Award,
            color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10',
            sub: 'Active frameworks',
          },
          {
            label: 'Level Tiers',
            value: totalLevels,
            icon: Layers,
            color: 'text-purple-500 bg-purple-500/5 border-purple-500/10',
            sub: 'Dynamic nodes',
          },
          {
            label: 'Avg Credits / Level',
            value: avgCredits,
            icon: TrendingUp,
            color: 'text-amber-500 bg-amber-500/5 border-amber-500/10',
            sub: 'Per entry token',
          },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard className="p-4 flex items-center gap-4 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm hover:scale-[1.01] transition-all">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${s.color}`}>
                <s.icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {loading ? '...' : s.value}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                  {s.label}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{s.sub}</div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Search and Filter Bar */}
      <GlassCard className="p-5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl">
        <div className="flex flex-col gap-4 mb-5">
          <div className="relative w-full">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Search by language name or scope..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
              <Filter size={12} /> Status:
            </span>
            {['all', 'active', 'inactive', 'deleted'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Main Framework View Panel */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
            <Loader className="animate-spin text-blue-500" size={24} />
            <span className="animate-pulse text-xs font-medium uppercase tracking-wider">
              Synchronizing System Matrix...
            </span>
          </div>
        ) : filteredSchema.length === 0 ? (
          <GlassCard className="p-16 text-center border-white/5 bg-slate-900/10">
            <Globe size={36} className="text-slate-600 mx-auto mb-3 animate-pulse" />
            <h3 className="text-sm font-bold text-white">No Matching Framework Nodes</h3>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search or filters, or deploy a new language scope.
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSchema.map((cat, index) => {
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard className="p-6 relative transition-all border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/5 group">
                    <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white">{cat.category_name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-blue-400 font-mono">ID: {cat.id}</span>
                          <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-gray-300">
                            {cat.language}
                          </span>
                          {/* ✅ Show Passing Type */}
                          {cat.passing_type && renderPassingTypeBadge(cat.passing_type)}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 border rounded-md uppercase font-semibold ${
                          cat.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : cat.status === 'deleted'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}
                      >
                        {cat.status}
                      </span>
                    </div>

                    {/* ✅ Category Config Summary */}
                    <div className="mb-3 p-2 bg-white/5 rounded-lg border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                          <Settings size={12} className="text-blue-400" />
                          Passing Rules
                        </span>
                        <button
                          onClick={() => openConfigModal(cat.id)}
                          className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                          <Eye size={12} /> Configure
                        </button>
                      </div>
                      {renderConfigSummary(cat.passing_type, cat.passing_config)}
                    </div>

                    <div className="space-y-2 mb-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        <Layers size={13} className="text-purple-400" /> Active Level Layers
                        {cat.levels?.length > 0 && (
                          <span className="text-[9px] text-gray-500 font-normal ml-1">
                            (Levels can override passing rules)
                          </span>
                        )}
                      </h4>
                      {cat.levels?.length === 0 ? (
                        <p className="text-xs text-gray-500 italic pl-1">
                          No operational metrics bounds mapped yet.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                          {cat.levels.map((lvl) => {
                            const hasCustomConfig = lvl.passing_type && lvl.passing_type !== cat.passing_type;
                            
                            return (
                              <div
                                key={lvl.id}
                                className="flex justify-between items-center bg-white/5 p-3 rounded-xl text-xs font-medium border border-white/5 group-hover:border-white/10 transition-colors"
                              >
                                <span className="text-gray-300 flex items-center gap-1">
                                  <ChevronRight size={12} className="text-blue-500" /> {lvl.level_name}
                                </span>
                                <div className="flex items-center gap-2">
                                  {/* ✅ Level passing type indicator */}
                                  {hasCustomConfig ? (
                                    <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[9px] font-medium">
                                      Custom
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-gray-500/10 border border-gray-500/20 text-gray-400 rounded text-[9px] font-medium">
                                      Inherited
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-md text-[10px] font-bold font-mono">
                                    {lvl.credit_cost} Credits
                                  </span>
                                  {/* ✅ Level Config Button */}
                                  <button
                                    onClick={() => openConfigModal(cat.id, lvl.id)}
                                    className="p-1 bg-white/5 hover:bg-blue-500/10 rounded-lg transition-colors"
                                    title="Configure level passing rules"
                                  >
                                    <Settings size={12} className="text-gray-400 hover:text-blue-400" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 border-t border-white/5 pt-4 justify-between items-center flex-wrap">
                      <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                        <User size={11} /> {cat.created_by ? cat.created_by.split('@')[0] : 'system'}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Toggle status button */}
                        {cat.status !== 'deleted' && (
                          <button
                            onClick={() => handleToggleStatus(cat.id, cat.status)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                              cat.status === 'active'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            }`}
                          >
                            <Power size={12} />
                            {cat.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}

                        {/* Archive button */}
                        {cat.status !== 'deleted' && (
                          <button
                            onClick={() =>
                              setConfirmDelete({ show: true, categoryId: cat.id, categoryName: cat.category_name })
                            }
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-500/20 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                          >
                            <Trash2 size={12} />
                            Archive
                          </button>
                        )}

                        {/* Restore button */}
                        {cat.status === 'deleted' && (
                          <button
                            onClick={() => handleRestoreCategory(cat.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-emerald-500/20 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                          >
                            <RefreshCw size={12} className="rotate-180" />
                            Restore
                          </button>
                        )}

                        {/* Add Level Tier button */}
                        {cat.status !== 'deleted' && (
                          <button
                            onClick={() => {
                              setActiveCategoryId(cat.id);
                              setIsLvlModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-blue-500/10 group-hover:border-blue-500/30"
                          >
                            <Plus size={14} /> Add Level
                          </button>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* --- MODAL: Add Language Scope --- */}
      <AnimatePresence>
        {isCatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <GlassCard className="w-full max-w-2xl p-6 bg-white dark:bg-[#070c19] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl relative max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-white/5 pb-4 sticky top-0 bg-white dark:bg-[#070c19] z-10">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="text-blue-500" size={18} /> Deploy Language Scope
                  </h3>
                  <button
                    onClick={() => setIsCatModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateCategory} className="space-y-4">
                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
                      <ShieldAlert size={15} /> {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                      Category Display Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Japanese Language (JLPT)"
                      value={catForm.category_name}
                      onChange={(e) => setCatForm({ ...catForm, category_name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                      Target Language Core
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Japanese"
                      value={catForm.language}
                      onChange={(e) => setCatForm({ ...catForm, language: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* ✅ Passing Type Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                      Passing Type
                    </label>
                    <select
                      value={catForm.passing_type}
                      onChange={(e) => {
                        const type = e.target.value;
                        let config = {};
                        if (type === 'TOTAL_AND_SECTION') {
                          config = {
                            overallPassScore: 80,
                            sections: [
                              { name: 'Language Knowledge + Reading', minimumScore: 38 },
                              { name: 'Listening', minimumScore: 19 }
                            ]
                          };
                        } else if (type === 'CUT_OFF_SCORE') {
                          config = { cutOffScore: 65 };
                        } else if (type === 'LEVEL_RANGE') {
                          config = {
                            ranges: [
                              { min: 0, max: 79, level: 'No Level', passed: false },
                              { min: 80, max: 139, level: 'Level 1', passed: true },
                              { min: 140, max: 200, level: 'Level 2', passed: true }
                            ]
                          };
                        } else {
                          config = { passingScore: 65 };
                        }
                        setCatForm({ ...catForm, passing_type: type, passing_config: config });
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {PASSING_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label} - {type.description}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-500">
                      Select the passing rule type for this category
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCatModalOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="success"
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm"
                    >
                      Commit Scope Node
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: Add Level Tier --- */}
      <AnimatePresence>
        {isLvlModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <GlassCard className="w-full max-w-lg p-6 bg-white dark:bg-[#070c19] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl relative max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-white/5 pb-4 sticky top-0 bg-white dark:bg-[#070c19] z-10">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="text-purple-500" size={18} /> Append Level Tier Mapping
                  </h3>
                  <button
                    onClick={() => setIsLvlModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateLevel} className="space-y-4">
                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
                      <ShieldAlert size={15} /> {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                      Level Tier Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., JLPT N4"
                      value={lvlForm.level_name}
                      onChange={(e) => setLvlForm({ ...lvlForm, level_name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                      Credit Cost
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="e.g., 15"
                      value={lvlForm.credit_cost}
                      onChange={(e) => setLvlForm({ ...lvlForm, credit_cost: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* ✅ Option to override passing rules */}
                  <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                    <p className="text-[10px] text-blue-400 font-medium flex items-center gap-1">
                      <Settings size={12} />
                      Level Passing Rules
                    </p>
                    <p className="text-[9px] text-gray-500 mt-1">
                      By default, this level inherits the category's passing rules.
                      You can configure custom rules later using the "Configure" button on the level.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-center">
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                      Credit valuation pending approval from Finance Admin.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsLvlModalOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="success"
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm"
                    >
                      Authorize Mapping
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: Configure Passing Rules --- */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <GlassCard className="w-full max-w-2xl p-6 bg-white dark:bg-[#070c19] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl relative max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-white/5 pb-4 sticky top-0 bg-white dark:bg-[#070c19] z-10">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings className="text-blue-500" size={18} />
                    Configure Passing Rules
                    <span className="text-xs font-normal text-gray-500">
                      ({configMode === 'category' ? 'Category' : 'Level'} Level)
                    </span>
                  </h3>
                  <button
                    onClick={() => setIsConfigModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Passing Type Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                      Passing Type
                    </label>
                    <select
                      value={configForm.passingType}
                      onChange={(e) => {
                        const type = e.target.value;
                        let config = {};
                        if (type === 'TOTAL_AND_SECTION') {
                          config = {
                            overallPassScore: 80,
                            sections: [
                              { name: 'Language Knowledge + Reading', minimumScore: 38 },
                              { name: 'Listening', minimumScore: 19 }
                            ]
                          };
                        } else if (type === 'CUT_OFF_SCORE') {
                          config = { cutOffScore: 65 };
                        } else if (type === 'LEVEL_RANGE') {
                          config = {
                            ranges: [
                              { min: 0, max: 79, level: 'No Level', passed: false },
                              { min: 80, max: 139, level: 'Level 1', passed: true },
                              { min: 140, max: 200, level: 'Level 2', passed: true }
                            ]
                          };
                        } else {
                          config = { passingScore: 65 };
                        }
                        setConfigForm({ ...configForm, passingType: type, passingConfig: config });
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {PASSING_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Config based on Passing Type */}
                  {configForm.passingType === 'TOTAL_AND_SECTION' && (
                    <div className="space-y-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <h4 className="text-xs font-bold text-blue-400">JLPT Configuration</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-400">Overall Passing Score (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={configForm.passingConfig?.overallPassScore || 80}
                          onChange={(e) => setConfigForm({
                            ...configForm,
                            passingConfig: {
                              ...configForm.passingConfig,
                              overallPassScore: parseInt(e.target.value) || 80
                            }
                          })}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-400">Section Minimum Scores</label>
                        {(configForm.passingConfig?.sections || []).map((section, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={section.name}
                              onChange={(e) => {
                                const newSections = [...(configForm.passingConfig?.sections || [])];
                                newSections[index] = { ...newSections[index], name: e.target.value };
                                setConfigForm({
                                  ...configForm,
                                  passingConfig: { ...configForm.passingConfig, sections: newSections }
                                });
                              }}
                              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                              placeholder="Section name"
                            />
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={section.minimumScore}
                              onChange={(e) => {
                                const newSections = [...(configForm.passingConfig?.sections || [])];
                                newSections[index] = { ...newSections[index], minimumScore: parseInt(e.target.value) || 0 };
                                setConfigForm({
                                  ...configForm,
                                  passingConfig: { ...configForm.passingConfig, sections: newSections }
                                });
                              }}
                              className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                              placeholder="Min %"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newSections = (configForm.passingConfig?.sections || []).filter((_, i) => i !== index);
                                setConfigForm({
                                  ...configForm,
                                  passingConfig: { ...configForm.passingConfig, sections: newSections }
                                });
                              }}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const newSections = [...(configForm.passingConfig?.sections || []), { name: 'New Section', minimumScore: 30 }];
                            setConfigForm({
                              ...configForm,
                              passingConfig: { ...configForm.passingConfig, sections: newSections }
                            });
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Plus size={12} /> Add Section
                        </button>
                      </div>
                    </div>
                  )}

                  {configForm.passingType === 'CUT_OFF_SCORE' && (
                    <div className="space-y-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                      <h4 className="text-xs font-bold text-amber-400">EPS-TOPIK Configuration</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-400">Current Cut-off Score (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={configForm.passingConfig?.cutOffScore || 65}
                          onChange={(e) => setConfigForm({
                            ...configForm,
                            passingConfig: {
                              ...configForm.passingConfig,
                              cutOffScore: parseInt(e.target.value) || 65
                            }
                          })}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[9px] text-gray-500">This can be updated each recruitment cycle</p>
                      </div>
                    </div>
                  )}

                  {configForm.passingType === 'LEVEL_RANGE' && (
                    <div className="space-y-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                      <h4 className="text-xs font-bold text-purple-400">TOPIK I Configuration</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-400">Level Ranges</label>
                        {(configForm.passingConfig?.ranges || []).map((range, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="200"
                              value={range.min}
                              onChange={(e) => {
                                const newRanges = [...(configForm.passingConfig?.ranges || [])];
                                newRanges[index] = { ...newRanges[index], min: parseInt(e.target.value) || 0 };
                                setConfigForm({
                                  ...configForm,
                                  passingConfig: { ...configForm.passingConfig, ranges: newRanges }
                                });
                              }}
                              className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                              placeholder="Min"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                              type="number"
                              min="0"
                              max="200"
                              value={range.max}
                              onChange={(e) => {
                                const newRanges = [...(configForm.passingConfig?.ranges || [])];
                                newRanges[index] = { ...newRanges[index], max: parseInt(e.target.value) || 0 };
                                setConfigForm({
                                  ...configForm,
                                  passingConfig: { ...configForm.passingConfig, ranges: newRanges }
                                });
                              }}
                              className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                              placeholder="Max"
                            />
                            <input
                              type="text"
                              value={range.level}
                              onChange={(e) => {
                                const newRanges = [...(configForm.passingConfig?.ranges || [])];
                                newRanges[index] = { ...newRanges[index], level: e.target.value };
                                setConfigForm({
                                  ...configForm,
                                  passingConfig: { ...configForm.passingConfig, ranges: newRanges }
                                });
                              }}
                              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                              placeholder="Level name"
                            />
                            <select
                              value={range.passed ? 'true' : 'false'}
                              onChange={(e) => {
                                const newRanges = [...(configForm.passingConfig?.ranges || [])];
                                newRanges[index] = { ...newRanges[index], passed: e.target.value === 'true' };
                                setConfigForm({
                                  ...configForm,
                                  passingConfig: { ...configForm.passingConfig, ranges: newRanges }
                                });
                              }}
                              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                            >
                              <option value="true">PASS</option>
                              <option value="false">FAIL</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const newRanges = (configForm.passingConfig?.ranges || []).filter((_, i) => i !== index);
                                setConfigForm({
                                  ...configForm,
                                  passingConfig: { ...configForm.passingConfig, ranges: newRanges }
                                });
                              }}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const newRanges = [...(configForm.passingConfig?.ranges || []), { min: 0, max: 100, level: 'New Level', passed: false }];
                            setConfigForm({
                              ...configForm,
                              passingConfig: { ...configForm.passingConfig, ranges: newRanges }
                            });
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Plus size={12} /> Add Range
                        </button>
                      </div>
                    </div>
                  )}

                  {configForm.passingType === 'SIMPLE_PERCENTAGE' && (
                    <div className="space-y-3 p-4 bg-gray-500/5 border border-gray-500/20 rounded-xl">
                      <h4 className="text-xs font-bold text-gray-400">Simple Percentage Configuration</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-400">Passing Score (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={configForm.passingConfig?.passingScore || 65}
                          onChange={(e) => setConfigForm({
                            ...configForm,
                            passingConfig: {
                              ...configForm.passingConfig,
                              passingScore: parseInt(e.target.value) || 65
                            }
                          })}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsConfigModalOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleSaveConfig}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm"
                    >
                      Save Rules
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CONFIRM ARCHIVE MODAL --- */}
      <AnimatePresence>
        {confirmDelete.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0f1629] border border-amber-500/30 rounded-2xl p-6 shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-amber-400 mb-4">
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Archive Category?</h3>
                  <p className="text-xs text-gray-400">This action can be reversed</p>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                Are you sure you want to archive the category{' '}
                <span className="text-white font-bold">"{confirmDelete.categoryName}"</span>?
                It will be hidden from the active system but can be restored at any time.
              </p>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-xs border border-white/5 bg-white/5 hover:bg-white/10"
                  onClick={() => setConfirmDelete({ show: false, categoryId: null, categoryName: '' })}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors"
                >
                  Yes, Archive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}