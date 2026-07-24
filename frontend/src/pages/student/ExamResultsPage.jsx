import { useEffect, useState } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle, Trophy, Target, BookOpen } from 'lucide-react';
import axios from 'axios'; // 🔌 Axios import කරන ලදී

import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import CircularProgress from '../../components/ui/CircularProgress';

export default function ExamResultsPage() {
  const { id } = useParams(); // URL එකෙන් එන purchaseId එක
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExamResult = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // 🔌 Backend එකේ purchased_exams එකෙන් මේ ශිෂ්‍යයාගේ ලකුණු විස්තර API එක හරහා ලබා ගැනීම
        // (සටහන: ඔයා ළඟ purchased record එක ගන්න වෙනම GET API එකක් නැත්නම් getStudentExams එකෙන් filter කරලා හෝ ගන්න පුළුවන්)
        const response = await axios.get(`http://localhost:5000/api/exams/my-exams`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          // ආපු exam list එකෙන් මේ purchase ID එකට අදාළ එක විතරක් සොයා ගැනීම
          const currentExamResult = response.data.exams.find(e => e.id === id);
          
          if (currentExamResult) {
            setResult(currentExamResult);
          } else {
            console.error("No such exam record found!");
          }
        }
      } catch (error) {
        console.error("Error fetching exam results:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchExamResult();
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <p className="text-xl">Loading Exam Results...</p>
      </div>
    );
  }

  // මෙතනදී result එක null/undefined නම් විතරක් Result not found වැටේ. (score 0 වුණාට මෙතනින් බ්ලොක් වෙන්නෙ නෑ)
  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <p className="text-xl text-red-400">Result not found.</p>
      </div>
    );
  }

  // Strict check: score එක 0 වුණත් නිවැරදිව 0 අගයම ලබා ගනී
  const percentage = result.lastScore !== null && result.lastScore !== undefined ? result.lastScore : 0; 
  const passed = percentage >= 65; // 65% හෝ ඊට වැඩි නම් Pass

  // Chart එකට දත්ත සකස් කිරීම
  const sectionResults = [
    { section: 'Overall', score: percentage, total: 100, pct: percentage }
  ];

  // Backend එකේ evaluation array එකක් සේව් කරලා තියෙනවා නම් ඒක පෙන්වීමට (නැත්නම් හිස්ව තබයි)
  const reviewQuestions = result.evaluation || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8 px-4 text-white">
      {/* Result Summary */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className={`p-8 text-center ${passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            {passed ? <Trophy size={36} className="text-emerald-400" /> : <Target size={36} className="text-red-400" />}
          </div>
          <h1 className="text-4xl font-bold mb-2">{passed ? 'Congratulations!' : 'Keep Practicing!'}</h1>
          <p className="text-gray-300 mb-4">
            {passed ? `You passed the exam with ${percentage}%!` : `You did not pass this time, your score is ${percentage}%. You can retake it!`}
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
        <GlassCard className="p-6 flex items-center justify-center bg-[#060d1f]/40">
          <CircularProgress value={percentage} size={160} strokeWidth={14} color={passed ? '#10b981' : '#ef4444'} sublabel={passed ? 'Pass' : 'Fail'} label="Overall Score" />
        </GlassCard>

        <GlassCard className="lg:col-span-2 p-6 bg-[#060d1f]/40">
          <h3 className="text-lg font-semibold mb-5">Section Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sectionResults}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="section" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
              <Bar dataKey="pct" fill={passed ? "#10b981" : "#ef4444"} radius={[6,6,0,0]} name="Score %" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Answer Review Section */}
      {reviewQuestions.length > 0 && (
        <GlassCard className="p-6 bg-[#060d1f]/40">
          <h3 className="text-lg font-semibold mb-5">Answer Review</h3>
          <div className="space-y-4">
            {reviewQuestions.map((q, i) => (
              <div key={i} className={`p-4 rounded-xl border ${!q.isCorrect ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                <div className="flex items-start gap-3 mb-3">
                  {!q.isCorrect ? <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" /> : <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />}
                  <p className="text-sm font-medium">Question ID: {q.questionId}</p>
                </div>
                <div className="ml-7 space-y-1 text-sm">
                  {!q.isCorrect && <p className="text-red-300">Your selected option index: <span className="font-semibold">{q.selectedOption !== null ? q.selectedOption : 'Not Answered'}</span></p>}
                  <p className="text-emerald-300">Correct option index: <span className="font-semibold">{q.correctOption}</span></p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button variant="primary" size="lg" onClick={() => navigate(`/student`)}>
          Back to Dashboard
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/student/marketplace')}>
          <BookOpen size={18} /> Browse More Exams
        </Button>
      </div>
    </div>
  );
}