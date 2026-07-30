import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronLeft, BookOpen, Plus, Trash2, 
  GripVertical, Upload, Save, Send, CheckCircle, 
  Mic, ShieldAlert, Loader, X, AlertCircle, Info, FileText, HelpCircle, Image, Clock, Eye
} from 'lucide-react';
import { createTutorExam, uploadExamAsset, getExamById, updateExamDraft, updateExam, API_URL } from '../../services/examService';
import { fetchActiveExamSchema } from '../../services/languageService';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import QuestionEditorToolbar from '../../components/exam/QuestionEditorToolbar';
import RichTextField from '../../components/exam/RichTextField';

const STEPS = ['Exam Details', 'Sections', 'Questions', 'Preview & Publish'];

// Autosave must run on a strict, fixed cadence (once every 150s) rather
// than re-firing / rescheduling on every keystroke, to avoid burning
// through the Firebase daily write quota. See the dedicated autosave
// effect below for how this interval is used.
const AUTO_SAVE_INTERVAL_MS = 150000;

// 🎯 localStorage key used by the session-expiry safety net (see
// cacheExamStateForRecovery / recovery effect below). Only ever holds the
// most recent unsaved exam state — not a history/log.
const EXAM_RECOVERY_STORAGE_KEY = 'langoora_exam_recovery_cache';

