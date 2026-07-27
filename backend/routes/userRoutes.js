// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {
  protect,
  authorizeRoles,
  requirePermission,
  requireLevel
} = require('../middleware/authMiddleware');
const { db, admin } = require('../config/firebase');

// ======================================================================
// 🔓 1. PUBLIC ROUTES (Login වීම අවශ්‍ය නැත / Authentication NOT required)
// ======================================================================

/**
 * ✅ Check if an email is pre-authorized for staff registration
 * GET /api/users/preauth-check?email=user@example.com
 */
router.get('/preauth-check', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required for pre-authorization check.' 
      });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format.' 
      });
    }

    const formattedEmail = email.toLowerCase().trim();
    const preAuthDoc = await db.collection('pre_authorized_staff').doc(formattedEmail).get();

    if (preAuthDoc.exists) {
      const data = preAuthDoc.data();
      const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      const now = new Date();
      
      if (expiresAt && expiresAt < now) {
        return res.status(200).json({
          success: true,
          isPreAuthorized: false,
          expired: true,
          message: 'This invitation has expired. Please contact your administrator.'
        });
      }

      return res.status(200).json({
        success: true,
        isPreAuthorized: true,
        role: data.role || 'validator',
        languageScope: data.languageScope || 'All',
        institution: data.institution || 'Langoora',
        privileges: data.privileges || [],
        name: data.name || '',
        expiresAt: data.expiresAt || null
      });
    }

    return res.status(200).json({
      success: true,
      isPreAuthorized: false
    });

  } catch (error) {
    console.error('Pre-authorization check error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to check pre-authorization status.',
      error: error.message 
    });
  }
});

// ======================================================================
// 🔒 2. PROTECTED ROUTES (මෙතැනින් පහළ සියලුම Routes සඳහා Auth Token එකක් අවශ්‍ය වේ)
// ======================================================================
router.use(protect);

// ----------------------------------------------------------------------
// 👤 STUDENT / USER PROFILE ENDPOINTS
// ----------------------------------------------------------------------

