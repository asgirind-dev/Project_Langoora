const express = require("express");
const router = express.Router();

// Import the dedicated validator controller functions
const {
  getPendingAudits,
  getExamQuestions,
  updateExamStatus,
} = require("../controllers/validatorExamController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// URL: GET http://localhost:5000/api/validator-exams/pending-audits
router.get(
  "/pending-audits",
  protect,
  authorizeRoles("validator", "admin"),
  getPendingAudits,
);

// URL: GET http://localhost:5000/api/validator-exams/:examId/questions
router.get(
  "/:examId/questions",
  protect,
  authorizeRoles("validator", "admin"),
  getExamQuestions,
);

// URL: PUT http://localhost:5000/api/validator-exams/:examId/status
router.put(
  "/:examId/status",
  protect,
  authorizeRoles("validator", "admin"),
  updateExamStatus,
);

module.exports = router;
