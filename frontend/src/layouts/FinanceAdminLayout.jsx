import { Outlet } from 'react-router-dom';
import { Activity, CreditCard, DollarSign, BookOpen, PieChart } from 'lucide-react';
import DashboardSidebar from '../components/layout/DashboardSidebar';

const financeNavItems = [
  { label: 'Finance Overview', path: '', icon: PieChart },
  { label: 'Subscription Manager', path: 'subscriptions', icon: CreditCard },
  { label: 'Tutor Payouts', path: 'payouts', icon: DollarSign },
  { label: 'Transaction Ledger', path: 'ledger', icon: BookOpen },
];

// මේ "export default" කියන කෑල්ල අනිවාර්යයෙන්ම මේ විදිහටම තියෙන්න ඕනේ
export default function FinanceAdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060d1f] text-slate-900 dark:text-white flex transition-colors duration-200">
      <DashboardSidebar navItems={financeNavItems} basePath="/finance-admin" />
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}