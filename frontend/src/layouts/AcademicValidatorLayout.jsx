// src/layouts/AcademicValidatorLayout.jsx

import { Outlet } from 'react-router-dom';
import { LayoutDashboard, UserCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import DashboardSidebar from '../components/layout/DashboardSidebar'; 

// Paths updated to match App.jsx relative child sub-routes exactly
const navItems = [
  { label: 'Overview', path: '', icon: LayoutDashboard },
  { label: 'Tutor Verifications', path: '/tutor-verification', icon: UserCheck }, // Fixed path
  { label: 'Quality Audits', path: '/quality-audits', icon: ShieldAlert },       // Fixed path
  { label: 'Content Disputes', path: '/content-disputes', icon: AlertTriangle }, // Fixed path
];

export default function AcademicValidatorLayout() {
  return (
    <div className="min-h-screen bg-[#060d1f] text-white flex">
      {/* Sidebar builds absolute paths by combining basePath + navItem.path */}
      <DashboardSidebar navItems={navItems} basePath="/validator" />
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}