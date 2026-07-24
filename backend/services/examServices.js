const { db } = require('../config/firebase');

/**
 * Small helper to keep field defaults consistent across create/update paths.
 * Section-agnostic on purpose: Listening, Grammar, Vocabulary, Reading all
 * flow through the same normalization so they are written identically.
 */
const normalizeCategoryId = (categoryId) => {
  if (!categoryId) return '';
  return categoryId.toUpperCase().replace(/[\s_]/g, '-').trim();
};

/**
 * Splits the flat `questions` array (as sent by the frontend for every
 * section — Vocabulary, Grammar, Listening, Reading, etc.) into:
 *  - problems: entries with is_problem === true
 *  - subQuestionsByProblem: sub-questions grouped by their parent_problem_id
 *
 * This is intentionally the single source of truth for that split so
 * create/update never drift apart or special-case a particular section.
 */
const splitQuestionsByProblem = (questions = []) => {
  const problems = questions.filter((q) => q.is_problem === true);
  const subQuestions = questions.filter((q) => q.is_problem === false);

  const subQuestionsByProblem = {};
  subQuestions.forEach((q) => {
    const parentId = q.parent_problem_id;
    if (!parentId) return; // orphaned sub-question with no parent problem is skipped, not silently dropped into a shared bucket
    if (!subQuestionsByProblem[parentId]) {
      subQuestionsByProblem[parentId] = [];
    }
    subQuestionsByProblem[parentId].push(q);
  });

  return { problems, subQuestions, subQuestionsByProblem };
};

/**
 * Writes `problems` (and their example_question / sub_questions
 * sub-collections) under the given exam document ref, using a single
 * Firestore batch. Same logic for every section: Vocabulary, Grammar,
 * Listening, Reading, etc.
 */
