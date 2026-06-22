// backend/controllers/userController.js
const { db, auth } = require('../config/firebase');

// GET all users (registered + pre‑authorized)
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
      preAuthUsers.push({
        id: doc.id,
        ...doc.data(),
        status: 'invited',
        activityCount: 0,
      });
    });

    const combined = [...preAuthUsers, ...registeredUsers].sort((a, b) => {
      const dateA = a.joined ? new Date(a.joined) : new Date(0);
      const dateB = b.joined ? new Date(b.joined) : new Date(0);
      return dateB - dateA;
    });

    res.status(200).json({ success: true, users: combined });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Provision a new staff member (pre‑authorized)
const provisionStaffNode = async (req, res) => {
  try {
    const { name, email, roleId, institution, languageScope } = req.body;
    const formattedEmail = email.toLowerCase().trim();

    if (!name || !formattedEmail || !roleId) {
      return res.status(400).json({ success: false, message: 'Name, email, and role are required.' });
    }

    // Fetch the role
    const roleDoc = await db.collection('roles').doc(roleId).get();
    if (!roleDoc.exists) {
      return res.status(400).json({ success: false, message: 'Invalid role selected.' });
    }
    const roleData = roleDoc.data();
    const privileges = roleData.privileges || [];

    // Check if email already exists
    const userDoc = await db.collection('users').doc(formattedEmail).get();
    const preAuthDoc = await db.collection('pre_authorized_staff').doc(formattedEmail).get();
    if (userDoc.exists || preAuthDoc.exists) {
      return res.status(400).json({ success: false, message: 'Email already exists.' });
    }

    const finalLanguageScope = roleData.name === 'finance' ? 'All' : (languageScope || 'All');

    const newStaff = {
      name,
      email: formattedEmail,
      roleId,
      roleName: roleData.name,
      joined: new Date().toISOString().split('T')[0],
      institution: institution || 'LNBTI',
      languageScope: finalLanguageScope,
      privileges,
    };

    await db.collection('pre_authorized_staff').doc(formattedEmail).set(newStaff);

    res.status(201).json({
      success: true,
      user: { id: formattedEmail, ...newStaff, status: 'invited', activityCount: 0 },
    });
  } catch (error) {
    console.error('provisionStaffNode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle suspend/activate or revoke invitation
const toggleUserLifecycle = async (req, res) => {
  try {
    const { uid } = req.params;
    const { currentStatus, email } = req.body;

    // Handle invited (pre‑authorized) users
    if (currentStatus === 'invited') {
      const ref = db.collection('pre_authorized_staff').doc(email);
      const doc = await ref.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'Invitation not found.' });
      }
      await ref.delete();
      return res.status(200).json({ success: true, action: 'revoked' });
    }

    // Toggle active ↔ suspended
    const targetStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await userRef.update({ status: targetStatus });

    // Sync with Firebase Auth
    try {
      await auth.updateUser(uid, { disabled: targetStatus === 'suspended' });
    } catch (authErr) {
      console.warn('Auth sync error:', authErr.message);
    }

    res.status(200).json({ success: true, action: 'toggled', targetStatus });
  } catch (error) {
    console.error('toggleUserLifecycle error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update privileges (and optionally change role)
const updatePrivileges = async (req, res) => {
  try {
    const { uid } = req.params;
    const { privileges, languageScope, status, email, roleId } = req.body;

    const updateData = { privileges, languageScope };

    if (roleId) {
      const roleDoc = await db.collection('roles').doc(roleId).get();
      if (!roleDoc.exists) {
        return res.status(400).json({ success: false, message: 'Invalid role.' });
      }
      updateData.roleId = roleId;
      updateData.roleName = roleDoc.data().name;
    }

    if (status === 'invited') {
      const ref = db.collection('pre_authorized_staff').doc(email);
      const doc = await ref.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'Invitation not found.' });
      }
      await ref.update(updateData);
    } else {
      const ref = db.collection('users').doc(uid);
      const doc = await ref.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      await ref.update(updateData);
    }

    res.status(200).json({ success: true, message: 'Privileges updated.' });
  } catch (error) {
    console.error('updatePrivileges error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Soft delete (mark as deleted)
const deleteUserNode = async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, currentStatus } = req.body;

    if (currentStatus === 'invited') {
      const ref = db.collection('pre_authorized_staff').doc(email);
      const doc = await ref.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'Invitation not found.' });
      }
      await ref.delete();
      return res.status(200).json({ success: true, message: 'Invitation cleared.' });
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await userRef.update({
      status: 'deleted',
      deletedAt: new Date().toISOString(),
    });

    try {
      await auth.updateUser(uid, { disabled: true });
    } catch (authErr) {
      console.warn('Auth disable error:', authErr.message);
    }

    res.status(200).json({ success: true, message: 'Account soft‑deleted.' });
  } catch (error) {
    console.error('deleteUserNode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUsers,
  provisionStaffNode,
  toggleUserLifecycle,
  updatePrivileges,
  deleteUserNode,
};