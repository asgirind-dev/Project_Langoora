import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

// Layouts
import PublicLayout from "../layouts/PublicLayout";
import AuthLayout from "../layouts/AuthLayout";
import StudentLayout from "../layouts/StudentLayout";
import TutorLayout from "../layouts/TutorLayout";
import AdminLayout from "../layouts/AdminLayout";
import ValidatorLayout from "../layouts/AcademicValidatorLayout";
import FinanceAdminLayout from "../layouts/FinanceAdminLayout";

// Public Pages
import LandingPage from "../pages/public/LandingPage";
import PricingPage from "../pages/public/PricingPage";
import AboutPage from "../pages/public/AboutPage";
import ServicesPage from "../pages/public/ServicesPage";
import ContactPage from "../pages/public/ContactPage";

// Auth Pages
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import UnderReviewPage from "../pages/auth/UnderReviewPage";
import CompleteProfile from "../pages/auth/CompleteProfile";

// Admin Pages
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserManagementPage from "../pages/admin/UserManagementPage";
import AdminRevenuePage from "../pages/admin/AdminRevenuePage";
import AuditLogsPage from "../pages/admin/AuditLogsPage";
import SystemSecurity from "../pages/admin/SystemSecurity";

// Tutor Pages
import TutorDashboard from "../pages/tutor/TutorDashboard";
import TutorExamsPage from "../pages/tutor/TutorExamsPage";
import CreateExamPage from "../pages/tutor/CreateExamPage";
import TutorEarningsPage from "../pages/tutor/TutorEarningsPage";
import TutorProfilePage from "../pages/tutor/TutorProfilePage";

// Academic Validator Pages
import AcademicValidatorDashboard from "../pages/validator/AcademicValidatorDashboard";
import TutorVerificationPage from "../pages/validator/TutorVerificationPage";
import ContentDisputePage from "../pages/validator/ContentDisputePage";
import ExamQualityAuditsPage from "../pages/validator/ExamQualityAuditsPage";

// Student Pages
import StudentDashboard from '../pages/student/StudentDashboard';
import MyExamsPage from '../pages/student/MyExamsPage';
import MarketplacePage from '../pages/student/MarketplacePage';
import SubscriptionPage from '../pages/student/SubscriptionPage';
import ExamResultsPage from '../pages/student/ExamResultsPage';
import ExamPreviewPage from '../pages/student/ExamPreviewPage';
import ExamTakePage from '../pages/student/ExamTakePage';
import PerformancePage from '../pages/student/PerformancePage';

// Finance Admin Layout & Pages
import FinanceDashboard from "../pages/finance_admin/FinanceDashboard";
import SubscriptionManager from "../pages/finance_admin/SubscriptionManager";
import TutorPayoutsPage from "../pages/finance_admin/TutorPayoutsPage";
import TransactionLedger from "../pages/finance_admin/TransactionLedger";

// ==========================================
// 3. ADMIN ROUTES SUB-MODULE
// ==========================================
function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="exams" element={<AdminDashboard />} />
        <Route path="revenue" element={<AdminRevenuePage />} />
        <Route path="logs" element={<AuditLogsPage />} />
        <Route path="security" element={<SystemSecurity />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}

// ==========================================
// 2. TUTOR ROUTES SUB-MODULE
// ==========================================
function TutorRoutes() {
  return (
    <Routes>
      <Route element={<TutorLayout />}>
        <Route index element={<TutorDashboard />} />
        <Route path="exams" element={<TutorExamsPage />} />
        <Route path="create" element={<CreateExamPage />} />
        <Route path="earnings" element={<TutorEarningsPage />} />
        <Route path="analytics" element={<TutorDashboard />} />
        <Route path="reviews" element={<TutorDashboard />} />
        <Route path="profile" element={<TutorProfilePage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}

// ==========================================
// 1. STUDENT ROUTES SUB-MODULE
// ==========================================
function StudentRoutes() {
  return (
    <Routes>
      <Route element={<StudentLayout />}>
        <Route index element={<StudentDashboard />} />
        <Route path="exams" element={<MyExamsPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}

// ==========================================
// 4. ACADEMIC VALIDATOR ROUTES SUB-MODULE
// ==========================================
function ValidatorRoutes() {
  return (
    <Routes>
      <Route element={<ValidatorLayout />}>
        <Route index element={<AcademicValidatorDashboard />} />
        <Route path="tutor-verification" element={<TutorVerificationPage />} />
        <Route path="content-disputes" element={<ContentDisputePage />} />
        <Route path="quality-audits" element={<ExamQualityAuditsPage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}

// ==========================================
// 5.  PUBLIC & END USER ROUTES SUB-MODULE
// ==========================================
function PublicUserRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

// ==========================================
// 6. Finance Admin ROUTES SUB-MODULE
// ==========================================
function FinanceRoutes() {
  return (
    <Routes>
      <Route element={<FinanceAdminLayout />}>
        <Route index element={<FinanceDashboard />} />
        <Route path="subscriptions" element={<SubscriptionManager />} />
        <Route path="payouts" element={<TutorPayoutsPage />} />
        <Route path="ledger" element={<TransactionLedger />} />
      </Route>
    </Routes>
  );
}

// ==========================================
// CENTRALIZED ROUTING GATEWAY ENTRY POINT
// ==========================================
export default function AppRoutes() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#060b13] text-white">
        <Routes>
          {/* 1. Authentication Dedicated Layout Branch */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route index element={<Navigate to="login" replace />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="complete-profile" element={<CompleteProfile />} />

            {/* Under Review Security Block */}
            <Route
              path="under-review"
              element={
                <ProtectedRoute>
                  <UnderReviewPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 2. Secure Core Testing Environment Track */}
          <Route
            path="/exam/:id/take"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ExamTakePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/exam/:id/results"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ExamResultsPage />
              </ProtectedRoute>
            }
          />

          {/* 3. Student Segment Workspace */}
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentRoutes />
              </ProtectedRoute>
            }
          />

          {/* 4. Tutor Segment Workspace */}
          <Route
            path="/tutor/*"
            element={
              <ProtectedRoute allowedRoles={["tutor"]}>
                <TutorRoutes />
              </ProtectedRoute>
            }
          />

          {/* 5. System Administration Control Center */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminRoutes />
              </ProtectedRoute>
            }
          />

          {/* 6. Academic Moderation & Validation Desk */}
          <Route
            path="/validator/*"
            element={
              <ProtectedRoute allowedRoles={["validator"]}>
                <ValidatorRoutes />
              </ProtectedRoute>
            }
          />

          {/* 7. Finance Administration Control Center */}
          <Route path="/finance-admin/*" element={<FinanceRoutes />} />

          {/* 8. Public Facing Content & Common Views (MUST BE AT THE VERY BOTTOM) */}
          <Route path="/*" element={<PublicUserRoutes />} />

        </Routes>
      </div>
    </AuthProvider>
  );
}
