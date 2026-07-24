// frontend/src/services/subscriptionService.js
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

class SubscriptionService {
  async getAllPlans() {
    try {
      const response = await axios.get(`${API_URL}/subscription-plans`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching plans:', error);
      return [];
    }
  }

  async getPlansByStatus(status) {
    try {
      const response = await axios.get(`${API_URL}/subscription-plans/status/${status}`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching plans with status ${status}:`, error);
      return [];
    }
  }

  async createNewPlan(planData) {
    try {
      const response = await axios.post(
        `${API_URL}/subscription-plans`,
        planData,
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error('Error creating plan:', error);
      throw error;
    }
  }

  async updateExistingPlan(id, planData) {
    try {
      const response = await axios.put(
        `${API_URL}/subscription-plans/${id}`,
        planData,
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating plan ${id}:`, error);
      throw error;
    }
  }

  async deleteExistingPlan(id) {
    try {
      const response = await axios.delete(
        `${API_URL}/subscription-plans/${id}`,
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error(`Error deleting plan ${id}:`, error);
      throw error;
    }
  }

  async approvePlan(id, notes = '') {
    try {
      const response = await axios.post(
        `${API_URL}/subscription-plans/${id}/approve`,
        { notes },
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error(`Error approving plan ${id}:`, error);
      throw error;
    }
  }

  async rejectPlan(id, notes = '') {
    try {
      const response = await axios.post(
        `${API_URL}/subscription-plans/${id}/reject`,
        { notes },
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error(`Error rejecting plan ${id}:`, error);
      throw error;
    }
  }

  async getAllCategories() {
    try {
      const response = await axios.get(`${API_URL}/exam-credits/categories`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }
}

export default new SubscriptionService();