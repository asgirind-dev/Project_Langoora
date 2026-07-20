const express = require('express');
const router = express.Router();
const systemSettingsController = require('../controllers/systemSettingsController');

// =============================================
// 1. HOMEPAGE CMS - HERO BANNERS
// =============================================
router.get('/banners', systemSettingsController.getBanners);
router.post('/banners', systemSettingsController.saveBanners);

// =============================================
// 2. GOVERNANCE & SECURITY
// =============================================
router.get('/security', systemSettingsController.getSecuritySettings);
router.post('/security', systemSettingsController.saveSecuritySettings);

// =============================================
// 3. GLOBAL CONFIGURATIONS (NEW)
// =============================================
router.get('/global', systemSettingsController.getGlobalSettings);
router.post('/global', systemSettingsController.saveGlobalSettings);
router.post('/test-email', systemSettingsController.sendTestEmail);

module.exports = router;