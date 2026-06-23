const { db, auth } = require('../config/firebase');

/**
 * 1. Fetch All Registered Users & Pre-Authorized Staff Nodes
 */
const getAllUsers = async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const registeredUsers = [];
    usersSnapshot.forEach(doc => {
      registeredUsers.push({ id: doc.id, ...doc.data() });
    });

    const preAuthSnapshot = await db.collection('pre_authorized_staff').get();
    const preAuthUsers = [];
    preAuthSnapshot.forEach(doc => {
      preAuthUsers.push({ id: doc.id, ...doc.data(), status: 'invited', activityCount: 0 });
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

/**
 * 2. Provision Internal System Staff Node (Pre-Authorize)
 */
const provisionStaffNode = async (req, res) => {
  try {
    const { name, email, role, institution, languageScope, privileges } = req.body;
    const formattedEmail = email.toLowerCase().trim();

    if (!name || !formattedEmail) {
      return res.status(400).json({ success: false, message: 'All fields are mandatory.' });
    }

    const userDoc = await db.collection('users').doc(formattedEmail).get();
    const preAuthDoc = await db.collection('pre_authorized_staff').doc(formattedEmail).get();

    if (userDoc.exists || preAuthDoc.exists) {
      return res.status(400).json({ success: false, message: 'Email already exists in terminal records.' });
    }

    const newStaffNode = {
      name,
      email: formattedEmail,
      role,
      joined: new Date().toISOString().split('T')[0],
      institution,
      languageScope: role === 'finance' ? 'All' : languageScope,
      privileges: privileges || []
    };

    await db.collection('pre_authorized_staff').doc(formattedEmail).set(newStaffNode);

    return res.status(201).json({ success: true, user: { id: formattedEmail, ...newStaffNode, status: 'invited', activityCount: 0 } });
  } catch (error) {
    console.error('Provisioning failed:', error.message);
    return res.status(500).json({ success: false, message: 'Database connectivity failed during node provisioning.' });
  }
};

/**
 * 3. Toggle Suspension or Revoke Invitations
 */
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

/**
 * 4. Commit Capabilities & Privileges Governance Configurations
 */
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

/**
 * 5. 🔒 PERMANENT DELETE WORKFLOW (Hard Delete - Auth + Firestore Sync)
 */
const deleteUserNode = async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, currentStatus } = req.body;

    if (currentStatus === 'invited') {
      await db.collection('pre_authorized_staff').doc(email).delete();
      return res.status(200).json({ success: true, message: "Invitation deleted cleanly from staging area." });
    }

    // Delete Firestore profile mapping block
    await db.collection('users').doc(uid).delete();

    // Trigger Firebase Authentication Node Purge
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

module.exports = {
  getAllUsers,
  provisionStaffNode,
  toggleUserLifecycle,
  updatePrivileges,
  deleteUserNode 
};