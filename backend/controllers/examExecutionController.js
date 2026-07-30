// backend/controllers/examExecutionController.js
const examExecutionService = require('../services/examExecutionService');

// ✅ ADD: Audit Log Service
const auditLogService = require('../services/auditLogService');

// ✅ Helper for non-blocking audit logging
const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

// ================================================================
// ✅ STEP 1: CHECK ACTIVE ATTEMPT (NEW)
// ================================================================
/**
 * 🔍 Check if student has an active attempt - WITH AUDIT LOG
 * GET /api/exam-execution/:examId/check-active
 */
const checkActiveAttempt = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.id || req.user?.uid;

    if (!studentId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    console.log(`🔍 Checking active attempt for student: ${studentId}, exam: ${examId}`);

    const db = require('../config/firebase').db;

    // Find active attempts
    const snapshot = await db.collection('student_exams')
      .where('studentId', '==', studentId)
      .where('examId', '==', examId)
      .where('status', '==', 'active')
      .get();

    if (snapshot.empty) {
      console.log('✅ No active attempt found');
      return res.status(200).json({
        success: true,
        hasActiveAttempt: false,
        data: null
      });
    }

    // Get the most recent active attempt
    const docs = snapshot.docs.sort((a, b) => {
      return new Date(b.data().startTime) - new Date(a.data().startTime);
    });

    const doc = docs[0];
    const attemptData = doc.data();
    const attemptId = doc.id;

    console.log(`✅ Active attempt found: ${attemptId}`);

    // Check if time is still remaining
    const durationMinutes = attemptData.duration_minutes || 60;
    const startTime = new Date(attemptData.startTime);
    const elapsedSeconds = (Date.now() - startTime.getTime()) / 1000;
    const totalSeconds = durationMinutes * 60;

    console.log(`⏱️ Elapsed: ${elapsedSeconds}s, Total: ${totalSeconds}s`);

    if (elapsedSeconds > totalSeconds) {
      console.log('⏰ Time expired - auto submitting');
      // Time's up - auto submit
      await db.collection('student_exams').doc(attemptId).update({
        status: 'completed',
        autoSubmitted: true,
        endTime: new Date().toISOString()
      });
      
      return res.status(200).json({
        success: true,
        hasActiveAttempt: false,
        data: null,
        timeExpired: true
      });
    }

    // Return active attempt with remaining time
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    console.log(`⏱️ Remaining: ${remainingSeconds}s`);

    // ✅ EXAM ATTEMPT AUDIT LOG - RESUMED
    logAudit(auditLogService.logExamAttempt, {
      studentId: studentId,
      studentEmail: req.user?.email || 'unknown',
      examId: examId,
      examTitle: attemptData.title || 'Exam',
      attemptId: attemptId,
      action: 'resumed',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({
      success: true,
      hasActiveAttempt: true,
      data: {
        attemptId,
        answers: attemptData.answers || {},
        partIndex: attemptData.partIndex || 0,
        qIndex: attemptData.qIndex || 0,
        timeLeft: attemptData.timeLeft || remainingSeconds,
        remainingSeconds,
        elapsedSeconds,
        totalSeconds,
        startTime: attemptData.startTime,
        duration_minutes: durationMinutes,
        title: attemptData.title,
        category_id: attemptData.category_id,
        level_id: attemptData.level_id,
        tutor_id: attemptData.tutor_id,
        tutor_name: attemptData.tutor_name,
        totalQuestions: attemptData.totalQuestions || 0,
        ...attemptData
      }
    });

  } catch (error) {
    console.error('❌ Check active attempt error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check active attempt',
      error: error.message
    });
  }
};

// ================================================================
// ✅ STEP 2: SAVE PROGRESS (NEW)
// ================================================================
/**
 * 💾 Save exam progress - WITH AUDIT LOG
 * PUT /api/exam-execution/:attemptId/save
 */
