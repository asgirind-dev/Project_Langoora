// backend/controllers/examController.js
const { db } = require("../config/firebase");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const examServices = require("../services/examServices");

// ✅ ADD: Audit Log Service
const auditLogService = require('../services/auditLogService');

// ✅ Helper for non-blocking audit logging
const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

// =========================================================================
// Cloudinary Configuration (using environment variables)
// =========================================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =========================================================================
// 1. Create Exam - WITH AUDIT LOG
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
      thumbnail,
    } = req.body;

    if (!title || !category_id || !duration_minutes) {
      return res.status(400).json({
        success: false,
        message: "Core metadata parameters are missing.",
      });
    }

    const tutorId = req.user?.id || req.user?.uid || "mock_tutor_id";
    const tutorName = req.user?.name || req.user?.displayName || "Expert Tutor";

    const examData = {
      title,
      category_id,
      level_id: level_id || "",
      duration_minutes: Number(duration_minutes),
      description: description || "",
      status: status || "draft",
      sections: sections || [],
      questions: questions || [],
      thumbnail: thumbnail || null,
      tutor_id: tutorId,
      tutor_name: tutorName,
    };

    const result = await examServices.createExamInDB(examData);

    if (result.success) {
      // ✅ CONTENT MODERATION AUDIT LOG - CREATED
      logAudit(auditLogService.logContentModeration, {
        userId: tutorId,
        userEmail: req.user?.email || 'unknown',
        actorId: tutorId,
        actorEmail: req.user?.email || 'unknown',
        action: 'created',
        entityType: 'exam',
        entityId: result.examId,
        entityName: title,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      return res.status(201).json({
        success: true,
        message: "Exam structure deployed successfully!",
        examId: result.examId,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Exam creation did not complete successfully.",
    });
  } catch (error) {
    console.error("Exam Creation Core Runtime Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server failed to execute blueprint commit.",
      error: error.message,
    });
  }
};

// =========================================================================
// 2. Get Purchased Exams for Logged-In Student (NO AUDIT - READ ONLY)
// =========================================================================
const getStudentExams = async (req, res) => {
  try {
    const studentId = req.user?.uid || req.user?.id;

    console.log("=== DEBUG START ===");
    console.log("1. Logged-in Student ID from Token:", studentId);

    if (!studentId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: No student ID found" });
    }

    const snapshot = await db
      .collection("purchased_exams")
      .where("student_id", "==", studentId)
      .get();

    console.log("2. Total Purchased Exams Found in DB:", snapshot.size);

    if (snapshot.empty) {
      console.log("⚠️ No purchases found for this student ID.");
      console.log("=== DEBUG END ===");
      return res.status(200).json({ success: true, exams: [] });
    }

    const myExams = (
      await Promise.all(
        snapshot.docs.map(async (doc) => {
          const purchaseData = doc.data();
          const examId = purchaseData.exam_id;

          if (!examId) return null;

          try {
            const examDoc = await db.collection("exams").doc(examId).get();

            if (examDoc.exists) {
              const examData = examDoc.data();

              const tutorName =
                examData.tutor_name ||
                examData.tutorName ||
                examData.tutor?.name ||
                "Expert Tutor";

              const questionsCount = Array.isArray(examData.questions)
                ? examData.questions.length
                : examData.total_questions || examData.questions_count || 0;

              const duration =
                examData.duration_minutes ||
                examData.duration ||
                examData.time_limit ||
                "N/A";

              return {
                id: doc.id,
                exam_id: examId,
                title:
                  examData.title ||
                  examData.name ||
                  `Exam Pack (${examData.level_id || "JLPT"})`,
                description: examData.description || "",
                tutor_id: examData.tutor_id || examData.tutorId || null,
                tutor_name: tutorName,
                tutor: tutorName,
                duration_minutes: duration,
                duration: duration,
                total_questions: questionsCount,
                questions: questionsCount,
                category: examData.category_id || examData.category || "",
                level: examData.level_id || examData.level || "",
                thumbnail:
                  examData.thumbnail ||
                  "https://images.pexels.com/photos/11075249/pexels-photo-11075249.jpeg?w=400",
                status: purchaseData.status || "active",
                lastScore:
                  purchaseData.lastScore !== undefined
                    ? purchaseData.lastScore
                    : null,
                attempts_count:
                  purchaseData.attempts || purchaseData.attempts_count || 0,
                attempts: purchaseData.attempts || 0,
              };
            } else {
              console.log(
                `❌ Error: Exam ID "${examId}" not found in 'exams' collection! Skipping orphaned record.`,
              );
              return null;
            }
          } catch (innerError) {
            console.error(
              `Error fetching individual exam ID ${examId}:`,
              innerError,
            );
            return null;
          }
        }),
      )
    ).filter(Boolean);

    console.log("3. Final Exams Array mapped for Frontend:", myExams.length);
    console.log("=== DEBUG END ===");

    return res.status(200).json({
      success: true,
      exams: myExams,
    });
  } catch (error) {
    console.error("Firebase Fetch Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching exams",
      error: error.message,
    });
  }
};

