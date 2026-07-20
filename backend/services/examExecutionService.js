const { db } = require('../config/firebase');

// ── CBT System Configurations ───────────────────────────────────────────
// ❌ REMOVED HARDCODED VALUES
// const MAX_TAB_VIOLATIONS = 3;
// const VIOLATION_LOCK_MINUTES = 30;

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
 * 🧩 Flatten problem document with sub_questions from sub-collection into individual items
 */
async function flattenProblemDoc(problemDoc) {
  const data = problemDoc.data();
  const items = [];

  const subQuestions = await getSubQuestions(problemDoc.ref);

  if (data.example) {
    const example = data.example;
    if (example.text && example.options && Array.isArray(example.options)) {
      items.push({
        id: `${problemDoc.id}__example`,
        questionDocId: problemDoc.id,
        problem_number: data.problem_number || null,
        problem_title: data.problem_title || null,
        section: data.section || 'General',
        image_url: example.image_url || null,
        audio_url: example.audio_url || null,
        text: example.text || '',
        options: example.options || [],
        _correct: example.correct_answer_index !== undefined ? example.correct_answer_index : 0,
        _explanation: example.explanation || data.explanation || '',
        isExample: true,
      });
    }
  }

  subQuestions.forEach((sq) => {
    items.push({
      id: sq.id,
      questionDocId: problemDoc.id,
      problem_number: data.problem_number || null,
      problem_title: data.problem_title || null,
      section: data.section || 'General',
      image_url: sq.image_url || null,
      audio_url: sq.audio_url || null,
      text: sq.text || '',
      options: sq.options || [],
      _correct: sq.correct_answer_index !== undefined ? sq.correct_answer_index : 0,
      _explanation: sq.explanation || data.explanation || '',
      isExample: false,
    });
  });

  return items;
}

/**
 * 🧩 Build a globally-unique key for an exam item.
 *
 * `item.id` alone is NOT safe to use as a lookup key: sub-questions live in
 * a `sub_questions` sub-collection scoped to each individual problem
 * (もんだい), so the same doc id (e.g. "sub_01") legitimately recurs under
 * every problem — within a section and across sections. `questionDocId`
 * (the parent problem document's id) IS guaranteed unique across the whole
 * exam, since all problems live in one flat `exams/{examId}/problems`
 * collection. Combining the two gives a stable, collision-proof key that
 * the frontend and backend must both use identically.
 */
function itemKey(item) {
  return `${item.questionDocId}::${item.id}`;
}

const getExamMetadata = async (examId) => {
  const doc = await db.collection('exams').doc(examId).get();
  if (!doc.exists) throw new Error('Exam not found');
  return { id: doc.id, ...doc.data() };
};

// ─── GET SECURITY POLICIES ──────────────────────────────────────────────
async function getSecurityPolicies() {
  try {
    const doc = await db.collection('system_settings').doc('security_governance').get();
    if (!doc.exists) {
      // Return defaults if document doesn't exist
      return { 
        enableAntiCheat: true, 
        maxViolationWarnings: 3, 
        lockMinutes: 30,
        maintenanceMode: false,
        sessionTimeouts: { admin: 15, tutor: 20, student: 45, finance: 10, validator: 15 }
      };
    }
    return doc.data();
  } catch (error) {
    console.error('Error fetching security policies:', error);
    // Return defaults on error
    return { 
      enableAntiCheat: true, 
      maxViolationWarnings: 3, 
      lockMinutes: 30 
    };
  }
}

// ─── GET GRADABLE ITEMS (WITH ANSWER KEYS) ─────────────────────────────
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
      const flattenedItems = await flattenProblemDoc(doc);
      items = items.concat(flattenedItems);
    }

    console.log(`📚 Found ${items.length} gradable items from problems`);
    return items;
  } catch (error) {
    console.error('Error fetching gradable items:', error);
    return [];
  }
};