router.get('/profile', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false, message: "User ID (uid) is required" });
    
    let doc = await db.collection('users').doc(uid).get();
    
    if (!doc.exists) {
      doc = await db.collection('students').doc(uid).get();
    }
    
    if (!doc.exists) {
      return res.status(200).json({ success: true, data: {} });
    }
    
    res.status(200).json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("Backend Fetch Profile Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/checkout-profile', userController.getStudentProfile);

router.put('/profile/update', async (req, res) => {
  try {
    const { uid, name, phone, dob, city, targetExam, targetDate } = req.body;
    if (!uid) return res.status(400).json({ success: false, message: "User ID is required" });
    await db.collection('students').doc(uid).set({
      name, phone, dob, city, targetExam, targetDate,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.status(200).json({ success: true, message: "Profile updated successfully!" });
  } catch (error) {
    console.error("Backend Profile Update Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/settings/language', async (req, res) => {
  try {
    const { uid, language } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID is required" });
    await db.collection('students').doc(uid).set({
      language, updatedAt: new Date().toISOString()
    }, { merge: true });
    res.status(200).json({ success: true, message: "Language updated successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/settings/password', async (req, res) => {
  try {
    const { uid, newPassword } = req.body;
    if (!uid || !newPassword) return res.status(400).json({ message: "Missing required fields" });
    await admin.auth().updateUser(uid, { password: newPassword });
    res.status(200).json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ======================================================================
// 🛡️ 3. ADMIN PRIVILEGED ROUTES (Admin හට පමණක් සීමා වේ)
// ======================================================================
// ✅ FIX: Include both admin and super_admin
router.use(authorizeRoles('admin', 'super_admin'));

// ---- User Management ----
// ✅ FIXED: GET /users with role-based fallback
router.get(
  '/',
  async (req, res) => {
    try {
      const user = req.user;
      const permissions = user?.permissions || {};
      const userRole = user?.role;
      
      const hasPermission = permissions.manage_users === true;
      const isAuthorized = hasPermission || userRole === 'super_admin' || userRole === 'admin';
      
      if (!isAuthorized) {
        console.log(`❌ User ${user?.email} not authorized for user management`);
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to manage users.',
        });
      }
      
      console.log(`✅ User ${user?.email} authorized for user management`);
      
      const usersSnapshot = await db.collection('users').get();
      const registeredUsers = [];
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        let roleName = userData.role || 'student';
        if (userData.roleId) {
          const roleDoc = await db.collection('roles').doc(userData.roleId).get();
          if (roleDoc.exists) {
            roleName = roleDoc.data().name;
          }
        }
        registeredUsers.push({
          id: doc.id,
          ...userData,
          role: roleName,
          roleName
        });
      }

      const preAuthSnapshot = await db.collection('pre_authorized_staff').get();
      const preAuthUsers = [];
      preAuthSnapshot.forEach(doc => {
        const data = doc.data();
        preAuthUsers.push({
          id: doc.id,
          ...data,
          status: 'invited',
          activityCount: 0,
          roleName: data.role || 'unknown'
        });
      });

      const combinedUsers = [...preAuthUsers, ...registeredUsers].sort((a, b) => {
        const dateA = a.joined ? new Date(a.joined) : new Date(0);
        const dateB = b.joined ? new Date(b.joined) : new Date(0);
        return dateB - dateA;
      });

      return res.status(200).json({ success: true, users: combinedUsers });
      
    } catch (error) {
      console.error('Error fetching users:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
    }
  }
);

// ✅ FIXED: POST /provision with role-based fallback
router.post(
  '/provision',
  async (req, res) => {
    try {
      const user = req.user;
      const permissions = user?.permissions || {};
      const userRole = user?.role;
      
      const hasPermission = permissions.manage_users === true;
      const isAuthorized = hasPermission || userRole === 'super_admin' || userRole === 'admin';
      
      if (!isAuthorized) {
        console.log(`❌ User ${user?.email} not authorized for provisioning`);
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to provision users.',
        });
      }

      const {
        name,
        email,
        roleId,
        institution,
        languageScope,
        privileges
      } = req.body;
      const formattedEmail = email.toLowerCase().trim();

      if (!name || !formattedEmail || !roleId) {
        return res.status(400).json({ success: false, message: 'Name, email, and roleId are mandatory.' });
      }

      const roleDoc = await db.collection('roles').doc(roleId).get();
      if (!roleDoc.exists) {
        return res.status(400).json({ success: false, message: 'Invalid roleId.' });
      }
      const roleData = roleDoc.data();

      const userDoc = await db.collection('users').doc(formattedEmail).get();
      const preAuthDoc = await db.collection('pre_authorized_staff').doc(formattedEmail).get();
      if (userDoc.exists || preAuthDoc.exists) {
        return res.status(400).json({ success: false, message: 'Email already exists in terminal records.' });
      }

      const newStaffNode = {
        name,
        email: formattedEmail,
        roleId,
        joined: new Date().toISOString().split('T')[0],
        institution: institution || 'Langoora',
        languageScope: roleData.name === 'finance' ? 'All' : languageScope,
        privileges: privileges || [],
        status: 'invited'
      };

      await db.collection('pre_authorized_staff').doc(formattedEmail).set(newStaffNode);

      const auditLogService = require('../services/auditLogService');
      await auditLogService.logUserLifecycle({
        userId: formattedEmail,
        userEmail: formattedEmail,
        actorId: req.user.uid,
        actorEmail: req.user.email,
        action: 'provisioned',
        reason: `Staff provisioned with role: ${roleData.name}`,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      return res.status(201).json({
        success: true,
        user: {
          id: formattedEmail,
          ...newStaffNode,
          status: 'invited',
          activityCount: 0,
          roleName: roleData.name
        }
      });
    } catch (error) {
      console.error('Provisioning failed:', error.message);
      return res.status(500).json({ success: false, message: 'Database connectivity failed during node provisioning.' });
    }
  }
);

// ✅ FIXED: PUT /:uid/privileges with role-based fallback
router.put(
  '/:uid/privileges',
  async (req, res) => {
    try {
      const user = req.user;
      const permissions = user?.permissions || {};
      const userRole = user?.role;
      
      const hasPermission = permissions.manage_users === true;
      const isAuthorized = hasPermission || userRole === 'super_admin' || userRole === 'admin';
      
      if (!isAuthorized) {
        console.log(`❌ User ${user?.email} not authorized for privilege updates`);
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to update user privileges.',
        });
      }

      console.log(`✅ User ${user?.email} authorized for privilege updates`);
      
      // ✅ Call the controller
      await userController.updatePrivileges(req, res);
      
    } catch (error) {
      console.error('Error updating privileges:', error.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update user privileges.' 
      });
    }
  }
);

// ✅ FIXED: PUT /:uid/lifecycle with role-based fallback
router.put(
  '/:uid/lifecycle',
  async (req, res) => {
    try {
      const user = req.user;
      const permissions = user?.permissions || {};
      const userRole = user?.role;
      
      const hasPermission = permissions.manage_users === true;
      const isAuthorized = hasPermission || userRole === 'super_admin' || userRole === 'admin';
      
      if (!isAuthorized) {
        console.log(`❌ User ${user?.email} not authorized for lifecycle updates`);
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to update user lifecycle.',
        });
      }

      console.log(`✅ User ${user?.email} authorized for lifecycle updates`);
      
      await userController.toggleUserLifecycle(req, res);
      
    } catch (error) {
      console.error('Error updating lifecycle:', error.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update user lifecycle.' 
      });
    }
  }
);

// ✅ FIXED: DELETE /:uid with role-based fallback
router.delete(
  '/:uid',
  async (req, res) => {
    try {
      const user = req.user;
      const permissions = user?.permissions || {};
      const userRole = user?.role;
      
      const hasPermission = permissions.manage_users === true;
      const isAuthorized = hasPermission || userRole === 'super_admin' || userRole === 'admin';
      
      if (!isAuthorized) {
        console.log(`❌ User ${user?.email} not authorized for user deletion`);
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to delete users.',
        });
      }

      console.log(`✅ User ${user?.email} authorized for user deletion`);
      
      await userController.deleteUserNode(req, res);
      
    } catch (error) {
      console.error('Error deleting user:', error.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete user.' 
      });
    }
  }
);

