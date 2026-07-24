const express = require('express');
const router = express.Router();

// 🔌 Controllers Import කර ගැනීම
const {
  createExam,
  getTutorExams,
  getExamById,
  deleteExam,
  updateExamStatus,
  updateExamDraft,
  updateExam,
  getAllExams,
  getAllExamsDev,
  getStudentExams, 
  deleteStudentExam,
  purchaseExam,
  submitExamResult,
  uploadAsset,
  deleteAsset
} = require('../controllers/examController');

// 🛡️ Middlewares Import කර ගැනීම
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ============================================================
// 🌐 1. PUBLIC ENDPOINTS (No authentication required)
// ============================================================

/**
 * 📚 Get all published exams for marketplace
 * GET /api/exams/all OR /api/exams/available
 */
router.get('/all', getAllExams);
router.get('/available', getAllExams);

/**
 * 🛠️ DEV: Get ALL exams from Firestore (FOR DEV ONLY)
 * GET /api/exams/dev/all
 */
router.get('/dev/all', getAllExamsDev);


// ============================================================
// 🎓 2. STUDENT PROTECTED ENDPOINTS (Literal Paths First!)
// ============================================================

/**
 * 🛒 Purchase an Exam
 * POST /api/exams/purchase
 */
router.post('/purchase', protect, purchaseExam);

/**
 * 🔌 Get student's purchased exams
 * GET /api/exams/my-exams OR /api/exams/student-exams
 */
router.get('/my-exams', protect, getStudentExams);
router.get('/student-exams', protect, getStudentExams);

/**
 * 🗑️ Remove purchased exam from dashboard
 * DELETE /api/exams/my-exams/:id OR /api/exams/student-exams/:id
 */
router.delete('/my-exams/:id', protect, deleteStudentExam);
router.delete('/student-exams/:id', protect, deleteStudentExam);

/**
 * 📝 Submit exam results
 * POST /api/exams/submit/:purchaseId
 */
router.post('/submit/:purchaseId', protect, submitExamResult);


// ============================================================
// 👨‍🏫 3. TUTOR / ADMIN PROTECTED ENDPOINTS
// ============================================================

/**
 * 🎵 📷 Upload asset for exam
 * POST /api/exams/upload-asset
 */
router.post('/upload-asset', protect, authorizeRoles('tutor', 'admin'), upload.single('file'), uploadAsset);

/**
 * 🗑️ Delete asset
 * POST /api/exams/delete-asset
 */
router.post('/delete-asset', protect, authorizeRoles('tutor', 'admin'), deleteAsset);

/**
 * 📚 Get exams created by tutor
 * GET /api/exams/tutor-exams
 */
router.get('/tutor-exams', protect, authorizeRoles('tutor', 'admin'), getTutorExams);

/**
 * ➕ Create new exam
 * POST /api/exams/create
 */
router.post('/create', protect, authorizeRoles('tutor', 'admin'), createExam);


// ============================================================
// ⚠️ 4. DYNAMIC ROUTES LIKE '/:examId' (MUST ALWAYS BE AT THE LAST)
// ============================================================

/**
 * Get exam details by ID
 * GET /api/exams/:examId
 */
router.get('/:examId', protect, authorizeRoles('tutor', 'admin'), getExamById);

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
 * Update exam details (Full Update)
 * PUT /api/exams/:examId
 */
router.put('/:examId', protect, authorizeRoles('tutor', 'admin'), updateExam);

/**
 * Delete exam from system
 * DELETE /api/exams/:examId
 */
router.delete('/:examId', protect, authorizeRoles('tutor', 'admin'), deleteExam);


module.exports = router;