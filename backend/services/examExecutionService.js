// backend/services/examExecutionService.js
const { db } = require('../config/firebase');

// ── CBT System Configurations ───────────────────────────────────────────
const MAX_TAB_VIOLATIONS = 3;
const VIOLATION_LOCK_MINUTES = 30;

/**
 * 🧩 Get example question from a problem's example_question subcollection
 */
async function getExampleQuestion(problemRef) {
  try {
    const exampleDoc = await problemRef.collection('example_question').doc('example').get();
    if (exampleDoc.exists) {
      const data = exampleDoc.data();
      return {
        id: `${problemRef.id}__example`,
        questionDocId: problemRef.id,
        isExample: true,
        text: data.text || '',
        options: data.options || [],
        image_url: data.image_url || null,
        audio_url: data.audio_url || null,
        _correct: data.correct_answer_index !== undefined ? data.correct_answer_index : 0,
        _explanation: data.explanation || '',
        problem_number: null,
        problem_title: null,
        section: null,
      };
    }
    return null;
  } catch (error) {
    console.log(`No example_question found for ${problemRef.path}`);
    return null;
  }
}

/**
 * 🧩 Get all sub-questions from a problem's sub_questions subcollection
 */
async function getSubQuestions(problemRef) {
  try {
    const subQuestionsSnapshot = await problemRef.collection('sub_questions')
      .orderBy('sub_number')
      .get();
    
    const subQuestions = [];
    subQuestionsSnapshot.forEach(doc => {
      const data = doc.data();
      subQuestions.push({
        id: doc.id,
        questionDocId: problemRef.id,
        isExample: false,
        text: data.text || '',
        options: data.options || [],
        image_url: data.image_url || null,
        audio_url: data.audio_url || null,
        _correct: data.correct_answer_index !== undefined ? data.correct_answer_index : 0,
        _explanation: data.explanation || '',
        sub_number: data.sub_number || 0,
        problem_number: null,
        problem_title: null,
        section: null,
      });
    });
    return subQuestions;
  } catch (error) {
    console.log(`No sub_questions sub-collection found for ${problemRef.path}`);
    return [];
  }
}

/**
 * 🧩 Get problem metadata from problem document
 */
async function getProblemMetadata(problemDoc) {
  const data = problemDoc.data();
  return {
    problem_number: data.problem_number || null,
    problem_title: data.problem_title || null,
    section: data.section || 'General',
    explanation: data.explanation || '',
    problem_image_url: data.problem_image_url || null,
  };
}

/**
 * 🧩 Get ALL items (including examples) for display purposes
 */
async function getAllItemsForDisplay(problemDoc) {
  const metadata = await getProblemMetadata(problemDoc);
  const items = [];

  const example = await getExampleQuestion(problemDoc.ref);
  if (example) {
    items.push({
      ...example,
      problem_number: metadata.problem_number,
      problem_title: metadata.problem_title,
      section: metadata.section,
    });
  }

  const subQuestions = await getSubQuestions(problemDoc.ref);
  subQuestions.forEach(sq => {
    items.push({
      ...sq,
      problem_number: metadata.problem_number,
      problem_title: metadata.problem_title,
      section: metadata.section,
    });
  });

  return items;
}

/**
 * 🧩 Get ONLY gradable items (real questions only, no examples)
 */
async function getGradableItems(problemDoc) {
  const metadata = await getProblemMetadata(problemDoc);
  const subQuestions = await getSubQuestions(problemDoc.ref);
  
  return subQuestions.map(sq => ({
    ...sq,
    problem_number: metadata.problem_number,
    problem_title: metadata.problem_title,
    section: metadata.section,
  }));
}

/**
 * 🧩 Build a globally-unique key for an exam item.
 */
function itemKey(item) {
  return `${item.questionDocId}::${item.id}`;
}

