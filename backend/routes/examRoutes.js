const express = require('express');
const router = express.Router();
const { 
  createExam, 
  getStudentExams, 
  deleteStudentExam 
} = require('../controllers/examController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// URL: GET http://localhost:5000/api/exams/student-exams
router.get('/student-exams', getStudentExams);

// URL: DELETE http://localhost:5000/api/exams/student-exams/:id
router.delete('/student-exams/:id', deleteStudentExam);

// 🔒 Secure Perimeter Gatekeeper for Tutor Core Operations
// URL: POST http://localhost:5000/api/exams/create
router.post('/create', protect, authorizeRoles('tutor', 'admin'), createExam);

module.exports = router;