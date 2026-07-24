import axios from 'axios';

// Backend Plan Endpoints API Base URL
const API_URL = 'http://localhost:5000/api/plans';

// Bearer Token Authorization Header
const getAuthConfig = () => ({
  headers: { 
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json' 
  }
});

class PlanService {
  // 1. Get all plans
  async getAllPlans() {
    try {
      const response = await axios.get(API_URL, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error fetching plans:", error);
      throw error;
    }
  }

  // 2. Create a new plan
  async createPlan(planData) {
    try {
      const response = await axios.post(API_URL, planData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error creating plan:", error);
      throw error;
    }
  }

  // 3. Update an existing plan
  async updatePlan(id, planData) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, planData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error updating plan:", error);
      throw error;
    }
  }

  // 4. Delete a plan
  async deletePlan(id) {
    try {
      const response = await axios.delete(`${API_URL}/${id}`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error deleting plan:", error);
      throw error;
    }
  }
}

// ✅ ES Module Export for Frontend (Vite)
export default new PlanService();