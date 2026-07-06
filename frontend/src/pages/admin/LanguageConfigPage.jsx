import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Plus, Layers, ShieldAlert, Loader, CheckCircle,
  AlertCircle, X, ChevronRight, Zap, User,
  Search, Filter, RefreshCw, Award, TrendingUp,
  Power, Trash2, AlertTriangle
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
  const [activeCategoryId, setActiveCategoryId] = useState('');

  const [catForm, setCatForm] = useState({ category_name: '', language: '' });
  const [lvlForm, setLvlForm] = useState({ level_name: '', credit_cost: 15 });
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
      const data = await createLanguageCategory(catForm);
      if (data.success) {
        setIsCatModalOpen(false);
        setCatForm({ category_name: '', language: '' });
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

  // ✅ Restore a deleted category (set status back to 'inactive')
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
      const data = await createCategoryLevel(activeCategoryId, lvlForm);
      if (data.success) {
        setIsLvlModalOpen(false);
        setLvlForm({ level_name: '', credit_cost: 15 });
        showNotification('Dynamic level schema bound under target matrix.');
        syncLanguageSchema();
      }
    } catch (err) {
      setError(err.message || 'Execution node error.');
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
            Configure global metadata frameworks and dynamic level tokens
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
            {filteredSchema.map((cat, index) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-6 relative transition-all border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/5 group">
                  <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white">{cat.category_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-blue-400 font-mono">ID: {cat.id}</span>
                        <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-gray-300">
                          {cat.language}
                        </span>
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

                  <div className="space-y-2 mb-6">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <Layers size={13} className="text-purple-400" /> Active Level Layers
                    </h4>
                    {cat.levels?.length === 0 ? (
                      <p className="text-xs text-gray-500 italic pl-1">
                        No operational metrics bounds mapped yet.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {cat.levels.map((lvl) => (
                          <div
                            key={lvl.id}
                            className="flex justify-between items-center bg-white/5 p-3 rounded-xl text-xs font-medium border border-white/5 group-hover:border-white/10 transition-colors"
                          >
                            <span className="text-gray-300 flex items-center gap-1">
                              <ChevronRight size={12} className="text-blue-500" /> {lvl.level_name}
                            </span>
                            <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-md text-[10px] font-bold font-mono">
                              {lvl.credit_cost} Credits
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 border-t border-white/5 pt-4 justify-between items-center flex-wrap">
                    <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                      <User size={11} /> {cat.created_by ? cat.created_by.split('@')[0] : 'system'}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Toggle status button (hidden if deleted) */}
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

                      {/* Archive button (hidden if already deleted) */}
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

                      {/* ✅ Restore button (only for deleted categories) */}
                      {cat.status === 'deleted' && (
                        <button
                          onClick={() => handleRestoreCategory(cat.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-emerald-500/20 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                        >
                          <RefreshCw size={12} className="rotate-180" />
                          Restore
                        </button>
                      )}

                      {/* Add Level Tier button (hidden if deleted) */}
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
            ))}
          </div>
        )}
      </GlassCard>

      {/* --- MODAL: Add Language Scope --- */}
      <AnimatePresence>
        {isCatModalOpen && (
          <portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <GlassCard className="w-full max-w-lg p-6 bg-white dark:bg-[#070c19] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl relative">
                <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-white/5 pb-4">
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
          </portal>
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
              <GlassCard className="w-full max-w-lg p-6 bg-white dark:bg-[#070c19] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl relative">
                <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-white/5 pb-4">
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