const multer = require('multer');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Get file extension
  const ext = path.extname(file.originalname).toLowerCase();
  
  // 📷 ALLOWED IMAGE EXTENSIONS
  const imageExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', 
    '.webp', '.avif', '.svg', '.bmp', 
    '.tiff', '.ico', '.heic', '.heif'
  ];
  
  // 🎵 ALLOWED AUDIO EXTENSIONS
  const audioExtensions = [
    '.mp3', '.wav', '.mpeg', '.mp4', 
    '.ogg', '.webm', '.flac', '.aac', 
    '.wma', '.m4a'
  ];
  
  // 📷 ALLOWED IMAGE MIME TYPES
  const imageMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif',
    'image/webp',
    'image/avif',        // 👈 AVIF එකතු කරලා
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    'image/x-icon',
    'image/heic',
    'image/heif'
  ];
  
  // 🎵 ALLOWED AUDIO MIME TYPES
  const audioMimeTypes = [
    'audio/mpeg', 
    'audio/mp3', 
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/flac',
    'audio/aac',
    'audio/x-wav',
    'audio/mp4',
    'audio/m4a',
    'application/octet-stream' // For some audio files
  ];

  // Check if extension is allowed
  const isImageExt = imageExtensions.includes(ext);
  const isAudioExt = audioExtensions.includes(ext);
  
  // Check if mime type is allowed
  const isImageMime = imageMimeTypes.includes(file.mimetype);
  const isAudioMime = audioMimeTypes.includes(file.mimetype);
  
  // Check if it's an audio file (by extension or mime)
  const isAudio = isAudioExt || isAudioMime;
  
  // Check if it's an image file (by extension or mime)
  const isImage = isImageExt || isImageMime;
  
  // Allow if image or audio
  if (isImage || isAudio) {
    cb(null, true);
  } else {
    console.log('Rejected file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: ext
    });
    cb(new Error(`Invalid file type. Only images and audio files are allowed. Received: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (for larger audio files)
  },
  fileFilter: fileFilter,
});

module.exports = upload;