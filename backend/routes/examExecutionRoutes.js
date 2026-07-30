const express = require('express');
const router = express.Router();
const {
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
  checkActiveAttempt,
  saveProgress,
} = require('../controllers/examExecutionController');
const { protect } = require('../middleware/authMiddleware');

// All exam execution routes require authentication
router.use(protect);

// ================================================================
// ✅ NEW: CHECK ACTIVE ATTEMPT (MUST COME BEFORE /:examId/start)
// ================================================================
/**
 * 🔍 Check if student has an active attempt
 * GET /api/exam-execution/:examId/check-active
 */
router.get('/:examId/check-active', checkActiveAttempt);

// ================================================================
// ✅ NEW: SAVE PROGRESS
// ================================================================
/**
 * 💾 Save exam progress
 * PUT /api/exam-execution/:attemptId/save
 */
router.put('/:attemptId/save', saveProgress);

// ================================================================
// 📝 START EXAM (now supports resume)
// ================================================================
router.post('/:examId/start', start);

// ================================================================
// 📄 GET EXAM METADATA
// ================================================================
router.get('/:examId/metadata', metadata);

// ================================================================
// 🔒 GET EXAM QUESTIONS
// ================================================================
router.get('/:examId/questions', questions);

// ================================================================
// 🛡️ ANTI-CHEAT VIOLATION
// ================================================================
router.post('/:attemptId/violation', violation);

// ================================================================
// 📊 GET ATTEMPT STATUS
// ================================================================
router.get('/:attemptId/status', status);

// ================================================================
// 📤 SUBMIT EXAM
// ================================================================
router.post('/:attemptId/submit', submit);

// ================================================================
// 📊 GET RESULTS
// ================================================================
router.get('/:attemptId/results', results);

// ================================================================
// 💬 FEEDBACK ENDPOINTS
// ================================================================
router.post('/:attemptId/feedback', submitFeedback);
router.get('/:attemptId/feedback', getFeedback);

// ================================================================
// 📜 SUBMISSIONS HISTORY
// ================================================================
router.get('/submissions/student/:studentId', getSubmissions);

module.exports = router;