import axios from 'axios';

// Backend node API base endpoint mapping
const API_URL = 'http://localhost:5000/api/system-settings';

/**
 * Firestore එකෙන් දැනට තියෙන සියලුම බැනර්ස් Fetch කිරීම
 */
export const fetchHeroBanners = async () => {
  try {
    const response = await axios.get(`${API_URL}/banners`);
    // Backend controller එකෙන් { success: true, data: [...] } විදිහට එන හින්දා
    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching banners from node backend:", error);
    throw error;
  }
};

/**
 * 🎯 Base64 Banners array එක backend එක හරහා Firestore එකේ සේව් කිරීම
 * මෙතනදී සර්වර් එකෙන් collection එක auto-create කරගන්නවා මචන්!
 */
export const saveHeroBanners = async (bannersList) => {
  try {
    const response = await axios.post(`${API_URL}/banners`, { banners: bannersList });
    return response.data.data;
  } catch (error) {
    console.error("Error saving banners via node backend:", error);
    throw error;
  }
};