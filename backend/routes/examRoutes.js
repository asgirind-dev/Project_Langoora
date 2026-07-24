const express = require('express');
const router = express.Router();

// 🔌 controllers/examController එකෙන් functions 4ම නිවැරදිව import කර ගැනීම
const { deleteStudentExam, getStudentExams, purchaseExam, getAllExams,submitExamResult } = require('../controllers/examController');
const { protect } = require('../middleware/authMiddleware');

// 🌐 1. Marketplace එකට සැබෑ විභාග (Exams) සියල්ල ලබා ගැනීම (No token required for viewing)
// Actual URL: GET http://localhost:5000/api/exams/all
router.get('/all', getAllExams);

// 🔌 2. Student මිලදී ගත්තු විභාග ටික පමණක් fetch කර ගැනීම
// Actual URL: GET http://localhost:5000/api/exams/my-exams
router.get('/my-exams', protect, getStudentExams);

// 🛒 3. Exam එකක් මිලදී ගත් විට database එකට ඇතුළත් කිරීම
// Actual URL: POST http://localhost:5000/api/exams/purchase
router.post('/purchase', protect, purchaseExam);

// 🗑️ 4. මිලදී ගත්තු විභාගයක් dashboard එකෙන් remove කිරීම
// Actual URL: DELETE http://localhost:5000/api/exams/my-exams/:id
router.delete('/my-exams/:id', protect, deleteStudentExam);
router.post('/submit/:purchaseId', protect, submitExamResult);

module.exports = router;