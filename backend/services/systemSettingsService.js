const { db } = require('../config/firebase');
const nodemailer = require('nodemailer');

class SystemSettingsService {
  // =============================================
  // 1. HOMEPAGE CMS - HERO BANNERS
  // =============================================

  // 1.1 Fetch all banners from sub-collection
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
      console.error("Error in getHeroBanners Sub-service:", error);
      throw error;
    }
  }

  // 1.2 Save banners safely
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
      console.error("Error in updateHeroBanners Sub-service:", error);
      throw error;
    }
  }

  // =============================================
  // 2. GOVERNANCE & SECURITY
  // =============================================

  // 2.1 Fetch Complete Governance Settings Node Matrix
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
      console.error("Error in getSecurityPolicies service:", error);
      throw error;
    }
  }

  // 2.2 Commit Complete Governance, Timeouts & Maintenance Mode Structure
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
      console.error("Error in updateSecurityPolicies service:", error);
      throw error;
    }
  }

  // =============================================
  // 3. GLOBAL CONFIGURATIONS
  // =============================================

  // 3.1 Get Global Configurations
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
          senderName: 'Langoora',              // ← "Langoora" විතරයි!
          showAnnouncement: false,
          announcementText: '',
          announcementColor: 'amber',
          updatedAt: new Date().toISOString()
        };
      }
      
      return doc.data();
    } catch (error) {
      console.error("Error in getGlobalConfig service:", error);
      throw error;
    }
  }

  // 3.2 Update Global Configurations
  async updateGlobalConfig(configData) {
    try {
      const docRef = db.collection('system_settings').doc('global_config');
      
      const payload = {
        creditPrice: Number(configData.creditPrice || 50),
        signupBonus: Number(configData.signupBonus || 10),
        platformCommission: Number(configData.platformCommission || 20),
        minPayoutThreshold: Number(configData.minPayoutThreshold || 5000),
        senderEmail: configData.senderEmail || 'noreply@langoora.com',
        senderName: 'Langoora',              // ← "Langoora" විතරයි! (User input ignore)
        showAnnouncement: Boolean(configData.showAnnouncement),
        announcementText: configData.announcementText || '',
        announcementColor: configData.announcementColor || 'amber',
        updatedAt: new Date().toISOString()
      };

      await docRef.set(payload, { merge: true });
      
      return payload;
    } catch (error) {
      console.error("Error in updateGlobalConfig service:", error);
      throw error;
    }
  }

  // 3.3 Send Test Email
  async sendTestEmail(senderEmail, senderName) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true' || false,
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD
        }
      });

      // ⚠️ Important: From name එක "Langoora" විතරයි! (Quotes නැහැ!)
      const mailOptions = {
        from: `Langoora <${senderEmail}>`,    // ← "Langoora" විතරයි!
        to: process.env.ADMIN_EMAIL || 'admin@langoora.com',
        subject: '✅ Langoora - Email Configuration Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0e1a; color: #e0e0e0; border-radius: 12px;">
            <h2 style="color: #60a5fa; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">✅ Email Configuration Test</h2>
            <p style="color: #94a3b8;">If you're seeing this email, your email settings are working correctly!</p>
            <div style="background: #1e293b; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong style="color: #60a5fa;">Sender:</strong> Langoora</p>
              <p><strong style="color: #60a5fa;">Email:</strong> ${senderEmail}</p>
              <p><strong style="color: #60a5fa;">Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}</p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #1e293b; padding-top: 10px;">This is an automated test email from Langoora CBT Platform.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      
      return { 
        success: true, 
        message: 'Test email sent successfully!',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error sending test email:", error);
      throw new Error('Failed to send test email: ' + error.message);
    }
  }
}

module.exports = new SystemSettingsService();