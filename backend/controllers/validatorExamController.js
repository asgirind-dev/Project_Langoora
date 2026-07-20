const { db } = require("../config/firebase");

/**
 * @desc    Get all exam packages pending quality audit
 * @route   GET /api/validator-exams/pending-audits
 * @access  Private (Validator/Admin)
 */
const getPendingAudits = async (req, res) => {
  try {
    const examsRef = db.collection("exams");
    const snapshot = await examsRef
      .where("status", "==", "pending_audit")
      .get();

    const pendingExams = [];
    snapshot.forEach((doc) => {
      pendingExams.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return res.status(200).json({
      success: true,
      data: pendingExams,
    });
  } catch (error) {
    console.error("Error fetching pending audits:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching evaluation queue.",
    });
  }
};

/**
 * @desc    Get all nested questions for a specific exam package structure check
 * @route   GET /api/validator-exams/:examId/questions
 * @access  Private (Validator/Admin)
 */
const getExamQuestions = async (req, res) => {
  try {
    const { examId } = req.params;

    // Fetch questions from the nested subcollection inside the exam document
    const questionsRef = db
      .collection("exams")
      .doc(examId)
      .collection("questions");
    const snapshot = await questionsRef.orderBy("createdAt", "asc").get();

    const questions = [];
    snapshot.forEach((doc) => {
      questions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error(
      `Error fetching questions for exam ${req.params.examId}:`,
      error,
    );
    return res.status(500).json({
      success: false,
      message:
        "Failed to load structural parameters from the sandbox database.",
    });
  }
};

/**
 * @desc    Update exam status (Publish to live or Reject back to draft mode)
 * @route   PUT /api/validator-exams/:examId/status
 * @access  Private (Validator/Admin)
 */
const updateExamStatus = async (req, res) => {
  try {
    const { examId } = req.params;
    const { status } = req.body;

    // Validate the target state transition parameter
    if (!["published", "draft"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status state transition parameter requested.",
      });
    }

    const examDocRef = db.collection("exams").doc(examId);
    const examDoc = await examDocRef.get();

    if (!examDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Target exam package document could not be located.",
      });
    }

    // Update document status fields
    await examDocRef.update({
      status: status,
      auditedAt: new Date(),
      auditedBy: req.user ? req.user.id : "system_validator",
    });

    return res.status(200).json({
      success: true,
      message: `Exam status successfully shifted to [${status}].`,
    });
  } catch (error) {
    console.error("Error updating audit decision status:", error);
    return res.status(500).json({
      success: false,
      message: "Database failure occurred while saving audit decision.",
    });
  }
};

module.exports = {
  getPendingAudits,
  getExamQuestions,
  updateExamStatus,
};
