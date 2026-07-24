// frontend/src/services/globalConfigService.js
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

// =============================================
// ⭐ NEW - EXCHANGE RATE & PLATFORM COMMISSION
// =============================================

/**
 * ⭐ Get Exchange Rate + Platform Commission එකට
 * GET /api/system-settings/rates
 */
export const getRates = async () => {
  try {
    const response = await axios.get(`${API_URL}/rates`);
    return response.data;
  } catch (error) {
    console.error("Error fetching rates:", error);
    throw error;
  }
};

/**
 * ⭐ Get Exchange Rate විතරක්
 * GET /api/system-settings/exchange-rate
 */
export const getExchangeRate = async () => {
  try {
    const response = await axios.get(`${API_URL}/exchange-rate`);
    return response.data;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    throw error;
  }
};

/**
 * ⭐ Get Platform Commission විතරක්
 * GET /api/system-settings/platform-commission
 */
export const getPlatformCommission = async () => {
  try {
    const response = await axios.get(`${API_URL}/platform-commission`);
    return response.data;
  } catch (error) {
    console.error("Error fetching platform commission:", error);
    throw error;
  }
};

/**
 * ⭐ Update Exchange Rate (creditPrice)
 * PUT /api/system-settings/exchange-rate
 */
export const updateExchangeRate = async (creditPrice) => {
  try {
    const response = await axios.put(`${API_URL}/exchange-rate`, { creditPrice });
    return response.data;
  } catch (error) {
    console.error("Error updating exchange rate:", error);
    throw error;
  }
};

/**
 * ⭐ Update Platform Commission
 * PUT /api/system-settings/platform-commission
 */
export const updatePlatformCommission = async (platformCommission) => {
  try {
    const response = await axios.put(`${API_URL}/platform-commission`, { platformCommission });
    return response.data;
  } catch (error) {
    console.error("Error updating platform commission:", error);
    throw error;
  }
};