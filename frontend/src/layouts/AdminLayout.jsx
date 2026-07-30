// frontend/src/layouts/AdminLayout.jsx
import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, DollarSign, Activity, Shield, Settings, Globe } from 'lucide-react'; 
import DashboardSidebar from '../components/layout/DashboardSidebar';

const navItems = [
  { label: 'Dashboard', path: '', icon: LayoutDashboard },
  { label: 'Users', path: 'users', icon: Users },
  { label: 'Languages', path: 'languages', icon: Globe },
  { label: 'Revenue', path: 'revenue', icon: DollarSign },
  { label: 'Audit Logs', path: 'logs', icon: Activity },
  { label: 'System Settings', path: 'settings', icon: Settings }
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060d1f] text-slate-900 dark:text-white flex transition-colors duration-200">
      
      <DashboardSidebar navItems={navItems} basePath="/admin" />
      
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden">
        <div className="px-8 pt-5 pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}