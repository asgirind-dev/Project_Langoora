import axios from 'axios';

// Backend node API base endpoint mapping
const API_URL = 'http://localhost:5000/api/system-settings';

/**
 * 🌐 Get Global Configurations
 * Firebase එකෙන් Global Settings ගන්නවා
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
 * Global Settings Firebase එකට Save කරනවා
 */
export const saveGlobalConfig = async (configData) => {
  try {
    const response = await axios.post(`${API_URL}/global`, configData);
    return response.data.data;
  } catch (error) {
    console.error("Error saving global configurations:", error);
    throw error;
  }
};

/**
 * 📧 Send Test Email
 * Email configuration එක Test කරනවා
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
    throw error;
  }
};