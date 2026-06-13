// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  signInWithPopup,          
  GoogleAuthProvider,       
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [privileges, setPrivileges] = useState([]); 
  const [loading, setLoading] = useState(true); 

  // ==========================================
  // 1. REGISTER WORKFLOW (No Auto-Login)
  // ==========================================
  const register = async (email, password, userData, userRole) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role: userRole,
          userData
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration processing failed on the backend.');
      }

      // FIXED: Auto-login disabled for normal form registration. 
      // User must redirect to login screen manually.
      return data; 
    } catch (error) {
      console.error("Auth Engine Registration Failure:", error);
      throw error;
    }
  };

  // ==========================================
  // 2. UNIFIED LOGIN GATEWAY WORKFLOW
  // ==========================================
  const login = async (email, password) => {
    try {
      let requestBody = {};
      const targetEmail = email.toLowerCase().trim();

      if (targetEmail === 'admin@novacore.com') {
        requestBody = { email: targetEmail, password };
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        requestBody = { idToken };
      }

      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication processing phase failed');
      }

      // Safe Extraction: Ensure user mapping naturally contains fallback status attributes
      const authenticatedUser = {
        ...data.user,
        status: data.user.status || 'active' // Fallback to active if not explicitly set (e.g. admin/student)
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));

      setUser(authenticatedUser);
      setRole(authenticatedUser.role);
      setPrivileges(authenticatedUser.privileges || []);
      
      return authenticatedUser;
    } catch (error) {
      console.error("Identity Validation Session Failure:", error);
      throw error;
    }
  };

  // ==========================================
  // 3. NEW: GOOGLE SIGN-IN & UPGRADE WORKFLOW 
  // ==========================================
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Google Auth verification failed on backend');
      }

      // FIXED: Check if the backend says profile is incomplete
      if (data.status === 'profile_incomplete') {
        return data; // Return the metadata containing uid, email, name to handle redirection
      }

      const authenticatedUser = {
        ...data.user,
        status: data.user.status || 'active'
      };

      // If user profile is already fully setup, commit to active session state
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));

      setUser(authenticatedUser);
      setRole(authenticatedUser.role);
      setPrivileges(authenticatedUser.privileges || []);

      return authenticatedUser;
    } catch (error) {
      console.error("Google Authentication Workflow Failure:", error);
      throw error;
    }
  };

  // ==========================================
  // 4. LOGOUT WORKFLOW
  // ==========================================
  const logout = async () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Session teardown error:", error);
    } finally {
      setUser(null);
      setRole(null);
      setPrivileges([]);
    }
  };

  // ==========================================
  // 5. SESSION RECOVERY HOOK
  // ==========================================
  useEffect(() => {
    const checkPersistedAuthSession = () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setRole(parsedUser.role);
          setPrivileges(parsedUser.privileges || []);
        } catch (err) {
          console.error("Corrupted state session structures wiped:", err);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    checkPersistedAuthSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, privileges, register, login, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);