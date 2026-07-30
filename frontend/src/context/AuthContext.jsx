// frontend/src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import axios from 'axios';
import { maintenanceService } from '../services/maintenanceService';

const AuthContext = createContext(null);

// ✅ Role definitions
const STAFF_ROLES = ['super_admin', 'admin', 'validator', 'finance', 'finance_admin'];
const ADMIN_ROLES = ['admin', 'super_admin', 'finance_admin'];
const MAINTENANCE_ALLOWED_ROLES = ['admin', 'super_admin', 'finance_admin', 'finance'];
const MAINTENANCE_READONLY_ROLES = ['validator'];

// ✅ Session timeout configuration
const SESSION_TIMEOUTS = {
  admin: 15,
  super_admin: 15,
  finance_admin: 10,
  finance: 10,
  validator: 15,
  tutor: 20,
  student: 45
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [privileges, setPrivileges] = useState([]);
  // ✅ 'initializing' gates the very first render (session recovery on page load only).
  //    'loading' is a per-action flag (login/logout in progress) — it must NEVER
  //    unmount the app, or a failed login wipes out the child component's local
  //    error state before the user ever sees it.
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  
  // ✅ Add maintenance details state
  const [maintenanceDetails, setMaintenanceDetails] = useState({
    estimatedTime: null,
    message: ''
  });

  // ✅ Check maintenance status and details on mount and periodically
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        // ✅ Get full maintenance details
        const details = await maintenanceService.getMaintenanceDetails();
        setIsMaintenance(details.isMaintenance);
        setMaintenanceDetails({
          estimatedTime: details.estimatedTime || null,
          message: details.message || ''
        });
      } catch (error) {
        console.error('Maintenance check failed:', error);
        setIsMaintenance(false);
        setMaintenanceDetails({
          estimatedTime: null,
          message: ''
        });
      }
    };
    
    checkMaintenance();
    
    // Check every 30 seconds
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  // ---------- Helper: Extract user data from API response ----------
  const extractUserData = (data) => {
    if (!data) return null;

    const rawUser = data.user || data;

    if (!rawUser.role && !rawUser.email && !rawUser.uid && !rawUser.id) {
      return null;
    }

    return {
      id: rawUser.id || rawUser.uid || '',
      uid: rawUser.uid || rawUser.id || '',
      email: rawUser.email || '',
      role: rawUser.role || 'student',
      status: rawUser.status || 'active',
      privileges: rawUser.privileges || [],
      name: rawUser.name || 'User',
      languageScope: rawUser.languageScope || 'All',
      isPreAuthorized: rawUser.isPreAuthorized || false
    };
  };

  // ==========================================
  // 1. REGISTER WORKFLOW
  // ==========================================
  const register = async (email, password, userData, userRole) => {
    try {
      const role = userRole || 'student';
      
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role: role,
          userData: {
            ...userData,
            role: role
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration processing failed on the backend.');
      }

      if (data.user?.isPreAuthorized) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (firebaseErr) {
          console.warn('Firebase client session sync deferred:', firebaseErr.message);
        }
      }

      return data;
    } catch (error) {
      console.error('Auth Engine Registration Failure:', error);
      throw error;
    }
  };