// ─── GET EXAM METADATA ──────────────────────────────────────────────────
const getExamMetadata = async (examId) => {
  const doc = await db.collection('exams').doc(examId).get();
  if (!doc.exists) throw new Error('Exam not found');
  return { id: doc.id, ...doc.data() };
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

// ─── GET GRADABLE ITEMS (for scoring) ──────────────────────────────────
const getGradableItemsForExam = async (examId) => {
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
      const items = await getGradableItems(doc);
      allItems = allItems.concat(items);
    }

    console.log(`📚 Found ${allItems.length} gradable items (real questions only)`);
    return allItems;
  } catch (error) {
    console.error('Error fetching gradable items:', error);
    return [];
  }
};

// ─── START EXAM ──────────────────────────────────────────────────────
const startExam = async (examId, studentId) => {
  const examRef = db.collection('exams').doc(examId);
  const examDoc = await examRef.get();

  if (!examDoc.exists) throw new Error('Exam node not deployed inside Firestore.');

  const examData = examDoc.data();

  const gradableItems = await getGradableItemsForExam(examId);
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

// ─── ✅ UPDATE PURCHASED_EXAMS AFTER ATTEMPT ───────────────────────────
const updatePurchasedExamAfterAttempt = async ({ studentId, examId, percentage, completedAt, attemptId }) => {
  try {
    const purchasedRef = db.collection('purchased_exams');

    const compositeId = `${studentId}_${examId}`;
    let targetDocRef = purchasedRef.doc(compositeId);
    let targetDoc = await targetDocRef.get();

    if (!targetDoc.exists) {
      const camelSnap = await purchasedRef
        .where('studentId', '==', studentId)
        .where('examId', '==', examId)
        .limit(1)
        .get();

      if (!camelSnap.empty) {
        targetDocRef = camelSnap.docs[0].ref;
        targetDoc = camelSnap.docs[0];
      }
    }

    if (!targetDoc.exists) {
      const snakeSnap = await purchasedRef
        .where('student_id', '==', studentId)
        .where('exam_id', '==', examId)
        .limit(1)
        .get();

      if (!snakeSnap.empty) {
        targetDocRef = snakeSnap.docs[0].ref;
        targetDoc = snakeSnap.docs[0];
      }
    }

    if (!targetDoc.exists) {
      console.warn(`⚠️ No purchased_exams record found for student=${studentId} exam=${examId}. Skipping attempts/score sync.`);
      return;
    }

    const currentData = targetDoc.data() || {};
    const currentAttempts = currentData.attempts_count ?? currentData.attempts ?? 0;
    const newAttempts = currentAttempts + 1;

    await targetDocRef.update({
      attempts: newAttempts,
      attempts_count: newAttempts,
      lastScore: percentage,
      last_score: percentage,
      percentage: percentage,
      lastAttemptAt: completedAt,
      lastAttemptId: attemptId,
      last_attempt_id: attemptId,
      status: 'completed',
      is_completed: true,
    });

    console.log(`✅ purchased_exams synced for student=${studentId} exam=${examId} → attempts=${newAttempts}, lastScore=${percentage}%`);
  } catch (error) {
    console.error('⚠️ Failed to sync purchased_exams record after attempt:', error);
  }
};

// ─── ✅ UPDATE EXAM AGGREGATED RATINGS ──────────────────────────────────
const updateExamAggregatedRatings = async (examId, rating, difficulty, nps, wouldRecommend) => {
  if (!examId) return;
  
  try {
    const examRef = db.collection('exams').doc(examId);
    const examDoc = await examRef.get();
    
    if (!examDoc.exists) return;
    
    const examData = examDoc.data();
    const currentReviews = examData.reviews || 0;
    const currentRating = examData.rating || 0;
    const currentDifficultySum = examData.difficulty_sum || 0;
    const currentNpsSum = examData.nps_sum || 0;
    const currentRecommendSum = examData.recommend_sum || 0;
    const currentRecommendCount = examData.recommend_count || 0;
    
    const newReviews = currentReviews + 1;
    const newRating = ((currentRating * currentReviews) + rating) / newReviews;
    
    const difficultyMap = { 'Very Easy': 1, 'Easy': 2, 'Moderate': 3, 'Hard': 4, 'Very Hard': 5 };
    const difficultyValue = difficultyMap[difficulty] || 0;
    
    const newDifficultySum = currentDifficultySum + difficultyValue;
    const avgDifficulty = difficultyValue > 0 ? newDifficultySum / newReviews : null;
    
    const newNpsSum = currentNpsSum + (nps || 0);
    const avgNps = nps !== null ? newNpsSum / newReviews : null;
    
    const newRecommendSum = currentRecommendSum + (wouldRecommend === true ? 1 : 0);
    const newRecommendCount = currentRecommendCount + (wouldRecommend !== null ? 1 : 0);
    const recommendRate = newRecommendCount > 0 ? (newRecommendSum / newRecommendCount) * 100 : null;
    
    await examRef.update({
      rating: Math.round(newRating * 10) / 10,
      reviews: newReviews,
      difficulty_avg: avgDifficulty,
      nps_avg: avgNps,
      recommend_rate: recommendRate,
      difficulty_sum: newDifficultySum,
      nps_sum: newNpsSum,
      recommend_sum: newRecommendSum,
      recommend_count: newRecommendCount,
      updated_at: new Date().toISOString()
    });
    
    console.log(`✅ Updated exam ${examId} ratings: ${newRating.toFixed(1)} (${newReviews} reviews)`);
  } catch (error) {
    console.error('Error updating exam aggregated ratings:', error);
  }
};

// ─── ✅ UPDATE TUTOR AGGREGATED RATINGS ──────────────────────────────────
const updateTutorAggregatedRatings = async (tutorId, rating, difficulty) => {
  if (!tutorId) return;
  
  try {
    const tutorRef = db.collection('users').doc(tutorId);
    const tutorDoc = await tutorRef.get();
    
    if (!tutorDoc.exists) return;
    
    const tutorData = tutorDoc.data();
    const currentReviews = tutorData.total_reviews || 0;
    const currentRating = tutorData.average_rating || 0;
    const currentDifficultySum = tutorData.difficulty_sum || 0;
    
    const newReviews = currentReviews + 1;
    const newRating = ((currentRating * currentReviews) + rating) / newReviews;
    
    const difficultyMap = { 'Very Easy': 1, 'Easy': 2, 'Moderate': 3, 'Hard': 4, 'Very Hard': 5 };
    const difficultyValue = difficultyMap[difficulty] || 0;
    const newDifficultySum = currentDifficultySum + difficultyValue;
    const avgDifficulty = difficultyValue > 0 ? newDifficultySum / newReviews : null;
    
    await tutorRef.update({
      average_rating: Math.round(newRating * 10) / 10,
      total_reviews: newReviews,
      difficulty_avg: avgDifficulty,
      difficulty_sum: newDifficultySum,
      updated_at: new Date().toISOString()
    });
    
    console.log(`✅ Updated tutor ${tutorId} rating: ${newRating.toFixed(1)} (${newReviews} reviews)`);
  } catch (error) {
    console.error('Error updating tutor aggregated ratings:', error);
  }
};

// ================================================================
// 🎯 RESULT ENGINE - COMPLETE IMPLEMENTATION
// ================================================================

/**
 * 🧩 MAIN RESULT ENGINE
 * Determines PASS/FAIL based on passingType and passingConfig
 * 
 * @param {string} passingType - 'TOTAL_AND_SECTION' | 'CUT_OFF_SCORE' | 'LEVEL_RANGE'
 * @param {object} passingConfig - Configuration object for the passing type
 * @param {number} totalScore - Overall percentage score (0-100)
 * @param {object} sectionScores - Object with section names as keys and percentages as values
 * @returns {object} Result object with passed, reason, and additional details
 */
function calculateResult(passingType, passingConfig, totalScore, sectionScores) {
  console.log(`🔍 Calculating result with passingType: ${passingType}`);
  console.log(`📊 Total Score: ${totalScore}%`);
  console.log(`📊 Section Scores:`, sectionScores);
  
  switch (passingType) {
    case 'TOTAL_AND_SECTION':
      return calculateJLPTResult(passingConfig, totalScore, sectionScores);
    
    case 'CUT_OFF_SCORE':
      return calculateEPSResult(passingConfig, totalScore);
    
    case 'LEVEL_RANGE':
      return calculateTOPIKResult(passingConfig, totalScore);
    
    default:
      console.warn(`⚠️ Unknown passing type: ${passingType}, using default`);
      return calculateDefaultResult(passingConfig, totalScore);
  }
}

/**
 * 🎯 JLPT Result Calculation (TOTAL_AND_SECTION)
 * 
 * Official JLPT Rules:
 * - Total score must be >= overallPassScore
 * - Each section must be >= its minimumScore
 * - TWO sections only: "Language Knowledge + Reading" and "Listening"
 * - Section scores are calculated as percentages (0-100)
 * 
 * @param {object} config - { overallPassScore, sections: [{ name, minimumScore }] }
 * @param {number} totalScore - Overall percentage (0-100)
 * @param {object} sectionScores - { "Language Knowledge + Reading": 45, "Listening": 50 }
 * @returns {object} { passed, reason, totalPassed, allSectionsPassed, sectionResults, ... }
 */
function calculateJLPTResult(config, totalScore, sectionScores) {
  const overallPass = config?.overallPassScore || 80;
  const sections = config?.sections || [
    { name: 'Language Knowledge + Reading', minimumScore: 38 },
    { name: 'Listening', minimumScore: 19 }
  ];
  
  console.log(`📊 JLPT: Overall Pass = ${overallPass}%`);
  
  // Check total score
  const totalPassed = totalScore >= overallPass;
  console.log(`📊 Total Score: ${totalScore}% ${totalPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Check each section
  let sectionResults = [];
  let allSectionsPassed = true;
  let failedSection = null;
  let failedSectionScore = null;
  let failedSectionRequired = null;
  
  sections.forEach(section => {
    const sectionName = section.name;
    const minScore = section.minimumScore || 0;
    const achievedScore = sectionScores[sectionName] !== undefined ? sectionScores[sectionName] : 0;
    const passed = achievedScore >= minScore;
    
    console.log(`📊 ${sectionName}: ${achievedScore}% (Required: ${minScore}%) ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    sectionResults.push({
      name: sectionName,
      achieved: achievedScore,
      required: minScore,
      passed: passed
    });
    
    if (!passed) {
      allSectionsPassed = false;
      failedSection = sectionName;
      failedSectionScore = achievedScore;
      failedSectionRequired = minScore;
    }
  });
  
  const passed = totalPassed && allSectionsPassed;
  
  // Generate detailed reason
  let reason = null;
  if (!passed) {
    if (!totalPassed) {
      reason = `Overall score (${totalScore}%) is below the required passing mark (${overallPass}%)`;
    } else if (failedSection) {
      reason = `${failedSection} score (${failedSectionScore}%) is below the required minimum (${failedSectionRequired}%)`;
    }
  }
  
  console.log(`📊 ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  if (reason) console.log(`📊 Reason: ${reason}`);
  
  return {
    passed,
    reason,
    totalPassed,
    allSectionsPassed,
    overallPass,
    sectionResults,
    totalScore,
    passingType: 'TOTAL_AND_SECTION'
  };
}

/**
 * 🎯 EPS-TOPIK Result Calculation (CUT_OFF_SCORE)
 * 
 * Official EPS-TOPIK Rules:
 * - Each recruitment round has different cut-off score
 * - Student passes if total score >= cut-off score
 * - No section-wise requirements
 * 
 * @param {object} config - { cutOffScore }
 * @param {number} totalScore - Overall percentage (0-100)
 * @returns {object} { passed, reason, cutOffScore, totalScore }
 */
function calculateEPSResult(config, totalScore) {
  const cutOffScore = config?.cutOffScore || 65;
  
  console.log(`📊 EPS-TOPIK: Cut-off Score = ${cutOffScore}%`);
  console.log(`📊 Your Score: ${totalScore}%`);
  
  const passed = totalScore >= cutOffScore;
  
  const reason = passed ? null : `Current recruitment cut-off score (${cutOffScore}%) not reached. Your score: ${totalScore}%`;
  
  console.log(`📊 ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  if (reason) console.log(`📊 Reason: ${reason}`);
  
  return {
    passed,
    reason,
    cutOffScore,
    totalScore,
    passingType: 'CUT_OFF_SCORE'
  };
}

/**
 * 🎯 TOPIK I Result Calculation (LEVEL_RANGE)
 * 
 * Official TOPIK I Rules:
 * - No section-wise passing marks
 * - Level determined by total score range
 * - Maximum score: 200
 * 
 * @param {object} config - { ranges: [{ min, max, level, passed }] }
 * @param {number} totalScore - Overall percentage (0-100)
 * @returns {object} { passed, level, reason, totalScore, ranges }
 */
function calculateTOPIKResult(config, totalScore) {
  // Default TOPIK I ranges (can be overridden by admin config)
  const defaultRanges = [
    { min: 0, max: 79, level: 'No Level', passed: false },
    { min: 80, max: 139, level: 'TOPIK Level 1', passed: true },
    { min: 140, max: 200, level: 'TOPIK Level 2', passed: true }
  ];
  
  const ranges = config?.ranges || defaultRanges;
  
  console.log(`📊 TOPIK I: Score = ${totalScore}%`);
  
  let matchedLevel = null;
  let passed = false;
  
  for (const range of ranges) {
    if (totalScore >= range.min && totalScore <= range.max) {
      matchedLevel = range.level;
      passed = range.passed || false;
      console.log(`📊 Matched range: ${range.min}-${range.max} → ${range.level} (${range.passed ? 'PASS' : 'FAIL'})`);
      break;
    }
  }
  
  // If score is above all ranges, default to last range
  if (!matchedLevel && ranges.length > 0) {
    const lastRange = ranges[ranges.length - 1];
    if (totalScore > lastRange.max) {
      matchedLevel = lastRange.level;
      passed = lastRange.passed || false;
      console.log(`📊 Score above all ranges → ${lastRange.level} (${lastRange.passed ? 'PASS' : 'FAIL'})`);
    }
  }
  
  const reason = passed ? null : `Score (${totalScore}%) does not meet the minimum requirement for any level`;
  
  console.log(`📊 ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  if (matchedLevel) console.log(`📊 Level: ${matchedLevel}`);
  
  return {
    passed,
    level: matchedLevel || 'No Level',
    reason,
    totalScore,
    ranges,
    passingType: 'LEVEL_RANGE'
  };
}

/**
 * 🎯 Default Fallback Calculation (Simple Percentage)
 * 
 * Used when passingType is not recognized
 */
function calculateDefaultResult(config, totalScore) {
  const passingScore = config?.passingScore || 65;
  
  const passed = totalScore >= passingScore;
  const reason = passed ? null : `Score (${totalScore}%) is below the passing mark (${passingScore}%)`;
  
  console.log(`📊 Default: ${passed ? 'PASSED' : 'FAILED'}`);
  
  return {
    passed,
    reason,
    passingScore,
    totalScore,
    passingType: 'DEFAULT'
  };
}

// ─── SUBMIT EXAM ──────────────────────────────────────────────────────
const submitExam = async (attemptId, answers, flagged, autoSubmitted, studentId) => {
  const attemptRef = db.collection('student_exams').doc(attemptId);
  const attemptSnapshot = await attemptRef.get();

  if (!attemptSnapshot.exists) throw new Error('Target validation reference broken.');

  const attemptData = attemptSnapshot.data();
  if (attemptData.status === 'completed') return { attemptId, ...attemptData };

  const gradableItems = await getGradableItemsForExam(attemptData.examId);

  let totalCorrect = 0;
  let totalAnswered = 0;
  const sectionScores = {};
  const sectionTotals = {};
  const questionResults = [];
  const studentAnswers = [];

  const startTime = new Date(attemptData.startTime);
  const endTime = new Date();
  const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);

  gradableItems.forEach(item => {
    const itemId = itemKey(item);
    const sec = item.section || 'General';
    
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

  // ─── Get Passing Configuration ──────────────────────────────────────
  let passingType = 'TOTAL_AND_SECTION';
  let passingConfig = { overallPassScore: 65, sections: [] };
  let passingSource = 'default';

  try {
    const examDoc = await db.collection('exams').doc(attemptData.examId).get();
    if (examDoc.exists) {
      const examData = examDoc.data();
      const categoryId = examData.category_id;
      const levelId = examData.level_id;

      // ✅ Try to get passing config from level first, then category
      if (categoryId) {
        const categoryRef = db.collection('exam_categories').doc(categoryId);
        const categoryDoc = await categoryRef.get();
        
        if (categoryDoc.exists) {
          const categoryData = categoryDoc.data();
          
          // Level-level config takes priority
          if (levelId) {
            const levelRef = db.collection('exam_categories')
              .doc(categoryId)
              .collection('levels')
              .doc(levelId);
            
            const levelDoc = await levelRef.get();
            if (levelDoc.exists) {
              const levelData = levelDoc.data();
              if (levelData.passing_type && levelData.passing_config) {
                passingType = levelData.passing_type;
                passingConfig = levelData.passing_config;
                passingSource = 'level';
                console.log(`✅ Using level passing configuration: ${passingType}`);
              } else if (categoryData.passing_type && categoryData.passing_config) {
                passingType = categoryData.passing_type;
                passingConfig = categoryData.passing_config;
                passingSource = 'category';
                console.log(`✅ Using category passing configuration: ${passingType}`);
              }
            } else if (categoryData.passing_type && categoryData.passing_config) {
              passingType = categoryData.passing_type;
              passingConfig = categoryData.passing_config;
              passingSource = 'category';
              console.log(`✅ Using category passing configuration: ${passingType}`);
            }
          } else if (categoryData.passing_type && categoryData.passing_config) {
            passingType = categoryData.passing_type;
            passingConfig = categoryData.passing_config;
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
    percentage,
    formattedSectionScores
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
    // ✅ Result Engine specific fields
    totalPassed: result.totalPassed,
    allSectionsPassed: result.allSectionsPassed,
    overallPass: result.overallPass,
    cutOffScore: result.cutOffScore,
    achievedLevel: result.level,
    failReason: result.reason,
    sectionResults: result.sectionResults || [],
    attempts: (attemptData.attempts || 0) + 1,
  };

  await attemptRef.update(updateData);

  await updatePurchasedExamAfterAttempt({
    studentId: finalStudentId,
    examId: attemptData.examId,
    percentage,
    completedAt: endTime.toISOString(),
    attemptId,
  });

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
    overallPass: result.overallPass,
    allSectionsPassed: result.allSectionsPassed,
    sectionResults: result.sectionResults || [],
    cutOffScore: result.cutOffScore,
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
const getResults = async (attemptId, studentId = null) => {
  let doc = await db.collection('student_exams').doc(attemptId).get();

  if (!doc.exists) {
    let query = db.collection('student_exams')
      .where('examId', '==', attemptId)
      .where('status', '==', 'completed');

    if (studentId) {
      query = query.where('studentId', '==', studentId);
    }

    const snapshot = await query.get();

    if (!snapshot.empty) {
      const sorted = snapshot.docs.sort((a, b) => {
        const aTime = new Date(a.data().completedAt || a.data().endTime || 0).getTime();
        const bTime = new Date(b.data().completedAt || b.data().endTime || 0).getTime();
        return bTime - aTime;
      });
      doc = sorted[0];
      attemptId = doc.id;
      console.log(`ℹ️ Resolved results request via examId fallback → attemptId=${attemptId}`);
    }
  }

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
    attemptId,
    submissionId,
    examTitle: data.title || 'Language Examination',
    tutor_id: data.tutor_id || null,
    tutor_name: data.tutor_name || 'Expert Tutor',
  };
};

// ─── GET STUDENT SUBMISSIONS ──────────────────────────────────────────
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
  getGradableItemsForExam,
  logViolation,
  getAttemptStatus,
  submitExam,
  getResults,
  getStudentSubmissions,
};