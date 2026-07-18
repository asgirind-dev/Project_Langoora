const { db } = require('../config/firebase');

// ── CBT System Configurations ───────────────────────────────────────────
const MAX_TAB_VIOLATIONS = 3;
const VIOLATION_LOCK_MINUTES = 30;

/**
 * 🧩 Get all sub-questions from a problem's sub_questions sub-collection
 */
async function getSubQuestions(problemRef) {
  try {
    const subQuestionsSnapshot = await problemRef.collection('sub_questions')
      .orderBy('sub_number')
      .get();
    
    const subQuestions = [];
    subQuestionsSnapshot.forEach(doc => {
      subQuestions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return subQuestions;
  } catch (error) {
    console.log(`No sub_questions sub-collection found for ${problemRef.path}`);
    return [];
  }
}

/**
 * 🧩 Normalize problem document with sub_questions from sub-collection
 */
async function normalizeProblemDoc(problemDoc) {
  const data = problemDoc.data();
  const items = [];

  // Get sub-questions from sub-collection
  const subQuestions = await getSubQuestions(problemDoc.ref);
  const exampleData = data.example || null;

  if (subQuestions.length > 0) {
    // Use sub-questions from sub-collection
    subQuestions.forEach((sq) => {
      items.push({
        itemId: `${problemDoc.id}__${sq.id}`,
        questionDocId: problemDoc.id,
        problem_number: data.problem_number || null,
        problem_title: data.problem_title || null,
        passage_text: data.passage_text || null,
        section: data.section || 'General',
        image_url: sq.image_url || data.image_url || null,
        audio_url: sq.audio_url || data.audio_url || null,
        text: sq.text || '',
        options: sq.options || ['', '', '', ''],
        _correct: sq.correct_answer_index !== undefined ? sq.correct_answer_index : 0,
        _explanation: sq.explanation || data.explanation || '',
      });
    });
  } else if (exampleData) {
    // Fallback: use example data if no sub-questions
    items.push({
      itemId: problemDoc.id,
      questionDocId: problemDoc.id,
      problem_number: data.problem_number || null,
      problem_title: data.problem_title || null,
      passage_text: data.passage_text || null,
      section: data.section || 'General',
      image_url: exampleData.image_url || null,
      audio_url: null,
      text: exampleData.text || '',
      options: exampleData.options || ['', '', '', ''],
      _correct: exampleData.correct_answer_index !== undefined ? exampleData.correct_answer_index : 0,
      _explanation: data.explanation || '',
    });
  }

  return items;
}

// ─── GET EXAM METADATA ───────────────────────────────────────────────────

const getExamMetadata = async (examId) => {
  const doc = await db.collection('exams').doc(examId).get();
  if (!doc.exists) throw new Error('Exam not found');
  return { id: doc.id, ...doc.data() };
};

// ─── GET GRADABLE ITEMS ─────────────────────────────────────────────────

const getGradableItems = async (examId) => {
  try {
    const problemsSnapshot = await db
      .collection(`exams/${examId}/problems`)
      .orderBy('problem_number')
      .get();

    if (problemsSnapshot.empty) {
      console.warn(`⚠️ No problems found for exam: ${examId}`);
      return [];
    }

    let items = [];
    for (const doc of problemsSnapshot.docs) {
      const normalizedItems = await normalizeProblemDoc(doc);
      items = items.concat(normalizedItems);
    }

    console.log(`📚 Found ${items.length} items from problems sub-collection`);
    return items;
  } catch (error) {
    console.error('Error fetching gradable items:', error);
    return [];
  }
};

// ─── GET SECURE QUESTIONS (WITHOUT ANSWER KEYS) ─────────────────────────

const getSecureQuestions = async (examId) => {
  try {
    const problemsSnapshot = await db
      .collection(`exams/${examId}/problems`)
      .orderBy('problem_number')
      .get();

    if (problemsSnapshot.empty) {
      return [];
    }

    const questions = [];
    for (const doc of problemsSnapshot.docs) {
      const data = doc.data();
      
      // Get sub-questions from sub-collection
      const subQuestionsSnapshot = await doc.ref.collection('sub_questions')
        .orderBy('sub_number')
        .get();
      
      const subQuestions = [];
      subQuestionsSnapshot.forEach(sqDoc => {
        const sqData = sqDoc.data();
        subQuestions.push({
          id: sqDoc.id,
          sub_number: sqData.sub_number,
          text: sqData.text || '',
          options: sqData.options || [],
          image_url: sqData.image_url || null,
          audio_url: sqData.audio_url || null,
          // No correct_answer_index here - stripped for student
        });
      });

      questions.push({
        id: doc.id,
        problem_number: data.problem_number,
        problem_title: data.problem_title || '',
        section: data.section || 'General',
        explanation: data.explanation || '',
        example: data.example || null,
        sub_questions: subQuestions,
        total_sub_questions: data.total_sub_questions || 0,
        image_url: data.image_url || null,
        audio_url: data.audio_url || null,
      });
    }

    return questions;
  } catch (error) {
    console.error('Error fetching secure questions:', error);
    return [];
  }
};

// ─── START EXAM ──────────────────────────────────────────────────────────

const startExam = async (examId, studentId) => {
  const examRef = db.collection('exams').doc(examId);
  const examDoc = await examRef.get();

  if (!examDoc.exists) throw new Error('Exam node not deployed inside Firestore.');

  const examData = examDoc.data();

  const attemptPayload = {
    examId,
    studentId,
    status: 'active',
    startTime: new Date().toISOString(),
    endTime: null,
    answers: {},
    flagged: [],
    violations: 0,
    violationTimestamps: [],
    isLocked: false,
    lockUntil: null,
    score: 0,
    totalQuestions: 0,
    percentage: 0,
    passed: false,
    title: examData.title || 'Language Examination',
    duration_minutes: Number(examData.duration_minutes || 60),
    level_id: examData.level_id || 'N5',
    category_id: examData.category_id || 'jlpt',
  };

  const docRef = db.collection('student_exams').doc();
  await docRef.set(attemptPayload);

  return { attemptId: docRef.id, ...attemptPayload };
};

// ─── LOG VIOLATION ──────────────────────────────────────────────────────

const logViolation = async (attemptId) => {
  const attemptRef = db.collection('student_exams').doc(attemptId);
  const attemptDoc = await attemptRef.get();

  if (!attemptDoc.exists) throw new Error('Active attempt record session not found.');

  const data = attemptDoc.data();
  if (data.status === 'completed') return { currentViolations: data.violations, isLocked: false };

  const currentViolations = (data.violations || 0) + 1;
  const now = new Date();
  const timestamps = data.violationTimestamps || [];
  timestamps.push(now.toISOString());

  let isLocked = false;
  let lockUntil = null;

  if (currentViolations >= MAX_TAB_VIOLATIONS) {
    isLocked = true;
    const lockExpiry = new Date(now.getTime() + VIOLATION_LOCK_MINUTES * 60000);
    lockUntil = lockExpiry.toISOString();
  }

  const updateFields = {
    violations: currentViolations,
    violationTimestamps: timestamps,
    isLocked,
    lockUntil
  };

  if (isLocked) {
    updateFields.status = 'locked';
  }

  await attemptRef.update(updateFields);
  return { attemptId, currentViolations, isLocked, lockUntil };
};

// ─── GET ATTEMPT STATUS ─────────────────────────────────────────────────

const getAttemptStatus = async (attemptId) => {
  const doc = await db.collection('student_exams').doc(attemptId).get();
  if (!doc.exists) throw new Error('Attempt mapping entry point missing.');
  return doc.data();
};

// ─── SUBMIT EXAM ─────────────────────────────────────────────────────────

const submitExam = async (attemptId, answers, flagged, autoSubmitted) => {
  const attemptRef = db.collection('student_exams').doc(attemptId);
  const attemptSnapshot = await attemptRef.get();

  if (!attemptSnapshot.exists) throw new Error('Target validation reference broken.');

  const attemptData = attemptSnapshot.data();
  if (attemptData.status === 'completed') return { attemptId, ...attemptData };

  const examRef = db.collection('exams').doc(attemptData.examId);
  const problemsSnapshot = await examRef.collection('problems').orderBy('problem_number').get();

  let items = [];
  for (const doc of problemsSnapshot.docs) {
    const normalizedItems = await normalizeProblemDoc(doc);
    items = items.concat(normalizedItems);
  }

  let totalCorrect = 0;
  const questionResults = [];
  const sectionScores = {};

  items.forEach(item => {
    const sec = item.section || 'General';
    if (!sectionScores[sec]) sectionScores[sec] = { correct: 0, total: 0 };
    sectionScores[sec].total += 1;

    const userAnswerIndex = answers[item.itemId];
    const userAnswer = userAnswerIndex !== undefined && item.options[userAnswerIndex] 
      ? item.options[userAnswerIndex] 
      : 'Not Answered';
    const correctOptionIndex = Number(item._correct);
    const correct = item.options[correctOptionIndex] || 'N/A';
    
    const isCorrect = userAnswerIndex !== undefined && Number(userAnswerIndex) === correctOptionIndex;

    if (isCorrect) {
      totalCorrect += 1;
      sectionScores[sec].correct += 1;
    }

    questionResults.push({
      itemId: item.itemId,
      section: sec,
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
  if (!doc.exists) throw new Error('Attempt results report not found');
  return doc.data();
};

module.exports = {
  startExam,
  getExamMetadata,
  getSecureQuestions,
  getGradableItems,
  logViolation,
  getAttemptStatus,
  submitExam,
  getResults,
};