const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Configs
require("./config/firebase");

// Routes Imports
const examRoutes = require("./routes/examRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const studyPlannerRoutes = require("./routes/studyPlannerRoutes");
const tutorProfileRoutes = require("./routes/TutorProfilePageRoutes");
const studentProfileRoutes = require("./routes/StudentProfilePageRoutes");
const tutorValidationRoutes = require("./routes/tutorValidationRoutes");
const languageRoutes = require("./routes/languageRoutes");
const systemSettingsRoutes = require("./routes/systemSettingsRoutes");
const financeRoutes = require("./routes/financeRoutes");
const validatorExamRoutes = require("./routes/validatorExamRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api/validator-exams", validatorExamRoutes);

// Routing Middleware
app.use("/api/exams", examRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subscription-management", subscriptionRoutes);
app.use("/api/tutors", tutorProfileRoutes);
app.use("/api/student", studentProfileRoutes);
app.use("/api/planner", studyPlannerRoutes);
app.use("/api/validator/tutors", tutorValidationRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/system-settings", systemSettingsRoutes);
// 🚫 Commented out to prevent the server crash
// app.use("/api/student-exams", studentExamRoutes);
app.use("/api/finance", financeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running cleanly on port ${PORT}`);
});