// ─── GET SECURE QUESTIONS (WITHOUT ANSWER KEYS) ─────────────────────────
const getSecureQuestions = async (examId) => {
  try {
    const gradableItems = await getGradableItems(examId);
    
    const secureItems = gradableItems.map(item => {
      if (item.isExample) {
        return item;
      }
      const { _correct, _explanation, ...secureItem } = item;
      return secureItem;
    });

    const exampleCount = secureItems.filter(i => i.isExample).length;
    console.log(`📤 Sending ${secureItems.length} questions to student (${exampleCount} example questions with answers)`);
    return secureItems;
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

  // ✅ Get dynamic policies from database
  const policies = await getSecurityPolicies();
  
  // ✅ CHECK: Is anti-cheat enabled? - THIS IS THE KEY FIX
  if (!policies.enableAntiCheat) {
    // Anti-cheat is disabled - return without logging violation
    console.log(`🔓 Anti-cheat is DISABLED. Tab switch ignored for attempt: ${attemptId}`);
    return { 
      attemptId, 
      currentViolations: data.violations || 0, 
      isLocked: false, 
      lockUntil: null,
      maxViolations: policies.maxViolationWarnings || 3,
      remaining: policies.maxViolationWarnings || 3,
      antiCheatDisabled: true  // ← Let frontend know anti-cheat is off
    };
  }

  const MAX_TAB_VIOLATIONS = policies.maxViolationWarnings || 3;
  const VIOLATION_LOCK_MINUTES = policies.lockMinutes || 30;

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
  
  // ✅ Return all data including max violations and remaining
  return { 
    attemptId, 
    currentViolations, 
    isLocked, 
    lockUntil,
    maxViolations: MAX_TAB_VIOLATIONS,
    remaining: Math.max(0, MAX_TAB_VIOLATIONS - currentViolations),
    antiCheatDisabled: false
  };
};

// ─── GET ATTEMPT STATUS ─────────────────────────────────────────────────
const getAttemptStatus = async (attemptId) => {
  const doc = await db.collection('student_exams').doc(attemptId).get();
  if (!doc.exists) throw new Error('Attempt mapping entry point missing.');
  return doc.data();
};

// ─── SAVE SUBMISSION ──────────────────────────────────────────────────
const saveSubmission = async (submissionData) => {
  const submissionRef = db.collection('submissions').doc();
  await submissionRef.set({
    ...submissionData,
    created_at: new Date().toISOString(),
  });
  return submissionRef.id;
};

// ─── SUBMIT EXAM ─────────────────────────────────────────────────────────
const submitExam = async (attemptId, answers, flagged, autoSubmitted) => {
  const attemptRef = db.collection('student_exams').doc(attemptId);
  const attemptSnapshot = await attemptRef.get();

  if (!attemptSnapshot.exists) throw new Error('Target validation reference broken.');

  const attemptData = attemptSnapshot.data();
  if (attemptData.status === 'completed') return { attemptId, ...attemptData };

  const items = await getGradableItems(attemptData.examId);

  let totalCorrect = 0;
  const questionResults = [];
  const sectionScores = {};
  const studentAnswers = [];

  // Track start time for duration calculation
  const startTime = new Date(attemptData.startTime);
  const endTime = new Date();

  items.forEach(item => {
    const sec = item.section || 'General';
    if (!sectionScores[sec]) sectionScores[sec] = { correct: 0, total: 0 };
    sectionScores[sec].total += 1;

    const userAnswerIndex = answers[itemKey(item)];
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

    // Build student_answers for submissions collection
    studentAnswers.push({
      question_id: item.id,
      selected_index: userAnswerIndex !== undefined ? userAnswerIndex : null,
      is_correct: isCorrect,
    });

    questionResults.push({
      itemId: item.id,
      section: sec,
      text: item.text,
      options: item.options,
      userAnswer,
      correct,
      isCorrect,
      explanation: item._explanation || '',
      isExample: item.isExample || false,
    });
  });

  const totalQuestions = items.length;
  const percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const passed = percentage >= 65;
  const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);

  const sectionData = Object.entries(sectionScores).map(([section, d]) => ({
    section,
    score: d.correct,
    total: d.total,
    pct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
  }));

  // ─── Update student_exams ─────────────────────────────────────────────
  const updateData = {
    status: 'completed',
    endTime: endTime.toISOString(),
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

  // ─── Save to submissions collection ───────────────────────────────────
  const submissionPayload = {
    student_id: attemptData.studentId,
    exam_id: attemptData.examId,
    score: totalCorrect,
    total_questions: totalQuestions,
    percentage: percentage,
    passed: passed,
    time_taken_seconds: timeTakenSeconds,
    student_answers: studentAnswers,
    section_scores: sectionData,
    submitted_at: endTime.toISOString(),
    attempt_id: attemptId,
    title: attemptData.title || 'Language Examination',
    level_id: attemptData.level_id || 'N5',
    category_id: attemptData.category_id || 'jlpt',
    auto_submitted: !!autoSubmitted,
  };

  const submissionId = await saveSubmission(submissionPayload);

  return { 
    attemptId, 
    ...attemptData, 
    ...updateData,
    submissionId,
    timeTakenSeconds,
  };
};

// ─── GET RESULTS ─────────────────────────────────────────────────────────
const getResults = async (attemptId) => {
  const doc = await db.collection('student_exams').doc(attemptId).get();
  if (!doc.exists) throw new Error('Attempt results report not found');
  return doc.data();
};

// ─── GET SUBMISSIONS HISTORY ──────────────────────────────────────────
const getStudentSubmissions = async (studentId, examId = null) => {
  try {
    let query = db.collection('submissions')
      .where('student_id', '==', studentId)
      .orderBy('submitted_at', 'desc');

    if (examId) {
      query = query.where('exam_id', '==', examId);
    }

    const snapshot = await query.get();
    const submissions = [];
    snapshot.forEach(doc => {
      submissions.push({ id: doc.id, ...doc.data() });
    });
    return submissions;
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
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
  getStudentSubmissions,
};