import API from './api';

const subscriptionService = {
  // Get all plans
  getPlans: async () => {
    try {
      const response = await API.get('/subscriptions');
      return response.data;
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  },

  // Create new plan
  createPlan: async (planData) => {
    try {
      const response = await API.post('/subscriptions', planData);
      return response.data;
    } catch (error) {
      console.error('Error creating plan:', error);
      throw error;
    }
  },

  // Update plan
  updatePlan: async (id, planData) => {
    try {
      const response = await API.put(`/subscriptions/${id}`, planData);
      return response.data;
    } catch (error) {
      console.error('Error updating plan:', error);
      throw error;
    }
  },

  // Delete plan
  deletePlan: async (id) => {
    try {
      const response = await API.delete(`/subscriptions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw error;
    }
  },

  // Toggle plan status
  togglePlanStatus: async (id) => {
    try {
      const response = await API.patch(`/subscriptions/${id}/toggle`);
      return response.data;
    } catch (error) {
      console.error('Error toggling plan:', error);
      throw error;
    }
  }
};

export default subscriptionService;