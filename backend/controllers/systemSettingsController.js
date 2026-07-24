// backend/controllers/systemSettingsController.js
const systemSettingsService = require('../services/systemSettingsService');
const { db } = require('../config/firebase');  // ⭐ මෙතන විතරයි change එක

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

      if (senderEmail && !this.isValidEmail(senderEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format'
        });
      }

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

  // =============================================
  // 4. EXCHANGE RATE & PLATFORM COMMISSION ⭐
  // =============================================

  /**
   * ⭐ Get Both Exchange Rate & Platform Commission
   * GET /api/system-settings/rates
   */
  async getRates(req, res) {
    try {
      // ⭐ admin.firestore() වෙනුවට db use කරන්න
      const docRef = db.collection('system_settings').doc('global_config');
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({
          success: false,
          message: 'System settings not found'
        });
      }

      const data = docSnap.data();

      res.status(200).json({
        success: true,
        data: {
          exchangeRate: data.creditPrice || 5,
          platformCommission: data.platformCommission || 10,
          minPayoutThreshold: data.minPayoutThreshold || 5000,
          signupBonus: data.signupBonus || 10,
          currency: 'LKR'
        }
      });
    } catch (error) {
      console.error('Error fetching rates:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get Exchange Rate (creditPrice) Only
   * GET /api/system-settings/exchange-rate
   */
  async getExchangeRate(req, res) {
    try {
      const docRef = db.collection('system_settings').doc('global_config');
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({
          success: false,
          message: 'System settings not found'
        });
      }

      const data = docSnap.data();
      const creditPrice = data.creditPrice || 5;

      res.status(200).json({
        success: true,
        data: {
          exchangeRate: creditPrice,
          currency: 'LKR'
        }
      });
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get Platform Commission Only
   * GET /api/system-settings/platform-commission
   */
  async getPlatformCommission(req, res) {
    try {
      const docRef = db.collection('system_settings').doc('global_config');
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({
          success: false,
          message: 'System settings not found'
        });
      }

      const data = docSnap.data();
      const platformCommission = data.platformCommission || 10;

      res.status(200).json({
        success: true,
        data: {
          platformCommission: platformCommission
        }
      });
    } catch (error) {
      console.error('Error fetching platform commission:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update Exchange Rate (creditPrice)
   * PUT /api/system-settings/exchange-rate
   */
  async updateExchangeRate(req, res) {
    try {
      const { creditPrice } = req.body;

      if (creditPrice === undefined || creditPrice === null) {
        return res.status(400).json({
          success: false,
          message: 'creditPrice is required'
        });
      }

      if (isNaN(creditPrice) || creditPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'creditPrice must be a positive number'
        });
      }

      const docRef = db.collection('system_settings').doc('global_config');

      await docRef.update({
        creditPrice: Number(creditPrice),
        updatedAt: new Date().toISOString()
      });

      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();

      res.status(200).json({
        success: true,
        message: 'Exchange rate updated successfully',
        data: {
          exchangeRate: data.creditPrice,
          currency: 'LKR',
          updatedAt: data.updatedAt
        }
      });
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update Platform Commission
   * PUT /api/system-settings/platform-commission
   */
  async updatePlatformCommission(req, res) {
    try {
      const { platformCommission } = req.body;

      if (platformCommission === undefined || platformCommission === null) {
        return res.status(400).json({
          success: false,
          message: 'platformCommission is required'
        });
      }

      if (isNaN(platformCommission) || platformCommission < 0 || platformCommission > 100) {
        return res.status(400).json({
          success: false,
          message: 'platformCommission must be between 0 and 100'
        });
      }

      const docRef = db.collection('system_settings').doc('global_config');

      await docRef.update({
        platformCommission: Number(platformCommission),
        updatedAt: new Date().toISOString()
      });

      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();

      res.status(200).json({
        success: true,
        message: 'Platform commission updated successfully',
        data: {
          platformCommission: data.platformCommission,
          updatedAt: data.updatedAt
        }
      });
    } catch (error) {
      console.error('Error updating platform commission:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // =============================================
  // 5. SEND TEST EMAIL
  // =============================================

  async sendTestEmail(req, res) {
    try {
      const { senderEmail, senderName } = req.body;
      
      if (!senderEmail) {
        return res.status(400).json({
          success: false,
          message: 'Sender email is required'
        });
      }

      if (!this.isValidEmail(senderEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sender email format'
        });
      }

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

  // =============================================
  // 6. HELPER FUNCTIONS
  // =============================================

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = new SystemSettingsController();