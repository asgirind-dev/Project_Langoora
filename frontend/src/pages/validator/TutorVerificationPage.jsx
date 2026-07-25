// frontend/src/pages/validator/TutorVerificationPage.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, FileText, Eye, ShieldAlert, X, Check, AlertTriangle, 
  CheckCircle, AlertCircle, Mail, GraduationCap, MessageSquare 
} from "lucide-react";

import GlassCard from "../../components/ui/GlassCard";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function TutorVerificationPage() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // UI States
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmRejectModal, setConfirmRejectModal] = useState({
    show: false,
    tutorId: null,
    tutorName: '',
    reason: ''
  });

  // Helper Function for Toast Notification
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // FETCH PENDING TUTORS
  const fetchPendingTutors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch("http://localhost:5000/api/validator/tutors/pending-queue", {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setTutors(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching pending tutors:", error);
      showNotification("Failed to fetch pending tutors", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTutors();
  }, []);

  // HANDLE APPROVE
  const handleApprove = async (tutorId) => {
    setActionLoading(tutorId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/validator/tutors/approve/${tutorId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      if (result.success) {
        setTutors((prev) => prev.filter((t) => t.id !== tutorId));
        
        // Show email status in notification
        if (result.result?.emailSent) {
          showNotification(
            "✅ Tutor approved successfully! Confirmation email sent to the tutor.",
            "success"
          );
        } else {
          showNotification(
            "⚠️ Tutor approved but email notification failed. Please check email configuration.",
            "warning"
          );
        }
      } else {
        showNotification(result.message || "Failed to approve tutor", "error");
      }
    } catch (error) {
      console.error("Approval error:", error);
      showNotification("Failed to approve tutor. Please try again.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // TRIGGER REJECT CONFIRMATION WITH REASON
  const triggerRejectConfirmation = (tutorId, tutorName) => {
    setConfirmRejectModal({
      show: true,
      tutorId,
      tutorName,
      reason: ''
    });
  };

  // HANDLE CONFIRM REJECT
  const handleConfirmReject = async () => {
    const { tutorId, reason } = confirmRejectModal;
    if (!tutorId) return;

    setActionLoading(tutorId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/validator/tutors/reject/${tutorId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rejectionReason: reason || null })
      });
      const result = await response.json();
      
      if (result.success) {
        setTutors((prev) => prev.filter((t) => t.id !== tutorId));
        setConfirmRejectModal({ show: false, tutorId: null, tutorName: '', reason: '' });
        
        // Show email status in notification
        if (result.result?.emailSent) {
          showNotification(
            "📋 Tutor rejected. Notification email sent to the tutor.",
            "info"
          );
        } else {
          showNotification(
            "⚠️ Tutor rejected but email notification failed. Please check email configuration.",
            "warning"
          );
        }
      } else {
        showNotification(result.message || "Failed to reject tutor", "error");
      }
    } catch (error) {
      console.error("Rejection error:", error);
      showNotification("Failed to reject tutor. Please try again.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3 p-8 bg-[#060d1f] min-h-screen">
        {[1, 2, 3].map(n => (
          <div key={n} className="w-full h-24 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse flex items-center justify-between p-5">
            <div className="flex items-center gap-4 w-2/3">
              <div className="w-12 h-12 bg-white/5 rounded-xl" />
              <div className="space-y-2 w-1/2">
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-2 bg-white/5 rounded w-1/2" />
              </div>
            </div>
            <div className="flex gap-2 w-24">
              <div className="h-8 bg-white/5 rounded-lg flex-1" />
              <div className="h-8 bg-white/5 rounded-lg flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#060d1f] min-h-screen p-6 sm:p-8 relative selection:bg-blue-500/30">
      
      {/* Toast Notification with Multiple Types */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl max-w-sm ${
              toast.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200 shadow-emerald-950/20' 
                : toast.type === 'warning'
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-200 shadow-amber-950/20'
                : toast.type === 'info'
                ? 'bg-blue-950/40 border-blue-500/30 text-blue-200 shadow-blue-950/20'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-200 shadow-rose-950/20'
            }`}
          >
            <div className={`p-1.5 rounded-xl border ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20' 
                : toast.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20'
                : toast.type === 'info'
                ? 'bg-blue-500/10 border-blue-500/20'
                : 'bg-rose-500/10 border-rose-500/20'
            }`}>
              {toast.type === 'success' 
                ? <CheckCircle size={18} className="text-emerald-400" /> 
                : toast.type === 'warning'
                ? <AlertTriangle size={18} className="text-amber-400" />
                : toast.type === 'info'
                ? <AlertCircle size={18} className="text-blue-400" />
                : <AlertCircle size={18} className="text-rose-400" />
              }
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider opacity-60">
                {toast.type === 'success' ? 'Success' : toast.type === 'warning' ? 'Warning' : toast.type === 'info' ? 'Notice' : 'Error'}
              </p>
              <p className="text-sm font-medium mt-0.5 leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => setToast(p => ({ ...p, show: false }))} className="text-gray-400 hover:text-white p-1">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Confirmation Modal with Reason Input */}
      <AnimatePresence>
        {confirmRejectModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f1629] border border-rose-500/30 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirm Rejection</h3>
                  <p className="text-xs text-gray-400">Critical workflow authorization</p>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                You are about to reject <span className="text-white font-medium">{confirmRejectModal.tutorName}</span>'s application. 
                This action will send a rejection email to the tutor.
              </p>

              {/* Rejection Reason Input */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-1.5">
                  <MessageSquare size={14} className="text-rose-400" />
                  Rejection Reason <span className="text-xs text-gray-500">(Optional but recommended)</span>
                </label>
                <textarea
                  placeholder="e.g., Your qualifications do not meet our minimum requirements for JLPT N1 certification..."
                  value={confirmRejectModal.reason}
                  onChange={(e) => setConfirmRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50 text-sm transition-colors resize-none"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  This reason will be included in the rejection email sent to the tutor.
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  className="text-xs border border-white/5 bg-white/5 hover:bg-white/10"
                  onClick={() => setConfirmRejectModal({ show: false, tutorId: null, tutorName: '', reason: '' })}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading === confirmRejectModal.tutorId ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <X size={14} /> Confirm Rejection
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
              Tutor Credentials Verification
            </h1>
            <p className="text-gray-400 mt-1">Review academic qualifications, university degrees, and language accreditations</p>
          </div>
          {tutors.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/15 border border-blue-500/30 rounded-xl">
              <ShieldAlert size={16} className="text-blue-400" />
              <span className="text-blue-300 text-sm font-medium">{tutors.length} outstanding tasks</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tutor List */}
      <div className="space-y-4">
        {tutors.length === 0 ? (
          <GlassCard className="p-8 text-center text-gray-500 text-sm border-dashed">
            <AlertTriangle className="mx-auto mb-2 text-gray-600 animate-pulse" size={24} />
            No instructors currently pending qualification verification gates. All clusters clear.
          </GlassCard>
        ) : (
          tutors.map((t, idx) => (
            <motion.div 
              key={t.id} 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: idx * 0.04 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white/3 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-md uppercase">
                  {t.name ? t.name.charAt(0) : "T"}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-white text-base tracking-tight truncate capitalize">{t.name}</h4>
                    <Badge color="blue">{t.qualifications || "JLPT Level Unspecified"}</Badge>
                  </div>
                  <div className="flex flex-col gap-0.5 text-xs text-gray-400 pt-0.5">
                    <span className="flex items-center gap-1.5"><Mail size={12} className="text-gray-500"/> {t.email}</span>
                    <span className="flex items-center gap-1.5"><GraduationCap size={12} className="text-blue-400/70"/> {t.university || 'Independent Affiliate'}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 pt-1">
                    <Clock size={11} /> Applied: {t.applied_at ? new Date(t.applied_at).toLocaleDateString() : 'Just Now'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setSelectedDoc(t.certificateData || "placeholder_not_found")}
                  className="text-xs border border-white/5 text-gray-300 gap-1.5 py-2 px-3 bg-white/5 hover:bg-white/10"
                >
                  <Eye size={13} /> View Credentials
                </Button>
                <Button 
                  variant="success" 
                  size="sm" 
                  disabled={actionLoading !== null}
                  onClick={() => handleApprove(t.id)}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 flex items-center gap-1"
                >
                  {actionLoading === t.id ? "..." : <><Check size={12}/> Approve</>}
                </Button>
                <Button 
                  variant="danger" 
                  size="sm" 
                  disabled={actionLoading !== null}
                  onClick={() => triggerRejectConfirmation(t.id, t.name)}
                  className="text-xs font-bold bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-400 hover:text-white px-4 flex items-center gap-1"
                >
                  <X size={12}/> Reject
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0f1629] border border-white/10 rounded-2xl max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-2 text-blue-400">
                  <FileText size={16} />
                  <h3 className="font-semibold text-white text-sm">Academic Qualification Verification File</h3>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 bg-black/40 p-4 flex items-center justify-center overflow-hidden">
                {selectedDoc === "placeholder_not_found" ? (
                  <div className="text-center p-6 space-y-2">
                    <ShieldAlert size={36} className="text-amber-500 mx-auto animate-bounce" />
                    <p className="text-gray-300 font-medium text-sm">No Verification File Uploaded</p>
                  </div>
                ) : (
                  <div className="w-full h-full overflow-auto flex items-center justify-center">
                    <img src={selectedDoc} alt="Academic Proof Document" className="max-w-full max-h-full object-contain rounded-xl border border-white/5" />
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)} className="text-xs border border-white/10">
                  Close Preview
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}