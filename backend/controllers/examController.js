const { db } = require('../config/firebase');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const examServices = require('../services/examServices');

// =========================================================================
// 🚀 1. Create Exam - Using Service Layer
// =========================================================================
const createExam = async (req, res) => {
  try {
    const { 
      title, 
      category_id, 
      level_id, 
      duration_minutes, 
      description, 
      status, 
      sections, 
      questions,
      thumbnail 
    } = req.body;

    // Validation
    if (!title || !category_id || !level_id || !duration_minutes) {
      return res.status(400).json({ 
        success: false, 
        message: 'Core metadata parameters are missing.' 
      });
    }

    // Prepare data for service
    const examData = {
      title,
      category_id,
      level_id,
      duration_minutes,
      description: description || '',
      status: status || 'draft',
      sections: sections || [],
      questions: questions || [],
      thumbnail: thumbnail || null,
      tutor_id: req.user?.id || 'mock_tutor_id',
      tutor_name: req.user?.name || 'Expert Tutor'
    };

    // Call service layer
    const result = await examServices.createExamInDB(examData);

    if (result.success) {
      return res.status(201).json({ 
        success: true, 
        message: 'Exam structure deployed successfully!',
        examId: result.examId 
      });
    }

  } catch (error) {
    console.error('Exam Creation Core Runtime Exception:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server failed to execute blueprint commit.',
      error: error.message 
    });
  }
};

// =========================================================================
// 📚 2. Get all exams available for students
// =========================================================================
const getAllExams = async (req, res) => {
  try {
    const snapshot = await db.collection('exams').get();
    const examsList = [];
    snapshot.forEach(doc => {
      examsList.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ success: true, data: examsList });
  } catch (error) {
    console.error('Get all exams error:', error.message);
    return res.status(500).json({ success: false, message: 'Error fetching exams', error: error.message });
  }
};

// =========================================================================
// 📊 3. Get Student Exams - Using Service Layer
// =========================================================================
const getStudentExams = async (req, res) => {
  try {
    const examsList = await examServices.getStudentExamsFromDB();
    return res.status(200).json(examsList);
  } catch (error) {
    console.error("Firebase Fetch Error:", error);
    return res.status(500).json({ 
      message: 'Error fetching exams', 
      error: error.message 
    });
  }
};

// =========================================================================
// 🚀 4. Upload Asset (Audios to Cloudinary | Images to Base64)
// =========================================================================
const uploadAsset = async (req, res) => {
  try {
    console.log('📤 Upload request received:', {
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer_length: req.file.buffer ? req.file.buffer.length : 0
      } : '❌ No file'
    });

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file detected in payload repository.' 
      });
    }

    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;
    const ext = path.extname(fileName).toLowerCase();
    
    // 🎵 Check if it's audio
    const audioExtensions = ['.mp3', '.wav', '.mpeg', '.mp4', '.ogg', '.webm', '.flac', '.aac', '.wma', '.m4a'];
    const audioMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/m4a', 'application/octet-stream'];
    
    const isAudio = audioExtensions.includes(ext) || audioMimeTypes.includes(mimeType);
    
    // 📷 Check if it's image
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.bmp', '.tiff'];
    const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml', 'image/bmp', 'image/tiff'];
    
    const isImage = imageExtensions.includes(ext) || imageMimeTypes.includes(mimeType);

    console.log('📋 File type detection:', {
      fileName,
      ext,
      mimeType,
      isAudio,
      isImage
    });

    // 🎵 AUDIO - Cloudinary Upload
    if (isAudio) {
      cloudinary.config({
        cloud_name: 'akarwtly',
        api_key: '533185996121573',
        api_secret: 'ZkxUf2UUNBinoJhCgf02gQop-ns'
      });

      const cloudinaryStream = cloudinary.uploader.upload_stream(
        {
          folder: 'langoora/audio',
          resource_type: 'auto',
          format: 'mp3',
          eager: [{ format: 'mp3' }],
          eager_async: true
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary Audio Stream Error:', error);
            return res.status(500).json({
              success: false,
              message: 'Cloudinary Audio streaming failed.',
              error: error.message
            });
          }
          console.log('✅ Audio uploaded successfully:', result.secure_url);
          return res.status(200).json({
            success: true,
            url: result.secure_url,
            fileUrl: result.secure_url,
            type: 'audio'
          });
        }
      );

      return cloudinaryStream.end(req.file.buffer);
    }

    // 📷 IMAGE - Base64 Conversion
    else if (isImage) {
      const base64Image = req.file.buffer.toString('base64');
      const dataUriString = `data:${mimeType};base64,${base64Image}`;

      console.log('✅ Image converted to Base64 successfully');
      return res.status(200).json({
        success: true,
        url: dataUriString,
        fileUrl: dataUriString,
        type: 'image'
      });
    }

    // ❌ Unknown file type
    else {
      console.log('❌ Unknown file type:', { mimeType, ext });
      return res.status(400).json({
        success: false,
        message: `Unsupported file type: ${mimeType}. Please upload image or audio files.`
      });
    }

  } catch (error) {
    console.error('❌ Asset Process Runtime Exception:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server failed to execute asset controller.',
      error: error.message
    });
  }
};

// =========================================================================
// 🗑️ 5. Delete Asset from Cloudinary
// =========================================================================
const deleteAsset = async (req, res) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'File URL is required.' 
      });
    }

    // Base64 images can't be deleted from Cloudinary
    if (fileUrl.startsWith('data:image')) {
      return res.status(200).json({
        success: true,
        message: 'Local image string cleared from local context.'
      });
    }

    // Delete from Cloudinary
    cloudinary.config({
      cloud_name: 'akarwtly',
      api_key: '533185996121573',
      api_secret: 'ZkxUf2UUNBinoJhCgf02gQop-ns'
    });

    const urlParts = fileUrl.split('/');
    const fileWithExtension = urlParts[urlParts.length - 1];
    const publicIdWithoutExt = fileWithExtension.split('.')[0];
    const publicId = `langoora/audio/${publicIdWithoutExt}`;

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video'
    });

    if (result.result === 'ok') {
      return res.status(200).json({ 
        success: true, 
        message: 'Audio successfully deleted from Cloudinary.' 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Cloudinary deletion failed or asset already removed.' 
      });
    }

  } catch (error) {
    console.error('Delete Asset Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// =========================================================================
// 🗑️ 6. Delete Student Exam - Using Service Layer
// =========================================================================
const deleteStudentExam = async (req, res) => {
  try {
    const examDocId = req.params.id;
    const result = await examServices.deleteStudentExamFromDB(examDocId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Firebase Delete Error:", error);
    return res.status(500).json({ 
      message: 'Server Error', 
      error: error.message 
    });
  }
};

// =========================================================================
// 🌟 Export All Functions
// =========================================================================
module.exports = {
  createExam,
  getAllExams,
  getStudentExams,
  uploadAsset,
  deleteAsset,
  deleteStudentExam
};