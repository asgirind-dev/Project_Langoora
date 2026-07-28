// backend/controllers/systemSettingsController.js
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

// ✅ DEFAULT FALLBACK VALUES - When Firestore quota is exceeded
const DEFAULT_GLOBAL_CONFIG = {
  creditPrice: 5,
  signupBonus: 10,
  platformCommission: 10,
  minPayoutThreshold: 5000,
  senderEmail: 'noreply@langoora.com',
  senderName: 'Langoora',
  showAnnouncement: false,
  announcementText: '',
  announcementColor: 'blue'
};

const DEFAULT_SECURITY_POLICIES = {
  enableAntiCheat: true,
  maxViolationWarnings: 3,
  maintenanceMode: false,
  maintenanceEstimatedTime: '',
  maintenanceMessage: '',
  sessionTimeouts: 3600
};

const DEFAULT_BANNERS = [];

class SystemSettingsController {
  // =============================================
  // 1. HOMEPAGE CMS - HERO BANNERS
  // =============================================

  // GET BANNERS (NO AUDIT - READ ONLY)
  // ✅ FIXED: Returns fallback values when Firestore quota exceeded
  async getBanners(req, res) {
    try {
      const banners = await systemSettingsService.getHeroBanners();
      return res.status(200).json({ success: true, data: banners || DEFAULT_BANNERS });
    } catch (error) {
      console.error("❌ Error in getBanners:", error.message);
      // ✅ Return fallback values instead of 500 error
      return res.status(200).json({
        success: true,
        data: DEFAULT_BANNERS,
        _note: 'Using fallback values (Firestore quota exceeded)'
      });
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
      let oldBanners = [];
      try {
        oldBanners = await systemSettingsService.getHeroBanners();
      } catch (err) {
        console.warn('⚠️ Could not fetch old banners:', err.message);
        oldBanners = [];
      }

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
      console.error("❌ Error in saveBanners:", error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // =============================================
  // 2. GOVERNANCE & SECURITY
  // =============================================

  // GET SECURITY SETTINGS (NO AUDIT - READ ONLY)
  // ✅ FIXED: Returns fallback values when Firestore quota exceeded
  async getSecuritySettings(req, res) {
    try {
      const policies = await systemSettingsService.getSecurityPolicies();
      return res.status(200).json({
        success: true,
        data: policies || DEFAULT_SECURITY_POLICIES
      });
    } catch (error) {
      console.error("❌ Error in getSecuritySettings:", error.message);
      // ✅ Return fallback values instead of 500 error
      return res.status(200).json({
        success: true,
        data: DEFAULT_SECURITY_POLICIES,
        _note: 'Using fallback values (Firestore quota exceeded)'
      });
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
      let oldPolicies = DEFAULT_SECURITY_POLICIES;
      try {
        oldPolicies = await systemSettingsService.getSecurityPolicies();
      } catch (err) {
        console.warn('⚠️ Could not fetch old policies:', err.message);
        oldPolicies = DEFAULT_SECURITY_POLICIES;
      }

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
      console.error("❌ Error in saveSecuritySettings:", error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // =============================================
  // 3. GLOBAL CONFIGURATIONS
  // =============================================

  // GET GLOBAL SETTINGS (NO AUDIT - READ ONLY)
  // ✅ FIXED: Returns fallback values when Firestore quota exceeded
  async getGlobalSettings(req, res) {
    try {
      const config = await systemSettingsService.getGlobalConfig();
      return res.status(200).json({
        success: true,
        data: config || DEFAULT_GLOBAL_CONFIG
      });
    } catch (error) {
      console.error("❌ Error in getGlobalSettings:", error.message);
      // ✅ Return fallback values instead of 500 error
      return res.status(200).json({
        success: true,
        data: DEFAULT_GLOBAL_CONFIG,
        _note: 'Using fallback values (Firestore quota exceeded)'
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
      let oldConfig = DEFAULT_GLOBAL_CONFIG;
      try {
        oldConfig = await systemSettingsService.getGlobalConfig();
      } catch (err) {
        console.warn('⚠️ Could not fetch old config:', err.message);
        oldConfig = DEFAULT_GLOBAL_CONFIG;
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
      console.error("❌ Error in saveGlobalSettings:", error.message);
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
   * ✅ FIXED: Returns fallback values when Firestore quota exceeded
   */
  async getRates(req, res) {
    try {
      const docRef = db.collection('system_settings').doc('global_config');
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(200).json({
          success: true,
          data: {
            exchangeRate: DEFAULT_GLOBAL_CONFIG.creditPrice,
            platformCommission: DEFAULT_GLOBAL_CONFIG.platformCommission,
            minPayoutThreshold: DEFAULT_GLOBAL_CONFIG.minPayoutThreshold,
            signupBonus: DEFAULT_GLOBAL_CONFIG.signupBonus,
            currency: 'LKR',
            _note: 'Using default values (config not found)'
          }
        });
      }

      const data = docSnap.data();

      res.status(200).json({
        success: true,
        data: {
          exchangeRate: data.creditPrice || DEFAULT_GLOBAL_CONFIG.creditPrice,
          platformCommission: data.platformCommission || DEFAULT_GLOBAL_CONFIG.platformCommission,
          minPayoutThreshold: data.minPayoutThreshold || DEFAULT_GLOBAL_CONFIG.minPayoutThreshold,
          signupBonus: data.signupBonus || DEFAULT_GLOBAL_CONFIG.signupBonus,
          currency: 'LKR'
        }
      });
    } catch (error) {
      console.error('❌ Error fetching rates:', error.message);
      // ✅ Return fallback values instead of 500 error
      res.status(200).json({
        success: true,
        data: {
          exchangeRate: DEFAULT_GLOBAL_CONFIG.creditPrice,
          platformCommission: DEFAULT_GLOBAL_CONFIG.platformCommission,
          minPayoutThreshold: DEFAULT_GLOBAL_CONFIG.minPayoutThreshold,
          signupBonus: DEFAULT_GLOBAL_CONFIG.signupBonus,
          currency: 'LKR',
          _note: 'Using fallback values (Firestore quota exceeded)'
        }
      });
    }
  }

  /**
   * Get Exchange Rate (creditPrice) Only (NO AUDIT - READ ONLY)
   * GET /api/system-settings/exchange-rate
   * ✅ FIXED: Returns fallback values when Firestore quota exceeded
   */
  async getExchangeRate(req, res) {
    try {
      const docRef = db.collection('system_settings').doc('global_config');
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(200).json({
          success: true,
          data: {
            exchangeRate: DEFAULT_GLOBAL_CONFIG.creditPrice,
            currency: 'LKR',
            _note: 'Using default values (config not found)'
          }
        });
      }

      const data = docSnap.data();
      const creditPrice = data.creditPrice || DEFAULT_GLOBAL_CONFIG.creditPrice;

      res.status(200).json({
        success: true,
        data: {
          exchangeRate: creditPrice,
          currency: 'LKR'
        }
      });
    } catch (error) {
      console.error('❌ Error fetching exchange rate:', error.message);
      res.status(200).json({
        success: true,
        data: {
          exchangeRate: DEFAULT_GLOBAL_CONFIG.creditPrice,
          currency: 'LKR',
          _note: 'Using fallback values (Firestore quota exceeded)'
        }
      });
    }
  }

  /**
   * Get Platform Commission Only (NO AUDIT - READ ONLY)
   * GET /api/system-settings/platform-commission
   * ✅ FIXED: Returns fallback values when Firestore quota exceeded
   */
  async getPlatformCommission(req, res) {
    try {
      const docRef = db.collection('system_settings').doc('global_config');
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(200).json({
          success: true,
          data: {
            platformCommission: DEFAULT_GLOBAL_CONFIG.platformCommission,
            _note: 'Using default values (config not found)'
          }
        });
      }

      const data = docSnap.data();
      const platformCommission = data.platformCommission || DEFAULT_GLOBAL_CONFIG.platformCommission;

      res.status(200).json({
        success: true,
        data: {
          platformCommission: platformCommission
        }
      });
    } catch (error) {
      console.error('❌ Error fetching platform commission:', error.message);
      res.status(200).json({
        success: true,
        data: {
          platformCommission: DEFAULT_GLOBAL_CONFIG.platformCommission,
          _note: 'Using fallback values (Firestore quota exceeded)'
        }
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
      let oldDoc;
      try {
        oldDoc = await docRef.get();
      } catch (err) {
        console.warn('⚠️ Could not fetch old document:', err.message);
        oldDoc = { exists: false, data: () => ({ creditPrice: DEFAULT_GLOBAL_CONFIG.creditPrice }) };
      }
      const oldData = oldDoc.exists ? oldDoc.data() : { creditPrice: DEFAULT_GLOBAL_CONFIG.creditPrice };

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
          creditPrice: { old: oldData.creditPrice || DEFAULT_GLOBAL_CONFIG.creditPrice, new: Number(creditPrice) }
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
      console.error('❌ Error updating exchange rate:', error.message);
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
      let oldDoc;
      try {
        oldDoc = await docRef.get();
      } catch (err) {
        console.warn('⚠️ Could not fetch old document:', err.message);
        oldDoc = { exists: false, data: () => ({ platformCommission: DEFAULT_GLOBAL_CONFIG.platformCommission }) };
      }
      const oldData = oldDoc.exists ? oldDoc.data() : { platformCommission: DEFAULT_GLOBAL_CONFIG.platformCommission };

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
          platformCommission: { old: oldData.platformCommission || DEFAULT_GLOBAL_CONFIG.platformCommission, new: Number(platformCommission) }
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
      console.error('❌ Error updating platform commission:', error.message);
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
      console.error("❌ Error in sendTestEmail:", error.message);
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