const saveProgress = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, partIndex, qIndex, timeLeft } = req.body;
    const studentId = req.user?.id || req.user?.uid;

    if (!studentId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    const db = require('../config/firebase').db;
    const attemptRef = db.collection('student_exams').doc(attemptId);
    const attemptDoc = await attemptRef.get();

    if (!attemptDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Attempt not found' 
      });
    }

    const attemptData = attemptDoc.data();
    if (attemptData.studentId !== studentId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    // Only save if status is still active
    if (attemptData.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: 'Exam already submitted' 
      });
    }

    await attemptRef.update({
      answers: answers || {},
      partIndex: partIndex || 0,
      qIndex: qIndex || 0,
      timeLeft: timeLeft || 0,
      lastSavedAt: new Date().toISOString()
    });

    console.log(`✅ Progress saved for attempt: ${attemptId}`);

    // ✅ EXAM ATTEMPT AUDIT LOG - PROGRESS SAVED (only log occasionally)
    // Only log every 5th save to avoid spam
    const saveCount = (attemptData._saveCount || 0) + 1;
    await attemptRef.update({
      _saveCount: saveCount
    });

    if (saveCount % 5 === 0) {
      logAudit(auditLogService.logExamAttempt, {
        studentId: studentId,
        studentEmail: req.user?.email || 'unknown',
        examId: attemptData.examId || 'unknown',
        examTitle: attemptData.title || 'Exam',
        attemptId: attemptId,
        action: 'progress_saved',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Progress saved',
      savedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Save progress error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save progress',
      error: error.message
    });
  }
};

// ================================================================
// ✅ STEP 3: MODIFIED START EXAM (with resume support)
// ================================================================
/**
 * 📝 Start a new exam attempt session matrix - WITH AUDIT LOG
 * POST /api/exam-execution/:examId/start
 */
