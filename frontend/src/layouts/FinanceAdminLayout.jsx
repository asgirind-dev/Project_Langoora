import { Outlet } from 'react-router-dom';
import { Activity, CreditCard, DollarSign, BookOpen, PieChart } from 'lucide-react';
import DashboardSidebar from '../components/layout/DashboardSidebar';

const financeNavItems = [
  { label: 'Dashboard', path: '', icon: PieChart },
  { label: 'Subscription Plance', path: 'subscriptions', icon: CreditCard },
  { label: 'Transaction Ledger', path: 'ledger', icon: BookOpen },
    { label: 'Tutor Payouts', path: 'payouts', icon: DollarSign },
];

export default function FinanceAdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060d1f] text-slate-900 dark:text-white flex">
      <DashboardSidebar navItems={financeNavItems} basePath="/finance-admin" />
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}