// frontend/src/components/admin/AdminNotifications.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Check, CheckCheck, X, Trash2, 
  Clock, Loader2, AlertCircle, ChevronRight,
  Shield, Users, FileText, Settings, RefreshCw
} from 'lucide-react';
import notificationService from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

// Helper to format time
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return date.toLocaleDateString();
};

// ✅ Admin-specific notification type icons
const getNotificationIcon = (type) => {
  const icons = {
    'plan_created': <FileText size={14} className="text-blue-400" />,
    'plan_approved': <Check size={14} className="text-emerald-400" />,
    'plan_rejected': <X size={14} className="text-red-400" />,
    'plan_resubmitted': <RefreshCw size={14} className="text-amber-400" />,
    'plan_updated': <Settings size={14} className="text-purple-400" />,
    'plan_activated': <Shield size={14} className="text-emerald-400" />,
    'plan_deactivated': <Shield size={14} className="text-red-400" />,
    'credit_assigned': <Users size={14} className="text-cyan-400" />,
    'user_registered': <Users size={14} className="text-green-400" />,
  };
  return icons[type] || <Bell size={14} className="text-gray-400" />;
};

export default function AdminNotifications() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const dropdownRef = useRef(null);

  const userId = user?.uid || user?.id;

  // Load latest notifications only (limit: 5)
  const loadNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [latestNotifs, count] = await Promise.all([
        notificationService.getLatestNotifications(userId, 5),
        notificationService.getUnreadCount(userId)
      ]);
      setNotifications(latestNotifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading admin notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load unread count on mount
  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead(userId);
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (notificationId) => {
    setDeleting(notificationId);
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      // If deleted notification was unread, decrement count
      const deleted = notifications.find(n => n.id === notificationId);
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      await notificationService.deleteReadNotifications(userId);
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors duration-200"
        aria-label="Admin Notifications"
      >
        <Bell size={22} className="text-gray-300 hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-[420px] max-w-[90vw] bg-[#0d1222] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">Admin Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markingAll}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors text-xs flex items-center gap-1"
                  >
                    {markingAll ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <CheckCheck size={14} />
                        <span className="hidden sm:inline">Read all</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handleDeleteAllRead}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete all read notifications"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-blue-400" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                    <Bell size={28} className="text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">No admin notifications</p>
                  <p className="text-gray-600 text-xs mt-1">You're all caught up!</p>
                </div>
              ) : (
                notifications.map((notif, index) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`group relative px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                      !notif.read ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status Indicator */}
                      <div className="flex-shrink-0 mt-1">
                        {!notif.read ? (
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-600" />
                        )}
                      </div>

                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm ${!notif.read ? 'text-white font-semibold' : 'text-gray-300'}`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-500 whitespace-nowrap flex-shrink-0">
                            {formatTime(notif.createdAt)}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-2">
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-0.5"
                            >
                              <Check size={12} /> Mark read
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notif.id)}
                            disabled={deleting === notif.id}
                            className="text-[10px] text-gray-500 hover:text-red-400 transition-colors flex items-center gap-0.5"
                          >
                            {deleting === notif.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Trash2 size={10} />
                            )}
                            Delete
                          </button>
                          {notif.actionUrl && notif.actionUrl !== '/' && (
                            <a
                              href={notif.actionUrl}
                              className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-0.5"
                            >
                              View <ChevronRight size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] text-gray-500">
                  Showing latest {notifications.length} notifications
                </span>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to full notifications page if needed
                  }}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}