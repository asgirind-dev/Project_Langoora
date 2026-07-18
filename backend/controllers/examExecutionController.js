const examExecutionService = require('../services/examExecutionService');

/**
 * 📝 Start a new exam attempt session matrix
 * POST /api/exam-execution/:examId/start
 */
const start = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.id || 'mock_student_id';
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
    const result = await examExecutionService.submitExam(attemptId, answers, flagged, autoSubmitted);
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

module.exports = {
  start,
  metadata,
  questions,
  violation,
  status,
  submit,
  results,
};