import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, AlertTriangle, ChevronLeft, ChevronRight,
  Flag, CheckCircle, Send, LayoutGrid, X,
  Volume2, Coffee, Lock, Loader2, AlertCircle,
  BookOpen, PenSquare, Headphones, Sparkles, Info,
  ChevronUp, ChevronDown, ShieldAlert, PartyPopper,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import studentApi from '../../services/examExecutionService';

// ❌ REMOVED hardcoded MAX_VIOLATIONS
// const MAX_VIOLATIONS = 3;
const BREAK_DURATION = 25; // 25 seconds break between sections

function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ─── Brand tokens (Langoora) ─────────────────────────────────────────────
const BRAND = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  accent: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const SECTION_ICON = {
  Vocabulary: BookOpen,
  Grammar: PenSquare,
  Listening: Headphones,
};

const BREAK_TIPS = [
  "Re-read the question stem before jumping into the options — half of JLPT mistakes come from misreading, not misunderstanding.",
  "For 聴解 (Listening), the first sentence usually sets the scene. Catch it and the rest gets easier.",
  "Stuck between two options? Eliminate the one that contradicts the passage's tone, not just its facts.",
  "Take three slow breaths. A calm mind reads kanji faster than a rushed one.",
  "Flag and move on — you can always return. Momentum matters more than perfection.",
];

function sectionIconFor(label) {
  return SECTION_ICON[label] || Sparkles;
}

