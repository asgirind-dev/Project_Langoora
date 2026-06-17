const { auth, db } = require('../config/firebase'); 

/**
 * 1. Authentication Middleware
 * Validates the Firebase ID Token passed in the Authorization header.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decodedToken = await auth.verifyIdToken(token);

      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      
      let userRole = 'student'; 
      let fullUserData = {};

      if (userDoc.exists) {
        fullUserData = userDoc.data();
        userRole = fullUserData.role || 'student';
      }

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: userRole, 
        ...fullUserData
      };

      return next();

    } catch (error) {
      console.error('Firebase Token Verification Failed:', error.message);
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized, token validation failed.' 
      });
    }
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no session token found.' 
    });
  }
};

/**
 * 2. Role-Based Authorization Middleware
 * Intercepts requests to check if user has required operational access privileges.
 */
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user && req.user.role; 

      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          success: false, 
          message: `Forbidden: Access denied for role type '${userRole || 'unknown'}'.` 
        });
      }

      next();
    } catch (error) {
      console.error('Server Role Auth Error:', error.message);
      return res.status(500).json({ success: false, message: 'Server Role Auth Error' });
    }
  };
};

module.exports = { protect, authorizeRoles };