// =========================================================================
// 3. Delete / Remove Purchased Student Exam (NO AUDIT - Student action)
// =========================================================================
const deleteStudentExam = async (req, res) => {
  try {
    const examDocId = req.params.id;

    const examRef = db.collection("purchased_exams").doc(examDocId);
    const doc = await examRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Exam connection not found in database",
      });
    }

    await examRef.delete();

    return res.status(200).json({
      success: true,
      message: "Exam successfully removed from your dashboard!",
    });
  } catch (error) {
    console.error("Firebase Delete Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// =========================================================================
// 4. Purchase an Exam - WITH FINANCIAL AUDIT LOG
// =========================================================================
const purchaseExam = async (req, res) => {
  try {
    const studentId = req.user?.uid || req.user?.id;
    const {
      exam_id,
      level_id,
      category_id,
      credits: requestCredits,
    } = req.body;

    if (!studentId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user." });
    }

    const targetExamId = exam_id || level_id || req.body.id;

    if (!targetExamId) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request: Exam ID or Level ID is missing.",
      });
    }

    const existingPurchase = await db
      .collection("purchased_exams")
      .where("student_id", "==", studentId)
      .where("exam_id", "==", targetExamId)
      .get();

    if (!existingPurchase.empty) {
      return res.status(400).json({
        success: false,
        message: "You have already unlocked this exam!",
      });
    }

    let examData = null;

    if (category_id && level_id) {
      const levelDoc = await db
        .collection("exam_categories")
        .doc(category_id.toLowerCase())
        .collection("levels")
        .doc(level_id.toLowerCase())
        .get();

      if (levelDoc.exists) {
        examData = levelDoc.data();
      }
    }

    if (!examData && targetExamId) {
      const examDoc = await db.collection("exams").doc(targetExamId).get();
      if (examDoc.exists) {
        examData = examDoc.data();
      }
    }

    let requiredCredits = 0;
    if (requestCredits !== undefined && Number(requestCredits) > 0) {
      requiredCredits = Number(requestCredits);
    } else if (examData) {
      requiredCredits = Number(
        examData.credits || examData.price || examData.credit_cost || 0,
      );
    }

    const userRef = db.collection("users").doc(studentId);
    const transactionId = `TRX-${Date.now()}`;

    await db.runTransaction(async (transaction) => {
      const freshUserDoc = await transaction.get(userRef);
      if (!freshUserDoc.exists) {
        throw new Error("User document does not exist!");
      }

      const freshUserData = freshUserDoc.data();

      const currentCredits = Number(
        freshUserData.credits !== undefined
          ? freshUserData.credits
          : freshUserData.wallet_balance !== undefined
            ? freshUserData.wallet_balance
            : freshUserData.walletBalance || 0,
      );

      if (currentCredits < requiredCredits) {
        throw new Error(
          `Insufficient credits! Required: ${requiredCredits}, Available: ${currentCredits}`,
        );
      }

      const newBalance = currentCredits - requiredCredits;

      const updateData = { updatedAt: new Date().toISOString() };
      if (freshUserData.credits !== undefined) updateData.credits = newBalance;
      if (freshUserData.wallet_balance !== undefined)
        updateData.wallet_balance = newBalance;
      if (freshUserData.walletBalance !== undefined)
        updateData.walletBalance = newBalance;

      if (
        freshUserData.credits === undefined &&
        freshUserData.wallet_balance === undefined
      ) {
        updateData.credits = newBalance;
        updateData.wallet_balance = newBalance;
      }

      transaction.update(userRef, updateData);

      const purchaseRef = db.collection("purchased_exams").doc();
      transaction.set(purchaseRef, {
        student_id: studentId,
        exam_id: targetExamId,
        purchasedAt: new Date().toISOString(),
        status: "active",
        credits_deducted: requiredCredits,
        tutor_id: examData?.tutor_id || null,
        tutor_name: examData?.tutor_name || 'Expert Tutor'
      });

      const transactionRef = db.collection("transactions").doc(transactionId);
      transaction.set(transactionRef, {
        order_id: transactionId,
        student_id: studentId,
        plan_name: `Exam Purchase: ${examData?.title || examData?.level_name || targetExamId}`,
        credits: requiredCredits,
        amount: requiredCredits,
        payment_method: "Wallet Credits",
        status: "SUCCESS",
        type: "EXAM_PURCHASE",
        createdAt: new Date().toISOString(),
      });
    });

    // ✅ FINANCIAL AUDIT LOG - SUCCESSFUL PURCHASE
    logAudit(auditLogService.logFinancial, {
      userId: studentId,
      userEmail: req.user?.email || 'unknown',
      actorId: studentId,
      actorEmail: req.user?.email || 'unknown',
      action: 'purchase',
      entityType: 'exam',
      entityId: targetExamId,
      credits: requiredCredits,
      status: 'completed',
      paymentMethod: 'Wallet Credits',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json({
      success: true,
      message: "Exam unlocked successfully! 🎉",
      transactionId: transactionId,
    });
  } catch (error) {
    console.error("Purchase Exam Error:", error);

    // ✅ FINANCIAL AUDIT LOG - FAILED PURCHASE
    logAudit(auditLogService.logFinancial, {
      userId: req.user?.uid || req.user?.id || 'unknown',
      userEmail: req.user?.email || 'unknown',
      action: 'purchase',
      entityType: 'exam',
      entityId: req.body.exam_id || req.body.level_id || 'unknown',
      status: 'failed',
      error: error.message,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error during purchase.",
      error: error.message,
    });
  }
};

// =========================================================================
// 5. Get All Published Exams (NO AUDIT - READ ONLY)
// =========================================================================
const getAllExams = async (req, res) => {
  try {
    const snapshot = await db
      .collection("exams")
      .where("status", "in", ["active", "published"])
      .get();

    const categoriesSnapshot = await db.collection('exam_categories').get();
    const levelCreditsMap = {};

    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryId = categoryDoc.id;
      
      const levelsSnapshot = await db
        .collection('exam_categories')
        .doc(categoryId)
        .collection('levels')
        .get();

      levelsSnapshot.forEach((levelDoc) => {
        const levelData = levelDoc.data();
        const levelId = levelDoc.id;
        
        const creditValue = Number(levelData.credits ?? levelData.price ?? levelData.credit_cost ?? 0);
        
        levelCreditsMap[`${categoryId}_${levelId}`] = creditValue;
        levelCreditsMap[levelId] = creditValue;
      });
    }

    const examsList = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const catId = data.category_id || data.category || '';
      const levelId = data.level_id || data.level || '';

      const matchedCredits = 
        levelCreditsMap[`${catId}_${levelId}`] ?? 
        levelCreditsMap[levelId] ?? 
        Number(data.credits ?? 0);

      examsList.push({
        id: doc.id,
        title: data.title || "Untitled Exam",
        category: data.category_id || data.category || "JLPT",
        level: data.level_id || data.level || "N/A",
        tutor: data.tutor_name || "Expert Tutor",
        tutorAvatar:
          data.tutor_avatar ||
          "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?w=40",
        duration: data.duration_minutes
          ? `${data.duration_minutes} min`
          : data.time
            ? `${data.time} min`
            : "N/A",
        questions: Array.isArray(data.questions)
          ? data.questions.length
          : data.total_questions || 0,
        credits: data.credits || 0,
        rating: data.rating || 5.0,
        reviews: data.reviews || 0,
        difficulty: data.difficulty || "Intermediate",
        thumbnail:
          data.thumbnail ||
          "https://images.pexels.com/photos/11075249/pexels-photo-11075249.jpeg?w=400",
        tag: data.tag || "",
      });
    });

    return res.status(200).json({ success: true, exams: examsList });
  } catch (error) {
    console.error("Fetch All Exams Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// =========================================================================
// 5.5 Get ALL exams (Development only - NO AUTH) (NO AUDIT)
// =========================================================================
const getAllExamsDev = async (req, res) => {
  try {
    console.log("🛠️ DEV: Fetching ALL exams from Firestore (NO AUTH)");
    const snapshot = await db.collection("exams").get();
    const examsList = [];

    snapshot.forEach((doc) => {
      examsList.push({ id: doc.id, ...doc.data() });
    });
    console.log(`✅ DEV: Found ${examsList.length} total exams`);
    return res.status(200).json({
      success: true,
      data: examsList,
      count: examsList.length,
    });
  } catch (error) {
    console.error("Get all exams (dev) error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching exams",
      error: error.message,
    });
  }
};

// =========================================================================
// 6. Submit Exam and Update Purchase Document (NO AUDIT - Student action)
// =========================================================================
const submitExamResult = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { answers } = req.body;
    const studentId = req.user?.uid || req.user?.id;

    if (!purchaseId || !answers) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required data." });
    }

    const purchaseRef = db.collection("purchased_exams").doc(purchaseId);
    const purchaseDoc = await purchaseRef.get();

    if (!purchaseDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Purchased record not found." });
    }

    const purchaseData = purchaseDoc.data();

    if (purchaseData.student_id !== studentId) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized action." });
    }

    const examRef = db.collection("exams").doc(purchaseData.exam_id);
    const examDoc = await examRef.get();

    if (!examDoc.exists) {
      return res.status(404).json({
        success: false,
        message:
          "The original exam paper has been removed by the tutor and can no longer be evaluated.",
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

      const isCorrect =
        studentAnswer !== undefined &&
        Number(studentAnswer) === Number(correctAnswer);
      if (isCorrect) {
        correctCount++;
      }

      evaluationDetails.push({
        questionId: q.id,
        selectedOption: studentAnswer !== undefined ? studentAnswer : null,
        correctOption: correctAnswer,
        isCorrect: isCorrect,
      });
    });

    const scorePercentage =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

    await purchaseRef.update({
      status: "completed",
      lastScore: scorePercentage,
      correctAnswersCount: correctCount,
      totalQuestionsCount: totalQuestions,
      attempts: (purchaseData.attempts || 0) + 1,
      completedAt: new Date().toISOString(),
      evaluation: evaluationDetails,
    });

    return res.status(200).json({
      success: true,
      message: "Exam submitted successfully! 🎉",
      score: scorePercentage,
      correctCount,
      totalQuestions,
    });
  } catch (error) {
    console.error("Submit Exam Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// =========================================================================
// 7. Get Tutor Exams (Only logged-in tutor's exams) (NO AUDIT - READ ONLY)
// =========================================================================
const getTutorExams = async (req, res) => {
  try {
    const tutorId = req.user?.id || req.user?.uid;

    if (!tutorId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const examsList = await examServices.getTutorExamsFromDB(tutorId);

    return res.status(200).json({
      success: true,
      exams: examsList,
    });
  } catch (error) {
    console.error("Get Tutor Exams Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching exams",
      error: error.message,
    });
  }
};

// =========================================================================
// 8. Get Exam by ID (with access control) (NO AUDIT - READ ONLY)
// =========================================================================
const getExamById = async (req, res) => {
  try {
    const { examId } = req.params;
    const user = req.user;

    // Only tutors need to be restricted to their own exams.
    // Admins and validators can view any exam.
    let tutorId = null;
    if (user.role !== "validator" && user.role !== "admin") {
      tutorId = user?.id || user?.uid;
    }

    const result = await examServices.getExamByIdFromDB(examId, tutorId);

    return res.status(200).json({
      success: true,
      exam: result.exam,
    });
  } catch (error) {
    console.error("Get Exam By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching exam",
      error: error.message,
    });
  }
};

// =========================================================================
// 9. Delete Exam (soft delete with access control) - WITH AUDIT LOG
// =========================================================================
const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const tutorId = req.user?.id || req.user?.uid;

    // Get exam details before deletion
    const examDoc = await db.collection('exams').doc(examId).get();
    const examData = examDoc.exists ? examDoc.data() : null;

    const result = await examServices.softDeleteExamFromDB(examId, tutorId);

    // ✅ CONTENT MODERATION AUDIT LOG - SOFT DELETE
    logAudit(auditLogService.logContentModeration, {
      userId: tutorId,
      userEmail: req.user?.email || 'unknown',
      actorId: tutorId,
      actorEmail: req.user?.email || 'unknown',
      action: 'deleted',
      entityType: 'exam',
      entityId: examId,
      entityName: examData?.title || examId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Delete Exam Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting exam",
      error: error.message,
    });
  }
};

