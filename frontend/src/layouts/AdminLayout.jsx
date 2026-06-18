import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, DollarSign, Activity, Shield, Settings } from 'lucide-react'; 
import DashboardSidebar from '../components/layout/DashboardSidebar';

// Relative paths configured for seamless nested routing under '/admin'
const navItems = [
  { label: 'Dashboard', path: '', icon: LayoutDashboard },
  { label: 'Users', path: 'users', icon: Users },
  { label: 'Revenue', path: 'revenue', icon: DollarSign },
  { label: 'Audit Logs', path: 'logs', icon: Activity },
  { label: 'System Settings', path: 'settings', icon: Settings }, 
  { label: 'Security', path: 'security', icon: Shield }
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060d1f] text-slate-900 dark:text-white flex transition-colors duration-200">
      
      {/* Dynamic sidebar passing the base and inner navigation items */}
      <DashboardSidebar navItems={navItems} basePath="/admin" />
      
      {/* Main content viewport containing layouts offset by sidebar width (ml-64) */}
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}