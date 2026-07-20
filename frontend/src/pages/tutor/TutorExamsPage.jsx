import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Users, Star, Eye, Edit3, Trash2, BarChart2, Loader } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { getTutorExams, deleteExam, updateExamStatus } from '../../services/examService';

export default function TutorExamsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // 📡 Fetch exams from backend
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getTutorExams();
      
      if (response && response.success) {
        setExams(response.exams || []);
      } else {
        setError('Failed to load exams');
      }
    } catch (err) {
      console.error('Fetch exams error:', err);
      setError(err.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' 
    ? exams 
    : exams.filter(e => e.status === filter);

  // 🗑️ Delete exam
  const handleDelete = async (examId) => {
    try {
      const response = await deleteExam(examId);
      if (response && response.success) {
        setExams(exams.filter(e => e.id !== examId));
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete exam. Please try again.');
    }
  };

  // 📝 Update status (draft -> published)
  const handlePublish = async (examId) => {
    try {
      const response = await updateExamStatus(examId, 'published');
      if (response && response.success) {
        setExams(exams.map(e => 
          e.id === examId ? { ...e, status: 'published' } : e
        ));
      }
    } catch (err) {
      console.error('Publish error:', err);
      alert('Failed to publish exam. Please try again.');
    }
  };

  // ✏️ Edit exam - navigate to create page with exam ID as query parameter
const handleEdit = (examId) => {
  navigate(`/tutor/edit?examId=${examId}`);
};

  // 📊 View analytics
  const handleAnalytics = (examId) => {
    navigate(`/tutor/analytics/${examId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size={40} className="animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">My Exams</h1>
            <p className="text-gray-400">Manage your published and draft exams</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/tutor/create')}>
            <Plus size={16} /> New Exam
          </Button>
        </div>
      </motion.div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-2">
        {['all', 'published', 'draft'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
              filter === f 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
            }`}>
            {f} ({f === 'all' ? exams.length : exams.filter(e => e.status === f).length})
          </button>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0a0f1e] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-2">Delete Exam?</h3>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="primary" className="bg-rose-500 hover:bg-rose-600" onClick={() => handleDelete(deleteConfirm.id)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No exams found</p>
            <p className="text-sm">Create your first exam by clicking the "New Exam" button</p>
          </div>
        ) : (
          filtered.map((exam, i) => (
            <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard className="overflow-hidden h-full flex flex-col">
                <div className="relative h-40 flex-shrink-0">
                  <img 
                    src={exam.thumbnail || 'https://images.pexels.com/photos/5427671/pexels-photo-5427671.jpeg?w=200'} 
                    alt={exam.title} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.target.src = 'https://images.pexels.com/photos/5427671/pexels-photo-5427671.jpeg?w=200';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    <Badge color="blue">{exam.category_id?.toUpperCase() || 'General'}</Badge>
                    {exam.level_id && <Badge color="purple">{exam.level_id.toUpperCase()}</Badge>}
                    <Badge color={exam.status === 'published' ? 'green' : 'yellow'}>
                      {exam.status || 'draft'}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-white mb-2 line-clamp-2">{exam.title}</h3>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="p-2 bg-white/3 rounded-xl">
                      <div className="text-lg font-bold text-white">{exam.students || 0}</div>
                      <div className="text-[10px] text-gray-400">Students</div>
                    </div>
                    <div className="p-2 bg-white/3 rounded-xl">
                      <div className="text-sm font-bold text-emerald-400">
                        LKR {((exam.revenue || 0) / 1000).toFixed(0)}K
                      </div>
                      <div className="text-[10px] text-gray-400">Revenue</div>
                    </div>
                    <div className="p-2 bg-white/3 rounded-xl">
                      <div className="text-lg font-bold text-amber-400">{exam.rating || 0}</div>
                      <div className="text-[10px] text-gray-400">Rating</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    {exam.status === 'draft' ? (
                      <>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="flex-1 bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                          onClick={() => handlePublish(exam.id)}
                        >
                          Publish
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleEdit(exam.id)}
                        >
                          <Edit3 size={13} /> Edit
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleAnalytics(exam.id)}
                        >
                          <BarChart2 size={13} /> Analytics
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleEdit(exam.id)}
                        >
                          <Edit3 size={13} /> Edit
                        </Button>
                      </>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => setDeleteConfirm({ id: exam.id, title: exam.title })}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}

        {/* Create New Exam Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard 
            hover 
            className="h-full flex items-center justify-center p-10 border-dashed border-2 border-white/15 hover:border-blue-500/40 min-h-[300px] cursor-pointer" 
            onClick={() => navigate('/tutor/create')}
          >
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