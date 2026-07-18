import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Play, BarChart2, Clock, CheckCircle, XCircle, Trash2, Plus, CalendarPlus, Check, User } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import studentApi from '../../services/examExecutionService';

const statusColors = { 'published': 'green', 'draft': 'gray', 'archived': 'red' };

export default function MyExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [schedulingExamId, setSchedulingExamId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [successExamId, setSuccessExamId] = useState(null);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await studentApi.get('/exams/available');
        setExams(res.data.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch exams:', error);
        alert('Could not load exams. Please try again.');
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const openDeleteConfirm = (id) => {
    setSelectedExamId(id);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await studentApi.delete(`/exams/student-exams/${selectedExamId}`);
      setExams(exams.filter(exam => exam.id !== selectedExamId));
      setIsModalOpen(false);
    } catch (error) {
      console.error("Delete error:", error);
      setExams(exams.filter(exam => exam.id !== selectedExamId));
      setIsModalOpen(false);
    }
  };

  const handleAddToPlanner = async (exam) => {
    if (!selectedDate) return alert("Please select a valid study execution date.");
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
          description: `Tutor: ${exam.tutor_name || 'Expert'} · Expected duration: ${exam.duration_minutes} min.`,
          scheduled_date: selectedDate
        })
      });
      const result = await response.json();
      if (response.status === 403 || !result.success) {
        alert("🔒 Subscription Premium Locked: Please check your active subscription cluster.");
      } else if (result.success) {
        setSuccessExamId(exam.id);
        setSchedulingExamId(null);
        setSelectedDate('');
        setTimeout(() => setSuccessExamId(null), 2500);
      }
    } catch (error) {
      console.error("Planner error:", error);
    }
  };

  const filtered = filter === 'all' ? exams : exams.filter(e => e.status === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center">
        <div className="text-white text-xl">Loading your exams...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-center">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white mb-1">My Exams</h1>
          <p className="text-gray-400">All your purchased exam packs in one place</p>
        </motion.div>
        <Button variant="primary" onClick={() => navigate('/student/marketplace')}>
          <Plus size={16} /> Buy New Exams
        </Button>
      </div>

      <div className="flex gap-2">
        {[['all', 'All'], ['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === val ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-2xl">
          No exams available in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((exam, i) => (
            <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="overflow-hidden relative group border-white/5 hover:border-white/10 transition-all h-full">
                <div className="flex h-full min-h-[165px]">
                  <img src={exam.thumbnail || 'https://images.pexels.com/photos/11075249/pexels-photo-11075249.jpeg?w=400'} alt={exam.title} className="w-32 object-cover flex-shrink-0 group-hover:scale-105 transition-transform duration-500" />
                  <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-bold text-white text-sm leading-snug tracking-tight group-hover:text-blue-400 transition-colors flex-1 break-words">
                          {exam.title}
                        </h3>
                        <div className="flex-shrink-0 mt-0.5">
                          <Badge color={statusColors[exam.status] || 'gray'}>{exam.status || 'draft'}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-blue-400/90 font-medium">
                        <User size={13} className="text-blue-400/70" />
                        <span>Published by: <span className="text-gray-200 font-semibold">{exam.tutor_name || 'Expert'}</span></span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 bg-white/[0.02] py-1 px-2 rounded-lg w-max border border-white/5 font-medium">
                        <span className="flex items-center gap-1 font-mono"><Clock size={11} />{exam.duration_minutes || 60} min</span>
                        <span className="h-2 w-[1px] bg-white/10" />
                        <span className="flex items-center gap-1 font-mono"><BookOpen size={11} />{exam.total_questions || 0} Q</span>
                        <span className="h-2 w-[1px] bg-white/10" />
                        <span>{exam.attempts_count || 0} attempts</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                      <div className="flex gap-2 items-center">
                        <Button variant="primary" size="sm" onClick={() => navigate(`/exam/${exam.id}/take`)}>
                          <Play size={12} fill="currentColor" /> {exam.attempts_count > 0 ? 'Retake' : 'Start'}
                        </Button>
                        {exam.attempts_count > 0 && (
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/exam/${exam.id}/results`)}>
                            <BarChart2 size={12} /> Results
                          </Button>
                        )}
                        {successExamId === exam.id ? (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl flex items-center gap-1 font-medium">
                            <Check size={12} /> Scheduled!
                          </span>
                        ) : schedulingExamId === exam.id ? (
                          <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 p-1 rounded-xl animate-fade-in shadow-xl z-10">
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
                            onClick={() => { setSchedulingExamId(exam.id); setSelectedDate(''); }}
                            className="p-2 bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 text-gray-400 hover:text-blue-400 rounded-xl transition-all flex items-center gap-1 text-xs font-medium"
                            title="Schedule into Study Planner Module"
                          >
                            <CalendarPlus size={13} /> Schedule
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111827]/90 border border-white/10 backdrop-blur-md p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl text-center"
          >
            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Remove Purchased Exam?</h3>
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
    </div>
  );
}