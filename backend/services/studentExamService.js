const { db } = require('../config/firebase');

// ── CBT Engine Configuration ─────────────────────────────────────────────
const MAX_TAB_VIOLATIONS = 3;
const VIOLATION_LOCK_MINUTES = 30; // "fair" cooldown once a student is locked out for cheating flags

/**
 * 🧩 Normalize a single question document into one or more gradable "items".
 *
 * Two schemas exist in the wild:
 *  1) Flat (older wizard / examController.createExam): { text, options, correct_answer_index }
 *  2) Grouped (JLPT/EPS-TOPIK style, per your Firestore dump): { problem_title, sub_questions: [...] }
 *
 * This returns a flat array of items regardless of which shape the doc uses,
 * so the rest of the CBT engine never has to care which wizard produced the exam.
 */
function normalizeQuestionDoc(doc) {
  const data = doc.data();
  const items = [];

  if (Array.isArray(data.sub_questions) && data.sub_questions.length > 0) {
    data.sub_questions.forEach((sq, idx) => {
      items.push({
        itemId: `${doc.id}__${sq.sub_question_id || `sq${idx + 1}`}`,
        questionDocId: doc.id,
        problem_number: data.problem_number ?? null,
        problem_title: data.problem_title || null,
        passage_text: data.passage_text || null,
        section: data.section || 'General',
        image_url: sq.image_url || data.image_url || null,
        audio_url: sq.audio_url || data.audio_url || null,
        text: sq.text || '',
        options: sq.options || [],
        _correct: sq.correct_answer_index,
        _explanation: sq.explanation || '',
      });
    });
  } else {
    items.push({
      itemId: doc.id,
      questionDocId: doc.id,
      problem_number: data.problem_number ?? data.question_number ?? null,
      problem_title: data.problem_title || null,
      passage_text: data.passage_text || null,
      section: data.section || 'General',
      image_url: data.image_url || null,
      audio_url: data.audio_url || null,
      text: data.text || '',
      options: data.options || [],
      _correct: data.correct_answer_index,
      _explanation: data.explanation || '',
    });
  }

  return items;
}

/** Strip answer-key fields before anything is sent to the browser. */
function toStudentFacing(item) {
  const { _correct, _explanation, ...safe } = item;
  return safe;
}

const getExamMetadata = async (examId) => {
  const doc = await db.collection('exams').doc(examId).get();
  if (!doc.exists) throw new Error('Exam not found');
  return { id: doc.id, ...doc.data() };
};

/** Full items, WITH answer keys — server-side use only (grading). */
const getGradableItems = async (examId) => {
  const snapshot = await db
    .collection(`exams/${examId}/questions`)
    .orderBy('question_number')
    .get()
    .catch(() =>
      // question_number doesn't exist on the grouped schema — fall back to problem_number ordering
      db.collection(`exams/${examId}/questions`).orderBy('problem_number').get()
    );

  let items = [];
  snapshot.docs.forEach((doc) => {
    items = items.concat(normalizeQuestionDoc(doc));
  });
  return items;
};

/** Student-facing items — answer keys stripped. */
const getQuestionsForStudent = async (examId) => {
  const items = await getGradableItems(examId);
  return items.map(toStudentFacing);
};

const startExam = async (examId, studentId) => {
  const examMeta = await getExamMetadata(examId);

  const attemptRef = db.collection('student_exams').doc();
  const attemptData = {
    examId,
    examTitle: examMeta.title || '',
    categoryId: examMeta.category_id || null,
    levelId: examMeta.level_id || null,
    studentId,
    startTime: new Date().toISOString(),
    status: 'in_progress',
    answers: {},
    flagged: [],
    score: null,
    totalQuestions: null,
    percentage: null,
    passed: false,
    sectionScores: null,
    questionResults: null,
    endTime: null,
    // Anti-cheating / integrity tracking
    tabSwitchCount: 0,
    locked: false,
    lockedUntil: null,
    autoSubmitted: false,
  };
  await attemptRef.set(attemptData);
  return { attemptId: attemptRef.id, ...attemptData };
};

