const express = require('express');
const router = express.Router();
const systemSettingsController = require('../controllers/systemSettingsController');

// 👑 Homepage CMS Channels
router.get('/banners', systemSettingsController.getBanners);
router.post('/banners', systemSettingsController.saveBanners);

// 🛡️ Governance & Security Engine Endpoints
router.get('/security', systemSettingsController.getSecuritySettings);
router.post('/security', systemSettingsController.saveSecuritySettings);

module.exports = router;