// ==========================================
// 2. UNIFIED PUBLIC LOGIN GATEWAY 
// ==========================================
const login = async (email, password) => {
  try {
    setLoading(true); // safe now — no longer gates app render
    
    // ✅ Check maintenance before login attempt
    const maintenanceStatus = await maintenanceService.checkMaintenanceStatus();
    if (maintenanceStatus) {
      throw new Error('Platform is currently under maintenance. Please try again later.');
    }
    
    // ✅ Validate inputs before Firebase call
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    
    console.log('🔑 Attempting login for:', email);
    
    // ✅ Try to sign in with Firebase
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase signIn successful');
    } catch (firebaseError) {
      console.error('🔥 Firebase Auth Error Code:', firebaseError.code);
      console.error('🔥 Firebase Auth Error Message:', firebaseError.message);
      
      // ✅ Map Firebase error codes to user-friendly messages
      const errorMessages = {
        'auth/user-not-found': 'No account found with this email address. Please check your email or register.',
        'auth/wrong-password': 'Incorrect password. Please try again or click "Forgot password" to reset.',
        'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
        'auth/invalid-email': 'Invalid email format. Please enter a valid email address.',
        'auth/user-disabled': 'Your account has been disabled. Please contact support.',
        'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
        'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
        'auth/invalid-login-credentials': 'Invalid email or password. Please check your credentials and try again.'
      };
      
      const userMessage = errorMessages[firebaseError.code] || firebaseError.message || 'Authentication failed. Please try again.';
      console.error('🔥 User-friendly message:', userMessage);
      throw new Error(userMessage);
    }

    const idToken = await userCredential.user.getIdToken(true);
    console.log('✅ ID Token obtained');

    // ✅ Call backend to get user profile
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Backend login error:', response.status, data);
      
      // ✅ Handle backend specific errors
      if (response.status === 403) {
        throw new Error('Access Denied: Staff accounts must use the Staff Login portal.');
      } else if (response.status === 404) {
        throw new Error('User profile not found. Please complete your registration.');
      } else if (response.status === 401) {
        throw new Error('Invalid email or password. Please try again.');
      } else {
        throw new Error(data.message || 'Authentication failed. Please try again.');
      }
    }

    console.log('✅ Backend login successful');

    if (data.status === 'profile_incomplete' || data.user?.status === 'profile_incomplete') {
      return data.user || data;
    }

    const authenticatedUser = extractUserData(data);

    if (!authenticatedUser) {
      throw new Error('Invalid user profile configuration returned from backend.');
    }

    // ✅ Store token and user data
    localStorage.setItem('token', idToken);
    localStorage.setItem('userRole', authenticatedUser.role);
    localStorage.setItem('user', JSON.stringify(authenticatedUser));
    localStorage.setItem('lastActivity', Date.now().toString());

    // ✅ Set axios default header
    axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;

    setUser(authenticatedUser);
    setRole(authenticatedUser.role);
    setPrivileges(authenticatedUser.privileges || []);

    console.log('✅ Login successful:', authenticatedUser.email);
    return authenticatedUser;
  } catch (error) {
    console.error('❌ Login error in AuthContext:', error.message);
    // ✅ Ensure error is properly thrown to LoginPage
    throw error;
  } finally {
    setLoading(false);
  }
};

  // ==========================================
  // 3. SECURE SYSTEM STAFF ENTRY GATEWAY - ✅ FIXED
  // ==========================================
  const loginStaff = async (email, password) => {
    try {
      setLoading(true);

      // ✅ Check maintenance before login attempt
      const maintenanceStatus = await maintenanceService.checkMaintenanceStatus();
      if (maintenanceStatus) {
        throw new Error('Platform is currently under maintenance. Please try again later.');
      }

      const response = await fetch('http://localhost:5000/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('❌ Staff login error:', response.status, data);
        
        // ✅ Better error messages for staff login
        if (response.status === 404) {
          throw new Error('Staff account not found. Please check your email.');
        } else if (response.status === 403) {
          throw new Error('Access Denied: You do not have staff privileges.');
        } else if (response.status === 401) {
          throw new Error('Incorrect password. Please try again.');
        } else {
          throw new Error(data.message || 'Staff portal authentication failed.');
        }
      }

      const authenticatedStaff = extractUserData(data);

      // ✅ Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', authenticatedStaff.role);
      localStorage.setItem('user', JSON.stringify(authenticatedStaff));
      localStorage.setItem('lastActivity', Date.now().toString());

      // ✅ Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      setUser(authenticatedStaff);
      setRole(authenticatedStaff.role);
      setPrivileges(authenticatedStaff.privileges || []);

      console.log('✅ Staff login successful:', authenticatedStaff.email);
      return authenticatedStaff;
    } catch (error) {
      console.error('❌ Staff login error:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 4. GOOGLE SIGN-IN WORKFLOW - ✅ FIXED
  // ==========================================
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      
      const maintenanceStatus = await maintenanceService.checkMaintenanceStatus();
      if (maintenanceStatus) {
        throw new Error('Platform is currently under maintenance. Please try again later.');
      }
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken(true);

      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Google login error:', response.status, data);
        throw new Error(data.message || 'Google Auth verification failed on backend');
      }

      if (data.status === 'profile_incomplete') {
        return data;
      }

      const authenticatedUser = extractUserData(data);

      if (!authenticatedUser) {
        throw new Error('Invalid user profile configuration returned from Google gateway.');
      }

      // ✅ Store token and user data
      localStorage.setItem('token', idToken);
      localStorage.setItem('userRole', authenticatedUser.role);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
      localStorage.setItem('lastActivity', Date.now().toString());

      // ✅ Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;

      setUser(authenticatedUser);
      setRole(authenticatedUser.role);
      setPrivileges(authenticatedUser.privileges || []);

      console.log('✅ Google login successful:', authenticatedUser.email);
      return authenticatedUser;
    } catch (error) {
      console.error('❌ Google login error:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 5. LOGOUT WORKFLOW - ✅ ENHANCED with session cleanup
  // ==========================================
  const logout = async () => {
    try {
      setLoading(true);
      
      // ✅ Clear session data
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionTimeout');
      localStorage.removeItem('lastActivity');
      
      // ✅ Clear axios authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      // ✅ Firebase sign out
      await firebaseSignOut(auth);
      
      console.log('✅ Session cleaned up successfully');
    } catch (error) {
      console.error('Session teardown error:', error);
    } finally {
      setUser(null);
      setRole(null);
      setPrivileges([]);
      setLoading(false);
    }
  };

  // ==========================================
  // 6. REAL-TIME SESSION RECOVERY HOOK - ✅ FIXED
  // ==========================================
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    const savedRole = localStorage.getItem('userRole');

    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setRole(savedRole || parsedUser.role);
        setPrivileges(parsedUser.privileges || []);
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      } catch (e) {
        console.error('Failed to parse local storage user data', e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const storedRole = localStorage.getItem('userRole');

      // Stop background sync for ALL staff/admin roles
      if (STAFF_ROLES.includes(storedRole)) {
        setInitializing(false);
        return;
      }

      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });

          if (response.ok) {
            const data = await response.json();
            const authenticatedUser = extractUserData(data);

            if (authenticatedUser && authenticatedUser.role) {
              // ✅ Store token and user data
              localStorage.setItem('token', idToken);
              localStorage.setItem('userRole', authenticatedUser.role);
              localStorage.setItem('user', JSON.stringify(authenticatedUser));
              localStorage.setItem('lastActivity', Date.now().toString());

              // ✅ Set axios default header
              axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;

              setUser(authenticatedUser);
              setRole(authenticatedUser.role);
              setPrivileges(authenticatedUser.privileges || []);
            }
          }
        } catch (error) {
          console.error('Background session sync failed:', error);
        }
      } else {
        if (!localStorage.getItem('user')) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('lastActivity');
          setUser(null);
          setRole(null);
          setPrivileges([]);
        }
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Helper functions for maintenance checks
  const isAdmin = () => {
    const currentRole = role || localStorage.getItem('userRole');
    return ADMIN_ROLES.includes(currentRole);
  };

  const canAccessDuringMaintenance = () => {
    const currentRole = role || localStorage.getItem('userRole');
    return MAINTENANCE_ALLOWED_ROLES.includes(currentRole);
  };

  const hasReadOnlyAccess = () => {
    const currentRole = role || localStorage.getItem('userRole');
    return MAINTENANCE_READONLY_ROLES.includes(currentRole);
  };

  // ✅ Get maintenance details helper
  const getMaintenanceDetails = () => {
    return maintenanceDetails;
  };

  // ✅ Get session timeout for current user
  const getSessionTimeout = () => {
    const userRole = role || localStorage.getItem('userRole') || 'student';
    return SESSION_TIMEOUTS[userRole] || 45;
  };

  // ✅ Get session timeout in milliseconds
  const getSessionTimeoutMs = () => {
    return getSessionTimeout() * 60 * 1000;
  };

  // ✅ Check if session is expired
  const isSessionExpired = () => {
    const lastActivity = localStorage.getItem('lastActivity');
    if (!lastActivity) return false;
    
    const now = Date.now();
    const timeoutMs = getSessionTimeoutMs();
    const elapsed = now - parseInt(lastActivity);
    
    return elapsed > timeoutMs;
  };

  // ✅ Update last activity timestamp
  const updateLastActivity = () => {
    localStorage.setItem('lastActivity', Date.now().toString());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        privileges,
        loading,        // per-action (login/logout in progress) — safe to use for button spinners
        initializing,   // true only during the initial page-load session check
        isMaintenance,
        maintenanceDetails,
        getMaintenanceDetails,
        isAdmin,
        canAccessDuringMaintenance,
        hasReadOnlyAccess,
        getSessionTimeout,
        getSessionTimeoutMs,
        isSessionExpired,
        updateLastActivity,
        register,
        login,
        loginStaff,
        loginWithGoogle,
        logout
      }}
    >
      {!initializing && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth must be used within an AuthProvider Wrapper.');
  }
  return context;
};