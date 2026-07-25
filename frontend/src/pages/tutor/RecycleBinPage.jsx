import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, AlertTriangle, Loader, BookOpen, ArrowLeft } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { getRecycleBinExams, restoreExam, permanentDeleteExam } from '../../services/examService';

/**
 * RecycleBinPage
 * ------------------------------------------------------------------
 * Mirrors the visual style of TutorExamsPage.jsx. Lists exams that
 * were soft-deleted (isDeleted: true) from "My Exams" and lets the
 * tutor Restore them or Permanently Delete them.
 *
 * Suggested route (add alongside your other /tutor/* routes):
 *   <Route path="/tutor/recycle-bin" element={<RecycleBinPage />} />
 */
export default function RecycleBinPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchDeletedExams();
  }, []);

  const fetchDeletedExams = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getRecycleBinExams();

      if (response && response.success) {
        setExams(response.exams || []);
      } else {
        setError('Failed to load recycle bin');
      }
    } catch (err) {
      console.error('Fetch recycle bin error:', err);
      setError(err.message || 'Failed to load recycle bin');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (examId) => {
    try {
      setBusyId(examId);
      const response = await restoreExam(examId);
      if (response && response.success) {
        setExams(prev => prev.filter(e => e.id !== examId));
      }
    } catch (err) {
      console.error('Restore error:', err);
      alert('Failed to restore exam. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async (examId) => {
    try {
      setBusyId(examId);
      const response = await permanentDeleteExam(examId);
      if (response && response.success) {
        setExams(prev => prev.filter(e => e.id !== examId));
        setPermanentDeleteConfirm(null);
      }
    } catch (err) {
      console.error('Permanent delete error:', err);
      alert('Failed to permanently delete exam. Please try again.');
    } finally {
      setBusyId(null);
    }
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/tutor/exams')}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"
              title="Back to My Exams"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Recycle Bin</h1>
              <p className="text-gray-400">Restore exams or permanently remove them</p>
            </div>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {permanentDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0a0f1e] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-rose-400" />
              <h3 className="text-lg font-bold text-white">Permanently Delete Exam?</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently remove "{permanentDeleteConfirm.title}" and all of its problems and
              questions from the database. This action <span className="text-rose-400 font-semibold">cannot be undone</span>.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setPermanentDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-rose-500 hover:bg-rose-600"
                onClick={() => handlePermanentDelete(permanentDeleteConfirm.id)}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {exams.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Trash2 size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Recycle bin is empty</p>
            <p className="text-sm">Exams you delete from "My Exams" will show up here</p>
          </div>
        ) : (
          exams.map((exam, i) => (
            <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard className="overflow-hidden h-full flex flex-col">
                <div className="relative h-40 flex-shrink-0 opacity-60">
                  <img
                    src={exam.thumbnail || 'https://images.pexels.com/photos/5427671/pexels-photo-5427671.jpeg?w=200'}
                    alt={exam.title}
                    className="w-full h-full object-cover grayscale"
                    onError={(e) => {
                      e.target.src = 'https://images.pexels.com/photos/5427671/pexels-photo-5427671.jpeg?w=200';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    <Badge color="blue">{exam.category_id?.toUpperCase() || 'General'}</Badge>
                    <Badge color="yellow">Deleted</Badge>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-white mb-1 line-clamp-2">{exam.title}</h3>
                  <p className="text-[11px] text-gray-500 mb-3 flex items-center gap-1">
                    <BookOpen size={11} />
                    Deleted {exam.deleted_at ? new Date(exam.deleted_at).toLocaleDateString() : ''}
                  </p>
                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                      disabled={busyId === exam.id}
                      onClick={() => handleRestore(exam.id)}
                    >
                      <RotateCcw size={13} /> Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      disabled={busyId === exam.id}
                      onClick={() => setPermanentDeleteConfirm({ id: exam.id, title: exam.title })}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