// =========================================================================
// Recycle Bin: Get all soft-deleted exams (NO AUDIT - READ ONLY)
// =========================================================================
const getRecycleBinExams = async (req, res) => {
  try {
    const tutorId = req.user?.id || req.user?.uid;

    if (!tutorId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const examsList = await examServices.getDeletedExamsFromDB(tutorId);

    return res.status(200).json({
      success: true,
      exams: examsList,
    });
  } catch (error) {
    console.error("Get Recycle Bin Exams Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching recycle bin exams",
      error: error.message,
    });
  }
};

// =========================================================================
// Recycle Bin: Restore a soft-deleted exam - WITH AUDIT LOG
// =========================================================================
const restoreExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const tutorId = req.user?.id || req.user?.uid;

    // Get exam details before restore
    const examDoc = await db.collection('exams').doc(examId).get();
    const examData = examDoc.exists ? examDoc.data() : null;

    const result = await examServices.restoreExamFromDB(examId, tutorId);

    // ✅ CONTENT MODERATION AUDIT LOG - RESTORED
    logAudit(auditLogService.logContentModeration, {
      userId: tutorId,
      userEmail: req.user?.email || 'unknown',
      actorId: tutorId,
      actorEmail: req.user?.email || 'unknown',
      action: 'restored',
      entityType: 'exam',
      entityId: examId,
      entityName: examData?.title || examId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Restore Exam Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error restoring exam",
      error: error.message,
    });
  }
};

