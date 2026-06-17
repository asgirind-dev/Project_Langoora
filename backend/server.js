const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { db } = require('./config/firebase');
require('dotenv').config();


require('./config/firebase'); 

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); 

const app = express();
app.use(cors());
app.use(express.json());

// Routing Middleware 
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});