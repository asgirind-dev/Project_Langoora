const { db } = require('../config/firebase');

class SystemSettingsService {
  // 1. Fetch all banners from the sub-collection
  async getHeroBanners() {
    try {
      const bannersSnapshot = await db.collection('system_settings')
                                      .doc('homepage_cms')
                                      .collection('hero_banners')
                                      .orderBy('id', 'asc')
                                      .get();
      
      const banners = [];
      bannersSnapshot.forEach(doc => {
        banners.push(doc.data());
      });
      
      return banners;
    } catch (error) {
      console.error("Error in getHeroBanners Sub-service:", error);
      throw error;
    }
  }

  // 2. Save banners by creating individual documents inside sub-collection
  async updateHeroBanners(bannersArray) {
    try {
      const bannersRef = db.collection('system_settings')
                           .doc('homepage_cms')
                           .collection('hero_banners');
      
      // 🎯 පැරණි බැනර්ස් ටික මුලින්ම sub-collection එකෙන් අයින් කරනවා (Clean Slate)
      const currentBanners = await bannersRef.get();
      const batch = db.batch();
      currentBanners.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // 🎯 අලුත් බැනර්ස් ටික තනි තනි document එක බැගින් ලියනවා (1MB limit safely bypassed!)
      const saveBatch = db.batch();
      bannersArray.forEach(banner => {
        // banner.id එකම document name එක විදිහට ගන්නවා string එකක් කරලා
        const docRef = bannersRef.doc(String(banner.id));
        saveBatch.set(docRef, banner);
      });
      await saveBatch.commit();
      
      return bannersArray;
    } catch (error) {
      console.error("Error in updateHeroBanners Sub-service:", error);
      throw error;
    }
  }
}

module.exports = new SystemSettingsService();