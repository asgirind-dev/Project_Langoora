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

// ============================================================
// ✅ FIXED: CORS CONFIGURATION
// ============================================================
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));

// ============================================================
// ✅ MIDDLEWARES
// ============================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================================
// ✅ REQUEST LOGGING (Optional - for debugging)
// ============================================================
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// ============================================================
// ✅ HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// ✅ STATIC FILES
// ============================================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// ✅ ROUTING MIDDLEWARE
// ============================================================
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

// ============================================================
// ✅ 404 HANDLER
// ============================================================
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.url} not found`
  });
});

// ============================================================
// ✅ GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.message);
  console.error(err.stack);
  
  // Handle specific error types
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large. Please reduce file size.'
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================
// ✅ START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ CORS enabled for: http://localhost:5173, http://localhost:3000`);
});

// ============================================================
// ✅ GRACEFUL SHUTDOWN
// ============================================================
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// ============================================================
// ✅ UNHANDLED REJECTIONS
// ============================================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

module.exports = app;
