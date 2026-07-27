// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const { auth, db } = require("../config/firebase");

// ✅ Role definitions
const ADMIN_ROLES = ["admin", "super_admin", "finance_admin"];
const MAINTENANCE_ALLOWED_ROLES = ["admin", "super_admin", "finance_admin", "finance"];
const MAINTENANCE_READONLY_ROLES = ["validator"];

// ✅ ALL permissions for Super Admin
const SUPER_ADMIN_PERMISSIONS = {
  manage_users: true,
  manage_roles: true,
  manage_system: true,
  view_audit_logs: true,
  verify_tutors: true,
  audit_exams: true,
  manage_questions: true,
  approve_content: true,
  resolve_disputes: true,
  manage_subscriptions: true,
  approve_payouts: true,
  view_ledger: true,
  manage_credits: true,
  process_refunds: true,
  create_exams: true,
  manage_own_content: true,
  view_student_progress: true,
  view_reports: true,
  view_own_profile: true
};

// ✅ Finance Admin permissions - ONLY these 3
const FINANCE_ADMIN_PERMISSIONS = {
  manage_subscriptions: true,
  manage_credits: true,
  approve_payouts: true
};

/**
 * 1. Authentication Middleware - COMPLETE FIX
 * ✅ FIX 3: CORRECT ROLE DETECTION using roleId
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      let decodedUID;
      let fullUserData = {};

      try {
        const verifiedJWT = jwt.verify(
          token,
          process.env.JWT_SECRET || "fallback_secret_key_production_2026"
        );
        decodedUID = verifiedJWT.id;
      } catch (jwtErr) {
        const decodedFirebase = await auth.verifyIdToken(token);
        decodedUID = decodedFirebase.uid;
      }

      const userDoc = await db.collection("users").doc(decodedUID).get();

      if (!userDoc.exists) {
        return res.status(401).json({
          success: false,
          message: "User profile not found in database.",
        });
      }

      fullUserData = userDoc.data();
      
      // ✅✅✅ CRITICAL FIX: Use roleId if available, fallback to role
      const userRole = fullUserData.roleId || fullUserData.role || "student";
      
      console.log(`🔍 User found: ${fullUserData.email}`);
      console.log(`🔍 Role: ${fullUserData.role}`);
      console.log(`🔍 RoleId: ${fullUserData.roleId}`);
      console.log(`🔍 Final User Role: ${userRole}`);

      let permissions = {};

      // ✅ STEP 1: Check if user is SUPER_ADMIN
      if (userRole === 'super_admin') {
        // ✅ Super Admin gets ALL permissions
        permissions = { ...SUPER_ADMIN_PERMISSIONS };
        console.log(`✅ Super Admin detected - ALL permissions granted to ${fullUserData.email}`);
      } 
      // ✅ STEP 2: Check if user is FINANCE_ADMIN
      else if (userRole === 'finance' || userRole === 'finance_admin') {
        // ✅ Finance Admin gets ONLY 3 permissions
        permissions = { ...FINANCE_ADMIN_PERMISSIONS };
        console.log(`✅ Finance Admin detected - ${Object.keys(permissions).length} permissions granted to ${fullUserData.email}`);
        console.log(`📋 Finance permissions:`, Object.keys(permissions));
      } 
      else {
        // ✅ STEP 3: Load from permissions array
        if (fullUserData.permissions && Array.isArray(fullUserData.permissions)) {
          fullUserData.permissions.forEach(p => {
            if (typeof p === 'string') {
              permissions[p] = true;
            }
          });
          console.log(`✅ Loaded permissions for ${fullUserData.email}:`, Object.keys(permissions));
        }
        
        // ✅ STEP 4: Load from privileges array (legacy)
        if (fullUserData.privileges && Array.isArray(fullUserData.privileges)) {
          fullUserData.privileges.forEach(p => {
            if (typeof p === 'string') {
              permissions[p] = true;
            }
          });
          console.log(`✅ Loaded privileges for ${fullUserData.email}:`, fullUserData.privileges);
        }
        
        // ✅ STEP 5: If admin role, ensure admin permissions
        if (userRole === 'admin') {
          const adminPerms = {
            manage_users: true,
            manage_system: true,
            view_audit_logs: true,
            view_reports: true,
            view_own_profile: true
          };
          permissions = { ...permissions, ...adminPerms };
          console.log(`✅ Admin detected - added admin permissions for ${fullUserData.email}`);
        }
      }

      // ✅ Attach everything to req.user with CORRECT role
      req.user = {
        uid: decodedUID,
        id: decodedUID,
        email: fullUserData.email || "",
        role: userRole,  // ✅ "finance" විදියට set වෙනවා, "validator" නෙවෙයි
        roleId: fullUserData.roleId || userRole,
        permissions: permissions,
        ...fullUserData
      };

      console.log(`✅ User authenticated: ${fullUserData.email} with role: ${userRole}`);
      console.log(`📋 Final permissions:`, Object.keys(permissions).filter(k => permissions[k]));

      return next();
    } catch (error) {
      console.error("Security Perimeter Breach: Token Verification Failed:", error.message);
      return res.status(401).json({
        success: false,
        message: "Not authorized, token validation failed.",
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no session token found.",
    });
  }
};

/**
 * 2. Role-Based Authorization Middleware
 * ✅ FIXED: Use roleId if available
 */
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // ✅ Use roleId if available, fallback to role
      const userRole = req.user?.roleId || req.user?.role;

      if (!userRole || !allowedRoles.includes(userRole)) {
        console.log(`❌ Role '${userRole}' not in allowed: ${allowedRoles}`);
        return res.status(403).json({
          success: false,
          message: `Forbidden: Access denied for role type '${userRole || "unknown"}'.`,
        });
      }

      next();
    } catch (error) {
      console.error("Server Role Auth Error:", error.message);
      return res.status(500).json({ success: false, message: "Server Role Auth Error" });
    }
  };
};

/**
 * 3. Permission-Based Authorization Middleware - FIXED
 */
const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        console.log('❌ No user attached to request');
        return res.status(401).json({ success: false, message: "Unauthorized: No user attached." });
      }

      const permissions = user.permissions || {};
      const permKeys = Object.keys(permissions).filter(k => permissions[k] === true);
      
      console.log(`🔍 Checking permission '${permissionKey}' for user ${user.email}`);
      console.log(`📋 User permissions:`, permKeys);

      if (!permissions[permissionKey]) {
        console.log(`❌ Permission '${permissionKey}' not found for user ${user.email}`);
        return res.status(403).json({
          success: false,
          message: `Forbidden: Permission '${permissionKey}' is required to perform this action.`,
        });
      }

      console.log(`✅ Permission '${permissionKey}' granted for user ${user.email}`);
      next();
    } catch (error) {
      console.error("Permission check error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Internal server error during authorization.",
      });
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
        return res.status(401).json({ success: false, message: "Unauthorized: No user attached." });
      }

      const roleData = user.roleData;
      if (!roleData || roleData.level === undefined) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Your role does not have a defined privilege level.",
        });
      }

      if (roleData.level >= maxLevel) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Your privilege level (${roleData.level}) is not sufficient. Required level: < ${maxLevel}.`,
        });
      }

      next();
    } catch (error) {
      console.error("Level check error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Internal server error during authorization.",
      });
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
  MAINTENANCE_READONLY_ROLES,
};