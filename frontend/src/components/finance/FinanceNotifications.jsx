import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, CheckCheck, X, Loader2, RefreshCw 
} from 'lucide-react';
import notificationService from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

// Helper to format time
const formatTime = (timestamp) => {
  if (!timestamp) return 'Just now';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
};

export default function FinanceNotifications() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef(null);

  // Logged-in User ID
  const userId = user?.uid || user?.id || user?._id;

  // Load real notifications from DB (Latest 3)
  const loadNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      console.log("Current Logged-in User ID:", userId);

      // 🎯 FIXED FUNCTION NAME HERE: `getLatestNotifications`
      const [notifRes, countRes] = await Promise.all([
        notificationService.getLatestNotifications(userId, 3).catch((err) => {
          console.error("Error fetching notifications list:", err);
          return [];
        }),
        notificationService.getUnreadCount(userId).catch((err) => {
          console.error("Error fetching unread count:", err);
          return 0;
        })
      ]);

      let rawList = Array.isArray(notifRes) 
        ? notifRes 
        : (notifRes?.notifications || notifRes?.data || []);

      const top3List = rawList.slice(0, 3);
      setNotifications(top3List);

      const actualUnread = top3List.filter(n => !n.read).length;
      setUnreadCount(top3List.length === 0 ? 0 : (typeof countRes === 'number' ? countRes : actualUnread));

    } catch (error) {
      console.error('Error loading notifications from DB:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [user, userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id).catch(() => null);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead(userId).catch(() => null);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 cursor-pointer active:scale-95"
        title="Notifications"
      >
        <Bell size={18} className="text-gray-300 hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-[#0b0f1d] animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0b0f1d] border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-amber-400" />
                <span className="text-xs font-bold text-white">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[9px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    disabled={markingAll}
                    className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />} 
                    Read all
                  </button>
                )}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
              {loading ? (
                <div className="p-8 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                  <Loader2 size={20} className="animate-spin text-blue-400" />
                  <span>Checking notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                  <Bell size={24} className="text-gray-600" />
                  <p className="text-gray-400 font-semibold">No notifications</p>
                  <p className="text-[10px] text-gray-600">You are all caught up!</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div 
                    key={item.id || item._id} 
                    onClick={() => !item.read && handleMarkAsRead(item.id)}
                    className={`p-3.5 hover:bg-white/[0.04] transition-colors flex gap-3 cursor-pointer ${
                      !item.read ? 'bg-amber-500/[0.04]' : ''
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!item.read ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs ${!item.read ? 'font-bold text-white' : 'font-medium text-gray-300'} truncate`}>
                          {item.title || 'System Alert'}
                        </h4>
                        <span className="text-[9px] text-gray-500 shrink-0">{formatTime(item.createdAt || item.time)}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">
                        {item.message || item.description || ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2.5 bg-white/[0.01] border-t border-white/5 flex items-center justify-between px-4">
              <span className="text-[9px] text-gray-500">Real-time sync</span>
              <button 
                onClick={loadNotifications}
                className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}