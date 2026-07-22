// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path'); 

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Configs
require('./config/firebase'); 

// Routes Imports
const examRoutes = require('./routes/examRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const studyPlannerRoutes = require('./routes/studyPlannerRoutes'); 
const tutorProfileRoutes = require('./routes/TutorProfilePageRoutes'); 
const studentProfileRoutes = require('./routes/StudentProfilePageRoutes');
const tutorValidationRoutes = require('./routes/tutorValidationRoutes'); 
const languageRoutes = require('./routes/languageRoutes');
const systemSettingsRoutes = require('./routes/systemSettingsRoutes');
const financeRoutes = require('./routes/financeRoutes'); 
const examExecutionRoutes = require('./routes/examExecutionRoutes');
const emailLogRoutes = require('./routes/emailLogRoutes');

const app = express();

// ✅ FIXED: Proper CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ FIXED: Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ ADDED: Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`);
  if (req.headers.authorization) {
    console.log('🔑 Token present:', req.headers.authorization.substring(0, 30) + '...');
  }
  if (req.body && Object.keys(req.body).length > 0 && !req.url.includes('/test-email')) {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// ✅ ADDED: Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Routing Middleware 
app.use('/api/exams', examRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/subscription-management', subscriptionRoutes);
app.use('/api/tutors', tutorProfileRoutes); 
app.use('/api/student', studentProfileRoutes); 
app.use('/api/planner', studyPlannerRoutes); 
app.use('/api/validator/tutors', tutorValidationRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/exam-execution', examExecutionRoutes);
app.use('/api/email-logs', emailLogRoutes);

// Serve static uploads if applicable
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ ADDED: Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  console.error('Stack:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ✅ ADDED: 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API base: http://localhost:${PORT}/api`);
  console.log(`📍 System settings: http://localhost:${PORT}/api/system-settings`);
});