// backend/services/systemSettingsService.js
const { db } = require('../config/firebase');
const nodemailer = require('nodemailer');
const emailService = require('./emailService');

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
      const docRef = db.collection('system_settings').doc('global_config');
      
      // ✅ Validate and sanitize senderName
      let senderName = configData.senderName || 'Langoora';
      
      // Validate senderName - enforce limits and clean
      if (senderName.length < 2) senderName = 'Langoora';
      if (senderName.length > 50) senderName = senderName.substring(0, 50);
      
      // Allow only letters, numbers, spaces, dots, and hyphens
      // Remove any special characters that could break email headers
      senderName = senderName.replace(/[^a-zA-Z0-9\s\.\-]/g, '');
      
      // If empty after cleaning, use default
      if (!senderName.trim()) senderName = 'Langoora';
      
      // Capitalize each word properly (optional)
      senderName = senderName.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      // ✅ Validate senderEmail
      let senderEmail = configData.senderEmail || 'noreply@langoora.com';
      if (!this.isValidEmail(senderEmail)) {
        senderEmail = 'noreply@langoora.com';
      }

      const payload = {
        creditPrice: Number(configData.creditPrice || 50),
        signupBonus: Number(configData.signupBonus || 10),
        platformCommission: Number(configData.platformCommission || 20),
        minPayoutThreshold: Number(configData.minPayoutThreshold || 5000),
        senderEmail: senderEmail,
        senderName: senderName,  // ✅ Now fully configurable with validation
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
      throw error;
    }
  }

  async sendTestEmail(senderEmail, senderName) {
    try {
      // Use emailService to send test email
      const result = await emailService.sendTestEmail(
        process.env.ADMIN_EMAIL || 'admin@langoora.com',
        senderEmail,
        senderName
      );
      return result;
    } catch (error) {
      console.error("Error sending test email:", error);
      throw new Error('Failed to send test email: ' + error.message);
    }
  }

  // =============================================
  // 4. HELPER METHODS
  // =============================================

  /**
   * Validate email address format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate sender name format
   */
  isValidSenderName(name) {
    if (!name || name.length < 2 || name.length > 50) return false;
    // Allow letters, numbers, spaces, dots, hyphens
    const nameRegex = /^[a-zA-Z0-9\s\.\-]+$/;
    return nameRegex.test(name);
  }

  /**
   * Sanitize sender name for safe email headers
   */
  sanitizeSenderName(name) {
    if (!name) return 'Langoora';
    
    // Remove any special characters that could break email headers
    let clean = name.replace(/[^a-zA-Z0-9\s\.\-]/g, '');
    
    // Trim extra spaces
    clean = clean.replace(/\s+/g, ' ').trim();
    
    // Capitalize each word
    clean = clean.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Ensure minimum length
    if (clean.length < 2) clean = 'Langoora';
    
    // Truncate if too long
    if (clean.length > 50) clean = clean.substring(0, 50);
    
    return clean;
  }

  /**
   * Get email sender info with validation
   */
  getSenderInfo() {
    const senderName = this.sanitizeSenderName(this.config?.senderName || 'Langoora');
    const senderEmail = this.config?.senderEmail || 'noreply@langoora.com';
    return `${senderName} <${senderEmail}>`;
  }
}

module.exports = new SystemSettingsService();