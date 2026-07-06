const { db, storage } = require('../config/firebase');
const cloudinary = require('cloudinary').v2;
/**
 * 🚀 1. Create a New Exam Blueprint and Nest Questions Sub-collection (Tutor Action)
 */
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
      thumbnail // 👈 Frontend එකෙන් එවන Exam Cover Image URL එක මෙතනට ගන්නවා
    } = req.body;

    if (!title || !category_id || !level_id || !duration_minutes) {
      return res.status(400).json({ success: false, message: 'Core metadata parameters are missing.' });
    }

    const cleanExamId = `exam_${category_id}_${level_id}_${Date.now()}`;
    const examRef = db.collection('exams').doc(cleanExamId);

    const examMetadata = {
      title: title.trim(),
      category_id,
      level_id,
      duration_minutes: Number(duration_minutes),
      description: description ? description.trim() : '',
      status: status || 'draft',
      sections: sections || [],
      thumbnail: thumbnail || null, // 👈 📷 Database blueprint එකට thumbnail එක ඇතුළත් කළා
      total_questions: questions ? questions.length : 0,
      tutor_id: req.user?.id || 'mock_tutor_id',
      tutor_name: req.user?.name || 'Expert Tutor',
      isModernExam: true,
      created_at: new Date().toISOString()
    };

    await examRef.set(examMetadata);

    if (questions && questions.length > 0) {
      const batch = db.batch();

      questions.forEach((q, index) => {
        const questionId = `q_${String(index + 1).padStart(2, '0')}`;
        const questionRef = examRef.collection('questions').doc(questionId);
        
        batch.set(questionRef, {
          question_number: index + 1,
          section: q.section,
          type: q.type || 'mcq',
          text: q.text ? q.text.trim() : '',
          options: q.options || [],
          correct_answer_index: q.correct !== undefined ? Number(q.correct) : 0,
          explanation: q.explanation ? q.explanation.trim() : '',
          audio_url: q.audio_url || null,
          image_url: q.image_url || null
        });
      });

      await batch.commit();
    }

    return res.status(201).json({ 
      success: true, 
      message: 'Exam architecture deployed and structured inside node repositories.',
      examId: cleanExamId 
    });

  } catch (error) {
    console.error('Exam Creation Core Runtime Exception:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server failed to execute blueprint commit.' });
  }
};

/**
 * 📊 2. Fetch All Student Exam Attempts
 */
const getStudentExams = async (req, res) => {
  try {
    const snapshot = await db.collection('student_exams').get();
    const examsList = [];
    
    snapshot.forEach(doc => {
      examsList.push({ id: doc.id, ...doc.data() }); 
    });
    
    return res.status(200).json(examsList);
  } catch (error) {
    console.error("Firebase Fetch Error:", error);
    return res.status(500).json({ message: 'Error fetching exams', error: error.message });
  }
};

/**
 * 🎵 📷 3. Upload Asset to Cloudinary via Direct Memory Stream Buffer
 */
const uploadAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file detected in request buffer.' });
    }

    // 🛡️ .env එකෙන් කියවෙන්නේ නැති නිසා කෙලින්ම ඔයාගේ Keys ටික string විදිහට මෙතනට දෙනවා
    cloudinary.config({
      cloud_name: 'akarwtly',
      api_key: '533185996121573',
      api_secret: 'ZkxUf2UUNBinoJhCgf02gQop-ns'
    });

    // (අර console.log ටික දැන් අයින් කරලා දාන්න, මේක විතරක් තියන්න)

    console.log("--- CLOUDINARY DEBUG MATRIX ---");
    console.log("Read Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
    console.log("Read API Key:", process.env.CLOUDINARY_API_KEY);
    console.log("Read API Secret:", process.env.CLOUDINARY_API_SECRET);
    console.log("--------------------------------");

    const fileType = req.file.mimetype.split('/')[0];
    let folderPath = 'langoora/images';
    let resourceType = 'image';

    if (fileType === 'audio') {
      folderPath = 'langoora/audio';
      resourceType = 'video'; // Cloudinary uses 'video' format type for audio streams
    }

    // 🚀 Cloudinary Stream Uploader Matrix
    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: folderPath,
            resource_type: resourceType,
            public_id: `${Date.now()}_${req.file.originalname.split('.')[0].replace(/\s+/g, '_')}`
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        
        // Memory buffer එක stream එකට write කරනවා
        stream.end(req.file.buffer);
      });
    };

    // 📡 Cloudinary එකට upload වෙනකම් බලාගෙන ඉන්නවා
    const cloudinaryResult = await uploadStream();

    return res.status(200).json({
      success: true,
      message: 'Asset uploaded successfully to Cloudinary CDN server infrastructure.',
      fileUrl: cloudinaryResult.secure_url, // 👈 Cloudinary එකෙන් දෙන නිවැරදිම HTTPS URL එක
    });

  } catch (error) {
    console.error('Cloudinary Asset Upload Runtime Exception:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server failed to execute cloud asset streaming.',
      error: error.message 
    });
  }
};