// =========================================================================
// Recycle Bin: Permanently delete an exam - WITH AUDIT LOG
// =========================================================================
const permanentDeleteExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const tutorId = req.user?.id || req.user?.uid;

    // Get exam details before permanent deletion
    const examDoc = await db.collection('exams').doc(examId).get();
    const examData = examDoc.exists ? examDoc.data() : null;

    const result = await examServices.permanentlyDeleteExamFromDB(
      examId,
      tutorId,
    );

    // ✅ CONTENT MODERATION AUDIT LOG - PERMANENT DELETE
    logAudit(auditLogService.logContentModeration, {
      userId: tutorId,
      userEmail: req.user?.email || 'unknown',
      actorId: tutorId,
      actorEmail: req.user?.email || 'unknown',
      action: 'deleted',
      entityType: 'exam',
      entityId: examId,
      entityName: examData?.title || examId,
      reason: 'Permanent deletion from recycle bin',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Permanent Delete Exam Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error permanently deleting exam",
      error: error.message,
    });
  }
};

// =========================================================================
// 10. Update Exam Status - WITH AUDIT LOG
// =========================================================================
const updateExamStatus = async (req, res) => {
  try {
    const { examId } = req.params;
    const { status } = req.body;
    const tutorId = req.user?.id || req.user?.uid;

    if (!status || !["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be draft, published, or archived.",
      });
    }

    // Get exam details before status update
    const examDoc = await db.collection('exams').doc(examId).get();
    const examData = examDoc.exists ? examDoc.data() : null;
    const oldStatus = examData?.status || 'draft';

    const result = await examServices.updateExamStatusInDB(
      examId,
      status,
      tutorId,
    );

    // ✅ CONTENT MODERATION AUDIT LOG - STATUS UPDATE
    logAudit(auditLogService.logContentModeration, {
      userId: tutorId,
      userEmail: req.user?.email || 'unknown',
      actorId: tutorId,
      actorEmail: req.user?.email || 'unknown',
      action: 'updated',
      entityType: 'exam',
      entityId: examId,
      entityName: examData?.title || examId,
      changes: { status: { old: oldStatus, new: status } },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Update Exam Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating exam status",
      error: error.message,
    });
  }
};

