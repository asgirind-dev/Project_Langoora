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

    const validTutorId = tutor_id || 'mock_tutor_id';
    const validTutorName = tutor_name || 'Expert Tutor';

    console.log('📝 Creating exam for tutor:', { validTutorId, validTutorName });

    const cleanExamId = `exam_${category_id}_${level_id}_${Date.now()}`;
    const examRef = db.collection('exams').doc(cleanExamId);

    const problems = questions.filter(q => q.is_problem === true);
    const subQuestions = questions.filter(q => q.is_problem === false);

    const subQuestionsByProblem = {};
    subQuestions.forEach(q => {
      const parentId = q.parent_problem_id;
      if (!subQuestionsByProblem[parentId]) {
        subQuestionsByProblem[parentId] = [];
      }
      subQuestionsByProblem[parentId].push(q);
    });

    const examMetadata = {
      title: title.trim(),
      category_id,
      level_id,
      duration_minutes: Number(duration_minutes),
      description: description ? description.trim() : '',
      status: status || 'draft',
      sections: sections || [],
      thumbnail: thumbnail || null,
      tutor_id: validTutorId,
      tutor_name: validTutorName,
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

    if (problems.length > 0) {
      const batch = db.batch();
      
      problems.forEach((problem, index) => {
        const problemId = `problem_${String(index + 1).padStart(2, '0')}`;
        const problemRef = examRef.collection('problems').doc(problemId);
        
        const problemSubQuestions = subQuestionsByProblem[problem.id] || [];

        // ✅ Problem data - Example එක මෙතනින් අයින් කරන්න
        const problemData = {
          problem_number: index + 1,
          section: problem.section,
          problem_title: problem.problem_title ? problem.problem_title.trim() : `Problem ${index + 1}`,
          explanation: problem.explanation || '',
          total_sub_questions: problemSubQuestions.length,
          created_at: new Date().toISOString()
          // ⚠️ example එක මෙතනින් ඉවත් කරන්න
        };

        batch.set(problemRef, problemData);

        // ✅ NEW: Example Question as Sub-collection
        if (problem.example_question) {
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

        // Save sub-questions for this problem
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

    console.log(`✅ Exam created: ${cleanExamId} for tutor: ${validTutorId}`);
    
    return { success: true, examId: cleanExamId };

  } catch (error) {
    console.error('Exam Creation Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * 📊 Get a single exam by ID (with access control)
 */
const getExamByIdFromDB = async (examId, tutorId) => {
  try {
    const examDoc = await db.collection('exams').doc(examId).get();
    
    if (!examDoc.exists) {
      throw new Error('Exam not found');
    }
    
    const examData = examDoc.data();
    
    if (tutorId && examData.tutor_id !== tutorId) {
      throw new Error('You do not have permission to access this exam');
    }
    
    const problemsSnapshot = await db.collection('exams')
      .doc(examId)
      .collection('problems')
      .get();
    
    const problems = [];
    
    for (const problemDoc of problemsSnapshot.docs) {
      const problemData = problemDoc.data();
      const problemId = problemDoc.id;
      
      // ✅ NEW: Get example from sub-collection
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
 * 🗑️ Delete an exam (with access control)
 */
const deleteExamFromDB = async (examId, tutorId) => {
  try {
    const examDoc = await db.collection('exams').doc(examId).get();
    
    if (!examDoc.exists) {
      throw new Error('Exam not found');
    }
    
    const examData = examDoc.data();
    
    if (tutorId && examData.tutor_id !== tutorId) {
      throw new Error('You do not have permission to delete this exam');
    }
    
    const problemsSnapshot = await db.collection('exams')
      .doc(examId)
      .collection('problems')
      .get();
    
    const batch = db.batch();
    
    for (const problemDoc of problemsSnapshot.docs) {
      const problemId = problemDoc.id;
      
      // ✅ NEW: Delete example_question sub-collection
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
      
      const subQuestionsSnapshot = await db.collection('exams')
        .doc(examId)
        .collection('problems')
        .doc(problemId)
        .collection('sub_questions')
        .get();
      
      subQuestionsSnapshot.forEach(subDoc => {
        batch.delete(subDoc.ref);
      });
      
      batch.delete(problemDoc.ref);
    }
    
    batch.delete(db.collection('exams').doc(examId));
    
    await batch.commit();
    
    return { success: true, message: 'Exam deleted successfully!' };
  } catch (error) {
    console.error('Delete Exam Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * 📝 Update Existing Exam (Full Update - with access control)
 */
const updateExamInDB = async (examId, examData, tutorId) => {
  try {
    const examDoc = await db.collection('exams').doc(examId).get();
    
    if (!examDoc.exists) {
      throw new Error('Exam not found');
    }
    
    const existingExam = examDoc.data();
    
    if (tutorId && existingExam.tutor_id !== tutorId) {
      throw new Error('You do not have permission to update this exam');
    }
    
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
    } = examData;

    // Delete all existing problems and sub-questions
    const problemsSnapshot = await db.collection('exams')
      .doc(examId)
      .collection('problems')
      .get();
    
    const batch = db.batch();
    
    for (const problemDoc of problemsSnapshot.docs) {
      const problemId = problemDoc.id;
      
      // ✅ NEW: Delete example_question sub-collection
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
      
      const subQuestionsSnapshot = await db.collection('exams')
        .doc(examId)
        .collection('problems')
        .doc(problemId)
        .collection('sub_questions')
        .get();
      
      subQuestionsSnapshot.forEach(subDoc => {
        batch.delete(subDoc.ref);
      });
      
      batch.delete(problemDoc.ref);
    }
    
    await batch.commit();

    const problems = questions.filter(q => q.is_problem === true);
    const subQuestions = questions.filter(q => q.is_problem === false);

    const subQuestionsByProblem = {};
    subQuestions.forEach(q => {
      const parentId = q.parent_problem_id;
      if (!subQuestionsByProblem[parentId]) {
        subQuestionsByProblem[parentId] = [];
      }
      subQuestionsByProblem[parentId].push(q);
    });

    // Update exam metadata
    await db.collection('exams').doc(examId).update({
      title: title.trim(),
      category_id,
      level_id: level_id || '',
      duration_minutes: Number(duration_minutes),
      description: description || '',
      status: status || 'draft',
      sections: sections || [],
      thumbnail: thumbnail || null,
      total_problems: problems.length,
      total_questions: subQuestions.length,
      updated_at: new Date().toISOString()
    });

    // Re-insert problems with sub-questions
    if (problems.length > 0) {
      const newBatch = db.batch();
      
      problems.forEach((problem, index) => {
        const problemId = `problem_${String(index + 1).padStart(2, '0')}`;
        const problemRef = db.collection('exams')
          .doc(examId)
          .collection('problems')
          .doc(problemId);
        
        const problemSubQuestions = subQuestionsByProblem[problem.id] || [];

        // ✅ Problem data - Example එක මෙතනින් අයින් කරන්න
        const problemData = {
          problem_number: index + 1,
          section: problem.section,
          problem_title: problem.problem_title ? problem.problem_title.trim() : `Problem ${index + 1}`,
          explanation: problem.explanation || '',
          total_sub_questions: problemSubQuestions.length,
          created_at: new Date().toISOString()
          // ⚠️ example එක මෙතනින් ඉවත් කරන්න
        };

        newBatch.set(problemRef, problemData);

        // ✅ NEW: Example Question as Sub-collection
        if (problem.example_question) {
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
          newBatch.set(exampleRef, exampleData);
        }

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

            newBatch.set(subRef, subData);
          });
        }
      });

      await newBatch.commit();
    }

    return { success: true, message: 'Exam updated successfully.' };
  } catch (error) {
    console.error('Update Exam Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * 📝 Update exam draft (with access control)
 */
const updateExamDraftInDB = async (examId, draftData, tutorId) => {
  try {
    const examDoc = await db.collection('exams').doc(examId).get();
    
    if (!examDoc.exists) {
      throw new Error('Exam not found');
    }
    
    const examData = examDoc.data();
    
    if (tutorId && examData.tutor_id !== tutorId) {
      throw new Error('You do not have permission to update this exam');
    }
    
    const { 
      title, 
      category_id, 
      level_id, 
      duration_minutes, 
      description, 
      sections, 
      questions,
      thumbnail,
      status 
    } = draftData;

    await db.collection('exams').doc(examId).update({
      title: title.trim(),
      category_id: category_id || '',
      level_id: level_id || '',
      duration_minutes: Number(duration_minutes),
      description: description || '',
      sections: sections || [],
      thumbnail: thumbnail || null,
      status: status || 'draft',
      total_problems: questions.filter(q => q.is_problem === true).length,
      total_questions: questions.filter(q => q.is_problem === false).length,
      updated_at: new Date().toISOString()
    });

    return { success: true, message: 'Draft updated successfully.' };
  } catch (error) {
    console.error('Update Exam Draft Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * 📊 Get all exams for a specific tutor
 */
const getTutorExamsFromDB = async (tutorId) => {
  try {
    if (!tutorId) {
      console.warn('⚠️ No tutor ID provided, returning empty array');
      return [];
    }

    console.log('📊 Fetching exams for tutor:', tutorId);

    const query = db.collection('exams')
      .where('tutor_id', '==', tutorId);

    const snapshot = await query.get();
    const examsList = [];
    
    snapshot.forEach(doc => {
      examsList.push({ id: doc.id, ...doc.data() });
    });
    
    examsList.sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    console.log(`✅ Found ${examsList.length} exams for tutor: ${tutorId}`);
    return examsList;
  } catch (error) {
    console.error('Get Tutor Exams Service Error:', error);
    return [];
  }
};

/**
 * 📝 Update exam status (with access control)
 */
const updateExamStatusInDB = async (examId, status, tutorId) => {
  try {
    const examDoc = await db.collection('exams').doc(examId).get();
    
    if (!examDoc.exists) {
      throw new Error('Exam not found');
    }
    
    const examData = examDoc.data();
    
    if (tutorId && examData.tutor_id !== tutorId) {
      throw new Error('You do not have permission to update this exam');
    }
    
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

module.exports = {
  createExamInDB,
  getTutorExamsFromDB,
  getExamByIdFromDB,
  deleteExamFromDB,
  updateExamStatusInDB,
  updateExamDraftInDB,
  updateExamInDB
};