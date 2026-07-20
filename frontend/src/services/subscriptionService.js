import axios from 'axios';

const API_URL = 'http://localhost:5000/api/subscription-management'; 

const getAuthConfig = () => ({
  headers: { 
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json' 
  }
});

class SubscriptionService {
  
  // PLANS METHODS
  async getAllPlans() {
    const response = await axios.get(`${API_URL}/plans`, getAuthConfig());
    return response.data;
  }

  async createNewPlan(planData) {
    const response = await axios.post(`${API_URL}/plans`, planData, getAuthConfig());
    return response.data;
  }

  async updateExistingPlan(id, planData) {
    const response = await axios.put(`${API_URL}/plans/${id}`, planData, getAuthConfig());
    return response.data;
  }

  async deleteExistingPlan(id) {
    const response = await axios.delete(`${API_URL}/plans/${id}`, getAuthConfig());
    return response.data;
  }

  // CATEGORY METHODS
  async getAllCategories() {
    const response = await axios.get(`${API_URL}/categories`, getAuthConfig());
    return response.data;
  }

  async createNewCategory(catData) {
    const response = await axios.post(`${API_URL}/categories`, catData, getAuthConfig());
    return response.data;
  }

  async updateExistingCategory(id, catData) {
    const response = await axios.put(`${API_URL}/categories/${id}`, catData, getAuthConfig());
    return response.data;
  }

  async updateCategoryCredits(id, data) {
    const response = await axios.put(`${API_URL}/categories/credits/${id}`, data, getAuthConfig());
    return response.data;
  }

  async deleteExistingCategory(id) {
    const response = await axios.delete(`${API_URL}/categories/${id}`, getAuthConfig());
    return response.data;
  }

  async getAllExams() {
    const response = await axios.get(`${API_URL}/exams`, getAuthConfig());
    return response.data;
  }
}

export default new SubscriptionService();