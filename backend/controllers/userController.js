const { db, auth } = require('../config/firebase');

// ----------------------------------------------------------------------
// 1. Fetch All Registered Users & Pre-Authorized Staff Nodes
//    (Includes role data from the roles collection)
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
        role: roleName, // Keep for backward compatibility
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
    console.error('Error fetching system directory:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to synchronize central storage registry.' });
  }
};

// ----------------------------------------------------------------------
// 2. Provision Internal System Staff Node (Pre-Authorize) with RBAC
// ----------------------------------------------------------------------
const provisionStaffNode = async (req, res) => {
  try {
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

    // Verify that the role exists
    const roleDoc = await db.collection('roles').doc(roleId).get();
    if (!roleDoc.exists) {
      return res.status(400).json({ success: false, message: 'Invalid roleId.' });
    }
    const roleData = roleDoc.data();

    // Security: Check that the actor has permission to assign this role
    const actorRoleId = req.user.roleId;
    if (!actorRoleId) {
      return res.status(403).json({ success: false, message: 'Your role does not allow assigning roles.' });
    }
    const actorRoleDoc = await db.collection('roles').doc(actorRoleId).get();
    if (!actorRoleDoc.exists) {
      return res.status(403).json({ success: false, message: 'Your role not found.' });
    }
    const actorRoleData = actorRoleDoc.data();
    if (actorRoleData.level >= roleData.level) {
      return res.status(403).json({
        success: false,
        message: `Cannot assign role '${roleData.name}' – your privilege level (${actorRoleData.level}) is not sufficient.`
      });
    }

    // Check if user already exists in users or pre_authorized_staff
    const userDoc = await db.collection('users').doc(formattedEmail).get();
    const preAuthDoc = await db.collection('pre_authorized_staff').doc(formattedEmail).get();
    if (userDoc.exists || preAuthDoc.exists) {
      return res.status(400).json({ success: false, message: 'Email already exists in terminal records.' });
    }

    // ✅ FIX: Changed default institution from "LNBTI" to "Langoora"
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
};

// ----------------------------------------------------------------------
// 3. Toggle Suspension or Revoke Invitations
// ----------------------------------------------------------------------
const toggleUserLifecycle = async (req, res) => {
  try {
    const { uid } = req.params;
    const { currentStatus, email } = req.body;

    if (currentStatus === 'invited') {
      await db.collection('pre_authorized_staff').doc(email).delete();
      return res.status(200).json({ success: true, action: 'revoked' });
    }

    const targetStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    await db.collection('users').doc(uid).update({ status: targetStatus });

    try {
      await auth.updateUser(uid, { disabled: targetStatus === 'suspended' });
    } catch (authErr) {
      console.warn(`Auth disabled state sync omitted: ${authErr.message}`);
    }

    return res.status(200).json({ success: true, action: 'toggled', targetStatus });
  } catch (error) {
    console.error('Lifecycle adjustment failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to adjust operational lifecycle state.' });
  }
};

// ----------------------------------------------------------------------
// 4. Commit Capabilities & Privileges Governance Configurations
// ----------------------------------------------------------------------
const updatePrivileges = async (req, res) => {
  try {
    const { uid } = req.params;
    const { privileges, languageScope, status, email } = req.body;

    const updateData = { privileges, languageScope };

    if (status === 'invited') {
      await db.collection('pre_authorized_staff').doc(email).update(updateData);
    } else {
      await db.collection('users').doc(uid).update(updateData);
    }

    return res.status(200).json({ success: true, message: 'Governance configuration committed.' });
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

    if (currentStatus === 'invited') {
      await db.collection('pre_authorized_staff').doc(email).delete();
      return res.status(200).json({ success: true, message: "Invitation deleted cleanly from staging area." });
    }

    await db.collection('users').doc(uid).delete();

    try {
      await auth.deleteUser(uid);
    } catch (authErr) {
      console.warn(`Auth deletion deferred or user didn't register: ${authErr.message}`);
    }

    return res.status(200).json({ success: true, message: "User account dropped cleanly from database layers." });
  } catch (error) {
    console.error('Purge transaction failure:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to drop user node from database servers.' });
  }
};

// ======================================================================
// RBAC FUNCTIONS – Role Management
// ======================================================================

// ----------------------------------------------------------------------
// 6. Get all roles (for admin UI)
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
// 7. Create a new role (Super Admin only)
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
    return res.status(201).json({ success: true, role: { id: docRef.id, ...newRole } });
  } catch (error) {
    console.error('Create role error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create role.' });
  }
};

// ----------------------------------------------------------------------
// 8. Update a role (Super Admin only)
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
    if (name !== undefined) updateData.name = name;
    if (level !== undefined) updateData.level = level;
    if (permissions !== undefined) updateData.permissions = permissions;
    updateData.updatedAt = new Date().toISOString();

    await db.collection('roles').doc(roleId).update(updateData);

    const updatedDoc = await db.collection('roles').doc(roleId).get();
    return res.status(200).json({ success: true, role: { id: roleId, ...updatedDoc.data() } });
  } catch (error) {
    console.error('Update role error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update role.' });
  }
};

// ----------------------------------------------------------------------
// 9. Delete a role (Super Admin only)
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

    await db.collection('roles').doc(roleId).delete();
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
  getRoles,
  createRole,
  updateRole,
  deleteRole
};