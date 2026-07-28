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
    label: 'Exam Credit Valuation', 
    path: 'exam-credits', 
    icon: Coins, 
    requiredPrivilege: 'manage_credits' 
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
    icon: BookOpen 
  },
];

export default function FinanceAdminLayout() {
  const { user, role } = useAuth();

  const userRole = user?.roleId || user?.role || role || '';
  const isFinanceAdmin = userRole === 'finance' || userRole === 'finance_admin';

  console.log(`🔍 FinanceAdminLayout: User role check - roleId: ${user?.roleId}, role: ${user?.role}, final: ${userRole}, isFinanceAdmin: ${isFinanceAdmin}`);

  if (!isFinanceAdmin) {
    console.log(`❌ Access denied: User is not Finance Admin (role: ${userRole})`);
    return <Navigate to="/auth/login" replace />;
  }

  console.log(`✅ Finance Admin access granted: ${user?.email}`);

  const filteredNavItems = financeNavItems.filter(item => {
    if (!item.requiredPrivilege) return true;
    const hasPrivilege = user?.privileges?.includes(item.requiredPrivilege);
    console.log(`🔍 Checking privilege '${item.requiredPrivilege}' for ${item.label}: ${hasPrivilege}`);
    return hasPrivilege;
  });

  console.log(`📋 Filtered nav items: ${filteredNavItems.length} items`);

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