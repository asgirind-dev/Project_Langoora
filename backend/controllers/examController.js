const { db } = require('../config/firebase');

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
      questions 
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
 * 🗑️ 3. Delete a Student Exam Attempt Node
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

module.exports = {
  createExam,
  getStudentExams,
  deleteStudentExam
};