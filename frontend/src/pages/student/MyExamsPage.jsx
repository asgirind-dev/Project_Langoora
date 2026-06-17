import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Play, BarChart2, Clock, CheckCircle, XCircle, Trash2, Plus } from 'lucide-react';
import axios from 'axios'; 
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';


const initialExams = [
  { id: '1', title: 'JLPT N2 Full Mock Exam 2024', category: 'JLPT', level: 'N2', duration: '105 min', questions: 108, lastScore: 78, attempts: 2, status: 'in-progress', thumbnail: 'https://images.pexels.com/photos/5427671/pexels-photo-5427671.jpeg?w=400' },
  { id: '2', title: 'EPS-TOPIK Standard Full Simulation', category: 'EPS-TOPIK', level: 'Standard', duration: '70 min', questions: 80, lastScore: 62, attempts: 1, status: 'completed', thumbnail: 'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?w=400' },
  { id: '3', title: 'IELTS Academic Band 7+ Strategy', category: 'IELTS', level: 'Academic', duration: '180 min', questions: 120, lastScore: null, attempts: 0, status: 'not-started', thumbnail: 'https://images.pexels.com/photos/256395/pexels-photo-256395.jpeg?w=400' },
  { id: '4', title: 'GRE Verbal + Quant Full Test', category: 'GRE', level: 'Full', duration: '230 min', questions: 160, lastScore: 88, attempts: 3, status: 'completed', thumbnail: 'https://images.pexels.com/photos/301926/pexels-photo-301926.jpeg?w=400' },
];

const statusColors = { 'completed': 'green', 'in-progress': 'yellow', 'not-started': 'gray' };
const statusLabels = { 'completed': 'Completed', 'in-progress': 'In Progress', 'not-started': 'Not Started' };

export default function MyExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState(initialExams); 
  const [filter, setFilter] = useState('all'); 

  // --- Modal පාලනය සඳහා States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);

  
  const openDeleteConfirm = (id) => {
    setSelectedExamId(id);
    setIsModalOpen(true);
  };

  
  const handleConfirmDelete = async () => {
    try {
      // Backend Node.js API එකට Delete Request එක යැවීම
      await axios.delete(`http://localhost:5000/api/student-exams/${selectedExamId}`);
      
      // සාර්ථක නම් UI එකෙන් ඉවත් කිරීම
      setExams(exams.filter(exam => exam.id !== selectedExamId));
      setIsModalOpen(false); 
    } catch (error) {
      console.error("Backend Error, but deleting from UI for testing:", error);
      // Backend එක තවම සෙට් නැතත් UI එකෙන් විතරක් ඩිලීට් වෙලා පේන්න මේක ලිව්වා:
      setExams(exams.filter(exam => exam.id !== selectedExamId));
      setIsModalOpen(false);
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
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === val ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* EXAMS GRID */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
          No exams found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((exam, i) => (
            <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard className="overflow-hidden relative group">
                <div className="flex">
                  <img src={exam.thumbnail} alt={exam.title} className="w-32 h-full object-cover flex-shrink-0" />
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">{exam.title}</h3>
                      <Badge color={statusColors[exam.status]}>{statusLabels[exam.status]}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                      <span className="flex items-center gap-1"><Clock size={11} />{exam.duration}</span>
                      <span className="flex items-center gap-1"><BookOpen size={11} />{exam.questions} Q</span>
                      <span>{exam.attempts} attempts</span>
                    </div>
                    {exam.lastScore !== null && (
                      <div className="flex items-center gap-2 mb-3">
                        {exam.lastScore >= 70 ? <CheckCircle size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />}
                        <span className="text-sm text-gray-300">Last score: <span className={`font-semibold ${exam.lastScore >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>{exam.lastScore}%</span></span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={() => navigate(`/exam/${exam.id}/take`)}>
                          <Play size={13} /> {exam.attempts > 0 ? 'Retake' : 'Start'}
                        </Button>
                        {exam.attempts > 0 && (
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/exam/${exam.id}/results`)}>
                            <BarChart2 size={13} /> Results
                          </Button>
                        )}
                      </div>

                      {/* TRASH BUTTON */}
                      <button 
                        onClick={() => openDeleteConfirm(exam.id)}
                        className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                        title="Remove Exam"
                      >
                        <Trash2 size={16} />
                      </button>
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
            <p className="text-sm text-gray-400 mb-6">
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