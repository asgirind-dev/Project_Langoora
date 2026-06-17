const express = require('express');
const router = express.Router();

// 💡 මෙතනින් import කරන්නේ එකම එක පාරයි!
const { deleteStudentExam, getStudentExams } = require('../controllers/examController');

// URL: GET http://localhost:5000/api/student-exams
router.get('/student-exams', getStudentExams);

// URL: DELETE http://localhost:5000/api/student-exams/:id
router.delete('/student-exams/:id', deleteStudentExam);

module.exports = router;