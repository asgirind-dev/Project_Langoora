import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ✅ Admin roles list – used for redirects and role checks
const ADMIN_ROLES = ['admin', 'super_admin'];

export default function ProtectedRoute({ children, allowedRoles, requiredPrivilege }) {
  const { user, role: contextRole, loading } = useAuth();
  const location = useLocation();

  // Resolve active session parameters from both runtime context and persistent local storage
  const token = localStorage.getItem('token');
  const sessionRole = localStorage.getItem('userRole') || contextRole;
  const sessionStatus = user?.status || (token ? 'active' : null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060d1f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Enforce global authentication guard bounds
  if (!user && !token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Intercept and route pending tutor nodes to the onboarding review track
  if (sessionRole === 'tutor' && sessionStatus === 'pending') {
    if (!location.pathname.includes('/auth/under-review')) {
      return <Navigate to="/auth/under-review" replace />;
    }
  }

  // Prevent activated user profiles from getting trapped inside the review frame
  if (sessionStatus === 'active' && location.pathname.includes('/auth/under-review')) {
    if (ADMIN_ROLES.includes(sessionRole)) return <Navigate to="/admin" replace />;
    if (sessionRole === 'validator') return <Navigate to="/validator" replace />;
    if (sessionRole === 'finance') return <Navigate to="/finance-admin" replace />;
    return <Navigate to={sessionRole === 'tutor' ? '/tutor' : '/student'} replace />;
  }

  // Enforce strict Role‑Based Access Control (RBAC) perimeter boundaries
  if (allowedRoles && !allowedRoles.includes(sessionRole)) {
    if (ADMIN_ROLES.includes(sessionRole)) return <Navigate to="/admin" replace />;
    if (sessionRole === 'validator') return <Navigate to="/validator" replace />;
    if (sessionRole === 'finance') return <Navigate to="/finance-admin" replace />;
    return <Navigate to={sessionRole === 'tutor' ? '/tutor' : '/student'} replace />;
  }

  // Enforce fine‑grained granular capability privilege checks
  if (requiredPrivilege && !user?.privileges?.includes(requiredPrivilege)) {
    console.warn(`Unauthorized framework entry attempt blocked for privilege: ${requiredPrivilege}`);

    if (sessionRole === 'validator') return <Navigate to="/validator" replace />;
    if (sessionRole === 'finance') return <Navigate to="/finance-admin" replace />;
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}