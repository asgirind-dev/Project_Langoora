const express = require('express');
const router = express.Router();
const { getStudentPerformance } = require('../controllers/performanceController');

// 🟢 ඔයාගේ middleware එකේ නම 'protect' නිසා එය නිවැරදිව මෙලෙස import කරගන්න:
const { protect } = require('../middleware/authMiddleware'); 

// 🔒 'verifyToken' වෙනුවට 'protect' middleware එක මෙතනට දාන්න
router.get('/student-stats', protect, getStudentPerformance);

module.exports = router;