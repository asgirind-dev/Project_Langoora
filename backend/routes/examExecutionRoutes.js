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
} = require('../controllers/examExecutionController');

router.post('/:examId/start', start);
router.get('/:examId/metadata', metadata);
router.get('/:examId/questions', questions);

router.post('/:attemptId/violation', violation);
router.get('/:attemptId/status', status);

router.post('/:attemptId/submit', submit);
router.get('/:attemptId/results', results);

// Feedback endpoint
router.post('/:attemptId/feedback', submitFeedback);

// Submissions history
router.get('/submissions/student/:studentId', getSubmissions);

module.exports = router;