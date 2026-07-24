const { db } = require('../config/firebase');

// 🔌 1. Get Purchased Exams for Logged-In Student Only
const getStudentExams = async (req, res) => {
  try {
    const studentId = req.user.uid || req.user.id; 

    console.log("=== DEBUG START ===");
    console.log("1. Logged-in Student ID from Token:", studentId);

    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No student ID found' });
    }

    const snapshot = await db.collection('purchased_exams')
      .where('student_id', '==', studentId)
      .get();

    console.log("2. Total Purchased Exams Found in DB:", snapshot.size);

    if (snapshot.empty) {
      console.log("⚠️ No purchases found for this student ID.");
      console.log("=== DEBUG END ===");
      return res.status(200).json({ success: true, exams: [] });
    }

    const myExams = [];

    for (const doc of snapshot.docs) {
      const purchaseData = doc.data();
      const examId = purchaseData.exam_id;

      console.log(`Checking purchase doc [ID: ${doc.id}] -> Associated exam_id: ${examId}`);

      if (!examId) continue;

      // 🔥 FIXED: Loop එක ඇතුළත තනි try-catch එකක් දැම්මා එකක් හිරවුණොත් අනිත් ඒවා බේරන්න
      try {
        const examDoc = await db.collection('exams').doc(examId).get();

        console.log(`Exists in 'exams' collection? :`, examDoc.exists);

        if (examDoc.exists) {
          const examData = examDoc.data();

          myExams.push({
            id: doc.id, 
            exam_id: examId,
            title: examData.title || examData.name || `Exam Pack (${examData.level_id || 'JLPT'})`,
            tutor: examData.tutor_name || 'Alternative Tutor',
            duration: examData.duration_minutes || examData.duration || 'N/A', 
            questions: examData.questions || examData.total_questions || 0,
            thumbnail: examData.thumbnail || 'https://images.pexels.com/photos/11075249/pexels-photo-11075249.jpeg?w=400',
            status: purchaseData.status || 'not-started',
            lastScore: purchaseData.lastScore !== undefined ? purchaseData.lastScore : null,
            attempts: purchaseData.attempts || 0
          });
        } else {
          // 💡 Database එකෙන් අයින් කරපු ඒවා මෙතනදී Array එකට වැටෙන්නේ නැතුව නිකන්ම Skip වෙනවා!
          console.log(`❌ Error: Exam ID "${examId}" not found in 'exams' collection! Skipping orphaned record.`);
        }
      } catch (innerError) {
        console.error(`Error fetching individual exam ID ${examId}:`, innerError);
      }
    }

    console.log("3. Final Exams Array mapped for Frontend:", myExams.length);
    console.log("=== DEBUG END ===");

    return res.status(200).json({
      success: true,
      exams: myExams
    });

  } catch (error) {
    console.error("Firebase Fetch Error:", error);
    return res.status(500).json({ success: false, message: 'Error fetching exams', error: error.message });
  }
};

