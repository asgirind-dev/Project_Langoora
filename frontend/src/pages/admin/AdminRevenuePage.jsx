// frontend/src/pages/admin/AdminRevenuePage.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, TrendingUp, Users, BookOpen, Calendar, Download,
  AlertCircle, CheckCircle, XCircle, Clock, Eye, FileText,
  Loader2, User, Tag, Layers, Sparkles, RefreshCw, Rocket,
  Activity, GripVertical, ArrowUp, ArrowDown, Save,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { recentTransactions } from '../../data/mockData';
import SubscriptionService from '../../services/subscriptionService';

// ✅ dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const monthlyData = [
  { month: 'Jan', revenue: 1200000, tutors: 580000, platform: 620000 },
  { month: 'Feb', revenue: 1850000, tutors: 920000, platform: 930000 },
  { month: 'Mar', revenue: 1620000, tutors: 800000, platform: 820000 },
  { month: 'Apr', revenue: 2100000, tutors: 1050000, platform: 1050000 },
  { month: 'May', revenue: 2450000, tutors: 1200000, platform: 1250000 },
  { month: 'Jun', revenue: 2980000, tutors: 1450000, platform: 1530000 },
];

// ============ SORTABLE PLAN ITEM COMPONENT ============
function SortablePlanItem({ plan, index, total, onMoveUp, onMoveDown }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-white/5 rounded-xl border transition-all duration-200 ${
        isDragging 
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <GripVertical size={20} />
        </div>

        {/* Plan Icon */}
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">{plan.icon === 'Rocket' ? '🚀' : '📦'}</span>
        </div>

        {/* Plan Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{plan.name}</span>
            {plan.popular && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                ★ Popular
              </span>
            )}
            <span className="text-[10px] text-gray-500">#{index + 1}</span>
          </div>
          <div className="text-xs text-gray-400">
            LKR {plan.price?.toLocaleString()} / month • {plan.credits} credits
          </div>
        </div>

        {/* Position Controls */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-gray-500 min-w-[24px] text-center">
            {index + 1}
          </span>
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="p-0.5 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowUp size={12} />
            </button>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === total - 1}
              className="p-0.5 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDown size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============
export default function AdminRevenuePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [period, setPeriod] = useState('6m');

  // ============ PLAN APPROVAL STATES ============
  const [pendingPlans, setPendingPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  // ✅ Show/Hide Order Management
  const [showOrderManagement, setShowOrderManagement] = useState(false);

  // ============ ORDER MANAGEMENT STATES ============
  const [approvedPlans, setApprovedPlans] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // ✅ dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ============ FETCH PENDING PLANS ============
  const fetchPendingPlans = async () => {
    setLoading(true);
    try {
      const data = await SubscriptionService.getPlansByStatus('pending');
      setPendingPlans(data || []);
    } catch (error) {
      console.error('Error fetching pending plans:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============ FETCH APPROVED PLANS FOR ORDER ============
  const fetchApprovedPlans = async () => {
    setOrderLoading(true);
    try {
      const data = await SubscriptionService.getAllPlans();
      const approved = (data || [])
        .filter(plan => plan.status === 'approved' && plan.active === true)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setApprovedPlans(approved);
    } catch (error) {
      console.error('Error fetching approved plans:', error);
    } finally {
      setOrderLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchPendingPlans();
      fetchApprovedPlans();
    }
  }, [activeTab]);

  // ============ APPROVE PLAN ============
  const handleApprove = async (planId) => {
    setProcessingId(planId);
    try {
      await SubscriptionService.approvePlan(planId, reviewNotes);
      await fetchPendingPlans();
      await fetchApprovedPlans();
      setShowModal(false);
      setReviewNotes('');
      showToast('✅ Plan approved successfully! Finance admin has been notified.', 'success');
    } catch (error) {
      showToast(`❌ Failed to approve plan: ${error.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // ============ REJECT PLAN ============
  const handleReject = async (planId) => {
    if (!reviewNotes.trim()) {
      showToast('⚠️ Please provide a reason for rejection.', 'error');
      return;
    }
    setProcessingId(planId);
    try {
      await SubscriptionService.rejectPlan(planId, reviewNotes);
      await fetchPendingPlans();
      setShowModal(false);
      setReviewNotes('');
      showToast('✅ Plan rejected. Finance admin has been notified.', 'success');
    } catch (error) {
      showToast(`❌ Failed to reject plan: ${error.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // ============ TOAST NOTIFICATION ============
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ============ OPEN REVIEW MODAL ============
  const openReviewModal = (plan) => {
    setSelectedPlan(plan);
    setReviewNotes('');
    setShowModal(true);
  };

  // ============ DRAG & DROP HANDLERS (dnd-kit) ============
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = approvedPlans.findIndex((item) => item.id === active.id);
      const newIndex = approvedPlans.findIndex((item) => item.id === over.id);

      const newPlans = arrayMove(approvedPlans, oldIndex, newIndex);
      const updatedPlans = newPlans.map((plan, index) => ({
        ...plan,
        sortOrder: index + 1
      }));
      setApprovedPlans(updatedPlans);
    }
  };

  const movePlan = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= approvedPlans.length) return;

    const newPlans = arrayMove(approvedPlans, index, newIndex);
    const updatedPlans = newPlans.map((plan, idx) => ({
      ...plan,
      sortOrder: idx + 1
    }));
    setApprovedPlans(updatedPlans);
  };

  const saveOrder = async () => {
    setSavingOrder(true);

    try {
      const updatePromises = approvedPlans.map(plan => 
        SubscriptionService.updateExistingPlan(plan.id, {
          sortOrder: plan.sortOrder
        })
      );

      await Promise.all(updatePromises);
      showToast('✅ Plan order saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving order:', error);
      showToast('❌ Failed to save plan order', 'error');
    } finally {
      setSavingOrder(false);
    }
  };

  // ============ TABS CONFIGURATION ============
  const tabs = [
    { 
      id: 'overview', 
      label: 'Revenue Analytics', 
      icon: DollarSign,
      description: 'Platform financial overview and breakdowns'
    },
    { 
      id: 'approvals', 
      label: 'Plan Approvals', 
      icon: AlertCircle,
      description: 'Review and approve subscription plans',
      badge: pendingPlans.length > 0 ? pendingPlans.length : null
    },
  ];

  // ============ RENDER OVERVIEW TAB ============
  const renderOverview = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: 'LKR 18.4M', icon: DollarSign, color: 'text-green-400' },
          { label: 'Platform Share', value: 'LKR 9.2M', icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Tutor Payouts', value: 'LKR 9.2M', icon: Users, color: 'text-cyan-400' },
          { label: 'Avg. per Exam', value: 'LKR 2,850', icon: BookOpen, color: 'text-amber-400' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="p-4 border-white/10">
              <s.icon size={18} className={`${s.color} mb-2`} />
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <GlassCard className="p-4 border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {[
              { label: '7D', value: '7d' },
              { label: '1M', value: '1m' },
              { label: '3M', value: '3m' },
              { label: '6M', value: '6m' },
              { label: '1Y', value: '1y' },
              { label: 'All', value: 'all' },
            ].map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p.value ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" />
            <span className="text-gray-500 text-xs">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6 border-white/10">
        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <Activity size={18} className="text-blue-400" /> Revenue Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
            <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} 
              formatter={v => [`LKR ${v ? v.toLocaleString() : '0'}`, '']} />
            <Bar dataKey="tutors" fill="#3b82f6" radius={[4,4,0,0]} name="Tutor Payouts" stackId="a" />
            <Bar dataKey="platform" fill="#06b6d4" radius={[4,4,0,0]} name="Platform Share" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard className="p-6 border-white/10">
        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <Activity size={18} className="text-blue-400" /> Transaction History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['ID', 'User', 'Exam', 'Amount', 'Date', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentTransactions && recentTransactions.map(t => (
                <tr key={t?.id ?? Math.random()} className="hover:bg-white/3 transition-colors">
                  <td className="py-3 pr-4 text-xs text-blue-400 font-mono">{t?.id ?? 'N/A'}</td>
                  <td className="py-3 pr-4 text-sm text-gray-300">{t?.user ?? 'Unknown'}</td>
                  <td className="py-3 pr-4 text-sm text-gray-300">{t?.exam ?? 'Unknown'}</td>
                  <td className="py-3 pr-4 text-sm font-semibold text-white">LKR {t?.amount ? t.amount.toLocaleString() : '0'}</td>
                  <td className="py-3 pr-4 text-xs text-gray-500">{t?.date ?? 'N/A'}</td>
                  <td className="py-3">
                    <Badge color={t?.status === 'completed' ? 'green' : t?.status === 'pending' ? 'yellow' : 'red'}>
                      {t?.status ?? 'pending'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );

  // ============ RENDER APPROVALS TAB ============
  const renderApprovals = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-400" />
            <h2 className="text-xl font-bold text-white">Pending Plan Approvals</h2>
            {pendingPlans.length > 0 && (
              <Badge color="amber">{pendingPlans.length} pending</Badge>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Review and approve subscription plans created by finance team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPendingPlans}
            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {/* ✅ Toggle Order Management Button */}
          <button
            onClick={() => setShowOrderManagement(!showOrderManagement)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              showOrderManagement 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
            }`}
          >
            <Layers size={14} />
            {showOrderManagement ? 'Hide Order' : 'Manage Order'}
            {showOrderManagement ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
        </div>
      </div>

      {/* ============ ORDER MANAGEMENT SECTION ============ */}
      <AnimatePresence>
        {showOrderManagement && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Plan Order Management</h3>
                {approvedPlans.length > 0 && (
                  <Badge color="blue">{approvedPlans.length} plans</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {approvedPlans.length > 0 && (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={saveOrder}
                    disabled={savingOrder || approvedPlans.length === 0}
                  >
                    <Save size={14} /> {savingOrder ? 'Saving...' : 'Save Order'}
                  </Button>
                )}
              </div>
            </div>

            {orderLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="animate-spin text-purple-400" size={32} />
                <p className="text-gray-400 mt-2 text-sm">Loading plans...</p>
              </div>
            ) : approvedPlans.length === 0 ? (
              <div className="text-center py-8 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Layers size={24} className="text-blue-400" />
                </div>
                <h4 className="text-md font-semibold text-white">No Approved Plans</h4>
                <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
                  Approve plans first to manage their display order.
                </p>
              </div>
            ) : (
              <>
                <GlassCard className="p-4 border-white/10">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={approvedPlans.map(p => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {approvedPlans.map((plan, index) => (
                          <SortablePlanItem
                            key={plan.id}
                            plan={plan}
                            index={index}
                            total={approvedPlans.length}
                            onMoveUp={movePlan}
                            onMoveDown={movePlan}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </GlassCard>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <h4 className="text-xs font-medium text-gray-400 mb-2">🖥️ Landing Page Preview</h4>
                    <div className="flex gap-2">
                      {approvedPlans.slice(0, 3).map((plan, idx) => (
                        <div 
                          key={plan.id}
                          className={`flex-1 p-2 rounded-lg text-center text-xs ${
                            idx === 0 ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/5 border border-white/10'
                          }`}
                        >
                          <span className="text-white font-medium">{plan.name}</span>
                          <span className="text-gray-400 block text-[10px]">LKR {plan.price}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">Order reflects on landing and pricing pages</p>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <h4 className="text-xs font-medium text-gray-400 mb-2">📊 Order Summary</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {approvedPlans.map((plan, idx) => (
                        <div key={plan.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{idx + 1}. {plan.name}</span>
                          <span className="text-gray-500">{plan.sortOrder || idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <p className="text-xs text-amber-400">
                    💡 Changes will be reflected on the landing page and pricing page after saving.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ PENDING PLANS LIST ============ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="animate-spin text-purple-400" size={40} />
          <p className="text-gray-400 mt-4">Loading pending approvals...</p>
        </div>
      ) : pendingPlans.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">All Clear!</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            No pending plans awaiting approval. All subscription plans have been reviewed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingPlans.map((plan, idx) => (
            <motion.div
              key={plan.id || idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassCard className="p-6 border-2 border-amber-500/30 bg-amber-500/[0.03] hover:border-amber-500/50 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge color="amber" className="flex items-center gap-1.5">
                      <Clock size={12} /> Pending Review
                    </Badge>
                    {plan.popular && (
                      <Badge color="purple" className="flex items-center gap-1.5">
                        <Sparkles size={12} /> Popular
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    #{plan.id?.slice(0, 8)}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Rocket size={18} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-extrabold text-white">
                        LKR {plan.price?.toLocaleString() || 0}
                      </span>
                      <span className="text-sm text-gray-400">/month</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Tag size={14} className="text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">
                        {plan.credits || 0} credits per month
                      </span>
                    </div>
                  </div>
                </div>

                {plan.features && plan.features.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    {plan.features.slice(0, 4).map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    {plan.features.length > 4 && (
                      <div className="text-xs text-gray-500 pl-6">
                        +{plan.features.length - 4} more features
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <User size={12} />
                    <span>Created by: {plan.createdBy || 'Finance Admin'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={12} />
                    <span>{plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openReviewModal(plan)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button
                    onClick={() => openReviewModal(plan)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-500 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button
                    onClick={() => openReviewModal(plan)}
                    className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {showModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-[#0d1222] border border-white/10 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Review Plan</h3>
                    <p className="text-xs text-gray-400">{selectedPlan.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Price:</span>
                    <span className="text-white font-bold">LKR {selectedPlan.price?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Credits:</span>
                    <span className="text-white font-bold">{selectedPlan.credits} / month</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Features:</span>
                    <span className="text-white font-bold">{selectedPlan.features?.length || 0}</span>
                  </div>
                  {selectedPlan.popular && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-purple-400 font-bold flex items-center gap-1">
                        <Sparkles size={14} /> Popular
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Review Notes <span className="text-gray-500">(required for rejection)</span>
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add feedback for the finance admin..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors min-h-[100px] resize-y"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleApprove(selectedPlan.id)}
                    disabled={processingId === selectedPlan.id}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingId === selectedPlan.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CheckCircle size={18} />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedPlan.id)}
                    disabled={processingId === selectedPlan.id}
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 rounded-xl text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingId === selectedPlan.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <XCircle size={18} />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl border shadow-lg z-50 ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {toastMessage.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ============ MAIN RENDER ============
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {activeTab === 'overview' ? 'Revenue Analytics' : 'Plan Approvals'}
            </h1>
            <p className="text-gray-400 mt-1">
              {activeTab === 'overview' 
                ? 'Platform financial overview and breakdowns' 
                : 'Review and approve subscription plans created by finance team'}
            </p>
          </div>
          {activeTab === 'overview' && (
            <Button variant="secondary" size="sm">
              <Download size={14} /> Export CSV
            </Button>
          )}
          {activeTab === 'approvals' && pendingPlans.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl">
              <AlertCircle size={16} className="text-amber-400" />
              <span className="text-amber-300 text-sm font-medium">{pendingPlans.length} Pending Approvals</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-400 bg-white/3' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.badge && (
              <span className="ml-1 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-[9px] font-bold text-amber-400">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div 
        key={activeTab} 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' ? renderOverview() : renderApprovals()}
      </motion.div>
    </div>
  );
}