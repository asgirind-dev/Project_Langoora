import axios from 'axios';

// Backend Finance API Base URL
const API_URL = 'http://localhost:5000/api/finance';

const getAuthConfig = () => ({
  headers: { 
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json' 
  }
});

class FinanceService {
  // 1. Get Dashboard Summary Cards Data
  async getDashboardStats() {
    try {
      const response = await axios.get(`${API_URL}/stats`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error fetching finance stats:", error);
      throw error;
    }
  }

  // 2. Get Recent 5 Transactions for Overview Page
  async getRecentTransactions() {
    try {
      const response = await axios.get(`${API_URL}/transactions`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      throw error;
    }
  }

  // 3. Get All Transactions for Ledger Audit Page (with Fixed Email)
  async getAllTransactions() {
    try {
      const response = await axios.get(`${API_URL}/all-transactions`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error fetching all transactions:", error);
      throw error;
    }
  }

  // 4. Get Revenue Chart Data
  async getRevenueChartData() {
    try {
      const response = await axios.get(`${API_URL}/revenue-chart`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error fetching revenue chart data:", error);
      throw error;
    }
  }
}

// ✅ ES Module Export for Frontend (Vite)
export default new FinanceService();