// 🗑️ 2. Delete / Remove Purchased Exam Connection
const deleteStudentExam = async (req, res) => {
  try {
    const examDocId = req.params.id; 

    const examRef = db.collection('purchased_exams').doc(examDocId);
    const doc = await examRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Exam connection not found in database' });
    }

    await examRef.delete();

    return res.status(200).json({ success: true, message: 'Exam successfully removed from your dashboard!' });
  } catch (error) {
    console.error("Firebase Delete Error:", error);
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// 🛒 3. Purchase an Exam
// examController.js හෝ purchase controller එක තුළ

// 🛒 3. Purchase an Exam (FIXED)
const purchaseExam = async (req, res) => {
  try {
    const studentId = req.user?.uid || req.user?.id; // Token එකෙන් ලැබෙන User ID එක
    const { exam_id, level_id, category_id } = req.body; // level_id, category_id එක් කරගන්න

    if (!studentId) {
      return res.status(401).json({ success: false, message: "Unauthorized user." });
    }

    // 1. Exam/Level details ලබා ගැනීම
    // 💡 Note: Category/Level structure එක අනුව document එක fetch කිරීම
    let examData = null;

    if (category_id && level_id) {
      // Structure: exam_categories -> jlpt -> levels -> jlpt_n5
      const levelDoc = await db.collection('exam_categories')
        .doc(category_id)
        .collection('levels')
        .doc(level_id)
        .get();

      if (levelDoc.exists) {
        examData = levelDoc.data();
      }
    }

    // Direct 'exams' collection එකේ ඇත්නම්:
    if (!examData) {
      const examDoc = await db.collection('exams').doc(exam_id).get();
      if (examDoc.exists) {
        examData = examDoc.data();
      }
    }

    if (!examData) {
      return res.status(404).json({ success: false, message: "Exam level details not found!" });
    }

    // 🔴 [FIX 1]: credits / credit_cost දෙකෙන් ඕනෑම එකක් Read කර ගැනීම
    const requiredCredits = Number(examData.credits !== undefined ? examData.credits : (examData.credit_cost || 0));

    // 2. User details ලබා ගැනීම
    const userRef = db.collection('users').doc(studentId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }
    const userData = userDoc.data();

    // 🔴 [FIX 2]: Firestore එකේ user field එක check කිරීම (wallet_balance, walletBalance, credits)
    const currentCredits = Number(userData.credits !== undefined ? userData.credits : (userData.walletBalance || userData.wallet_balance || 0));

    // 3. Credits ප්‍රමාණවත්දැයි පරීක්ෂා කිරීම
    if (currentCredits < requiredCredits) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient credits! Required: ${requiredCredits}, Available: ${currentCredits}` 
      });
    }

    // 4. Unique Transaction ID එකක් සාදා ගැනීම
    const transactionId = `TRX-${Date.now()}`;

    // 5. Firestore Transaction එක හරහා දත්ත Update කිරීම
    await db.runTransaction(async (transaction) => {
      // A. User ගේ Wallet Balance එකෙන් Credits අඩු කිරීම
      // 🔴 [FIX 3]: User document එකේ credits field එක update කිරීම
      transaction.update(userRef, {
        credits: currentCredits - requiredCredits,
        updatedAt: new Date().toISOString()
      });

      // B. Purchased Exam Collection එකට Add කිරීම
      const purchaseRef = db.collection('purchased_exams').doc();
      transaction.set(purchaseRef, {
        student_id: studentId,
        exam_id: exam_id || level_id,
        purchasedAt: new Date().toISOString(),
        status: 'active'
      });

      // C. TRANSACTIONS COLLECTION එකෙහි FILE (RECORD) එකක් සෑදීම
      const transactionRef = db.collection('transactions').doc(transactionId);
      transaction.set(transactionRef, {
        order_id: transactionId,
        student_id: studentId,
        plan_name: `Exam Purchase: ${examData.level_name || examData.title || 'Mock Exam'}`,
        credits: requiredCredits, // 👈 දැන් මෙතැනට හරියටම 30 සේව් වේ!
        amount: 0,
        payment_method: 'Wallet Credits',
        status: 'SUCCESS',
        type: 'EXAM_PURCHASE',
        createdAt: new Date().toISOString()
      });
    });

    return res.status(200).json({
      success: true,
      message: "Exam unlocked successfully! 🎉",
      transactionId: transactionId
    });

  } catch (error) {
    console.error("Purchase Exam Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error during purchase.",
      error: error.message 
    });
  }
};

// 🌐 4. Get All Published Exams for Marketplace
// 🌐 4. Get All Published & Active Exams for Marketplace
const getAllExams = async (req, res) => {
  try {
    // 💡 FIX: status එක 'active' හෝ 'published' කියන දෙකෙන් ඕනෑම එකක් තියෙන ඒවා fetch කරනවා
    const snapshot = await db.collection('exams')
      .where('status', 'in', ['active', 'published'])
      .get();

    const examsList = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      examsList.push({
        id: doc.id, 
        title: data.title || 'Untitled Exam',
        category: data.category_id || data.category || 'JLPT',
        level: data.level_id || data.level || 'N/A',
        tutor: data.tutor_name || 'Alternative Tutor',
        tutorAvatar: data.tutor_avatar || 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?w=40',
        // 💡 duration_minutes නැත්නම් time කියන field එකත් check කරනවා (ඔයාගේ screenshot එකේ time කියලා තියෙන නිසා)
        duration: data.duration_minutes ? `${data.duration_minutes} min` : (data.time ? `${data.time} min` : 'N/A'),
        questions: data.total_questions || 0,
        credits: data.credits || 0,
        rating: data.rating || 5.0,
        reviews: data.reviews || 0,
        difficulty: data.difficulty || 'Intermediate',
        thumbnail: data.thumbnail || 'https://images.pexels.com/photos/11075249/pexels-photo-11075249.jpeg?w=400',
        tag: data.tag || ''
      });
    });

    return res.status(200).json({ success: true, exams: examsList });

  } catch (error) {
    console.error("Fetch All Exams Error:", error);
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// 📝 5. Submit Exam and Update Purchase Document
const submitExamResult = async (req, res) => {
  try {
    const { purchaseId } = req.params; 
    const { answers } = req.body; 
    const studentId = req.user.uid || req.user.id; 

    if (!purchaseId || !answers) {
      return res.status(400).json({ success: false, message: 'Missing required data.' });
    }

    const purchaseRef = db.collection('purchased_exams').doc(purchaseId);
    const purchaseDoc = await purchaseRef.get();

    if (!purchaseDoc.exists) {
      return res.status(404).json({ success: false, message: 'Purchased record not found.' });
    }

    const purchaseData = purchaseDoc.data();

    if (purchaseData.student_id !== studentId) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    const examRef = db.collection('exams').doc(purchaseData.exam_id);
    const examDoc = await examRef.get();

    // 🔥 FIXED: මුල් පේපර් එක database එකෙන් මකලා නම්, මෙතනින් ආරක්ෂිතව රිපෝට් එකක් දෙනවා crash වෙන්න නොදී
    if (!examDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'The original exam paper has been removed by the tutor and can no longer be evaluated.' 
      });
    }

    const examData = examDoc.data();
    const questions = examData.questions || []; 

    let correctCount = 0;
    const totalQuestions = questions.length;
    const evaluationDetails = [];

    questions.forEach((q) => {
      const studentAnswer = answers[q.id]; 
      const correctAnswer = q.correct_option_index; 

      const isCorrect = studentAnswer !== undefined && Number(studentAnswer) === Number(correctAnswer);
      if (isCorrect) {
        correctCount++;
      }

      evaluationDetails.push({
        questionId: q.id,
        selectedOption: studentAnswer !== undefined ? studentAnswer : null,
        correctOption: correctAnswer,
        isCorrect: isCorrect
      });
    });

    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    await purchaseRef.update({
      status: 'completed',
      lastScore: scorePercentage,
      correctAnswersCount: correctCount,
      totalQuestionsCount: totalQuestions,
      attempts: (purchaseData.attempts || 0) + 1,
      completedAt: new Date().toISOString(),
      evaluation: evaluationDetails 
    });

    return res.status(200).json({
      success: true,
      message: 'Exam submitted successfully! 🎉',
      score: scorePercentage,
      correctCount,
      totalQuestions
    });

  } catch (error) {
    console.error("Submit Exam Error:", error);
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getStudentExams,
  deleteStudentExam,
  purchaseExam,
  getAllExams,
  submitExamResult
};