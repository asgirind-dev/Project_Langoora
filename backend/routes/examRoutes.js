const express = require('express');
const router = express.Router();

const {
  createExam,
  getTutorExams,
  getExamById,
  deleteExam,
  updateExamStatus,
  updateExamDraft,
  updateExam,
  getAllExams,
  getStudentExams,
  deleteStudentExam,
  uploadAsset,
  deleteAsset
} = require('../controllers/examController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ============================================================
//  IMPORTANT: literal routes MUST be declared before the
//  dynamic '/:examId' routes. Express matches routes in
//  registration order, so '/available' or '/student-exams'
//  would otherwise be swallowed by GET/DELETE '/:examId'
//  (examId === "available"), causing student-facing endpoints
//  to 401/404 behind tutor-only auth. This was a real bug in
//  the previous version of this file.
// ============================================================

// ============================================================
//  TUTOR / ADMIN ENDPOINTS (protected, literal paths first)
// ============================================================

router.post('/upload-asset', protect, authorizeRoles('tutor', 'admin'), upload.single('file'), uploadAsset);

/**
 * Delete exam asset
 * POST /api/exams/delete-asset
 */
router.post('/delete-asset', protect, authorizeRoles('tutor', 'admin'), deleteAsset);

/**
 * Get tutor exams
 * GET /api/exams/tutor-exams
 */
router.get('/tutor-exams', protect, authorizeRoles('tutor', 'admin'), getTutorExams);

/**
 * Create a new exam with questions
 * POST /api/exams/create
 */
router.post('/create', protect, authorizeRoles('tutor', 'admin'), createExam);

// ============================================================
//  STUDENT DASHBOARD ENDPOINT (literal path, before '/:examId')
// ============================================================

/**
 * Get all available exams for students to browse
 * GET /api/exams/available
 */
router.get('/available', getAllExams);

// ============================================================
//  STUDENT EXAM ATTEMPTS MANAGEMENT (literal paths, before '/:examId')
// ============================================================

/**
 * Get all student exam attempts
 * GET /api/exams/student-exams
 */
router.get('/student-exams', protect, getStudentExams);

/**
 * Delete a student exam attempt
 * DELETE /api/exams/student-exams/:id
 */
router.delete('/student-exams/:id', protect, deleteStudentExam);

// ============================================================
//  TUTOR / ADMIN ENDPOINTS using ':examId' (must come LAST)
// ============================================================

/**
 * Get exam by ID
 * GET /api/exams/:examId
 */
router.get('/:examId', protect, authorizeRoles('tutor', 'admin'), getExamById);

/**
 * Delete exam
 * DELETE /api/exams/:examId
 */
router.delete('/:examId', protect, authorizeRoles('tutor', 'admin'), deleteExam);

/**
 * Update exam status
 * PUT /api/exams/:examId/status
 */
router.put('/:examId/status', protect, authorizeRoles('tutor', 'admin'), updateExamStatus);

/**
 * Update exam draft (auto-save)
 * PUT /api/exams/:examId/draft
 */
router.put('/:examId/draft', protect, authorizeRoles('tutor', 'admin'), updateExamDraft);

/**
 * Update exam (Full Update)
 * PUT /api/exams/:examId
 */
router.put('/:examId', protect, authorizeRoles('tutor', 'admin'), updateExam);

module.exports = router;
