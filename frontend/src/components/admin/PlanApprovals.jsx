// frontend/src/components/admin/PlanApprovals.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, CheckCircle, XCircle, Clock, Eye, FileText,
  Loader2, User, Tag, Sparkles, RefreshCw, Rocket,
  Calendar
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import SubscriptionService from '../../services/subscriptionService';

export default function PlanApprovals() {
  const [pendingPlans, setPendingPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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

  useEffect(() => {
    fetchPendingPlans();
  }, []);

  const handleApprove = async (planId) => {
    setProcessingId(planId);
    try {
      await SubscriptionService.approvePlan(planId, reviewNotes);
      await fetchPendingPlans();
      setShowModal(false);
      setReviewNotes('');
      showToast('✅ Plan approved successfully! Finance admin has been notified.', 'success');
    } catch (error) {
      showToast(`❌ Failed to approve plan: ${error.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

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

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openReviewModal = (plan) => {
    setSelectedPlan(plan);
    setReviewNotes('');
    setShowModal(true);
  };

  return (
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
        <button
          onClick={fetchPendingPlans}
          className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

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
}