// ---- Role Management ----
// ✅ FIXED: GET /roles with role-based fallback
router.get(
  '/roles',
  async (req, res) => {
    try {
      const user = req.user;
      const permissions = user?.permissions || {};
      const userRole = user?.role;
      
      const hasPermission = permissions.manage_roles === true;
      const isAuthorized = hasPermission || userRole === 'super_admin';
      
      if (!isAuthorized) {
        console.log(`❌ User ${user?.email} not authorized for role management`);
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to manage roles.',
        });
      }
      
      console.log(`✅ User ${user?.email} authorized for role management`);
      
      const snapshot = await db.collection('roles').get();
      const roles = [];
      snapshot.forEach(doc => roles.push({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ success: true, roles });
      
    } catch (error) {
      console.error('Error fetching roles:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch roles.' });
    }
  }
);

router.post(
  '/roles',
  requirePermission('manage_roles'),
  requireLevel(2),
  userController.createRole
);

router.put(
  '/roles/:roleId',
  requirePermission('manage_roles'),
  requireLevel(2),
  userController.updateRole
);

router.delete(
  '/roles/:roleId',
  requirePermission('manage_roles'),
  requireLevel(2),
  userController.deleteRole
);

// ---- Bulk Pre-authorization Check ----
router.post(
  '/preauth-bulk-check',
  requirePermission('manage_users'),
  async (req, res) => {
    try {
      const { emails } = req.body;
      
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Emails array is required.' 
        });
      }

      const results = [];
      
      for (const email of emails) {
        const formattedEmail = email.toLowerCase().trim();
        const preAuthDoc = await db.collection('pre_authorized_staff').doc(formattedEmail).get();
        
        if (preAuthDoc.exists) {
          const data = preAuthDoc.data();
          results.push({
            email: formattedEmail,
            isPreAuthorized: true,
            role: data.role || 'validator',
            languageScope: data.languageScope || 'All',
            institution: data.institution || 'Langoora'
          });
        } else {
          results.push({
            email: formattedEmail,
            isPreAuthorized: false
          });
        }
      }

      return res.status(200).json({
        success: true,
        results
      });

    } catch (error) {
      console.error('Bulk pre-authorization check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to check pre-authorization statuses.',
        error: error.message 
      });
    }
  }
);

module.exports = router;