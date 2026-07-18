const systemSettingsService = require('../services/systemSettingsService');

class SystemSettingsController {
  async getBanners(req, res) {
    try {
      const banners = await systemSettingsService.getHeroBanners();
      return res.status(200).json({ success: true, data: banners });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async saveBanners(req, res) {
    try {
      const { banners } = req.body;
      if (!Array.isArray(banners)) {
        return res.status(400).json({ success: false, message: 'Invalid format.' });
      }
      const updatedBanners = await systemSettingsService.updateHeroBanners(banners);
      return res.status(200).json({ success: true, data: updatedBanners });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // 🎯 UPDATED: Load Dynamic Security Packages
  async getSecuritySettings(req, res) {
    try {
      const policies = await systemSettingsService.getSecurityPolicies();
      return res.status(200).json({ success: true, data: policies });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // 🎯 UPDATED: Sync Security Packages with Timeouts & Toggles
  async saveSecuritySettings(req, res) {
    try {
      const { enableAntiCheat, maxViolationWarnings, maintenanceMode, sessionTimeouts } = req.body;
      const updatedPolicies = await systemSettingsService.updateSecurityPolicies({
        enableAntiCheat,
        maxViolationWarnings,
        maintenanceMode,
        sessionTimeouts
      });
      return res.status(200).json({ success: true, message: 'Security policies committed successfully.', data: updatedPolicies });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new SystemSettingsController();