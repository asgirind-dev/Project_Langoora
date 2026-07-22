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
  getAllExamsDev, // NEW: Import dev function
  getStudentExams, 
  deleteStudentExam,
  uploadAsset,
  deleteAsset
} = require('../controllers/examController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ============================================================
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
 * 🔒 Delete exam asset
 * POST /api/exams/delete-asset
 */
router.post('/delete-asset', protect, authorizeRoles('tutor', 'admin'), deleteAsset);

/**
 * 🔒 Get tutor exams
 * GET /api/exams/tutor-exams
 */
router.get('/tutor-exams', protect, authorizeRoles('tutor', 'admin'), getTutorExams);

/**
 * 🔒 Get exam by ID
 * GET /api/exams/:examId
 */
router.get('/:examId', protect, authorizeRoles('tutor', 'admin'), getExamById);

/**
 * 🔒 Delete exam
 * DELETE /api/exams/:examId
 */
router.delete('/:examId', protect, authorizeRoles('tutor', 'admin'), deleteExam);

/**
 * 🔒 Update exam status
 * PUT /api/exams/:examId/status
 */
router.put('/:examId/status', protect, authorizeRoles('tutor', 'admin'), updateExamStatus);

/**
 * 🔒 Update exam draft (auto-save)
 * PUT /api/exams/:examId/draft
 */
router.put('/:examId/draft', protect, authorizeRoles('tutor', 'admin'), updateExamDraft);

/**
 * 🔒 Update exam (Full Update)
 * PUT /api/exams/:examId
 */
router.put('/:examId', protect, authorizeRoles('tutor', 'admin'), updateExam);

/**
 * 🔒 Create a new exam with questions
 * POST /api/exams/create
 */
router.post('/create', protect, authorizeRoles('tutor', 'admin'), createExam);

// ============================================================
//  STUDENT EXAM ATTEMPTS MANAGEMENT
// ============================================================

/**
 * 📊 Get all student exam attempts
 * GET /api/exams/student-exams
 */
router.get('/student-exams', protect, getStudentExams);

/**
 * 🗑️ Delete a student exam attempt
 * DELETE /api/exams/student-exams/:id
 */
router.delete('/student-exams/:id', protect, deleteStudentExam);

module.exports = router;