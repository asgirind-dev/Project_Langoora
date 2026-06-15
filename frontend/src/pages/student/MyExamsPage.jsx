import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Play, BarChart2, Clock, CheckCircle, XCircle } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const myExams = [
  { id: 1, title: 'JLPT N2 Full Mock Exam 2024', category: 'JLPT', level: 'N2', duration: '105 min', questions: 108, lastScore: 78, attempts: 2, status: 'in-progress', thumbnail: 'https://images.pexels.com/photos/5427671/pexels-photo-5427671.jpeg?w=400' },
  { id: 2, title: 'EPS-TOPIK Standard Full Simulation', category: 'EPS-TOPIK', level: 'Standard', duration: '70 min', questions: 80, lastScore: 62, attempts: 1, status: 'completed', thumbnail: 'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?w=400' },
  { id: 3, title: 'IELTS Academic Band 7+ Strategy', category: 'IELTS', level: 'Academic', duration: '180 min', questions: 120, lastScore: null, attempts: 0, status: 'not-started', thumbnail: 'https://images.pexels.com/photos/256395/pexels-photo-256395.jpeg?w=400' },
  { id: 4, title: 'GRE Verbal + Quant Full Test', category: 'GRE', level: 'Full', duration: '230 min', questions: 160, lastScore: 88, attempts: 3, status: 'completed', thumbnail: 'https://images.pexels.com/photos/301926/pexels-photo-301926.jpeg?w=400' },
];

const statusColors = { 'completed': 'green', 'in-progress': 'yellow', 'not-started': 'gray' };
const statusLabels = { 'completed': 'Completed', 'in-progress': 'In Progress', 'not-started': 'Not Started' };

export default function MyExamsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? myExams : myExams.filter(e => e.status === filter);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">My Exams</h1>
        <p className="text-gray-400">All your purchased exam packs in one place</p>
      </motion.div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((exam, i) => (
          <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className="overflow-hidden">
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
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