const start = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.id || req.user?.uid;
    
    if (!studentId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    console.log(`🚀 Starting exam for student: ${studentId}, exam: ${examId}`);

    const db = require('../config/firebase').db;

    // ✅ FIRST: Check if there's an active attempt
    const activeSnapshot = await db.collection('student_exams')
      .where('studentId', '==', studentId)
      .where('examId', '==', examId)
      .where('status', '==', 'active')
      .get();

    if (!activeSnapshot.empty) {
      const docs = activeSnapshot.docs.sort((a, b) => {
        return new Date(b.data().startTime) - new Date(a.data().startTime);
      });
      const doc = docs[0];
      const attemptData = doc.data();
      const attemptId = doc.id;

      console.log(`🔄 Found active attempt: ${attemptId}`);

      // Check if time expired
      const durationMinutes = attemptData.duration_minutes || 60;
      const startTime = new Date(attemptData.startTime);
      const elapsedSeconds = (Date.now() - startTime.getTime()) / 1000;
      const totalSeconds = durationMinutes * 60;

      if (elapsedSeconds > totalSeconds) {
        console.log('⏰ Time expired - auto submitting');
        await db.collection('student_exams').doc(attemptId).update({
          status: 'completed',
          autoSubmitted: true,
          endTime: new Date().toISOString()
        });
        // ✅ Continue to create new attempt (will fall through)
        console.log('📝 Creating new attempt after auto-submit');
      } else {
        // ✅ Resume existing attempt
        const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
        
        console.log(`✅ Returning existing attempt with ${remainingSeconds}s remaining`);
        
        // ✅ EXAM ATTEMPT AUDIT LOG - RESUMED
        logAudit(auditLogService.logExamAttempt, {
          studentId: studentId,
          studentEmail: req.user?.email || 'unknown',
          examId: examId,
          examTitle: attemptData.title || 'Exam',
          attemptId: attemptId,
          action: 'resumed',
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        return res.status(200).json({
          success: true,
          data: {
            attemptId,
            ...attemptData,
            isResumed: true,
            remainingSeconds,
            elapsedSeconds,
            totalSeconds,
            timeLeft: remainingSeconds
          }
        });
      }
    }

    // No active attempt or time expired - create new
    console.log('📝 Creating new attempt');
    
    const attempt = await examExecutionService.startExam(examId, studentId);

    // ✅ EXAM ATTEMPT AUDIT LOG - STARTED
    logAudit(auditLogService.logExamAttempt, {
      studentId: studentId,
      studentEmail: req.user?.email || 'unknown',
      examId: examId,
      examTitle: attempt.title || 'Exam',
      attemptId: attempt.attemptId,
      action: 'started',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    console.error('Start exam execution error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 📄 Get exam core blueprints metadata duration info (NO AUDIT - READ ONLY)
 * GET /api/exam-execution/:examId/metadata
 */
const metadata = async (req, res) => {
  try {
    const { examId } = req.params;
    const data = await examExecutionService.getExamMetadata(examId);
    return res.status(200).json({ success: true, data: data });
  } catch (error) {
    console.error('Get execution metadata error:', error.message);
    const status = error.message === 'Exam not found' ? 404 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * 🔒 Fetch Secure Questions Stream (NO AUDIT - READ ONLY)
 * GET /api/exam-execution/:examId/questions
 */
const questions = async (req, res) => {
  try {
    const { examId } = req.params;
    const data = await examExecutionService.getSecureQuestions(examId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get execution questions error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 🛡️ Log Anti-Cheat Switch Tab Violations Metrics - WITH AUDIT LOG
 * POST /api/exam-execution/:attemptId/violation
 */
const violation = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user?.id || req.user?.uid;
    
    const data = await examExecutionService.logViolation(attemptId);

    // ✅ EXAM ATTEMPT AUDIT LOG - VIOLATION
    logAudit(auditLogService.logExamAttempt, {
      studentId: studentId,
      studentEmail: req.user?.email || 'unknown',
      examId: data.examId || 'unknown',
      examTitle: data.examTitle || 'Exam',
      attemptId: attemptId,
      action: 'violation',
      violationType: 'tab_switch',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Log runtime violation error:', error.message);
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * 📊 Get live attempt session clock status (NO AUDIT - READ ONLY)
 * GET /api/exam-execution/:attemptId/status
 */
const status = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const data = await examExecutionService.getAttemptStatus(attemptId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get dynamic execution status error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 📤 Final Submit Exam Vectors Evaluation Engine - WITH AUDIT LOG
 * POST /api/exam-execution/:attemptId/submit
 */
const submit = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, flagged, autoSubmitted } = req.body;
    const studentId = req.user?.id || req.user?.uid;
    
    const result = await examExecutionService.submitExam(attemptId, answers, flagged, autoSubmitted, studentId);

    // ✅ EXAM ATTEMPT AUDIT LOG - SUBMITTED
    logAudit(auditLogService.logExamAttempt, {
      studentId: studentId,
      studentEmail: req.user?.email || 'unknown',
      examId: result.examId || 'unknown',
      examTitle: result.title || 'Exam',
      attemptId: attemptId,
      action: 'submitted',
      score: result.percentage || result.score || 0,
      questions: result.totalQuestions || 0,
      correct: result.score || 0,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Submit exam execution error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 📊 Fetch analytical evaluation report matrix (NO AUDIT - READ ONLY)
 * GET /api/exam-execution/:attemptId/results
 */
const results = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const data = await examExecutionService.getResults(attemptId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get evaluation results report error:', error.message);
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * 💬 Submit student feedback with ratings - WITH AUDIT LOG
 * POST /api/exam-execution/:attemptId/feedback
 */
const submitFeedback = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { 
      rating, 
      difficulty, 
      nps, 
      challenging, 
      topicsToReview, 
      comments, 
      wantsFollowUp,
      wouldRecommend,
      timeSpent,
      examId: frontendExamId,
      examTitle: frontendExamTitle,
      tutorId: frontendTutorId,
      tutorName: frontendTutorName,
      percentage: frontendPercentage,
      passed: frontendPassed
    } = req.body;
    
    const studentId = req.user?.id || req.user?.uid;
    
    if (!studentId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const db = require('../config/firebase').db;

    // ✅ Get student details from users collection
    let studentName = 'Anonymous';
    let studentAvatar = null;
    
    try {
      const userDoc = await db.collection('users').doc(studentId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        studentName = userData.name || userData.displayName || 'Anonymous';
        studentAvatar = userData.avatar || userData.profilePic || userData.profilePicUrl || null;
        console.log(`👤 Student found: ${studentName}`);
      } else {
        console.warn(`⚠️ User document not found for studentId: ${studentId}`);
      }
    } catch (userError) {
      console.warn('⚠️ Could not fetch user details:', userError.message);
    }

    // ✅ Get attempt details
    const attemptDoc = await db
      .collection('student_exams')
      .doc(attemptId)
      .get();
    
    let examId = frontendExamId || null;
    let examTitle = frontendExamTitle || 'Language Examination';
    let percentage = frontendPercentage || 0;
    let passed = frontendPassed || false;
    let tutorId = frontendTutorId || null;
    let tutorName = frontendTutorName || 'Expert Tutor';
    
    if (attemptDoc.exists) {
      const attemptData = attemptDoc.data();
      examId = examId || attemptData.examId;
      examTitle = examTitle || attemptData.title || 'Language Examination';
      percentage = percentage || attemptData.percentage || 0;
      passed = passed || attemptData.passed || false;
      tutorId = tutorId || attemptData.tutor_id || null;
      tutorName = tutorName || attemptData.tutor_name || 'Expert Tutor';
    }

    // ✅ LOG: Check what we're saving
    console.log('📝 Saving feedback with:', {
      attemptId,
      studentId,
      studentName,
      studentAvatar,
      examId,
      examTitle,
      tutorId,
      tutorName,
      rating,
      difficulty,
      nps,
      comments: comments ? comments.substring(0, 50) : 'No comments'
    });

    // ✅ Ensure tutorId is never null
    const finalTutorId = tutorId || 'unknown_tutor';
    const finalTutorName = tutorName || 'Expert Tutor';

    const feedbackData = {
      attemptId,
      studentId,
      studentName: studentName || 'Anonymous',
      studentAvatar: studentAvatar || null,
      examId: examId || 'unknown_exam',
      examTitle: examTitle || 'Language Examination',
      tutorId: finalTutorId,
      tutorName: finalTutorName,
      percentage: percentage || 0,
      passed: passed || false,
      rating: Number(rating),
      difficulty: difficulty || null,
      nps: nps || null,
      challenging: challenging || false,
      topicsToReview: topicsToReview || [],
      comments: comments || '',
      wantsFollowUp: wantsFollowUp || false,
      wouldRecommend: wouldRecommend || null,
      timeSpent: timeSpent || null,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // ✅ Save feedback to Firestore
    const feedbackRef = db.collection('exam_feedback').doc();
    await feedbackRef.set(feedbackData);
    
    console.log(`✅ Feedback saved with ID: ${feedbackRef.id}`);

    // ✅ Update exam aggregated ratings (with error handling)
    try {
      if (examId && examId !== 'unknown_exam') {
        await examExecutionService.updateExamAggregatedRatings(
          examId, 
          rating, 
          difficulty, 
          nps, 
          wouldRecommend
        );
        console.log('✅ Exam ratings updated');
      } else {
        console.warn('⚠️ Skipping exam ratings update - no valid examId');
      }
    } catch (updateError) {
      console.warn('⚠️ Could not update exam ratings:', updateError.message);
    }

    // ✅ Update tutor aggregated ratings (with error handling)
    if (finalTutorId && finalTutorId !== 'unknown_tutor') {
      try {
        await examExecutionService.updateTutorAggregatedRatings(finalTutorId, rating, difficulty);
        console.log('✅ Tutor ratings updated');
      } catch (updateError) {
        console.warn('⚠️ Could not update tutor ratings:', updateError.message);
      }
    }

    // ✅ Update submission record with feedback
    try {
      const submissionSnapshot = await db.collection('submissions')
        .where('attempt_id', '==', attemptId)
        .get();
      
      if (!submissionSnapshot.empty) {
        const submissionDoc = submissionSnapshot.docs[0];
        await submissionDoc.ref.update({
          feedbackId: feedbackRef.id,
          feedbackSubmitted: true,
          feedbackRating: rating,
          feedbackUpdatedAt: new Date().toISOString()
        });
        console.log('✅ Submission record updated with feedback');
      }
    } catch (subError) {
      console.warn('⚠️ Could not update submission:', subError.message);
    }

    // ✅ EXAM ATTEMPT AUDIT LOG - FEEDBACK SUBMITTED
    logAudit(auditLogService.logExamAttempt, {
      studentId: studentId,
      studentEmail: req.user?.email || 'unknown',
      examId: examId || 'unknown',
      examTitle: examTitle || 'Exam',
      attemptId: attemptId,
      action: 'feedback_submitted',
      score: percentage || 0,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(201).json({ 
      success: true, 
      data: { 
        id: feedbackRef.id, 
        ...feedbackData 
      } 
    });
  } catch (error) {
    console.error('❌ Submit feedback error:', error);
    console.error('❌ Stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to submit feedback' 
    });
  }
};

/**
 * 📜 Get student submission history (NO AUDIT - READ ONLY)
 * GET /api/exam-execution/submissions/student/:studentId
 */
const getSubmissions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examId } = req.query;
    const data = await examExecutionService.getStudentSubmissions(studentId, examId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get submissions error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 📊 Get feedback for a specific attempt (NO AUDIT - READ ONLY)
 * GET /api/exam-execution/:attemptId/feedback
 */
const getFeedback = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const db = require('../config/firebase').db;
    
    const feedbackSnapshot = await db.collection('exam_feedback')
      .where('attemptId', '==', attemptId)
      .get();
    
    if (feedbackSnapshot.empty) {
      return res.status(200).json({ success: true, data: null });
    }
    
    const feedbackDoc = feedbackSnapshot.docs[0];
    return res.status(200).json({ 
      success: true, 
      data: { id: feedbackDoc.id, ...feedbackDoc.data() } 
    });
  } catch (error) {
    console.error('Get feedback error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================================================================
// ✅ EXPORTS
// ================================================================
module.exports = {
  // ✅ NEW: Resume system functions
  checkActiveAttempt,
  saveProgress,
  
  // ✅ Existing functions
  start,
  metadata,
  questions,
  violation,
  status,
  submit,
  results,
  submitFeedback,
  getSubmissions,
  getFeedback,
};