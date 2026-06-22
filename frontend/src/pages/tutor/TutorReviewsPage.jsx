import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, MessageSquare, ArrowLeft, Filter, Calendar, ThumbsUp, CheckCircle, Search, MessageCircle } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

// Mock Data - Realistically structured for your app
const reviewsSummary = {
  averageRating: 4.8,
  totalReviews: 624,
  breakdown: [
    { stars: 5, count: 512, percentage: 82 },
    { stars: 4, count: 86, percentage: 14 },
    { stars: 3, count: 18, percentage: 3 },
    { stars: 2, count: 6, percentage: 1 },
    { stars: 1, count: 2, percentage: 0 },
  ]
};

const allReviewsMock = [
  { id: 1, name: 'Kavindu P.', rating: 5, text: 'Excellent exam quality! Perfect for JLPT N2 preparation. Explanations for the grammar section were incredibly detailed.', examTitle: 'JLPT N2 Full Mock Exam 2024', date: '2024-06-09', verified: true },
  { id: 2, name: 'Dilini R.', rating: 4, text: 'Very detailed questions and good explanations. It would be perfect if there were more vocabulary examples.', examTitle: 'JLPT N3 Grammar Section', date: '2024-06-07', verified: true },
  { id: 3, name: 'Pathum N.', rating: 5, text: 'Highly recommended! Passed my N3 grammar questions easily after practicing this module multiple times.', examTitle: 'JLPT N3 Grammar Section', date: '2024-06-02', verified: true },
  { id: 4, name: 'Sajith M.', rating: 3, text: 'The content is good, but found a minor typo in question 14. Overall a solid test setup.', examTitle: 'JLPT N2 Full Mock Exam 2024', date: '2024-05-28', verified: false },
  { id: 5, name: 'Hiruni U.', rating: 5, text: 'Loved the breakdown of complex particles. Best tutor resources available for JLPT out there!', examTitle: 'JLPT N3 Grammar Section', date: '2024-05-25', verified: true },
];

export default function TutorReviewsPage() {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', '5', '4', '3', '2', '1'
  const [searchTerm, setSearchTerm] = useState('');

  // Filtering Logic
  const filteredReviews = allReviewsMock.filter(review => {
    const matchesFilter = selectedFilter === 'all' || review.rating === parseInt(selectedFilter);
    const matchesSearch = review.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          review.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          review.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/tutor/dashboard')}
            className="p-2.5 bg-white/5 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-xl transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Student Reviews</h1>
            <p className="text-gray-400">See what your students think about your published exams</p>
          </div>
        </div>
      </div>

      {/* Ratings Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Big Score Card */}
        <GlassCard className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-3">
            <Star size={28} className="text-amber-400 fill-amber-400" />
          </div>
          <div className="text-5xl font-extrabold text-white mb-2">{reviewsSummary.averageRating}</div>
          <div className="flex gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
            ))}
          </div>
          <p className="text-sm text-gray-400">Average Instructor Rating</p>
          <Badge color="amber" className="mt-4">Based on {reviewsSummary.totalReviews} Total Reviews</Badge>
        </GlassCard>

        {/* Progress Bars Breakdown */}
        <GlassCard className="p-6 md:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Rating Breakdown</h3>
          {reviewsSummary.breakdown.map((row) => (
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
          ))}
        </GlassCard>
      </div>

      {/* Filters and Search Bar */}
      <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Filter Badges */}
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
        </div>

        {/* Search Field */}
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
          {filteredReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <GlassCard className="p-5 hover:border-white/10 transition-all group">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
                  {/* Student Meta */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{review.name}</span>
                        {review.verified && (
                          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium">
                            <CheckCircle size={10} className="fill-current text-emerald-950" /> Verified Buyer
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <Calendar size={12} />
                        <span>{review.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stars Display */}
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

                {/* Review Text Body */}
                <p className="text-sm text-gray-300 leading-relaxed pl-1 sm:pl-13">
                  "{review.text}"
                </p>

                {/* Associated Course / Exam Link Footer */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500 pl-1 sm:pl-13">
                  <span className="truncate">
                    Exam: <span className="text-gray-400 font-medium group-hover:text-blue-400 transition-colors">{review.examTitle}</span>
                  </span>
                  <button className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors">
                    <ThumbsUp size={12} />
                    <span>Helpful</span>
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {filteredReviews.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
            <MessageCircle size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No reviews found matching your selected filters.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}