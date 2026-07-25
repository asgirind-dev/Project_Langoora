const examExecutionService = require('../services/examExecutionService');

/**
 * 📝 Start a new exam attempt session matrix
 * POST /api/exam-execution/:examId/start
 */
const start = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.id || req.user?.uid;
    
    if (!studentId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const attempt = await examExecutionService.startExam(examId, studentId);
    return res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    console.error('Start exam execution error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 📄 Get exam core blueprints metadata duration info
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
 * 🔒 Fetch Secure Questions Stream (Filter out answer indexes)
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
 * 🛡️ Log Anti-Cheat Switch Tab Violations Metrics
 * POST /api/exam-execution/:attemptId/violation
 */
const violation = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const data = await examExecutionService.logViolation(attemptId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Log runtime violation error:', error.message);
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * 📊 Get live attempt session clock status
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
 * 📤 Final Submit Exam Vectors Evaluation Engine
 * POST /api/exam-execution/:attemptId/submit
 */
const submit = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, flagged, autoSubmitted } = req.body;
    const studentId = req.user?.id || req.user?.uid;
    
    const result = await examExecutionService.submitExam(attemptId, answers, flagged, autoSubmitted, studentId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Submit exam execution error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 📊 Fetch analytical evaluation report matrix
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
 * 💬 Submit student feedback with ratings
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
      timeSpent
    } = req.body;
    
    const studentId = req.user?.id || req.user?.uid;
    
    if (!studentId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Get attempt details for additional context
    const attemptDoc = await require('../config/firebase').db
      .collection('student_exams')
      .doc(attemptId)
      .get();
    
    let examId = null;
    let examTitle = null;
    let percentage = 0;
    
    if (attemptDoc.exists) {
      const attemptData = attemptDoc.data();
      examId = attemptData.examId;
      examTitle = attemptData.title || 'Language Examination';
      percentage = attemptData.percentage || 0;
    }

    const feedbackData = {
      attemptId,
      studentId,
      examId,
      examTitle,
      percentage,
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

    // Save to feedback collection
    const db = require('../config/firebase').db;
    const feedbackRef = db.collection('exam_feedback').doc();
    await feedbackRef.set(feedbackData);

    // Also update the submission record with feedback reference
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
    }

    return res.status(201).json({ 
      success: true, 
      data: { 
        id: feedbackRef.id, 
        ...feedbackData 
      } 
    });
  } catch (error) {
    console.error('Submit feedback error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 📜 Get student submission history
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
 * 📊 Get feedback for a specific attempt
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

module.exports = {
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