/**
 * 🚨 Record a tab-switch / focus-loss violation for an in-progress attempt.
 * On the 3rd strike, the attempt is locked out for a cooldown period so the
 * student isn't shut out of the platform forever, but can't keep gaming this exam.
 */
const registerViolation = async (attemptId) => {
  const attemptRef = db.collection('student_exams').doc(attemptId);
  const doc = await attemptRef.get();
  if (!doc.exists) throw new Error('Attempt not found');

  const data = doc.data();
  if (data.status === 'completed') {
    return { attemptId, tabSwitchCount: data.tabSwitchCount || 0, locked: false, shouldAutoSubmit: false };
  }

  const tabSwitchCount = (data.tabSwitchCount || 0) + 1;
  const shouldLock = tabSwitchCount >= MAX_TAB_VIOLATIONS;

  const update = { tabSwitchCount };
  let lockedUntil = data.lockedUntil || null;

  if (shouldLock) {
    lockedUntil = new Date(Date.now() + VIOLATION_LOCK_MINUTES * 60 * 1000).toISOString();
    update.locked = true;
    update.lockedUntil = lockedUntil;
  }

  await attemptRef.update(update);

  return {
    attemptId,
    tabSwitchCount,
    locked: shouldLock,
    lockedUntil,
    shouldAutoSubmit: shouldLock, // the caller (route) triggers the actual auto-submit
  };
};

const getAttemptStatus = async (attemptId) => {
  const doc = await db.collection('student_exams').doc(attemptId).get();
  if (!doc.exists) throw new Error('Attempt not found');
  const data = doc.data();
  return {
    attemptId,
    status: data.status,
    tabSwitchCount: data.tabSwitchCount || 0,
    locked: !!data.locked,
    lockedUntil: data.lockedUntil || null,
  };
};

const submitExam = async (attemptId, answers, flagged, autoSubmitted = false) => {
  const attemptRef = db.collection('student_exams').doc(attemptId);
  const attemptDoc = await attemptRef.get();
  if (!attemptDoc.exists) throw new Error('Attempt not found');
  const attemptData = attemptDoc.data();
  if (attemptData.status === 'completed') {
    return { attemptId, ...attemptData };
  }

  const items = await getGradableItems(attemptData.examId);

  let totalCorrect = 0;
  const sectionScores = {};
  const questionResults = [];

  items.forEach((item) => {
    const userAnswer = answers && answers[item.itemId] !== undefined ? answers[item.itemId] : null;
    const correct = item._correct;
    const isCorrect = userAnswer !== null && userAnswer === correct;
    if (isCorrect) totalCorrect++;

    const section = item.section || 'General';
    if (!sectionScores[section]) sectionScores[section] = { correct: 0, total: 0 };
    sectionScores[section].total++;
    if (isCorrect) sectionScores[section].correct++;

    questionResults.push({
      itemId: item.itemId,
      questionDocId: item.questionDocId,
      section,
      problem_title: item.problem_title,
      text: item.text,
      options: item.options,
      userAnswer,
      correct,
      isCorrect,
      explanation: item._explanation || '',
    });
  });

  const totalQuestions = items.length;
  const percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const passed = percentage >= 65;

  const sectionData = Object.entries(sectionScores).map(([section, d]) => ({
    section,
    score: d.correct,
    total: d.total,
    pct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
  }));

  const updateData = {
    status: 'completed',
    endTime: new Date().toISOString(),
    answers: answers || {},
    flagged: flagged || [],
    score: totalCorrect,
    totalQuestions,
    percentage,
    passed,
    sectionScores: sectionData,
    questionResults,
    autoSubmitted: !!autoSubmitted,
  };

  await attemptRef.update(updateData);
  return { attemptId, ...attemptData, ...updateData };
};

const getResults = async (attemptId) => {
  const doc = await db.collection('student_exams').doc(attemptId).get();
  if (!doc.exists) throw new Error('Attempt not found');
  return { id: doc.id, ...doc.data() };
};

module.exports = {
  MAX_TAB_VIOLATIONS,
  VIOLATION_LOCK_MINUTES,
  getExamMetadata,
  getQuestionsForStudent,
  getGradableItems,
  startExam,
  registerViolation,
  getAttemptStatus,
  submitExam,
  getResults,
};
