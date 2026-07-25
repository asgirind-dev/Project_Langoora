// backend/services/NotificationService.js
const { db } = require('../config/firebase');

class NotificationService {
  /**
   * Send notification to a single user
   */
  async sendToUser(userId, data) {
    try {
      if (!userId) throw new Error('User ID is required');
      if (!data.type) throw new Error('Notification type is required');
      if (!data.title) throw new Error('Notification title is required');
      if (!data.message) throw new Error('Notification message is required');

      const notificationData = {
        userId,
        ...data,
        read: false,
        createdAt: new Date().toISOString()
      };

      const docRef = await db.collection('notifications').add(notificationData);
      console.log(`✅ Notification sent to user ${userId}: ${data.title}`);
      
      return { id: docRef.id, ...notificationData };
    } catch (error) {
      console.error('❌ Send notification error:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToMany(userIds, data) {
    try {
      if (!userIds || userIds.length === 0) {
        throw new Error('No user IDs provided');
      }

      const batch = db.batch();
      const notifications = [];

      userIds.forEach(userId => {
        const notifRef = db.collection('notifications').doc();
        const notifData = {
          userId,
          ...data,
          read: false,
          createdAt: new Date().toISOString()
        };
        
        batch.set(notifRef, notifData);
        notifications.push({ id: notifRef.id, ...notifData });
      });

      await batch.commit();
      console.log(`✅ ${notifications.length} notifications sent`);
      
      return notifications;
    } catch (error) {
      console.error('❌ Bulk notification error:', error);
      throw error;
    }
  }

  /**
   * Send notification to all users with a specific role
   */
  async sendToRole(roles, data) {
    try {
      const roleArray = Array.isArray(roles) ? roles : [roles];
      
      const usersSnapshot = await db.collection('users')
        .where('role', 'in', roleArray)
        .get();

      if (usersSnapshot.empty) {
        console.log(`⚠️ No users found with roles: ${roleArray.join(', ')}`);
        return [];
      }

      const userIds = usersSnapshot.docs.map(doc => doc.id);
      return await this.sendToMany(userIds, data);
    } catch (error) {
      console.error('❌ Send to role error:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId, limit = 50) {
    try {
      const snapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId) {
    try {
      const snapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();

      return snapshot.size;
    } catch (error) {
      console.error('❌ Get unread count error:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId) {
    try {
      await db.collection('notifications').doc(notificationId).update({
        read: true,
        readAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId) {
    try {
      await db.collection('notifications').doc(notificationId).delete();
      return { success: true };
    } catch (error) {
      console.error('❌ Delete notification error:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();