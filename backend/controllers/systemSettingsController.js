// backend/controllers/systemSettingsController.js
const systemSettingsService = require('../services/systemSettingsService');

// ✅ Helper function defined outside the class to avoid 'this' binding issues
function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

class SystemSettingsController {
  // =============================================
  // 1. HOMEPAGE CMS - HERO BANNERS
  // =============================================

  async getBanners(req, res) {
    try {
      const banners = await systemSettingsService.getHeroBanners();
      return res.status(200).json({ success: true, data: banners });
    } catch (error) {
      console.error("Error in getBanners:", error);
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
      console.error("Error in saveBanners:", error);
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
      console.error("Error in getSecuritySettings:", error);
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
      console.error("Error in saveSecuritySettings:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // =============================================
  // 3. GLOBAL CONFIGURATIONS
  // =============================================

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

  async saveGlobalSettings(req, res) {
    try {
      console.log('📝 saveGlobalSettings called with body:', req.body);

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

      // Validate credit price
      if (creditPrice !== undefined && (creditPrice < 10 || creditPrice > 1000)) {
        return res.status(400).json({
          success: false,
          message: 'Credit price must be between LKR 10 and LKR 1000'
        });
      }

      // Validate signup bonus
      if (signupBonus !== undefined && (signupBonus < 0 || signupBonus > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Signup bonus must be between 0 and 100 credits'
        });
      }

      // Validate platform commission
      if (platformCommission !== undefined && (platformCommission < 0 || platformCommission > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Platform commission must be between 0% and 100%'
        });
      }

      // Validate min payout threshold
      if (minPayoutThreshold !== undefined && (minPayoutThreshold < 100 || minPayoutThreshold > 100000)) {
        return res.status(400).json({
          success: false,
          message: 'Minimum payout threshold must be between LKR 100 and LKR 100,000'
        });
      }

      // ✅ FIX: Use the helper function instead of this.isValidEmail
      if (senderEmail && !isValidEmail(senderEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format'
        });
      }

      // Validate sender name
      if (senderName && senderName.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Sender name must be 50 characters or less'
        });
      }

      // Save configurations
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

      console.log('✅ Global config saved successfully:', updatedConfig);

      return res.status(200).json({
        success: true,
        message: 'Global configurations updated successfully!',
        data: updatedConfig
      });
    } catch (error) {
      console.error("❌ Error in saveGlobalSettings:", error);
      console.error("Stack:", error.stack);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  async sendTestEmail(req, res) {
    try {
      console.log('📧 sendTestEmail called with body:', req.body);

      const { senderEmail, senderName } = req.body;

      // Validate sender email
      if (!senderEmail) {
        return res.status(400).json({
          success: false,
          message: 'Sender email is required'
        });
      }

      // ✅ FIX: Use the helper function instead of this.isValidEmail
      if (!isValidEmail(senderEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sender email format'
        });
      }

      // Send test email
      const result = await systemSettingsService.sendTestEmail(senderEmail, senderName);

      console.log('✅ Test email sent successfully:', result);

      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully!',
        data: result
      });
    } catch (error) {
      console.error("❌ Error in sendTestEmail:", error);
      console.error("Stack:", error.stack);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to send test email'
      });
    }
  }
}

// Export as singleton instance
module.exports = new SystemSettingsController();