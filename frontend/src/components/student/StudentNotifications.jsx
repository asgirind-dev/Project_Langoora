// frontend/src/components/student/StudentNotifications.jsx
import React, { useState, useEffect } from 'react';
import { Bell, CreditCard, Info } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000';

export default function StudentNotifications({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🛡️ Array එකක් බව තහවුරු කරගැනීම
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n.read && !n.isRead).length;

  // Backend API හරහා Notifications Fetch කිරීම
  const fetchNotifications = async () => {
    let currentUserId = userId;

    if (!currentUserId) {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          currentUserId = parsedUser.id || parsedUser.uid;
        }
      } catch (e) {
        console.error("Error parsing user from localStorage", e);
      }
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!currentUserId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/user/${currentUserId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) return;

      const data = await response.json();

      // Backend response එක { success: true, notifications: [...] } ලෙස එයි
      const notificationList = data.notifications || data.data || (Array.isArray(data) ? data : []);
      
      setNotifications(notificationList);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("🔔 Notification Component Loaded for User:", userId);
    setLoading(true);
    fetchNotifications();

    // සාමාන්‍යයෙන් තත්පර 10කට සැරයක් Fetch කිරීම ප්‍රමාණවත්
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  // Read ලෙස Mark කිරීම
  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    try {
      setNotifications(prev =>
        Array.isArray(prev) ? prev.map(n => ((n.id === id || n._id === id) ? { ...n, read: true, isRead: true } : n)) : []
      );

      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, { 
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="relative">
      {/* 🔔 Notification Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:text-cyan-400 bg-slate-800/50 rounded-full transition border border-slate-700/50"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-black animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 📜 Dropdown Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-200">
            <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-cyan-500/20">
                    {unreadCount} new
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
              {loading && safeNotifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Loading notifications...
                </div>
              ) : safeNotifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No notifications yet
                </div>
              ) : (
                safeNotifications.map((item) => {
                  const itemId = item.id || item._id;
                  const isRead = item.read || item.isRead;

                  return (
                    <div
                      key={itemId}
                      onClick={(e) => handleMarkAsRead(itemId, e)}
                      className={`p-3.5 cursor-pointer transition flex items-start gap-3 hover:bg-slate-800/40 ${
                        !isRead ? 'bg-cyan-500/5' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.type === 'subscription' || item.type === 'subscription_purchase' ? (
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CreditCard className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Info className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-semibold truncate ${!isRead ? 'text-white' : 'text-slate-300'}`}>
                            {item.title || 'Notification'}
                          </p>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {item.message || item.body}
                        </p>
                        <span className="text-[9px] text-slate-500 mt-1.5 block">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}