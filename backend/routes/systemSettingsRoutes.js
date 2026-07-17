const express = require('express');
const router = express.Router();
const systemSettingsController = require('../controllers/systemSettingsController');

// Clean endpoint mapping
router.get('/banners', systemSettingsController.getBanners);
router.post('/banners', systemSettingsController.saveBanners);

module.exports = router;