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
 * 🧩 Get ONLY sub-questions (real questions) from a problem
 */
async function getRealQuestionsOnly(problemDoc) {
  const data = problemDoc.data();
  const realQuestions = [];

  const subQuestions = await getSubQuestions(problemDoc.ref);

  subQuestions.forEach((sq) => {
    realQuestions.push({
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

  return realQuestions;
}

/**
 * 🧩 Get ALL items (including examples) for display purposes
 */
async function getAllItemsForDisplay(problemDoc) {
  const data = problemDoc.data();
  const items = [];

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

  const subQuestions = await getSubQuestions(problemDoc.ref);
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
 */
function itemKey(item) {
  return `${item.questionDocId}::${item.id}`;
}

const getExamMetadata = async (examId) => {
  const doc = await db.collection('exams').doc(examId).get();
  if (!doc.exists) throw new Error('Exam not found');
  return { id: doc.id, ...doc.data() };
};

// ─── GET GRADABLE ITEMS ──────────────────────────────────────────────
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
      const realQuestions = await getRealQuestionsOnly(doc);
      items = items.concat(realQuestions);
    }

    console.log(`📚 Found ${items.length} gradable items (real questions only)`);
    return items;
  } catch (error) {
    console.error('Error fetching gradable items:', error);
    return [];
  }
};

// ─── GET SECURE QUESTIONS ─────────────────────────────────────────────
const getSecureQuestions = async (examId) => {
  try {
    const problemsSnapshot = await db
      .collection(`exams/${examId}/problems`)
      .orderBy('problem_number')
      .get();

    if (problemsSnapshot.empty) {
      console.warn(`⚠️ No problems found for exam: ${examId}`);
      return [];
    }

    let allItems = [];
    for (const doc of problemsSnapshot.docs) {
      const items = await getAllItemsForDisplay(doc);
      allItems = allItems.concat(items);
    }

    const secureItems = allItems.map(item => {
      if (item.isExample) {
        return item;
      }
      const { _correct, _explanation, ...secureItem } = item;
      return secureItem;
    });

    const exampleCount = secureItems.filter(i => i.isExample).length;
    const realCount = secureItems.filter(i => !i.isExample).length;
    console.log(`📤 Sending ${secureItems.length} questions (${exampleCount} examples, ${realCount} real questions)`);
    return secureItems;
  } catch (error) {
    console.error('Error fetching secure questions:', error);
    return [];
  }
};

// ─── START EXAM ──────────────────────────────────────────────────────
const startExam = async (examId, studentId) => {
  const examRef = db.collection('exams').doc(examId);
  const examDoc = await examRef.get();

  if (!examDoc.exists) throw new Error('Exam node not deployed inside Firestore.');

  const examData = examDoc.data();

  const gradableItems = await getGradableItems(examId);
  const totalRealQuestions = gradableItems.length;

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
    totalQuestions: totalRealQuestions,
    percentage: 0,
    passed: false,
    title: examData.title || 'Language Examination',
    duration_minutes: Number(examData.duration_minutes || 60),
    level_id: examData.level_id || 'N5',
    category_id: examData.category_id || 'jlpt',
    tutor_id: examData.tutor_id || null,
    tutor_name: examData.tutor_name || 'Expert Tutor',
    startedAt: new Date().toISOString(),
  };

  const docRef = db.collection('student_exams').doc();
  await docRef.set(attemptPayload);

  return { attemptId: docRef.id, ...attemptPayload };
};

// ─── LOG VIOLATION ──────────────────────────────────────────────────
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

// ─── GET ATTEMPT STATUS ─────────────────────────────────────────────
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

// ─── ──────────────────────────────────────────────────────────────────
// 🎯 RESULT ENGINE - Calculates PASS/FAIL based on passingType
// ─── ──────────────────────────────────────────────────────────────────

/**
 * Calculate results based on passing type
 * 
 * Supported passing types:
 * - TOTAL_AND_SECTION: JLPT (check total + each section minimum)
 * - CUT_OFF_SCORE: EPS-TOPIK (compare with cut-off score)
 * - LEVEL_RANGE: TOPIK I (determine level from score range)
 */
function calculateResult(passingType, passingConfig, totalScore, sectionScores) {
  switch (passingType) {
    case 'TOTAL_AND_SECTION':
      return calculateJLPTResult(passingConfig, totalScore, sectionScores);
    
    case 'CUT_OFF_SCORE':
      return calculateEPSResult(passingConfig, totalScore);
    
    case 'LEVEL_RANGE':
      return calculateTOPIKResult(passingConfig, totalScore);
    
    default:
      // Fallback: Simple percentage-based
      return calculateDefaultResult(passingConfig, totalScore);
  }
}

/**
 * JLPT Result Calculation (TOTAL_AND_SECTION)
 * - Total score must be >= overallPassScore
 * - Each section must be >= its minimumScore
 */
function calculateJLPTResult(config, totalScore, sectionScores) {
  const overallPass = config.overallPassScore || 80;
  const sections = config.sections || [];
  
  // Check total score
  const totalPassed = totalScore >= overallPass;
  
  // Check each section
  let sectionResults = [];
  let allSectionsPassed = true;
  let failedSection = null;
  
  sections.forEach(section => {
    const sectionName = section.name;
    const minScore = section.minimumScore || 0;
    const achievedScore = sectionScores[sectionName] || 0;
    const passed = achievedScore >= minScore;
    
    sectionResults.push({
      name: sectionName,
      achieved: achievedScore,
      required: minScore,
      passed: passed
    });
    
    if (!passed) {
      allSectionsPassed = false;
      failedSection = sectionName;
    }
  });
  
  const passed = totalPassed && allSectionsPassed;
  
  let reason = null;
  if (!passed) {
    if (!totalPassed) {
      reason = `Overall score (${totalScore}) is below the required passing mark (${overallPass})`;
    } else if (failedSection) {
      reason = `${failedSection} section score is below the required minimum`;
    }
  }
  
  return {
    passed,
    reason,
    totalPassed,
    allSectionsPassed,
    overallPass,
    sectionResults,
    totalScore
  };
}

/**
 * EPS-TOPIK Result Calculation (CUT_OFF_SCORE)
 * - Compare total score with cut-off score
 */
function calculateEPSResult(config, totalScore) {
  const cutOffScore = config.cutOffScore || 65;
  const passed = totalScore >= cutOffScore;
  
  return {
    passed,
    reason: passed ? null : `Current recruitment cut-off score (${cutOffScore}) not reached. Your score: ${totalScore}`,
    cutOffScore,
    totalScore
  };
}

/**
 * TOPIK I Result Calculation (LEVEL_RANGE)
 * - Determine level based on score range
 */
function calculateTOPIKResult(config, totalScore) {
  const ranges = config.ranges || [
    { min: 0, max: 79, level: 'No Level', passed: false },
    { min: 80, max: 139, level: 'Level 1', passed: true },
    { min: 140, max: 200, level: 'Level 2', passed: true }
  ];
  
  let matchedLevel = null;
  let passed = false;
  
  for (const range of ranges) {
    if (totalScore >= range.min && totalScore <= range.max) {
      matchedLevel = range.level;
      passed = range.passed || false;
      break;
    }
  }
  
  // If score is above all ranges, default to last range
  if (!matchedLevel && ranges.length > 0) {
    const lastRange = ranges[ranges.length - 1];
    if (totalScore > lastRange.max) {
      matchedLevel = lastRange.level;
      passed = lastRange.passed || false;
    }
  }
  
  return {
    passed,
    level: matchedLevel || 'No Level',
    reason: passed ? null : `Score (${totalScore}) does not meet any level requirement`,
    totalScore,
    ranges
  };
}

/**
 * Default Fallback Calculation (Simple percentage)
 */
function calculateDefaultResult(config, totalScore) {
  const passingScore = config.passingScore || 65;
  const passed = totalScore >= passingScore;
  
  return {
    passed,
    reason: passed ? null : `Score (${totalScore}) is below the passing mark (${passingScore})`,
    passingScore,
    totalScore
  };
}

// ─── SUBMIT EXAM ──────────────────────────────────────────────────────
const submitExam = async (attemptId, answers, flagged, autoSubmitted, studentId) => {
  const attemptRef = db.collection('student_exams').doc(attemptId);
  const attemptSnapshot = await attemptRef.get();

  if (!attemptSnapshot.exists) throw new Error('Target validation reference broken.');

  const attemptData = attemptSnapshot.data();
  if (attemptData.status === 'completed') return { attemptId, ...attemptData };

  // Get gradable items (real questions only)
  const gradableItems = await getGradableItems(attemptData.examId);

  // ─── Calculate Section Scores ──────────────────────────────────────
  let totalCorrect = 0;
  let totalAnswered = 0;
  const sectionScores = {};
  const sectionTotals = {};
  const questionResults = [];
  const studentAnswers = [];

  const startTime = new Date(attemptData.startTime);
  const endTime = new Date();
  const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);

  // Process each question
  gradableItems.forEach(item => {
    const itemId = itemKey(item);
    const sec = item.section || 'General';
    
    // Initialize section tracking
    if (!sectionScores[sec]) {
      sectionScores[sec] = 0;
      sectionTotals[sec] = 0;
    }
    sectionTotals[sec] += 1;

    const userAnswerIndex = answers && answers[itemId] !== undefined ? answers[itemId] : null;
    const correctOptionIndex = Number(item._correct);
    const isCorrect = userAnswerIndex !== null && Number(userAnswerIndex) === correctOptionIndex;

    if (isCorrect) {
      totalCorrect += 1;
      sectionScores[sec] += 1;
    }
    
    if (userAnswerIndex !== null) {
      totalAnswered += 1;
    }

    const userAnswerText = userAnswerIndex !== null && item.options[userAnswerIndex] 
      ? item.options[userAnswerIndex] 
      : null;
    const correctAnswerText = item.options[correctOptionIndex] || 'N/A';

    studentAnswers.push({
      question_id: item.id,
      parent_problem_id: item.questionDocId,
      section: sec,
      selected_index: userAnswerIndex !== null ? Number(userAnswerIndex) : null,
      is_correct: isCorrect,
      is_answered: userAnswerIndex !== null,
    });

    questionResults.push({
      itemId: item.id,
      parentProblemId: item.questionDocId,
      section: sec,
      problemTitle: item.problem_title || null,
      text: item.text,
      options: item.options,
      userAnswer: userAnswerText || 'Not Answered',
      userAnswerIndex: userAnswerIndex,
      correct: correctAnswerText,
      correctIndex: correctOptionIndex,
      isCorrect: isCorrect,
      isAnswered: userAnswerIndex !== null,
      explanation: item._explanation || '',
    });
  });

  const totalRealQuestions = gradableItems.length;
  const percentage = totalRealQuestions > 0 ? Math.round((totalCorrect / totalRealQuestions) * 100) : 0;

  // ─── Format Section Scores for Result Engine ───────────────────────
  const formattedSectionScores = {};
  Object.keys(sectionScores).forEach(section => {
    formattedSectionScores[section] = Math.round((sectionScores[section] / sectionTotals[section]) * 100);
  });

  // ─── Get Passing Configuration from Category/Level ─────────────────
  let passingType = 'TOTAL_AND_SECTION'; // Default
  let passingConfig = { overallPassScore: 65, sections: [] };
  let passingSource = 'default';

  try {
    const examDoc = await db.collection('exams').doc(attemptData.examId).get();
    if (examDoc.exists) {
      const examData = examDoc.data();
      const categoryId = examData.category_id;
      const levelId = examData.level_id;

      if (categoryId) {
        // Get category document
        const categoryRef = db.collection('exam_categories').doc(categoryId);
        const categoryDoc = await categoryRef.get();
        
        if (categoryDoc.exists) {
          const categoryData = categoryDoc.data();
          
          // Check if level has specific configuration
          if (levelId) {
            const levelRef = db.collection('exam_categories')
              .doc(categoryId)
              .collection('levels')
              .doc(levelId);
            
            const levelDoc = await levelRef.get();
            if (levelDoc.exists) {
              const levelData = levelDoc.data();
              // Level overrides category
              if (levelData.passingType) {
                passingType = levelData.passingType;
                passingConfig = levelData.passingConfig || {};
                passingSource = 'level';
                console.log(`✅ Using level passing configuration: ${passingType}`);
              } else if (categoryData.passingType) {
                passingType = categoryData.passingType;
                passingConfig = categoryData.passingConfig || {};
                passingSource = 'category';
                console.log(`✅ Using category passing configuration: ${passingType}`);
              }
            } else if (categoryData.passingType) {
              passingType = categoryData.passingType;
              passingConfig = categoryData.passingConfig || {};
              passingSource = 'category';
              console.log(`✅ Using category passing configuration: ${passingType}`);
            }
          } else if (categoryData.passingType) {
            passingType = categoryData.passingType;
            passingConfig = categoryData.passingConfig || {};
            passingSource = 'category';
            console.log(`✅ Using category passing configuration: ${passingType}`);
          }
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not fetch passing configuration, using default:', err.message);
  }

  // ─── Calculate Result using Result Engine ──────────────────────────
  const result = calculateResult(
    passingType,
    passingConfig,
    percentage, // Total score as percentage
    formattedSectionScores // Section scores as percentages
  );

  console.log(`📊 Result: ${result.passed ? 'PASS' : 'FAIL'}`);
  console.log(`📊 Passing Type: ${passingType}`);
  console.log(`📊 Total Score: ${percentage}%`);

  // ─── Prepare Final Section Data ────────────────────────────────────
  const sectionData = Object.keys(sectionScores).map(section => ({
    section,
    score: sectionScores[section],
    total: sectionTotals[section],
    pct: Math.round((sectionScores[section] / sectionTotals[section]) * 100),
    passed: result.sectionResults ? 
      result.sectionResults.find(r => r.name === section)?.passed ?? true : 
      true
  }));

  const finalStudentId = studentId || attemptData.studentId || 'unknown';

  // ─── Update student_exams ──────────────────────────────────────────
  const updateData = {
    status: 'completed',
    endTime: endTime.toISOString(),
    answers: answers || {},
    flagged: flagged || [],
    score: totalCorrect,
    totalQuestions: totalRealQuestions,
    answeredQuestions: totalAnswered,
    percentage: percentage,
    passed: result.passed,
    passingType: passingType,
    passingConfig: passingConfig,
    passingSource: passingSource,
    sectionScores: sectionData,
    questionResults,
    autoSubmitted: !!autoSubmitted,
    timeTakenSeconds,
    completedAt: endTime.toISOString(),
    // JLPT specific
    totalPassed: result.totalPassed,
    allSectionsPassed: result.allSectionsPassed,
    overallPass: result.overallPass,
    // EPS-TOPIK specific
    cutOffScore: result.cutOffScore,
    // TOPIK specific
    achievedLevel: result.level,
    failReason: result.reason,
  };

  await attemptRef.update(updateData);

  // ─── Save to submissions collection ────────────────────────────────
  const submissionPayload = {
    attempt_id: attemptId,
    student_id: finalStudentId,
    exam_id: attemptData.examId,
    title: attemptData.title || 'Language Examination',
    category_id: attemptData.category_id || 'jlpt',
    level_id: attemptData.level_id || 'N5',
    tutor_id: attemptData.tutor_id || null,
    tutor_name: attemptData.tutor_name || 'Expert Tutor',
    score: totalCorrect,
    total_questions: totalRealQuestions,
    answered_questions: totalAnswered,
    percentage: percentage,
    passed: result.passed,
    passingType: passingType,
    passingConfig: passingConfig,
    passingSource: passingSource,
    section_scores: sectionData,
    // JLPT specific
    overallPass: result.overallPass,
    allSectionsPassed: result.allSectionsPassed,
    sectionResults: result.sectionResults || [],
    // EPS-TOPIK specific
    cutOffScore: result.cutOffScore,
    // TOPIK specific
    achievedLevel: result.level,
    failReason: result.reason,
    time_taken_seconds: timeTakenSeconds,
    student_answers: studentAnswers,
    submitted_at: endTime.toISOString(),
    auto_submitted: !!autoSubmitted,
    status: 'completed',
  };

  const submissionId = await saveSubmission(submissionPayload);

  // ─── Return Complete Result ────────────────────────────────────────
  return {
    attemptId,
    submissionId,
    ...attemptData,
    ...updateData,
    timeTakenSeconds,
    passed: result.passed,
    percentage,
    passingType,
    passingConfig,
    passingSource,
    totalPassed: result.totalPassed,
    allSectionsPassed: result.allSectionsPassed,
    overallPass: result.overallPass,
    cutOffScore: result.cutOffScore,
    achievedLevel: result.level,
    failReason: result.reason,
    sectionResults: result.sectionResults || [],
    score: totalCorrect,
    totalQuestions: totalRealQuestions,
    sectionScores: sectionData,
  };
};

// ─── GET RESULTS ──────────────────────────────────────────────────────
const getResults = async (attemptId) => {
  const doc = await db.collection('student_exams').doc(attemptId).get();
  if (!doc.exists) throw new Error('Attempt results report not found');
  
  const data = doc.data();
  
  const submissionSnapshot = await db.collection('submissions')
    .where('attempt_id', '==', attemptId)
    .get();
  
  let submissionId = null;
  if (!submissionSnapshot.empty) {
    submissionId = submissionSnapshot.docs[0].id;
  }
  
  return {
    ...data,
    submissionId,
    examTitle: data.title || 'Language Examination',
  };
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