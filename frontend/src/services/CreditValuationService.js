import axios from 'axios';

// Backend Credit Valuation API Base URL
const API_URL = 'http://localhost:5000/api/credit-values';

const getAuthConfig = () => ({
  headers: { 
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json' 
  }
});

class CreditValuationService {
  // 1. Get all exam categories & sub-levels
  async getCategories() {
    try {
      const response = await axios.get(`${API_URL}/categories`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error fetching credit categories:", error);
      throw error;
    }
  }

  // 2. Update credits for a specific level inside a category
  async updateLevelCredits(categoryId, levelId, credits) {
    try {
      const response = await axios.put(
        `${API_URL}/categories/${categoryId}/levels/${levelId}/credits`, 
        { credits }, 
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error("Error updating level credits:", error);
      throw error;
    }
  }

  // 3. Update credits for a simple category (without sub-levels)
  async updateCategoryCredits(categoryId, credits) {
    try {
      const response = await axios.put(
        `${API_URL}/categories/${categoryId}/credits`, 
        { credits }, 
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error("Error updating category credits:", error);
      throw error;
    }
  }

  // 4. Get history of credit rate changes
  async getCreditHistory() {
    try {
      const response = await axios.get(`${API_URL}/credit-history`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error fetching credit history:", error);
      throw error;
    }
  }

  // 5. Clear history logs
  async clearCreditHistory() {
    try {
      const response = await axios.delete(`${API_URL}/credit-history`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error clearing history:", error);
      throw error;
    }
  }
}

// ✅ ES Module Export for Frontend (Vite)
export default new CreditValuationService();