// =========================================================================
// 11. Update Exam Draft (Auto-save) - WITH AUDIT LOG
// =========================================================================
const updateExamDraft = async (req, res) => {
  try {
    const { examId } = req.params;
    const draftData = req.body;
    const tutorId = req.user?.id || req.user?.uid;

    // Get exam details before draft update
    const examDoc = await db.collection('exams').doc(examId).get();
    const examData = examDoc.exists ? examDoc.data() : null;

    const result = await examServices.updateExamDraftInDB(
      examId,
      draftData,
      tutorId,
    );

    // ✅ CONTENT MODERATION AUDIT LOG - DRAFT UPDATE
    logAudit(auditLogService.logContentModeration, {
      userId: tutorId,
      userEmail: req.user?.email || 'unknown',
      actorId: tutorId,
      actorEmail: req.user?.email || 'unknown',
      action: 'updated',
      entityType: 'exam',
      entityId: examId,
      entityName: examData?.title || examId,
      changes: { draft: 'Auto-saved' },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Update Exam Draft Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating exam draft",
      error: error.message,
    });
  }
};

// =========================================================================
// 12. Update Existing Exam - WITH AUDIT LOG
// =========================================================================
const updateExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const examData = req.body;
    const tutorId = req.user?.id || req.user?.uid;

    // Get old exam details before update
    const oldExamDoc = await db.collection('exams').doc(examId).get();
    const oldExamData = oldExamDoc.exists ? oldExamDoc.data() : null;

    const result = await examServices.updateExamInDB(examId, examData, tutorId);

    // ✅ CONTENT MODERATION AUDIT LOG - EXAM UPDATE
    const changes = {};
    const fieldsToTrack = ['title', 'category_id', 'level_id', 'duration_minutes', 'status', 'description'];
    fieldsToTrack.forEach(field => {
      if (oldExamData && oldExamData[field] !== examData[field]) {
        changes[field] = { old: oldExamData[field], new: examData[field] };
      }
    });

    logAudit(auditLogService.logContentModeration, {
      userId: tutorId,
      userEmail: req.user?.email || 'unknown',
      actorId: tutorId,
      actorEmail: req.user?.email || 'unknown',
      action: 'updated',
      entityType: 'exam',
      entityId: examId,
      entityName: examData.title || oldExamData?.title || examId,
      changes: changes,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Update Exam Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating exam",
      error: error.message,
    });
  }
};

