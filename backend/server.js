const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { db } = require('./config/firebase');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Langoora Backend is running 🚀',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (email === 'admin@novacore.com' && password === 'Admin@NOVACORE2026') {
      const token = jwt.sign(
        { email, role: 'admin' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '30d' }
      );
      return res.json({
        success: true,
        token,
        user: { email, name: 'System Administrator', role: 'admin' }
      });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const userData = {
      email,
      name: name || 'User',
      role: role || 'student',
      status: 'active',
      credits: 0,
      createdAt: new Date().toISOString()
    };

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
});

app.get('/api/auth/me', (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    res.json({ user: { email: decoded.email, role: decoded.role || 'student' } });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// ============================================
// SUBSCRIPTION ROUTES - FIREBASE CRUD
// ============================================

// GET - Get all plans
app.get('/api/subscriptions', async (req, res) => {
  try {
    const snapshot = await db.collection('subscriptions').where('isActive', '==', true).get();
    const plans = [];
    snapshot.forEach(doc => {
      plans.push({ id: doc.id, ...doc.data() });
    });
    console.log('📖 GET plans:', plans.length);
    res.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE - New plan
app.post('/api/subscriptions', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, price, credits, features, popular, color, icon } = req.body;
    if (!name || !price || !credits) {
      return res.status(400).json({ error: 'Name, price and credits are required' });
    }

    const planData = {
      name,
      price: parseFloat(price),
      credits: parseInt(credits),
      features: features || [],
      popular: popular || false,
      color: color || 'from-purple-400 to-pink-500',
      icon: icon || 'Rocket',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 🔥 මෙය Firebase එකට Save වෙයි
    const docRef = await db.collection('subscriptions').add(planData);
    const newPlan = { id: docRef.id, ...planData };

    console.log('✅ Firebase: Plan created:', newPlan.name);
    res.status(201).json({ success: true, plan: newPlan });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE - Update plan
app.put('/api/subscriptions/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };

    await db.collection('subscriptions').doc(id).update(updateData);
    const doc = await db.collection('subscriptions').doc(id).get();
    console.log('✅ Firebase: Plan updated');
    res.json({ success: true, plan: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Delete plan
app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    await db.collection('subscriptions').doc(id).delete();
    console.log('🗑️ Firebase: Plan deleted');
    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// TOGGLE - Toggle plan status
app.patch('/api/subscriptions/:id/toggle', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const doc = await db.collection('subscriptions').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const currentStatus = doc.data().isActive;
    const newStatus = !currentStatus;
    await db.collection('subscriptions').doc(id).update({ isActive: newStatus });
    
    console.log('🔄 Firebase: Plan toggled');
    res.json({ success: true, isActive: newStatus });
  } catch (error) {
    console.error('Toggle plan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 404 & ERROR HANDLERS
// ============================================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});