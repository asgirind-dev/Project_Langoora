const express = require('express');
const router = express.Router();

const {
  createExam,
  getTutorExams,
  getExamById,
  deleteExam,
  getRecycleBinExams, // NEW: Recycle Bin
  restoreExam,         // NEW: Recycle Bin
  permanentDeleteExam, // NEW: Recycle Bin
  updateExamStatus,
  updateExamDraft,
  updateExam,
  getAllExams,
  getAllExamsDev, // NEW: Import dev function
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
//  PUBLIC ENDPOINTS (No authentication required)
// ============================================================

/**
 * 📚 Get all published exams for students to browse
 * GET /api/exams/available
 */
router.get('/available', getAllExams);

/**
 * 🛠️ DEV: Get ALL exams from Firestore (NO AUTH)
 * GET /api/exams/dev/all
 * ⚠️ FOR DEVELOPMENT ONLY - Remove in production!
 */
router.get('/dev/all', getAllExamsDev);

// ============================================================
//  TUTOR / ADMIN ENDPOINTS (protected)
// ============================================================

/**
 * 🎵 📷 Upload exam asset
 * POST /api/exams/upload-asset
 */
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
 * ♻️ Recycle Bin: Get all soft-deleted exams for the logged-in tutor
 * GET /api/exams/recycle-bin
 * (Literal path — must stay above the '/:examId' routes below, same
 * reasoning as '/available' and '/dev/all'.)
 */
router.get('/recycle-bin', protect, authorizeRoles('tutor', 'admin'), getRecycleBinExams);

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
 * ♻️ Recycle Bin: Restore a soft-deleted exam
 * PUT /api/exams/:examId/restore
 */
router.put('/:examId/restore', protect, authorizeRoles('tutor', 'admin'), restoreExam);

/**
 * 🗑️ Recycle Bin: Permanently delete an exam
 * DELETE /api/exams/:examId/permanent
 */
router.delete('/:examId/permanent', protect, authorizeRoles('tutor', 'admin'), permanentDeleteExam);
//  STUDENT EXAM ATTEMPTS MANAGEMENT
// ============================================================

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
