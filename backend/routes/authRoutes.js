const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', authController.loginUser);
router.post('/register', authController.registerUser);
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;