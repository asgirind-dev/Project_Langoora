// frontend/src/services/notificationService.js
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

class NotificationService {
  async getNotifications(userId) {
    try {
      const response = await axios.get(
        `${API_URL}/notifications/${userId}`,
        getAuthConfig()
      );
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async getUnreadCount(userId) {
    try {
      const response = await axios.get(
        `${API_URL}/notifications/${userId}/count`,
        getAuthConfig()
      );
      return response.data?.count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  async markAsRead(notificationId) {
    try {
      const response = await axios.put(
        `${API_URL}/notifications/${notificationId}/read`,
        {},
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      const response = await axios.put(
        `${API_URL}/notifications/${userId}/read-all`,
        {},
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId) {
    try {
      const response = await axios.delete(
        `${API_URL}/notifications/${notificationId}`,
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

export default new NotificationService();