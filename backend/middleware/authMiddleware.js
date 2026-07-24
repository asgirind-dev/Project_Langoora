const jwt = require('jsonwebtoken');
const { auth, db } = require('../config/firebase');

/**
 * 1. Authentication Middleware
 * Intercepts incoming requests and validates either a Custom JWT Token (Internal Staff)
 * or a Native Firebase ID Token (Students/Tutors).
 *
 * Now also fetches the user's role document and attaches permissions to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      let decodedUID;
      let fullUserData = {};

      // Strategy A: Attempt to decode via Custom JWT signing scheme (Staff Sessions)
      try {
        const verifiedJWT = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_production_2026');
        decodedUID = verifiedJWT.id;
      } catch (jwtErr) {
        // Strategy B: Fallback to verification against Native Firebase Identity Management Service
        const decodedFirebase = await auth.verifyIdToken(token);
        decodedUID = decodedFirebase.uid;
      }

      // Fetch verified user metadata block from central database node
      const userDoc = await db.collection('users').doc(decodedUID).get();

      if (!userDoc.exists) {
        return res.status(401).json({
          success: false,
          message: 'User profile not found in database.'
        });
      }

      fullUserData = userDoc.data();

      // --- RBAC: Fetch the user's role document if roleId exists ---
      let roleData = null;
      let permissions = {};
      let roleName = fullUserData.role || 'student'; // fallback display name

      if (fullUserData.roleId) {
        const roleDoc = await db.collection('roles').doc(fullUserData.roleId).get();
        if (roleDoc.exists) {
          roleData = roleDoc.data();
          roleName = roleData.name || roleName;
          permissions = roleData.permissions || {};
          if (fullUserData.customPermissions) {
            permissions = { ...permissions, ...fullUserData.customPermissions };
          }
        } else {
          console.warn(`Role ${fullUserData.roleId} not found for user ${decodedUID}`);
        }
      } else if (fullUserData.role) {
        // 🔥 IMPROVED: Map legacy role strings to roleId
        const roleNameToId = {
          'admin': 'super_admin',
          'super_admin': 'super_admin',
          'validator': 'validator',
          'finance': 'finance',
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
            if (fullUserData.customPermissions) {
              permissions = { ...permissions, ...fullUserData.customPermissions };
            }
            console.log(`✅ Mapped legacy role '${fullUserData.role}' to roleId '${mappedRoleId}' for user ${decodedUID}`);
          }
        } else {
          console.warn(`User ${decodedUID} has legacy role string '${fullUserData.role}' without roleId.`);
        }
      }

      // ✅ FIX: Set role to the roleId for authorization checks, keep roleName for display
      const effectiveRole = fullUserData.roleId || fullUserData.role || 'student';

      // Attach everything to req.user
      req.user = {
        uid: decodedUID,
        email: fullUserData.email || '',
        role: effectiveRole,                // ✅ used for authorizeRoles
        roleName: roleName,                // human-readable name
        roleId: fullUserData.roleId || null,
        roleData: roleData,                // full role document data (if any)
        permissions: permissions,          // effective permissions (merged with custom)
        ...fullUserData                    // include all original fields
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
 * 2. Role-Based Authorization Middleware (legacy)
 * Evaluates authenticated session context mappings against restricted administrative boundaries.
 * This is kept for backward compatibility with existing routes that use role names.
 * New routes should use requirePermission.
 */
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user && req.user.role; // now uses roleId

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
 * Checks if the authenticated user has a specific permission.
 * Usage: router.put('/admin/route', protect, requirePermission('manage_users'), controller)
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
 * Ensures the user's role level is lower (more privileged) than a given level.
 * Usage: requireLevel(2) would allow only roles with level < 2 (i.e., super_admin only).
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
  requireLevel
};