/**
 * 🗑️ 4. Delete Asset from Cloudinary CDN Server
 */
const deleteAsset = async (req, res) => {
  try {
    const { fileUrl } = req.body; // 👈 Frontend එකෙන් එවන්න ඕනේ delete කරන්න ඕන file එකේ සම්පූර්ණ URL එක

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'File URL is required for deletion.' });
    }

    // 🛡️ Credentials ටික කෙලින්ම මෙතනටත් දෙනවා (කවදාවත් වරදින්නේ නැති වෙන්න)
    cloudinary.config({
      cloud_name: 'akarwtly',
      api_key: '533185996121573',
      api_secret: 'ZkxUf2UUNBinoJhCgf02gQop-ns'
    });

    // 🔍 URL එකෙන් Cloudinary Public ID එකයි Resource Type එකයි කඩලා ගන්නවා
    // උදා: https://res.cloudinary.com/.../langoora/audio/171999_my_audio.mp3
    const urlParts = fileUrl.split('/');
    const fileWithExtension = urlParts[urlParts.length - 1]; // 171999_my_audio.mp3
    const publicIdWithoutExt = fileWithExtension.split('.')[0]; // 171999_my_audio

    // Folder structure එකත් එක්කම public_id එක හදාගන්නවා
    const isAudio = fileUrl.includes('/audio/');
    const folderPath = isAudio ? 'langoora/audio' : 'langoora/images';
    const publicId = `${folderPath}/${publicIdWithoutExt}`;

    const resourceType = isAudio ? 'video' : 'image'; // Cloudinary වල audio අයිති වෙන්නේ video කැටගරි එකටයි

    // 🚀 Cloudinary Core Deletion Engine
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    if (result.result === 'ok') {
      return res.status(200).json({
        success: true,
        message: 'Asset successfully deleted from Cloudinary repository.'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Cloudinary could not find or delete the asset.',
        cloudinaryResult: result
      });
    }

  } catch (error) {
    console.error('Cloudinary Asset Deletion Runtime Exception:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server failed to execute cloud asset deletion.',
      error: error.message
    });
  }
};

// 📤 Export කරන තැනටත් මේක ඇතුළත් කරන්න අමතක කරන්න එපා මචං!
module.exports = {
  // ඔයාගේ අනෙක් functions...
  uploadAsset,
  deleteAsset // 👈 මේක අලුතින් දාන්න
};

/**
 * 🗑️ 4. Delete a Student Exam Attempt Node
 */
const deleteStudentExam = async (req, res) => {
  try {
    const examDocId = req.params.id; 
    const examRef = db.collection('student_exams').doc(examDocId);
    const doc = await examRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Exam not found in database' });
    }
   
    await examRef.delete();
    return res.status(200).json({ message: 'Exam successfully deleted from database!' });
  } catch (error) {
    console.error("Firebase Delete Error:", error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// 🌟 හැම එකක්ම පිළිවෙළට export කරගත්තා
module.exports = {
  createExam,
  getStudentExams,
  uploadAsset, // 👈 මෙන්න මේක මෙතනට දැම්මා, දැන් Routes වලට කිසිම Error එකක් එන්නේ නෑ!
  deleteStudentExam
};