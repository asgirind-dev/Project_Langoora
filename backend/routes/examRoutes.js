const express = require("express");
const router = express.Router();

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

module.exports = router;
