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
      students: 0,
      revenue: 0,
      rating: 0,
      reviews: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await examRef.set(examMetadata);

    // 🚀 Insert Problems with Sub-Questions and Example Question as SUB-COLLECTIONS
    if (problems.length > 0) {
      const batch = db.batch();
      
      problems.forEach((problem, index) => {
        const problemId = `problem_${String(index + 1).padStart(2, '0')}`;
        const problemRef = examRef.collection('problems').doc(problemId);
        
        // Get sub-questions for this problem
        const problemSubQuestions = subQuestionsByProblem[problem.id] || [];

        // PROBLEM = උපදෙස්/පැහැදිලි කිරීම
        const problemData = {
          problem_number: index + 1,
          section: problem.section,
          problem_title: problem.problem_title ? problem.problem_title.trim() : `Problem ${index + 1}`,
          explanation: problem.explanation || '',
          total_sub_questions: problemSubQuestions.length,
          created_at: new Date().toISOString()
        };

        batch.set(problemRef, problemData);

        // 🚀 Add EXAMPLE QUESTION as a SUB-COLLECTION (example_question)
        if (problem.example_question && problem.example_question.trim()) {
          const exampleRef = problemRef.collection('example_question').doc('example');
          
          const exampleData = {
            text: problem.example_question.trim(),
            options: problem.options || ['', '', '', ''],
            correct_answer_index: Number(problem.example_correct_option || 0),
            explanation: problem.example_explanation || '',
            image_url: problem.example_image_url || null,
            audio_url: problem.example_audio_url || null,
            created_at: new Date().toISOString()
          };

          batch.set(exampleRef, exampleData);
        }

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
              audio_url: sub.audio_url || null,
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
    
    return { success: true, examId: cleanExamId };

  } catch (error) {
    console.error('Exam Creation Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * 📊 Get all exams for a tutor
 */
const getTutorExamsFromDB = async (tutorId) => {
  try {
    let query = db.collection('exams');
    
    if (tutorId) {
      query = query.where('tutor_id', '==', tutorId);
    }
    
    const snapshot = await query.get();
    const examsList = [];
    
    snapshot.forEach(doc => {
      examsList.push({ id: doc.id, ...doc.data() });
    });
    
    examsList.sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    return examsList;
  } catch (error) {
    console.error('Get Tutor Exams Service Error:', error);
    throw new Error(error.message);
  }
};

// ✅ ADD THIS FUNCTION - Get Student Exams
const getStudentExamsFromDB = async (studentId = null) => {
  try {
    let query = db.collection('student_exams');
    
    // If studentId is provided, filter by student
    if (studentId) {
      query = query.where('studentId', '==', studentId);
    }
    
    const snapshot = await query.get();
    const examsList = [];
    
    snapshot.forEach(doc => {
      examsList.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by newest first
    examsList.sort((a, b) => {
      return new Date(b.startTime || b.created_at) - new Date(a.startTime || a.created_at);
    });
    
    return examsList;
  } catch (error) {
    console.error('Get Student Exams Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * 📊 Get a single exam by ID
 */
const getExamByIdFromDB = async (examId) => {
  try {
    const examDoc = await db.collection('exams').doc(examId).get();
    
    if (!examDoc.exists) {
      throw new Error('Exam not found');
    }
    
    const examData = examDoc.data();
    
    // Get problems and sub-questions
    const problemsSnapshot = await db.collection('exams')
      .doc(examId)
      .collection('problems')
      .get();
    
    const problems = [];
    
    for (const problemDoc of problemsSnapshot.docs) {
      const problemData = problemDoc.data();
      const problemId = problemDoc.id;
      
      // Get example question
      let example = null;
      try {
        const exampleDoc = await db.collection('exams')
          .doc(examId)
          .collection('problems')
          .doc(problemId)
          .collection('example_question')
          .doc('example')
          .get();
        
        if (exampleDoc.exists) {
          example = exampleDoc.data();
        }
      } catch (exampleError) {
        example = null;
      }
      
      // Get sub-questions
      const subQuestionsSnapshot = await db.collection('exams')
        .doc(examId)
        .collection('problems')
        .doc(problemId)
        .collection('sub_questions')
        .get();
      
      const subQuestions = subQuestionsSnapshot.docs.map(subDoc => ({
        id: subDoc.id,
        ...subDoc.data()
      }));
      
      problems.push({
        id: problemId,
        ...problemData,
        example: example,
        sub_questions: subQuestions
      });
    }
    
    return {
      success: true,
      exam: {
        id: examId,
        ...examData,
        problems: problems
      }
    };
    
  } catch (error) {
    console.error('Get Exam By ID Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * 🗑️ Delete an exam
 */
const deleteExamFromDB = async (examId) => {
  try {
    const problemsSnapshot = await db.collection('exams')
      .doc(examId)
      .collection('problems')
      .get();
    
    const batch = db.batch();
    
    for (const problemDoc of problemsSnapshot.docs) {
      const problemId = problemDoc.id;
      
      // Delete example_question
      try {
        const exampleDoc = await db.collection('exams')
          .doc(examId)
          .collection('problems')
          .doc(problemId)
          .collection('example_question')
          .doc('example')
          .get();
        
        if (exampleDoc.exists) {
          batch.delete(exampleDoc.ref);
        }
      } catch (e) {}
      
      // Delete sub-questions
      const subQuestionsSnapshot = await db.collection('exams')
        .doc(examId)
        .collection('problems')
        .doc(problemId)
        .collection('sub_questions')
        .get();
      
      subQuestionsSnapshot.forEach(subDoc => {
        batch.delete(subDoc.ref);
      });
      
      // Delete problem
      batch.delete(problemDoc.ref);
    }
    
    // Delete exam document
    batch.delete(db.collection('exams').doc(examId));
    
    await batch.commit();
    
    return { success: true, message: 'Exam deleted successfully!' };
  } catch (error) {
    console.error('Delete Exam Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * 📝 Update exam status
 */
const updateExamStatusInDB = async (examId, status) => {
  try {
    await db.collection('exams').doc(examId).update({
      status: status,
      updated_at: new Date().toISOString()
    });
    
    return { success: true, message: `Exam status updated to ${status}` };
  } catch (error) {
    console.error('Update Exam Status Error:', error);
    throw new Error(error.message);
  }
};

/**
 * 🗑️ Delete Student Exam
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
  getTutorExamsFromDB,
  getStudentExamsFromDB,  // ✅ Added this
  getExamByIdFromDB,
  deleteExamFromDB,
  updateExamStatusInDB,
  deleteStudentExamFromDB
};