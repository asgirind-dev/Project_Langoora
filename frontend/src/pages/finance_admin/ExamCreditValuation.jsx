import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, Coins, ChevronDown, History, Save, RefreshCw, X, Loader2, Trash, CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import CreditValuationService from "../../services/CreditValuationService";

function ExamCreditValuation() {
  const [allLevels, setAllLevels] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [tempCredits, setTempCredits] = useState({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [creditHistory, setCreditHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  const isCategoryDeleted = (cat) => cat.status === 'deleted';

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // ✅ FIXED: SubscriptionService වෙනුවට CreditValuationService භාවිත කිරීම
      const levelsData = await CreditValuationService.getCategories();
      setAllLevels(levelsData || []);
      const uniqueCategories = [...new Set((levelsData || []).map(l => l.categoryId))];
      if (uniqueCategories.length > 0 && !selectedCategory) {
        setSelectedCategory(uniqueCategories[0]);
      }
      fetchCreditHistory();
    } catch (error) {
      console.error("Error fetching credit levels:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditHistory = async () => {
    setLoadingHistory(true);
    try {
      // ✅ FIXED: SubscriptionService වෙනුවට CreditValuationService භාවිත කිරීම
      const data = await CreditValuationService.getCreditHistory();
      if (Array.isArray(data)) setCreditHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const clearCreditHistory = async () => {
    if (!window.confirm('⚠️ Are you sure you want to clear ALL credit history logs?')) return;
    setClearingHistory(true);
    try {
      // ✅ FIXED: SubscriptionService වෙනුවට CreditValuationService භාවිත කිරීම
      await CreditValuationService.clearCreditHistory();
      setCreditHistory([]);
      alert('✅ Credit history cleared successfully!');
    } catch (error) {
      alert('❌ Failed to clear history.');
    } finally {
      setClearingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleUpdateLevel = async (categoryId, levelId, currentCredit, levelName) => {
    const creditToUpdate = tempCredits[levelId] !== undefined ? tempCredits[levelId] : currentCredit;
    const parentCategory = allLevels.find(l => l.categoryId === categoryId);
    const parentName = parentCategory ? parentCategory.categoryName : '';
    const fullExamName = parentName ? `${parentName} - ${levelName}` : levelName;

    try {
      setLoading(true);
      // ✅ FIXED: SubscriptionService වෙනුවට CreditValuationService භාවිත කිරීම
      await CreditValuationService.updateLevelCredits(categoryId, levelId, parseInt(creditToUpdate) || 0);
      setAllLevels(allLevels.map((lvl) =>
        lvl.id === levelId && lvl.categoryId === categoryId 
          ? { ...lvl, credits: parseInt(creditToUpdate) || 0 } 
          : lvl
      ));
      setCreditHistory(prev => [{
        id: `local_${Date.now()}`,
        examName: fullExamName,
        previousCredits: parseInt(currentCredit) || 0,
        newCredits: parseInt(creditToUpdate) || 0,
        updatedAt: new Date().toISOString()
      }, ...prev]);

      setTempCredits((prev) => {
        const updated = { ...prev };
        delete updated[levelId];
        return updated;
      });

      alert(`✅ Credits for ${levelName} updated successfully!`);
    } catch (error) {
      alert('❌ Failed to update level credits.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (categoryId, currentCredit, categoryName) => {
    const creditToUpdate = tempCredits[categoryId] !== undefined ? tempCredits[categoryId] : currentCredit;
    try {
      setLoading(true);
      // ✅ FIXED: SubscriptionService වෙනුවට CreditValuationService භාවිත කිරීම
      await CreditValuationService.updateCategoryCredits(categoryId, parseInt(creditToUpdate) || 0);
      setAllLevels(allLevels.map((lvl) =>
        lvl.id === categoryId && lvl.categoryId === categoryId 
          ? { ...lvl, credits: parseInt(creditToUpdate) || 0 } 
          : lvl
      ));
      setCreditHistory(prev => [{
        id: `local_${Date.now()}`,
        examName: categoryName,
        previousCredits: parseInt(currentCredit) || 0,
        newCredits: parseInt(creditToUpdate) || 0,
        updatedAt: new Date().toISOString()
      }, ...prev]);

      setTempCredits((prev) => {
        const updated = { ...prev };
        delete updated[categoryId];
        return updated;
      });

      alert(`✅ Credits for ${categoryName} updated successfully!`);
    } catch (error) {
      alert('❌ Failed to update category credits.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-gray-100 font-sans relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-20 right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/20 shadow-lg shadow-amber-500/5">
              <Coins size={24} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">
                  Exam Level Credit Valuation
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wider">
                  Weightings
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Assign required token/credit weights for individual exam sub-levels</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData} 
            className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-gray-300 hover:text-white cursor-pointer active:scale-95 shadow-sm"
            title="Refresh Credit Levels"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => {
              fetchCreditHistory();
              setShowHistoryModal(true);
            }} 
            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:opacity-95 transition-all cursor-pointer border border-white/10"
          >
            <History size={16} /> Audit Logs
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-[#0f1424] to-[#0b0e1b] p-4 rounded-2xl border border-white/10 shadow-xl gap-4">
        <div className="flex items-center gap-2.5">
          <Award size={18} className="text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Active Exam Category</span>
        </div>
        <div className="relative">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="appearance-none bg-slate-950/80 text-white border border-white/10 px-5 py-2.5 pr-10 rounded-xl text-xs font-bold cursor-pointer shadow-inner min-w-[220px] focus:outline-none focus:border-amber-500/50 transition-colors"
          >
            {getUniqueCategories().map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name.toUpperCase()}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 space-y-4">
          <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20 animate-bounce">
            <Loader2 className="animate-spin text-amber-400" size={28} />
          </div>
          <span className="text-sm font-medium tracking-wide">Fetching Credit Levels...</span>
        </div>
      ) : (
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
                  <GlassCard className={`p-6 relative border rounded-2xl flex flex-col justify-between transition-all duration-300 group hover:shadow-2xl ${
                    isDeleted 
                      ? 'border-red-500/30 bg-red-950/10' 
                      : 'border-white/10 hover:border-amber-500/30 bg-[#0d1222]/90 shadow-lg'
                  }`}>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className={`text-lg font-extrabold tracking-tight ${isDeleted ? 'text-gray-500' : 'text-white'}`}>
                            {displayName.toUpperCase()}
                          </h3>
                          {parentName && (
                            <span className="text-[11px] text-purple-400 font-semibold mt-0.5 block flex items-center gap-1">
                              <Sparkles size={11} /> {parentName}
                            </span>
                          )}
                        </div>
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wider border ${
                          isDeleted 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isDeleted ? 'DELETED' : 'ACTIVE'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-black/40 rounded-xl p-3 mb-6 border border-white/5 group-hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2">
                          <Coins size={16} className="text-amber-400" />
                          <span className="text-xs font-bold text-gray-300">Credits Required</span>
                        </div>
                        <input 
                          type="number" min="0" disabled={isDeleted}
                          value={tempCredits[item.id] !== undefined ? tempCredits[item.id] : (item.credits || 0)} 
                          onChange={(e) => handleCreditChange(item.id, e.target.value)}
                          className="w-20 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-sm font-extrabold text-center text-amber-300 focus:outline-none focus:border-amber-500 disabled:opacity-50 transition-colors"
                        />
                      </div>
                    </div>

                    {hasLevels ? (
                      <button 
                        onClick={() => handleUpdateLevel(item.categoryId, item.id, item.credits, item.name)}
                        disabled={isDeleted}
                        className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white border border-white/10 cursor-pointer disabled:opacity-40 active:scale-95 shadow-md"
                      >
                        <Save size={15} /> Update Sub-Level
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateCategory(item.categoryId, item.credits, item.categoryName)}
                        disabled={isDeleted}
                        className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-900/60 to-indigo-900/60 hover:from-blue-800/80 hover:to-indigo-800/80 text-blue-200 border border-blue-500/30 cursor-pointer disabled:opacity-40 active:scale-95 shadow-md"
                      >
                        <Save size={15} /> Update Category Weight
                      </button>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl text-gray-400">
              <AlertCircle size={32} className="mx-auto text-gray-500 mb-2" />
              <p className="text-sm font-semibold">No valuation levels found for this category.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-3xl bg-[#0d1222] border border-white/10 rounded-3xl p-6 text-white max-h-[85vh] flex flex-col shadow-2xl shadow-blue-500/10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                    <History size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Credit Valuation Audit Logs</h3>
                  {loadingHistory && <Loader2 size={16} className="text-blue-400 animate-spin ml-2" />}
                </div>

                <div className="flex items-center gap-2">
                  {creditHistory.length > 0 && (
                    <button 
                      onClick={clearCreditHistory} disabled={clearingHistory}
                      className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/20 transition-all cursor-pointer"
                    >
                      <Trash size={14} /> Clear All
                    </button>
                  )}
                  <button onClick={() => setShowHistoryModal(false)} className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {creditHistory.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-xs">No audit logs recorded yet.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] text-gray-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Exam / Level</th>
                        <th className="py-3 px-4 text-center">Previous Credits</th>
                        <th className="py-3 px-4 text-center">Updated Credits</th>
                        <th className="py-3 px-4 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditHistory.map((log, index) => (
                        <tr key={log.id || index} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-xs text-gray-200 font-semibold">{log.examName}</td>
                          <td className="py-3 px-4 text-center text-red-400 font-extrabold text-xs">{log.previousCredits ?? 0}</td>
                          <td className="py-3 px-4 text-center text-emerald-400 font-extrabold text-xs">{log.newCredits ?? 0}</td>
                          <td className="py-3 px-4 text-right text-[11px] text-gray-400 font-mono">{formatDate(log.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ExamCreditValuation;