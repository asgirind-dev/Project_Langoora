// frontend/src/layouts/FinanceAdminLayout.jsx
import { Outlet, Navigate } from 'react-router-dom';
import { DollarSign, BookOpen, PieChart, Layers, Coins } from 'lucide-react';
import DashboardSidebar from '../components/layout/DashboardSidebar';
import { useAuth } from '../context/AuthContext'; 

const financeNavItems = [
  { label: 'Finance Overview', path: '', icon: PieChart },
  { label: 'Subscription Plans', path: 'subscriptions', icon: Layers, requiredPrivilege: 'manage_subscriptions' },
  { label: 'Exam Credit Valuation', path: 'exam-credits', icon: Coins, requiredPrivilege: 'manage_credits' },
  { label: 'Tutor Payouts', path: 'payouts', icon: DollarSign, requiredPrivilege: 'approve_payouts' },
  { label: 'Transaction Ledger', path: 'ledger', icon: BookOpen },
];

export default function FinanceAdminLayout() {
  const { user, role } = useAuth();

  const userRole = user?.roleId || user?.role || role || '';
  const isFinanceAdmin = userRole === 'finance' || userRole === 'finance_admin';

  if (!isFinanceAdmin) {
    return <Navigate to="/auth/login" replace />;
  }

  const filteredNavItems = financeNavItems.filter(item => {
    if (!item.requiredPrivilege) return true;
    return user?.privileges?.includes(item.requiredPrivilege);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060d1f] text-slate-900 dark:text-white flex transition-colors duration-200">
      <DashboardSidebar navItems={filteredNavItems} basePath="/finance-admin" />
      
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden">
        {/* 🎯 Reduced top padding (pt-5) to bring the content up cleanly */}
        <div className="px-8 pt-5 pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}