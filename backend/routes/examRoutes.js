const express = require('express');
const router = express.Router();
const { 
  createExam, 
  getAllExams,
  getStudentExams, 
  deleteStudentExam,
} = require('../controllers/examController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// ============================================================
//  TUTOR / ADMIN ENDPOINTS (protected)
// ============================================================

/**
 * 🔒 Secure Perimeter Gatekeeper for Tutor Core Operations
 * POST /api/exams/create - Create a new exam with questions
 */
router.post('/create', protect, authorizeRoles('tutor', 'admin'), createExam);

// ============================================================
//  STUDENT DASHBOARD ENDPOINT (view all available exams)
// ============================================================

/**
 * 📚 Get all available exams for students to browse
 * GET /api/exams/available
 */
router.get('/available', getAllExams);

// ============================================================
//  NOTE: the actual exam-taking runtime (start / metadata / questions /
//  violation / submit / results) lives under /api/student-exams — see
//  studentExamRoutes.js + studentExamController.js. It used to be
//  duplicated here pointing at functions that didn't exist in
//  examController.js, which would have crashed the server on boot.
// ============================================================

// ============================================================
//  STUDENT EXAM ATTEMPTS MANAGEMENT (existing endpoints)
// ============================================================

/**
 * 📊 Get all student exam attempts
 * GET /api/exams/student-exams
 */
router.get('/student-exams', getStudentExams);

/**
 * 🗑️ Delete a student exam attempt
 * DELETE /api/exams/student-exams/:id
 */
router.delete('/student-exams/:id', deleteStudentExam);

module.exports = router;
