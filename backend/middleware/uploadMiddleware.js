const multer = require('multer');

// 💾 ෆයිල් එක RAM Buffer එකට ගන්නවා
const storageConfig = multer.memoryStorage();

const upload = multer({
  storage: storageConfig,
  limits: { 
    fileSize: 100 * 1024 * 1024 // 🚀 100MB වෙනකම් සයිස් එක වැඩි කලා (Audio වලට ඇති වෙන්න තියෙනවා)
  }, 
});

module.exports = upload;