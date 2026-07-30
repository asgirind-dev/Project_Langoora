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
  /**
   * Get all notifications with pagination
   */
  async getNotifications(userId, limit = 50, page = 1) {
    try {
      const response = await axios.get(
        `${API_URL}/notifications/user/${userId}?limit=${limit}&page=${page}`,
        getAuthConfig()
      );
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Get latest notifications - OPTIMIZED for dashboard
   * Returns only the latest N notifications
   */
  async getLatestNotifications(userId, limit = 5) {
    try {
      const response = await axios.get(
        `${API_URL}/notifications/user/${userId}/latest?limit=${limit}`,
        getAuthConfig()
      );
      // ✅ Fix: Support both 'data' and 'notifications' response formats
      return response.data?.data || response.data?.notifications || [];
    } catch (error) {
      console.error('Error fetching latest notifications:', error);
      return [];
    }
  }

  /**
   * Get unread count - OPTIMIZED using select()
   */
  async getUnreadCount(userId) {
    try {
      const response = await axios.get(
        `${API_URL}/notifications/user/${userId}/count`,
        getAuthConfig()
      );
      return response.data?.count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Get unread notifications with limit
   */
  async getUnreadNotifications(userId, limit = 20) {
    try {
      const response = await axios.get(
        `${API_URL}/notifications/user/${userId}/unread?limit=${limit}`,
        getAuthConfig()
      );
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
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
        `${API_URL}/notifications/user/${userId}/read-all`,
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

  /**
   * Delete all read notifications - OPTIMIZED
   */
  async deleteReadNotifications(userId) {
    try {
      const response = await axios.delete(
        `${API_URL}/notifications/user/${userId}/read`,
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      throw error;
    }
  }

  /**
   * Cleanup old notifications - OPTIMIZED to reduce storage
   */
  async cleanupOldNotifications(userId, daysOld = 30) {
    try {
      const response = await axios.delete(
        `${API_URL}/notifications/user/${userId}/cleanup?daysOld=${daysOld}`,
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      throw error;
    }
  }
}

export default new NotificationService();