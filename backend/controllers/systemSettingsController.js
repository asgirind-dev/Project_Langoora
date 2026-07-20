const systemSettingsService = require('../services/systemSettingsService');

class SystemSettingsController {
  // =============================================
  // 1. HOMEPAGE CMS - HERO BANNERS
  // =============================================

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

  // =============================================
  // 2. GOVERNANCE & SECURITY
  // =============================================

  async getSecuritySettings(req, res) {
    try {
      const policies = await systemSettingsService.getSecurityPolicies();
      return res.status(200).json({ success: true, data: policies });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async saveSecuritySettings(req, res) {
    try {
      const { enableAntiCheat, maxViolationWarnings, maintenanceMode, sessionTimeouts } = req.body;
      const updatedPolicies = await systemSettingsService.updateSecurityPolicies({
        enableAntiCheat,
        maxViolationWarnings,
        maintenanceMode,
        sessionTimeouts
      });
      return res.status(200).json({ 
        success: true, 
        message: 'Security policies committed successfully.', 
        data: updatedPolicies 
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // =============================================
  // 3. GLOBAL CONFIGURATIONS (NEW)
  // =============================================

  /**
   * 🌐 Get Global Configurations
   * Frontend එකට Global Config එක යවනවා
   */
  async getGlobalSettings(req, res) {
    try {
      const config = await systemSettingsService.getGlobalConfig();
      return res.status(200).json({ 
        success: true, 
        data: config 
      });
    } catch (error) {
      console.error("Error in getGlobalSettings:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  /**
   * 💾 Save Global Configurations
   * Frontend එකෙන් එන Data එක Validate කරලා Save කරනවා
   */
  async saveGlobalSettings(req, res) {
    try {
      const {
        creditPrice,
        signupBonus,
        platformCommission,
        minPayoutThreshold,
        senderEmail,
        senderName,
        showAnnouncement,
        announcementText,
        announcementColor
      } = req.body;

      // ✅ Validate කරනවා
      if (creditPrice && (creditPrice < 10 || creditPrice > 1000)) {
        return res.status(400).json({
          success: false,
          message: 'Credit price must be between LKR 10 and LKR 1000'
        });
      }

      if (signupBonus && (signupBonus < 0 || signupBonus > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Signup bonus must be between 0 and 100 credits'
        });
      }

      if (platformCommission && (platformCommission < 0 || platformCommission > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Platform commission must be between 0% and 100%'
        });
      }

      if (minPayoutThreshold && (minPayoutThreshold < 100 || minPayoutThreshold > 100000)) {
        return res.status(400).json({
          success: false,
          message: 'Minimum payout threshold must be between LKR 100 and LKR 100,000'
        });
      }

      if (senderEmail && !isValidEmail(senderEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format'
        });
      }

      // 💾 Save කරනවා
      const updatedConfig = await systemSettingsService.updateGlobalConfig({
        creditPrice,
        signupBonus,
        platformCommission,
        minPayoutThreshold,
        senderEmail,
        senderName,
        showAnnouncement,
        announcementText,
        announcementColor
      });

      return res.status(200).json({
        success: true,
        message: 'Global configurations updated successfully!',
        data: updatedConfig
      });
    } catch (error) {
      console.error("Error in saveGlobalSettings:", error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * 📧 Send Test Email
   * Email settings හරිද කියලා Test කරනවා
   */
  async sendTestEmail(req, res) {
    try {
      const { senderEmail, senderName } = req.body;
      
      // ✅ Validate කරනවා
      if (!senderEmail) {
        return res.status(400).json({
          success: false,
          message: 'Sender email is required'
        });
      }

      if (!isValidEmail(senderEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sender email format'
        });
      }

      // 📧 Email එක Send කරනවා
      const result = await systemSettingsService.sendTestEmail(senderEmail, senderName);
      
      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully!',
        data: result
      });
    } catch (error) {
      console.error("Error in sendTestEmail:", error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

// Helper function to validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = new SystemSettingsController();