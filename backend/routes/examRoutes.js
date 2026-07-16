const express = require('express');
const router = express.Router();

const { 
  createExam, 
  getStudentExams, 
  deleteStudentExam,
  uploadAsset,
  deleteAsset
} = require('../controllers/examController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// 🔒 URL: POST /api/exams/upload-asset
router.post('/upload-asset', upload.single('file'), protect, authorizeRoles('tutor', 'admin'), uploadAsset);

// 🔒 URL: POST /api/exams/delete-asset
router.post('/delete-asset', protect, authorizeRoles('tutor', 'admin'), deleteAsset);

// 📊 URL: GET /api/exams/student-exams
router.get('/student-exams', getStudentExams);

// 🗑️ URL: DELETE /api/exams/student-exams/:id
router.delete('/student-exams/:id', deleteStudentExam);

// 🚀 URL: POST /api/exams/create
router.post('/create', protect, authorizeRoles('tutor', 'admin'), createExam);

module.exports = router;