const express = require('express');
const router = express.Router();

const { 
  createExam, 
  getStudentExams, 
  deleteStudentExam,
  uploadAsset 
} = require('../controllers/examController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// 🔒 URL: POST http://localhost:5000/api/exams/upload-asset
router.post('/upload-asset', upload.single('file'), protect, authorizeRoles('tutor', 'admin'), uploadAsset);

// URL: GET http://localhost:5000/api/exams/student-exams
router.get('/student-exams', getStudentExams);

// URL: DELETE http://localhost:5000/api/exams/student-exams/:id
router.delete('/student-exams/:id', deleteStudentExam);

// URL: POST http://localhost:5000/api/exams/create
router.post('/create', protect, authorizeRoles('tutor', 'admin'), createExam);

module.exports = router;