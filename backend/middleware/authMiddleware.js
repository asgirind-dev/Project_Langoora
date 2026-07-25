// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { auth, db } = require('../config/firebase');

// ✅ Role definitions
const ADMIN_ROLES = ['admin', 'super_admin', 'finance_admin'];
const MAINTENANCE_ALLOWED_ROLES = ['admin', 'super_admin', 'finance_admin', 'finance'];
const MAINTENANCE_READONLY_ROLES = ['validator'];

/**
 * 1. Authentication Middleware
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      let decodedUID;
      let fullUserData = {};

      try {
        const verifiedJWT = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_production_2026');
        decodedUID = verifiedJWT.id;
      } catch (jwtErr) {
        const decodedFirebase = await auth.verifyIdToken(token);
        decodedUID = decodedFirebase.uid;
      }

      const userDoc = await db.collection('users').doc(decodedUID).get();

      if (!userDoc.exists) {
        return res.status(401).json({
          success: false,
          message: 'User profile not found in database.'
        });
      }

      fullUserData = userDoc.data();

      // --- RBAC: Fetch role ---
      let roleData = null;
      let permissions = {};
      let roleName = fullUserData.role || 'student';

      if (fullUserData.roleId) {
        const roleDoc = await db.collection('roles').doc(fullUserData.roleId).get();
        if (roleDoc.exists) {
          roleData = roleDoc.data();
          roleName = roleData.name || roleName;
          permissions = roleData.permissions || {};
          if (fullUserData.customPermissions) {
            permissions = { ...permissions, ...fullUserData.customPermissions };
          }
        }
      } else if (fullUserData.role) {
        const roleNameToId = {
          'admin': 'super_admin',
          'super_admin': 'super_admin',
          'validator': 'validator',
          'finance': 'finance',
          'finance_admin': 'finance_admin',
          'tutor': 'tutor',
          'student': 'student'
        };
        const mappedRoleId = roleNameToId[fullUserData.role];
        if (mappedRoleId) {
          const roleDoc = await db.collection('roles').doc(mappedRoleId).get();
          if (roleDoc.exists) {
            roleData = roleDoc.data();
            roleName = roleData.name || fullUserData.role;
            permissions = roleData.permissions || {};
          }
        }
      }

      const effectiveRole = fullUserData.roleId || fullUserData.role || 'student';

      req.user = {
        uid: decodedUID,
        email: fullUserData.email || '',
        role: effectiveRole,
        roleName: roleName,
        roleId: fullUserData.roleId || null,
        roleData: roleData,
        permissions: permissions,
        ...fullUserData
      };

      return next();

    } catch (error) {
      console.error('Security Perimeter Breach: Token Verification Failed:', error.message);
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

/**
 * 3. Permission-Based Authorization Middleware
 */
const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No user attached.' });
      }

      const permissions = user.permissions || {};

      if (!permissions[permissionKey]) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Permission '${permissionKey}' is required to perform this action.`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error.message);
      return res.status(500).json({ success: false, message: 'Internal server error during authorization.' });
    }
  };
};

/**
 * 4. Role Level Check
 */
const requireLevel = (maxLevel) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No user attached.' });
      }

      const roleData = user.roleData;
      if (!roleData || roleData.level === undefined) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Your role does not have a defined privilege level.'
        });
      }

      if (roleData.level >= maxLevel) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Your privilege level (${roleData.level}) is not sufficient. Required level: < ${maxLevel}.`
        });
      }

      next();
    } catch (error) {
      console.error('Level check error:', error.message);
      return res.status(500).json({ success: false, message: 'Internal server error during authorization.' });
    }
  };
};

module.exports = {
  protect,
  authorizeRoles,
  requirePermission,
  requireLevel,
  ADMIN_ROLES,
  MAINTENANCE_ALLOWED_ROLES,
  MAINTENANCE_READONLY_ROLES
};