import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  signInWithPopup,          
  GoogleAuthProvider,       
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [privileges, setPrivileges] = useState([]); 
  const [loading, setLoading] = useState(true); 

  // Helper function to carefully parse data structures from backend response
  const extractUserData = (data) => {
    console.log("=== BACKEND RAW DATA RECOVERY ===");
    console.log("Full Data Object:", data);
    console.log("Nested User Object:", data?.user);
    console.log("=================================");

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
      name: rawUser.name || 'User'
    };
  };

  // ==========================================
  // 1. REGISTER WORKFLOW
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

      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (firebaseErr) {
        console.warn("Firebase client session sync deferred:", firebaseErr.message);
      }

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
        throw new Error("Invalid user profile configuration returned from backend gateway.");
      }

      localStorage.setItem('token', idToken);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));

      setUser(authenticatedUser);
      setRole(authenticatedUser.role);
      setPrivileges(authenticatedUser.privileges || []);
      
      return authenticatedUser;
    } catch (error) {
      console.error("Identity Validation Session Failure:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. GOOGLE SIGN-IN WORKFLOW 
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
        throw new Error("Invalid user profile configuration returned from Google gateway.");
      }

      localStorage.setItem('token', idToken);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));

      setUser(authenticatedUser);
      setRole(authenticatedUser.role);
      setPrivileges(authenticatedUser.privileges || []);

      return authenticatedUser;
    } catch (error) {
      console.error("Google Authentication Workflow Failure:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 4. LOGOUT WORKFLOW
  // ==========================================
  const logout = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Session teardown error:", error);
    } finally {
      setUser(null);
      setRole(null);
      setPrivileges([]);
      setLoading(false);
    }
  };

  // ==========================================
  // 5. REAL-TIME SESSION RECOVERY HOOK 
  // ==========================================
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setRole(parsedUser.role);
        setPrivileges(parsedUser.privileges || []);
      } catch (e) {
        console.error("Failed to parse local storage user data", e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
              localStorage.setItem('user', JSON.stringify(authenticatedUser));
              
              setUser(authenticatedUser);
              setRole(authenticatedUser.role);
              setPrivileges(authenticatedUser.privileges || []);
            }
          }
        } catch (error) {
          console.error("Background session sync failed:", error);
        }
      } else {
        // 🔒 🚀 FIX HERE: යූසර් ඇත්තටම 'user' ඩේටා එකක් localStorage එකේ නැත්නම් විතරක් (ඒ කියන්නේ වැරදි ලොගින් එකක් නොවී, ඇත්තටම ලොග් අවුට් වුණ වෙලාවක විතරක්) මේක රන් වෙන්න දෙනවා.
        // මේකෙන් තමයි වැරදි ලොගින් එකකදී මුළු පේජ් එකම හිස් වෙලා යන එක නවත්වන්නේ!
        if (!localStorage.getItem('user')) {
          localStorage.removeItem('token');
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
    <AuthContext.Provider value={{ user, role, privileges, register, login, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error("useAuth must be used within an AuthProvider Wrapper.");
  }
  return context;
};