import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Play, BarChart2, Clock, Trash2, Plus,
  CalendarPlus, Check, GraduationCap, FileText,
  Filter, Grid3x3, List, ShoppingBag, Layers
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import axios from 'axios';

const statusColors = {
  published: 'green',
  draft: 'gray',
  archived: 'red',
  active: 'green',
  completed: 'green',
  'in-progress': 'yellow',
  'not-started': 'gray'
};

const BRAND = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  accent: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// ─── Loading Spinner Component ──────────────────────────────────────────────
function LoadingSpinner({ message = "Loading your exams..." }) {
  return (
    <div className="min-h-screen bg-[#030810] flex flex-col items-center justify-center gap-4 text-white">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${BRAND.primary} transparent transparent transparent` }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <p className="text-gray-400 text-sm tracking-wide">{message}</p>
    </div>
  );
}

// ─── Tutor Avatar Component ─────────────────────────────────────────────────
function TutorAvatar({ tutor, name, size = 36 }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || 'T').trim().charAt(0).toUpperCase();

  if (tutor?.profilePicUrl && !imgError) {
    return (
      <img
        src={tutor.profilePicUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="rounded-full object-cover flex-shrink-0 ring-2 ring-white/10"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white ring-2 ring-white/10"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`,
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────
export default function MyExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [tutors, setTutors] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [schedulingExamId, setSchedulingExamId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [successExamId, setSuccessExamId] = useState(null);

  // Dynamic Categories & Levels Extractor (Handles multiple potential backend naming conventions)
  const categories = [...new Set(exams.map(e => e.category_id || e.category || e.category_name).filter(Boolean))];
  const levels = [...new Set(exams.map(e => e.level_id || e.level || e.level_name).filter(Boolean))];

  useEffect(() => {
    const fetchPurchasedExams = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/exams/my-exams', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const examList = res.data.exams || res.data.data || [];
        setExams(examList);

        // Fetch tutor profiles dynamically
        const tutorIds = [...new Set(examList.map(e => e.tutor_id).filter(Boolean))];
        if (tutorIds.length > 0) {
          const tutorEntries = await Promise.all(
            tutorIds.map(async (id) => {
              try {
                const tRes = await axios.get(`http://localhost:5000/api/tutor-profile/${id}`);
                return [id, tRes.data?.data || null];
              } catch (err) {
                console.error(`Failed to fetch tutor profile for ${id}:`, err);
                return [id, null];
              }
            })
          );
          setTutors(Object.fromEntries(tutorEntries));
        }
      } catch (error) {
        console.error('Failed to fetch exams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchasedExams();
  }, []);

  const openDeleteConfirm = (id) => {
    setSelectedExamId(id);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/exams/my-exams/${selectedExamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(prev => prev.filter(exam => (exam.exam_id || exam.id) !== selectedExamId));
    } catch (error) {
      console.error("Delete error:", error);
      // Fallback UI deletion
      setExams(prev => prev.filter(exam => (exam.exam_id || exam.id) !== selectedExamId));
    } finally {
      setIsModalOpen(false);
    }
  };

  const handleAddToPlanner = async (exam) => {
    if (!selectedDate) return alert("Please select a valid study execution date.");
    const targetId = exam.exam_id || exam.id;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/planner/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `Complete ${exam.title}`,
          description: `Tutor: ${exam.tutor_name || 'Expert'} · Expected duration: ${exam.duration_minutes || exam.duration || 60} min.`,
          scheduled_date: selectedDate
        })
      });
      const result = await response.json();
      if (response.status === 403 || !result.success) {
        alert("🔒 Subscription Premium Locked: Please check your active subscription cluster.");
      } else if (result.success) {
        setSuccessExamId(targetId);
        setSchedulingExamId(null);
        setSelectedDate('');
        setTimeout(() => setSuccessExamId(null), 2500);
      }
    } catch (error) {
      console.error("Planner error:", error);
    }
  };

  const filteredExams = exams.filter(exam => {
    const attempts = exam.attempts_count || 0;
    const isCompleted = attempts > 0 || exam.status === 'completed' || exam.is_completed;

    if (filter === 'all') return true;
    if (filter === 'completed') return isCompleted;
    if (filter === 'not-started') return !isCompleted;

    if (filter.startsWith('cat_')) {
      const catVal = filter.replace('cat_', '');
      const examCat = exam.category_id || exam.category || exam.category_name;
      return String(examCat) === String(catVal);
    }
    if (filter.startsWith('lvl_')) {
      const lvlVal = filter.replace('lvl_', '');
      const examLvl = exam.level_id || exam.level || exam.level_name;
      return String(examLvl) === String(lvlVal);
    }
    return true;
  });

  if (loading) {
    return <LoadingSpinner message="Loading your exams..." />;
  }

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white mb-1">My Exams</h1>
          <p className="text-gray-400">All available exam packs in one place</p>
        </motion.div>
        
        <Button variant="primary" onClick={() => navigate('/student/marketplace')}>
          <Plus size={16} /> Buy New Exams
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {[['all', 'All'], ['not-started', 'Not Started'], ['completed', 'Completed']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === val 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              {label}
            </button>
          ))}

          {categories.length > 0 && (
            <div className="relative group">
              <button className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-gray-400 hover:text-white border border-white/10 flex items-center gap-1">
                <Filter size={14} /> Category
              </button>
              <div className="absolute top-full left-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl p-2 min-w-[150px] hidden group-hover:block z-20 shadow-2xl">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilter(`cat_${cat}`)}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      filter === `cat_${cat}` 
                        ? 'bg-blue-500/20 text-blue-400 font-semibold' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {String(cat).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {levels.length > 0 && (
            <div className="relative group">
              <button className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-gray-400 hover:text-white border border-white/10 flex items-center gap-1">
                <Layers size={14} /> Level
              </button>
              <div className="absolute top-full left-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl p-2 min-w-[150px] hidden group-hover:block z-20 shadow-2xl">
                {levels.map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setFilter(`lvl_${lvl}`)}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      filter === `lvl_${lvl}` 
                        ? 'bg-blue-500/20 text-blue-400 font-semibold' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {String(lvl).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex ml-auto gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Grid3x3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredExams.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 px-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
            <BookOpen size={36} className="text-blue-400" />
          </div>
          <h3 className="text-white font-semibold text-2xl mb-2">No exams found</h3>
          <p className="text-gray-500 text-base mb-6 max-w-md mx-auto">
            {filter !== 'all' 
              ? "No exams match the selected filter criteria." 
              : "You haven't enrolled in any exams yet."}
          </p>
          <Button variant="primary" size="lg" onClick={() => navigate('/student/marketplace')}>
            <ShoppingBag size={18} /> Explore Marketplace
          </Button>
        </motion.div>
      ) : (
        /* Exam List / Grid */
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-5`}>
          {filteredExams.map((exam, i) => {
            const tutor = tutors[exam.tutor_id];
            const tutorName = tutor?.name || exam.tutor_name || 'Expert Tutor';
            const targetExamId = exam.exam_id || exam.id;

            // Duration & Question Fallback Calculations
            const duration = exam.duration_minutes || exam.duration || exam.time || "N/A";
            const totalQuestions = exam.total_questions || exam.questions_count || exam.totalQuestions || exam.questions?.length || 0;
            const isCompleted = (exam.attempts_count || 0) > 0 || exam.status === 'completed' || exam.is_completed;

            return (
              <motion.div key={targetExamId || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className={`overflow-hidden relative group border-white/5 hover:border-white/10 hover:shadow-xl hover:shadow-black/20 transition-all h-full ${viewMode === 'list' ? 'flex' : ''}`}>
                  <div className={`flex ${viewMode === 'list' ? 'w-full' : 'h-full min-h-[210px]'}`}>
                    <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'w-32 flex-shrink-0'} overflow-hidden`}>
                      <img
                        src={exam.thumbnail || 'https://images.pexels.com/photos/11075249/pexels-photo-11075249.jpeg?w=400'}
                        alt={exam.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                      <div className="space-y-2.5">
                        {/* Tutor Header */}
                        <div className="flex items-center gap-2.5">
                          <TutorAvatar tutor={tutor} name={tutorName} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">{tutorName}</p>
                            {tutor?.qualifications && (
                              <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                                <GraduationCap size={11} className="text-gray-500 flex-shrink-0" />
                                {tutor.qualifications}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <Badge color={statusColors[exam.status] || 'green'}>{exam.status || 'active'}</Badge>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-white text-sm leading-snug tracking-tight group-hover:text-blue-400 transition-colors break-words">
                          {exam.title}
                        </h3>

                        {/* Description */}
                        {exam.description && (
                          <p className={`text-xs text-gray-400 ${viewMode === 'list' ? '' : 'line-clamp-2'} leading-relaxed`}>
                            {exam.description}
                          </p>
                        )}

                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {(exam.category_id || exam.category) && (
                            <Badge color="blue">{String(exam.category_id || exam.category).toUpperCase()}</Badge>
                          )}
                          {(exam.level_id || exam.level) && (
                            <Badge color="purple">{String(exam.level_id || exam.level).toUpperCase()}</Badge>
                          )}
                          <span className="flex items-center gap-1 text-xs text-gray-400 font-mono bg-white/[0.03] py-1 px-2 rounded-lg border border-white/5">
                            <Clock size={11} />{duration} min
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400 font-mono bg-white/[0.03] py-1 px-2 rounded-lg border border-white/5">
                            <FileText size={11} />{totalQuestions} Q
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                        <div className="flex gap-2 items-center flex-wrap">
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={() => navigate(`/exam/${targetExamId}/take`)}
                          >
                            <Play size={12} fill="currentColor" /> {isCompleted ? 'Retake' : 'Start'}
                          </Button>

                          {isCompleted && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={() => navigate(`/exam/${targetExamId}/results`)}
                            >
                              <BarChart2 size={12} /> Results
                            </Button>
                          )}

                          {successExamId === targetExamId ? (
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl flex items-center gap-1 font-medium">
                              <Check size={12} /> Scheduled!
                            </span>
                          ) : schedulingExamId === targetExamId ? (
                            <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 p-1 rounded-xl shadow-xl z-10">
                              <input
                                type="date"
                                required
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                              />
                              <button
                                onClick={() => handleAddToPlanner(exam)}
                                className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold px-2 transition-all"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setSchedulingExamId(null)}
                                className="p-1 text-gray-400 hover:text-white text-xs px-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setSchedulingExamId(targetExamId); setSelectedDate(''); }}
                              className="p-2 bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 text-gray-400 hover:text-blue-400 rounded-xl transition-all flex items-center gap-1 text-xs font-medium"
                              title="Schedule into Study Planner"
                            >
                              <CalendarPlus size={13} /> Schedule
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => openDeleteConfirm(targetExamId)}
                          className="p-2 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-gray-500 hover:text-red-400 rounded-xl transition-all flex-shrink-0"
                          title="Remove Exam"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111827]/90 border border-white/10 backdrop-blur-md p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Remove Exam?</h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Are you sure you want to remove this exam from your list? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-gray-400 hover:text-white border border-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/20"
                >
                  Yes, Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}