// =========================================================================
// 13. Upload Asset (Audio to Cloudinary | Images to Base64) (NO AUDIT)
// =========================================================================
const uploadAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file detected in payload repository.",
      });
    }

    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;
    const ext = path.extname(fileName).toLowerCase();

    const audioExtensions = [
      ".mp3",
      ".wav",
      ".mpeg",
      ".mp4",
      ".ogg",
      ".webm",
      ".flac",
      ".aac",
      ".wma",
      ".m4a",
    ];
    const audioMimeTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/webm",
      "audio/ogg",
      "audio/flac",
      "audio/aac",
      "audio/mp4",
      "audio/m4a",
      "application/octet-stream",
    ];

    const isAudio =
      audioExtensions.includes(ext) || audioMimeTypes.includes(mimeType);

    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".avif",
      ".svg",
      ".bmp",
      ".tiff",
    ];
    const imageMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/avif",
      "image/svg+xml",
      "image/bmp",
      "image/tiff",
    ];

    const isImage =
      imageExtensions.includes(ext) || imageMimeTypes.includes(mimeType);

    if (isAudio) {
      const cloudinaryStream = cloudinary.uploader.upload_stream(
        {
          folder: "langoora/audio",
          resource_type: "auto",
          format: "mp3",
          eager: [{ format: "mp3" }],
          eager_async: true,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary Audio Stream Error:", error);
            return res.status(500).json({
              success: false,
              message: "Cloudinary Audio streaming failed.",
              error: error.message,
            });
          }
          return res.status(200).json({
            success: true,
            url: result.secure_url,
            fileUrl: result.secure_url,
            type: "audio",
          });
        },
      );

      return cloudinaryStream.end(req.file.buffer);
    }

    if (isImage) {
      const base64Image = req.file.buffer.toString("base64");
      const dataUriString = `data:${mimeType};base64,${base64Image}`;

      return res.status(200).json({
        success: true,
        url: dataUriString,
        fileUrl: dataUriString,
        type: "image",
      });
    }

    return res.status(400).json({
      success: false,
      message: `Unsupported file type: ${mimeType}. Please upload image or audio files.`,
    });
  } catch (error) {
    console.error("Asset Process Runtime Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server failed to execute asset controller.",
      error: error.message,
    });
  }
};

