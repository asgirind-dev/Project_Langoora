// frontend/src/services/financeService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/finance';

const getAuthConfig = () => ({
  headers: { 
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json' 
  }
});

class FinanceService {
  
  async getDashboardStats() {
    const response = await axios.get(`${API_URL}/stats`, getAuthConfig());
    return response.data;
  }

  async getRecentTransactions() {
    const response = await axios.get(`${API_URL}/transactions`, getAuthConfig());
    return response.data;
  }

  async getRevenueChartData() {
    const response = await axios.get(`${API_URL}/revenue-chart`, getAuthConfig());
    return response.data;
  }

  async getActiveUsers() {
    const response = await axios.get(`${API_URL}/active-users`, getAuthConfig());
    return response.data;
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