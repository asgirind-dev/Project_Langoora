const { db } = require('../config/firebase');

/**
 * 📝 Create a new exam with problems and sub-questions (using sub-collections)
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

    // Separate problems and sub-questions
    const problems = questions.filter(q => q.is_problem === true);
    const subQuestions = questions.filter(q => q.is_problem === false);

    // Group sub-questions by parent problem id
    const subQuestionsByProblem = {};
    subQuestions.forEach(q => {
      const parentId = q.parent_problem_id;
      if (!subQuestionsByProblem[parentId]) {
        subQuestionsByProblem[parentId] = [];
      }
      subQuestionsByProblem[parentId].push(q);
    });

    // Build exam metadata
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
      total_problems: problems.length,
      total_questions: subQuestions.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await examRef.set(examMetadata);

    // 🚀 Insert Problems with Sub-Questions as SUB-COLLECTIONS
    if (problems.length > 0) {
      const batch = db.batch();
      
      problems.forEach((problem, index) => {
        const problemId = `problem_${String(index + 1).padStart(2, '0')}`;
        const problemRef = examRef.collection('problems').doc(problemId);
        
        // Get sub-questions for this problem
        const problemSubQuestions = subQuestionsByProblem[problem.id] || [];

        // ✅ PROBLEM = උපදෙස්/පැහැදිලි කිරීම + Example data
        const problemData = {
          problem_number: index + 1,
          section: problem.section,
          problem_title: problem.problem_title ? problem.problem_title.trim() : `Problem ${index + 1}`,
          explanation: problem.explanation || '',
          total_sub_questions: problemSubQuestions.length,
          created_at: new Date().toISOString(),
          
          // ✅ EXAMPLE DATA - Problem collection එක ඇතුළේම save වෙනවා
          example: problem.example_question ? {
            text: problem.example_question.trim(),
            options: problem.options || ['', '', '', ''],
            correct_answer_index: Number(problem.example_correct_option || 0),
            image_url: problem.example_image_url || null, // 👈 Listening example image
            audio_url: problem.example_audio_url || null  // 👈 Listening example audio (optional)
          } : null
        };

        batch.set(problemRef, problemData);

        // 🚀 Add SUB-QUESTIONS as a SUB-COLLECTION
        if (problemSubQuestions.length > 0) {
          const subQuestionsCollectionRef = problemRef.collection('sub_questions');
          
          problemSubQuestions.forEach((sub, subIndex) => {
            const subId = `sub_${String(subIndex + 1).padStart(2, '0')}`;
            const subRef = subQuestionsCollectionRef.doc(subId);
            
            const subData = {
              sub_number: subIndex + 1,
              text: sub.text ? sub.text.trim() : '',
              options: sub.options || ['', '', '', ''],
              correct_answer_index: Number(sub.correct || 0),
              explanation: sub.explanation || '',
              image_url: sub.image_url || null,
              created_at: new Date().toISOString()
            };

            batch.set(subRef, subData);
          });
        }
      });

      await batch.commit();
    }

    console.log(`✅ Exam created: ${cleanExamId}`);
    console.log(`📊 Problems: ${problems.length}, Questions: ${subQuestions.length}`);
    console.log(`📂 Sections: ${sections.map(s => s.name).join(', ')}`);
    
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