const systemSettingsService = require('../services/systemSettingsService');
const { db } = require('../config/firebase');

// ✅ ADD: Audit Log Service
const auditLogService = require('../services/auditLogService');

// ✅ Helper for non-blocking audit logging
const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

// Helper function defined outside the class to avoid 'this' binding issues
function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

class SystemSettingsController {
  // =============================================
  // 1. HOMEPAGE CMS - HERO BANNERS
  // =============================================

  // GET BANNERS (NO AUDIT - READ ONLY)
  async getBanners(req, res) {
    try {
      const banners = await systemSettingsService.getHeroBanners();
      return res.status(200).json({ success: true, data: banners });
    } catch (error) {
      console.error("Error in getBanners:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // SAVE BANNERS - WITH AUDIT LOG
  async saveBanners(req, res) {
    try {
      const { banners } = req.body;
      if (!Array.isArray(banners)) {
        return res.status(400).json({ success: false, message: 'Invalid format.' });
      }

      // Get old banners for comparison
      const oldBanners = await systemSettingsService.getHeroBanners();

      const updatedBanners = await systemSettingsService.updateHeroBanners(banners);

      // ✅ SYSTEM CONFIG AUDIT LOG - BANNERS UPDATED
      logAudit(auditLogService.logSystemConfig, {
        actorId: req.user?.uid || 'system',
        actorEmail: req.user?.email || 'system@langoora.com',
        action: 'banner_updated',
        settingType: 'hero_banners',
        changes: {
          oldCount: oldBanners.length,
          newCount: banners.length,
          banners: banners.map(b => ({ id: b.id, title: b.title || 'Untitled' }))
        },
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      return res.status(200).json({ success: true, data: updatedBanners });
    } catch (error) {
      console.error("Error in saveBanners:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // =============================================
  // 2. GOVERNANCE & SECURITY
  // =============================================

  // GET SECURITY SETTINGS (NO AUDIT - READ ONLY)
  async getSecuritySettings(req, res) {
    try {
      const policies = await systemSettingsService.getSecurityPolicies();
      return res.status(200).json({ success: true, data: policies });
    } catch (error) {
      console.error("Error in getSecuritySettings:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // SAVE SECURITY SETTINGS - WITH AUDIT LOG
  async saveSecuritySettings(req, res) {
    try {
      const {
        enableAntiCheat,
        maxViolationWarnings,
        maintenanceMode,
        maintenanceEstimatedTime,
        maintenanceMessage,
        sessionTimeouts
      } = req.body;

      // Get old security policies for comparison
      const oldPolicies = await systemSettingsService.getSecurityPolicies();

      const updatedPolicies = await systemSettingsService.updateSecurityPolicies({
        enableAntiCheat,
        maxViolationWarnings,
        maintenanceMode,
        maintenanceEstimatedTime,
        maintenanceMessage,
        sessionTimeouts
      });

      // ✅ SYSTEM CONFIG AUDIT LOG - SECURITY SETTINGS UPDATED
      const changes = {};
      if (oldPolicies.enableAntiCheat !== enableAntiCheat) {
        changes.enableAntiCheat = { old: oldPolicies.enableAntiCheat, new: enableAntiCheat };
      }
      if (oldPolicies.maxViolationWarnings !== maxViolationWarnings) {
        changes.maxViolationWarnings = { old: oldPolicies.maxViolationWarnings, new: maxViolationWarnings };
      }
      if (oldPolicies.maintenanceMode !== maintenanceMode) {
        changes.maintenanceMode = { old: oldPolicies.maintenanceMode, new: maintenanceMode };
      }

      logAudit(auditLogService.logSystemConfig, {
        actorId: req.user?.uid || 'system',
        actorEmail: req.user?.email || 'system@langoora.com',
        action: 'settings_updated',
        settingType: 'security_policies',
        changes: changes,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
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

  // GET GLOBAL SETTINGS (NO AUDIT - READ ONLY)
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

  // SAVE GLOBAL SETTINGS - WITH AUDIT LOG
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

      if (creditPrice !== undefined && (creditPrice < 10 || creditPrice > 1000)) {
        return res.status(400).json({
          success: false,
          message: 'Credit price must be between LKR 10 and LKR 1000'
        });
      }

      if (signupBonus !== undefined && (signupBonus < 0 || signupBonus > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Signup bonus must be between 0 and 100 credits'
        });
      }

      if (platformCommission !== undefined && (platformCommission < 0 || platformCommission > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Platform commission must be between 0% and 100%'
        });
      }

      if (minPayoutThreshold !== undefined && (minPayoutThreshold < 100 || minPayoutThreshold > 100000)) {
        return res.status(400).json({
          success: false,
          message: 'Minimum payout threshold must be between LKR 100 and LKR 100,000'
        });
      }

      // Validate Email
      if (senderEmail && !isValidEmail(senderEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format'
        });
      }

      if (senderName && senderName.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Sender name must be 50 characters or less'
        });
      }

      // Get old config for comparison
      const oldConfig = await systemSettingsService.getGlobalConfig();

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

      // ✅ SYSTEM CONFIG AUDIT LOG - GLOBAL SETTINGS UPDATED
      const changes = {};
      const fieldsToTrack = ['creditPrice', 'signupBonus', 'platformCommission', 'minPayoutThreshold', 'senderEmail', 'senderName', 'showAnnouncement'];
      fieldsToTrack.forEach(field => {
        const oldVal = oldConfig[field];
        const newVal = req.body[field];
        if (oldVal !== newVal && newVal !== undefined) {
          changes[field] = { old: oldVal, new: newVal };
        }
      });

      logAudit(auditLogService.logSystemConfig, {
        actorId: req.user?.uid || 'system',
        actorEmail: req.user?.email || 'system@langoora.com',
        action: 'settings_updated',
        settingType: 'global_config',
        changes: changes,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
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

  // =============================================
  // 4. EXCHANGE RATE & PLATFORM COMMISSION ⭐
  // =============================================

  /**
   * ⭐ Get Both Exchange Rate & Platform Commission (NO AUDIT - READ ONLY)
   * GET /api/system-settings/rates
   */
  async getRates(req, res) {
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
   * Get Exchange Rate (creditPrice) Only (NO AUDIT - READ ONLY)
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
   * Get Platform Commission Only (NO AUDIT - READ ONLY)
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
   * Update Exchange Rate (creditPrice) - WITH AUDIT LOG
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
      const oldDoc = await docRef.get();
      const oldData = oldDoc.exists ? oldDoc.data() : { creditPrice: 5 };

      await docRef.update({
        creditPrice: Number(creditPrice),
        updatedAt: new Date().toISOString()
      });

      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();

      // ✅ SYSTEM CONFIG AUDIT LOG - EXCHANGE RATE UPDATED
      logAudit(auditLogService.logSystemConfig, {
        actorId: req.user?.uid || 'system',
        actorEmail: req.user?.email || 'system@langoora.com',
        action: 'commission_updated',
        settingType: 'exchange_rate',
        changes: {
          creditPrice: { old: oldData.creditPrice || 5, new: Number(creditPrice) }
        },
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

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
   * Update Platform Commission - WITH AUDIT LOG
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
      const oldDoc = await docRef.get();
      const oldData = oldDoc.exists ? oldDoc.data() : { platformCommission: 10 };

      await docRef.update({
        platformCommission: Number(platformCommission),
        updatedAt: new Date().toISOString()
      });

      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();

      // ✅ SYSTEM CONFIG AUDIT LOG - PLATFORM COMMISSION UPDATED
      logAudit(auditLogService.logSystemConfig, {
        actorId: req.user?.uid || 'system',
        actorEmail: req.user?.email || 'system@langoora.com',
        action: 'commission_updated',
        settingType: 'platform_commission',
        changes: {
          platformCommission: { old: oldData.platformCommission || 10, new: Number(platformCommission) }
        },
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

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

  // SEND TEST EMAIL (NO AUDIT - Just a test action)
  async sendTestEmail(req, res) {
    try {
      console.log('📧 sendTestEmail called with body:', req.body);

      const { senderEmail, senderName } = req.body;

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