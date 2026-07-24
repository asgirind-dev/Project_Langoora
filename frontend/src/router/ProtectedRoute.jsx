import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ✅ Admin roles list – used for redirects and role checks
const ADMIN_ROLES = ['admin', 'super_admin'];

export default function ProtectedRoute({ children, allowedRoles, requiredPrivilege }) {
  const { user, role: contextRole, loading } = useAuth();
  const location = useLocation();

  // 1️⃣ Loading Spinner Check
  if (loading) {
    return (
      <div className="min-h-screen bg-[#060b13] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 2️⃣ Resolve Active Session Parameters
  const token = localStorage.getItem('token');
  const sessionRole = user?.role || localStorage.getItem('userRole') || contextRole;
  const sessionStatus = user?.status || (token ? 'active' : null);

  // 3️⃣ Enforce Unauthenticated Access Boundary
  if (!user && !token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 4️⃣ Intercept Pending Tutor Nodes -> Onboarding Review Track
  if (sessionRole === 'tutor' && sessionStatus === 'pending') {
    if (!location.pathname.includes('/auth/under-review')) {
      return <Navigate to="/auth/under-review" replace />;
    }
  }

  // 5️⃣ Prevent Activated Users From Getting Trapped In The Review Screen
  if (sessionStatus === 'active' && location.pathname.includes('/auth/under-review')) {
    if (ADMIN_ROLES.includes(sessionRole)) return <Navigate to="/admin" replace />;
    if (sessionRole === 'validator') return <Navigate to="/validator" replace />;
    if (sessionRole === 'finance') return <Navigate to="/finance-admin" replace />;
    return <Navigate to={sessionRole === 'tutor' ? '/tutor' : '/student'} replace />;
  }

  // 6️⃣ Enforce Strict Role-Based Access Control (RBAC) Boundaries
  if (allowedRoles && !allowedRoles.includes(sessionRole)) {
    if (ADMIN_ROLES.includes(sessionRole)) return <Navigate to="/admin" replace />;
    if (sessionRole === 'validator') return <Navigate to="/validator" replace />;
    if (sessionRole === 'finance') return <Navigate to="/finance-admin" replace />;
    return <Navigate to={sessionRole === 'tutor' ? '/tutor' : '/student'} replace />;
  }

  // 7️⃣ Enforce Fine-Grained Granular Capability Privilege Checks
  if (requiredPrivilege && !user?.privileges?.includes(requiredPrivilege)) {
    console.warn(`Unauthorized framework entry attempt blocked for privilege: ${requiredPrivilege}`);

    if (sessionRole === 'validator') return <Navigate to="/validator" replace />;
    if (sessionRole === 'finance') return <Navigate to="/finance-admin" replace />;
    return <Navigate to="/" replace />;
  }

  // 8️⃣ Render Authenticated Component or Nested Routes
  return children ? children : <Outlet />;
}