const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

console.log('🔔 Loading notification routes...');

// 📥 Get all notifications for a user
router.get('/user/:userId', notificationController.getUserNotifications);

// 📥 Get latest notifications for a user (for dashboard)
router.get('/user/:userId/latest', notificationController.getLatestNotifications); 

// 📥 Get unread notifications & count
router.get('/user/:userId/unread', notificationController.getUnreadNotifications);
router.get('/user/:userId/count', notificationController.getUnreadCount);

// ✅ Mark notification as read
router.patch('/:id/read', notificationController.markAsRead);
router.put('/user/:userId/read-all', notificationController.markAllAsRead);

// 🗑️ Delete notifications
router.delete('/:notificationId', notificationController.deleteNotification);
router.delete('/user/:userId/read', notificationController.deleteReadNotifications);  // ✅ NEW: Delete all read notifications
router.delete('/user/:userId/cleanup', notificationController.cleanupOldNotifications);  // ✅ NEW: Cleanup old notifications

// 📤 Create notification
router.post('/send', notificationController.sendCustomNotification);

console.log('✅ Notification routes loaded successfully!');
console.log('   📥 GET  /user/:userId');
console.log('   📥 GET  /user/:userId/latest');
console.log('   📥 GET  /user/:userId/unread');
console.log('   📥 GET  /user/:userId/count');
console.log('   ✅ PATCH /:id/read');
console.log('   ✅ PUT   /user/:userId/read-all');
console.log('   🗑️ DELETE /:notificationId');
console.log('   🗑️ DELETE /user/:userId/read');      // ✅ New
console.log('   🗑️ DELETE /user/:userId/cleanup');   // ✅ New
console.log('   📤 POST  /send');

module.exports = router;