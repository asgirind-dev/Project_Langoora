const studentExamService = require('../services/studentExamService');

/**
 * 📝 Start a new exam attempt
 * POST /api/student-exams/:examId/start
 */
const start = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.id || 'mock_student_id';
    const attempt = await studentExamService.startExam(examId, studentId);
    return res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    console.error('Start exam error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 📄 Get exam metadata (duration, title, sections, etc.)
 * GET /api/student-exams/:examId/metadata
 */
const metadata = async (req, res) => {
  try {
    const { examId } = req.params;
    const data = await studentExamService.getExamMetadata(examId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get metadata error:', error.message);
    const status = error.message === 'Exam not found' ? 404 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * ❓ Get exam questions — answer keys are stripped before leaving the server.
 * GET /api/student-exams/:examId/questions
 */
const questions = async (req, res) => {
  try {
    const { examId } = req.params;
    const data = await studentExamService.getQuestionsForStudent(examId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get questions error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 🚨 Report an integrity violation (tab switch / focus loss) during an attempt.
 * POST /api/student-exams/:attemptId/violation
 */
const violation = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const result = await studentExamService.registerViolation(attemptId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Violation report error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 🔒 Check current lock/violation status for an attempt (used for polling).
 * GET /api/student-exams/:attemptId/status
 */
const status = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const data = await studentExamService.getAttemptStatus(attemptId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get status error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 📤 Submit the exam attempt
 * POST /api/student-exams/:attemptId/submit
 */
const submit = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, flagged, autoSubmitted } = req.body;
    const result = await studentExamService.submitExam(attemptId, answers, flagged, autoSubmitted);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Submit exam error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 📊 Get results for a completed attempt
 * GET /api/student-exams/:attemptId/results
 */
const results = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const data = await studentExamService.getResults(attemptId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get results error:', error.message);
    const status = error.message === 'Attempt not found' ? 404 : 500;
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
