// frontend/src/pages/tutor/TutorReviewsPage.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, MessageSquare, ArrowLeft, Filter, Calendar, ThumbsUp, CheckCircle, Search, MessageCircle, Loader2, User, Image as ImageIcon } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import axios from 'axios';

export default function TutorReviewsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedExamFilter, setSelectedExamFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const tutorId = user.id || user.uid;
        
        console.log('🔍 Fetching reviews for tutor:', tutorId);
        
        const response = await axios.get(`http://localhost:5000/api/tutor-reviews/${tutorId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Reviews response:', response.data);
        console.log('📚 Exam groups available for filter:', response.data.data?.examGroups);
        setReviewData(response.data.data);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        console.error('Error details:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReviews();
  }, []);

  // Filtering Logic
  const filteredReviews = reviewData?.reviews?.filter(review => {
    const matchesFilter = selectedFilter === 'all' || review.rating === parseInt(selectedFilter);
    const matchesExam = selectedExamFilter === 'all' || review.examId === selectedExamFilter;
    const matchesSearch = (review.comments || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (review.examTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (review.studentName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesExam && matchesSearch;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-400" size={32} />
        <p className="text-gray-400">Loading reviews...</p>
      </div>
    );
  }

  const summary = reviewData || {
    totalReviews: 0,
    averageRating: 0,
    breakdown: [],
    difficultyCounts: {},
    examGroups: []
  };

  // ✅ Student Avatar Component with fallback
  const StudentAvatar = ({ studentName, studentAvatar, size = 40 }) => {
    const [imgError, setImgError] = useState(false);
    const initials = (studentName || 'U').charAt(0).toUpperCase();

    if (studentAvatar && !imgError) {
      return (
        <img
          src={studentAvatar}
          alt={studentName || 'Student'}
          className="rounded-xl object-cover flex-shrink-0"
          style={{ width: size, height: size }}
          onError={() => setImgError(true)}
        />
      );
    }

    return (
      <div
        className="rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, #6366F1, #8B5CF6)`,
          fontSize: size * 0.4,
        }}
      >
        {initials}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      {/* Header — matches TutorDashboard.jsx pattern (title + subtitle, no back button) */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Student Reviews</h1>
        <p className="text-gray-400 mt-1">See what your students think about your published exams</p>
      </motion.div>

      {/* Ratings Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Big Score Card */}
        <GlassCard className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-3">
            <Star size={28} className="text-amber-400 fill-amber-400" />
          </div>
          <div className="text-5xl font-extrabold text-white mb-2">
            {summary.averageRating?.toFixed(1) || '0.0'}
          </div>
          <div className="flex gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={16} 
                className={i < Math.round(summary.averageRating || 0) 
                  ? 'text-amber-400 fill-amber-400' 
                  : 'text-gray-600'
                } 
              />
            ))}
          </div>
          <p className="text-sm text-gray-400">Average Instructor Rating</p>
          <Badge color="amber" className="mt-4">Based on {summary.totalReviews} Total Reviews</Badge>
        </GlassCard>

        {/* Progress Bars Breakdown */}
        <GlassCard className="p-6 md:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Rating Breakdown</h3>
          {summary.breakdown?.length > 0 ? (
            summary.breakdown.map((row) => (
              <div key={row.stars} className="flex items-center gap-4 text-sm">
                <button 
                  onClick={() => setSelectedFilter(row.stars.toString())}
                  className="w-12 text-left text-gray-400 hover:text-amber-400 transition-colors font-medium flex items-center gap-1"
                >
                  {row.stars} <Star size={12} className="inline fill-current" />
                </button>
                <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${row.percentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                  />
                </div>
                <div className="w-12 text-right text-xs text-gray-400">{row.count}</div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No ratings yet</p>
          )}
        </GlassCard>
      </div>

      {/* Filters and Search Bar */}
      <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {[
            { id: 'all', label: 'All Reviews' },
            { id: '5', label: '5 Stars' },
            { id: '4', label: '4 Stars' },
            { id: '3', label: '3 Stars' },
            { id: '2', label: '2 Stars' },
            { id: '1', label: '1 Star' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setSelectedFilter(btn.id)}
              className={`px-4 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                selectedFilter === btn.id
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {btn.label}
            </button>
          ))}

          {/* ✅ Exam Filter Dropdown — populated from reviewData.examGroups */}
          <div className="relative group">
            <button
              className={`px-4 py-1.5 text-xs font-medium rounded-xl border transition-all flex items-center gap-1.5 ${
                selectedExamFilter !== 'all'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              <Filter size={12} />
              {selectedExamFilter === 'all'
                ? 'All Exams'
                : (summary.examGroups?.find(e => e.examId === selectedExamFilter)?.examTitle || 'Exam').slice(0, 24)}
            </button>
            <div className="absolute top-full left-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl p-2 min-w-[240px] max-h-72 overflow-y-auto hidden group-hover:block z-20 shadow-2xl">
              <button
                onClick={() => {
                  console.log('📚 Exam filter changed → All Exams');
                  setSelectedExamFilter('all');
                }}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  selectedExamFilter === 'all'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                All Exams
              </button>

              {summary.examGroups?.length > 0 ? (
                summary.examGroups.map((exam) => (
                  <button
                    key={exam.examId}
                    onClick={() => {
                      console.log('📚 Exam filter changed →', exam.examId, exam.examTitle);
                      setSelectedExamFilter(exam.examId);
                    }}
                    title={exam.examTitle}
                    className={`flex items-center justify-between gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedExamFilter === exam.examId
                        ? 'bg-amber-500/20 text-amber-300 font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{exam.examTitle}</span>
                    <span className="text-gray-500 text-xs flex-shrink-0">
                      {exam.totalReviews ?? exam.reviewCount ?? exam.count ?? 0}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-gray-500 text-xs text-center py-3">No published exams found</p>
              )}
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search reviews or exams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all"
          />
        </div>
      </GlassCard>

      {/* Reviews List Dynamic Feed */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((review, index) => (
              <motion.div
                key={review.id || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <GlassCard className="p-5 hover:border-white/10 transition-all group">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      {/* ✅ Updated Avatar with Student Name and Profile Pic */}
                      <StudentAvatar 
                        studentName={review.studentName} 
                        studentAvatar={review.studentAvatar} 
                        size={40}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {review.studentName || 'Anonymous'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{review.examTitle || 'Unknown Exam'}</span>
                          <span>•</span>
                          <Calendar size={12} />
                          <span>{review.submittedAt ? new Date(review.submittedAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-0.5 bg-white/3 px-2.5 py-1 rounded-lg border border-white/5">
                      {[...Array(5)].map((_, starIdx) => (
                        <Star 
                          key={starIdx} 
                          size={12} 
                          className={starIdx < review.rating ? "text-amber-400 fill-amber-400" : "text-gray-600"} 
                        />
                      ))}
                    </div>
                  </div>

                  {review.comments && (
                    <p className="text-sm text-gray-300 leading-relaxed pl-1">
                      "{review.comments}"
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      {review.difficulty && (
                        <Badge color="gray" size="sm">
                          Difficulty: {review.difficulty}
                        </Badge>
                      )}
                      {review.wouldRecommend !== null && (
                        <Badge color={review.wouldRecommend ? 'green' : 'red'} size="sm">
                          {review.wouldRecommend ? '👍 Recommended' : '👎 Not Recommended'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
              <MessageCircle size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No reviews found matching your selected filters.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}