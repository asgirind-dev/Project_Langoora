// backend/middleware/maintenanceMiddleware.js
const { db } = require('../config/firebase');

// Cache maintenance mode status with TTL
let maintenanceCache = {
  status: false,
  lastChecked: null,
  ttl: 30000 // 30 seconds
};

// ✅ Role-based access control for maintenance mode
const MAINTENANCE_ALLOWED_ROLES = [
  'admin', 
  'super_admin', 
  'finance_admin',
  'finance'
];

// ✅ Read-only access during maintenance
const MAINTENANCE_READONLY_ROLES = [
  'validator'
];

async function getMaintenanceStatus() {
  if (maintenanceCache.lastChecked && 
      (Date.now() - maintenanceCache.lastChecked) < maintenanceCache.ttl) {
    return maintenanceCache.status;
  }

  try {
    const doc = await db.collection('system_settings').doc('security_governance').get();
    const data = doc.exists ? doc.data() : {};
    const status = data.maintenanceMode === true;
    
    maintenanceCache.status = status;
    maintenanceCache.lastChecked = Date.now();
    
    return status;
  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    return false;
  }
}

async function getUserRole(req) {
  try {
    if (req.user) {
      return req.user.role;
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;

    const jwt = require('jsonwebtoken');
    const { auth } = require('../config/firebase');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_production_2026');
      const userDoc = await db.collection('users').doc(decoded.id).get();
      if (userDoc.exists) {
        return userDoc.data().role;
      }
    } catch (jwtErr) {
      try {
        const decoded = await auth.verifyIdToken(token);
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        if (userDoc.exists) {
          return userDoc.data().role;
        }
      } catch (firebaseErr) {
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

async function maintenanceMiddleware(req, res, next) {
  // ✅ Skip maintenance check for these paths (always allow)
  const skipPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/staff-login',
    '/api/system-settings/security',
    '/api/system-settings/global',
    '/api/notifications',
    '/api/users/preauth-check'
  ];
  
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const isMaintenance = await getMaintenanceStatus();
  
  // If maintenance is OFF, allow all
  if (!isMaintenance) {
    return next();
  }

  // ✅ Get user role
  const userRole = await getUserRole(req);

  // ✅ FULL ACCESS - Admin roles
  if (userRole && MAINTENANCE_ALLOWED_ROLES.includes(userRole)) {
    return next();
  }

  // ✅ READ-ONLY ACCESS - Validator (GET only)
  if (userRole && MAINTENANCE_READONLY_ROLES.includes(userRole)) {
    if (req.method === 'GET') {
      return next();
    }
    return res.status(503).json({
      success: false,
      message: 'Platform is under maintenance. Write operations are disabled.',
      maintenance: true,
      limitedAccess: true
    });
  }

  // ❌ BLOCKED - All other users (students, tutors, public)
  return res.status(503).json({
    success: false,
    message: 'Platform is currently under maintenance. Please try again later.',
    maintenance: true
  });
}

module.exports = { maintenanceMiddleware, getMaintenanceStatus };