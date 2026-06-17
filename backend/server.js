const express = require('express');
const cors = require('cors');
require('dotenv').config();
const examRoutes = require('./routes/examRoutes');


require('./config/firebase'); 

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); 

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api', examRoutes);

// Routing Middleware 
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running cleanly on port ${PORT}`);
});