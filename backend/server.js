const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Configs
require('./config/firebase'); 

// Firebase Admin Setup
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore(); 

// Routes Imports
const examRoutes = require('./routes/examRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const studyPlannerRoutes = require('./routes/studyPlannerRoutes'); 
const tutorProfileRoutes = require('./routes/TutorProfilePageRoutes'); 
const studentProfileRoutes = require('./routes/StudentProfilePageRoutes');
const tutorValidationRoutes = require('./routes/tutorValidationRoutes'); 
const performanceRoutes = require('./routes/performanceRoutes'); 

const app = express();

// Middlewares
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routing Middleware 
app.use('/api/exams', examRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/subscription-management', subscriptionRoutes); 
app.use('/api/tutors', tutorProfileRoutes); 
app.use('/api/student', studentProfileRoutes); 
app.use('/api/planner', studyPlannerRoutes); 
app.use('/api/validator/tutors', tutorValidationRoutes);
app.use('/api/performance', performanceRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running cleanly on port ${PORT}`);
});