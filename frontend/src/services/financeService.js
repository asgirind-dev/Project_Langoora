// frontend/src/services/financeService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

class FinanceService {
  async getDashboardStats() {
    try {
      const response = await axios.get(
        `${API_URL}/finance/stats`,
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return null;
    }
  }

  async getRecentTransactions() {
    try {
      const response = await axios.get(
        `${API_URL}/finance/transactions`,
        getAuthConfig()
      );
      return response.data || [];
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      return [];
    }
  }

  async getAllTransactions() {
    try {
      const response = await axios.get(
        `${API_URL}/finance/all-transactions`,
        getAuthConfig()
      );
      return response.data || [];
    } catch (error) {
      console.error('Error fetching all transactions:', error);
      return [];
    }
  }

  async getRevenueChartData() {
    try {
      const response = await axios.get(
        `${API_URL}/finance/revenue-chart`,
        getAuthConfig()
      );
      return response.data || [];
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return [];
    }
  }

  async getActiveUsers() {
    try {
      const response = await axios.get(
        `${API_URL}/finance/active-users`,
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching active users:', error);
      return { count: 0 };
    }
  }

  // ============================================
  // ⭐ NEW: Get all tutors with tokens from purchased_exams
  // ============================================
  async getTutorsTokens() {
    try {
      const response = await axios.get(`${API_URL}/tutors-tokens`, getAuthConfig());
      console.log('📊 API Response (tutors-tokens):', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching tutors tokens:', error);
      throw error;
    }
  }

  // ============================================
  // ⭐ NEW: Get single tutor tokens
  // ============================================
  async getTutorTokens(tutorId) {
    try {
      const response = await axios.get(`${API_URL}/tutor-tokens/${tutorId}`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching tutor tokens for ${tutorId}:`, error);
      throw error;
    }
  }
}

export default new FinanceService();