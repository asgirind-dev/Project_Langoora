// backend/controllers/userController.js
const { db, auth } = require('../config/firebase');
const auditLogService = require('../services/auditLogService');

// ----------------------------------------------------------------------
// 1. Fetch All Registered Users & Pre-Authorized Staff Nodes
//    (Includes role data from the roles collection)
// ✅ FIXED: Keep original role for filtering, add roleName for display
// ----------------------------------------------------------------------
const getAllUsers = async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const registeredUsers = [];
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      // Fetch role name if roleId exists
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
        // ✅ CRITICAL FIX: Keep original role for filtering, don't overwrite
        role: userData.role || userData.roleId || 'student',
        roleId: userData.roleId || userData.role || 'student',
        roleName: roleName, // Display name for UI
        displayRole: roleName // For UI display
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
        // ✅ Keep original role for filtering
        role: data.roleId || data.role || 'unknown',
        roleId: data.roleId || data.role || 'unknown',
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
    console.error('Error fetching system directory:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to synchronize central storage registry.' });
  }
};

// ----------------------------------------------------------------------
// 2. Provision Internal System Staff Node (Pre-Authorize) with RBAC
// ✅ FIXED: Properly save privileges, organization for Finance Admin
// ✅ FIXED: Remove institution and languageScope for Finance Admin
// ----------------------------------------------------------------------
const provisionStaffNode = async (req, res) => {
  try {
    const {
      name,
      email,
      roleId,
      institution,
      organization,  // ✅ New field for Finance Admin
      languageScope,
      privileges
    } = req.body;
    const formattedEmail = email.toLowerCase().trim();

    console.log('📋 ===== PROVISION REQUEST =====');
    console.log('📋 Full request body:', req.body);
    console.log('📋 Name:', name);
    console.log('📋 Email:', formattedEmail);
    console.log('📋 RoleId:', roleId);
    console.log('📋 Organization:', organization);
    console.log('📋 Institution:', institution);
    console.log('📋 Language Scope:', languageScope);
    console.log('📋 Privileges received:', privileges);

    if (!name || !formattedEmail || !roleId) {
      return res.status(400).json({ success: false, message: 'Name, email, and roleId are mandatory.' });
    }

    // Verify that the role exists
    const roleDoc = await db.collection('roles').doc(roleId).get();
    if (!roleDoc.exists) {
      console.log(`❌ Role not found: ${roleId}`);
      return res.status(400).json({ success: false, message: 'Invalid roleId. Please select a valid role.' });
    }
    const roleData = roleDoc.data();
    console.log(`✅ Role found: ${roleData.name} (${roleId})`);
    console.log(`📋 Role level: ${roleData.level}`);

    // Security: Check that the actor has permission to assign this role
    const actorRoleId = req.user.roleId;
    if (!actorRoleId) {
      console.log('❌ Actor has no roleId');
      return res.status(403).json({ success: false, message: 'Your role does not allow assigning roles.' });
    }
    const actorRoleDoc = await db.collection('roles').doc(actorRoleId).get();
    if (!actorRoleDoc.exists) {
      console.log(`❌ Actor role not found: ${actorRoleId}`);
      return res.status(403).json({ success: false, message: 'Your role not found.' });
    }
    const actorRoleData = actorRoleDoc.data();
    console.log(`🔍 Actor role: ${actorRoleData.name} (level: ${actorRoleData.level})`);
    console.log(`🔍 Target role: ${roleData.name} (level: ${roleData.level})`);

    // ✅ FIXED: Level check with undefined handling
    if (actorRoleData.level !== undefined && roleData.level !== undefined) {
      if (actorRoleData.level >= roleData.level) {
        console.log(`❌ Insufficient level: Actor ${actorRoleData.level} >= Target ${roleData.level}`);
        return res.status(403).json({
          success: false,
          message: `Cannot assign role '${roleData.name}' – your privilege level (${actorRoleData.level}) is not sufficient.`
        });
      }
    } else {
      console.log('⚠️ Role level missing, skipping level check');
    }

    // Check if user already exists in users or pre_authorized_staff
    const userDoc = await db.collection('users').doc(formattedEmail).get();
    const preAuthDoc = await db.collection('pre_authorized_staff').doc(formattedEmail).get();
    if (userDoc.exists || preAuthDoc.exists) {
      console.log(`❌ Email already exists: ${formattedEmail}`);
      return res.status(400).json({ success: false, message: 'Email already exists in terminal records.' });
    }

    // ✅ IMPORTANT: Ensure privileges is an array
    const finalPrivileges = Array.isArray(privileges) ? privileges : [];
    console.log(`📋 Final privileges to save: ${finalPrivileges.length} items`, finalPrivileges);

    // ✅✅✅ CRITICAL FIX: Use roleId as the role field, NOT roleData.name
    const finalRole = roleId;

    // ✅ Check if this is a Finance Admin
    const isFinance = roleId === 'finance';

    // ✅ Build staff node with CORRECT role and fields
    const newStaffNode = {
      name,
      email: formattedEmail,
      roleId: roleId,
      joined: new Date().toISOString().split('T')[0],
      // ✅ Finance Admin: use organization, no institution/languageScope
      organization: isFinance ? (organization || 'Novacore Solutions') : '',
      institution: isFinance ? '' : (institution || 'Langoora'),
      languageScope: isFinance ? '' : (languageScope || 'All'),
      privileges: finalPrivileges,
      status: 'invited',
      role: finalRole
    };

    console.log('📝 Creating staff node:', JSON.stringify(newStaffNode, null, 2));

    await db.collection('pre_authorized_staff').doc(formattedEmail).set(newStaffNode);

    // ✅ Log the provisioning action
    await auditLogService.logUserLifecycle({
      userId: formattedEmail,
      userEmail: formattedEmail,
      actorId: req.user.uid,
      actorEmail: req.user.email,
      action: 'provisioned',
      reason: `Staff provisioned with role: ${finalRole} (${roleId}) and ${finalPrivileges.length} privileges`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    console.log(`✅ Staff provisioned successfully: ${formattedEmail} with role ${finalRole}`);
    console.log(`✅ Privileges saved: ${finalPrivileges.length} items`);

    return res.status(201).json({
      success: true,
      user: {
        id: formattedEmail,
        ...newStaffNode,
        status: 'invited',
        activityCount: 0,
        roleName: finalRole,
        privileges: finalPrivileges
      }
    });
  } catch (error) {
    console.error('❌ Provisioning failed:', error.message);
    return res.status(500).json({ success: false, message: 'Database connectivity failed during node provisioning.' });
  }
};

// ----------------------------------------------------------------------
// 3. Toggle Suspension or Revoke Invitations (WITH AUDIT LOG)
// ----------------------------------------------------------------------
const toggleUserLifecycle = async (req, res) => {
  try {
    const { uid } = req.params;
    const { currentStatus, email } = req.body;
    const actorId = req.user.uid;
    const actorEmail = req.user.email;
    const actorRole = req.user.role;

    // Get user details for logging
    let userEmail = email || '';
    let userDoc = null;

    if (currentStatus === 'invited') {
      await db.collection('pre_authorized_staff').doc(email).delete();
      
      // ✅ Log the revocation
      await auditLogService.logUserLifecycle({
        userId: uid,
        userEmail: email,
        actorId: actorId,
        actorEmail: actorEmail,
        action: 'revoked',
        reason: 'Staff invitation revoked',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      
      return res.status(200).json({ success: true, action: 'revoked' });
    }

    const targetStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    await db.collection('users').doc(uid).update({ status: targetStatus });

    try {
      await auth.updateUser(uid, { disabled: targetStatus === 'suspended' });
    } catch (authErr) {
      console.warn(`Auth disabled state sync omitted: ${authErr.message}`);
    }

    // Get user email for logging
    userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      userEmail = userDoc.data().email || email;
    }

    // ✅ Log the lifecycle change
    await auditLogService.logUserLifecycle({
      userId: uid,
      userEmail: userEmail,
      actorId: actorId,
      actorEmail: actorEmail,
      action: targetStatus === 'suspended' ? 'suspended' : 'activated',
      reason: `User ${targetStatus === 'suspended' ? 'suspended' : 'activated'} by ${actorRole || 'admin'}`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({ success: true, action: 'toggled', targetStatus });
  } catch (error) {
    console.error('Lifecycle adjustment failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to adjust operational lifecycle state.' });
  }
};

// ----------------------------------------------------------------------
// 4. Commit Capabilities & Privileges Governance Configurations (WITH AUDIT LOG)
// ----------------------------------------------------------------------
const updatePrivileges = async (req, res) => {
  try {
    const { uid } = req.params;
    const { privileges, languageScope, status, email, reason } = req.body;
    const actorId = req.user.uid;
    const actorEmail = req.user.email;
    const actorRole = req.user.role;

    console.log('📋 Updating privileges for user:', uid);
    console.log('📋 New privileges:', privileges);
    console.log('📋 Language scope:', languageScope);

    // Get old privileges first
    let oldPrivileges = [];
    let userEmail = email || '';
    let userDocData = {};

    if (status === 'invited') {
      const doc = await db.collection('pre_authorized_staff').doc(email).get();
      if (doc.exists) {
        oldPrivileges = doc.data().privileges || [];
        userEmail = email;
        userDocData = doc.data();
      }
    } else {
      const doc = await db.collection('users').doc(uid).get();
      if (doc.exists) {
        oldPrivileges = doc.data().privileges || [];
        userEmail = doc.data().email || email;
        userDocData = doc.data();
      }
    }

    console.log('📋 Old privileges:', oldPrivileges);

    const updateData = { 
      privileges: Array.isArray(privileges) ? privileges : [],
      languageScope 
    };

    if (status === 'invited') {
      await db.collection('pre_authorized_staff').doc(email).update(updateData);
    } else {
      await db.collection('users').doc(uid).update(updateData);
    }

    // ✅ Calculate changes for audit log
    const added = privileges.filter(p => !oldPrivileges.includes(p));
    const removed = oldPrivileges.filter(p => !privileges.includes(p));
    
    let actionType = 'updated';
    if (added.length > 0 && removed.length === 0) actionType = 'added';
    else if (added.length === 0 && removed.length > 0) actionType = 'removed';
    else if (added.length > 0 && removed.length > 0) actionType = 'updated';

    // ✅ Log the privilege change
    await auditLogService.logPrivilegeChange({
      userId: uid,
      userEmail: userEmail,
      actorId: actorId,
      actorEmail: actorEmail,
      role: actorRole,
      action: actionType,
      changes: {
        added,
        removed,
        languageScope,
        old: oldPrivileges,
        new: privileges
      },
      reason: reason || `Privileges ${actionType} by ${actorRole || 'admin'}`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    console.log('✅ Privileges updated successfully');

    return res.status(200).json({ 
      success: true, 
      message: 'Governance configuration committed.',
      changes: { old: oldPrivileges, new: privileges }
    });
  } catch (error) {
    console.error('Privilege dynamic commit failed:', error.message);
    return res.status(500).json({ success: false, message: 'Server configuration error.' });
  }
};

// ----------------------------------------------------------------------
// 5. PERMANENT DELETE WORKFLOW (Hard Delete - Auth + Firestore Sync)
// ----------------------------------------------------------------------
const deleteUserNode = async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, currentStatus } = req.body;
    const actorId = req.user.uid;
    const actorEmail = req.user.email;

    if (currentStatus === 'invited') {
      await db.collection('pre_authorized_staff').doc(email).delete();
      
      // ✅ Log the deletion
      await auditLogService.logUserLifecycle({
        userId: uid,
        userEmail: email,
        actorId: actorId,
        actorEmail: actorEmail,
        action: 'deleted',
        reason: 'Invitation permanently deleted',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      
      return res.status(200).json({ success: true, message: "Invitation deleted cleanly from staging area." });
    }

    // Get user email before deletion
    let userEmail = email || '';
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      userEmail = userDoc.data().email || email;
    }

    await db.collection('users').doc(uid).delete();

    try {
      await auth.deleteUser(uid);
    } catch (authErr) {
      console.warn(`Auth deletion deferred or user didn't register: ${authErr.message}`);
    }

    // ✅ Log the deletion
    await auditLogService.logUserLifecycle({
      userId: uid,
      userEmail: userEmail,
      actorId: actorId,
      actorEmail: actorEmail,
      action: 'deleted',
      reason: 'User account permanently deleted',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({ success: true, message: "User account dropped cleanly from database layers." });
  } catch (error) {
    console.error('Purge transaction failure:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to drop user node from database servers.' });
  }
};

/**
 * 6. 👤 GET LOGGED IN STUDENT PROFILE (For Checkout Auto-fill)
 */
const getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user?.uid || req.user?.id;

    console.log("=== DEBUG: REQUESTED STUDENT ID ===", studentId);

    if (!studentId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const userDoc = await db.collection('users').doc(studentId).get();

    console.log(`=== DEBUG: DOES DOC EXIST FOR ${studentId}? ===`, userDoc.exists);

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const userData = userDoc.data();
    
    console.log("=== DEBUG: FIRESTORE USER DATA ===", userData);

    return res.status(200).json({
      success: true,
      name: userData.name || 'Verified Student',
      email: userData.email,
      bankName: userData.bankName || null,
      accountNo: userData.accountNo || null,
      accountHolder: userData.accountHolder || userData.name || 'Verified Student'
    });

  } catch (error) {
    console.error('Error fetching student profile:', error.message);
    return res.status(500).json({ success: false, message: 'Server error fetching profile registry.' });
  }
};

// ======================================================================
// RBAC FUNCTIONS – Role Management
// ======================================================================

// ----------------------------------------------------------------------
// 7. Get all roles (for admin UI)
// ----------------------------------------------------------------------
const getRoles = async (req, res) => {
  try {
    const snapshot = await db.collection('roles').get();
    const roles = [];
    snapshot.forEach(doc => roles.push({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ success: true, roles });
  } catch (error) {
    console.error('Error fetching roles:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch roles.' });
  }
};

// ----------------------------------------------------------------------
// 8. Create a new role (Super Admin only) - WITH AUDIT LOG
// ----------------------------------------------------------------------
const createRole = async (req, res) => {
  try {
    const { name, level, permissions } = req.body;
    if (!name || level === undefined || !permissions) {
      return res.status(400).json({ success: false, message: 'Missing required fields: name, level, permissions.' });
    }

    const actorRoleId = req.user.roleId;
    if (!actorRoleId) {
      return res.status(403).json({ success: false, message: 'Your role does not allow creating roles.' });
    }
    const actorRoleDoc = await db.collection('roles').doc(actorRoleId).get();
    if (!actorRoleDoc.exists) {
      return res.status(403).json({ success: false, message: 'Your role not found.' });
    }
    const actorRoleData = actorRoleDoc.data();
    if (actorRoleData.level >= level) {
      return res.status(403).json({
        success: false,
        message: `Cannot create a role with level ${level}. Your level (${actorRoleData.level}) is not higher.`
      });
    }

    const newRole = {
      name,
      level,
      permissions,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };
    const docRef = await db.collection('roles').add(newRole);
    
    // ✅ Log role creation
    await auditLogService.logPrivilegeChange({
      userId: 'system',
      userEmail: 'system',
      actorId: req.user.uid,
      actorEmail: req.user.email,
      role: req.user.role,
      action: 'created_role',
      changes: {
        roleName: name,
        level: level,
        permissions: permissions
      },
      reason: `Role "${name}" created`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(201).json({ success: true, role: { id: docRef.id, ...newRole } });
  } catch (error) {
    console.error('Create role error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create role.' });
  }
};

// ----------------------------------------------------------------------
// 9. Update a role (Super Admin only) - WITH AUDIT LOG
// ----------------------------------------------------------------------
const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, level, permissions } = req.body;

    if (!roleId) {
      return res.status(400).json({ success: false, message: 'Role ID is required.' });
    }

    const actorRoleId = req.user.roleId;
    if (!actorRoleId) {
      return res.status(403).json({ success: false, message: 'Your role does not allow updating roles.' });
    }
    const actorRoleDoc = await db.collection('roles').doc(actorRoleId).get();
    if (!actorRoleDoc.exists) {
      return res.status(403).json({ success: false, message: 'Your role not found.' });
    }
    const actorRoleData = actorRoleDoc.data();

    const targetRoleDoc = await db.collection('roles').doc(roleId).get();
    if (!targetRoleDoc.exists) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }
    const targetRoleData = targetRoleDoc.data();

    if (level !== undefined) {
      if (actorRoleData.level >= level) {
        return res.status(403).json({
          success: false,
          message: `Cannot set level ${level}. Your level (${actorRoleData.level}) is not higher.`
        });
      }
    }

    const updateData = {};
    const changes = {};
    if (name !== undefined && name !== targetRoleData.name) {
      updateData.name = name;
      changes.name = { old: targetRoleData.name, new: name };
    }
    if (level !== undefined && level !== targetRoleData.level) {
      updateData.level = level;
      changes.level = { old: targetRoleData.level, new: level };
    }
    if (permissions !== undefined) {
      const oldPerms = targetRoleData.permissions || {};
      const newPerms = permissions;
      const added = Object.keys(newPerms).filter(k => newPerms[k] && !oldPerms[k]);
      const removed = Object.keys(oldPerms).filter(k => oldPerms[k] && !newPerms[k]);
      if (added.length > 0 || removed.length > 0) {
        updateData.permissions = permissions;
        changes.permissions = { added, removed };
      }
    }
    updateData.updatedAt = new Date().toISOString();

    await db.collection('roles').doc(roleId).update(updateData);

    // ✅ Log role update
    await auditLogService.logPrivilegeChange({
      userId: 'system',
      userEmail: 'system',
      actorId: req.user.uid,
      actorEmail: req.user.email,
      role: req.user.role,
      action: 'updated_role',
      changes: changes,
      reason: `Role "${name || targetRoleData.name}" updated`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const updatedDoc = await db.collection('roles').doc(roleId).get();
    return res.status(200).json({ success: true, role: { id: roleId, ...updatedDoc.data() } });
  } catch (error) {
    console.error('Update role error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update role.' });
  }
};

// ----------------------------------------------------------------------
// 10. Delete a role (Super Admin only) - WITH AUDIT LOG
// ----------------------------------------------------------------------
const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    const actorRoleId = req.user.roleId;
    if (!actorRoleId) {
      return res.status(403).json({ success: false, message: 'Your role does not allow deleting roles.' });
    }
    const actorRoleDoc = await db.collection('roles').doc(actorRoleId).get();
    if (!actorRoleDoc.exists) {
      return res.status(403).json({ success: false, message: 'Your role not found.' });
    }
    const actorRoleData = actorRoleDoc.data();
    const targetRoleDoc = await db.collection('roles').doc(roleId).get();
    if (!targetRoleDoc.exists) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }
    const targetRoleData = targetRoleDoc.data();
    if (actorRoleData.level >= targetRoleData.level) {
      return res.status(403).json({
        success: false,
        message: `Cannot delete role with level ${targetRoleData.level}. Your level (${actorRoleData.level}) is not higher.`
      });
    }

    const usersWithRole = await db.collection('users').where('roleId', '==', roleId).get();
    if (!usersWithRole.empty) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role because ${usersWithRole.size} user(s) are currently assigned to it.`
      });
    }

    const roleName = targetRoleData.name;
    await db.collection('roles').doc(roleId).delete();

    // ✅ Log role deletion
    await auditLogService.logPrivilegeChange({
      userId: 'system',
      userEmail: 'system',
      actorId: req.user.uid,
      actorEmail: req.user.email,
      role: req.user.role,
      action: 'deleted_role',
      changes: {
        roleName: roleName,
        level: targetRoleData.level,
        permissions: targetRoleData.permissions || {}
      },
      reason: `Role "${roleName}" deleted`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({ success: true, message: 'Role deleted successfully.' });
  } catch (error) {
    console.error('Delete role error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete role.' });
  }
};

// ======================================================================
// EXPORTS
// ======================================================================

module.exports = {
  getAllUsers,
  provisionStaffNode,
  toggleUserLifecycle,
  updatePrivileges,
  deleteUserNode,
  getStudentProfile,
  getRoles,
  createRole,
  updateRole,
  deleteRole
};