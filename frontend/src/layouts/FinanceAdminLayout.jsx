// frontend/src/layouts/FinanceAdminLayout.jsx
import { Outlet, Navigate } from 'react-router-dom';
import { DollarSign, BookOpen, PieChart, Layers, Coins } from 'lucide-react';
import DashboardSidebar from '../components/layout/DashboardSidebar';
import FinanceNotifications from '../components/finance/FinanceNotifications';
import { useAuth } from '../context/AuthContext'; 

const financeNavItems = [
  { 
    label: 'Finance Overview', 
    path: '', 
    icon: PieChart 
  },
  { 
    label: 'Subscription Plans', 
    path: 'subscriptions', 
    icon: Layers, 
    requiredPrivilege: 'manage_subscriptions' 
  },
  { 
    label: 'Exam Credit Rates', 
    path: 'exam-credits', 
    icon: Coins, 
    requiredPrivilege: 'manage_subscriptions'
  },
  { 
    label: 'Tutor Payouts', 
    path: 'payouts', 
    icon: DollarSign, 
    requiredPrivilege: 'approve_payouts' 
  },
  { 
    label: 'Transaction Ledger', 
    path: 'ledger', 
    icon: BookOpen, 
    requiredPrivilege: 'view_ledger' 
  },
];

export default function FinanceAdminLayout() {
  const { user, role } = useAuth();

  if (role !== 'finance' && role !== 'finance_admin') {
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
        <div className="p-8">
          {/* 🔔 Notification Bell - Top Right Corner */}
          <div className="flex justify-end mb-4">
            <FinanceNotifications />
          </div>
          
          {/* Page Content */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}