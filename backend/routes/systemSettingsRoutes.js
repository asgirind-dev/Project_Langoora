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
// 3. GLOBAL CONFIGURATIONS
// =============================================
router.get('/global', systemSettingsController.getGlobalSettings);
router.post('/global', systemSettingsController.saveGlobalSettings);
router.post('/test-email', systemSettingsController.sendTestEmail);

// =============================================
// 4. EXCHANGE RATE & PLATFORM COMMISSION ⭐ NEW
// =============================================
router.get('/rates', systemSettingsController.getRates);
router.get('/exchange-rate', systemSettingsController.getExchangeRate);
router.get('/platform-commission', systemSettingsController.getPlatformCommission);
router.put('/exchange-rate', systemSettingsController.updateExchangeRate);
router.put('/platform-commission', systemSettingsController.updatePlatformCommission);

module.exports = router;