const writeProblemsBatch = (examRef, problems, subQuestionsByProblem) => {
  const batch = db.batch();

  problems.forEach((problem, index) => {
    const problemId = `problem_${String(index + 1).padStart(2, '0')}`;
    const problemRef = examRef.collection('problems').doc(problemId);

    const problemSubQuestions = subQuestionsByProblem[problem.id] || [];

    const problemData = {
      problem_number: index + 1,
      section: problem.section,
      problem_title: problem.problem_title ? problem.problem_title.trim() : `Problem ${index + 1}`,
      explanation: problem.explanation || '',
      problem_image_url: problem.problem_image_url || null,
      total_sub_questions: problemSubQuestions.length,
      created_at: new Date().toISOString()
    };

    batch.set(problemRef, problemData);

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

    if (problemSubQuestions.length > 0) {
      const subQuestionsCollectionRef = problemRef.collection('sub_questions');

      problemSubQuestions.forEach((sub, subIndex) => {
        const subId = `sub_${String(subIndex + 1).padStart(2, '0')}`;
        const subRef = subQuestionsCollectionRef.doc(subId);

        const subData = {
          sub_number: subIndex + 1,
          text: sub.text ? sub.text.trim() : '',
          type: sub.type || 'mcq',
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

  return batch;
};

/**
 * Create a new exam with problems and sub-questions.
 * DB shape (unchanged, identical for every section):
 *   exams/{examId}                                  -> exam metadata
 *   exams/{examId}/problems/{problemId}              -> problem block
 *   exams/{examId}/problems/{problemId}/example_question/example
 *   exams/{examId}/problems/{problemId}/sub_questions/{subId}
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
      questions = [],
      thumbnail,
      tutor_id,
      tutor_name
    } = examData;

    const normalizedCategoryId = normalizeCategoryId(category_id);
    const validTutorId = tutor_id || 'mock_tutor_id';
    const validTutorName = tutor_name || 'Expert Tutor';

    const cleanExamId = `exam_${normalizedCategoryId || 'general'}_${level_id || 'no_level'}_${Date.now()}`;
    const examRef = db.collection('exams').doc(cleanExamId);

    const { problems, subQuestions, subQuestionsByProblem } = splitQuestionsByProblem(questions);

    const examMetadata = {
      title: (title || '').trim(),
      category_id: normalizedCategoryId,
      level_id: level_id || '',
      duration_minutes: Number(duration_minutes) || 0,
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
      const batch = writeProblemsBatch(examRef, problems, subQuestionsByProblem);
      await batch.commit();
    }

    console.log(`Exam created: ${cleanExamId} for tutor: ${validTutorId} (problems: ${problems.length}, sub-questions: ${subQuestions.length})`);

    return { success: true, examId: cleanExamId };
  } catch (error) {
    console.error('Exam Creation Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * Get all exams for a specific tutor.
 */
const getTutorExamsFromDB = async (tutorId) => {
  try {
    if (!tutorId) {
      console.warn('No tutor ID provided, returning empty array');
      return [];
    }

    const snapshot = await db.collection('exams').where('tutor_id', '==', tutorId).get();
    const examsList = [];

    snapshot.forEach((doc) => {
      examsList.push({ id: doc.id, ...doc.data() });
    });

    examsList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return examsList;
  } catch (error) {
    console.error('Get Tutor Exams Service Error:', error);
    return [];
  }
};

/**
 * Get Student Exams
 */
const getStudentExamsFromDB = async (studentId = null) => {
  try {
    let query = db.collection('student_exams');

    if (studentId) {
      query = query.where('studentId', '==', studentId);
    }

    const snapshot = await query.get();
    const examsList = [];

    snapshot.forEach((doc) => {
      examsList.push({ id: doc.id, ...doc.data() });
    });

    examsList.sort((a, b) => new Date(b.startTime || b.created_at) - new Date(a.startTime || a.created_at));

    return examsList;
  } catch (error) {
    console.error('Get Student Exams Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * Get a single exam by ID (with access control), including all problems,
 * their example_question and sub_questions sub-collections, for every
 * section (Vocabulary, Grammar, Listening, Reading, ...).
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

    const problemsSnapshot = await db.collection('exams').doc(examId).collection('problems').get();

    const problems = [];

    for (const problemDoc of problemsSnapshot.docs) {
      const problemData = problemDoc.data();
      const problemId = problemDoc.id;

      let example = null;
      try {
        const exampleDoc = await db
          .collection('exams')
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

      const subQuestionsSnapshot = await db
        .collection('exams')
        .doc(examId)
        .collection('problems')
        .doc(problemId)
        .collection('sub_questions')
        .get();

      const subQuestions = subQuestionsSnapshot.docs.map((subDoc) => ({
        id: subDoc.id,
        ...subDoc.data()
      }));

      problems.push({
        id: problemId,
        ...problemData,
        example,
        sub_questions: subQuestions
      });
    }

    // Keep a stable, predictable order for the editor UI.
    problems.sort((a, b) => (a.problem_number || 0) - (b.problem_number || 0));

    return {
      success: true,
      exam: {
        id: examId,
        ...examData,
        problems
      }
    };
  } catch (error) {
    console.error('Get Exam By ID Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * Delete an exam (with access control), including all nested
 * problems / example_question / sub_questions sub-collections.
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

    const problemsSnapshot = await db.collection('exams').doc(examId).collection('problems').get();

    const batch = db.batch();

    for (const problemDoc of problemsSnapshot.docs) {
      const problemId = problemDoc.id;

      try {
        const exampleDoc = await db
          .collection('exams')
          .doc(examId)
          .collection('problems')
          .doc(problemId)
          .collection('example_question')
          .doc('example')
          .get();

        if (exampleDoc.exists) {
          batch.delete(exampleDoc.ref);
        }
      } catch (e) {
        // no example_question sub-collection for this problem, nothing to delete
      }

      const subQuestionsSnapshot = await db
        .collection('exams')
        .doc(examId)
        .collection('problems')
        .doc(problemId)
        .collection('sub_questions')
        .get();

      subQuestionsSnapshot.forEach((subDoc) => batch.delete(subDoc.ref));

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
 * Delete Student Exam
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

/**
 * Update exam status (with access control)
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
      status,
      updated_at: new Date().toISOString()
    });

    return { success: true, message: `Exam status updated to ${status}` };
  } catch (error) {
    console.error('Update Exam Status Error:', error);
    throw new Error(error.message);
  }
};

/**
 * Update exam draft (auto-save, with access control).
 * Metadata-only write — problems/sub_questions are NOT touched here so
 * that the throttled autosave never needs to re-write nested
 * sub-collections on every cycle. Full problem/question persistence
 * happens through updateExamInDB (Save Draft / Deploy Exam).
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
      questions = [],
      thumbnail,
      status
    } = draftData;

    const normalizedCategoryId = normalizeCategoryId(category_id);
    const { problems, subQuestions } = splitQuestionsByProblem(questions);

    await db.collection('exams').doc(examId).update({
      title: (title || '').trim(),
      category_id: normalizedCategoryId,
      level_id: level_id || '',
      duration_minutes: Number(duration_minutes) || 0,
      description: description || '',
      sections: sections || [],
      thumbnail: thumbnail || null,
      status: status || 'draft',
      total_problems: problems.length,
      total_questions: subQuestions.length,
      updated_at: new Date().toISOString()
    });

    return { success: true, message: 'Draft updated successfully.' };
  } catch (error) {
    console.error('Update Exam Draft Service Error:', error);
    throw new Error(error.message);
  }
};

/**
 * Update Existing Exam (Full Update, with access control).
 * Replaces all problems/sub_questions with the payload the editor sent,
 * the same way for every section — Vocabulary, Grammar, Listening, Reading.
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
      questions = [],
      thumbnail
    } = examData;

    const normalizedCategoryId = normalizeCategoryId(category_id);

    // Delete all existing problems and sub-questions before re-inserting.
    const problemsSnapshot = await db.collection('exams').doc(examId).collection('problems').get();

    const deleteBatch = db.batch();

    for (const problemDoc of problemsSnapshot.docs) {
      const problemId = problemDoc.id;

      try {
        const exampleDoc = await db
          .collection('exams')
          .doc(examId)
          .collection('problems')
          .doc(problemId)
          .collection('example_question')
          .doc('example')
          .get();

        if (exampleDoc.exists) {
          deleteBatch.delete(exampleDoc.ref);
        }
      } catch (e) {
        // no example_question sub-collection for this problem, nothing to delete
      }

      const subQuestionsSnapshot = await db
        .collection('exams')
        .doc(examId)
        .collection('problems')
        .doc(problemId)
        .collection('sub_questions')
        .get();

      subQuestionsSnapshot.forEach((subDoc) => deleteBatch.delete(subDoc.ref));

      deleteBatch.delete(problemDoc.ref);
    }

    await deleteBatch.commit();

    const { problems, subQuestions, subQuestionsByProblem } = splitQuestionsByProblem(questions);

    await db.collection('exams').doc(examId).update({
      title: (title || '').trim(),
      category_id: normalizedCategoryId,
      level_id: level_id || '',
      duration_minutes: Number(duration_minutes) || 0,
      description: description || '',
      status: status || 'draft',
      sections: sections || [],
      thumbnail: thumbnail || null,
      total_problems: problems.length,
      total_questions: subQuestions.length,
      updated_at: new Date().toISOString()
    });

    if (problems.length > 0) {
      const examRef = db.collection('exams').doc(examId);
      const newBatch = writeProblemsBatch(examRef, problems, subQuestionsByProblem);
      await newBatch.commit();
    }

    return { success: true, message: 'Exam updated successfully.' };
  } catch (error) {
    console.error('Update Exam Service Error:', error);
    throw new Error(error.message);
  }
};

module.exports = {
  createExamInDB,
  getTutorExamsFromDB,
  getStudentExamsFromDB,
  getExamByIdFromDB,
  deleteExamFromDB,
  deleteStudentExamFromDB,
  updateExamStatusInDB,
  updateExamDraftInDB,
  updateExamInDB
};
