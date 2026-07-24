// backend/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// 📥 Get all notifications for a user
router.get('/:userId', notificationController.getNotifications);

// 📥 Get unread notifications
router.get('/:userId/unread', notificationController.getUnreadNotifications);

// 📥 Get unread count
router.get('/:userId/count', notificationController.getUnreadCount);

// ✅ Mark single notification as read
router.put('/:notificationId/read', notificationController.markAsRead);

// ✅ Mark all notifications as read
router.put('/:userId/read-all', notificationController.markAllAsRead);

// 🗑️ Delete a notification
router.delete('/:notificationId', notificationController.deleteNotification);

// 🗑️ Delete all read notifications
router.delete('/:userId/read', notificationController.deleteReadNotifications);

// 📤 Create notification (for testing)
router.post('/send', notificationController.sendCustomNotification);

module.exports = router;