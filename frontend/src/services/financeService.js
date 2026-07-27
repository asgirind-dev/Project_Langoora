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
  // ⭐ FIXED: Get all tutors with tokens
  // ============================================
  async getTutorsTokens() {
    try {
      // ✅ නිවැරදි endpoint එකට change කළා
      const response = await axios.get(`${API_URL}/payout/active-tutors`, getAuthConfig());
      console.log('📊 Tutors response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching tutors:', error);
      throw error;
    }
  }

  // ============================================
  // ⭐ NEW: Get tutor tokens (specific tutor)
  // ============================================
  async getTutorTokens(tutorId) {
    try {
      // ✅ නිවැරදි endpoint එක
      const response = await axios.get(`${API_URL}/payout/tokens/${tutorId}`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching tutor tokens for ${tutorId}:`, error);
      throw error;
    }
  }

  // ============================================
  // ⭐ NEW: Get tutor tokens for logged in tutor
  // ============================================
  async getMyTutorTokens() {
    try {
      // ✅ Logged in tutor ගේ tokens
      const response = await axios.get(`${API_URL}/payout/tokens`, getAuthConfig());
      console.log('📊 My tokens:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching my tokens:', error);
      throw error;
    }
  }

  // ============================================
  // ⭐ NEW: Get tutor earnings history
  // ============================================
  async getTutorEarningsHistory() {
    try {
      const response = await axios.get(`${API_URL}/payout/earnings-history`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching earnings history:', error);
      throw error;
    }
  }

  // ============================================
  // ⭐ NEW: Get tutor details with bank info
  // ============================================
  async getTutorDetails() {
    try {
      const response = await axios.get(`${API_URL}/payout/details`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching tutor details:', error);
      throw error;
    }
  }
}

export default new FinanceService();