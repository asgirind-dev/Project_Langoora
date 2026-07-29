const { db } = require('../config/firebase');

class NotificationService {
  async getUserEmail(userId) {
    try {
      const userDoc = await db.collection('users').doc(String(userId)).get();
      if (userDoc.exists) {
        return userDoc.data().email || null;
      }
      return null;
    } catch (err) {
      console.error(`❌ Error fetching email for user ${userId}:`, err.message);
      return null;
    }
  }

  async sendToUser(userId, data) {
    try {
      if (!userId || !data.type || !data.title || !data.message) {
        throw new Error('Missing required notification fields');
      }

      const notificationData = {
        userId: String(userId),
        ...data,
        read: false,
        createdAt: new Date().toISOString()
      };

      const docRef = await db.collection('notifications').add(notificationData);
      console.log(`✅ In-app Notification sent to user ${userId}: ${data.title}`);

      return { id: docRef.id, ...notificationData };
    } catch (error) {
      console.error('❌ Send notification error:', error);
      throw error;
    }
  }

  async sendToMany(userIds, data) {
    try {
      if (!userIds || userIds.length === 0) throw new Error('No user IDs provided');

      // Use a Set to ensure unique user IDs
      const uniqueUserIds = [...new Set(userIds)];
      const batch = db.batch();
      const notifications = [];

      uniqueUserIds.forEach(userId => {
        const notifRef = db.collection('notifications').doc();
        const notifData = {
          userId: String(userId),
          ...data,
          read: false,
          createdAt: new Date().toISOString()
        };
        batch.set(notifRef, notifData);
        notifications.push({ id: notifRef.id, ...notifData });
      });

      await batch.commit();
      console.log(`✅ ${notifications.length} in-app notifications sent successfully!`);
      return notifications;
    } catch (error) {
      console.error('❌ Bulk notification error:', error);
      throw error;
    }
  }

  async sendToRole(roles, data) {
    try {
      const roleArray = Array.isArray(roles) ? roles : [roles];
      
      // 1. Fetch users by role
      const usersSnapshot = await db.collection('users').where('role', 'in', roleArray).get();
      let userIds = usersSnapshot.docs.map(doc => doc.id);

      // 2. Fetch users by roleId
      const roleIdSnapshot = await db.collection('users').where('roleId', 'in', roleArray).get();
      const roleIdUserIds = roleIdSnapshot.docs.map(doc => doc.id);

      // 3. Combine both and filter unique IDs using JavaScript Set (No Firestore Index required!)
      const uniqueUserIds = [...new Set([...userIds, ...roleIdUserIds])];

      if (uniqueUserIds.length === 0) {
        console.log(`⚠️ No users found with roles: ${roleArray.join(', ')}`);
        return [];
      }

      return await this.sendToMany(uniqueUserIds, data);
    } catch (error) {
      console.error('❌ Send to role error:', error);
      throw error;
    }
  }

  async getUserNotifications(userId, limit = 50, page = 1) {
    try {
      const offset = (page - 1) * limit;
      const targetUserId = String(userId);
      const countSnapshot = await db.collection('notifications').where('userId', '==', targetUserId).get();
      const total = countSnapshot.size;

      const snapshot = await db.collection('notifications')
        .where('userId', '==', targetUserId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { notifications, total, page, totalPages: Math.ceil(total / limit) };
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      throw error;
    }
  }

  async getLatestUserNotifications(userId, limit = 5) {
    try {
      const snapshot = await db.collection('notifications')
        .where('userId', '==', String(userId))
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Get latest notifications error:', error);
      throw error;
    }
  }

  async getUnreadCount(userId) {
    try {
      const snapshot = await db.collection('notifications')
        .where('userId', '==', String(userId))
        .where('read', '==', false)
        .select()
        .get();
      return snapshot.size;
    } catch (error) {
      console.error('❌ Get unread count error:', error);
      throw error;
    }
  }

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

  async markAllAsRead(userIds) {
    // Can handle single or multiple
    const targetIds = Array.isArray(userIds) ? userIds : [userIds];
    try {
      let totalCount = 0;
      for (const userId of targetIds) {
        const snapshot = await db.collection('notifications')
          .where('userId', '==', String(userId))
          .where('read', '==', false)
          .select()
          .get();

        if (!snapshot.empty) {
          const batch = db.batch();
          snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true, readAt: new Date().toISOString() });
          });
          await batch.commit();
          totalCount += snapshot.size;
        }
      }
      return { success: true, count: totalCount };
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
      throw error;
    }
  }

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