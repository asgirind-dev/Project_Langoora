import axios from 'axios';

// Backend Plan Endpoints API Base URL
const API_URL = 'http://localhost:5000/api/subscription-plans';

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

  // 2. Get plans by status
  async getPlansByStatus(status) {
    try {
      const response = await axios.get(`${API_URL}/status/${status}`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error(`Error fetching plans with status ${status}:`, error);
      throw error;
    }
  }

  // 3. Create a new plan
  async createPlan(planData) {
    try {
      const response = await axios.post(API_URL, planData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error creating plan:", error);
      throw error;
    }
  }

  // 4. Update an existing plan
  async updatePlan(id, planData) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, planData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error updating plan:", error);
      throw error;
    }
  }

  // 5. Delete a plan
  async deletePlan(id) {
    try {
      const response = await axios.delete(`${API_URL}/${id}`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error deleting plan:", error);
      throw error;
    }
  }

  // 6. Approve a plan
  async approvePlan(id, notes = '') {
    try {
      const response = await axios.post(`${API_URL}/${id}/approve`, { notes }, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error approving plan:", error);
      throw error;
    }
  }

  // 7. Reject a plan
  async rejectPlan(id, notes = '') {
    try {
      const response = await axios.post(`${API_URL}/${id}/reject`, { notes }, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error("Error rejecting plan:", error);
      throw error;
    }
  }
}

// ✅ ES Module Export for Frontend (Vite)
export default new PlanService();