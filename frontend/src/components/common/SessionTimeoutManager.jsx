// frontend/src/components/common/SessionTimeoutManager.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import studentApi from '../../services/examExecutionService';

// ✅ Default timeout values (fallback if API fails) - ADMIN REMOVED
const DEFAULT_TIMEOUTS = {
  // admin: 15,  // ❌ COMPLETELY REMOVED
  super_admin: 15,
  finance_admin: 10,
  finance: 10,
  validator: 15,
  tutor: 20,
  student: 45
};

// ✅ Warning time (seconds before logout)
const WARNING_TIME = 30;

export function SessionTimeoutManager({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(WARNING_TIME);
  const [isIdle, setIsIdle] = useState(false);
  
  const [sessionTimeouts, setSessionTimeouts] = useState(null);
  const [timeoutsLoading, setTimeoutsLoading] = useState(true);
  
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // ✅ Fetch session timeouts from backend - FIXED with studentApi
  useEffect(() => {
    const fetchTimeouts = async () => {
      try {
        // ✅ Using studentApi instead of hardcoded fetch
        const response = await studentApi.get('/system-settings/security');
        
        if (response.data.success && response.data.data?.sessionTimeouts) {
          const timeouts = response.data.data.sessionTimeouts;
          
          // ✅ Remove 'admin' key if it somehow exists in the response
          if (timeouts.admin !== undefined) {
            console.warn('⚠️ "admin" role found in response, removing it');
            delete timeouts.admin;
          }
          
          setSessionTimeouts(timeouts);
          console.log('✅ Session timeouts loaded:', timeouts);
        } else {
          console.warn('⚠️ No session timeouts in response, using defaults');
          setSessionTimeouts(DEFAULT_TIMEOUTS);
        }
      } catch (error) {
        console.error('❌ Error fetching session timeouts:', error);
        setSessionTimeouts(DEFAULT_TIMEOUTS);
      } finally {
        setTimeoutsLoading(false);
      }
    };
    
    fetchTimeouts();
  }, []);

  // ✅ Get user's timeout setting - DYNAMIC with admin mapping
  const getUserTimeout = useCallback(() => {
    const userRole = user?.role || localStorage.getItem('userRole') || 'student';
    const timeouts = sessionTimeouts || DEFAULT_TIMEOUTS;
    
    // ✅ Map 'admin' to 'super_admin' if needed (backward compatibility)
    let effectiveRole = userRole;
    if (userRole === 'admin') {
      console.warn('⚠️ "admin" role detected, mapping to "super_admin"');
      effectiveRole = 'super_admin';
    }
    
    // ✅ If role not found in timeouts, use default
    const timeout = timeouts[effectiveRole];
    if (timeout === undefined) {
      console.warn(`⚠️ Role "${effectiveRole}" not found in timeouts, using default 45 minutes`);
      return 45;
    }
    
    console.log(`✅ User role: ${effectiveRole}, Timeout: ${timeout} minutes`);
    return timeout;
  }, [user, sessionTimeouts]);

  // ✅ Get timeout in milliseconds
  const getTimeoutMs = useCallback(() => {
    return getUserTimeout() * 60 * 1000;
  }, [getUserTimeout]);

  // ✅ Reset all timers
  const resetTimers = useCallback(() => {
    const timeoutMs = getTimeoutMs();
    
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
    
    setShowWarning(false);
    setIsIdle(false);
    setTimeRemaining(WARNING_TIME);
    lastActivityRef.current = Date.now();
    
    const timeoutDuration = timeoutMs - (WARNING_TIME * 1000);
    
    timeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeRemaining(WARNING_TIME);
      
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            handleAutoLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      warningRef.current = setTimeout(() => {
        handleAutoLogout();
      }, WARNING_TIME * 1000);
      
    }, timeoutDuration);
    
    lastActivityRef.current = Date.now();
  }, [getTimeoutMs]);

  // ✅ Handle auto logout
  const handleAutoLogout = useCallback(async () => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
    setShowWarning(false);
    setIsIdle(false);
    
    const emergencyModal = document.querySelector('#emergency-modal');
    if (emergencyModal) {
      emergencyModal.remove();
    }
    
    await logout();
    navigate('/auth/login', { 
      state: { 
        message: 'Your session has expired due to inactivity. Please login again.' 
      } 
    });
  }, [logout, navigate]);

  // ✅ Extend session
  const extendSession = useCallback(() => {
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
    setShowWarning(false);
    setIsIdle(false);
    setTimeRemaining(WARNING_TIME);
    lastActivityRef.current = Date.now();
    
    const emergencyModal = document.querySelector('#emergency-modal');
    if (emergencyModal) {
      emergencyModal.remove();
    }
    
    const timeoutMs = getTimeoutMs();
    clearTimeout(timeoutRef.current);
    
    const timeoutDuration = timeoutMs - (WARNING_TIME * 1000);
    
    timeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeRemaining(WARNING_TIME);
      
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            handleAutoLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      warningRef.current = setTimeout(() => {
        handleAutoLogout();
      }, WARNING_TIME * 1000);
      
    }, timeoutDuration);
  }, [getTimeoutMs, handleAutoLogout]);

  // ✅ Handle user activity
  const handleActivity = useCallback(() => {
    if (!showWarning) {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const timeoutMs = getTimeoutMs();
      
      if (elapsed > timeoutMs * 0.5) {
        resetTimers();
      } else {
        lastActivityRef.current = now;
      }
    } else {
      extendSession();
    }
  }, [showWarning, resetTimers, extendSession, getTimeoutMs]);

  // ✅ Setup activity listeners
  useEffect(() => {
    const isAuthPage = window.location.pathname.includes('/auth/');
    const isPublicPage = window.location.pathname === '/' || 
                         window.location.pathname.includes('/pricing') ||
                         window.location.pathname.includes('/about') ||
                         window.location.pathname.includes('/services') ||
                         window.location.pathname.includes('/contact');
    
    if (isAuthPage || isPublicPage) {
      return;
    }

    resetTimers();

    const events = ['mousedown', 'keydown', 'scroll', 'mousemove', 'click', 'touchstart'];
    
    const activityHandler = () => {
      handleActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler);
    });

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    const beforeUnloadHandler = () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(warningRef.current);
      clearInterval(countdownRef.current);
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, activityHandler);
      });
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      
      clearTimeout(timeoutRef.current);
      clearTimeout(warningRef.current);
      clearInterval(countdownRef.current);
    };
  }, [resetTimers, handleActivity]);

  // ✅ Update timeout when user changes or timeouts update
  useEffect(() => {
    if (user && !timeoutsLoading) {
      resetTimers();
    }
  }, [user, sessionTimeouts, timeoutsLoading, resetTimers]);

  // ✅ Add debug div for testing
  useEffect(() => {
    const debugDiv = document.createElement('div');
    debugDiv.setAttribute('data-session-timeout', 'mounted');
    debugDiv.style.display = 'none';
    document.body.appendChild(debugDiv);
    
    return () => {
      if (debugDiv.parentNode) {
        debugDiv.parentNode.removeChild(debugDiv);
      }
    };
  }, []);

  // ✅ Function to create emergency modal directly in DOM
  const createEmergencyModal = useCallback(() => {
    const existingModal = document.querySelector('#emergency-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modalContainer = document.createElement('div');
    modalContainer.id = 'emergency-modal';
    modalContainer.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm';
    
    modalContainer.innerHTML = `
      <div class="max-w-md w-full bg-[#0d1222] border border-amber-500/30 rounded-2xl p-6 shadow-2xl">
        <div class="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="text-amber-400 animate-pulse" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-white text-center mb-2">Session Expiring Soon</h3>
        <p class="text-gray-400 text-sm text-center mb-4">You've been inactive for a while. Your session will expire in:</p>
        <div class="flex items-center justify-center gap-2 mb-6">
          <div class="text-4xl font-extrabold text-amber-400" id="emergencyCountdown">30</div>
          <span class="text-gray-400 text-sm">seconds</span>
        </div>
        <div class="w-full h-1.5 bg-white/5 rounded-full mb-6 overflow-hidden">
          <div id="emergencyProgress" class="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full" style="width:100%"></div>
        </div>
        <div class="flex gap-3">
          <button id="emergencyStayBtn" class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Stay Logged In
          </button>
          <button id="emergencyLogoutBtn" class="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
        <p class="text-[10px] text-gray-500 text-center mt-4">Your session will be automatically terminated if no activity is detected.</p>
      </div>
    `;
    
    document.body.appendChild(modalContainer);
    
    let count = 30;
    const countdownEl = document.getElementById('emergencyCountdown');
    const progressEl = document.getElementById('emergencyProgress');
    
    if (window._emergencyInterval) {
      clearInterval(window._emergencyInterval);
    }
    
    window._emergencyInterval = setInterval(() => {
      count--;
      if (countdownEl) countdownEl.textContent = count;
      if (progressEl) progressEl.style.width = (count / 30 * 100) + '%';
      
      if (count <= 0) {
        clearInterval(window._emergencyInterval);
        const modal = document.querySelector('#emergency-modal');
        if (modal) modal.remove();
        handleAutoLogout();
      }
    }, 1000);
    
    const stayBtn = document.getElementById('emergencyStayBtn');
    const logoutBtn = document.getElementById('emergencyLogoutBtn');
    
    if (stayBtn) {
      stayBtn.onclick = () => {
        clearInterval(window._emergencyInterval);
        const modal = document.querySelector('#emergency-modal');
        if (modal) modal.remove();
        extendSession();
      };
    }
    
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        clearInterval(window._emergencyInterval);
        const modal = document.querySelector('#emergency-modal');
        if (modal) modal.remove();
        handleAutoLogout();
      };
    }
  }, [handleAutoLogout, extendSession]);

  // ✅ Expose test functions - FIXED with proper dependency array and cleanup
  useEffect(() => {
    window.showEmergencyModal = createEmergencyModal;
    
    window.__testSession = {
      forceWarning: createEmergencyModal,
      extendSession: () => {
        const modal = document.querySelector('#emergency-modal');
        if (modal) modal.remove();
        extendSession();
      },
      forceLogout: () => {
        const modal = document.querySelector('#emergency-modal');
        if (modal) modal.remove();
        handleAutoLogout();
      },
      getStatus: () => ({
        showWarning,
        timeRemaining,
        isIdle,
        timeoutMinutes: getUserTimeout(),
        hasUser: !!user,
        path: window.location.pathname,
        isMounted: true,
        timeoutsSource: sessionTimeouts ? 'backend' : 'default',
        availableRoles: sessionTimeouts ? Object.keys(sessionTimeouts) : Object.keys(DEFAULT_TIMEOUTS)
      })
    };
    
    console.log('✅ SessionTimeoutManager mounted');
    console.log('📊 Available roles:', sessionTimeouts ? Object.keys(sessionTimeouts) : Object.keys(DEFAULT_TIMEOUTS));
    
    // ✅ Cleanup - remove window variables on unmount
    return () => {
      delete window.showEmergencyModal;
      delete window.__testSession;
    };
  }, [createEmergencyModal, extendSession, handleAutoLogout, showWarning, timeRemaining, isIdle, user, getUserTimeout, sessionTimeouts]);

  // ✅ Don't render until timeouts are loaded
  if (timeoutsLoading) {
    return <>{children}</>;
  }

  return (
    <>
      <div style={{ display: 'none' }} data-session-timeout="mounted">
        SessionTimeoutManager is mounted
      </div>
      
      {children}
      
      {/* ✅ Warning Modal - React Version */}
      <AnimatePresence>
        {showWarning && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="max-w-md w-full bg-[#0d1222] border border-amber-500/30 rounded-2xl p-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock size={32} className="text-amber-400 animate-pulse" />
              </div>
              
              <h3 className="text-xl font-bold text-white text-center mb-2">
                Session Expiring Soon
              </h3>
              
              <p className="text-gray-400 text-sm text-center mb-4">
                You've been inactive for a while. Your session will expire in:
              </p>
              
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="text-4xl font-extrabold text-amber-400">
                  {timeRemaining}
                </div>
                <span className="text-gray-400 text-sm">seconds</span>
              </div>
              
              <div className="w-full h-1.5 bg-white/5 rounded-full mb-6 overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: WARNING_TIME, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={extendSession}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Stay Logged In
                </button>
                <button
                  onClick={handleAutoLogout}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
              
              <p className="text-[10px] text-gray-500 text-center mt-4">
                Your session will be automatically terminated if no activity is detected.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default SessionTimeoutManager;