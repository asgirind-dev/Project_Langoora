const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');

// 1. Dashboard Stats
router.get('/stats', financeController.getFinanceStats);

// 2. Recent Transactions (Limit 5)
router.get('/transactions', financeController.getRecentTransactions);

// 3. Ledger Audit (All Transactions)
router.get('/all-transactions', financeController.getAllTransactions);

// 4. Revenue Chart Data
router.get('/revenue-chart', financeController.getRevenueChartData);

// 5. Active Users
router.get('/active-users', financeController.getActiveUsers);

module.exports = router;