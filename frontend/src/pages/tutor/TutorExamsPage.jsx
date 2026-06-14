import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Users, Star, Eye, CreditCard as Edit3, Trash2, BarChart2 } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const tutorExams = [
  { id: 1, title: 'JLPT N2 Full Mock Exam 2024', category: 'JLPT', level: 'N2', students: 342, revenue: 855000, rating: 4.8, reviews: 248, status: 'published', created: '2024-01-15', thumbnail: 'https://images.pexels.com/photos/5427671/pexels-photo-5427671.jpeg?w=200' },
  { id: 2, title: 'JLPT N3 Grammar Section', category: 'JLPT', level: 'N3', students: 218, revenue: 480000, rating: 4.7, reviews: 124, status: 'published', created: '2024-02-20', thumbnail: 'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?w=200' },
  { id: 3, title: 'JLPT N2 Vocabulary Deep Dive', category: 'JLPT', level: 'N2', students: 89, revenue: 196000, rating: 4.6, reviews: 52, status: 'draft', created: '2024-05-10', thumbnail: 'https://images.pexels.com/photos/256395/pexels-photo-256395.jpeg?w=200' },
];

export default function TutorExamsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? tutorExams : tutorExams.filter(e => e.status === filter);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">My Exams</h1>
            <p className="text-gray-400">Manage your published and draft exams</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/tutor/create')}><Plus size={16} /> New Exam</Button>
        </div>
      </motion.div>

      <div className="flex gap-2 mb-2">
        {['all', 'published', 'draft'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter === f ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((exam, i) => (
          <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className="overflow-hidden">
              <div className="relative h-40">
                <img src={exam.thumbnail} alt={exam.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge color="blue">{exam.category}</Badge>
                  <Badge color={exam.status === 'published' ? 'green' : 'yellow'}>{exam.status}</Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-3 line-clamp-2">{exam.title}</h3>
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div className="p-2 bg-white/3 rounded-xl">
                    <div className="text-lg font-bold text-white">{exam.students}</div>
                    <div className="text-xs text-gray-400">Students</div>
                  </div>
                  <div className="p-2 bg-white/3 rounded-xl">
                    <div className="text-sm font-bold text-emerald-400">LKR {(exam.revenue/1000).toFixed(0)}K</div>
                    <div className="text-xs text-gray-400">Revenue</div>
                  </div>
                  <div className="p-2 bg-white/3 rounded-xl">
                    <div className="text-lg font-bold text-amber-400">{exam.rating}</div>
                    <div className="text-xs text-gray-400">Rating</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1"><BarChart2 size={13} /> Analytics</Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/tutor/create`)}><Edit3 size={13} /></Button>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={13} /></Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard hover className="h-full flex items-center justify-center p-10 border-dashed border-2 border-white/15 hover:border-blue-500/40 min-h-48" onClick={() => navigate('/tutor/create')}>
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Plus size={24} className="text-blue-400" />
              </div>
              <p className="text-gray-300 font-medium">Create New Exam</p>
              <p className="text-gray-500 text-sm mt-1">Start building your next exam pack</p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
