import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext'; 
import ProtectedRoute from './ProtectedRoute';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import AuthLayout from '../layouts/AuthLayout';
import StudentLayout from '../layouts/StudentLayout';
import TutorLayout from '../layouts/TutorLayout';
import AdminLayout from '../layouts/AdminLayout';
import ValidatorLayout from '../layouts/AcademicValidatorLayout';

// Public Pages
import LandingPage from '../pages/public/LandingPage';
import PricingPage from '../pages/public/PricingPage';
import AboutPage from '../pages/public/AboutPage';
import ServicesPage from '../pages/public/ServicesPage';
import ContactPage from '../pages/public/ContactPage';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import UnderReviewPage from '../pages/auth/UnderReviewPage';
import CompleteProfile from '../pages/auth/CompleteProfile';


// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import UserManagementPage from '../pages/admin/UserManagementPage';
import AdminRevenuePage from '../pages/admin/AdminRevenuePage';
import AuditLogsPage from '../pages/admin/AuditLogsPage';
import SystemSecurity from '../pages/admin/SystemSecurity';

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
// 5. PUBLIC & END USER ROUTES SUB-MODULE
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


            {/* 5. System Administration Control Center */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminRoutes />
                </ProtectedRoute>
              }
            />

            {/* 7. Public Facing Content & Common Views (MUST BE AT THE BOTTOM) */}
            <Route path="/*" element={<PublicUserRoutes />} />
          </Routes>
        </div>
      </AuthProvider>
  );
}