// =========================================================================
// 14. Delete Asset from Cloudinary (NO AUDIT)
// =========================================================================
const deleteAsset = async (req, res) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: "File URL is required.",
      });
    }

    if (fileUrl.startsWith("data:image")) {
      return res.status(200).json({
        success: true,
        message: "Local image string cleared from local context.",
      });
    }

    const urlParts = fileUrl.split("/");
    const fileWithExtension = urlParts[urlParts.length - 1];
    const publicIdWithoutExt = fileWithExtension.split(".")[0];

    const isAudio = fileUrl.includes("/audio/");
    const folderPath = isAudio ? "langoora/audio" : "langoora/images";
    const publicId = `${folderPath}/${publicIdWithoutExt}`;

    const resourceType = isAudio ? "video" : "image";

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result === "ok") {
      return res.status(200).json({
        success: true,
        message: "Audio successfully deleted from Cloudinary.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Cloudinary deletion failed or asset already removed.",
    });
  } catch (error) {
    console.error("Delete Asset Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// =========================================================================
// ✅ NEW: Get pending exams for quality audits (NO AUDIT - READ ONLY)
// =========================================================================
const getPendingExams = async (req, res) => {
  try {
    const language = req.user?.languageGroup;
    if (!language) {
      return res.status(400).json({
        success: false,
        message:
          "Validator language group not found. Please update your profile.",
      });
    }

    const examsList = await examServices.getPendingExamsByLanguage(language);
    return res.status(200).json({
      success: true,
      exams: examsList,
    });
  } catch (error) {
    console.error("Get Pending Exams Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending exams.",
      error: error.message,
    });
  }
};

// =========================================================================
// ✅ NEW: Approve exam - WITH AUDIT LOG
// =========================================================================
const approveExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const validatorId = req.user?.uid;
    if (!validatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Get exam details before approval
    const examDoc = await db.collection('exams').doc(examId).get();
    const examData = examDoc.exists ? examDoc.data() : null;

    const result = await examServices.approveExam(examId, validatorId);

    // ✅ CONTENT MODERATION AUDIT LOG - APPROVED
    logAudit(auditLogService.logContentModeration, {
      userId: examData?.tutor_id || 'unknown',
      userEmail: examData?.tutor_email || 'unknown',
      actorId: validatorId,
      actorEmail: req.user?.email || 'unknown',
      action: 'approved',
      entityType: 'exam',
      entityId: examId,
      entityName: examData?.title || examId,
      feedback: 'Exam approved by validator',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Approve Exam Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to approve exam.",
    });
  }
};

// =========================================================================
// ❌ NEW: Reject exam with feedback - WITH AUDIT LOG
// =========================================================================
const rejectExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { feedback } = req.body;
    const validatorId = req.user?.uid;
    if (!validatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Get exam details before rejection
    const examDoc = await db.collection('exams').doc(examId).get();
    const examData = examDoc.exists ? examDoc.data() : null;

    const result = await examServices.rejectExam(examId, validatorId, feedback);

    // ✅ CONTENT MODERATION AUDIT LOG - REJECTED
    logAudit(auditLogService.logContentModeration, {
      userId: examData?.tutor_id || 'unknown',
      userEmail: examData?.tutor_email || 'unknown',
      actorId: validatorId,
      actorEmail: req.user?.email || 'unknown',
      action: 'rejected',
      entityType: 'exam',
      entityId: examId,
      entityName: examData?.title || examId,
      feedback: feedback || 'No specific reason provided',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Reject Exam Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reject exam.",
    });
  }
};

// =========================================================================
// 📋 NEW: Get my audits (exams validated by this validator)
// =========================================================================
const getMyAudits = async (req, res) => {
  try {
    const validatorId = req.user?.uid;
    if (!validatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const examsList = await examServices.getMyAuditsFromDB(validatorId);
    return res.status(200).json({
      success: true,
      exams: examsList,
    });
  } catch (error) {
    console.error("Get My Audits Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audits.",
      error: error.message,
    });
  }
};

// =========================================================================
// ✅ EXPORT ALL FUNCTIONS (fully merged)
// =========================================================================
module.exports = {
  createExam,
  getStudentExams,
  deleteStudentExam,
  purchaseExam,
  getAllExams,
  getAllExamsDev,
  submitExamResult,
  getTutorExams,
  getExamById,
  deleteExam,
  getRecycleBinExams,
  restoreExam,
  permanentDeleteExam,
  updateExamStatus,
  updateExamDraft,
  updateExam,
  uploadAsset,
  deleteAsset,
  getPendingExams,
  approveExam,
  rejectExam,
};
