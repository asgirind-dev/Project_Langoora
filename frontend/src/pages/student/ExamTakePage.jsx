import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, AlertTriangle, ChevronLeft, ChevronRight,
  Flag, CheckCircle, Send, LayoutGrid, X,
  Volume2, Coffee, Lock, Loader2
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import studentApi from '../../services/studentExamService';

const MAX_VIOLATIONS = 3;

function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ExamTakePage() {
  const { id: examId } = useParams();
  const navigate = useNavigate();

  // State
  const [phase, setPhase] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [examMeta, setExamMeta] = useState(null);
  const [parts, setParts] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  
  const [partIndex, setPartIndex] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  
  const [partTimeLeft, setPartTimeLeft] = useState(0);
  const [breakTimeLeft, setBreakTimeLeft] = useState(0);
  
  const [violationCount, setViolationCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [warningBanner, setWarningBanner] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitModal, setSubmitModal] = useState(false);

  // Refs for safe callbacks
  const phaseRef = useRef(phase);
  const attemptIdRef = useRef(attemptId);
  const answersRef = useRef(answers);
  const flaggedRef = useRef(flagged);
  const partsRef = useRef(parts);
  const partIndexRef = useRef(partIndex);
  const qIndexRef = useRef(qIndex);
  const audioRef = useRef(null);
  
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { flaggedRef.current = flagged; }, [flagged]);
  useEffect(() => { partsRef.current = parts; }, [parts]);
  useEffect(() => { partIndexRef.current = partIndex; }, [partIndex]);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);

  // ---- Build parts from exam data ----
  const buildParts = useCallback((meta, itemsBySection) => {
    const isJLPT = meta.category_id === 'jlpt';
    const sectionTime = {};
    (meta.sections || []).forEach((s) => { sectionTime[s.name] = s.time; });
    const listeningAudio = (meta.sections || []).find((s) => s.name === 'Listening')?.audio_url || null;

    const parts = [];
    const sectionOrder = ['Vocabulary', 'Grammar', 'Listening'];

    sectionOrder.forEach((sectionName) => {
      const items = itemsBySection[sectionName] || [];
      if (items.length > 0) {
        const isListening = sectionName === 'Listening';
        parts.push({
          key: sectionName.toLowerCase(),
          label: sectionName,
          sections: [sectionName],
          items: items,
          durationSec: (sectionTime[sectionName] || 15) * 60,
          breakAfterSec: isListening ? 0 : 25, // 25 second break
          isAudio: isListening,
          audioUrl: isListening ? listeningAudio : null,
        });
      }
    });

    return parts.length > 0 ? parts : [{
      key: 'main',
      label: meta.title,
      sections: Object.keys(itemsBySection),
      items: Object.values(itemsBySection).flat(),
      durationSec: (meta.duration_minutes || 60) * 60,
      breakAfterSec: 0,
      isAudio: false,
    }];
  }, []);

  // ---- Fetch exam data and start attempt ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [metaRes, qRes] = await Promise.all([
          studentApi.get(`/student-exams/${examId}/metadata`),
          studentApi.get(`/student-exams/${examId}/questions`),
        ]);
        const meta = metaRes.data.data;
        const items = qRes.data.data;

        const bySection = {};
        items.forEach((it) => {
          const sec = it.section || 'General';
          if (!bySection[sec]) bySection[sec] = [];
          bySection[sec].push(it);
        });

        const startRes = await studentApi.post(`/student-exams/${examId}/start`);
        const attempt = startRes.data.data;

        if (cancelled) return;
        setExamMeta(meta);
        setParts(buildParts(meta, bySection));
        setAttemptId(attempt.attemptId);
        setPhase('intro');
      } catch (err) {
        console.error('Failed to initialize exam:', err);
        if (!cancelled) {
          setErrorMsg(err?.response?.data?.message || 'Could not load this exam. Please try again.');
          setPhase('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [examId, buildParts]);

  // ---- Begin a part ----
  const beginPart = useCallback((idx) => {
    const part = partsRef.current[idx];
    if (!part) return;
    setPartIndex(idx);
    setQIndex(0);
    setPartTimeLeft(part.durationSec);
    setPhase('in_part');
  }, []);

  // ---- Submit exam ----
  const doSubmit = useCallback(async (autoSubmitted = false) => {
    if (!attemptIdRef.current) return;
    setPhase('submitting');
    try {
      const payload = {
        answers: answersRef.current,
        flagged: Array.from(flaggedRef.current),
        autoSubmitted,
      };
      await studentApi.post(`/student-exams/${attemptIdRef.current}/submit`, payload);
      navigate(`/exam/${attemptIdRef.current}/results`);
    } catch (err) {
      console.error('Submit failed:', err);
      setErrorMsg('We could not submit your exam. Please check your connection and try again.');
      setPhase('error');
    }
  }, [navigate]);

  // ---- Part timer ----
  useEffect(() => {
    if (phase !== 'in_part') return;
    const t = setInterval(() => {
      setPartTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          const idx = partIndexRef.current;
          const part = partsRef.current[idx];
          const isLast = idx >= partsRef.current.length - 1;
          if (isLast) {
            doSubmit(true);
          } else if (part.breakAfterSec > 0) {
            setBreakTimeLeft(part.breakAfterSec);
            setPhase('break');
          } else {
            beginPart(idx + 1);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, beginPart, doSubmit]);

  // ---- Break timer ----
  useEffect(() => {
    if (phase !== 'break') return;
    const t = setInterval(() => {
      setBreakTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          beginPart(partIndexRef.current + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, beginPart]);

  // ---- Tab switch violation ----
  const reportViolation = useCallback(async () => {
    if (!attemptIdRef.current) return;
    try {
      const res = await studentApi.post(`/student-exams/${attemptIdRef.current}/violation`);
      const { tabSwitchCount, locked, lockedUntil: until } = res.data.data;
      setViolationCount(tabSwitchCount);

      if (locked) {
        setLockedUntil(until);
        setPhase('locked');
        doSubmit(true);
      } else {
        setWarningBanner(
          `Warning ${tabSwitchCount}/${MAX_VIOLATIONS}: leaving this tab during your exam is recorded as a rule violation.`
        );
        setTimeout(() => setWarningBanner(null), 6000);
      }
    } catch (err) {
      console.error('Could not report violation:', err);
    }
  }, [doSubmit]);

  useEffect(() => {
    const handler = () => {
      if (document.hidden && phaseRef.current === 'in_part') {
        reportViolation();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [reportViolation]);

  // ---- Audio for Listening ----
  useEffect(() => {
    if (phase !== 'in_part') return;

    const currentPart = partsRef.current[partIndexRef.current];
    const isListening = currentPart?.isAudio;
    const audioUrl = currentPart?.audioUrl;

    if (isListening && audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      audioRef.current = new Audio(audioUrl);
      audioRef.current.loop = false;
      audioRef.current.controls = false;

      audioRef.current.addEventListener('play', () => setAudioPlaying(true));
      audioRef.current.addEventListener('pause', () => setAudioPlaying(false));
      audioRef.current.addEventListener('ended', () => {
        setAudioPlaying(false);
      });

      audioRef.current.play().catch(() => {
        console.log('Autoplay blocked. User interaction required.');
      });
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setAudioPlaying(false);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [phase, partIndex]);

  // ---- Handlers ----
  const selectAnswer = (optionIdx) => {
    if (!currentItem) return;
    setAnswers((prev) => ({ ...prev, [currentItem.id]: optionIdx }));
  };

  const toggleFlag = () => {
    if (!currentItem) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentItem.id)) next.delete(currentItem.id);
      else next.add(currentItem.id);
      return next;
    });
  };

  const goNext = () => {
    if (qIndex < totalInPart - 1) setQIndex(qIndex + 1);
  };

  const goPrev = () => {
    // ⛔ CANNOT GO BACK TO PREVIOUS SECTION
    // Only allows going back within the current section
    if (qIndex > 0) setQIndex(qIndex - 1);
  };

  const handleSubmit = () => setSubmitModal(true);

  const confirmSubmit = () => {
    setSubmitModal(false);
    doSubmit(false);
  };

  const handleFinishPart = () => {
    const nextPart = parts[partIndex + 1];
    if (nextPart?.breakAfterSec > 0) {
      setBreakTimeLeft(nextPart.breakAfterSec);
      setPhase('break');
    } else {
      beginPart(partIndex + 1);
    }
  };

  // ---- Derived state ----
  const currentPart = parts[partIndex];
  const currentItem = currentPart?.items?.[qIndex];
  const totalInPart = currentPart?.items?.length || 0;

  const totalQuestions = parts.reduce((sum, p) => sum + p.items.length, 0);
  const answeredCount = Object.keys(answers).length;
  const timeColor = partTimeLeft < 60 ? 'text-red-400' : partTimeLeft < 300 ? 'text-yellow-400' : 'text-emerald-400';

  const isListening = currentPart?.isAudio;
  const hasAudio = currentPart?.audioUrl && currentPart.audioUrl.trim() !== '';
  const hasImage = currentItem?.image_url && currentItem.image_url.trim() !== '';
  const isFlagged = currentItem && flagged.has(currentItem.id);
  const selected = currentItem ? answers[currentItem.id] : undefined;

  // ─── Get Section Buttons (No "All" button) ────────────────────────────
  const sectionButtons = parts.map((part, idx) => ({
    key: part.key,
    label: part.label,
    index: idx,
    isActive: idx === partIndex,
    isCompleted: idx < partIndex,
  }));

  // ---- Loading ----
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#030810] flex flex-col items-center justify-center gap-3 text-white">
        <Loader2 className="animate-spin text-blue-400" size={32} />
        <p className="text-gray-400">Preparing your exam...</p>
      </div>
    );
  }

  // ---- Error ----
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center px-4">
        <GlassCard className="p-8 max-w-md text-center border-red-500/30 bg-red-500/5">
          <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
          <h2 className="text-white font-semibold mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
          <Button variant="primary" onClick={() => navigate('/student/my-exams')}>Back to My Exams</Button>
        </GlassCard>
      </div>
    );
  }

  // ---- Intro ----
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center px-4">
        <GlassCard className="p-8 max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{examMeta?.title}</h1>
          <p className="text-gray-400 mb-6">{examMeta?.description || 'Good luck!'}</p>
          <div className="space-y-2 text-sm text-gray-300 mb-8 text-left bg-white/[0.03] border border-white/5 rounded-xl p-4">
            <p>• This exam has {parts.length} sections: {parts.map((p) => p.label).join(' → ')}.</p>
            <p>• 25-second breaks are given automatically between sections.</p>
            {parts.some((p) => p.isAudio) && (
              <p>• The Listening section plays audio automatically — you cannot pause or rewind it.</p>
            )}
            <p>• You cannot go back to previous sections once you move forward.</p>
            <p>• Switching away from this tab is tracked. {MAX_VIOLATIONS} warnings will auto-submit.</p>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={() => beginPart(0)}>
            Start Exam
          </Button>
        </GlassCard>
      </div>
    );
  }

  // ---- Break ----
  if (phase === 'break') {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center px-4">
        <GlassCard className="p-10 max-w-md w-full text-center">
          <Coffee className="mx-auto text-amber-400 mb-4" size={36} />
          <h2 className="text-xl font-semibold text-white mb-1">Break time</h2>
          <p className="text-gray-400 text-sm mb-6">
            The next section starts automatically when the break ends.
          </p>
          <div className="text-5xl font-mono font-bold text-amber-300 mb-2">{fmtClock(breakTimeLeft)}</div>
          <p className="text-xs text-gray-500">Next up: {parts[partIndex + 1]?.label}</p>
        </GlassCard>
      </div>
    );
  }

  // ---- Locked ----
  if (phase === 'locked') {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center px-4">
        <GlassCard className="p-8 max-w-md w-full text-center border-red-500/30 bg-red-500/5">
          <Lock className="mx-auto text-red-400 mb-4" size={32} />
          <h2 className="text-xl font-semibold text-white mb-2">Attempt locked</h2>
          <p className="text-gray-400 text-sm mb-4">
            This attempt was auto-submitted after {MAX_VIOLATIONS} tab-switch warnings.
          </p>
          {lockedUntil && (
            <p className="text-xs text-gray-500 mb-6">
              You can start a new attempt after {new Date(lockedUntil).toLocaleString()}.
            </p>
          )}
          <Button variant="primary" onClick={() => navigate(`/exam/${attemptId}/results`)}>View My Results</Button>
        </GlassCard>
      </div>
    );
  }

  // ---- Submitting ----
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-[#030810] flex flex-col items-center justify-center gap-3 text-white">
        <Loader2 className="animate-spin text-blue-400" size={32} />
        <p className="text-gray-400">Submitting your paper...</p>
      </div>
    );
  }

  // ---- In Part (Main CBT Screen) ----
  if (!currentItem) {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center">
        <GlassCard className="p-8 text-center text-gray-500">No questions in this section.</GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030810] text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-[#030810]/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3">
          <div className="min-w-0 flex-1 mr-3">
            <h2 className="font-semibold text-white text-sm truncate">
              {examMeta?.title || 'Exam'}
            </h2>
            <p className="text-xs text-gray-400 hidden sm:block">
              {currentPart.label} · Q{qIndex + 1}/{totalInPart}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
            <div className={`flex items-center gap-1.5 font-mono font-bold text-base sm:text-xl ${timeColor}`}>
              <Clock size={16} className="hidden sm:block" />
              {fmtClock(partTimeLeft)}
            </div>
            <div className="text-center hidden sm:block">
              <div className="text-sm font-semibold text-white">{answeredCount}/{totalQuestions}</div>
              <div className="text-xs text-gray-400">Done</div>
            </div>
            <button
              onClick={() => setPaletteOpen(true)}
              className="lg:hidden p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"
            >
              <LayoutGrid size={16} className="text-gray-300" />
            </button>
            <Button variant="danger" size="sm" onClick={handleSubmit} className="hidden sm:flex">
              <Send size={14} /> Submit
            </Button>
            <Button variant="danger" size="sm" onClick={handleSubmit} className="sm:hidden">
              <Send size={14} />
            </Button>
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
            style={{ width: `${((qIndex + 1) / totalInPart) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Warning Banner */}
      <AnimatePresence>
        {warningBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-[68px] left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4"
          >
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <p>{warningBanner}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex pt-[68px] min-h-screen">
        {/* Main Question Area */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 lg:max-w-3xl lg:mx-auto">
          {/* Section Buttons - No "All" button */}
          <div className="flex gap-2 mb-4 sm:mb-6 flex-wrap">
            {sectionButtons.map((sec) => (
              <Badge
                key={sec.key}
                color={sec.isActive ? 'blue' : sec.isCompleted ? 'green' : 'gray'}
                className={`text-xs px-3 py-1.5 ${
                  sec.isActive ? 'bg-blue-500/20 border-blue-500/30' :
                  sec.isCompleted ? 'bg-emerald-500/20 border-emerald-500/30' :
                  'bg-white/5 border-white/10'
                }`}
              >
                {sec.isCompleted && '✓ '}{sec.label}
                {sec.isActive && ' (Current)'}
              </Badge>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  isListening 
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}>
                  {currentItem.section || currentPart.label}
                </span>
                <span className="text-gray-500 text-xs sm:text-sm">Q{qIndex + 1}</span>
                {isFlagged && (
                  <span className="flex items-center gap-1 text-amber-400 text-xs">
                    <Flag size={11} /> Flagged
                  </span>
                )}
              </div>

              {/* Listening Audio - Uncontrollable */}
              {isListening && hasAudio && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl border bg-purple-500/10 border-purple-500/30">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-purple-300">
                        <Volume2 size={14} className="inline mr-2" />
                        {audioPlaying ? '🔊 Audio playing...' : '⏸ Audio ready'}
                      </p>
                    </div>
                  </div>
                  <audio ref={audioRef} src={currentPart.audioUrl} autoPlay className="hidden" />
                </div>
              )}

              {/* Question Text */}
              {currentItem.problem_title && (
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{currentItem.problem_title}</p>
              )}
              {currentItem.passage_text && (
                <div className="text-sm text-gray-400 mb-3 leading-relaxed bg-white/[0.02] border border-white/5 rounded-lg p-3">
                  {currentItem.passage_text}
                </div>
              )}
              <div className="mb-6 sm:mb-8">
                <h3 className="text-base sm:text-xl font-semibold text-white leading-relaxed">
                  {currentItem.text}
                </h3>
              </div>

              {/* Image Display */}
              {hasImage && (
                <div className="mb-6 sm:mb-8">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center">
                    <img 
                      src={currentItem.image_url} 
                      alt={`Question ${qIndex + 1} image`}
                      className="max-w-full max-h-64 object-contain rounded-lg"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div class="flex flex-col items-center gap-2 text-gray-400 py-8">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            <span class="text-sm">Image could not be loaded</span>
                          </div>
                        `;
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="space-y-2.5 sm:space-y-3">
                {(currentItem.options || []).map((opt, idx) => {
                  const selectedOpt = selected === idx;
                  return (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => selectAnswer(idx)}
                      className={`w-full text-left p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 flex items-center gap-3 sm:gap-4 ${
                        selectedOpt
                          ? 'border-blue-500/70 bg-blue-500/15 text-white shadow-lg shadow-blue-500/10'
                          : 'border-white/10 bg-white/3 text-gray-300 hover:border-white/20 hover:bg-white/6'
                      }`}
                    >
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 transition-all ${
                        selectedOpt ? 'border-blue-500 bg-blue-500 text-white' : 'border-white/20 text-gray-400'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="text-xs sm:text-sm leading-relaxed">{opt}</span>
                      {selectedOpt && <CheckCircle size={16} className="ml-auto text-blue-400 flex-shrink-0" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
            <Button
              variant="secondary"
              size="sm"
              disabled={qIndex === 0}
              onClick={goPrev}
            >
              <ChevronLeft size={14} /> <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant={isFlagged ? 'secondary' : 'ghost'}
              size="sm"
              onClick={toggleFlag}
            >
              <Flag size={14} className={isFlagged ? 'text-amber-400' : ''} />
              <span className="hidden sm:inline ml-1">{isFlagged ? 'Unflag' : 'Flag'}</span>
            </Button>
            {qIndex < totalInPart - 1 ? (
              <Button variant="primary" size="sm" onClick={goNext}>
                <span className="hidden sm:inline">Next</span> <ChevronRight size={14} />
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={partIndex < parts.length - 1 ? handleFinishPart : handleSubmit}>
                {partIndex < parts.length - 1 ? 'Finish Section' : 'Submit Exam'}
              </Button>
            )}
          </div>
        </div>

        {/* Question Palette - Desktop */}
        <div className="hidden lg:block w-64 xl:w-72 flex-shrink-0 p-5 border-l border-white/10 fixed right-0 top-[68px] bottom-0 overflow-y-auto bg-[#060d1f]/50">
          <PaletteContent
            sections={parts.map(p => p.label)}
            paletteSection={currentPart?.label || ''}
            setPaletteSection={() => {}} // No-op - no section switching
            filteredQs={currentPart?.items || []}
            allQuestions={currentPart?.items || []}
            answers={answers}
            flagged={flagged}
            currentQ={qIndex}
            setCurrentQ={setQIndex}
            answeredCount={answeredCount}
          />
        </div>
      </div>

      {/* Question Palette - Mobile Drawer */}
      <AnimatePresence>
        {paletteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setPaletteOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#060d1f] border-l border-white/10 z-50 lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold text-white text-sm">Question Navigator</h3>
                <button onClick={() => setPaletteOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="p-4">
                <PaletteContent
                  sections={parts.map(p => p.label)}
                  paletteSection={currentPart?.label || ''}
                  setPaletteSection={() => {}}
                  filteredQs={currentPart?.items || []}
                  allQuestions={currentPart?.items || []}
                  answers={answers}
                  flagged={flagged}
                  currentQ={qIndex}
                  setCurrentQ={(idx) => { setQIndex(idx); setPaletteOpen(false); }}
                  answeredCount={answeredCount}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Submit Modal */}
      <Modal isOpen={submitModal} onClose={() => setSubmitModal(false)} title="Submit Exam?">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="text-2xl font-bold text-emerald-400">{answeredCount}</div>
              <div className="text-xs text-gray-400">Answered</div>
            </div>
            <div className="text-center p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="text-2xl font-bold text-amber-400">{flagged.size}</div>
              <div className="text-xs text-gray-400">Flagged</div>
            </div>
            <div className="text-center p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-2xl font-bold text-white">{totalQuestions - answeredCount}</div>
              <div className="text-xs text-gray-400">Unanswered</div>
            </div>
          </div>
          {totalQuestions - answeredCount > 0 && (
            <p className="text-amber-300 text-sm flex items-center gap-2">
              <AlertTriangle size={14} />{totalQuestions - answeredCount} questions are unanswered.
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setSubmitModal(false)}>Continue Exam</Button>
            <Button variant="primary" fullWidth onClick={confirmSubmit}>Submit Now</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ----- Palette Component -----
function PaletteContent({
  sections,
  paletteSection,
  setPaletteSection,
  filteredQs,
  allQuestions,
  answers,
  flagged,
  currentQ,
  setCurrentQ,
  answeredCount,
}) {
  return (
    <>
      <h4 className="text-sm font-semibold text-gray-300 mb-3">Question Navigator</h4>
      <div className="text-xs text-gray-500 mb-3">{paletteSection} Section</div>
      <div className="grid grid-cols-5 gap-1.5">
        {filteredQs.map((q, idx) => {
          const isAnswered = answers[q.id] !== undefined;
          const isFlagged = flagged.has(q.id);
          const isCurrent = idx === currentQ;
          return (
            <button
              key={q.id || idx}
              onClick={() => setCurrentQ(idx)}
              className={`w-9 h-9 rounded-lg text-xs font-bold transition-all border ${
                isCurrent
                  ? 'bg-blue-500 border-blue-400 text-white'
                  : isFlagged
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : isAnswered
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-500/20 border border-emerald-500/30 rounded" />
          <span className="text-gray-400">Answered ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500/20 border border-amber-500/50 rounded" />
          <span className="text-gray-400">Flagged ({flagged.size})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white/5 border border-white/10 rounded" />
          <span className="text-gray-400">Unanswered ({allQuestions.length - answeredCount})</span>
        </div>
      </div>
    </>
  );
}