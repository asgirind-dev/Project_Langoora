const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');

// Dashboard Stats
router.get('/stats', financeController.getFinanceStats);

// Recent Transactions
router.get('/transactions', financeController.getRecentTransactions);

// Revenue Chart Data
router.get('/revenue-chart', financeController.getRevenueChartData);

// Active Users
router.get('/active-users', financeController.getActiveUsers);

module.exports = router;