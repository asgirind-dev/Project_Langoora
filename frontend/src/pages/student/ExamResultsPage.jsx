import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { CheckCircle, XCircle, Trophy, Target, RotateCcw, BookOpen, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import CircularProgress from '../../components/ui/CircularProgress';
import studentApi from '../../services/studentExamService';

export default function ExamResultsPage() {
  const { id: attemptId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showAllAnswers, setShowAllAnswers] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await studentApi.get(`/student-exams/${attemptId}/results`);
        if (!cancelled) {
          setResult(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load results:', err);
        if (!cancelled) {
          setError('Could not load your results. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [attemptId]);

  // ----- Loading State -----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030810] flex flex-col items-center justify-center gap-3 text-white">
        <Loader2 className="animate-spin text-blue-400" size={32} />
        <p className="text-gray-400">Loading your results...</p>
      </div>
    );
  }

  // ----- Error State -----
  if (error || !result) {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center px-4">
        <GlassCard className="p-8 max-w-md text-center">
          <p className="text-gray-300 mb-6">{error || 'Results not found.'}</p>
          <Button variant="primary" onClick={() => navigate('/student/my-exams')}>
            Back to My Exams
          </Button>
        </GlassCard>
      </div>
    );
  }

  // ----- Not Submitted State -----
  if (result.status !== 'completed') {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center px-4">
        <GlassCard className="p-8 max-w-md text-center">
          <p className="text-gray-300 mb-6">This attempt hasn't been submitted yet.</p>
          <Button variant="primary" onClick={() => navigate(`/exam/${result.examId}/take`)}>
            Resume Exam
          </Button>
        </GlassCard>
      </div>
    );
  }

  // ----- Extract Data -----
  const {
    examId,
    examTitle,
    percentage,
    passed,
    sectionScores = [],
    questionResults = [],
    score,
    totalQuestions,
    autoSubmitted,
    tabSwitchCount,
  } = result;

  // ----- Format Section Data for Charts -----
  const sectionData = sectionScores.length > 0 ? sectionScores : [];
  const radarData = sectionData.map(s => ({ 
    section: s.section, 
    score: s.pct, 
    fullMark: 100 
  }));

  // ----- Build Review Questions -----
  const reviewQuestions = (questionResults || []).map((q, index) => ({
    q: q.problem_title ? `${q.problem_title}: ${q.text || `Question ${index + 1}`}` : (q.text || `Question ${index + 1}`),
    userAns: q.userAnswer !== null && q.userAnswer !== undefined ? String.fromCharCode(65 + q.userAnswer) : '—',
    correct: q.correct !== null && q.correct !== undefined ? String.fromCharCode(65 + q.correct) : '—',
    explanation: q.explanation || 'No explanation provided.',
    wrong: !q.isCorrect,
  }));

  const displayQuestions = showAllAnswers ? reviewQuestions : reviewQuestions.slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8 px-4">
      {/* Result Summary */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className={`p-8 text-center ${passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            {passed ? <Trophy size={36} className="text-emerald-400" /> : <Target size={36} className="text-red-400" />}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{passed ? 'Congratulations!' : 'Keep Practicing!'}</h1>
          <p className="text-gray-300 mb-4">
            {passed ? `You passed ${examTitle || 'the exam'}` : `You did not pass ${examTitle || 'the exam'} this time, but you can retake it`}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Badge color={passed ? 'green' : 'red'} className="text-base px-4 py-2">
              {passed ? 'PASSED' : 'FAILED'} · {percentage}%
            </Badge>
            {autoSubmitted && (
              <Badge color="yellow" className="text-xs px-3 py-2 flex items-center gap-1">
                <ShieldAlert size={12} /> Auto-submitted{tabSwitchCount ? ` (${tabSwitchCount} warnings)` : ''}
              </Badge>
            )}
          </div>
          <div className="mt-4 text-gray-400 text-sm">
            Score: {score}/{totalQuestions} correct
          </div>
        </GlassCard>
      </motion.div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 flex items-center justify-center">
          <CircularProgress 
            value={percentage} 
            size={160} 
            strokeWidth={14} 
            color={passed ? '#10b981' : '#ef4444'} 
            sublabel={passed ? 'Pass' : 'Fail'} 
            label="Overall Score" 
          />
        </GlassCard>

        <GlassCard className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-white mb-5">Section Breakdown</h3>
          {sectionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="section" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                <Bar dataKey="pct" fill="#3b82f6" radius={[6,6,0,0]} name="Score %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">No section breakdown available.</p>
          )}
        </GlassCard>
      </div>

      {/* Section Stats */}
      {sectionData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {sectionData.map((s, i) => (
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
      )}

      {/* Answer Review */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-5">Answer Review</h3>
        {reviewQuestions.length === 0 ? (
          <p className="text-gray-500 text-sm">No answer review available for this attempt.</p>
        ) : (
          <div className="space-y-4">
            {displayQuestions.map((q, i) => (
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
            {!showAllAnswers && reviewQuestions.length > 5 && (
              <Button variant="secondary" size="sm" onClick={() => setShowAllAnswers(true)}>
                View All Answers <ArrowRight size={14} />
              </Button>
            )}
            {showAllAnswers && reviewQuestions.length > 5 && (
              <Button variant="secondary" size="sm" onClick={() => setShowAllAnswers(false)}>
                Show Less <ArrowRight size={14} className="rotate-180" />
              </Button>
            )}
          </div>
        )}
      </GlassCard>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button variant="primary" size="lg" onClick={() => navigate(`/exam/${examId}/take`)}>
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