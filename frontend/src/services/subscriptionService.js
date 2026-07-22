import axios from 'axios';

// Backend URL එක
const BASE_URL = 'http://localhost:5000/api';

const getAuthConfig = () => ({
  headers: { 
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json' 
  }
});

class SubscriptionService {
  // ===== 1. SUBSCRIPTION PLANS =====
  async getAllPlans() {
    const response = await axios.get(`${BASE_URL}/subscription-plans`, getAuthConfig());
    return response.data;
  }

  async createNewPlan(planData) {
    const response = await axios.post(`${BASE_URL}/subscription-plans`, planData, getAuthConfig());
    return response.data;
  }

  async updateExistingPlan(id, planData) {
    const response = await axios.put(`${BASE_URL}/subscription-plans/${id}`, planData, getAuthConfig());
    return response.data;
  }

  async deleteExistingPlan(id) {
    const response = await axios.delete(`${BASE_URL}/subscription-plans/${id}`, getAuthConfig());
    return response.data;
  }

  // ===== 2. EXAM CREDIT RATES =====
  async getAllCategories() {
    const response = await axios.get(`${BASE_URL}/exam-credits/categories`, getAuthConfig());
    return response.data;
  }

  async updateCategoryCredits(categoryId, levelId, data) {
    const response = await axios.put(`${BASE_URL}/exam-credits/categories/${categoryId}/levels/${levelId}/credits`, data, getAuthConfig());
    return response.data;
  }

  async updateCategoryCreditsDirect(id, data) {
    const response = await axios.put(`${BASE_URL}/exam-credits/categories/${id}/credits`, data, getAuthConfig());
    return response.data;
  }

  async getCreditHistory() {
    const response = await axios.get(`${BASE_URL}/exam-credits/history`, getAuthConfig());
    return response.data;
  }

  async clearCreditHistory() {
    const response = await axios.delete(`${BASE_URL}/exam-credits/history`, getAuthConfig());
    return response.data;
  }
}

export default new SubscriptionService();