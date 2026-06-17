import { Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, UserCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import DashboardSidebar from '../components/layout/DashboardSidebar'; 
import { useAuth } from '../context/AuthContext'; 


const validatorNavItems = [
  { 
    label: 'Overview', 
    path: '', 
    icon: LayoutDashboard 

  },
  { 
    label: 'Tutor Verifications', 
    path: 'tutor-verification', 
    icon: UserCheck, 
    requiredPrivilege: 'verify_tutors' 
  },
  { 
    label: 'Quality Audits', 
    path: 'quality-audits', 
    icon: ShieldAlert, 
    requiredPrivilege: 'audit_exams' 
  },
  { 
    label: 'Content Disputes', 
    path: 'content-disputes', 
    icon: AlertTriangle, 
    requiredPrivilege: 'manage_disputes' 
  },
];

export default function AcademicValidatorLayout() {
  const { user, role } = useAuth(); 


  if (role !== 'validator') {
    return <Navigate to="/auth/login" replace />;
  }


  const filteredNavItems = validatorNavItems.filter(item => {
    if (!item.requiredPrivilege) return true;
    

    return user?.privileges?.includes(item.requiredPrivilege);
  });

  return (
    <div className="min-h-screen bg-[#060d1f] text-white flex">
      <DashboardSidebar navItems={filteredNavItems} basePath="/validator" />
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}