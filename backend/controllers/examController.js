const { db } = require('../config/firebase');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const examServices = require('../services/examServices');

// =========================================================================
// 🚀 1. Create Exam
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

    if (!title || !category_id || !duration_minutes) {
      return res.status(400).json({ 
        success: false, 
        message: 'Core metadata parameters are missing.' 
      });
    }

    const tutorId = req.user?.id || req.user?.uid || 'mock_tutor_id';
    const tutorName = req.user?.name || req.user?.displayName || 'Expert Tutor';

    console.log('📝 Creating exam for tutor:', { tutorId, tutorName });

    const examData = {
      title,
      category_id,
      level_id: level_id || '',
      duration_minutes: Number(duration_minutes),
      description: description || '',
      status: status || 'draft',
      sections: sections || [],
      questions: questions || [],
      thumbnail: thumbnail || null,
      tutor_id: tutorId,
      tutor_name: tutorName
    };

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
// 📚 2. Get all exams available for students (public)
// =========================================================================
const getAllExams = async (req, res) => {
  try {
    const snapshot = await db.collection('exams').where('status', '==', 'published').get();
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
// 📚 2.5 Get ALL exams (Development only - NO AUTH)
// =========================================================================
const getAllExamsDev = async (req, res) => {
  try {
    console.log('🛠️ DEV: Fetching ALL exams from Firestore (NO AUTH)');
    const snapshot = await db.collection('exams').get();
    const examsList = [];
    snapshot.forEach(doc => {
      examsList.push({ id: doc.id, ...doc.data() });
    });
    console.log(`✅ DEV: Found ${examsList.length} total exams`);
    return res.status(200).json({ 
      success: true, 
      data: examsList,
      count: examsList.length
    });
  } catch (error) {
    console.error('Get all exams (dev) error:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching exams', 
      error: error.message 
    });
  }
};

// =========================================================================
// 📊 3. Get Tutor Exams (Only logged-in tutor's exams)
// =========================================================================
const getTutorExams = async (req, res) => {
  try {
    const tutorId = req.user?.id || req.user?.uid;
    
    if (!tutorId) {
      console.error('❌ No tutor ID found in request');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log('📊 Fetching exams for tutor:', tutorId);
    
    const examsList = await examServices.getTutorExamsFromDB(tutorId);
    
    console.log(`✅ Found ${examsList.length} exams for tutor: ${tutorId}`);
    
    return res.status(200).json({
      success: true,
      exams: examsList
    });
  } catch (error) {
    console.error("Get Tutor Exams Error:", error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching exams', 
      error: error.message 
    });
  }
};

// =========================================================================
// 📊 4. Get Student Exams
// =========================================================================
const getStudentExams = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const examsList = await examServices.getStudentExamsFromDB(studentId);
    
    return res.status(200).json({
      success: true,
      data: examsList
    });
  } catch (error) {
    console.error("Get Student Exams Error:", error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching student exams', 
      error: error.message 
    });
  }
};

// =========================================================================
// 📊 5. Get Exam by ID (with access control)
// =========================================================================
const getExamById = async (req, res) => {
  try {
    const { examId } = req.params;
    const tutorId = req.user?.id || req.user?.uid;
    
    const result = await examServices.getExamByIdFromDB(examId, tutorId);
    
    return res.status(200).json({
      success: true,
      exam: result.exam
    });
  } catch (error) {
    console.error("Get Exam By ID Error:", error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching exam', 
      error: error.message 
    });
  }
};

// =========================================================================
// 🗑️ 6. Delete Exam (with access control)
// =========================================================================
const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const tutorId = req.user?.id || req.user?.uid;
    
    const result = await examServices.deleteExamFromDB(examId, tutorId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Delete Exam Error:", error);
    return res.status(500).json({ 
      success: false,
      message: 'Error deleting exam', 
      error: error.message 
    });
  }
};

// =========================================================================
// 📝 7. Update Exam Status (with access control)
// =========================================================================
const updateExamStatus = async (req, res) => {
  try {
    const { examId } = req.params;
    const { status } = req.body;
    const tutorId = req.user?.id || req.user?.uid;
    
    if (!status || !['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be draft, published, or archived.'
      });
    }
    
    const result = await examServices.updateExamStatusInDB(examId, status, tutorId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Update Exam Status Error:", error);
    return res.status(500).json({ 
      success: false,
      message: 'Error updating exam status', 
      error: error.message 
    });
  }
};

// =========================================================================
// 📝 8. Update Exam Draft (Auto-save) - with access control
// =========================================================================
const updateExamDraft = async (req, res) => {
  try {
    const { examId } = req.params;
    const draftData = req.body;
    const tutorId = req.user?.id || req.user?.uid;
    
    console.log('📝 Updating draft for exam:', examId, 'by tutor:', tutorId);
    
    const result = await examServices.updateExamDraftInDB(examId, draftData, tutorId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Update Exam Draft Error:", error);
    return res.status(500).json({ 
      success: false,
      message: 'Error updating exam draft', 
      error: error.message 
    });
  }
};

// =========================================================================
// 📝 9. Update Existing Exam (Full Update) - with access control
// =========================================================================
const updateExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const examData = req.body;
    const tutorId = req.user?.id || req.user?.uid;
    
    console.log('📝 Updating full exam:', examId, 'by tutor:', tutorId);
    
    const result = await examServices.updateExamInDB(examId, examData, tutorId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Update Exam Error:", error);
    return res.status(500).json({ 
      success: false,
      message: 'Error updating exam', 
      error: error.message 
    });
  }
};

// =========================================================================
// 🗑️ 10. Delete Student Exam
// =========================================================================
const deleteStudentExam = async (req, res) => {
  try {
    const examDocId = req.params.id;
    const result = await examServices.deleteStudentExamFromDB(examDocId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Delete Student Exam Error:", error);
    return res.status(500).json({ 
      success: false,
      message: 'Error deleting student exam', 
      error: error.message 
    });
  }
};

// =========================================================================
// 🚀 11. Upload Asset (Audios to Cloudinary | Images to Base64)
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
    
    const audioExtensions = ['.mp3', '.wav', '.mpeg', '.mp4', '.ogg', '.webm', '.flac', '.aac', '.wma', '.m4a'];
    const audioMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/m4a', 'application/octet-stream'];
    
    const isAudio = audioExtensions.includes(ext) || audioMimeTypes.includes(mimeType);
    
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
// 🗑️ 12. Delete Asset from Cloudinary
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

    if (fileUrl.startsWith('data:image')) {
      return res.status(200).json({
        success: true,
        message: 'Local image string cleared from local context.'
      });
    }

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
// 🌟 Export All Functions
// =========================================================================
module.exports = {
  createExam,
  getTutorExams,
  getStudentExams,
  getExamById,
  deleteExam,
  updateExamStatus,
  updateExamDraft,
  updateExam,
  getAllExams,
  getAllExamsDev,
  deleteStudentExam,
  uploadAsset,
  deleteAsset
};