const express = require("express");
const router = express.Router();

// Destructure all the functions out of the consolidated controller
const {
  createExam,
  getStudentExams,
  deleteStudentExam,
  uploadAsset,
  getPendingAudits, // 👈 Added
  getExamQuestions, // 👈 Added
  updateExamStatus, // 👈 Added
} = require("../controllers/examController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// 🔒 Asset Management
router.post(
  "/upload-asset",
  upload.single("file"),
  protect,
  authorizeRoles("tutor", "admin"),
  uploadAsset,
);

// 📊 Student Attempts Paths
router.get("/student-exams", getStudentExams);
router.delete("/student-exams/:id", deleteStudentExam);

// 🚀 Core Tutor Exam Architecture Creation
router.post("/create", protect, authorizeRoles("tutor", "admin"), createExam);

// 🔍 --- QUALITY AUDIT ROUTES (Academic Validator Actions) ---

// URL: GET http://localhost:5000/api/exams/pending-audits
router.get("/pending-audits", getPendingAudits);

// URL: GET http://localhost:5000/api/exams/:examId/questions
router.get("/:examId/questions", getExamQuestions);

// URL: PUT http://localhost:5000/api/exams/:examId/status
router.put("/:examId/status", updateExamStatus);

module.exports = router;
