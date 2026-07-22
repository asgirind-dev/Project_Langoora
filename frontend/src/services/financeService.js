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

  // 🎯 Added method for Transaction Ledger
  async getAllTransactions() {
    const response = await axios.get(`${API_URL}/all-transactions`, getAuthConfig());
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
}

export default new FinanceService();