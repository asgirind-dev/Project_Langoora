const express = require("express");
const router = express.Router();

// 🔌 Controllers Import
const {
  createExam,
  getTutorExams,
  getExamById,
  deleteExam,
  getRecycleBinExams,
  restoreExam,
  permanentDeleteExam,
  updateExamStatus,
  updateExamDraft,
  updateExam,
  getAllExams,
  getAllExamsDev,
  getStudentExams,
  deleteStudentExam,
  purchaseExam,
  submitExamResult,
  uploadAsset,
  deleteAsset,
  getPendingExams, // ✅ Quality Audits
  approveExam, // ✅ Quality Audits
  rejectExam, // ✅ Quality Audits
  getMyAudits, // ✅ My Audits
} = require("../controllers/examController");

// 🛡️ Middlewares
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// ============================================================
// 🌐 1. PUBLIC ENDPOINTS (No authentication required)
// ============================================================

/**
 * 📚 Get all published exams for marketplace
 * GET /api/exams/all OR /api/exams/available
 */
router.get("/all", getAllExams);
router.get("/available", getAllExams);

/**
 * 🛠️ DEV: Get ALL exams from Firestore (FOR DEV ONLY)
 * GET /api/exams/dev/all
 */
router.get("/dev/all", getAllExamsDev);

// ============================================================
// 🎓 2. STUDENT PROTECTED ENDPOINTS (Literal Paths First!)
// ============================================================

/**
 * 🛒 Purchase an Exam
 * POST /api/exams/purchase
 */
router.post("/purchase", protect, purchaseExam);

/**
 * 🔌 Get student's purchased exams
 * GET /api/exams/my-exams OR /api/exams/student-exams OR /api/exams/purchased
 */
router.get("/my-exams", protect, getStudentExams);
router.get("/student-exams", protect, getStudentExams);
router.get("/purchased", protect, getStudentExams); // ✅ Added /purchased route

/**
 * 📊 Get recent exams for student dashboard
 * GET /api/exams/recent
 */
router.get("/recent", protect, authorizeRoles("student", "tutor", "admin"), getStudentExams);

/**
 * 🗑️ Remove purchased exam from dashboard
 * DELETE /api/exams/my-exams/:id OR /api/exams/student-exams/:id
 */
router.delete("/my-exams/:id", protect, deleteStudentExam);
router.delete("/student-exams/:id", protect, deleteStudentExam);

/**
 * 📝 Submit exam results
 * POST /api/exams/submit/:purchaseId
 */
router.post("/submit/:purchaseId", protect, submitExamResult);

// ============================================================
// 👨‍🏫 3. TUTOR / ADMIN PROTECTED ENDPOINTS
// ============================================================

/**
 * 🎵 📷 Upload asset for exam
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
 * 🗑️ Delete asset
 * POST /api/exams/delete-asset
 */
router.post(
  "/delete-asset",
  protect,
  authorizeRoles("tutor", "admin"),
  deleteAsset,
);

/**
 * 📚 Get exams created by tutor
 * GET /api/exams/tutor-exams
 */
router.get(
  "/tutor-exams",
  protect,
  authorizeRoles("tutor", "admin"),
  getTutorExams,
);

/**
 * ➕ Create new exam
 * POST /api/exams/create
 */
router.post("/create", protect, authorizeRoles("tutor", "admin"), createExam);

// ============================================================
// ♻️ 4. RECYCLE BIN (Literal paths - must come before dynamic /:examId)
// ============================================================

/**
 * ♻️ Get all soft-deleted exams for the logged-in tutor
 * GET /api/exams/recycle-bin
 */
router.get(
  "/recycle-bin",
  protect,
  authorizeRoles("tutor", "admin"),
  getRecycleBinExams,
);

// ============================================================
// ✅ 5. QUALITY AUDITS & MY AUDITS (Validator only)
// ============================================================

/**
 * 📋 Get pending exams (filtered by validator's language)
 * GET /api/exams/quality/pending
 */
router.get(
  "/quality/pending",
  protect,
  authorizeRoles("validator"),
  getPendingExams,
);

/**
 * ✅ Approve an exam
 * POST /api/exams/quality/approve/:examId
 */
router.post(
  "/quality/approve/:examId",
  protect,
  authorizeRoles("validator"),
  approveExam,
);

/**
 * ❌ Reject an exam with feedback
 * POST /api/exams/quality/reject/:examId
 */
router.post(
  "/quality/reject/:examId",
  protect,
  authorizeRoles("validator"),
  rejectExam,
);

/**
 * 📋 Get my audits (exams I've reviewed)
 * GET /api/exams/my-audits
 */
router.get("/my-audits", protect, authorizeRoles("validator"), getMyAudits);

// ============================================================
// ⚠️ 6. DYNAMIC ROUTES (/:examId) - MUST ALWAYS BE AT THE END
// ============================================================

/**
 * Get exam details by ID
 * GET /api/exams/:examId
 */
router.get(
  "/:examId",
  protect,
  authorizeRoles("tutor", "admin", "validator", "student"),
  getExamById,
);

/**
 * Delete exam
 * DELETE /api/exams/:examId
 */
router.delete(
  "/:examId",
  protect,
  authorizeRoles("tutor", "admin"),
  deleteExam,
);

/**
 * ♻️ Restore a soft-deleted exam
 * PUT /api/exams/:examId/restore
 */
router.put(
  "/:examId/restore",
  protect,
  authorizeRoles("tutor", "admin"),
  restoreExam,
);

/**
 * 🗑️ Permanently delete an exam
 * DELETE /api/exams/:examId/permanent
 */
router.delete(
  "/:examId/permanent",
  protect,
  authorizeRoles("tutor", "admin"),
  permanentDeleteExam,
);

/**
 * Update exam status
 * PUT /api/exams/:examId/status
 */
router.put(
  "/:examId/status",
  protect,
  authorizeRoles("tutor", "admin"),
  updateExamStatus,
);

/**
 * Update exam draft (auto-save)
 * PUT /api/exams/:examId/draft
 */
router.put(
  "/:examId/draft",
  protect,
  authorizeRoles("tutor", "admin"),
  updateExamDraft,
);

/**
 * Update exam details (Full Update)
 * PUT /api/exams/:examId
 */
router.put("/:examId", protect, authorizeRoles("tutor", "admin"), updateExam);

module.exports = router;