function timeColorTokens(secondsLeft) {
  if (secondsLeft < 60) return { text: 'text-red-400', ring: BRAND.danger, bg: 'bg-red-500/10', border: 'border-red-500/30' };
  if (secondsLeft < 300) return { text: 'text-amber-300', ring: BRAND.warning, bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
  return { text: 'text-emerald-300', ring: BRAND.success, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
}

// ─── Circular progress ring (used for header timer + break countdown) ───
function CircularTimer({ timeLeft, totalTime, size = 56, strokeWidth = 5, label }) {
  const tokens = timeColorTokens(timeLeft);
  const isCritical = timeLeft <= 30 && timeLeft > 0;
  const r = (100 - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0;
  const offset = circumference * (1 - fraction);

  return (
    <motion.div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      animate={isCritical ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={isCritical ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={tokens.ring}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.6s ease' }}
        />
      </svg>
      <div className="relative flex flex-col items-center leading-none">
        <span className={`font-mono font-bold ${tokens.text}`} style={{ fontSize: size * 0.24 }}>
          {fmtClock(timeLeft)}
        </span>
        {label && <span className="text-[9px] uppercase tracking-wider text-gray-500 mt-0.5">{label}</span>}
      </div>
    </motion.div>
  );
}

// ─── Small ring used inside the submit modal ─────────────────────────────
function RingStat({ value, total, size = 72, strokeWidth = 6, color, label, big }) {
  const r = (100 - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  const offset = circumference * (1 - fraction);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" width={size} height={size}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
          <motion.circle
            cx="50" cy="50" r={r} fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        <span className={`relative font-bold ${big ? 'text-xl' : 'text-lg'} text-white`}>{value}</span>
      </div>
      <span className="text-xs text-gray-400 text-center">{label}</span>
    </div>
  );
}

// ─── Segmented section progress bar for the header ───────────────────────
function SectionProgressBar({ parts, partIndex, qIndex }) {
  return (
    <div className="flex items-center gap-1.5 w-full">
      {parts.map((part, idx) => {
        const isDone = idx < partIndex;
        const isCurrent = idx === partIndex;
        const localFraction = isCurrent && part.items.length > 0 ? (qIndex + 1) / part.items.length : 0;
        return (
          <div key={part.key} className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent})`,
              }}
              initial={{ width: 0 }}
              animate={{ width: isDone ? '100%' : isCurrent ? `${localFraction * 100}%` : '0%' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function ExamTakePage() {
  const { id: examId } = useParams();
  const navigate = useNavigate();

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
  const [warningCountdown, setWarningCountdown] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitModal, setSubmitModal] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // ✅ Dynamic max violations from backend
  const [maxViolations, setMaxViolations] = useState(3);
  // ✅ Anti-cheat enabled status
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true);

  const phaseRef = useRef(phase);
  const attemptIdRef = useRef(attemptId);
  const answersRef = useRef(answers);
  const flaggedRef = useRef(flagged);
  const partsRef = useRef(parts);
  const partIndexRef = useRef(partIndex);
  const qIndexRef = useRef(qIndex);
  // audioRef holds ONLY the programmatically-created `new Audio()` instance.
  // Do NOT attach this ref to any rendered <audio> JSX element — doing so
  // caused React to overwrite it with the DOM node on every render, which
  // orphaned the real playing Audio object and made stopAudio() a no-op.
  const audioRef = useRef(null);
  const audioCleanupRef = useRef(null);
  const timerRef = useRef(null);
  const breakTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const audioPlayedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { flaggedRef.current = flagged; }, [flagged]);
  useEffect(() => { partsRef.current = parts; }, [parts]);
  useEffect(() => { partIndexRef.current = partIndex; }, [partIndex]);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);

  // ─── Fetch security policies when intro phase loads ────────────────────
  useEffect(() => {
    const fetchSecurityPolicies = async () => {
      if (phase !== 'intro') return;
      try {
        const res = await studentApi.get('/system-settings/security');
        if (res.data.success) {
          const maxV = res.data.data.maxViolationWarnings || 3;
          const enabled = res.data.data.enableAntiCheat !== false; // Default true
          setMaxViolations(maxV);
          setAntiCheatEnabled(enabled);
          console.log('✅ Security policies loaded:', { maxViolations: maxV, enableAntiCheat: enabled });
        }
      } catch (err) {
        console.error('Failed to fetch security policies:', err);
        // Keep default values (3, true)
      }
    };
    
    fetchSecurityPolicies();
  }, [phase]);

  // Attach a guaranteed-unique `_uid` to every item: `${sectionName}-${id}`,
  // falling back to the item's index if `id` is missing. This is used ONLY
  // for React `key` props / palette rendering.
  const withUid = (sectionName, arr) =>
    arr.map((it, idx) => ({
      ...it,
      _uid: it.id !== undefined && it.id !== null ? `${sectionName}-${it.id}` : `${sectionName}-${idx}`,
    }));

  // FIX: `item.id` alone is NOT safe to use as the answers/flags storage
  // key. Sub-question ids come from a `sub_questions` sub-collection scoped
  // to each individual problem (もんだい), so the same id (e.g. "sub_01")
  // legitimately repeats under every problem — within a section and across
  // sections. Using raw `id` as the key caused answering one もんだい's
  // question to also mark a same-id question in a different もんだい as
  // answered, since they shared one entry in the `answers` object.
  //
  // `questionDocId` (the parent problem document's id) IS unique across the
  // whole exam, since all problems live in one flat collection. Combining
  // `questionDocId` + `id` gives a collision-proof key. The backend
  // (examExecutionService.js submitExam) must use this exact same
  // `${questionDocId}::${id}` format when grading, or answers won't match.
  const itemKey = (item) => (item ? `${item.questionDocId}::${item.id}` : null);

  const buildParts = useCallback((meta, itemsBySection) => {
    const sectionTime = {};
    (meta.sections || []).forEach((s) => { sectionTime[s.name] = s.time; });
    const listeningAudio = (meta.sections || []).find((s) => s.name === 'Listening')?.audio_url || null;

    const parts = [];
    const sectionOrder = ['Vocabulary', 'Grammar', 'Listening'];

    sectionOrder.forEach((sectionName) => {
      const rawItems = itemsBySection[sectionName] || [];
      if (rawItems.length > 0) {
        const isListening = sectionName === 'Listening';
        const items = withUid(sectionName, rawItems);
        parts.push({
          key: sectionName.toLowerCase(),
          label: sectionName,
          sections: [sectionName],
          items,
          durationSec: (sectionTime[sectionName] || 15) * 60,
          breakAfterSec: isListening ? BREAK_DURATION : BREAK_DURATION,
          isAudio: isListening,
          audioUrl: isListening ? listeningAudio : null,
        });
      }
    });

    if (parts.length > 0) return parts;

    const fallbackItems = Object.entries(itemsBySection).flatMap(([sectionName, arr]) =>
      withUid(sectionName, arr)
    );

    return [{
      key: 'main',
      label: meta.title,
      sections: Object.keys(itemsBySection),
      items: fallbackItems,
      durationSec: (meta.duration_minutes || 60) * 60,
      breakAfterSec: 0,
      isAudio: false,
    }];
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [metaRes, qRes] = await Promise.all([
          studentApi.get(`/exam-execution/${examId}/metadata`),
          studentApi.get(`/exam-execution/${examId}/questions`),
        ]);
        const meta = metaRes.data.data;
        const items = qRes.data.data;

        const bySection = {};
        items.forEach((it) => {
          const sec = it.section || 'General';
          if (!bySection[sec]) bySection[sec] = [];
          bySection[sec].push(it);
        });

        const startRes = await studentApi.post(`/exam-execution/${examId}/start`);
        const attempt = startRes.data.data;

        if (cancelled) return;
        setExamMeta(meta);
        const builtParts = buildParts(meta, bySection);
        setParts(builtParts);

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

  // ✅ Robust audio stop function
  const stopAudio = useCallback(() => {
    try {
      if (audioCleanupRef.current) {
        audioCleanupRef.current();
        audioCleanupRef.current = null;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
        audioRef.current = null;
      }
    } catch (e) {
      console.log('Error stopping audio:', e);
    }

    setAudioPlaying(false);
    setAudioLoaded(false);
    audioPlayedRef.current = false;
  }, []);

  const startListeningAudio = useCallback((audioUrl) => {
    if (!audioUrl) return;
    if (audioPlayedRef.current) {
      console.log('Audio already played, skipping...');
      return;
    }

    stopAudio();

    const audio = new Audio(audioUrl);
    audio.loop = false;
    audio.controls = false;
    audioRef.current = audio;

    const handlePlay = () => {
      if (isMountedRef.current) {
        setAudioPlaying(true);
        audioPlayedRef.current = true;
        setAudioLoaded(true);
      }
    };

    const handlePause = () => {
      if (isMountedRef.current) {
        setAudioPlaying(false);
      }
    };

    const handleEnded = () => {
      if (isMountedRef.current) {
        setAudioPlaying(false);
        console.log('Audio ended naturally');
      }
    };

    const handleError = (e) => {
      console.error('Audio loading error:', e);
      if (isMountedRef.current) {
        setAudioPlaying(false);
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    audioCleanupRef.current = () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };

    audio.load();
    audio.play()
      .then(() => {
        if (isMountedRef.current) {
          console.log('Audio started playing');
          setAudioPlaying(true);
          audioPlayedRef.current = true;
          setAudioLoaded(true);
        }
      })
      .catch((err) => {
        console.log('Autoplay blocked:', err);
        if (isMountedRef.current) {
          setAudioPlaying(false);
          const playOnInteraction = () => {
            if (audioRef.current && !audioPlayedRef.current) {
              audioRef.current.play().catch(() => {});
            }
            document.removeEventListener('click', playOnInteraction);
          };
          document.addEventListener('click', playOnInteraction);
        }
      });
  }, [stopAudio]);

  const beginPart = useCallback((idx) => {
    const part = partsRef.current[idx];
    if (!part) return;

    stopAudio();
    audioPlayedRef.current = false;
    setAudioLoaded(false);

    if (part.isAudio) {
      setPartIndex(idx);
      setQIndex(0);
      setPartTimeLeft(part.durationSec);
      setPhase('in_part');
      startListeningAudio(part.audioUrl);
    } else {
      setPartIndex(idx);
      setQIndex(0);
      setPartTimeLeft(part.durationSec);
      setPhase('in_part');
    }
  }, [stopAudio, startListeningAudio]);

  const doSubmit = useCallback(async (autoSubmitted = false) => {
    if (!attemptIdRef.current) return;

    stopAudio();
    setPhase('submitting');

    try {
      const payload = {
        answers: answersRef.current,
        flagged: Array.from(flaggedRef.current),
        autoSubmitted,
      };
      await studentApi.post(`/exam-execution/${attemptIdRef.current}/submit`, payload);
      navigate(`/exam/${attemptIdRef.current}/results`);
    } catch (err) {
      console.error('Submit failed:', err);
      setErrorMsg('We could not submit your exam. Please check your connection and try again.');
      setPhase('error');
    }
  }, [navigate, stopAudio]);

  useEffect(() => {
    if (phase !== 'in_part') return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setPartTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;

          const idx = partIndexRef.current;
          const part = partsRef.current[idx];
          const isLast = idx >= partsRef.current.length - 1;

          if (part.isAudio) {
            stopAudio();
          }

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

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, beginPart, doSubmit, stopAudio]);

  useEffect(() => {
    if (phase !== 'break') return;

    if (breakTimerRef.current) clearInterval(breakTimerRef.current);

    breakTimerRef.current = setInterval(() => {
      setBreakTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(breakTimerRef.current);
          breakTimerRef.current = null;
          beginPart(partIndexRef.current + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
        breakTimerRef.current = null;
      }
    };
  }, [phase, beginPart]);

  // ✅ FIXED: reportViolation checks antiCheatDisabled flag
  const reportViolation = useCallback(async () => {
    if (!attemptIdRef.current) return;
    try {
      const res = await studentApi.post(`/exam-execution/${attemptIdRef.current}/violation`);
      const { currentViolations, isLocked, lockUntil, maxViolations: maxV, remaining, antiCheatDisabled } = res.data.data;
      
      // ✅ CHECK: If anti-cheat is disabled, do nothing - NO warnings, NO violations
      if (antiCheatDisabled) {
        console.log('🔓 Anti-cheat is disabled. Tab switch ignored.');
        return;
      }
      
      setViolationCount(currentViolations);
      setMaxViolations(maxV || 3);

      if (isLocked) {
        stopAudio();
        setLockedUntil(lockUntil);
        setPhase('locked');
        doSubmit(true);
      } else {
        const remainingMsg = remaining !== undefined ? remaining : (maxV - currentViolations);
        setWarningBanner(
          `Tab switch detected. This is violation ${currentViolations} of ${maxV || 3}. ${remainingMsg} more violation${remainingMsg > 1 ? 's' : ''} will auto-submit your exam.`
        );
        setWarningCountdown(8);

        if (warningTimerRef.current) clearInterval(warningTimerRef.current);

        warningTimerRef.current = setInterval(() => {
          setWarningCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(warningTimerRef.current);
              warningTimerRef.current = null;
              setWarningBanner(null);
              setWarningCountdown(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      console.error('Could not report violation:', err);
    }
  }, [doSubmit, stopAudio]);

  useEffect(() => {
    const handler = () => {
      if (document.hidden && phaseRef.current === 'in_part') {
        reportViolation();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [reportViolation]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopAudio();
    };
  }, [stopAudio]);

  const goNext = () => {
    if (qIndex < totalInPart - 1) setQIndex(qIndex + 1);
    setShowExplanation(false);
  };

  const goPrev = () => {
    if (qIndex > 0) setQIndex(qIndex - 1);
    setShowExplanation(false);
  };

  const handleSubmit = () => setSubmitModal(true);

  const confirmSubmit = () => {
    setSubmitModal(false);
    doSubmit(false);
  };

  const toggleExplanation = () => {
    setShowExplanation(!showExplanation);
  };

  const currentPart = parts[partIndex];
  const currentItem = currentPart?.items?.[qIndex];
  const totalInPart = currentPart?.items?.length || 0;

  // ✅ Define these AFTER currentItem is declared
  // Storage uses itemKey(item) — see the comment near its definition above
  // for why raw `item.id` is unsafe. The backend must grade using the same
  // `${questionDocId}::${id}` composite key.
  const selectAnswer = useCallback((optionIdx) => {
    if (!currentItem) return;
    if (currentItem.isExample === true) return;

    const key = itemKey(currentItem);
    if (answers[key] === optionIdx) {
      setAnswers((prev) => {
        const newAnswers = { ...prev };
        delete newAnswers[key];
        return newAnswers;
      });
    } else {
      setAnswers((prev) => ({ ...prev, [key]: optionIdx }));
    }
    setShowExplanation(false);
  }, [currentItem, answers]);

  const toggleFlag = () => {
    if (!currentItem) return;
    const key = itemKey(currentItem);
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // FIX: Example questions (isExample: true) should never count toward
  // progress. They're not user-answerable (selectAnswer blocks them), so
  // counting them in the denominator understates real progress. Both the
  // total and the answered tally are computed by walking each part's items
  // directly (rather than Object.keys(answers).length) and filtering out
  // examples, using the same collision-safe itemKey() the answers object is
  // actually keyed by.
  const totalQuestions = parts.reduce(
    (sum, p) => sum + p.items.filter((it) => !it.isExample).length,
    0
  );
  const answeredCount = parts.reduce(
    (sum, p) => sum + p.items.filter((it) => !it.isExample && answers[itemKey(it)] !== undefined).length,
    0
  );
  const tokens = timeColorTokens(partTimeLeft);
  const timeColor = tokens.text;

  const isListening = currentPart?.isAudio;
  const hasAudio = currentPart?.audioUrl && currentPart.audioUrl.trim() !== '';
  const hasImage = currentItem?.image_url && currentItem.image_url.trim() !== '';
  const isFlagged = currentItem && flagged.has(itemKey(currentItem));
  const selected = currentItem ? answers[itemKey(currentItem)] : undefined;
  const isExample = currentItem?.isExample === true;
  const correctAnswerIndex = currentItem?._correct;
  const explanation = currentItem?._explanation || '';

  const getProblemTitle = currentItem?.problem_title || currentItem?.section || '';

  const questionNumberInSection = (() => {
    if (!currentPart || !currentItem) return 1;
    if (isExample) return 0;

    const currentProblemTitle = currentItem.problem_title;
    if (!currentProblemTitle) {
      let count = 0;
      for (let i = 0; i <= qIndex; i++) {
        const item = currentPart.items[i];
        if (item && !item.isExample) {
          count++;
        }
      }
      return count;
    }

    let count = 0;
    for (let i = 0; i <= qIndex; i++) {
      const item = currentPart.items[i];
      if (item && !item.isExample && item.problem_title === currentProblemTitle) {
        count++;
      }
    }
    return count;
  })();

  const sectionButtons = parts.map((part, idx) => ({
    key: part.key,
    label: part.label,
    index: idx,
    isActive: idx === partIndex,
    isCompleted: idx < partIndex,
    isLocked: idx > partIndex,
  }));

  // FIX: exclude example questions from the per-section answered count and
  // give the palette a non-example total to render progress against.
  // `totalInPart` (defined above, includes examples) must stay as-is since
  // it's also used for navigation bounds (qIndex indexes the full items
  // array, examples included).
  const partAnsweredCount = currentPart
    ? currentPart.items.reduce((sum, it) => (!it.isExample && answers[itemKey(it)] !== undefined ? sum + 1 : sum), 0)
    : 0;
  const partFlaggedCount = currentPart
    ? currentPart.items.reduce((sum, it) => (flagged.has(itemKey(it)) ? sum + 1 : sum), 0)
    : 0;
  const partNonExampleTotal = currentPart
    ? currentPart.items.filter((it) => !it.isExample).length
    : 0;

  // ─── Loading State ───────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#030810] flex flex-col items-center justify-center gap-4 text-white">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-t-transparent"
            style={{ borderColor: `${BRAND.primary} transparent transparent transparent` }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <p className="text-gray-400 text-sm tracking-wide">Preparing your exam…</p>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center px-4">
        <GlassCard className="p-8 max-w-md text-center border-red-500/30 bg-red-500/5">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="text-red-400" size={26} />
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
          <Button variant="primary" onClick={() => navigate('/student/my-exams')}>
            Back to My Exams
          </Button>
        </GlassCard>
      </div>
    );
  }

  // ─── Intro State ─────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          <GlassCard className="p-8 text-center relative overflow-hidden">
            <div
              className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${BRAND.primary}, transparent 70%)` }}
            />
            <div
              className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` }}
            >
              <Sparkles className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{examMeta?.title}</h1>
            <p className="text-gray-400 mb-6 text-sm">{examMeta?.description || 'Good luck!'}</p>

            <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
              {parts.map((p, idx) => {
                const Icon = sectionIconFor(p.label);
                return (
                  <div key={p.key} className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-300">
                      <Icon size={13} className="text-indigo-300" /> {p.label}
                    </span>
                    {idx < parts.length - 1 && <ChevronRight size={14} className="text-gray-600" />}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2.5 text-sm text-gray-300 mb-8 text-left bg-white/[0.03] border border-white/5 rounded-2xl p-5">
              <p className="flex gap-2"><Info size={15} className="text-indigo-400 flex-shrink-0 mt-0.5" /> {BREAK_DURATION}-second breaks are given automatically between sections.</p>
              {parts.some((p) => p.isAudio) && (
                <p className="flex gap-2"><Volume2 size={15} className="text-purple-400 flex-shrink-0 mt-0.5" /> The Listening section plays audio automatically — you cannot pause or rewind it.</p>
              )}
              <p className="flex gap-2"><Lock size={15} className="text-gray-400 flex-shrink-0 mt-0.5" /> You cannot go back to previous sections once you move forward.</p>
              
              {/* ✅ Dynamic anti-cheat status message */}
              {antiCheatEnabled ? (
                <p className="flex gap-2">
                  <ShieldAlert size={15} className="text-amber-400 flex-shrink-0 mt-0.5" /> 
                  Switching away from this tab is tracked. {maxViolations} warnings will auto-submit.
                </p>
              ) : (
                <p className="flex gap-2">
                  <ShieldAlert size={15} className="text-green-400 flex-shrink-0 mt-0.5" /> 
                  🔓 Focus monitoring is currently disabled. Tab switching will not be tracked.
                </p>
              )}
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={() => beginPart(0)}>
              Start Exam
            </Button>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // ─── Break State ─────────────────────────────────────────────────────
  if (phase === 'break') {
    const nextPart = parts[partIndex + 1];
    const NextIcon = nextPart ? sectionIconFor(nextPart.label) : Coffee;
    const tip = BREAK_TIPS[partIndex % BREAK_TIPS.length];
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <GlassCard className="p-8 text-center relative overflow-hidden">
            <div
              className="absolute -top-20 -left-20 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${BRAND.warning}, transparent 70%)` }}
            />
            <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Coffee className="text-amber-400" size={26} />
            </div>
            <h2 className="text-xl font-semibold text-white mb-1">Break time</h2>
            <p className="text-gray-400 text-sm mb-6">
              The next section starts automatically when the break ends.
            </p>

            <div className="flex justify-center mb-6">
              <CircularTimer timeLeft={breakTimeLeft} totalTime={BREAK_DURATION} size={112} strokeWidth={7} label="left" />
            </div>

            {nextPart && (
              <div className="flex items-center justify-center gap-2.5 mb-5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <NextIcon size={16} className="text-indigo-300" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide">Next up</p>
                  <p className="text-sm font-medium text-white">
                    {nextPart.label} · {nextPart.items.length} questions
                  </p>
                </div>
              </div>
            )}

            <div className="text-left text-xs text-gray-400 bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3.5 mb-6 flex gap-2">
              <Sparkles size={14} className="text-indigo-300 flex-shrink-0 mt-0.5" />
              <span>{tip}</span>
            </div>

            <Button variant="primary" size="md" className="w-full" onClick={() => beginPart(partIndex + 1)}>
              Skip Break <ChevronRight size={15} />
            </Button>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // ─── Locked State ────────────────────────────────────────────────────
  if (phase === 'locked') {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center px-4">
        <GlassCard className="p-8 max-w-md w-full text-center border-red-500/30 bg-red-500/5">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <Lock className="text-red-400" size={26} />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Attempt locked</h2>
          <p className="text-gray-400 text-sm mb-4">
            This attempt was auto-submitted after {maxViolations} tab-switch warnings.
          </p>
          {lockedUntil && (
            <p className="text-xs text-gray-500 mb-6">
              You can start a new attempt after {new Date(lockedUntil).toLocaleString()}.
            </p>
          )}
          <Button variant="primary" onClick={() => navigate(`/exam/${attemptId}/results`)}>
            View My Results
          </Button>
        </GlassCard>
      </div>
    );
  }

  // ─── Submitting State ────────────────────────────────────────────────
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-[#030810] flex flex-col items-center justify-center gap-4 text-white">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-t-transparent"
            style={{ borderColor: `${BRAND.primary} transparent transparent transparent` }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <p className="text-gray-400 text-sm tracking-wide">Submitting your paper…</p>
      </div>
    );
  }

  // ─── In Part (Main CBT Screen) ──────────────────────────────────────
  if (!currentItem) {
    return (
      <div className="min-h-screen bg-[#030810] flex items-center justify-center">
        <GlassCard className="p-8 text-center text-gray-500">No questions in this section.</GlassCard>
      </div>
    );
  }

  const correctAnswerLetter = correctAnswerIndex !== undefined && currentItem.options && currentItem.options[correctAnswerIndex]
    ? String.fromCharCode(65 + correctAnswerIndex)
    : null;

  const isExampleQuestion = isExample === true;
  const SectionIcon = sectionIconFor(currentPart.label);

  return (
    <div className="min-h-screen bg-[#030810] text-white">
      {/* ─── Header ─── */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-[#030810]/90 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-2.5 sm:py-3">
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <SectionIcon size={16} className="text-indigo-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-white text-sm truncate">{currentPart.label}</h2>
              <p className="text-[11px] text-gray-500 truncate hidden sm:block">{examMeta?.title || 'Exam'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-5 flex-shrink-0">
            <CircularTimer timeLeft={partTimeLeft} totalTime={currentPart.durationSec} size={48} strokeWidth={4.5} />

            <button
              onClick={() => setPaletteOpen(true)}
              className="lg:hidden relative flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
            >
              <LayoutGrid size={16} className="text-gray-300" />
              <span className="text-xs font-semibold text-white">{answeredCount}/{totalQuestions}</span>
              {flagged.size > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">
                  {flagged.size}
                </span>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 px-2">
              <span className="font-semibold text-white text-sm">{answeredCount}</span>/{totalQuestions} answered
            </div>

            <Button variant="danger" size="sm" onClick={handleSubmit} className="hidden sm:flex min-h-[40px]">
              <Send size={14} /> Submit
            </Button>
            <Button variant="danger" size="sm" onClick={handleSubmit} className="sm:hidden min-h-[44px] min-w-[44px]">
              <Send size={14} />
            </Button>
          </div>
        </div>

        <div className="px-3 sm:px-6 pb-2.5">
          <SectionProgressBar parts={parts} partIndex={partIndex} qIndex={qIndex} />
        </div>
      </div>

      {/* ─── Warning Banner ─── */}
      <AnimatePresence>
        {warningBanner && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="fixed top-[84px] sm:top-[92px] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-full max-w-xl px-0"
          >
            <motion.div
              className="relative flex items-start gap-3 bg-[#1a0f02]/90 border text-amber-200 text-sm rounded-2xl px-4 sm:px-5 py-4 shadow-2xl shadow-amber-500/10 backdrop-blur-xl overflow-hidden"
              animate={{ borderColor: ['rgba(245,158,11,0.3)', 'rgba(245,158,11,0.7)', 'rgba(245,158,11,0.3)'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-amber-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-snug">{warningBanner}</p>
                {warningCountdown !== null && (
                  <div className="mt-2.5">
                    <div className="h-1 w-full bg-amber-500/15 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-amber-400 rounded-full"
                        initial={{ width: '100%' }}
                        animate={{ width: `${(warningCountdown / 8) * 100}%` }}
                        transition={{ duration: 1, ease: 'linear' }}
                      />
                    </div>
                    <p className="text-[11px] text-amber-400/70 mt-1.5">Dismissing in {warningCountdown}s</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setWarningBanner(null);
                  setWarningCountdown(null);
                  if (warningTimerRef.current) {
                    clearInterval(warningTimerRef.current);
                    warningTimerRef.current = null;
                  }
                }}
                className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <X size={16} className="text-amber-400/70 hover:text-amber-300" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex pt-[92px] sm:pt-[100px] min-h-screen">
        {/* ─── Main Question Area ─── */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 lg:max-w-3xl lg:mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${partIndex}-${qIndex}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` }}
                >
                  {getProblemTitle || currentItem.section || currentPart.label}
                </span>
                {!isExample && (
                  <span className="text-xs text-gray-500">
                    Question {questionNumberInSection}
                  </span>
                )}
                {isFlagged && (
                  <span className="flex items-center gap-1 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/25 rounded-full px-2.5 py-1">
                    <Flag size={11} /> Flagged
                  </span>
                )}
              </div>

              {isExample && (
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1.5">
                    <span className="text-sm">例</span>
                    <span className="text-amber-400/60">|</span>
                    <span className="font-normal text-amber-300/80">れい</span>
                    <span className="ml-1 text-gray-500 font-normal">(Example Question)</span>
                  </span>
                </div>
              )}

              {isListening && hasAudio && (
                <div className={`mb-5 sm:mb-6 p-4 rounded-2xl border transition-all duration-300 ${
                  audioPlaying
                    ? 'bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/10'
                    : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${audioPlaying ? 'bg-purple-500/20' : 'bg-white/10'}`}>
                      <Volume2 size={17} className={audioPlaying ? 'text-purple-300' : 'text-gray-400'} />
                      {audioPlaying && (
                        <motion.span
                          className="absolute w-10 h-10 rounded-xl border border-purple-400/50"
                          animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-purple-300 font-medium">
                        {audioPlaying ? 'Audio playing…' : audioLoaded ? 'Audio paused — click to resume' : 'Audio ready'}
                      </p>
                      {!audioPlaying && !audioLoaded && (
                        <p className="text-xs text-purple-400/70 mt-0.5">
                          Click anywhere on the screen to start audio if it doesn't autoplay
                        </p>
                      )}
                    </div>
                  </div>
                  {/* NOTE: intentionally no <audio> JSX element here. Audio is
                      managed entirely via the programmatic `new Audio()` instance
                      in audioRef (see startListeningAudio/stopAudio). Rendering a
                      second <audio ref={audioRef} .../> element here previously
                      caused React to overwrite audioRef.current with the DOM node,
                      orphaning the real playing audio so stopAudio() had nothing
                      to stop. */}
                </div>
              )}

              {currentItem.passage_text && (
                <div className="text-sm text-gray-400 mb-4 leading-relaxed bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  {currentItem.passage_text}
                </div>
              )}
              <div className="mb-6 sm:mb-8">
                <h3 className="text-base sm:text-xl font-semibold text-white leading-relaxed">
                  {currentItem.text}
                </h3>
              </div>

              {hasImage && (
                <div className="mb-6 sm:mb-8">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center">
                    <img
                      src={currentItem.image_url}
                      alt="Question"
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

              <div className="space-y-2.5 sm:space-y-3">
                {(currentItem.options || []).map((opt, idx) => {
                  const selectedOpt = selected === idx;
                  const isCorrect = isExample && idx === correctAnswerIndex;
                  const isDisabled = isExampleQuestion;

                  return (
                    <motion.div
                      key={idx}
                      onClick={() => { if (!isDisabled) selectAnswer(idx); }}
                      whileHover={!isDisabled ? { x: 3 } : {}}
                      whileTap={!isDisabled ? { scale: 0.99 } : {}}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-colors duration-200 flex items-center gap-3 sm:gap-4 min-h-[44px] ${
                        isDisabled
                          ? 'opacity-80 cursor-default bg-white/5 border-white/10'
                          : selectedOpt
                          ? 'border-indigo-500/70 bg-indigo-500/15 text-white shadow-lg shadow-indigo-500/10 cursor-pointer'
                          : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:bg-white/[0.06] cursor-pointer'
                      }`}
                    >
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 transition-all ${
                        selectedOpt
                          ? 'border-transparent text-white'
                          : isExample && isCorrect
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-white/20 text-gray-400'
                      }`}
                        style={selectedOpt ? { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` } : {}}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className={`text-xs sm:text-sm leading-relaxed ${isDisabled ? 'text-gray-500' : ''}`}>
                        {opt}
                      </span>
                      {selectedOpt && <CheckCircle size={16} className="ml-auto text-indigo-300 flex-shrink-0" />}
                      {isExample && isCorrect && !selectedOpt && (
                        <CheckCircle size={16} className="ml-auto text-emerald-400 flex-shrink-0" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {isExample && correctAnswerLetter && (
                <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <button
                    onClick={toggleExplanation}
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors min-h-[36px]"
                  >
                    <span className="text-emerald-400 font-semibold">✓ Correct Answer: {correctAnswerLetter}</span>
                    <span className="text-gray-500">|</span>
                    <span className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
                      {showExplanation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showExplanation && explanation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm text-gray-300 leading-relaxed flex gap-2">
                          <Info size={15} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                          <span>{explanation}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={qIndex === 0}
              onClick={goPrev}
              className="min-h-[44px]"
            >
              <ChevronLeft size={14} /> <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant={isFlagged ? 'secondary' : 'ghost'}
              size="sm"
              onClick={toggleFlag}
              className="min-h-[44px]"
            >
              <Flag size={14} className={isFlagged ? 'text-amber-400' : ''} />
              <span className="hidden sm:inline ml-1">{isFlagged ? 'Unflag' : 'Flag'}</span>
            </Button>
            {qIndex < totalInPart - 1 ? (
              <Button variant="primary" size="sm" onClick={goNext} className="min-h-[44px]">
                <span className="hidden sm:inline">Next</span> <ChevronRight size={14} />
              </Button>
            ) : (
              <Button variant="primary" size="sm" className="min-h-[44px]" onClick={partIndex < parts.length - 1 ? () => {
                const nextPart = parts[partIndex + 1];
                if (nextPart?.breakAfterSec > 0) {
                  setBreakTimeLeft(nextPart.breakAfterSec);
                  setPhase('break');
                } else {
                  beginPart(partIndex + 1);
                }
              } : handleSubmit}>
                {partIndex < parts.length - 1 ? 'Finish Section' : 'Submit Exam'}
              </Button>
            )}
          </div>
        </div>

        <div className="hidden lg:block w-64 xl:w-72 flex-shrink-0 p-5 border-l border-white/10 fixed right-0 top-[100px] bottom-0 overflow-y-auto bg-[#060d1f]/50">
          <PaletteContent
            sections={parts.map(p => p.label)}
            filteredQs={currentPart?.items || []}
            allQuestions={currentPart?.items || []}
            answers={answers}
            flagged={flagged}
            currentQ={qIndex}
            setCurrentQ={setQIndex}
            answeredCount={partAnsweredCount}
            flaggedCount={partFlaggedCount}
            totalQuestions={partNonExampleTotal}
            currentSectionLabel={currentPart?.label || ''}
            sectionButtons={sectionButtons}
          />
        </div>
      </div>

      {/* ─── Mobile Palette Bottom Sheet ─── */}
      <AnimatePresence>
        {paletteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setPaletteOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 right-0 bottom-0 max-h-[85vh] bg-[#060d1f] border-t border-white/10 rounded-t-3xl z-50 lg:hidden overflow-y-auto"
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <h3 className="font-semibold text-white text-sm">Question Navigator</h3>
                <button onClick={() => setPaletteOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="p-5">
                <PaletteContent
                  sections={parts.map(p => p.label)}
                  filteredQs={currentPart?.items || []}
                  allQuestions={currentPart?.items || []}
                  answers={answers}
                  flagged={flagged}
                  currentQ={qIndex}
                  setCurrentQ={(idx) => { setQIndex(idx); setPaletteOpen(false); }}
                  answeredCount={partAnsweredCount}
                  flaggedCount={partFlaggedCount}
                  totalQuestions={partNonExampleTotal}
                  currentSectionLabel={currentPart?.label || ''}
                  sectionButtons={sectionButtons}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Modal isOpen={submitModal} onClose={() => setSubmitModal(false)} title="Submit Exam?">
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <RingStat value={answeredCount} total={totalQuestions} color={BRAND.success} label="Answered" />
            <RingStat value={flagged.size} total={totalQuestions} color={BRAND.warning} label="Flagged" />
            <RingStat value={totalQuestions - answeredCount} total={totalQuestions} color="rgba(255,255,255,0.4)" label="Unanswered" />
          </div>
          {totalQuestions - answeredCount > 0 && (
            <div className="flex items-start gap-2.5 text-amber-300 text-sm bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{totalQuestions - answeredCount} question{totalQuestions - answeredCount > 1 ? 's are' : ' is'} still unanswered. You can go back and review before submitting.</span>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setSubmitModal(false)} className="min-h-[44px]">
              Continue Exam
            </Button>
            <Button variant="primary" fullWidth onClick={confirmSubmit} className="min-h-[44px]">
              Submit Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Palette Component ──────────────────────────────────────────────────
function PaletteContent({
  filteredQs,
  allQuestions,
  answers,
  flagged,
  currentQ,
  setCurrentQ,
  answeredCount,
  flaggedCount,
  totalQuestions,
  currentSectionLabel,
  sectionButtons,
}) {
  // Mirrors the main page's `questionNumberInSection` logic exactly: for a
  // question sharing a problem_title with others (e.g. sub-questions under
  // one reading passage), the number shown is this question's position among
  // items with the SAME problem_title, not a digit pulled out of the title
  // itself (which previously made every sub-question under one passage show
  // the same number).
  const getDisplayText = (q, index) => {
    if (q.isExample) return '例';
    if (!q.problem_title) {
      let count = 0;
      for (let i = 0; i <= index; i++) {
        const item = allQuestions[i];
        if (item && !item.isExample) count++;
      }
      return count;
    }
    let count = 0;
    for (let i = 0; i <= index; i++) {
      const item = allQuestions[i];
      if (item && !item.isExample && item.problem_title === q.problem_title) count++;
    }
    return count;
  };

  const getButtonColor = (q, isCurrent, isAnswered, isFlagged) => {
    if (isCurrent) return 'text-white shadow-lg';
    if (q.isExample) {
      return isAnswered
        ? 'bg-amber-500/30 border-amber-500/40 text-amber-200'
        : 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30';
    }
    if (isFlagged) return 'bg-amber-500/20 border-amber-500/50 text-amber-300';
    if (isAnswered) return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
    return 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20';
  };

  return (
    <>
      <h4 className="text-sm font-semibold text-gray-300 mb-3">Question Navigator</h4>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {sectionButtons && sectionButtons.map((sec) => {
          const Icon = sectionIconFor(sec.label);
          return (
            <Badge
              key={sec.key}
              color={sec.isActive ? 'blue' : sec.isCompleted ? 'green' : 'gray'}
              className={`text-xs px-2.5 py-1 flex items-center gap-1 ${
                sec.isActive ? 'bg-indigo-500/20 border-indigo-500/30' :
                sec.isCompleted ? 'bg-emerald-500/20 border-emerald-500/30' :
                'bg-white/5 border-white/10 opacity-50'
              }`}
            >
              <Icon size={11} />
              {sec.isCompleted && '✓ '}{sec.label}
              {sec.isActive && ' (Current)'}
            </Badge>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">{currentSectionLabel} Section</span>
        <span className="text-xs font-semibold text-white">{answeredCount}/{totalQuestions}</span>
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
            background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent})`,
          }}
        />
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {filteredQs.map((q, idx) => {
          const qKey = `${q.questionDocId}::${q.id}`;
          const isAnswered = answers[qKey] !== undefined;
          const isFlagged = flagged.has(qKey);
          const isCurrent = idx === currentQ;
          const isExample = q.isExample === true;
          const displayText = isExample ? '例' : getDisplayText(q, idx);
          const colorClass = getButtonColor(q, isCurrent, isAnswered, isFlagged);

          return (
            <button
              key={q._uid || idx}
              onClick={() => setCurrentQ(idx)}
              style={isCurrent ? { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`, borderColor: 'transparent' } : {}}
              className={`min-w-[36px] min-h-[36px] rounded-lg text-xs font-bold transition-all border ${colorClass}`}
            >
              {displayText}
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-2 text-xs border-t border-white/10 pt-4">
        <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-2">Legend</p>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-500/20 border border-emerald-500/30 rounded" />
          <span className="text-gray-400">Answered ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500/20 border border-amber-500/50 rounded" />
          <span className="text-gray-400">Flagged ({flaggedCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white/5 border border-white/10 rounded" />
          <span className="text-gray-400">Not visited / unanswered ({totalQuestions - answeredCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` }} />
          <span className="text-gray-400">Current question</span>
        </div>
        <div className="flex items-center gap-2 text-amber-400/70">
          <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[6px] font-bold text-white">
            例
          </div>
          <span className="text-gray-400">Example question</span>
        </div>
      </div>
    </>
  );
}