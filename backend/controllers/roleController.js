// backend/controllers/roleController.js
const { db } = require('../config/firebase');

// GET all roles
exports.getAllRoles = async (req, res) => {
  try {
    const snapshot = await db.collection('roles').get();
    const roles = [];
    snapshot.forEach(doc => roles.push({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, roles });
  } catch (error) {
    console.error('getAllRoles error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE a new role
exports.createRole = async (req, res) => {
  try {
    const { name, description, privileges } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Role name is required.' });
    }
    if (privileges && !Array.isArray(privileges)) {
      return res.status(400).json({ success: false, message: 'Privileges must be an array.' });
    }

    // Check duplicate name (case‑insensitive)
    const existing = await db.collection('roles').where('name', '==', name.trim()).get();
    if (!existing.empty) {
      return res.status(400).json({ success: false, message: 'Role name already exists.' });
    }

    const newRole = {
      name: name.trim(),
      description: description || '',
      privileges: privileges || [],
      createdAt: new Date().toISOString(),
    };
    const docRef = await db.collection('roles').add(newRole);
    const created = { id: docRef.id, ...newRole };
    res.status(201).json({ success: true, role: created });
  } catch (error) {
    console.error('createRole error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE a role
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, privileges } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Role name is required.' });
    }
    if (privileges && !Array.isArray(privileges)) {
      return res.status(400).json({ success: false, message: 'Privileges must be an array.' });
    }

    const ref = db.collection('roles').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    // Check duplicate name (excluding itself)
    const existing = await db.collection('roles').where('name', '==', name.trim()).get();
    if (!existing.empty && existing.docs[0].id !== id) {
      return res.status(400).json({ success: false, message: 'Another role with that name exists.' });
    }

    await ref.update({
      name: name.trim(),
      description: description || '',
      privileges: privileges || [],
    });

    res.status(200).json({ success: true, message: 'Role updated.' });
  } catch (error) {
    console.error('updateRole error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE a role
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection('roles').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }
    await ref.delete();
    res.status(200).json({ success: true, message: 'Role deleted.' });
  } catch (error) {
    console.error('deleteRole error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};