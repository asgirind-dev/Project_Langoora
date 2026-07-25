// frontend/src/hooks/useSessionTimeout.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DEFAULT_TIMEOUTS = {
  admin: 15,
  super_admin: 15,
  finance_admin: 10,
  finance: 10,
  validator: 15,
  tutor: 20,
  student: 45
};

const WARNING_TIME = 30;

export function useSessionTimeout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(WARNING_TIME);
  
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const getUserTimeout = useCallback(() => {
    const userRole = user?.role || localStorage.getItem('userRole') || 'student';
    return DEFAULT_TIMEOUTS[userRole] || 45;
  }, [user]);

  const getTimeoutMs = useCallback(() => {
    return getUserTimeout() * 60 * 1000;
  }, [getUserTimeout]);

  const handleAutoLogout = useCallback(async () => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
    setShowWarning(false);
    
    await logout();
    navigate('/auth/login', { 
      state: { 
        message: 'Your session has expired due to inactivity. Please login again.' 
      } 
    });
  }, [logout, navigate]);

  const extendSession = useCallback(() => {
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
    setShowWarning(false);
    setTimeRemaining(WARNING_TIME);
    lastActivityRef.current = Date.now();
    
    const timeoutMs = getTimeoutMs();
    clearTimeout(timeoutRef.current);
    
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
      
    }, timeoutMs - (WARNING_TIME * 1000));
  }, [getTimeoutMs, handleAutoLogout]);

  const resetTimers = useCallback(() => {
    const timeoutMs = getTimeoutMs();
    
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
    
    setShowWarning(false);
    setTimeRemaining(WARNING_TIME);
    lastActivityRef.current = Date.now();
    
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
      
    }, timeoutMs - (WARNING_TIME * 1000));
  }, [getTimeoutMs, handleAutoLogout]);

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

  return {
    showWarning,
    timeRemaining,
    handleActivity,
    resetTimers,
    extendSession,
    handleAutoLogout
  };
}