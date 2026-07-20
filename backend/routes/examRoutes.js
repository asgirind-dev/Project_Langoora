const express = require('express');
const router = express.Router();

const { 
  createExam, 
  getTutorExams,
  getExamById,
  deleteExam,
  updateExamStatus,
  uploadAsset,
  deleteAsset
} = require('../controllers/examController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// 🔒 URL: POST /api/exams/upload-asset
router.post('/upload-asset', upload.single('file'), protect, authorizeRoles('tutor', 'admin'), uploadAsset);

// 🔒 URL: POST /api/exams/delete-asset
router.post('/delete-asset', protect, authorizeRoles('tutor', 'admin'), deleteAsset);

// 📊 URL: GET /api/exams/tutor-exams
router.get('/tutor-exams', protect, authorizeRoles('tutor', 'admin'), getTutorExams);

// 📊 URL: GET /api/exams/:examId
router.get('/:examId', protect, authorizeRoles('tutor', 'admin'), getExamById);

// 🗑️ URL: DELETE /api/exams/:examId
router.delete('/:examId', protect, authorizeRoles('tutor', 'admin'), deleteExam);

// 📝 URL: PUT /api/exams/:examId/status
router.put('/:examId/status', protect, authorizeRoles('tutor', 'admin'), updateExamStatus);

// 🚀 URL: POST /api/exams/create
router.post('/create', protect, authorizeRoles('tutor', 'admin'), createExam);

module.exports = router;