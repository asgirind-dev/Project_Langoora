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

const AuthContext = createContext(null);

// List of staff/admin roles that should NOT be synced via public login endpoint
const STAFF_ROLES = ['super_admin', 'admin', 'validator', 'finance'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [privileges, setPrivileges] = useState([]);
  const [loading, setLoading] = useState(true);

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
  // 1. REGISTER WORKFLOW - FIXED
  // ==========================================
  const register = async (email, password, userData, userRole) => {
    try {
      // ✅ Ensure role is never undefined
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

      // ✅ If user is pre-authorized staff, log them in automatically
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
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken(true);

      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication processing phase failed');
      }

      if (data.status === 'profile_incomplete' || data.user?.status === 'profile_incomplete') {
        return data.user || data;
      }

      const authenticatedUser = extractUserData(data);

      if (!authenticatedUser) {
        throw new Error('Invalid user profile configuration returned from backend gateway.');
      }

      localStorage.setItem('token', idToken);
      localStorage.setItem('userRole', authenticatedUser.role);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));

      axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;

      setUser(authenticatedUser);
      setRole(authenticatedUser.role);
      setPrivileges(authenticatedUser.privileges || []);

      return authenticatedUser;
    } catch (error) {
      console.error('Identity Validation Session Failure:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. SECURE SYSTEM STAFF ENTRY GATEWAY
  // ==========================================
  const loginStaff = async (email, password) => {
    try {
      setLoading(true);

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
        throw new Error(data.message || 'Staff portal authentication failed.');
      }

      const authenticatedStaff = extractUserData(data);

      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', authenticatedStaff.role);
      localStorage.setItem('user', JSON.stringify(authenticatedStaff));

      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      setUser(authenticatedStaff);
      setRole(authenticatedStaff.role);
      setPrivileges(authenticatedStaff.privileges || []);

      return authenticatedStaff;
    } catch (error) {
      console.error('Staff Gateway Sign-in Operation Aborted:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 4. GOOGLE SIGN-IN WORKFLOW
  // ==========================================
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
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
        throw new Error(data.message || 'Google Auth verification failed on backend');
      }

      if (data.status === 'profile_incomplete') {
        return data;
      }

      const authenticatedUser = extractUserData(data);

      if (!authenticatedUser) {
        throw new Error('Invalid user profile configuration returned from Google gateway.');
      }

      localStorage.setItem('token', idToken);
      localStorage.setItem('userRole', authenticatedUser.role);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));

      axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;

      setUser(authenticatedUser);
      setRole(authenticatedUser.role);
      setPrivileges(authenticatedUser.privileges || []);

      return authenticatedUser;
    } catch (error) {
      console.error('Google Authentication Workflow Failure:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 5. LOGOUT WORKFLOW
  // ==========================================
  const logout = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      await firebaseSignOut(auth);
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
  // 6. REAL-TIME SESSION RECOVERY HOOK
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
        setLoading(false);
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
              localStorage.setItem('token', idToken);
              localStorage.setItem('userRole', authenticatedUser.role);
              localStorage.setItem('user', JSON.stringify(authenticatedUser));

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
          setUser(null);
          setRole(null);
          setPrivileges([]);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        privileges,
        register,
        login,
        loginStaff,
        loginWithGoogle,
        logout
      }}
    >
      {!loading && children}
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