const { db } = require('../config/firebase');
const jwt = require('jsonwebtoken');

// Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Admin check
    if (email === 'admin@novacore.com' && password === 'Admin@NOVACORE2026') {
      const token = jwt.sign(
        { email, role: 'admin' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        token,
        user: {
          email,
          name: 'System Administrator',
          role: 'admin'
        }
      });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Register
const registerUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const userSnapshot = await db.collection('users').where('email', '==', email).get();
    if (!userSnapshot.empty) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const userData = {
      email,
      name: name || 'User',
      role: role || 'student',
      status: 'active',
      credits: 0,
      createdAt: new Date().toISOString()
    };

    await db.collection('users').add(userData);

    const token = jwt.sign(
      { email, role: userData.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userSnapshot = await db.collection('users').where('email', '==', email).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userSnapshot.docs[0].data();
    res.json({ user: userData });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  loginUser,
  registerUser,
  getCurrentUser
};