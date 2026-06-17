import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 


export default function ProtectedRoute({ children, allowedRoles, requiredPrivilege }) {
  const { user, role, loading } = useAuth(); 
  const location = useLocation();
  return children ? children : <Outlet />; //Mekath ain karanna sikurada weddi

  return children ? children : <Outlet />; //Mekath ain karanna sikurada weddi 

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060d1f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }


  if (role === 'tutor' && user?.status === 'pending') {
    if (!location.pathname.includes('/auth/under-review')) {
      return <Navigate to="/auth/under-review" replace />;
    }
  }


  if (user?.status === 'active' && location.pathname.includes('/auth/under-review')) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'validator') return <Navigate to="/validator" replace />;
    return <Navigate to={role === 'tutor' ? '/tutor' : '/student'} replace />;
  }


  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'validator') return <Navigate to="/validator" replace />;
    if (role === 'finance') return <Navigate to="/finance-admin" replace />;
    return <Navigate to={role === 'tutor' ? '/tutor' : '/student'} replace />;
  }


  if (requiredPrivilege && !user?.privileges?.includes(requiredPrivilege)) {
    console.warn(`Unauthorized access attempt to privilege: ${requiredPrivilege}`);
    
    if (role === 'validator') return <Navigate to="/validator" replace />;
    if (role === 'finance') return <Navigate to="/finance-admin" replace />;
    return <Navigate to="/" replace />; 
  }

  return children ? children : <Outlet />;
}