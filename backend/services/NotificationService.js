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
   * Alias / Helper for createNotification (for simpler object payload calls)
   */
  async createNotification({ userId, title, message, type = 'info', link = null }) {
    try {
      const result = await this.sendToUser(userId, { title, message, type, link });
      return { success: true, id: result.id };
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      return { success: false, error: error.message };
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
   * Get all notifications for a user - OPTIMIZED with limit and pagination
   */
  async getUserNotifications(userId, limit = 50, page = 1) {
    try {
      const offset = (page - 1) * limit;
      
      // First query to get total count
      const countSnapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .get();
      const total = countSnapshot.size;

      // Then get paginated results
      const snapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      return { success: false, error: error.message, notifications: [] };
    }
  }

  /**
   * Get latest N notifications for a user - OPTIMIZED for dashboard
   */
  async getLatestUserNotifications(userId, limit = 5) {
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
      console.error('❌ Get latest notifications error:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user - OPTIMIZED with count only
   */
  async getUnreadCount(userId) {
    try {
      // Use select to minimize data transfer
      const snapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', false)
        .select() // Only fetches document IDs, not full data
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
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark all notifications as read for a user - OPTIMIZED with batch
   */
  async markAllAsRead(userId) {
    try {
      const snapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', false)
        .select()
        .get();

      if (snapshot.empty) return { success: true, count: 0 };

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: new Date().toISOString()
        });
      });
      await batch.commit();

      return { success: true, count: snapshot.size };
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
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
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete old read notifications - OPTIMIZED to reduce storage
   */
  async deleteOldReadNotifications(userId, daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffStr = cutoffDate.toISOString();

      const snapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', true)
        .where('createdAt', '<', cutoffStr)
        .select()
        .get();

      if (snapshot.empty) return { success: true, count: 0 };

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      console.log(`✅ Deleted ${snapshot.size} old read notifications for user ${userId}`);
      return { success: true, count: snapshot.size };
    } catch (error) {
      console.error('❌ Delete old notifications error:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();