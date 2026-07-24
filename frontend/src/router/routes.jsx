import { Routes, Route, Navigate } from "react-router-dom";
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
import SystemSettings from "../pages/admin/SystemSettings"; 

// Tutor Pages
import TutorDashboard from "../pages/tutor/TutorDashboard";
import TutorExamsPage from "../pages/tutor/TutorExamsPage";
import CreateExamPage from "../pages/tutor/CreateExamPage";
import TutorEarningsPage from "../pages/tutor/TutorEarningsPage";
import TutorProfilePage from "../pages/tutor/TutorProfilePage";
import TutorAnalyticsPage from "../pages/tutor/TutorAnalyticsPage";
import TutorReviewsPage from "../pages/tutor/TutorReviewsPage";

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
import PerformancePage from "../pages/student/PerformancePage";
import StudentProfilePage from '../pages/student/StudentProfilePage';
import SettingsPage from '../pages/student/SettingsPage';
import StudyPlannerPage from '../pages/student/StudyPlannerPage';
import PaymentSuccess from '../pages/student/PaymentSuccess';

// Finance Admin Layout & Pages
import FinanceDashboard from "../pages/finance_admin/FinanceDashboard";
import SubscriptionManager from "../pages/finance_admin/SubscriptionManager";
import TutorPayoutsPage from "../pages/finance_admin/TutorPayoutsPage";
import TransactionLedger from "../pages/finance_admin/TransactionLedger";

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
          {/* 3. Student Segment Workspace */}
{/* 💡 Sidebar/Navbar තියෙන සාමාන්‍ය Dashboard Pages */}
<Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout /></ProtectedRoute>}>
  <Route index element={<StudentDashboard />} />
  <Route path="exams" element={<MyExamsPage />} />
  <Route path="planner" element={<StudyPlannerPage />} />
  <Route path="performance" element={<PerformancePage />} />
  <Route path="subscription" element={<SubscriptionPage />} />
  <Route path="marketplace" element={<MarketplacePage />} />
  <Route path="profile" element={<StudentProfilePage />} />
  <Route path="settings" element={<SettingsPage />} />
  <Route path="*" element={<Navigate to="/student" replace />} />
  <Route path="/student/exam-results/:id" element={<ExamResultsPage />} />
</Route>

{/* 💡 ඩාෂ්බෝඩ් Layout එකෙන් පිටත ස්වාධීනව වැඩ කරන Secure Success Route එක (Flicker එක සදහටම ඉවරයි!) */}
<Route
  path="/student/payment-success"
  element={
    <ProtectedRoute allowedRoles={['student']}>
      <PaymentSuccess />
    </ProtectedRoute>
  }
/>

          {/* 4. Tutor Segment Workspace */}
          <Route path="/tutor" element={<ProtectedRoute allowedRoles={['tutor']}><TutorLayout /></ProtectedRoute>}>
            <Route index element={<TutorDashboard />} />
            <Route path="exams" element={<TutorExamsPage />} />
            <Route path="create" element={<CreateExamPage />} />
            <Route path="earnings" element={<TutorEarningsPage />} />
            <Route path="analytics" element={<TutorAnalyticsPage />} />
            <Route path="reviews" element={<TutorReviewsPage />} />
            <Route path="profile" element={<TutorProfilePage />} />
            <Route path="*" element={<Navigate to="/tutor" replace />} />
          </Route>

          {/* 5. System Administration Control Center */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="exams" element={<AdminDashboard />} />
            <Route path="revenue" element={<AdminRevenuePage />} />
            <Route path="logs" element={<AuditLogsPage />} />
            <Route path="security" element={<SystemSecurity />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>

          {/* 6. Academic Moderation & Validation Desk */}
          <Route path="/validator" element={<ProtectedRoute allowedRoles={['validator']}><ValidatorLayout /></ProtectedRoute>}>
            <Route index element={<AcademicValidatorDashboard />} />
            
            <Route path="tutor-verification" element={
              <ProtectedRoute requiredPrivilege="verify_tutors">
                <TutorVerificationPage />
              </ProtectedRoute>
            } />
            
            <Route path="content-disputes" element={
              <ProtectedRoute requiredPrivilege="resolve_disputes">
                <ContentDisputePage />
              </ProtectedRoute>
            } />
            
            <Route path="quality-audits" element={
              <ProtectedRoute requiredPrivilege="audit_exams">
                <ExamQualityAuditsPage />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/validator" replace />} />
          </Route>

          {/* 7. Finance Administration Control Center */}
          <Route path="/finance-admin" element={<ProtectedRoute allowedRoles={['finance_admin', 'finance']}><FinanceAdminLayout /></ProtectedRoute>}>
            <Route index element={<FinanceDashboard />} />
            
            <Route path="subscriptions" element={
              <ProtectedRoute requiredPrivilege="manage_subscriptions">
                <SubscriptionManager />
              </ProtectedRoute>
            } />
            
            <Route path="payouts" element={
              <ProtectedRoute requiredPrivilege="approve_payouts">
                <TutorPayoutsPage />
              </ProtectedRoute>
            } />
            
            <Route path="ledger" element={
              <ProtectedRoute requiredPrivilege="view_ledger">
                <TransactionLedger />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/finance-admin" replace />} />
          </Route>

          {/* 8. Public Facing Content & Common Views */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/exam/:id/preview" element={<ExamPreviewPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

        </Routes>
      </div>
    </AuthProvider>
  );
}