// Helper to strip HTML tags for display in sidebar/list items
const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export default function CreateExamPage() {
  const navigate = useNavigate();

  // ------------------------------------------------------------
  // 🌐 GLOBAL TOOLBAR TARGET TRACKING
  // activeFieldRef always points at the DOM node of whichever text
  // input/textarea was last focused, anywhere across Steps 1–4.
  // The floating QuestionEditorToolbar reads/writes this node
  // directly, so every field's existing onChange keeps working
  // unmodified. activeFieldLabel is purely cosmetic (shown in the
  // toolbar so the tutor can see which field they're formatting).
  // ------------------------------------------------------------
  const activeFieldRef = useRef(null);
  const [activeFieldLabel, setActiveFieldLabel] = useState(null);

  const handleFormFocusCapture = (e) => {
    const el = e.target;
    if (!el || !el.tagName) return;
    const type = (el.type || '').toLowerCase();
    const isTextLike =
      el.isContentEditable ||
      el.tagName === 'TEXTAREA' ||
      (el.tagName === 'INPUT' && ['text', 'search', 'email', 'url', 'tel', ''].includes(type));
    if (isTextLike) {
      activeFieldRef.current = el;
      setActiveFieldLabel(el.getAttribute('data-field-label') || el.getAttribute('placeholder') || el.getAttribute('aria-label') || 'Text field');
    }
  };

  const [step, setStep] = useState(0);
  
  const [activeSchema, setActiveSchema] = useState([]);
  const [availableLevels, setAvailableLevels] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [error, setError] = useState('');

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [examId, setExamId] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const isSavingRef = useRef(false);
  const [isViewExamOpen, setIsViewExamOpen] = useState(false);

  // 🎯 Session-expiry safety net (does not affect autosave timing/logic
  // itself — only reacts to the `isAuthExpired` flag examService.js now
  // attaches when a token refresh + retry both fail).
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const sessionExpiredHandledRef = useRef(false);
  const pendingSaveActionRef = useRef(null); // 'autosave' | 'draft' | a publish statusType (e.g. 'pending')

  // Refs mirror the latest state so the autosave interval (created once,
  // see effect below) always reads current values without needing to be
  // torn down and recreated whenever meta/sections/questions change.
  const hasChangesRef = useRef(false);
  const metaRef = useRef(null);
  const sectionsRef = useRef(null);
  const questionsRef = useRef(null);
  const examIdRef = useRef(null);
  
  const [isNewExam, setIsNewExam] = useState(true);

  const [meta, setMeta] = useState({
    title: '', 
    category_id: '', 
    level_id: '', 
    duration_minutes: 0, 
    description: '', 
    thumbnail: ''
  });
  
  const [sections, setSections] = useState([
    { id: 1, name: 'Vocabulary', questions: 5, time: 25 },
    { id: 2, name: 'Grammar', questions: 5, time: 35 },
    { id: 3, name: 'Listening', questions: 5, time: 30 }
  ]);
  
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  // ============================================================
  // ✅ UTILITY FUNCTIONS
  // ============================================================
  
  // ✅ FIXED: Use toLowerCase() instead of toUpperCase()
  // This ensures category_id matches Firestore document IDs (e.g., "jlpt")
  const getNormalizedCategory = (catId) => {
    if (!catId) return '';
    return catId.toLowerCase().replace(/[\s_]/g, '-').trim();
  };

  const isEpstopik = getNormalizedCategory(meta.category_id) === 'eps-topik';
  const isJlpt = getNormalizedCategory(meta.category_id) === 'jlpt';

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const getLastSavedText = () => {
    if (!lastSavedAt) return 'Not saved yet';
    const diff = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
    if (diff < 60) return `Saved ${diff}s ago`;
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved at ${lastSavedAt.toLocaleTimeString()}`;
  };

  const isListeningSection = (sectionName) => {
    return sectionName?.toLowerCase().includes('listen');
  };

  // ============================================================
  // ✅ EFFECTS
  // ============================================================

  useEffect(() => {
    const syncSchemaMatrix = async () => {
      try {
        setGlobalLoading(true);
        const responseData = await fetchActiveExamSchema();
        let extractedSchema = [];
        if (responseData && responseData.success && Array.isArray(responseData.schema)) {
          extractedSchema = responseData.schema;
        } else if (Array.isArray(responseData)) {
          extractedSchema = responseData;
        } else if (responseData && Array.isArray(responseData.schema)) {
          extractedSchema = responseData.schema;
        }
        setActiveSchema(extractedSchema);
        console.log('✅ Categories loaded from database:', extractedSchema.length);
      } catch (err) {
        console.error("Schema Fetch Error:", err);
        showNotification('Failed to load exam categories from database. Please refresh and try again.', 'error');
      } finally {
        setGlobalLoading(false);
      }
    };
    syncSchemaMatrix();
  }, []);

  useEffect(() => {
    if (isEpstopik) {
      setMeta(p => ({ ...p, duration_minutes: 50 }));
      return;
    }
    const totalTime = sections.reduce((sum, sec) => sum + Number(sec.time || 0), 0);
    setMeta(p => ({ ...p, duration_minutes: totalTime }));
  }, [sections, isEpstopik]);

  useEffect(() => {
    if (!globalLoading) {
      setHasChanges(true);
    }
  }, [meta, sections, questions]);

  // Mirror latest state into refs so the fixed-cadence autosave interval
  // (set up once below) always reads current data without re-registering.
  useEffect(() => { hasChangesRef.current = hasChanges; }, [hasChanges]);
  useEffect(() => { metaRef.current = meta; }, [meta]);
  useEffect(() => { sectionsRef.current = sections; }, [sections]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { examIdRef.current = examId; }, [examId]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const editExamId = searchParams.get('examId');
    if (editExamId) {
      setExamId(editExamId);
      setIsNewExam(false);
      loadExamForEdit(editExamId);
    } else {
      setIsNewExam(true);
    }
  }, []);

  // 🎯 Session-expiry safety net: on mount, check for a cached exam state
  // left behind by a previous save that failed because the token could
  // not be silently refreshed (see cacheExamStateForRecovery). A short
  // delay lets the normal load-exam-for-edit flow above finish first, so
  // the recovered (more recent) local edits are applied last and aren't
  // clobbered by the server's copy.
  useEffect(() => {
    const recoveryTimer = setTimeout(() => {
      try {
        const cachedRaw = localStorage.getItem(EXAM_RECOVERY_STORAGE_KEY);
        if (!cachedRaw) return;

        const cached = JSON.parse(cachedRaw);
        const currentExamIdFromUrl = new URLSearchParams(window.location.search).get('examId') || null;

        // Only restore if the cache belongs to *this* exam (or both this
        // page and the cache are for a not-yet-created new exam) — a
        // recovery cache from editing a different paper is left alone.
        if ((cached.examId || null) !== currentExamIdFromUrl) return;

        setMeta(cached.meta);
        setSections(cached.sections);
        setQuestions(cached.questions);
        setHasChanges(true);
        pendingSaveActionRef.current = cached.pendingAction || 'draft';

        showNotification('🔄 Restored your unsaved changes from before the session expired.', 'success');

        // If the tutor already re-authenticated (e.g. in another tab) by
        // the time they're back on this page, flush the recovered save
        // automatically instead of making them click anything.
        setTimeout(() => {
          retryPendingSaveAfterReauth();
        }, 500);
      } catch (e) {
        console.error('Failed to restore exam recovery cache:', e);
      }
    }, 1000);

    return () => clearTimeout(recoveryTimer);
  }, []);

  useEffect(() => {
    if (!globalLoading && activeSchema.length > 0 && examId && !isNewExam) {
      const normalizedCategory = getNormalizedCategory(meta.category_id);
      console.log('🔄 Reloading levels for category:', normalizedCategory);
      
      if (normalizedCategory) {
        const targetCluster = activeSchema.find(c => {
          const catName = getNormalizedCategory(c.category_name);
          const catId = getNormalizedCategory(c.id);
          return catName === normalizedCategory || catId === normalizedCategory;
        });
        
        console.log('🎯 Target cluster found:', targetCluster?.category_name);
        
        if (targetCluster && targetCluster.levels && targetCluster.levels.length > 0) {
          const levels = targetCluster.levels.map(level => ({
            id: level.id || level.level_id || level.level_name,
            level_name: level.level_name || level.name || level.id,
            credit_cost: level.credit_cost || 0,
            isCreditSet: level.isCreditSet || false,
            ...level
          }));
          setAvailableLevels(levels);
          console.log('📊 Levels reloaded:', levels.length);
        } else {
          setAvailableLevels([]);
          console.log('⚠️ No levels found for category:', normalizedCategory);
        }
      }
    }
  }, [globalLoading, activeSchema, examId, meta.category_id]);

  // ============================================================
  // ✅ AUTO-SAVE TIMER — fires strictly once every 150 seconds
  // ============================================================
  // This interval is created exactly once (on mount, once initial data
  // load finishes) and never torn down/recreated on every keystroke.
  // Each tick checks `hasChangesRef` and only writes to Firebase if
  // something actually changed since the last save — so typing does
  // not create additional Firebase calls, and there is never more than
  // one autosave write per 150s window.
  useEffect(() => {
    if (globalLoading) return undefined;

    autoSaveTimerRef.current = setInterval(() => {
      if (
        hasChangesRef.current &&
        !isSavingRef.current &&
        metaRef.current?.title?.trim()
      ) {
        handleAutoSave();
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [globalLoading]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges && !isSavingRef.current && meta.title.trim()) {
        // 🎯 FIX: calling the regular async handleAutoSave() here is
        // unreliable — the browser tears down the page (and any in-flight
        // axios request with it) before the promise has a chance to
        // resolve, so the "last-chance" save on tab-close routinely never
        // actually reached the server. `fetch` with `keepalive: true` is
        // specifically designed to survive page unload and is the
        // correct tool for this "final flush" write.
        sendBeaconSafeDraftSave();
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  // 🎯 Best-effort draft flush on page unload, using `fetch(..., { keepalive: true })`
  // so the request survives the page being torn down. Reads from refs
  // (same pattern as handleAutoSave) since state closures here would be
  // stale by the time the tab is actually closing.
  const sendBeaconSafeDraftSave = () => {
    const currentExamId = examIdRef.current;
    if (!currentExamId) return; // nothing to PUT to yet — new/unsaved exam, can't flush via keepalive fetch

    const currentMeta = metaRef.current || meta;
    const currentSections = sectionsRef.current || sections;
    const currentQuestions = questionsRef.current || questions;
    const draftData = buildExamPayload(currentMeta, currentSections, currentQuestions, 'draft');

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      fetch(`${API_URL}/${currentExamId}/draft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(draftData),
        keepalive: true
      });
    } catch (err) {
      // Best-effort only — nothing more we can do once the tab is closing.
      console.error('Keepalive draft flush failed to dispatch:', err);
    }
  };

  // ============================================================
  // ✅ SHARED PAYLOAD BUILDER (used by autosave, save-draft, publish)
  // ============================================================
  // Reads its arguments explicitly (never closes over component state)
  // so it produces correct output whether it's called from a fresh
  // render or from the long-lived autosave interval reading refs.
  const buildExamPayload = (metaSnapshot, sectionsSnapshot, questionsSnapshot, statusOverride) => {
    const normalizedCategory = getNormalizedCategory(metaSnapshot.category_id);
    const isEpstopikSnapshot = normalizedCategory === 'eps-topik';

    return {
      title: metaSnapshot.title.trim() || 'Untitled Draft',
      category_id: normalizedCategory,
      level_id: metaSnapshot.level_id || '',
      duration_minutes: Number(metaSnapshot.duration_minutes) || 0,
      description: metaSnapshot.description || '',
      thumbnail: metaSnapshot.thumbnail || '',
      status: statusOverride || 'draft',
      sections: sectionsSnapshot.map(s => ({
        name: s.name,
        questions: Number(s.questions || 0),
        time: Number(s.time || 0),
        audio_url: s.audio_url || null
      })),
      questions: questionsSnapshot.map(q => {
        if (q.is_problem) {
          return {
            id: q.id,
            is_problem: true,
            section: q.section,
            problem_title: q.problem_title || `Problem`,
            explanation: q.explanation || '',
            example_question: q.example_question || '',
            example_correct_option: Number(q.example_correct_option || 0),
            example_explanation: q.example_explanation || '',
            options: q.options || ['', '', '', ''],
            example_image_url: q.example_image_url || null,
            example_audio_url: q.example_audio_url || null,
            problem_image_url: q.problem_image_url || null
          };
        }
        return {
          id: q.id,
          is_problem: false,
          section: q.section,
          parent_problem_id: q.parent_problem_id || null,
          type: q.type || (isEpstopikSnapshot ? (isListeningSection(q.section) ? 'listening' : 'reading') : (isListeningSection(q.section) ? 'listening' : 'mcq')),
          text: q.text || '',
          options: q.options || ['', '', '', ''],
          correct: Number(q.correct || 0),
          explanation: q.explanation || '',
          image_url: q.image_url || null,
          audio_url: q.audio_url || null
        };
      })
    };
  };

  // ============================================================
  // ✅ SESSION-EXPIRY SAFETY NET (new)
  // ============================================================
  // These helpers do NOT change how/when autosave or manual save run —
  // they only kick in from inside the existing catch blocks below, when
  // examService.js reports that a token refresh + retry both failed
  // (err.isAuthExpired === true). They cache the in-memory exam state to
  // localStorage so nothing is lost, and surface a non-destructive modal
  // instead of redirecting the tutor away mid-edit.
  // ============================================================

  const cacheExamStateForRecovery = (pendingAction) => {
    try {
      const payload = {
        examId: examIdRef.current || null,
        meta: metaRef.current || meta,
        sections: sectionsRef.current || sections,
        questions: questionsRef.current || questions,
        pendingAction,
        cachedAt: new Date().toISOString()
      };
      localStorage.setItem(EXAM_RECOVERY_STORAGE_KEY, JSON.stringify(payload));
    } catch (storageErr) {
      console.error('Failed to cache exam recovery state:', storageErr);
    }
  };

  const clearExamRecoveryCache = () => {
    try {
      localStorage.removeItem(EXAM_RECOVERY_STORAGE_KEY);
    } catch (storageErr) {
      // Nothing further to do if localStorage itself is unavailable.
    }
  };

  // Called from the catch blocks of handleAutoSave / handleManualSaveDraft /
  // handlePublishExam whenever the underlying request failed specifically
  // because the token could not be silently refreshed.
  const handleAuthExpiredFailure = (pendingAction) => {
    cacheExamStateForRecovery(pendingAction);
    pendingSaveActionRef.current = pendingAction;
    if (!sessionExpiredHandledRef.current) {
      sessionExpiredHandledRef.current = true;
      setIsSessionExpired(true);
    }
  };

  // Called once a save actually succeeds — clears the safety net so a
  // stale modal/cache doesn't linger after the session is fine again.
  const clearSessionExpiredState = () => {
    if (sessionExpiredHandledRef.current || isSessionExpired) {
      setIsSessionExpired(false);
      sessionExpiredHandledRef.current = false;
      pendingSaveActionRef.current = null;
      clearExamRecoveryCache();
    }
  };

  // Re-attempts whichever save was in flight when the session expired.
  // Reuses the existing handleAutoSave / handleManualSaveDraft /
  // handlePublishExam functions as-is (their own success paths already
  // navigate / notify exactly like a normal save would).
  const retryPendingSaveAfterReauth = async () => {
    const action = pendingSaveActionRef.current;
    if (!action || isRestoringSession) return;

    setIsRestoringSession(true);
    try {
      if (action === 'autosave') {
        await handleAutoSave(true);
      } else if (action === 'draft') {
        await handleManualSaveDraft();
      } else {
        await handlePublishExam(action);
      }
    } finally {
      setIsRestoringSession(false);
    }
  };

  // ============================================================
  // ✅ AUTO-SAVE FUNCTION — throttled to run at most once per
  // AUTO_SAVE_INTERVAL_MS (see the interval effect above). Reads
  // from refs so it always has the latest data even when invoked
  // from the long-lived setInterval callback.
  // ============================================================

  const handleAutoSave = async (isFinal = false) => {
    if (isSavingRef.current) return;

    const currentMeta = metaRef.current || meta;
    const currentSections = sectionsRef.current || sections;
    const currentQuestions = questionsRef.current || questions;
    const currentExamId = examIdRef.current;

    if (!currentMeta.title.trim() && currentSections.every(s => !s.questions) && currentQuestions.length === 0) {
      // 🎯 FIX: this used to bail out silently even when the tutor had
      // explicitly clicked "Save Draft" (isFinal === true), so a manual
      // save with an empty exam looked like it succeeded but nothing was
      // ever written. Now the tutor gets told why nothing was saved.
      if (isFinal) {
        showNotification('⚠️ Add a title (or some content) before saving.', 'error');
      }
      return false;
    }

    // 🎯 FIX: track the actual backend outcome instead of unconditionally
    // returning true at the end of the function. Previously, if the
    // request resolved without throwing but the server responded with
    // { success: false } (e.g. a permission error returned as 200/400
    // JSON rather than a thrown exception), this function still reported
    // success — which meant handleManualSaveDraft would navigate the
    // tutor away from an unsaved draft.
    let didSave = false;

    try {
      isSavingRef.current = true;
      setIsAutoSaving(true);

      const draftData = buildExamPayload(currentMeta, currentSections, currentQuestions, 'draft');

      let response;
      if (currentExamId) {
        response = await updateExamDraft(currentExamId, draftData);
        if (response && response.success) {
          didSave = true;
          setHasChanges(false);
          setLastSavedAt(new Date());
          if (isFinal) {
            showNotification('💾 Draft auto-saved successfully!', 'success');
          }
        }
      } else {
        response = await createTutorExam(draftData);
        if (response && response.success) {
          didSave = true;
          const newExamId = response.examId;
          setExamId(newExamId);
          examIdRef.current = newExamId;
          setIsNewExam(false);
          const url = new URL(window.location);
          url.searchParams.set('examId', newExamId);
          window.history.replaceState({}, '', url);
          setHasChanges(false);
          setLastSavedAt(new Date());
          if (isFinal) {
            showNotification('💾 New exam created and draft saved!', 'success');
          }
        }
      }

      if (!didSave && isFinal) {
        showNotification(response?.message || '⚠️ Draft save did not complete. Please try again.', 'error');
      }

      if (didSave) {
        // Covers the case where this very tick is what confirms the
        // tutor's session is working again (e.g. they re-authenticated in
        // another tab and this is the next autosave cycle).
        clearSessionExpiredState();
      }
    } catch (err) {
      console.error('Auto-save error:', err);
      if (err && err.isAuthExpired) {
        handleAuthExpiredFailure('autosave');
        return false;
      }
      if (isFinal) {
        showNotification('⚠️ Auto-save failed. Please save manually.', 'error');
      }
      return false;
    } finally {
      isSavingRef.current = false;
      setIsAutoSaving(false);
    }
    return didSave;
  };

  // ============================================================
  // ✅ LOAD EXAM FOR EDIT
  // ============================================================

  const loadExamForEdit = async (examId) => {
    try {
      setGlobalLoading(true);
      const response = await getExamById(examId);
      if (response && response.success) {
        const exam = response.exam;
        setExamId(examId);
        setIsNewExam(false);
        
        const normalizedCategory = getNormalizedCategory(exam.category_id);
        
        setMeta({
          title: exam.title || '',
          category_id: normalizedCategory,
          level_id: exam.level_id || '',
          duration_minutes: exam.duration_minutes || 0,
          description: exam.description || '',
          thumbnail: exam.thumbnail || ''
        });
        
        if (exam.sections && exam.sections.length > 0) {
          setSections(exam.sections.map((s, idx) => ({
            id: idx + 1,
            name: s.name || '',
            questions: s.questions || 0,
            time: s.time || 0,
            audio_url: s.audio_url || null
          })));
        }
        
        if (exam.problems && exam.problems.length > 0) {
          const formattedQuestions = [];
          exam.problems.forEach((problem, pIdx) => {
            formattedQuestions.push({
              id: `problem_${pIdx + 1}`,
              is_problem: true,
              section: problem.section || '',
              problem_title: problem.problem_title || `Problem ${pIdx + 1}`,
              explanation: problem.explanation || '',
              example_question: problem.example?.text || '',
              example_correct_option: problem.example?.correct_answer_index || 0,
              example_explanation: problem.example?.explanation || '',
              options: problem.example?.options || ['', '', '', ''],
              example_image_url: problem.example?.image_url || null,
              example_audio_url: problem.example?.audio_url || null,
              problem_image_url: problem.problem_image_url || null
            });
            if (problem.sub_questions && problem.sub_questions.length > 0) {
              problem.sub_questions.forEach((sub) => {
                formattedQuestions.push({
                  id: sub.id || `sub_${Date.now()}_${Math.random()}`,
                  is_problem: false,
                  section: problem.section || '',
                  parent_problem_id: `problem_${pIdx + 1}`,
                  type: problem.section?.toLowerCase().includes('listen') ? 'listening' : 'mcq',
                  text: sub.text || '',
                  options: sub.options || ['', '', '', ''],
                  correct: sub.correct_answer_index || 0,
                  explanation: sub.explanation || '',
                  image_url: sub.image_url || null,
                  audio_url: sub.audio_url || null
                });
              });
            }
          });
          setQuestions(formattedQuestions);
          if (formattedQuestions.length > 0) {
            setActiveQuestionId(formattedQuestions[0].id);
          }
        }
        
        setHasChanges(false);
        setLastSavedAt(new Date());
        showNotification('Exam loaded successfully!', 'success');
      }
    } catch (err) {
      console.error('Load exam error:', err);
      showNotification('Failed to load exam for editing.', 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  // ============================================================
  // ✅ HANDLE CATEGORY CHANGE
  // ============================================================

  const handleCategoryChange = (catId) => {
    if (!catId) {
      setMeta(p => ({ ...p, category_id: '', level_id: '' }));
      setAvailableLevels([]);
      return;
    }
    
    const normalizedCatId = getNormalizedCategory(catId);
    
    setMeta(p => ({ ...p, category_id: normalizedCatId, level_id: '' }));
    setAvailableLevels([]);
    
    const targetCluster = activeSchema.find(c => {
      const cName = getNormalizedCategory(c.category_name);
      const cId = getNormalizedCategory(c.id);
      return cName === normalizedCatId || cId === normalizedCatId;
    });
    
    const isEpstopik = normalizedCatId === 'eps-topik' ||
                       catId?.toLowerCase().includes('eps') ||
                       (targetCluster && getNormalizedCategory(targetCluster.category_name) === 'eps-topik');
    const isJlpt = normalizedCatId === 'jlpt' || 
                   (targetCluster && getNormalizedCategory(targetCluster.category_name) === 'jlpt');
    
    console.log('🔍 Category detection:', { 
      catId, 
      normalizedCatId, 
      isEpstopik, 
      isJlpt,
      targetCluster: targetCluster?.category_name 
    });
    
    if (isEpstopik) {
      console.log('✅ EPS-TOPIK selected - Auto-configuring sections');
      setAvailableLevels([]);
      setSections([
        { id: Date.now() + 1, name: 'Reading', questions: 20, time: 25, audio_url: null },
        { id: Date.now() + 2, name: 'Listening', questions: 20, time: 25, audio_url: null }
      ]);
      setMeta(p => ({ ...p, duration_minutes: 50 }));
      setQuestions([]);
      setActiveQuestionId(null);
      return;
    }
    
    if (isJlpt) {
      console.log('✅ JLPT selected - Loading levels');
      if (targetCluster && targetCluster.levels && targetCluster.levels.length > 0) {
        const levels = targetCluster.levels.map(level => ({
          id: level.id || level.level_id || level.level_name,
          level_name: level.level_name || level.name || level.id,
          credit_cost: level.credit_cost || 0,
          isCreditSet: level.isCreditSet || false,
          ...level
        }));
        setAvailableLevels(levels);
        console.log('📊 Levels loaded:', levels.length);
      } else {
        setAvailableLevels([]);
        console.log('⚠️ No levels found for JLPT');
      }
      setSections([
        { id: Date.now() + 1, name: 'Vocabulary', questions: 0, time: '' },
        { id: Date.now() + 2, name: 'Grammar', questions: 0, time: '' },
        { id: Date.now() + 3, name: 'Reading', questions: 0, time: '' },
        { id: Date.now() + 4, name: 'Listening', questions: 0, time: '' }
      ]);
      return;
    }
    
    if (targetCluster && targetCluster.levels && targetCluster.levels.length > 0) {
      const levels = targetCluster.levels.map(level => ({
        id: level.id || level.level_id || level.level_name,
        level_name: level.level_name || level.name || level.id,
        credit_cost: level.credit_cost || 0,
        isCreditSet: level.isCreditSet || false,
        ...level
      }));
      setAvailableLevels(levels);
    } else {
      setAvailableLevels([]);
    }
    setSections([{ id: Date.now(), name: 'General Section', questions: 0, time: '' }]);
  };

  // ============================================================
  // ✅ SECTION OPERATIONS
  // ============================================================

  const addSection = () => {
    if (isEpstopik) {
      showNotification('⚠️ EPS-TOPIK sections are fixed (Reading & Listening)', 'error');
      return;
    }
    setSections(p => [...p, { id: Date.now(), name: 'New Section Block', questions: 0, time: 15 }]);
  };
  
  const removeSection = (id) => {
    if (isEpstopik) {
      showNotification('⚠️ EPS-TOPIK sections cannot be removed', 'error');
      return;
    }
    setSections(p => p.filter(s => s.id !== id));
  };
  
  const updateSection = (id, field, val) => {
    if (isEpstopik) {
      showNotification('⚠️ EPS-TOPIK sections are fixed', 'error');
      return;
    }
    setSections(p => p.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  // ============================================================
  // ✅ QUESTION OPERATIONS
  // ============================================================

  const getQuestionsForSection = (sectionName) => {
    return questions.filter(q => q.section === sectionName && !q.is_problem);
  };

  // 🎯 Canonical global ordering for a section's questions: Problem 1's
  // child questions (in the order they were added), then Problem 2's,
  // etc. — following the Problems' own order — followed by any
  // standalone questions that aren't linked to a Problem yet. This is
  // the single source of truth for "Q<n>" numbering everywhere (sidebar
  // tree, problem editor's linked-question list, standalone question
  // list) so numbers stay globally sequential and automatically shift
  // when a new question is inserted into an earlier Problem.
  const getGlobalOrderedQuestionsForSection = (sectionName) => {
    const problemsInSection = questions.filter(q => q.section === sectionName && q.is_problem);
    const ordered = [];
    problemsInSection.forEach(problem => {
      const children = questions.filter(q => q.parent_problem_id === problem.id && !q.is_problem);
      ordered.push(...children);
    });
    const standalone = questions.filter(q => q.section === sectionName && !q.is_problem && !q.parent_problem_id);
    ordered.push(...standalone);
    return ordered;
  };

  const getQuestionLabel = (question) => {
    if (question.is_problem) {
      return question.problem_title || 'Problem';
    }
    const sectionQuestions = getGlobalOrderedQuestionsForSection(question.section);
    const index = sectionQuestions.findIndex(q => q.id === question.id);
    if (index !== -1) {
      return `Q${index + 1}`;
    }
    return 'Question';
  };

  const getQuestionsForProblem = (problemId) => {
    return questions.filter(q => q.parent_problem_id === problemId);
  };

  const addProblemContext = (sectionName) => {
    const newId = Date.now();
    const sectionProblemsCount = questions.filter(q => q.section === sectionName && q.is_problem).length;
    const newProblem = {
      id: newId,
      section: sectionName,
      is_problem: true,
      problem_title: `Problem ${sectionProblemsCount + 1}`,
      explanation: '',
      example_question: '',
      example_correct_option: 0,
      example_explanation: '',
      options: ['', '', '', ''],
      example_image_url: null,
      example_audio_url: null,
      problem_image_url: null
    };
    setQuestions(p => [...p, newProblem]);
    setActiveQuestionId(newId);
    showNotification(`New Problem Block created inside ${sectionName}!`);
  };

const addStandardQuestion = (sectionName) => {
  const newId = Date.now();
  const targetSection = sections.find(s => s.name === sectionName);
  const currentQuestionsInSection = questions.filter(q => q.section === sectionName && !q.is_problem).length;
  if (targetSection && targetSection.questions > 0 && currentQuestionsInSection >= Number(targetSection.questions)) {
    showNotification(`⚠️ Maximum limit of ${targetSection.questions} questions reached for ${sectionName}.`, 'error');
    return;
  }
  const isReading = sectionName?.toLowerCase() === 'reading';
  const isListening = isListeningSection(sectionName);
  let parentProblemId = '';
  
  const lastProblem = [...questions].reverse().find(q => q.section === sectionName && q.is_problem);
  parentProblemId = lastProblem ? lastProblem.id : '';
  
  const newQ = {
    id: newId,
    section: sectionName,
    is_problem: false,
    parent_problem_id: parentProblemId,
    type: isEpstopik ? (isListening ? 'listening' : 'reading') : (isListening ? 'listening' : 'mcq'),
    text: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: '',
    image_url: null,
    audio_url: null
  };
  setQuestions(p => [...p, newQ]);
  setActiveQuestionId(newId);
  if (!parentProblemId) {
    showNotification(`New ${isListening ? 'Listening' : isReading ? 'Reading' : ''} question added to ${sectionName}. Tip: add a Problem block first so questions can be grouped.`);
  } else {
    showNotification(`New ${isListening ? 'Listening' : isReading ? 'Reading' : ''} question added to ${sectionName}!`);
  }
};

  const addQuestionUnderProblem = (problemId) => {
    const problem = questions.find(q => q.id === problemId);
    if (!problem) return;
    
    const targetSection = sections.find(s => s.name === problem.section);
    const currentQuestionsInSection = questions.filter(q => q.section === problem.section && !q.is_problem).length;
    if (targetSection && targetSection.questions > 0 && currentQuestionsInSection >= Number(targetSection.questions)) {
      showNotification(`⚠️ Maximum limit of ${targetSection.questions} questions reached for ${problem.section}.`, 'error');
      return;
    }
    const newId = Date.now();
    const newQ = {
      id: newId,
      section: problem.section,
      is_problem: false,
      parent_problem_id: problemId,
      type: isListeningSection(problem.section) ? 'listening' : 'mcq',
      text: '',
      options: ['', '', '', ''],
      correct: 0,
      explanation: '',
      image_url: null,
      audio_url: null
    };
    setQuestions(p => [...p, newQ]);
    setActiveQuestionId(newId);
    showNotification(`New question added under ${problem.problem_title}!`);
  };

  // ============================================================
  // ✅ IMAGE UPLOAD FUNCTIONS
  // ============================================================

  // 🎯 Every media asset must land inside this paper's own Cloudinary
  // folder (langoora/papers/{examId}) — see uploadAsset on the backend.
  // If the tutor uploads media before the paper has ever been saved
  // (examId still null), we force one immediate draft-save first so a
  // real paper_id exists, rather than letting the asset silently fall
  // into the backend's "_unassigned" bucket and become orphaned.
  const ensureExamId = async () => {
    if (examIdRef.current) return examIdRef.current;

    const saved = await handleAutoSave(false);
    if (saved && examIdRef.current) {
      return examIdRef.current;
    }
    return null;
  };

  const handleProblemImageUpload = async (problemId, e) => {
    if (!isEpstopik) {
      showNotification('⚠️ This feature is only available for EPS-TOPIK exams', 'error');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    try {
      showNotification('Uploading problem image...', 'info');
      const paperId = await ensureExamId();
      const result = await uploadExamAsset(file, paperId);
      if (result && result.success) {
        updateItemField(problemId, 'problem_image_url', result.fileUrl);
        showNotification('Problem image uploaded successfully!', 'success');
      }
    } catch (err) {
      console.error("Problem Image Upload Error:", err);
      showNotification(err.message || 'Image upload failed.', 'error');
    }
  };

  const handleQuestionImageUpload = async (questionId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showNotification('Uploading question image...', 'info');
      const paperId = await ensureExamId();
      const result = await uploadExamAsset(file, paperId);
      if (result && result.success) {
        updateItemField(questionId, 'image_url', result.fileUrl);
        showNotification('Question image uploaded successfully!', 'success');
      }
    } catch (err) {
      console.error("Question Image Upload Error:", err);
      showNotification(err.message || 'Image upload failed.', 'error');
    }
  };

  // ============================================================
  // ✅ ITEM UPDATE FUNCTIONS
  // ============================================================

  const updateItemField = (id, field, val) => {
    setQuestions(p => p.map(q => q.id === id ? { ...q, [field]: val } : q));
  };

  const updateItemOption = (id, optIdx, val) => {
    setQuestions(p => p.map(q => {
      if (q.id === id) {
        const updatedOpts = [...q.options];
        updatedOpts[optIdx] = val;
        return { ...q, options: updatedOpts };
      }
      return q;
    }));
  };

  const removeItem = (id) => {
    if (questions.length <= 1) return;
    const itemToRemove = questions.find(q => q.id === id);
    if (itemToRemove && itemToRemove.is_problem) {
      const linkedQuestions = questions.filter(q => q.parent_problem_id === id);
      if (linkedQuestions.length > 0) {
        if (!window.confirm(`This will also delete ${linkedQuestions.length} question(s) linked to this problem. Continue?`)) {
          return;
        }
      }
      const remaining = questions.filter(q => q.id !== id && q.parent_problem_id !== id);
      setQuestions(remaining);
      setActiveQuestionId(remaining[0]?.id || null);
    } else {
      const remaining = questions.filter(q => q.id !== id);
      setQuestions(remaining);
      setActiveQuestionId(remaining[0]?.id || null);
    }
  };

  // ============================================================
  // ✅ FILE UPLOAD FUNCTIONS
  // ============================================================

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showNotification('Uploading exam cover image...', 'info');
      const paperId = await ensureExamId();
      const result = await uploadExamAsset(file, paperId);
      if (result && result.success) {
        setMeta(p => ({ ...p, thumbnail: result.fileUrl })); 
        showNotification('Exam cover uploaded successfully!', 'success');
      }
    } catch (err) {
      console.error("Thumbnail Cloud Upload Error:", err);
      showNotification(err.message || 'Image upload failed. Please try again.', 'error');
    }
  };

  const handleListeningImageUpload = async (questionId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showNotification('Uploading listening image...', 'info');
      const paperId = await ensureExamId();
      const result = await uploadExamAsset(file, paperId);
      if (result && result.success) {
        updateItemField(questionId, 'image_url', result.fileUrl);
        showNotification('Listening image uploaded successfully!', 'success');
      }
    } catch (err) {
      console.error("Image Upload Error:", err);
      showNotification(err.message || 'Image upload failed.', 'error');
    }
  };

  const handleExampleImageUpload = async (problemId, e) => {
    if (isEpstopik) {
      showNotification('⚠️ EPS-TOPIK uses problem_image_url instead', 'error');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    try {
      showNotification('Uploading example image...', 'info');
      const paperId = await ensureExamId();
      const result = await uploadExamAsset(file, paperId);
      if (result && result.success) {
        updateItemField(problemId, 'example_image_url', result.fileUrl);
        showNotification('Example image uploaded successfully!', 'success');
      }
    } catch (err) {
      console.error("Example Image Upload Error:", err);
      showNotification(err.message || 'Image upload failed.', 'error');
    }
  };

  // ✅ Audio upload function - Still needed for JLPT listening example audio
  const handleExampleAudioUpload = async (problemId, e) => {
    if (isEpstopik) {
      showNotification('⚠️ Audio upload is not available for EPS-TOPIK problem blocks', 'error');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    try {
      showNotification('Uploading example audio...', 'info');
      const paperId = await ensureExamId();
      const result = await uploadExamAsset(file, paperId);
      if (result && result.success) {
        updateItemField(problemId, 'example_audio_url', result.fileUrl);
        showNotification('Example audio uploaded successfully!', 'success');
      }
    } catch (err) {
      console.error("Example Audio Upload Error:", err);
      showNotification(err.message || 'Audio upload failed.', 'error');
    }
  };

  const handleSectionAudioUpload = async (sectionId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showNotification('Uploading listening audio track...', 'info');
      const paperId = await ensureExamId();
      const result = await uploadExamAsset(file, paperId);
      if (result && result.success) {
        updateSection(sectionId, 'audio_url', result.fileUrl); 
        showNotification('Listening audio uploaded successfully!', 'success');
      }
    } catch (err) {
      console.error("Audio Upload Error:", err);
      showNotification(err.message || 'Audio upload failed.', 'error');
    }
  };

  // ============================================================
  // ✅ MANUAL SAVE & PUBLISH
  // ============================================================

  // ============================================================
  // ✅ MANUAL SAVE & PUBLISH
  // ============================================================

  // 🎯 Shared full-save routine. Creates the exam first if it doesn't
  // exist yet, then ALWAYS does a full updateExam() rewrite — the same
  // persistence path Deploy/Submit has always used, which fully replaces
  // every problem/sub-question in Firestore with the current in-memory
  // `questions` state. This is what guarantees Save Draft now captures
  // every created/edited question, exactly like Deploy does.
  // NOTE: this is separate from, and does not call or modify,
  // handleAutoSave / updateExamDraft — the interval-based autosave keeps
  // writing metadata-only updates exactly as before.
  const persistFullExam = async (statusType) => {
    let currentExamId = examId;
    const normalizedCategory = getNormalizedCategory(meta.category_id);

    if (!currentExamId) {
      const draftData = {
        title: meta.title.trim() || 'Untitled Draft',
        category_id: normalizedCategory,
        level_id: meta.level_id || '',
        duration_minutes: Number(meta.duration_minutes),
        description: meta.description || '',
        thumbnail: meta.thumbnail || '',
        status: 'draft',
        sections: sections.map(s => ({
          name: s.name,
          questions: Number(s.questions || 0),
          time: Number(s.time || 0),
          audio_url: s.audio_url || null
        })),
        questions: questions.map(q => {
          if (q.is_problem) {
            return {
              id: q.id,
              is_problem: true,
              section: q.section,
              problem_title: q.problem_title || `Problem`,
              explanation: q.explanation || '',
              example_question: q.example_question || '',
              example_correct_option: Number(q.example_correct_option || 0),
              example_explanation: q.example_explanation || '',
              options: q.options || ['', '', '', ''],
              example_image_url: q.example_image_url || null,
              example_audio_url: q.example_audio_url || null,
              problem_image_url: q.problem_image_url || null
            };
          } else {
            return {
              id: q.id,
              is_problem: false,
              section: q.section,
              parent_problem_id: q.parent_problem_id || null,
              type: q.type || (isEpstopik ? (q.section?.toLowerCase() === 'listening' ? 'listening' : 'reading') : 'mcq'),
              text: q.text || '',
              options: q.options || ['', '', '', ''],
              correct: Number(q.correct || 0),
              explanation: q.explanation || '',
              image_url: q.image_url || null,
              audio_url: q.audio_url || null
            };
          }
        })
      };
      const createResponse = await createTutorExam(draftData);
      if (createResponse && createResponse.success) {
        currentExamId = createResponse.examId;
        setExamId(currentExamId);
        setIsNewExam(false);
        const url = new URL(window.location);
        url.searchParams.set('examId', currentExamId);
        window.history.replaceState({}, '', url);
      } else {
        throw new Error('Failed to create exam');
      }
    }

    const examPayload = {
      title: meta.title.trim(),
      category_id: normalizedCategory,
      level_id: meta.level_id || '',
      duration_minutes: Number(meta.duration_minutes),
      description: meta.description || '',
      thumbnail: meta.thumbnail || '',
      status: statusType,
      sections: sections.map(s => ({
        name: s.name,
        questions: Number(s.questions || 0),
        time: Number(s.time || 0),
        audio_url: s.audio_url || null
      })),
      questions: questions.map(q => {
        if (q.is_problem) {
          return {
            id: q.id,
            is_problem: true,
            section: q.section,
            problem_title: q.problem_title || `Problem`,
            explanation: q.explanation || '',
            example_question: q.example_question || '',
            example_correct_option: Number(q.example_correct_option || 0),
            example_explanation: q.example_explanation || '',
            options: q.options || ['', '', '', ''],
            example_image_url: q.example_image_url || null,
            example_audio_url: q.example_audio_url || null,
            problem_image_url: q.problem_image_url || null
          };
        } else {
          return {
            id: q.id,
            is_problem: false,
            section: q.section,
            parent_problem_id: q.parent_problem_id || null,
            type: q.type || (isEpstopik ? (q.section?.toLowerCase() === 'listening' ? 'listening' : 'reading') : 'mcq'),
            text: q.text || '',
            options: q.options || ['', '', '', ''],
            correct: Number(q.correct || 0),
            explanation: q.explanation || '',
            image_url: q.image_url || null,
            audio_url: q.audio_url || null
          };
        }
      })
    };

    console.log('📤 Sending exam payload:', JSON.stringify(examPayload, null, 2));

    const response = await updateExam(currentExamId, examPayload);
    if (response && response.success) {
      setHasChanges(false);
      setLastSavedAt(new Date());
    }
    return response;
  };

  // 🎯 Save Draft now runs the exact same full question-persistence path
  // as Submit for Review (via persistFullExam), just with status 'draft'
  // instead of 'pending' — so every created/edited question is guaranteed
  // to be written, not just exam metadata.
  const handleManualSaveDraft = async () => {
    try {
      setError('');
      setSubmitLoading(true);

      if (!meta.title.trim()) throw new Error('Please enter an exam title.');

      const response = await persistFullExam('draft');
      if (response && response.success) {
        clearSessionExpiredState();
        showNotification('💾 Draft saved successfully!', 'success');
        setTimeout(() => navigate('/tutor/dashboard'), 1200);
      }
    } catch (err) {
      console.error('Save Draft Error:', err);
      if (err && err.isAuthExpired) {
        handleAuthExpiredFailure('draft');
        return;
      }
      setError(err.message || 'Failed to save draft.');
      showNotification(err.message || 'Failed to save draft. Please try again.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePublishExam = async (statusType) => {
    try {
      setError('');
      setSubmitLoading(true);

      if (!meta.title.trim()) throw new Error('Please enter an exam title.');
      if (!meta.category_id) throw new Error('Please select an exam category.');
      if (!isEpstopik && availableLevels.length > 0 && !meta.level_id) {
        throw new Error('Please select an exam level.');
      }

      const response = await persistFullExam(statusType);
      if (response && response.success) {
        clearSessionExpiredState();
        showNotification(statusType === 'pending' ? '✅ Exam submitted for review!' : '✅ Draft updated successfully!', 'success');
        setTimeout(() => navigate('/tutor/dashboard'), 2500);
      }
    } catch (err) {
      console.error("Submission Error:", err);
      if (err && err.isAuthExpired) {
        handleAuthExpiredFailure(statusType);
        return;
      }
      setError(err.message || 'Failed to create exam.');
      showNotification(err.message || 'Failed to create exam. Please try again.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ============================================================
  // ✅ ACTIVE ITEM
  // ============================================================

  const activeItem = questions.find(q => q.id === activeQuestionId) || questions[0];

  // ============================================================
  // ✅ RENDER - PROBLEM BLOCK EDITOR (Audio removed)
  // ============================================================

  const renderProblemEditor = () => {
    if (!activeItem || !activeItem.is_problem) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Problem Title
            </label>
            <RichTextField
              value={activeItem.problem_title || ''}
              onChange={(html) => updateItemField(activeItem.id, 'problem_title', html)}
              placeholder="e.g. Problem 1"
              fieldLabel="Problem Title"
              minHeightClass="min-h-[40px]"
              className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-blue-500/50"
            />
          </div>
          <div className="col-span-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Questions: {getQuestionsForProblem(activeItem.id).length}
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Problem Instruction / Explanation
          </label>
          <RichTextField
            value={activeItem.explanation || ''}
            onChange={(html) => updateItemField(activeItem.id, 'explanation', html)}
            placeholder="Type core instructions or the reading passage for this problem block..."
            fieldLabel="Passage / Problem Instruction"
            minHeightClass="min-h-[56px]"
            className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:border-blue-500/50"
          />
        </div>

        {isEpstopik && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
              📷 Problem Image (Optional) - EPS-TOPIK Only
            </label>
            <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border-2 border-dashed border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors relative overflow-hidden h-24">
              {activeItem.problem_image_url ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <img src={activeItem.problem_image_url} alt="Problem" className="h-full w-full object-contain" />
                  <div className="absolute bg-black/60 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md text-white">Change Image</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 w-full">
                  <Image size={20} className="text-purple-400" />
                  <span className="text-[10px] text-gray-400">Click to upload problem image</span>
                  <span className="text-[8px] text-gray-500">(Optional - displayed with problem)</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProblemImageUpload(activeItem.id, e)} />
            </label>
          </div>
        )}

        {!isEpstopik && (
          <div className="p-4 bg-slate-950/30 border border-white/5 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">Example Question Configuration (Optional)</h4>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Example Question Text</label>
              <RichTextField
                value={activeItem.example_question || ''}
                onChange={(html) => updateItemField(activeItem.id, 'example_question', html)}
                placeholder="e.g. Example Question Context..."
                fieldLabel="Example Question Text"
                minHeightClass="min-h-[40px]"
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Example Explanation</label>
              <RichTextField
                value={activeItem.example_explanation || ''}
                onChange={(html) => updateItemField(activeItem.id, 'example_explanation', html)}
                placeholder="Explain the example answer..."
                fieldLabel="Example Explanation"
                minHeightClass="min-h-[56px]"
                className="bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                📷 Example Image (1, 2, 3, 4 marked)
              </label>
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border-2 border-dashed border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors relative overflow-hidden h-24">
                {activeItem.example_image_url ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <img src={activeItem.example_image_url} alt="Example" className="h-full w-full object-contain" />
                    <div className="absolute bg-black/60 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md text-white">Change Image</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 w-full">
                    <Image size={20} className="text-purple-400" />
                    <span className="text-[10px] text-gray-400">Click to upload example image</span>
                    <span className="text-[8px] text-gray-500">(Image should have 1, 2, 3, 4 marked)</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleExampleImageUpload(activeItem.id, e)} />
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Example Options (4 Options)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeItem.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateItemField(activeItem.id, 'example_correct_option', oIdx)}
                      className={`w-8 h-8 min-w-[2rem] rounded-lg border text-xs font-bold flex-shrink-0 transition-all ${
                        activeItem.example_correct_option === oIdx 
                          ? 'bg-blue-600 border-blue-500 text-white' 
                          : 'border-white/10 text-slate-500 hover:border-white/30'
                      }`}
                    >
                      {String.fromCharCode(65 + oIdx)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <RichTextField
                        value={opt}
                        onChange={(html) => updateItemOption(activeItem.id, oIdx, html)}
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        fieldLabel={`Example Option ${String.fromCharCode(65 + oIdx)}`}
                        minHeightClass="min-h-[36px]"
                        className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs placeholder-gray-700 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {getQuestionsForProblem(activeItem.id).length > 0 && (
          <div className="p-3 bg-slate-950/30 border border-white/5 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Questions in this Problem:</h5>
              <button
                onClick={() => addQuestionUnderProblem(activeItem.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider transition-all"
              >
                <Plus size={10} /> Add Question
              </button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {getQuestionsForProblem(activeItem.id).map((q) => {
                const sectionQuestions = getGlobalOrderedQuestionsForSection(q.section);
                const globalIndex = sectionQuestions.findIndex(item => item.id === q.id);
                const questionNumber = globalIndex + 1;
                return (
                  <div key={q.id} className="flex items-center justify-between text-[10px] text-slate-300 px-2 py-1 bg-slate-950/40 rounded-lg">
                    <span>Q{questionNumber}: {stripHtml(q.text) || 'Empty'}</span>
                    {q.image_url && (
                      <span className="text-[8px] px-1 bg-purple-500/20 text-purple-300 rounded">🖼️</span>
                    )}
                    <button onClick={() => setActiveQuestionId(q.id)} className="text-blue-400 hover:text-blue-300 text-[9px]">Edit</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // ✅ RENDER - STANDARD QUESTION EDITOR
  // ============================================================

  const renderQuestionEditor = () => {
    if (!activeItem || activeItem.is_problem) return null;

    return (
      <div className="space-y-4">
        <div className="bg-slate-950/30 p-2 rounded-xl border border-white/5 flex items-center justify-between">
          <p className="text-[10px] font-mono text-slate-400">
            Question Number: <span className="text-emerald-400 font-bold">{getQuestionLabel(activeItem)}</span>
          </p>
          {activeItem.type === 'listening' && (
            <Badge color="purple" className="text-[9px]">🎧 Listening Question</Badge>
          )}
          {activeItem.type === 'reading' && (
            <Badge color="green" className="text-[9px]">📖 Reading Question</Badge>
          )}
        </div>

        {isEpstopik && activeItem.parent_problem_id && (
          <div className="flex flex-col gap-1.5 bg-green-500/5 p-3 rounded-2xl border border-green-500/10">
            <label className="text-[11px] font-bold uppercase tracking-wider text-green-400">
              Linked to Problem: {questions.find(q => q.id === activeItem.parent_problem_id)?.problem_title || 'Problem'}
            </label>
          </div>
        )}

        {!isEpstopik && (
          <div className="flex flex-col gap-1.5 bg-blue-500/5 p-3 rounded-2xl border border-blue-500/10">
            <label className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Link to Problem</label>
            <select 
              value={activeItem.parent_problem_id || ''} 
              onChange={e => updateItemField(activeItem.id, 'parent_problem_id', e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none w-full"
            >
              <option value="">-- Standalone (No Parent) --</option>
              {questions
                .filter(q => q.section === activeItem.section && q.is_problem)
                .map(p => (
                  <option key={p.id} value={p.id}>{p.problem_title}</option>
                ))
              }
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Question Text</label>
          <RichTextField
            value={activeItem.text || ''}
            onChange={(html) => updateItemField(activeItem.id, 'text', html)}
            placeholder={`Type your ${activeItem.type === 'listening' ? 'listening' : activeItem.type === 'reading' ? 'reading' : ''} question...`}
            fieldLabel="Question Text"
            minHeightClass="min-h-[56px]"
            className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500/50"
          />
        </div>

        {/* ✅ NEW: Universal Question Image Upload - Available for ALL question types */}
        <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
          <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-2">
            📷 Question Image (Optional)
          </label>
          <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border-2 border-dashed border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors relative overflow-hidden h-32">
            {activeItem.image_url ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <img src={activeItem.image_url} alt="Question" className="h-full w-full object-contain" />
                  <div className="absolute bg-black/60 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md text-white">Change Image</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateItemField(activeItem.id, 'image_url', null);
                    showNotification('Image removed', 'info');
                  }}
                  className="absolute top-2 right-2 z-10 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 w-full">
                <Image size={24} className="text-purple-400" />
                <span className="text-xs text-gray-400">Click to upload question image</span>
                <span className="text-[8px] text-gray-500">(Optional - displayed alongside question text)</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQuestionImageUpload(activeItem.id, e)} />
          </label>
          {activeItem.image_url && (
            <div className="mt-2 text-[9px] text-emerald-400 flex items-center gap-1">
              <CheckCircle size={12} />
              Image attached
            </div>
          )}
        </div>

        {isEpstopik && (
          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
            <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-2">
              📷 EPS-TOPIK Question Image (Optional)
            </label>
            <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border-2 border-dashed border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors relative overflow-hidden h-32">
              {activeItem.image_url ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <img src={activeItem.image_url} alt="Question" className="h-full w-full object-contain" />
                  <div className="absolute bg-black/60 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md text-white">Change Image</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 w-full">
                  <Image size={24} className="text-purple-400" />
                  <span className="text-xs text-gray-400">Click to upload question image</span>
                  <span className="text-[8px] text-gray-500">(Optional - displayed with question)</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQuestionImageUpload(activeItem.id, e)} />
            </label>
          </div>
        )}

        {!isEpstopik && activeItem.type === 'listening' && (
          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
            <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-2">
              📷 Listening Image (1, 2, 3, 4 marked) - Optional
            </label>
            <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border-2 border-dashed border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors relative overflow-hidden h-32">
              {activeItem.image_url ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <img src={activeItem.image_url} alt="Listening" className="h-full w-full object-contain" />
                  <div className="absolute bg-black/60 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md text-white">Change Image</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 w-full">
                  <Image size={24} className="text-purple-400" />
                  <span className="text-xs text-gray-400">Click to upload listening image</span>
                  <span className="text-[8px] text-gray-500">(Image should have 1, 2, 3, 4 marked)</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleListeningImageUpload(activeItem.id, e)} />
            </label>
            <div className="mt-2 text-[9px] text-slate-400 flex items-center gap-1">
              <Mic size={12} className="text-blue-400" />
              Audio: Using section-level audio track
            </div>
          </div>
        )}

        {/* ✅ NEW: Vocabulary questions can now optionally attach an
            image, the same way Listening questions can. Reuses the same
            generic upload handler (it just writes image_url on the
            active question, nothing listening-specific about it). */}
        {!isEpstopik && activeItem.type !== 'listening' && activeItem.section?.toLowerCase() === 'vocabulary' && (
          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
            <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-2">
              📷 Vocabulary Image (Optional)
            </label>
            <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border-2 border-dashed border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors relative overflow-hidden h-32">
              {activeItem.image_url ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <img src={activeItem.image_url} alt="Vocabulary" className="h-full w-full object-contain" />
                  <div className="absolute bg-black/60 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md text-white">Change Image</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 w-full">
                  <Image size={24} className="text-purple-400" />
                  <span className="text-xs text-gray-400">Click to upload vocabulary image</span>
                  <span className="text-[8px] text-gray-500">(Optional visual context for this word/question)</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleListeningImageUpload(activeItem.id, e)} />
            </label>
          </div>
        )}

        <div className="space-y-3 bg-slate-950/40 p-4 border border-white/5 rounded-2xl">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Options (4)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeItem.options?.map((opt, oIdx) => (
              <div key={oIdx} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateItemField(activeItem.id, 'correct', oIdx)}
                  className={`w-8 h-8 min-w-[2rem] rounded-xl border flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                    activeItem.correct === oIdx 
                      ? 'border-emerald-500 bg-emerald-500 text-white' 
                      : 'border-white/10 text-gray-500 hover:border-white/30'
                  }`}
                >
                  {String.fromCharCode(65 + oIdx)}
                </button>
                <div className="flex-1 min-w-0">
                  <RichTextField
                    value={opt}
                    onChange={(html) => updateItemOption(activeItem.id, oIdx, html)}
                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                    fieldLabel={`Option ${String.fromCharCode(65 + oIdx)}`}
                    minHeightClass="min-h-[36px]"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Explanation</label>
          <RichTextField
            value={activeItem.explanation || ''}
            onChange={(html) => updateItemField(activeItem.id, 'explanation', html)}
            placeholder="Explain the correct answer..."
            fieldLabel="Explanation"
            minHeightClass="min-h-[56px]"
            className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none"
          />
        </div>
      </div>
    );
  };

  // ============================================================
// ✅ RENDER - SIDEBAR SECTION (FIXED - Listening questions display properly)
// ============================================================

const renderSectionSidebar = (sec) => {
  const secProblems = questions.filter(q => q.section === sec.name && q.is_problem);
  const secQuestions = getQuestionsForSection(sec.name);
  const isListening = isListeningSection(sec.name);
  const maxQuestions = Number(sec.questions || 0);
  const currentQuestions = secQuestions.length;
  const isFull = maxQuestions > 0 && currentQuestions >= maxQuestions;

  return (
    <div key={sec.id} className={`bg-slate-950/40 border rounded-2xl p-3 ${isEpstopik ? 'border-blue-500/20' : 'border-white/5'}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className={`text-[11px] font-bold uppercase tracking-widest truncate ${isEpstopik ? 'text-blue-400' : 'text-emerald-400'}`}>
            {sec.name}
          </h3>
          {isListening && <Mic size={12} className="text-blue-400 flex-shrink-0" />}
        </div>
        <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
          {currentQuestions} / {maxQuestions || 0}
        </span>
      </div>

      {isListening && (
        <div className="mb-3 space-y-2">
          <label className={`flex items-center justify-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer transition-colors text-[10px] uppercase font-bold tracking-wider ${
            sec.audio_url ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:border-blue-500/30'
          }`}>
            <Mic size={12} />
            {sec.audio_url ? '🎧 Audio Attached' : 'Attach Audio Track'}
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleSectionAudioUpload(sec.id, e)} />
          </label>
          {sec.audio_url && (
            <div className="bg-slate-900/80 p-2 rounded-xl border border-white/5 space-y-1">
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Audio Preview
              </p>
              <audio src={sec.audio_url} controls className="w-full h-8 rounded-lg bg-transparent text-white filter invert opacity-80 hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      )}

      {/* ✅ Problems List - Works for ALL sections including Listening */}
      {secProblems.map((problem) => {
        const childQuestions = getQuestionsForProblem(problem.id);
        return (
          <div key={problem.id} className="space-y-1 mb-2">
            <button 
              onClick={() => setActiveQuestionId(problem.id)}
              className={`w-full text-left px-2.5 py-2 rounded-xl border transition-all text-[10px] font-semibold flex items-center justify-between ${
                activeQuestionId === problem.id ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-slate-950/40 text-gray-400 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileText size={12} className="text-blue-400 flex-shrink-0" />
                <span className="truncate">{stripHtml(problem.problem_title) || 'Problem'}</span>
              </div>
              <span className="text-[8px] px-1.5 bg-slate-700/50 rounded-full text-slate-400 flex-shrink-0">
                {childQuestions.length}
              </span>
              {isEpstopik && problem.problem_image_url && (
                <span className="text-[8px] px-1 bg-purple-500/20 text-purple-300 rounded ml-1">🖼️</span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                addQuestionUnderProblem(problem.id);
              }}
              className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg border border-dashed border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all text-[9px] font-bold uppercase tracking-wider"
              title={`Add a question directly under ${stripHtml(problem.problem_title) || 'this Problem'}`}
            >
              <Plus size={10} /> Add Question to {stripHtml(problem.problem_title) || 'Problem'}
            </button>
            
            {/* ✅ ALWAYS show child questions if there are any - Works for ALL sections */}
            {childQuestions && childQuestions.length > 0 && (
              <div className="ml-4 space-y-0.5 border-l border-white/5 pl-2">
                {childQuestions.map((q) => {
                  const sectionQuestions = getGlobalOrderedQuestionsForSection(q.section);
                  const globalIndex = sectionQuestions.findIndex(item => item.id === q.id);
                  const questionNumber = globalIndex + 1;
                  const isListeningQ = q.type === 'listening';
                  return (
                    <button 
                      key={q.id}
                      onClick={() => setActiveQuestionId(q.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg border transition-all text-[9px] font-medium flex items-center justify-between ${
                        activeQuestionId === q.id ? 'border-emerald-500/50 bg-emerald-500/10 text-white' : 'border-transparent bg-slate-950/30 text-gray-500 hover:border-white/10'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">
                        {isListeningQ && <Mic size={10} className="text-blue-400" />}
                        Q{questionNumber}: {stripHtml(q.text) || 'Empty'}
                      </span>
                      {q.image_url && (
                        <span className="text-[8px] px-1 bg-purple-500/20 text-purple-300 rounded">🖼️</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Standalone Questions (no parent problem yet) — shown for every
          category so a question added before any Problem block exists
          is still visible and editable, instead of only rendering for
          EPS-TOPIK as before. */}
      {secQuestions.filter(q => !q.parent_problem_id).map((q) => {
        const sectionQuestions = getGlobalOrderedQuestionsForSection(q.section);
        const globalIndex = sectionQuestions.findIndex(item => item.id === q.id);
        const questionNumber = globalIndex + 1;
        const isReadingQ = q.type === 'reading';
        const isListeningQ = q.type === 'listening';
        return (
          <button 
            key={q.id}
            onClick={() => setActiveQuestionId(q.id)}
            className={`w-full text-left px-2.5 py-2 rounded-xl border transition-all text-[10px] font-semibold flex items-center justify-between ${
              activeQuestionId === q.id ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-slate-950/30 text-gray-400 hover:border-white/10'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {isListeningQ ? (
                <Mic size={12} className="text-blue-400 flex-shrink-0" />
              ) : isReadingQ ? (
                <BookOpen size={12} className="text-green-400 flex-shrink-0" />
              ) : (
                <HelpCircle size={12} className="text-slate-500 flex-shrink-0" />
              )}
              <span className="truncate">
                Q{questionNumber}: {stripHtml(q.text) || 'Empty'}
              </span>
            </div>
            {q.image_url && (
              <span className="text-[8px] px-1 bg-purple-500/20 text-purple-300 rounded">🖼️</span>
            )}
          </button>
        );
      })}

      {/* Buttons - Add Problem + Add Question (ALL SECTIONS) */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 mt-2">
        <button 
          onClick={() => addProblemContext(sec.name)}
          className={`w-full py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
            isEpstopik 
              ? 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400'
              : 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400'
          }`}
        >
          <Plus size={12} /> Add Problem
        </button>
        <button 
          onClick={() => {
            if (isFull) {
              showNotification(`⚠️ Maximum limit of ${maxQuestions} questions reached for ${sec.name}.`, 'error');
              return;
            }
            addStandardQuestion(sec.name);
          }}
          className={`w-full py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
            isFull 
              ? 'bg-gray-500/10 border-gray-500/20 text-gray-400 cursor-not-allowed opacity-50'
              : isListening 
                ? 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400'
                : isEpstopik
                  ? 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400'
          }`}
          disabled={isFull}
        >
          <Plus size={12} /> Add Question
        </button>
      </div>
      
      {maxQuestions > 0 && (
        <div className="mt-2">
          <div className="w-full bg-slate-700/30 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all ${
                currentQuestions >= maxQuestions ? 'bg-emerald-500' : isEpstopik ? 'bg-blue-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min((currentQuestions / maxQuestions) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[8px] text-slate-500 mt-0.5 text-right">
            {currentQuestions} / {maxQuestions} questions
          </p>
        </div>
      )}
    </div>
  );
};

  // ============================================================
  // ✅ RENDER - VIEW EXAM / PREVIEW MODAL
  // ============================================================
  // Lets the tutor inspect every Problem + Question (with any attached
  // image/audio) across ALL sections — Vocabulary, Grammar, Listening,
  // Reading — before publishing. Read-only; does not touch the DB.
  // ------------------------------------------------------------
  // 🖨️ Renders a single question's preview block: rich-text question
  // body, image/audio, all 4 options with the correct one highlighted
  // green (tutor answer key), and the explanation box underneath.
  // Shared by both problem-linked and standalone questions below.
  // ------------------------------------------------------------
  const renderPreviewQuestion = (q, number) => (
    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-2.5">
      <div className="flex items-start gap-1.5 text-[12px] text-gray-200">
        <span className="font-mono text-emerald-400 flex-shrink-0">Q{number}.</span>
        {q.text ? (
          <span
            className="leading-relaxed [&_ruby]:mx-0.5 [&_rt]:text-[9px] [&_rt]:text-blue-300"
            dangerouslySetInnerHTML={{ __html: q.text }}
          />
        ) : (
          <span className="italic text-gray-600">Empty question</span>
        )}
      </div>

      {q.image_url && (
        <img src={q.image_url} alt="Question" className="max-h-40 rounded-lg border border-white/10" />
      )}
      {q.audio_url && <audio src={q.audio_url} controls className="w-full h-8" />}

      {Array.isArray(q.options) && q.options.some(o => o) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
          {q.options.map((opt, oIdx) => {
            const isCorrect = q.correct === oIdx;
            return (
              <div
                key={oIdx}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] ${
                  isCorrect
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/[0.02] border-white/5 text-gray-400'
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-bold flex-shrink-0 ${
                  isCorrect ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-500 border border-white/10'
                }`}>
                  {String.fromCharCode(65 + oIdx)}
                </span>
                <span className="truncate" dangerouslySetInnerHTML={{ __html: opt || '<span class="italic text-gray-600">Empty</span>' }} />
                {isCorrect && <CheckCircle size={12} className="text-emerald-400 ml-auto flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

      {q.explanation && (
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg p-2.5 text-[11px] text-blue-200">
          <p className="text-[9px] font-bold uppercase tracking-wider text-blue-400 mb-1">Explanation (Tutor Only)</p>
          <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
        </div>
      )}
    </div>
  );

  const renderViewExamModal = () => {
    if (!isViewExamOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-[#0a0f1e] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye size={18} className="text-blue-400" /> Full Exam Preview
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{meta.title || 'Untitled Exam'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                <CheckCircle size={12} /> Answer Key Visible
              </span>
              <button onClick={() => setIsViewExamOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            {/* Exam Header Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Category</p>
                <p className="text-xs font-semibold text-white mt-1">{meta.category_id || '—'}</p>
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Level</p>
                <p className="text-xs font-semibold text-white mt-1">{meta.level_id || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Duration</p>
                <p className="text-xs font-semibold text-white mt-1">{meta.duration_minutes} mins</p>
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Total Questions</p>
                <p className="text-xs font-semibold text-white mt-1">{questions.filter(q => !q.is_problem).length}</p>
              </div>
            </div>

            {meta.description && (
              <div className="p-4 bg-slate-950/30 border border-white/5 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Exam Description</p>
                <div className="text-xs text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: meta.description }} />
              </div>
            )}

            {/* Sections */}
            {sections.map(sec => {
              const secProblems = questions.filter(q => q.section === sec.name && q.is_problem);
              const standaloneQuestions = questions.filter(q => q.section === sec.name && !q.is_problem && !q.parent_problem_id);
              const sectionIsListening = isListeningSection(sec.name);

              return (
                <div key={sec.id} className="border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {sectionIsListening && <Mic size={14} className="text-blue-400" />}
                      <h3 className="text-sm font-bold text-white">{sec.name}</h3>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">{getQuestionsForSection(sec.name).length} questions</span>
                  </div>

                  {sectionIsListening && sec.audio_url && (
                    <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2">
                      <Mic size={13} className="text-blue-400 flex-shrink-0" />
                      <audio src={sec.audio_url} controls className="w-full h-8" />
                    </div>
                  )}

                  <div className="p-4 space-y-4">
                    {secProblems.length === 0 && standaloneQuestions.length === 0 && (
                      <p className="text-xs text-gray-500 italic">No questions added yet in this section.</p>
                    )}

                    {/* Problems / Passages */}
                    {secProblems.map(problem => {
                      const childQuestions = getQuestionsForProblem(problem.id);
                      return (
                        <div key={problem.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-2.5">
                          <div className="flex items-center gap-2">
                            <FileText size={13} className="text-blue-400" />
                            <p className="text-xs font-bold text-white">{stripHtml(problem.problem_title)}</p>
                          </div>

                          {problem.explanation && (
                            <div
                              className="text-[11px] text-gray-300 leading-relaxed [&_ruby]:mx-0.5 [&_rt]:text-[9px] [&_rt]:text-blue-300"
                              dangerouslySetInnerHTML={{ __html: problem.explanation }}
                            />
                          )}

                          {problem.problem_image_url && (
                            <img src={problem.problem_image_url} alt="Problem" className="max-h-40 rounded-lg border border-white/10" />
                          )}

                          {problem.example_question && (
                            <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-lg space-y-1.5">
                              <span className="text-purple-400 font-bold">Example: </span>
                              <span dangerouslySetInnerHTML={{ __html: problem.example_question }} />
                              {problem.example_image_url && (
                                <img src={problem.example_image_url} alt="Example" className="max-h-32 rounded-lg border border-white/10 mt-1.5" />
                              )}
                              {Array.isArray(problem.options) && problem.options.some(o => o) && (
                                <div className="grid grid-cols-2 gap-1.5 pt-1">
                                  {problem.options.map((opt, oIdx) => {
                                    const isCorrect = problem.example_correct_option === oIdx;
                                    return (
                                      <div key={oIdx} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] ${isCorrect ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'text-gray-400'}`}>
                                        <span className={`w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-500'}`}>
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <span dangerouslySetInnerHTML={{ __html: opt || '—' }} />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {problem.example_explanation && (
                                <p className="text-[10px] text-blue-300 pt-1 border-t border-white/5 mt-1.5" dangerouslySetInnerHTML={{ __html: problem.example_explanation }} />
                              )}
                            </div>
                          )}

                          <div className="space-y-2 pl-3 border-l-2 border-white/10">
                            {childQuestions.map((q, idx) => (
                              <div key={q.id}>{renderPreviewQuestion(q, idx + 1)}</div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Standalone questions */}
                    {standaloneQuestions.map((q, idx) => (
                      <div key={q.id}>{renderPreviewQuestion(q, idx + 1)}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-6 py-4 border-t border-white/10 flex justify-end flex-shrink-0">
            <button
              onClick={() => setIsViewExamOpen(false)}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-300 transition-all"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 🎯 Non-destructive session-expiry modal. Does not unmount/navigate the
  // page away — the exam form stays exactly as-is underneath, and the
  // cached copy in localStorage is the backstop in case the tab is closed
  // or reloaded before re-authenticating.
  const renderSessionExpiredModal = () => {
    if (!isSessionExpired) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
        <div className="bg-[#0a0f1e] border border-amber-500/30 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
              <ShieldAlert size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Session Expired</h2>
              <p className="text-xs text-gray-400 mt-1">
                Your login session timed out while editing. Your questions and changes are safe — nothing has been lost.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 space-y-3">
            <p className="text-xs text-gray-300 leading-relaxed">
              We've kept a local copy of everything you've entered so far. Please log back in, then click
              <span className="text-white font-semibold"> "Retry Save"</span> below to pick up right where you left off.
            </p>
          </div>

          <div className="px-6 py-4 border-t border-white/10 flex flex-col gap-2">
            <button
              onClick={() => window.open('/login', '_blank', 'noopener,noreferrer')}
              className="w-full px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-200 transition-all"
            >
              Log In Again
            </button>
            <button
              disabled={isRestoringSession}
              onClick={retryPendingSaveAfterReauth}
              className="w-full px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-xs font-bold uppercase tracking-wider text-white rounded-xl shadow-lg shadow-blue-950/30 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {isRestoringSession ? <Loader size={14} className="animate-spin" /> : null}
              {isRestoringSession ? 'Retrying...' : 'Retry Save'}
            </button>
            <button
              onClick={() => {
                setIsSessionExpired(false);
                sessionExpiredHandledRef.current = false;
              }}
              className="w-full text-center text-[11px] text-gray-500 hover:text-gray-300 transition-colors pt-1"
            >
              Continue editing without retrying now
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // ✅ RENDER - MAIN RETURN
  // ============================================================

  return (
    <div className="space-y-6 max-w-6xl text-white relative" onFocusCapture={handleFormFocusCapture}>
      {renderViewExamModal()}
      {renderSessionExpiredModal()}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, x: 60, scale: 0.9 }} 
            animate={{ opacity: 1, x: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl max-w-sm ${
              toast.type === 'success' ? 'bg-[#0f1629] border-emerald-500/30 text-emerald-200' : 'bg-[#0f1629] border-rose-500/30 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-rose-400" />}
            <div className="flex-1">
              <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">Exam System</p>
              <p className="text-xs font-semibold mt-0.5 leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => setToast(p => ({ ...p, show: false }))} className="text-slate-400 hover:text-white transition-colors ml-2">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
              {examId ? 'Edit Exam' : 'Create New Exam'}
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              {examId ? 'Modify your existing exam structure' : 'Build and deploy your custom exam structure'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAutoSaving && (
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <Loader size={14} className="animate-spin" />
                Saving...
              </div>
            )}
            {!isAutoSaving && lastSavedAt && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle size={14} />
                {getLastSavedText()}
              </div>
            )}
            {!isAutoSaving && !lastSavedAt && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock size={14} />
                Auto-save ready
              </div>
            )}
            <button
              onClick={() => setIsViewExamOpen(true)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-300 transition-all flex items-center gap-1.5"
            >
              <Eye size={14} />
              View Exam
            </button>
            <button
              onClick={handleManualSaveDraft}
              disabled={isAutoSaving || !hasChanges}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Save size={14} />
              Save Draft
            </button>
          </div>
        </div>
      </motion.div>

      <GlassCard className="p-4 bg-white/[0.01] border-white/5 shadow-xl">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex items-center">
              <button disabled={submitLoading} onClick={() => i < step + 1 && setStep(i)} className="flex items-center gap-2.5 group focus:outline-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10'
                }`}>
                  {i < step ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider hidden md:block ${i === step ? 'text-white' : i < step ? 'text-emerald-400' : 'text-gray-500'}`}>{s}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 transition-all ${i < step ? 'bg-emerald-500' : 'bg-white/5'}`} />
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ============================================================
          🌐 GLOBAL FLOATING TOOLBAR - ONLY visible on Step 3 (Questions)
          Matches Stepper Bar styling exactly
      ============================================================ */}
      {step === 2 && (
        <div className="sticky top-0 z-40 -mx-1 px-1 pt-1 pb-1">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-1.5 backdrop-blur-sm">
            <QuestionEditorToolbar 
              activeFieldRef={activeFieldRef} 
              activeFieldLabel={activeFieldLabel} 
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.15 }}>
          
          {step === 0 && (
            <GlassCard className="p-6 space-y-5 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h2 className="text-base font-bold text-white uppercase tracking-wider">Exam Details</h2>
                {globalLoading && (
                  <div className="flex items-center gap-2 text-xs text-blue-400">
                    <Loader size={14} className="animate-spin" />
                    Loading categories...
                  </div>
                )}
              </div>
              
              {error && (
                <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <ShieldAlert size={14} />
                  {error}
                </div>
              )}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Exam Title <span className="text-rose-400">*</span>
                </label>
                <RichTextField
                  value={meta.title}
                  onChange={(html) => setMeta(p => ({ ...p, title: html }))}
                  placeholder="e.g., EPS-TOPIK Full Mock Test - 2024"
                  fieldLabel="Exam Title"
                  minHeightClass="min-h-[48px]"
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500/50"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Exam Category <span className="text-rose-400">*</span>
                  </label>
                  <select 
                    value={meta.category_id} 
                    onChange={e => handleCategoryChange(e.target.value)} 
                    className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50"
                    disabled={globalLoading}
                  >
                    <option value="" className="bg-[#070c19]">Select Exam Category</option>
                    {activeSchema && activeSchema.map(c => {
                      const value = getNormalizedCategory(c.id || c.category_name || c.name);
                      const display = c.category_name || c.name || c.id;
                      return (
                        <option key={value} value={value} className="bg-[#070c19]">
                          {display}
                        </option>
                      );
                    })}
                  </select>
                  {globalLoading && (
                    <p className="text-[9px] text-slate-500">Loading categories from database...</p>
                  )}
                  {!globalLoading && activeSchema.length === 0 && (
                    <p className="text-[9px] text-amber-400">⚠️ No active categories found in database</p>
                  )}
                </div>
                
                {isEpstopik ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Exam Type</label>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                      <p className="text-sm font-medium text-blue-300">📝 EPS-TOPIK Exam</p>
                      <ul className="text-[10px] text-gray-400 mt-1 space-y-0.5 list-disc list-inside">
                        <li>Total: 40 Questions (200 marks)</li>
                        <li>Reading: 20 Qs (25 min)</li>
                        <li>Listening: 20 Qs (25 min)</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Exam Level <span className="text-rose-400">*</span>
                    </label>
                    <select 
                      disabled={availableLevels.length === 0 || globalLoading} 
                      value={meta.level_id} 
                      onChange={e => setMeta(p => ({ ...p, level_id: e.target.value }))} 
                      className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 disabled:opacity-40"
                    >
                      <option value="" className="bg-[#070c19]">
                        {availableLevels.length === 0 ? 'No levels available' : 'Select Exam Level'}
                      </option>
                      {availableLevels.map(l => (
                        <option key={l.id || l.level_name} value={l.id || l.level_name} className="bg-[#070c19]">
                          {l.level_name || l.name || l.id}
                          {l.credit_cost > 0 && ` (${l.credit_cost} credits)`}
                        </option>
                      ))}
                    </select>
                    {availableLevels.length === 0 && meta.category_id && !globalLoading && (
                      <p className="text-[9px] text-amber-400">⚠️ No levels found for this category</p>
                    )}
                    {availableLevels.length > 0 && (
                      <p className="text-[9px] text-slate-500">{availableLevels.length} level(s) available</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Duration (Minutes)</label>
                  <div className={`flex items-center gap-3 bg-slate-950/40 border rounded-xl px-4 py-3 font-mono font-bold text-base ${
                    isEpstopik ? 'border-blue-500/30 text-blue-400' : 'border-white/10 text-blue-400'
                  }`}>
                    <span>{meta.duration_minutes} mins</span>
                    <div className="ml-auto text-[10px] uppercase bg-blue-500/10 border border-blue-500/20 text-blue-300 font-sans tracking-widest px-2 py-1 rounded-md flex items-center gap-1">
                      <Info size={12}/> {isEpstopik ? '🔒 Fixed for EPS-TOPIK' : 'Auto-calculated from sections'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Description (Optional)</label>
                <RichTextField
                  value={meta.description}
                  onChange={(html) => setMeta(p => ({ ...p, description: html }))}
                  placeholder="Describe the exam structure and what students will be tested on..."
                  fieldLabel="Exam Description"
                  minHeightClass="min-h-[84px]"
                  className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:border-blue-500/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Exam Thumbnail (Optional)</label>
                <label className="flex items-center gap-3 px-4 py-5 bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/30 transition-colors relative overflow-hidden h-20">
                  {meta.thumbnail ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <img src={meta.thumbnail} alt="Thumbnail" className="h-full w-full object-cover" />
                      <div className="absolute bg-black/60 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md text-white">Change Image</div>
                    </div>
                  ) : (
                    <>
                      <Upload size={20} className="text-blue-400" />
                      <span className="text-xs text-gray-400">Click to upload a cover image</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                </label>
              </div>
            </GlassCard>
          )}

          {step === 1 && (
            <GlassCard className="p-6 space-y-5 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h2 className="text-base font-bold uppercase tracking-wider">Exam Sections</h2>
                  {isJlpt && (
                    <p className="text-emerald-400 font-mono text-[10px] mt-0.5 tracking-wider uppercase">
                      🎯 Auto-configured for JLPT structure
                    </p>
                  )}
                  {isEpstopik && (
                    <p className="text-blue-400 font-mono text-[10px] mt-0.5 tracking-wider uppercase">
                      📝 EPS-TOPIK sections are fixed (Reading & Listening)
                    </p>
                  )}
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={addSection} 
                  className={`bg-white/5 border-white/10 text-gray-300 ${isEpstopik ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isEpstopik}
                >
                  <Plus size={14} /> Add Section
                </Button>
              </div>

              <div className="space-y-3">
                {sections.map((s) => (
                  <div key={s.id} className={`flex items-center gap-3 p-4 bg-slate-950/40 rounded-2xl border ${isEpstopik ? 'border-blue-500/20' : 'border-white/5'}`}>
                    {!isEpstopik && <GripVertical size={16} className="text-slate-600 flex-shrink-0" />}
                    {isEpstopik && (
                      <div className="w-1 h-10 bg-blue-500 rounded-full flex-shrink-0"></div>
                    )}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1 block">Section Name</label>
                        <RichTextField
                          value={s.name}
                          onChange={(html) => updateSection(s.id, 'name', html)}
                          placeholder="e.g., Vocabulary"
                          fieldLabel="Section Name"
                          minHeightClass="min-h-[36px]"
                          className="bg-slate-950/50 border border-white/10 rounded-xl px-3 py-1.5 text-white text-sm focus:border-blue-500/50"
                          disabled={isEpstopik}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1 block">Questions Count</label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={s.questions} 
                          onChange={e => updateSection(s.id, 'questions', e.target.value)}
                          disabled={isEpstopik}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1 block">Time (Minutes)</label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={s.time} 
                          onChange={e => updateSection(s.id, 'time', e.target.value)}
                          disabled={isEpstopik}
                        />
                      </div>
                    </div>
                    {isEpstopik && (
                      <div className="text-[10px] text-blue-400 font-mono px-2 py-1 bg-blue-500/10 rounded-lg flex-shrink-0">
                        🔒 Fixed
                      </div>
                    )}
                    {!isEpstopik && (
                      <button onClick={() => removeSection(s.id)} className="text-rose-400 hover:text-rose-300 p-1 flex-shrink-0 self-end mb-2">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl flex justify-between text-xs font-mono font-bold tracking-wide uppercase">
                <div>Total Questions: <span className="text-blue-400 ml-1">{sections.reduce((s, r) => s + Number(r.questions || 0), 0)}</span></div>
                <div>Total Time: <span className="text-blue-400 ml-1">{meta.duration_minutes} mins</span></div>
              </div>
            </GlassCard>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                {sections.map(sec => renderSectionSidebar(sec))}
              </div>

              <div className="lg:col-span-3">
                {activeItem ? (
                  <GlassCard className="p-6 space-y-5 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl relative">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge color={activeItem.is_problem ? 'blue' : activeItem.type === 'listening' ? 'purple' : activeItem.type === 'reading' ? 'green' : 'emerald'}>
                          {activeItem.is_problem ? 'PROBLEM BLOCK' : 
                           activeItem.type === 'listening' ? '🎧 LISTENING' : 
                           activeItem.type === 'reading' ? '📖 READING' : 
                           'STANDARD QUESTION'}
                        </Badge>
                        <span className="text-xs font-mono text-slate-400">{activeItem.section}</span>
                        {!activeItem.is_problem && (
                          <Badge color="purple" className="text-[9px]">
                            {getQuestionLabel(activeItem)}
                          </Badge>
                        )}
                        {!activeItem.is_problem && activeItem.parent_problem_id && (
                          <Badge color="purple" className="text-[9px]">
                            Linked to: {questions.find(q => q.id === activeItem.parent_problem_id)?.problem_title || 'Problem'}
                          </Badge>
                        )}
                        {isEpstopik && activeItem.is_problem && activeItem.problem_image_url && (
                          <Badge color="purple" className="text-[9px]">🖼️ Image</Badge>
                        )}
                        {isEpstopik && !activeItem.is_problem && activeItem.image_url && (
                          <Badge color="purple" className="text-[9px]">🖼️ Image</Badge>
                        )}
                      </div>
                      <button onClick={() => removeItem(activeItem.id)} className="text-rose-400 hover:text-rose-300" disabled={questions.length === 1}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {activeItem.is_problem ? renderProblemEditor() : renderQuestionEditor()}
                  </GlassCard>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 min-h-[300px]">
                    <BookOpen size={40} className="opacity-20 mb-3" />
                    <p className="text-sm font-semibold">No items created yet.</p>
                    <p className="text-xs opacity-60">Add a Problem or Question from the sidebar</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <GlassCard className="p-6 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl space-y-6">
                <h2 className="text-base font-bold uppercase tracking-wider border-b border-white/5 pb-2">Final Review</h2>
                {error && <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold"><ShieldAlert size={14}/>{error}</div>}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Exam Title', value: stripHtml(meta.title) || 'Untitled' },
                    { label: 'Category', value: meta.category_id ? meta.category_id.toUpperCase().replace(/_/g, '-') : 'Not selected' },
                    { label: 'Duration', value: `${meta.duration_minutes} mins` },
                    { label: 'Level', value: isEpstopik ? 'N/A' : (meta.level_id ? meta.level_id.toUpperCase() : 'Not selected') },
                  ].map((s, i) => (
                    <div key={i} className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl shadow-md">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-xs font-bold text-slate-200 truncate">{s.value}</p>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Sections</h4>
                  {sections.map((s, i) => {
                    const sectionQuestions = getQuestionsForSection(s.name);
                    const maxQuestions = Number(s.questions || 0);
                    const isComplete = maxQuestions > 0 && sectionQuestions.length >= maxQuestions;
                    
                    return (
                      <div key={i} className={`flex justify-between items-center px-4 py-3 bg-slate-900/20 border rounded-xl text-xs font-medium ${isEpstopik ? 'border-blue-500/20' : 'border-white/5'}`}>
                        <span className={`font-bold ${isEpstopik ? 'text-blue-300' : 'text-slate-300'}`}>{s.name}</span>
                        <div className="flex gap-4 text-slate-500 font-mono">
                          <span className={isComplete ? 'text-emerald-400' : 'text-slate-500'}>
                            {sectionQuestions.length} / {maxQuestions || 0} Questions
                          </span>
                          <span>{s.time || 0} mins</span>
                          {isListeningSection(s.name) && s.audio_url && (
                            <span className="text-emerald-400">🎧 Audio</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-500">
                  <p>Total Problems: {questions.filter(q => q.is_problem).length}</p>
                  <p>Total Questions: {questions.filter(q => !q.is_problem).length}</p>
                </div>
              </GlassCard>
              
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setIsViewExamOpen(true)} 
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider border border-white/10 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Eye size={15} /> View Exam
                </button>
                <button 
                  disabled={submitLoading} 
                  onClick={handleManualSaveDraft} 
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider border border-white/10 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Save size={15} /> Save Draft
                </button>
                <button 
                  disabled={submitLoading} 
                  onClick={() => handlePublishExam('pending')} 
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-xs font-bold uppercase tracking-wider text-white rounded-xl shadow-lg shadow-blue-950/30 transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  {submitLoading ? <Loader size={15} className="animate-spin" /> : <Send size={15} />} Submit for Review
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <Button variant="secondary" disabled={step === 0 || submitLoading} onClick={() => setStep(p => p - 1)} className="bg-white/5 text-gray-400 border border-white/10">
          <ChevronLeft size={16} /> Previous
        </Button>
        {step < STEPS.length - 1 && (
          <Button variant="primary" onClick={() => setStep(p => p + 1)} className="bg-blue-600 text-white">
            Next <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}