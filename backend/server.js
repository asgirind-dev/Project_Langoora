const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Configs
require('./config/firebase'); 

// Routes Imports
const examRoutes = require('./routes/examRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

const tutorProfileRoutes = require('./routes/TutorProfilePageRoutes'); 

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routing Middleware 
app.use('/api/exams', examRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/subscription-management', subscriptionRoutes);
app.use('/api/tutors', tutorProfileRoutes); 
app.use('/api/tutors', tutorProfileRoutes); // 
app.use('/api/student', require('./routes/StudentProfilePageroutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running cleanly on port ${PORT}`);
});