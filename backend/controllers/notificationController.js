// backend/controllers/notificationController.js
const { db } = require('../config/firebase');
const notificationService = require('../services/NotificationService');

// ==================== GET NOTIFICATIONS ====================

exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const notifications = await notificationService.getUserNotifications(userId);
    
    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.getUnreadNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .orderBy('createdAt', 'desc')
      .get();
    
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('❌ Get unread notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const count = await notificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('❌ Get unread count error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ==================== UPDATE NOTIFICATIONS ====================

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await notificationService.markAsRead(notificationId);
    
    res.json({ 
      success: true, 
      message: 'Notification marked as read' 
    });
  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();
    
    if (snapshot.empty) {
      return res.json({
        success: true,
        message: 'No unread notifications found'
      });
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { 
        read: true, 
        readAt: new Date().toISOString() 
      });
    });
    await batch.commit();
    
    res.json({ 
      success: true, 
      message: `${snapshot.size} notifications marked as read` 
    });
  } catch (error) {
    console.error('❌ Mark all as read error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ==================== DELETE NOTIFICATIONS ====================

exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await notificationService.deleteNotification(notificationId);
    
    res.json({ 
      success: true, 
      message: 'Notification deleted' 
    });
  } catch (error) {
    console.error('❌ Delete notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.deleteReadNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', true)
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
    
    res.json({ 
      success: true, 
      message: `${snapshot.size} read notifications deleted` 
    });
  } catch (error) {
    console.error('❌ Delete read notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ==================== SEND CUSTOM NOTIFICATION ====================

exports.sendCustomNotification = async (req, res) => {
  try {
    const { userId, type, title, message, actionUrl, planId, planName } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, type, title, and message are required'
      });
    }

    const result = await notificationService.sendToUser(userId, {
      type,
      title,
      message,
      actionUrl: actionUrl || '/',
      planId: planId || null,
      planName: planName || null
    });
    
    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Send custom notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};