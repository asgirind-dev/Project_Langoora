import { Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  BookOpen, 
  BarChart2, 
  Crown, 
  User, 
  CalendarDays 
} from 'lucide-react';

import DashboardSidebar from '../components/layout/DashboardSidebar';
import StudentNotifications from '../components/student/StudentNotifications';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '', icon: LayoutDashboard },
  { label: 'Performance', path: '/performance', icon: BarChart2 },
  { label: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
  { label: 'My Exams', path: '/exams', icon: BookOpen },
  { label: 'Study Planner', path: '/planner', icon: CalendarDays },
  { label: 'Subscription', path: '/subscription', icon: Crown },
  { label: 'Profile', path: '/profile', icon: User }
];

export default function StudentLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#060d1f] text-white flex">
      {/* 🔹 Sidebar Navigation */}
      <DashboardSidebar navItems={navItems} basePath="/student" />

      {/* 🔹 Main Content Area */}
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden flex flex-col">
        
        {/* 🔔 Top Header Bar (Updated Layout & Spacing) */}
        <header className="px-8 py-4 border-b border-slate-800/80 bg-[#060d1f]/80 backdrop-blur-md sticky top-0 z-30 flex justify-between items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Student Portal</h1>
            <p className="text-xs text-slate-400 truncate">
              Welcome back, {user?.displayName || user?.name || 'Student'}!
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* 🔔 Notification Bell Component */}
            <StudentNotifications userId={user?.uid || user?.id} />
          </div>
        </header>

        {/* 📄 Dynamic Pages Render Area */}
        <div className="p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}