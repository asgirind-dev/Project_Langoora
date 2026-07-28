const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// 📥 Get all notifications for a user
router.get('/user/:userId', notificationController.getUserNotifications);

// 📥 Get unread notifications & count
router.get('/user/:userId/unread', notificationController.getUnreadNotifications);
router.get('/user/:userId/count', notificationController.getUnreadCount);

// ✅ Mark notification as read
router.patch('/:id/read', notificationController.markAsRead);
router.put('/user/:userId/read-all', notificationController.markAllAsRead);

// 🗑️ Delete notifications
router.delete('/:notificationId', notificationController.deleteNotification);

// 📤 Create notification
router.post('/send', notificationController.sendCustomNotification);

module.exports = router;