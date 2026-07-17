const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
// ඔයාගේ Auth middleware එක මෙතන import කරන්න (උදාහරණයක් ලෙස)
// const authMiddleware = require('../middleware/authMiddleware'); 

// මේ Routes ටික තමයි FinanceService එකෙන් Call කරන්නේ
router.get('/stats', financeController.getFinanceStats); 
router.get('/transactions', financeController.getRecentTransactions); // මේක Controller එකේ අලුතින් හදන්න ඕනේ
router.get('/revenue-chart', financeController.getRevenueChartData); // මේකත් Controller එකේ හදන්න ඕනේ

module.exports = router;