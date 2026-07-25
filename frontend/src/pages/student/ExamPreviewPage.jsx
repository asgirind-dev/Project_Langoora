import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, BookOpen, Users, Star, Play, ShoppingCart, CheckCircle, Mic, FileText, ArrowLeft, Coins } from 'lucide-react';
import { featuredExams } from '../../data/mockData';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StarRating from '../../components/ui/StarRating';
import Modal from '../../components/ui/Modal';

export default function ExamPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchaseModal, setPurchaseModal] = useState(false);
  
  // Find the exam by ID, if not found, use the first exam as fallback
  const exam = featuredExams.find(e => e.id === Number(id));
  
  // If exam is not found, show error or redirect
  if (!exam) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Exam Not Found</h2>
        <p className="text-gray-400 mb-6">The exam you're looking for doesn't exist.</p>
        <Button variant="primary" onClick={() => navigate('/marketplace')}>
          Back to Marketplace
        </Button>
      </div>
    );
  }

  const sections = [
    { name: 'Grammar', questions: 32, time: '25 min', icon: FileText, desc: 'Sentence completion, error correction, and grammar patterns' },
    { name: 'Vocabulary', questions: 26, time: '20 min', icon: BookOpen, desc: 'Context clues, word forms, and vocabulary in use' },
    { name: 'Listening', questions: 28, time: '30 min', icon: Mic, desc: 'Native speaker audio with comprehension questions' },
    { name: 'Reading', questions: 22, time: '30 min', icon: FileText, desc: 'Long passages with detailed comprehension questions' },
  ];

  const sampleQuestions = [
    { q: 'Choose the correct particle: 私は学校___行きます。', options: ['が', 'に', 'を', 'で'], answer: 1 },
    { q: 'Select the best synonym for "顕著":', options: ['明らか', '複雑', '静か', '危険'], answer: 0 },
  ];

  const reviews = [
    { name: 'Sachini P.', rating: 5, text: 'Extremely close to the real JLPT format. Highly recommended!', date: '2024-06-05' },
    { name: 'Malith R.', rating: 4, text: 'Great explanations for every answer. The listening section is top quality.', date: '2024-06-01' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="relative h-48 sm:h-56 lg:h-64 rounded-xl sm:rounded-2xl overflow-hidden mb-5 sm:mb-6">
              <img src={exam.thumbnail} alt={exam.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge color="blue">{exam.category}</Badge>
                {exam.tag && <Badge color="amber">{exam.tag}</Badge>}
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{exam.title}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <img src={exam.tutorAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                {exam.tutor}
              </div>
              <StarRating rating={exam.rating} count={exam.reviews} size={12} />
              <span className="flex items-center gap-1"><Clock size={13} />{exam.duration}</span>
              <span className="flex items-center gap-1"><BookOpen size={13} />{exam.questions} Q</span>
            </div>
          </motion.div>

          {/* Sections */}
          <GlassCard className="p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Exam Structure</h2>
            <div className="space-y-2.5 sm:space-y-3">
              {sections.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-white/3 rounded-xl">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-500/15 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <s.icon size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-white text-sm">{s.name}</p>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-400 flex-shrink-0">
                        <span>{s.questions} Q</span>
                        <span>{s.time}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 hidden sm:block">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Sample Questions */}
          <GlassCard className="p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Sample Questions</h2>
            <div className="space-y-5">
              {sampleQuestions.map((q, i) => (
                <div key={i} className="space-y-3">
                  <p className="text-sm font-medium text-white">{i + 1}. {q.q}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, j) => (
                      <div key={j} className={`p-2.5 sm:p-3 rounded-xl text-sm border transition-all ${
                        j === q.answer ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/3 text-gray-300'
                      }`}>
                        <span className="font-medium mr-2">{String.fromCharCode(65 + j)}.</span>{opt}
                        {j === q.answer && <CheckCircle size={12} className="inline ml-2 text-emerald-400" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Reviews */}
          <GlassCard className="p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Student Reviews</h2>
            <div className="space-y-3 sm:space-y-4">
              {reviews.map((r, i) => (
                <div key={i} className="p-3 sm:p-4 bg-white/3 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white text-sm">{r.name}</span>
                    <span className="text-xs text-gray-500">{r.date}</span>
                  </div>
                  <StarRating rating={r.rating} size={12} />
                  <p className="text-sm text-gray-300 mt-2">{r.text}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar Purchase Card */}
        <div className="lg:col-span-1">
          <GlassCard className="p-5 sm:p-6 lg:sticky lg:top-24">
            <div className="text-center mb-5">
              <div className="flex items-center justify-center gap-2 text-3xl sm:text-4xl font-bold text-amber-400 mb-1">
                <Coins size={32} className="text-amber-400" />
                {exam.credits}
              </div>
              <div className="text-gray-400 text-sm">Credits required</div>
              <Badge color="blue" className="mt-2">Mock Exam</Badge>
            </div>
            <div className="space-y-3 mb-6">
              <Button variant="primary" size="lg" fullWidth onClick={() => setPurchaseModal(true)}>
                <ShoppingCart size={18} /> Unlock with Credits
              </Button>
              <Button variant="secondary" size="lg" fullWidth onClick={() => navigate(`/exam/${exam.id}/take`)}>
                <Play size={18} /> Free Preview
              </Button>
            </div>
            <div className="space-y-2.5 text-sm text-gray-300">
              {[
                `${exam.questions} questions across ${sections.length} sections`,
                `${exam.duration} exam duration`,
                'Instant results & explanations',
                'Lifetime access',
                '30-day money-back guarantee',
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{f}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      <Modal isOpen={purchaseModal} onClose={() => setPurchaseModal(false)} title="Confirm Purchase">
        <div className="space-y-5">
          <div className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <img src={exam.thumbnail} alt="" className="w-16 h-12 rounded-lg object-cover" />
            <div>
              <p className="font-medium text-white text-sm">{exam.title}</p>
              <div className="flex items-center gap-1 text-sm text-amber-400 font-semibold mt-1">
                <Coins size={14} /> {exam.credits} Credits
              </div>
            </div>
          </div>
          <Button variant="primary" fullWidth onClick={() => { setPurchaseModal(false); navigate(`/exam/${exam.id}/take`); }}>
            Confirm Purchase
          </Button>
        </div>
      </Modal>
    </div>
  );
}