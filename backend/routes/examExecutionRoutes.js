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
} = require('../controllers/examExecutionController');
const { protect } = require('../middleware/authMiddleware');

// All exam execution routes require authentication
router.use(protect);

router.post('/:examId/start', start);
router.get('/:examId/metadata', metadata);
router.get('/:examId/questions', questions);

router.post('/:attemptId/violation', violation);
router.get('/:attemptId/status', status);

router.post('/:attemptId/submit', submit);
router.get('/:attemptId/results', results);

// Feedback endpoints
router.post('/:attemptId/feedback', submitFeedback);
router.get('/:attemptId/feedback', getFeedback);

// Submissions history
router.get('/submissions/student/:studentId', getSubmissions);

module.exports = router;