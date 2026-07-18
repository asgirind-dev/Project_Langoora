const { db } = require('../config/firebase');

class SystemSettingsService {
  // 1. Fetch all banners from sub-collection
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

  // 2. Save banners safely
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

  // 🎯 UPDATED: Fetch Complete Governance Settings Node Matrix
  async getSecurityPolicies() {
    try {
      const doc = await db.collection('system_settings').doc('security_governance').get();
      if (!doc.exists) {
        // Fallback default setup payload configuration mapping
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

  // 🎯 UPDATED: Commit Complete Governance, Timeouts & Maintenance Mode Structure
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
}

module.exports = new SystemSettingsService();