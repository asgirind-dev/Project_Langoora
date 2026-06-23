import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, MessageSquare, ShieldAlert, X, Eye, ArrowRight, Check, AlertCircle } from 'lucide-react';

import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function ContentDisputesPage() {
  const [disputes, setDisputes] = useState([
    {
      id: "disp_001",
      examId: "jlpt_n4_mock_01",
      examTitle: "JLPT N4 Comprehensive Mock Exam 2026",
      questionText: "___ に 日本へ 行きますか。",
      studentFeedback: "The answer key marks 'イツ (Itsu)' as correct, but in the particle context provided in section 2, 'ドコ (Doko)' makes grammatical sense. Please re-verify.",
      reportedBy: "UGC0423999",
      status: "open",
      createdAt: "2026-06-09T14:22:00Z"
    },
    {
      id: "disp_002",
      examId: "jlpt_n5_grammar_05",
      examTitle: "JLPT N5 Grammar & Vocabulary Pack",
      questionText: "きのうは 雨가 ___ 。",
      studentFeedback: "Typo in Option B. It says 'furimasu' instead of the past negative format required by 'kinou'.",
      reportedBy: "UGC0423882",
      status: "open",
      createdAt: "2026-06-10T08:05:00Z"
    }
  ]);

  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionLoading, setResolutionLoading] = useState(null);

  // Custom UI Premium Notification States
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmResolveModal, setConfirmResolveModal] = useState({ show: false, disputeId: null });

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const triggerResolveConfirmation = (disputeId) => {
    setConfirmResolveModal({ show: true, disputeId });
  };

  const handleResolveDispute = async () => {
    const disputeId = confirmResolveModal.disputeId;
    if (!disputeId) return;

    setResolutionLoading(disputeId);
    
    setTimeout(() => {
      setDisputes(prev => prev.filter(item => item.id !== disputeId));
      setSelectedDispute(null);
      setResolutionLoading(null);
      setConfirmResolveModal({ show: false, disputeId: null });
      showNotification("Content dispute resolved and verification indices locked.", "success");
    }, 1200);
  };

  return (
    <div className="space-y-8 bg-[#060d1f] min-h-screen text-white p-2 relative selection:bg-blue-500/30">
      
      {/* Dynamic Slide-in Toast Notification */}
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
                : 'bg-rose-950/40 border-rose-500/30 text-rose-200 shadow-rose-950/20'
            }`}
          >
            <div className={`p-1.5 rounded-xl border ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertCircle size={18} className="text-rose-400" />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider opacity-60">Audit Engine</p>
              <p className="text-sm font-medium mt-0.5 leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => setToast(p => ({ ...p, show: false }))} className="text-gray-400 hover:text-white p-1">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Red Confirmation Modal for Resolution Safeguards */}
      <AnimatePresence>
        {confirmResolveModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0f1629] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-emerald-400 mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Resolve Dispute</h3>
                  <p className="text-xs text-gray-400">Content Correction Verification</p>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                Are you sure you want to officially mark this item as resolved? The active system ticket will be dropped and archived immediately.
              </p>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  className="text-xs border border-white/5 bg-white/5 hover:bg-white/10"
                  onClick={() => setConfirmRejectModal({ show: false, disputeId: null })}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  disabled={resolutionLoading !== null}
                  onClick={handleResolveDispute}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors"
                >
                  Confirm Resolve
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
              Content Dispute Management
            </h1>
            <p className="text-gray-400 mt-1 text-sm">Review, audit, and resolve student flags regarding incorrect answer keys or typos</p>
          </div>
          {disputes.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-amber-300 text-sm font-medium">{disputes.length} Open Flags Awaiting Evaluation</span>
            </div>
          )}
        </div>
      </motion.div>

      <div className="space-y-4">
        {disputes.length === 0 ? (
          <GlassCard className="p-8 text-center border-dashed">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto animate-bounce mb-2" />
            <p className="text-gray-300 font-medium text-sm">All Content Disputes Cleared</p>
            <p className="text-xs text-gray-500 mt-0.5">Instructors and students are completely aligned on academic materials.</p>
          </GlassCard>
        ) : (
          disputes.map((disp, index) => (
            <motion.div
              key={disp.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <GlassCard className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-amber-500/20 transition-all rounded-2xl">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color="amber">Status: Open Flag</Badge>
                    <span className="text-xs text-gray-500 font-mono">Exam ID: {disp.examId}</span>
                  </div>
                  <h3 className="font-bold text-lg text-white truncate capitalize">{disp.examTitle}</h3>
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Reported Question Context:</p>
                    <p className="text-sm font-sans text-gray-200">{disp.questionText}</p>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 italic leading-relaxed pt-1">
                    " {disp.studentFeedback} "
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedDispute(disp)}
                    className="text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 gap-1.5 py-2"
                  >
                    <Eye size={14} /> Audit Details
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    disabled={resolutionLoading !== null}
                    onClick={() => triggerResolveConfirmation(disp.id)}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 py-2 px-4 rounded-xl flex items-center gap-1"
                  >
                    <Check size={12}/> Mark Resolved
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>

      {/* DETAILED INTERACTIVE DISPUTE INSPECTION MODAL */}
      <AnimatePresence>
        {selectedDispute && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0f1629] border border-white/10 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-2 text-amber-400">
                  <ShieldAlert size={18} />
                  <h3 className="font-bold text-white text-sm">Dispute Investigation Audit Trail</h3>
                </div>
                <button 
                  onClick={() => setSelectedDispute(null)} 
                  className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5 bg-black/10">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Originating Package Target</p>
                  <h4 className="text-base font-bold text-white mt-0.5">{selectedDispute.examTitle}</h4>
                </div>

                <div className="p-4 bg-black/30 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold">
                    Flagged Question String
                  </span>
                  <p className="text-sm text-gray-200 pt-1 font-medium">{selectedDispute.questionText}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <MessageSquare size={14} />
                    <span className="font-bold">Student Feedback & Argument Parameters:</span>
                  </div>
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <p className="text-sm text-amber-200/90 leading-relaxed italic">
                      "{selectedDispute.studentFeedback}"
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 text-xs text-gray-500 border-t border-white/5 font-mono">
                  <span>Reported By: Index <strong className="text-gray-400 font-bold">{selectedDispute.reportedBy}</strong></span>
                  <span>Logged Date: {new Date(selectedDispute.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedDispute(null)} className="text-xs border border-white/10 text-gray-400">
                  Close Review
                </Button>
                <button 
                  onClick={() => triggerResolveConfirmation(selectedDispute.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors"
                >
                  Resolve & Close Issue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}