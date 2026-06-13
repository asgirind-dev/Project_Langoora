import { Outlet } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, BookOpen, BarChart2, Crown, User, Settings } from 'lucide-react';
import DashboardSidebar from '../components/layout/DashboardSidebar';

const navItems = [
  { label: 'Dashboard', path: '', icon: LayoutDashboard },
  { label: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
  { label: 'My Exams', path: '/exams', icon: BookOpen },
  { label: 'Performance', path: '/performance', icon: BarChart2 },
  { label: 'Subscription', path: '/subscription', icon: Crown },
  { label: 'Profile', path: '/profile', icon: User },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function StudentLayout() {
  return (
    <div className="min-h-screen bg-[#060d1f] text-white flex">
      <DashboardSidebar navItems={navItems} basePath="/student" />
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
