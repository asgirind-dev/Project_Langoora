const { db } = require('../config/firebase');

/**
 * 📝 Create a new exam with problems and sub-questions
 */
const createExamInDB = async (examData) => {
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
      thumbnail,
      tutor_id,
      tutor_name
    } = examData;

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
      thumbnail: thumbnail || null,
      tutor_id: tutor_id || 'mock_tutor_id',
      tutor_name: tutor_name || 'Expert Tutor',
      isModernExam: true,
      total_questions: questions ? questions.filter(q => !q.is_problem).length : 0,
      total_problems: questions ? questions.filter(q => q.is_problem).length : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await examRef.set(examMetadata);

    // 🚀 Insert Problems and Sub-Questions
    if (questions && questions.length > 0) {
      const batch = db.batch();
      
      // First, collect all problem data
      const problems = questions.filter(q => q.is_problem);
      
      problems.forEach((problem, problemIndex) => {
        const problemId = `problem_${String(problemIndex + 1).padStart(2, '0')}`;
        const problemRef = examRef.collection('problems').doc(problemId);
        
        // Get sub-questions for this problem
        const subQuestions = questions.filter(q => q.parent_problem_id === problem.id && !q.is_problem);
        
        batch.set(problemRef, {
          problem_number: problemIndex + 1,
          section: problem.section,
          problem_title: problem.problem_title ? problem.problem_title.trim() : `Problem ${problemIndex + 1}`,
          explanation: problem.explanation || '',
          
          // Example data
          example: problem.example_question ? {
            text: problem.example_question.trim(),
            options: problem.options || [],
            correct_answer_index: Number(problem.example_correct_option || 0)
          } : null,

          // Sub-Questions
          sub_questions: subQuestions.map((sub, subIndex) => ({
            sub_number: subIndex + 1,
            text: sub.text ? sub.text.trim() : '',
            options: sub.options || ['', '', '', ''],
            correct_answer_index: Number(sub.correct || 0),
            explanation: sub.explanation || '',
            image_url: sub.image_url || null,
            audio_url: sub.audio_url || null
          })),
          
          total_sub_questions: subQuestions.length
        });
      });

      await batch.commit();
    }

    return { success: true, examId: cleanExamId };

  } catch (error) {
    console.error('Exam Creation Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * 📊 Get all student exams
 */
const getStudentExamsFromDB = async () => {
  try {
    const snapshot = await db.collection('student_exams').get();
    const examsList = [];
    
    snapshot.forEach(doc => {
      examsList.push({ id: doc.id, ...doc.data() });
    });
    
    return examsList;
  } catch (error) {
    console.error('Get Student Exams Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * 🗑️ Delete a student exam
 */
const deleteStudentExamFromDB = async (examDocId) => {
  try {
    const examRef = db.collection('student_exams').doc(examDocId);
    const doc = await examRef.get();

    if (!doc.exists) {
      throw new Error('Exam not found in database');
    }
   
    await examRef.delete();
    return { success: true, message: 'Exam successfully deleted!' };
  } catch (error) {
    console.error('Delete Student Exam Service Error:', error);
    throw new Error(error.message);
  }
};

module.exports = {
  createExamInDB,
  getStudentExamsFromDB,
  deleteStudentExamFromDB
};