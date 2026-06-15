import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { CheckCircle, XCircle, Trophy, Target, RotateCcw, BookOpen, ArrowRight } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import CircularProgress from '../../components/ui/CircularProgress';

const sectionResults = [
  { section: 'Grammar', score: 22, total: 32, pct: 69 },
  { section: 'Vocabulary', score: 21, total: 26, pct: 81 },
  { section: 'Listening', score: 19, total: 28, pct: 68 },
  { section: 'Reading', score: 18, total: 22, pct: 82 },
];

const radarData = sectionResults.map(s => ({ section: s.section, score: s.pct, fullMark: 100 }));

const reviewQuestions = [
  { q: 'Grammar Q1: Choose the correct particle for the sentence.', userAns: 'A', correct: 'B', explanation: 'In this context, particle に is used to indicate direction and destination. が marks the subject, not the destination.', wrong: true },
  { q: 'Vocabulary Q3: Select the synonym for 顕著.', userAns: 'A', correct: 'A', explanation: '顕著 means "remarkable" or "notable." 明らか (obvious/clear) is the closest synonym in this context.', wrong: false },
];

export default function ExamResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const total = sectionResults.reduce((s, r) => s + r.score, 0);
  const maxTotal = sectionResults.reduce((s, r) => s + r.total, 0);
  const percentage = Math.round((total / maxTotal) * 100);
  const passed = percentage >= 65;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8">
      {/* Result Summary */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className={`p-8 text-center ${passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            {passed ? <Trophy size={36} className="text-emerald-400" /> : <Target size={36} className="text-red-400" />}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{passed ? 'Congratulations!' : 'Keep Practicing!'}</h1>
          <p className="text-gray-300 mb-4">
            {passed ? 'You passed the JLPT N2 Full Mock Exam' : 'You did not pass this time, but you can retake it'}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Badge color={passed ? 'green' : 'red'} className="text-base px-4 py-2">
              {passed ? 'PASSED' : 'FAILED'} · {percentage}%
            </Badge>
          </div>
        </GlassCard>
      </motion.div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 flex items-center justify-center">
          <CircularProgress value={percentage} size={160} strokeWidth={14} color={passed ? '#10b981' : '#ef4444'} sublabel={passed ? 'Pass' : 'Fail'} label="Overall Score" />
        </GlassCard>

        <GlassCard className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-white mb-5">Section Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sectionResults}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="section" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
              <Bar dataKey="pct" fill="#3b82f6" radius={[6,6,0,0]} name="Score %" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Section Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sectionResults.map((s, i) => (
          <motion.div key={s.section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className="p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">{s.pct}%</div>
              <div className="text-sm text-gray-300">{s.section}</div>
              <div className="text-xs text-gray-500 mt-1">{s.score}/{s.total} correct</div>
              <div className="mt-2">
                <Badge color={s.pct >= 80 ? 'green' : s.pct >= 60 ? 'yellow' : 'red'}>
                  {s.pct >= 80 ? 'Strong' : s.pct >= 60 ? 'Average' : 'Weak'}
                </Badge>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Answer Review */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-5">Answer Review</h3>
        <div className="space-y-4">
          {reviewQuestions.map((q, i) => (
            <div key={i} className={`p-4 rounded-xl border ${q.wrong ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
              <div className="flex items-start gap-3 mb-3">
                {q.wrong ? <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" /> : <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />}
                <p className="text-sm font-medium text-white">{q.q}</p>
              </div>
              <div className="ml-7 space-y-1 text-sm">
                {q.wrong && <p className="text-red-300">Your answer: <span className="font-semibold">{q.userAns}</span></p>}
                <p className="text-emerald-300">Correct answer: <span className="font-semibold">{q.correct}</span></p>
                <p className="text-gray-400 mt-2 text-xs leading-relaxed">{q.explanation}</p>
              </div>
            </div>
          ))}
          <Button variant="secondary" size="sm">View All Answers <ArrowRight size={14} /></Button>
        </div>
      </GlassCard>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button variant="primary" size="lg" onClick={() => navigate(`/exam/${id}/take`)}>
          <RotateCcw size={18} /> Retake Exam
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/student')}>
          Back to Dashboard
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/student/marketplace')}>
          <BookOpen size={18} /> Browse More Exams
        </Button>
      </div>
    </div>
  );
}
