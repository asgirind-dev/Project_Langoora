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
} = require('../controllers/examExecutionController'); // 🎯 Updated module pointer mapping

// (optional auth middleware logic plug-in context)
// router.use(require('../middleware/auth'));

router.post('/:examId/start', start);
router.get('/:examId/metadata', metadata);
router.get('/:examId/questions', questions);

router.post('/:attemptId/violation', violation);
router.get('/:attemptId/status', status);

router.post('/:attemptId/submit', submit);
router.get('/:attemptId/results', results);

module.exports = router;