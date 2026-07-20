const express = require('express');
const router = express.Router();

const { 
  createExam, 
  getTutorExams,
  getExamById,
  deleteExam,
  updateExamStatus,
  getAllExams,
  getStudentExams, 
  deleteStudentExam,
  uploadAsset,
  deleteAsset
} = require('../controllers/examController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ============================================================
//  TUTOR / ADMIN ENDPOINTS (protected)
// ============================================================

/**
 * 🔒 Upload exam asset (image/audio)
 * POST /api/exams/upload-asset
 */
router.post('/upload-asset', protect, authorizeRoles('tutor', 'admin'), upload.single('file'), uploadAsset);

/**
 * 🔒 Delete exam asset
 * POST /api/exams/delete-asset
 */
router.post('/delete-asset', protect, authorizeRoles('tutor', 'admin'), deleteAsset);

// 📊 URL: GET /api/exams/tutor-exams
router.get('/tutor-exams', protect, authorizeRoles('tutor', 'admin'), getTutorExams);

// 📊 URL: GET /api/exams/:examId
router.get('/:examId', protect, authorizeRoles('tutor', 'admin'), getExamById);

// 🗑️ URL: DELETE /api/exams/:examId
router.delete('/:examId', protect, authorizeRoles('tutor', 'admin'), deleteExam);

// 📝 URL: PUT /api/exams/:examId/status
router.put('/:examId/status', protect, authorizeRoles('tutor', 'admin'), updateExamStatus);
/**
 * 🔒 Create a new exam with questions
 * POST /api/exams/create
 */
router.post('/create', protect, authorizeRoles('tutor', 'admin'), createExam);

// ============================================================
//  STUDENT DASHBOARD ENDPOINT
// ============================================================

/**
 * 📚 Get all available exams for students to browse
 * GET /api/exams/available
 */
router.get('/available', getAllExams);

// ============================================================
//  STUDENT EXAM ATTEMPTS MANAGEMENT
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