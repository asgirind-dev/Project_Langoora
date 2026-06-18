import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Play, BarChart2, Clock, CheckCircle, XCircle, Trash2, Plus, CalendarPlus, Check, User } from 'lucide-react';
import axios from 'axios'; 
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

// 📚 Langoora System-Aligned Mock Data Cluster (With Tutors)
// 📚 Langoora System-Aligned Mock Data Cluster (With Real-Themed Visuals)
const initialExams = [
  { 
    id: '1', 
    title: 'JLPT N5 Full Mock Exam - Paper 01', 
    tutor: 'Dinushi Perera', 
    category: 'JLPT', 
    level: 'N5', 
    duration: '105 min', 
    questions: 108, 
    lastScore: 78, 
    attempts: 2, 
    status: 'in-progress', 
    thumbnail: 'https://images.pexels.com/photos/11075249/pexels-photo-11075249.jpeg?w=400' // Mt. Fuji & Sakura Theme
  },
  { 
    id: '2', 
    title: 'EPS-TOPIK Standard Full Simulation 2026', 
    tutor: 'Ashan Fernando', 
    category: 'EPS-TOPIK', 
    level: 'Standard', 
    duration: '70 min', 
    questions: 80, 
    lastScore: 62, 
    attempts: 1, 
    status: 'completed', 
    thumbnail: 'https://images.pexels.com/photos/2389171/pexels-photo-2389171.jpeg?w=400' // Traditional Korean Palace / Seoul Theme
  },
  { 
    id: '3', 
    title: 'JLPT N4 Grammar & Vocabulary Mastery Test', 
    tutor: 'Rohan Ranasinghe', 
    category: 'JLPT', 
    level: 'N4', 
    duration: '90 min', 
    questions: 75, 
    lastScore: null, 
    attempts: 0, 
    status: 'not-started', 
    thumbnail: 'https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?w=400' // Japanese Architecture / Torii Gate Theme
  },
  { 
    id: '4', 
    title: 'JLPT N5 Listening Rehearsal Module', 
    tutor: 'Shilpa Pieris', 
    category: 'JLPT', 
    level: 'N5', 
    duration: '45 min', 
    questions: 40, 
    lastScore: 88, 
    attempts: 3, 
    status: 'completed', 
    thumbnail: 'https://images.pexels.com/photos/1822605/pexels-photo-1822605.jpeg?w=400' // Tokyo Streets Neon / Modern Japan Theme
  },
];

const statusColors = { 'completed': 'green', 'in-progress': 'yellow', 'not-started': 'gray' };
const statusLabels = { 'completed': 'Completed', 'in-progress': 'In Progress', 'not-started': 'Not Started' };

export default function MyExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState(initialExams); 
  const [filter, setFilter] = useState('all'); 

  // --- Modal Control States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);

  // --- Planner Integration States ---
  const [schedulingExamId, setSchedulingExamId] = useState(null); 
  const [selectedDate, setSelectedDate] = useState('');
  const [successExamId, setSuccessExamId] = useState(null); 

  const openDeleteConfirm = (id) => {
    setSelectedExamId(id);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/student-exams/${selectedExamId}`);
      setExams(exams.filter(exam => exam.id !== selectedExamId));
      setIsModalOpen(false); 
    } catch (error) {
      console.error("Backend Error, but deleting from UI for testing:", error);
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
          description: `Tutor: ${exam.tutor} · Expected duration: ${exam.duration}. Purchased module rehearsal.`,
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
      console.error("Cross-module planner authorization failed:", error);
    }
  };

  const filtered = filter === 'all' ? exams : exams.filter(e => e.status === filter);

  return (
    <div className="space-y-8 relative">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white mb-1">My Exams</h1>
          <p className="text-gray-400">All your purchased exam packs in one place</p>
        </motion.div>
        
        <Button variant="primary" onClick={() => navigate('/student/marketplace')}>
          <Plus size={16} /> Buy New Exams
        </Button>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex gap-2">
        {[['all', 'All'], ['not-started', 'Not Started'], ['in-progress', 'In Progress'], ['completed', 'Completed']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === val ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* EXAMS GRID */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-2xl">
          No active exam assets mapped in this node branch.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((exam, i) => (
            <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="overflow-hidden relative group border-white/5 hover:border-white/10 transition-all h-full">
                <div className="flex h-full min-h-[165px]">
                  <img src={exam.thumbnail} alt={exam.title} className="w-32 object-cover flex-shrink-0 group-hover:scale-105 transition-transform duration-500" />
                  
                 
                  <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                    
                    <div className="space-y-2">
                      {/* Top Row: Title & Badge Container */}
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-bold text-white text-sm leading-snug tracking-tight group-hover:text-blue-400 transition-colors flex-1 break-words">
                          {exam.title}
                        </h3>
                        <div className="flex-shrink-0 mt-0.5">
                          <Badge color={statusColors[exam.status]}>{statusLabels[exam.status]}</Badge>
                        </div>
                      </div>

                      
                      <div className="flex items-center gap-1.5 text-xs text-blue-400/90 font-medium">
                        <User size={13} className="text-blue-400/70" />
                        <span>Published by: <span className="text-gray-200 font-semibold">{exam.tutor || 'Alternative Tutor'}</span></span>
                      </div>

                      {/* Meta Info Row */}
                      <div className="flex items-center gap-3 text-xs text-gray-400 bg-white/[0.02] py-1 px-2 rounded-lg w-max border border-white/5 font-medium">
                        <span className="flex items-center gap-1 font-mono"><Clock size={11} />{exam.duration}</span>
                        <span className="h-2 w-[1px] bg-white/10" />
                        <span className="flex items-center gap-1 font-mono"><BookOpen size={11} />{exam.questions} Q</span>
                        <span className="h-2 w-[1px] bg-white/10" />
                        <span>{exam.attempts} attempts</span>
                      </div>

                      {exam.lastScore !== null && (
                        <div className="flex items-center gap-2 pt-1">
                          {exam.lastScore >= 70 ? <CheckCircle size={13} className="text-emerald-400" /> : <XCircle size={13} className="text-red-400" />}
                          <span className="text-xs text-gray-300">Last score: <span className={`font-bold ${exam.lastScore >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>{exam.lastScore}%</span></span>
                        </div>
                      )}
                    </div>
                    
                    {/* BUTTON ACTIONS ROW */}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                      <div className="flex gap-2 items-center">
                        <Button variant="primary" size="sm" onClick={() => navigate(`/exam/${exam.id}/take`)}>
                          <Play size={12} fill="currentColor" /> {exam.attempts > 0 ? 'Retake' : 'Start'}
                        </Button>
                        {exam.attempts > 0 && (
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/exam/${exam.id}/results`)}>
                            <BarChart2 size={12} /> Results
                          </Button>
                        )}

                        {/* 📅 SCHEDULE TO PLANNER CONTROL HOOK */}
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

      {/* PREMIUM GLASSMORPHIC CONFIRMATION MODAL */}
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