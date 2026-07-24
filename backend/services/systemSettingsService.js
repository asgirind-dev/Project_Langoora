// backend/services/systemSettingsService.js
const { db } = require('../config/firebase');
const nodemailer = require('nodemailer');
const emailService = require('./emailService');

// ✅ Helper function for email validation
function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

class SystemSettingsService {
  // =============================================
  // 1. HOMEPAGE CMS - HERO BANNERS
  // =============================================

  async getHeroBanners() {
    try {
      const bannersSnapshot = await db.collection('system_settings')
                                      .doc('homepage_cms')
                                      .collection('hero_banners')
                                      .orderBy('id', 'asc')
                                      .get();
      const banners = [];
      bannersSnapshot.forEach(doc => banners.push(doc.data()));
      return banners;
    } catch (error) {
      console.error("Error in getHeroBanners:", error);
      throw error;
    }
  }

  async updateHeroBanners(bannersArray) {
    try {
      const bannersRef = db.collection('system_settings')
                           .doc('homepage_cms')
                           .collection('hero_banners');
      
      const currentBanners = await bannersRef.get();
      const batch = db.batch();
      currentBanners.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      const saveBatch = db.batch();
      bannersArray.forEach(banner => {
        const docRef = bannersRef.doc(String(banner.id));
        saveBatch.set(docRef, banner);
      });
      await saveBatch.commit();

      return this.getHeroBanners();
    } catch (error) {
      console.error("Error in updateHeroBanners:", error);
      throw error;
    }
  }

  // =============================================
  // 2. GOVERNANCE & SECURITY
  // =============================================

  async getSecurityPolicies() {
    try {
      const doc = await db.collection('system_settings').doc('security_governance').get();
      if (!doc.exists) {
        return {
          enableAntiCheat: true,
          maxViolationWarnings: 3,
          maintenanceMode: false,
          sessionTimeouts: { admin: 15, tutor: 20, student: 45, finance: 10, validator: 15 }
        };
      }
      return doc.data();
    } catch (error) {
      console.error("Error in getSecurityPolicies:", error);
      throw error;
    }
  }

  async updateSecurityPolicies(policyData) {
    try {
      const docRef = db.collection('system_settings').doc('security_governance');
      const payload = {
        enableAntiCheat: Boolean(policyData.enableAntiCheat),
        maxViolationWarnings: Number(policyData.maxViolationWarnings || 3),
        maintenanceMode: Boolean(policyData.maintenanceMode),
        sessionTimeouts: policyData.sessionTimeouts || { admin: 15, tutor: 20, student: 45, finance: 10, validator: 15 },
        updatedAt: new Date().toISOString()
      };
      await docRef.set(payload, { merge: true });
      return payload;
    } catch (error) {
      console.error("Error in updateSecurityPolicies:", error);
      throw error;
    }
  }

  // =============================================
  // 3. GLOBAL CONFIGURATIONS
  // =============================================

  async getGlobalConfig() {
    try {
      const doc = await db.collection('system_settings').doc('global_config').get();
      
      if (!doc.exists) {
        return {
          creditPrice: 50,
          signupBonus: 10,
          platformCommission: 20,
          minPayoutThreshold: 5000,
          senderEmail: 'noreply@langoora.com',
          senderName: 'Langoora',
          showAnnouncement: false,
          announcementText: '',
          announcementColor: 'amber',
          updatedAt: new Date().toISOString()
        };
      }
      
      return doc.data();
    } catch (error) {
      console.error("Error in getGlobalConfig:", error);
      throw error;
    }
  }

  async updateGlobalConfig(configData) {
    try {
      console.log('📝 updateGlobalConfig called with:', configData);
      
      const docRef = db.collection('system_settings').doc('global_config');
      
      // Validate and sanitize senderName
      let senderName = configData.senderName || 'Langoora';
      
      if (senderName.length < 2) senderName = 'Langoora';
      if (senderName.length > 50) senderName = senderName.substring(0, 50);
      senderName = senderName.replace(/[^a-zA-Z0-9\s\.\-]/g, '');
      if (!senderName.trim()) senderName = 'Langoora';
      senderName = senderName.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      // ✅ Validate senderEmail using helper function
      let senderEmail = configData.senderEmail || 'noreply@langoora.com';
      if (!isValidEmail(senderEmail)) {
        senderEmail = 'noreply@langoora.com';
      }

      const payload = {
        creditPrice: Number(configData.creditPrice || 50),
        signupBonus: Number(configData.signupBonus || 10),
        platformCommission: Number(configData.platformCommission || 20),
        minPayoutThreshold: Number(configData.minPayoutThreshold || 5000),
        senderEmail: senderEmail,
        senderName: senderName,
        showAnnouncement: Boolean(configData.showAnnouncement),
        announcementText: configData.announcementText || '',
        announcementColor: configData.announcementColor || 'amber',
        updatedAt: new Date().toISOString()
      };

      await docRef.set(payload, { merge: true });
      
      console.log('✅ Global config updated successfully!');
      console.log(`   Sender: ${senderName} <${senderEmail}>`);
      
      return payload;
    } catch (error) {
      console.error("Error in updateGlobalConfig:", error);
      console.error("Stack:", error.stack);
      throw error;
    }
  }

  async sendTestEmail(senderEmail, senderName) {
    try {
      console.log('📧 sendTestEmail called with:', { senderEmail, senderName });
      
      // Use emailService to send test email
      const result = await emailService.sendTestEmail(
        process.env.ADMIN_EMAIL || 'admin@langoora.com',
        senderEmail,
        senderName
      );
      
      console.log('✅ Test email result:', result);
      return result;
    } catch (error) {
      console.error("Error sending test email:", error);
      console.error("Stack:", error.stack);
      throw new Error('Failed to send test email: ' + error.message);
    }
  }
}

module.exports = new SystemSettingsService();