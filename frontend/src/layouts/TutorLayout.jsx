import { Outlet } from 'react-router-dom';
import { LayoutDashboard, BookOpen, PlusCircle, DollarSign, BarChart2, Star, User } from 'lucide-react';
import DashboardSidebar from '../components/layout/DashboardSidebar';

const navItems = [
  { label: 'Dashboard', path: '', icon: LayoutDashboard },
  { label: 'My Exams', path: '/exams', icon: BookOpen },
  { label: 'Create Exam', path: '/create', icon: PlusCircle },
  { label: 'Earnings', path: '/earnings', icon: DollarSign },
  { label: 'Analytics', path: '/analytics', icon: BarChart2 },
  { label: 'Reviews', path: '/reviews', icon: Star },
  { label: 'Profile', path: '/profile', icon: User },
];

export default function TutorLayout() {
  return (
    <div className="min-h-screen bg-[#060d1f] text-white flex">
      <DashboardSidebar navItems={navItems} basePath="/tutor" />
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
