// backend/controllers/notificationController.js
const { db } = require('../config/firebase');
const notificationService = require('../services/NotificationService');

// ==================== GET NOTIFICATIONS ====================

// User ට අදාළ සියලු Notifications ලබාගැනීම
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    
    const result = await notificationService.getUserNotifications(userId, limit, page);
    
    res.json({
      success: true,
      count: result.notifications.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      data: result.notifications
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Get latest notifications for dashboard - OPTIMIZED
 * Returns only the latest 5 notifications
 */
exports.getLatestNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    
    const notifications = await notificationService.getLatestUserNotifications(userId, limit);
    
    res.json({
      success: true,
      count: notifications.length,
      notifications: notifications
    });

  } catch (error) {
    console.error('❌ Get latest notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.getNotifications = exports.getUserNotifications;

// නොකියවූ (Unread) Notifications ලබාගැනීම
exports.getUnreadNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        count: 0,
        notifications: []
      });
    }

    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // JavaScript බහුලව භාවිතාවන Sorting ක්‍රමය
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      count: notifications.length,
      notifications: notifications
    });
  } catch (error) {
    console.error('❌ Get unread notifications error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// නොකියවූ Notifications ගණන ලබාගැනීම
exports.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();

    return res.json({
      success: true,
      count: snapshot.size
    });
  } catch (error) {
    console.error('❌ Get unread count error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ==================== UPDATE NOTIFICATIONS ====================

// Notification එක Read ලෙස mark කිරීම
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id || req.params.notificationId;

    if (!notificationId) {
      return res.status(400).json({ success: false, message: "Notification ID is required" });
    }

    if (notificationService && typeof notificationService.markAsRead === 'function') {
      await notificationService.markAsRead(notificationId);
    } else {
      await db.collection('notifications').doc(notificationId).update({ read: true });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Notification marked as read' 
    });
  } catch (error) {
    console.error('❌ Mark as read error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// සියලු Notifications Read ලෙස mark කිරීම
exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await notificationService.markAllAsRead(userId);
    
    res.json({ 
      success: true, 
      message: `${result.count} notifications marked as read` 
    });
  } catch (error) {
    console.error('❌ Mark all as read error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ==================== DELETE NOTIFICATIONS ====================

// තනි Notification එකක් මකා දැමීම
exports.deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id || req.params.notificationId;

    if (!notificationId) {
      return res.status(400).json({ success: false, message: "Notification ID is required" });
    }

    if (notificationService && typeof notificationService.deleteNotification === 'function') {
      await notificationService.deleteNotification(notificationId);
    } else {
      await db.collection('notifications').doc(notificationId).delete();
    }

    return res.json({ 
      success: true, 
      message: 'Notification deleted' 
    });
  } catch (error) {
    console.error('❌ Delete notification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// කියවූ සියලු Notifications මකා දැමීම
exports.deleteReadNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', true)
      .select()
      .get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        message: 'No read notifications found to delete'
      });
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return res.json({ 
      success: true, 
      message: `${snapshot.size} read notifications deleted` 
    });
  } catch (error) {
    console.error('❌ Delete read notifications error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Clean up old read notifications - OPTIMIZED to reduce quota usage
 */
exports.cleanupOldNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const daysOld = parseInt(req.query.daysOld) || 30;

    const result = await notificationService.deleteOldReadNotifications(userId, daysOld);
    
    res.json({
      success: true,
      message: `${result.count} old notifications cleaned up`,
      count: result.count
    });
  } catch (error) {
    console.error('❌ Cleanup notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ==================== SEND CUSTOM NOTIFICATION ====================

// නව Notification එකක් සෑදීම
exports.sendCustomNotification = async (req, res) => {
  try {
    const { userId, type, title, message, actionUrl, planId, planName } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, type, title, and message are required'
      });
    }

    let result;
    if (notificationService && typeof notificationService.sendToUser === 'function') {
      result = await notificationService.sendToUser(userId, {
        type,
        title,
        message,
        actionUrl: actionUrl || '/',
        planId: planId || null,
        planName: planName || null
      });
    } else {
      const docRef = await db.collection('notifications').add({
        userId,
        type,
        title,
        message,
        actionUrl: actionUrl || '/',
        planId: planId || null,
        planName: planName || null,
        read: false,
        createdAt: new Date().toISOString()
      });
      result = { id: docRef.id };
    }

    return res.json({
      success: true,
      message: 'Notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Send custom notification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};