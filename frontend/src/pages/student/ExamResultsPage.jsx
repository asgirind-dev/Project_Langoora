import { useEffect, useState } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  CheckCircle, XCircle, Trophy, Target, RotateCcw, BookOpen, ArrowRight, 
  Loader2, Star, ThumbsUp, Send, Clock, AlertCircle, Info,
  Layers, AlertTriangle, Medal
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import CircularProgress from '../../components/ui/CircularProgress';
import studentApi from '../../services/examExecutionService';

export default function ExamResultsPage() {
  const { id: attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  const [feedback, setFeedback] = useState({
    rating: 0,
    difficulty: '',
    nps: null,
    challenging: false,
    topicsToReview: [],
    comments: '',
    wantsFollowUp: false,
    wouldRecommend: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await studentApi.get(`/exam-execution/${attemptId}/results`);
        if (!cancelled) {
          setResult(res.data.data);
          
          try {
            const feedbackRes = await studentApi.get(`/exam-execution/${attemptId}/feedback`);
            if (feedbackRes.data.data) {
              setFeedbackSubmitted(true);
            }
          } catch (fbErr) {
            // No feedback yet
          }
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

  const handleSubmitFeedback = async () => {
    if (feedback.rating === 0) {
      alert('Please rate this exam before submitting.');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await studentApi.post(`/exam-execution/${attemptId}/feedback`, feedback);
      setFeedbackSubmitted(true);
      setShowFeedbackForm(false);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      alert('Could not submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

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
    percentage = 0,
    passed = false,
    passingType = 'TOTAL_AND_SECTION',
    passingSource = 'default',
    sectionScores = [],
    questionResults = [],
    score = 0,
    totalQuestions = 0,
    autoSubmitted = false,
    timeTakenSeconds = 0,
    overallPass,
    sectionResults = [],
    cutOffScore,
    achievedLevel,
    failReason,
  } = result;

  // Format time
  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Get passing type label
  const getPassingTypeLabel = (type) => {
    switch(type) {
      case 'TOTAL_AND_SECTION': return 'JLPT (Total + Section)';
      case 'CUT_OFF_SCORE': return 'EPS-TOPIK (Cut-off)';
      case 'LEVEL_RANGE': return 'TOPIK I (Level Range)';
      default: return 'Standard';
    }
  };

  // Get passing source label
  const getPassingSourceLabel = (source) => {
    switch(source) {
      case 'level': return 'Level-specific';
      case 'category': return 'Category default';
      default: return 'System default';
    }
  };

  // Render JLPT section details
  const renderJLPTDetails = () => {
    if (passingType !== 'TOTAL_AND_SECTION') return null;
    
    return (
      <div className="mt-4 border-t border-white/5 pt-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Section Requirements</h4>
        <div className="space-y-2">
          {sectionResults && sectionResults.length > 0 ? (
            sectionResults.map((section, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                <span className="text-sm text-gray-300">{section.name}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${section.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {section.achieved}%
                  </span>
                  <span className="text-xs text-gray-500">Required: {section.required}%</span>
                  {section.passed ? (
                    <CheckCircle size={16} className="text-emerald-400" />
                  ) : (
                    <XCircle size={16} className="text-red-400" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500">No section details available</p>
          )}
          <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-emerald-500/20">
            <span className="text-sm text-gray-300">Overall Passing Score</span>
            <span className="text-sm font-medium text-emerald-400">{overallPass || 'N/A'}%</span>
          </div>
        </div>
      </div>
    );
  };

  // Render EPS-TOPIK details
  const renderEPSDetails = () => {
    if (passingType !== 'CUT_OFF_SCORE') return null;
    
    return (
      <div className="mt-4 border-t border-white/5 pt-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Cut-off Information</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
            <span className="text-sm text-gray-300">Current Cut-off Score</span>
            <span className="text-sm font-medium text-amber-400">{cutOffScore || 'N/A'}%</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
            <span className="text-sm text-gray-300">Your Score</span>
            <span className={`text-sm font-medium ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
              {percentage}%
            </span>
          </div>
          {!passed && (
            <div className="flex items-center gap-2 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-xs text-red-300">
                Current recruitment cut-off score not reached. Please check the official announcement for the latest cut-off.
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render TOPIK details
  const renderTOPIKDetails = () => {
    if (passingType !== 'LEVEL_RANGE') return null;
    
    return (
      <div className="mt-4 border-t border-white/5 pt-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Level Information</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
            <span className="text-sm text-gray-300">Achieved Level</span>
            <span className={`text-sm font-bold ${achievedLevel && achievedLevel !== 'No Level' ? 'text-purple-400' : 'text-gray-400'}`}>
              {achievedLevel || 'No Level'}
            </span>
          </div>
          <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
            <span className="text-sm text-gray-300">Your Score</span>
            <span className={`text-sm font-medium ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
              {percentage}%
            </span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl">
            <p className="text-xs text-gray-400">Level Ranges:</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="text-xs bg-gray-500/10 px-2 py-1 rounded">0-79: No Level</span>
              <span className="text-xs bg-blue-500/10 px-2 py-1 rounded">80-139: Level 1</span>
              <span className="text-xs bg-purple-500/10 px-2 py-1 rounded">140-200: Level 2</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const sectionData = sectionScores.length > 0 ? sectionScores : [];

  const reviewQuestions = (questionResults || []).map((q, index) => {
    const questionText = q.problemTitle 
      ? `${q.problemTitle}: ${q.text || `Question ${index + 1}`}` 
      : (q.text || `Question ${index + 1}`);

    return {
      q: questionText,
      userAns: q.userAnswer || 'Not Answered',
      correct: q.correct || 'N/A',
      explanation: q.explanation || 'No explanation provided.',
      wrong: !q.isCorrect,
      isAnswered: q.isAnswered || false,
    };
  });

  const displayQuestions = showAllAnswers ? reviewQuestions : reviewQuestions.slice(0, 5);

  const StarRating = ({ rating, setRating, size = 32 }) => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={size}
              className={`${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8 px-4 text-white">
      {/* Result Summary */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className={`p-8 text-center ${passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            {passed ? <Trophy size={36} className="text-emerald-400" /> : <Target size={36} className="text-red-400" />}
          </div>
          
          <h1 className="text-4xl font-bold mb-2">
            {passed ? '🎉 Congratulations!' : '💪 Keep Practicing!'}
          </h1>
          
          <p className="text-gray-300 mb-4">
            {passed 
              ? `You passed ${examTitle || 'the exam'}!` 
              : `You did not pass ${examTitle || 'the exam'} this time`}
          </p>

          {/* TOPIK Level Display */}
          {passingType === 'LEVEL_RANGE' && passed && achievedLevel && achievedLevel !== 'No Level' && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <Medal size={20} className="text-purple-400" />
              <span className="text-lg font-bold text-purple-400">Achieved: {achievedLevel}</span>
            </div>
          )}

          {/* Fail Reason */}
          {!passed && failReason && (
            <div className="flex items-center justify-center gap-2 mb-3 bg-red-500/10 p-3 rounded-xl border border-red-500/20 max-w-md mx-auto">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{failReason}</p>
            </div>
          )}
          
          {/* Badges */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Badge color={passed ? 'green' : 'red'} className="text-base px-4 py-2">
              {passed ? 'PASSED' : 'FAILED'} · {percentage}%
            </Badge>
            
            <Badge color="gray" className="text-xs px-3 py-2 flex items-center gap-1.5">
              <Info size={14} />
              <span>{getPassingTypeLabel(passingType)}</span>
            </Badge>
            
            <Badge color="gray" className="text-xs px-3 py-2 flex items-center gap-1.5">
              <Layers size={14} />
              <span>{getPassingSourceLabel(passingSource)}</span>
            </Badge>
            
            {autoSubmitted && (
              <Badge color="yellow" className="text-xs px-3 py-2 flex items-center gap-1">
                <Clock size={12} /> Auto-submitted
              </Badge>
            )}
            <Badge color="gray" className="text-xs px-3 py-2 flex items-center gap-1">
              <Clock size={12} /> {formatTime(timeTakenSeconds)}
            </Badge>
          </div>
          
          <div className="mt-4 text-gray-400 text-sm">
            Score: {score}/{totalQuestions} correct ({totalQuestions - score} incorrect)
          </div>

          {/* Passing Type Specific Details */}
          {renderJLPTDetails()}
          {renderEPSDetails()}
          {renderTOPIKDetails()}
        </GlassCard>
      </motion.div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 flex items-center justify-center bg-[#060d1f]/40">
          <div className="text-center">
            <CircularProgress 
              value={percentage} 
              size={160} 
              strokeWidth={14} 
              color={passed ? '#10b981' : '#ef4444'} 
              sublabel={
                <div className="flex flex-col items-center">
                  <span className={`text-sm font-bold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {passed ? 'Pass' : 'Fail'}
                  </span>
                  {passingType === 'LEVEL_RANGE' && achievedLevel && achievedLevel !== 'No Level' && (
                    <span className="text-[10px] text-purple-400 mt-0.5">
                      {achievedLevel}
                    </span>
                  )}
                  <span className="text-[9px] text-gray-500 mt-0.5">
                    {getPassingTypeLabel(passingType)}
                  </span>
                </div>
              }
              label="Overall Score" 
            />
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2 p-6 bg-[#060d1f]/40">
          <h3 className="text-lg font-semibold mb-5">Section Breakdown</h3>
          {sectionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="section" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#0f1629', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '12px', 
                    color: '#fff' 
                  }} 
                  formatter={(value) => [`${value}%`, 'Score']}
                />
                <Bar 
                  dataKey="pct" 
                  fill="#3b82f6" 
                  radius={[6,6,0,0]} 
                  name="Score %"
                  label={({ value }) => `${value}%`}
                />
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
                    {s.pct >= 80 ? 'Strong' : s.pct >= 60 ? 'Average' : 'Needs Work'}
                  </Badge>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Answer Review */}
      <GlassCard className="p-6 bg-[#060d1f]/40">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Answer Review</h3>
          <span className="text-xs text-gray-500">
            {reviewQuestions.filter(q => q.isAnswered).length}/{reviewQuestions.length} answered
          </span>
        </div>
        {reviewQuestions.length === 0 ? (
          <p className="text-gray-500 text-sm">No answer review available for this attempt.</p>
        ) : (
          <div className="space-y-4">
            {displayQuestions.map((q, i) => (
              <div key={i} className={`p-4 rounded-xl border ${q.wrong ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                <div className="flex items-start gap-3 mb-3">
                  {q.wrong ? <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" /> : <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />}
                  <p className="text-sm font-medium">{q.q}</p>
                </div>
                <div className="ml-7 space-y-1 text-sm">
                  {!q.isAnswered && (
                    <p className="text-yellow-400">Not answered</p>
                  )}
                  {q.wrong && q.isAnswered && (
                    <p className="text-red-300">Your answer: <span className="font-semibold">{q.userAns}</span></p>
                  )}
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

      {/* Feedback Section */}
      {!feedbackSubmitted ? (
        <GlassCard className="p-6 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Share Your Feedback</h3>
              <p className="text-gray-400 text-sm">Help us improve by rating this exam and sharing your experience.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowFeedbackForm(!showFeedbackForm)}>
              {showFeedbackForm ? 'Hide Form' : 'Rate Exam'}
            </Button>
          </div>

          {showFeedbackForm && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 space-y-6"
            >
              {/* Rating */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  How would you rate this exam? *
                </label>
                <StarRating rating={feedback.rating} setRating={(val) => setFeedback({...feedback, rating: val})} />
                <p className="text-xs text-gray-500 mt-1">
                  {feedback.rating === 1 && 'Needs significant improvement'}
                  {feedback.rating === 2 && 'Below average'}
                  {feedback.rating === 3 && 'Average'}
                  {feedback.rating === 4 && 'Good'}
                  {feedback.rating === 5 && 'Excellent!'}
                </p>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  How difficult was this exam?
                </label>
                <div className="flex gap-3 flex-wrap">
                  {['Very Easy', 'Easy', 'Moderate', 'Hard', 'Very Hard'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setFeedback({...feedback, difficulty: level})}
                      className={`px-4 py-2 rounded-xl text-sm transition-all ${
                        feedback.difficulty === level 
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                          : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* NPS */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  On a scale of 0-10, how likely are you to recommend this exam to others?
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[0,1,2,3,4,5,6,7,8,9,10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setFeedback({...feedback, nps: num})}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                        feedback.nps === num 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Would Recommend */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  Would you recommend this exam to a friend?
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setFeedback({...feedback, wouldRecommend: true})}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                      feedback.wouldRecommend === true 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                    }`}
                  >
                    <ThumbsUp size={16} className="inline mr-2" /> Yes
                  </button>
                  <button
                    onClick={() => setFeedback({...feedback, wouldRecommend: false})}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                      feedback.wouldRecommend === false 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                    }`}
                  >
                    <ThumbsUp size={16} className="inline mr-2 rotate-180" /> No
                  </button>
                </div>
              </div>

              {/* Topics to Review */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  Which topics would you like to review more?
                </label>
                <div className="flex gap-2 flex-wrap">
                  {sectionData.map((s) => (
                    <button
                      key={s.section}
                      onClick={() => {
                        const topics = feedback.topicsToReview.includes(s.section)
                          ? feedback.topicsToReview.filter(t => t !== s.section)
                          : [...feedback.topicsToReview, s.section];
                        setFeedback({...feedback, topicsToReview: topics});
                      }}
                      className={`px-4 py-2 rounded-xl text-sm transition-all ${
                        feedback.topicsToReview.includes(s.section)
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                          : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {s.section} ({s.pct}%)
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  Additional Comments
                </label>
                <textarea
                  value={feedback.comments}
                  onChange={(e) => setFeedback({...feedback, comments: e.target.value})}
                  placeholder="Share any additional thoughts about the exam..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  rows={4}
                />
              </div>

              {/* Follow-up */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="wantsFollowUp"
                  checked={feedback.wantsFollowUp}
                  onChange={(e) => setFeedback({...feedback, wantsFollowUp: e.target.checked})}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="wantsFollowUp" className="text-sm text-gray-300">
                  I'd like to receive follow-up resources and recommendations
                </label>
              </div>

              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleSubmitFeedback}
                disabled={submittingFeedback || feedback.rating === 0}
                className="w-full"
              >
                {submittingFeedback ? (
                  <Loader2 className="animate-spin mr-2" size={18} />
                ) : (
                  <Send size={18} className="mr-2" />
                )}
                Submit Feedback
              </Button>
            </motion.div>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="p-6 border border-emerald-500/20 bg-emerald-500/5 text-center">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Thank You for Your Feedback!</h3>
          <p className="text-gray-400 text-sm">Your feedback helps us create better learning experiences.</p>
        </GlassCard>
      )}

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