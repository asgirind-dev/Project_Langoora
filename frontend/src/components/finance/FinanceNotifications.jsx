// frontend/src/components/finance/FinanceNotifications.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, XCircle, Clock, Eye, AlertCircle, Layers, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationService from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';

export default function FinanceNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (user?.uid || user?.id) {
      fetchNotifications();
      // Refresh every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const userId = user?.uid || user?.id;
      const data = await NotificationService.getNotifications(userId);
      setNotifications(data || []);
      const unread = (data || []).filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await NotificationService.markAsRead(notificationId);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const userId = user?.uid || user?.id;
      await NotificationService.markAllAsRead(userId);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    if (type === 'plan_approved' || type === 'plan_approval_required') 
      return <CheckCircle size={16} className="text-emerald-400" />;
    if (type === 'plan_rejected') 
      return <XCircle size={16} className="text-red-400" />;
    return <AlertCircle size={16} className="text-amber-400" />;
  };

  const getStatusColor = (type) => {
    if (type === 'plan_approved') 
      return 'border-emerald-500/30 bg-emerald-500/5';
    if (type === 'plan_rejected') 
      return 'border-red-500/30 bg-red-500/5';
    if (type === 'plan_approval_required') 
      return 'border-amber-500/30 bg-amber-500/5';
    return 'border-white/10 bg-white/5';
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diff = new Date() - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Navigate to the relevant page
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Notifications"
      >
        <Bell size={20} className={`text-gray-400 transition-colors ${unreadCount > 0 ? 'text-amber-400' : ''}`} />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1.5 border-2 border-[#060d1f] shadow-lg shadow-red-500/20 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-[420px] max-h-[520px] bg-[#0d1222] border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-gray-400" />
                <h3 className="font-bold text-white text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[10px] font-bold border border-red-500/20">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto max-h-[400px] p-2 space-y-1.5">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell size={28} className="text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-sm">No notifications yet</p>
                  <p className="text-gray-500 text-xs mt-1">You're all caught up!</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
                      getStatusColor(notif.type)
                    } ${!notif.read ? 'border-opacity-50 bg-opacity-10' : 'opacity-60 hover:opacity-80'}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${
                            !notif.read ? 'text-white' : 'text-gray-400'
                          }`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            <Clock size={10} className="text-gray-500" />
                            <span className="text-[10px] text-gray-500">
                              {getTimeAgo(notif.createdAt)}
                            </span>
                          </div>
                          
                          {notif.planName && (
                            <div className="flex items-center gap-1">
                              <Layers size={10} className="text-purple-400" />
                              <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                                {notif.planName}
                              </span>
                            </div>
                          )}
                          
                          {!notif.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notif.id);
                              }}
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-medium ml-auto"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-white/10 text-center bg-white/[0.01]">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/finance-admin/subscriptions');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline"
                >
                  View all subscription plans →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}