const { db } = require('../config/firebase');

// ── CBT Engine Configuration ─────────────────────────────────────────────
const MAX_TAB_VIOLATIONS = 3;
const VIOLATION_LOCK_MINUTES = 30;

/**
 * 🧩 Normalize a problem document into gradable "items".
 * Handles both empty and non-empty sub_questions arrays.
 */
function normalizeProblemDoc(problemDoc) {
  const data = problemDoc.data();
  const items = [];

  // Check if this problem has sub_questions
  if (Array.isArray(data.sub_questions) && data.sub_questions.length > 0) {
    data.sub_questions.forEach((sq, idx) => {
      items.push({
        itemId: `${problemDoc.id}__${idx}`,
        questionDocId: problemDoc.id,
        problem_number: data.problem_number || null,
        problem_title: data.problem_title || null,
        passage_text: data.example?.text || null,
        section: data.section || 'General',
        image_url: sq.image_url || null,
        audio_url: sq.audio_url || null,
        text: sq.text || '',
        options: sq.options || ['', '', '', ''],
        _correct: sq.correct_answer_index !== undefined ? sq.correct_answer_index : 0,
        _explanation: sq.explanation || data.explanation || '',
      });
    });
  } else {
    // If no sub_questions, use the problem itself (if it has example data)
    if (data.example && data.example.text) {
      items.push({
        itemId: problemDoc.id,
        questionDocId: problemDoc.id,
        problem_number: data.problem_number || null,
        problem_title: data.problem_title || null,
        passage_text: data.example?.text || null,
        section: data.section || 'General',
        image_url: data.image_url || null,
        audio_url: data.audio_url || null,
        text: data.example?.text || '',
        options: data.example?.options || ['', '', '', ''],
        _correct: data.example?.correct_answer_index !== undefined ? data.example.correct_answer_index : 0,
        _explanation: data.explanation || '',
      });
    }
  }

  return items;
}

/** Strip answer-key fields before anything is sent to the browser. */
function toStudentFacing(item) {
  const { _correct, _explanation, ...safe } = item;
  return safe;
}

// ─── GET EXAM METADATA ────────────────────────────────────────────────────

const getExamMetadata = async (examId) => {
  const doc = await db.collection('exams').doc(examId).get();
  if (!doc.exists) throw new Error('Exam not found');
  return { id: doc.id, ...doc.data() };
};

// ─── GET GRADABLE ITEMS (WITH ANSWER KEYS) ──────────────────────────────

const getGradableItems = async (examId) => {
  try {
    // Try to get from 'problems' sub-collection first (new structure)
    const problemsSnapshot = await db
      .collection(`exams/${examId}/problems`)
      .orderBy('problem_number')
      .get();

    if (!problemsSnapshot.empty) {
      let items = [];
      problemsSnapshot.docs.forEach((doc) => {
        const normalizedItems = normalizeProblemDoc(doc);
        items = items.concat(normalizedItems);
      });
      console.log(`📚 Found ${items.length} items from problems sub-collection`);
      return items;
    }

    // Fallback: try 'questions' sub-collection (old structure)
    const questionsSnapshot = await db
      .collection(`exams/${examId}/questions`)
      .orderBy('question_number')
      .get();

    if (!questionsSnapshot.empty) {
      let items = [];
      questionsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        items.push({
          itemId: doc.id,
          questionDocId: doc.id,
          problem_number: data.question_number || null,
          problem_title: data.problem_title || null,
          passage_text: data.passage_text || null,
          section: data.section || 'General',
          image_url: data.image_url || null,
          audio_url: data.audio_url || null,
          text: data.text || '',
          options: data.options || [],
          _correct: data.correct_answer_index !== undefined ? data.correct_answer_index : 0,
          _explanation: data.explanation || '',
        });
      });
      console.log(`📚 Found ${items.length} items from questions sub-collection`);
      return items;
    }

    console.warn(`⚠️ No questions found for exam: ${examId}`);
    return [];
  } catch (error) {
    console.error('Error fetching gradable items:', error);
    return [];
  }
};

// ─── GET QUESTIONS FOR STUDENT (WITHOUT ANSWER KEYS) ────────────────────

const getQuestionsForStudent = async (examId) => {
  const items = await getGradableItems(examId);
  const studentItems = items.map(toStudentFacing);
  console.log(`📤 Sending ${studentItems.length} questions to student (keys stripped)`);
  return studentItems;
};

// ─── START EXAM ───────────────────────────────────────────────────────────

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
    tabSwitchCount: 0,
    locked: false,
    lockedUntil: null,
    autoSubmitted: false,
  };
  await attemptRef.set(attemptData);
  return { attemptId: attemptRef.id, ...attemptData };
};

// ─── REGISTER VIOLATION ──────────────────────────────────────────────────

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
    shouldAutoSubmit: shouldLock,
  };
};

// ─── GET ATTEMPT STATUS ──────────────────────────────────────────────────

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

// ─── SUBMIT EXAM ─────────────────────────────────────────────────────────

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

// ─── GET RESULTS ─────────────────────────────────────────────────────────

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