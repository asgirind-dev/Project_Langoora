import { Outlet, Navigate } from 'react-router-dom';
import { CreditCard, DollarSign, BookOpen, PieChart } from 'lucide-react';
import DashboardSidebar from '../components/layout/DashboardSidebar';
import { useAuth } from '../context/AuthContext'; 

const financeNavItems = [
  { 
    label: 'Finance Overview', 
    path: '', 
    icon: PieChart 
  },
  { 
    label: 'Subscription Manager', 
    path: 'subscriptions', 
    icon: CreditCard, 
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

  // ========================================================
  // 🚧 DEVELOPMENT BYPASS (සිකුරාදා ප්‍රසන්ටේෂන් එකට කලින් මේක අන්-කමෙන්ට් කරන්න)
  // ========================================================
  // ලොග් නොවී ඉද්දී රෝල් එක චෙක් කරලා ලොගින් එකට එලවන එක දැනට නැවැත්තුවා 👇
  /*
  if (role !== 'finance' && role !== 'finance_admin') {
    return <Navigate to="/auth/login" replace />;
  }
  */

  // 💡 DEVELOPMENT BYPASS FOR SIDEBAR:
  // ලොග් නොවී ඉද්දී සිදිබාර් එකේ බටන් ටික හැංගෙන්නේ නැතිව ඔක්කොම පේන්න හැදුවා 👇
  const filteredNavItems = financeNavItems; // Mekath ain karanna sikurada weddi

  /* පරණ ෆිල්ටර් කෝඩ් එක (මේක දැනට ක්‍රියාත්මක වෙන්නේ නැහැ)
  const filteredNavItems = financeNavItems.filter(item => {
    if (!item.requiredPrivilege) return true;
    return user?.privileges?.includes(item.requiredPrivilege);
  });
  */
  // ========================================================

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060d1f] text-slate-900 dark:text-white flex transition-colors duration-200">
      <DashboardSidebar navItems={filteredNavItems} basePath="/finance-admin" />
      
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}