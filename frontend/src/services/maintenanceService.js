// frontend/src/services/maintenanceService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const maintenanceService = {
  // Check maintenance status
  async checkMaintenanceStatus() {
    try {
      const response = await axios.get(`${API_URL}/system-settings/security`);
      return response.data?.data?.maintenanceMode || false;
    } catch (error) {
      console.error('Error checking maintenance status:', error);
      return false;
    }
  },

  // ✅ Get maintenance details (time, message, etc.)
  async getMaintenanceDetails() {
    try {
      const response = await axios.get(`${API_URL}/system-settings/security`);
      const data = response.data?.data || {};
      return {
        isMaintenance: data.maintenanceMode || false,
        estimatedTime: data.maintenanceEstimatedTime || null,
        message: data.maintenanceMessage || ''
      };
    } catch (error) {
      console.error('Error fetching maintenance details:', error);
      return {
        isMaintenance: false,
        estimatedTime: null,
        message: ''
      };
    }
  },

  // Toggle maintenance mode (admin only)
  async toggleMaintenanceMode(enabled, estimatedTime, message) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/system-settings/security`,
        { 
          maintenanceMode: enabled,
          maintenanceEstimatedTime: estimatedTime || null,
          maintenanceMessage: message || ''
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      throw error;
    }
  }
};

export default maintenanceService;