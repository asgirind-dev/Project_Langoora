const express = require("express");
const router = express.Router();

const examController = require("../controllers/examController");

const {
  createExam,
  getAllExams,
  getStudentExams,
  deleteStudentExam,
  uploadAsset,
  deleteAsset,
} = require("../controllers/examController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// ============================================================
//  TUTOR / ADMIN ENDPOINTS (protected)
// ============================================================

/**
 * 🔒 Upload exam asset (image/audio)
 * POST /api/exams/upload-asset
 */
router.post(
  "/upload-asset",
  protect,
  authorizeRoles("tutor", "admin"),
  upload.single("file"),
  uploadAsset,
);

/**
 * 🔒 Delete exam asset
 * POST /api/exams/delete-asset
 */
router.post(
  "/delete-asset",
  protect,
  authorizeRoles("tutor", "admin"),
  deleteAsset,
);

/**
 * 🔒 Create a new exam with questions
 * POST /api/exams/create
 */
router.post("/create", protect, authorizeRoles("tutor", "admin"), createExam);

// ============================================================
//  STUDENT DASHBOARD ENDPOINT
// ============================================================

/**
 * 📚 Get all available exams for students to browse
 * GET /api/exams/available
 */
router.get("/available", getAllExams);

// ============================================================
//  STUDENT EXAM ATTEMPTS MANAGEMENT
// ============================================================

/**
 * 📊 Get all student exam attempts
 * GET /api/exams/student-exams
 */
router.get("/student-exams", getStudentExams);

/**
 * 🗑️ Delete a student exam attempt
 * DELETE /api/exams/student-exams/:id
 */
router.delete("/student-exams/:id", deleteStudentExam);

// ============================================================
//  📊 GET EXAM BY ID (MUST COME BEFORE /quality ROUTES)
// ============================================================

/**
 * 📊 Get a single exam by ID
 * GET /api/exams/:examId
 */
router.get("/:examId", protect, examController.getExamById);

// ============================================================
//  QUALITY AUDITS (Validator only)
// ============================================================

/**
 * 📋 Get pending exams (filtered by validator's language)
 * GET /api/exams/quality/pending
 */
router.get(
  "/quality/pending",
  protect,
  authorizeRoles("validator"),
  examController.getPendingExams,
);

/**
 * ✅ Approve an exam
 * POST /api/exams/quality/approve/:examId
 */
router.post(
  "/quality/approve/:examId",
  protect,
  authorizeRoles("validator"),
  examController.approveExam,
);

/**
 * ❌ Reject an exam with feedback
 * POST /api/exams/quality/reject/:examId
 */
router.post(
  "/quality/reject/:examId",
  protect,
  authorizeRoles("validator"),
  examController.rejectExam,
);

module.exports = router;
