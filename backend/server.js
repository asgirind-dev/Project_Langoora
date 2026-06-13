const express = require('express');
const cors = require('cors');
require('dotenv').config();

// අපේ අලුත් Auth Routes ෆයිල් එක මෙතනට ලෝඩ් කරනවා
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routing Middleware 
// (Frontend එකෙන් '/api/auth' වලට එන හැම request එකක්ම authRoutes එකට පාස් කරනවා)
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running cleanly on port ${PORT}`);
});