// frontend/src/services/globalConfigService.js
import axios from 'axios';

// Backend node API base endpoint mapping
const API_URL = 'http://localhost:5000/api/system-settings';

/**
 * 🌐 Get Global Configurations
 */
export const fetchGlobalConfig = async () => {
  try {
    const response = await axios.get(`${API_URL}/global`);
    return response.data.data || null;
  } catch (error) {
    console.error("Error fetching global configurations:", error);
    throw error;
  }
};

/**
 * 💾 Save Global Configurations
 */
export const saveGlobalConfig = async (configData) => {
  try {
    console.log('📤 Sending global config:', configData);
    
    const response = await axios.post(`${API_URL}/global`, configData);
    
    console.log('📥 Response:', response.data);
    
    // ✅ Return the full response object, not just response.data.data
    // The backend returns: { success: true, message: '...', data: updatedConfig }
    // So we need to return the whole response.data
    return response.data;
  } catch (error) {
    console.error("Error saving global configurations:", error);
    console.error("Response error:", error.response?.data);
    throw error;
  }
};

/**
 * 📧 Send Test Email
 */
export const sendTestEmail = async (senderEmail, senderName) => {
  try {
    const response = await axios.post(`${API_URL}/test-email`, {
      senderEmail,
      senderName
    });
    return response.data;
  } catch (error) {
    console.error("Error sending test email:", error);
    console.error("Response error:", error.response?.data);
    throw error;
  }
};