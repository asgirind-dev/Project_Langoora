import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  BookOpen,
  Eye,
  CheckCircle,
  AlertTriangle,
  X,
  Clock,
  Check,
  AlertCircle,
} from "lucide-react";

import GlassCard from "../../components/ui/GlassCard";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

const ExamQualityAuditsPage = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [modalQuestions, setModalQuestions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Custom UI Component States
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [confirmRejectModal, setConfirmRejectModal] = useState({
    show: false,
    examId: null,
  });

  // 📡 Fetch pending exams from backend on mount
  useEffect(() => {
    fetchPendingExams();
  }, []);

  const fetchPendingExams = async () => {
    try {
      setLoading(true);
      // Route directed to your isolated validator endpoints
      const response = await fetch("/api/validator-exams/pending-audits");
      const result = await response.json();
      if (result.success) {
        setExams(result.data);
      } else {
        showNotification("Failed to fetch pending exams.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Network error occurred.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Lazily fetch questions when checking exam structure
  const handleOpenExamStructure = async (exam) => {
    setSelectedExam(exam);
    setModalLoading(true);
    setModalQuestions([]);
    try {
      // Route directed to your isolated validator endpoints
      const response = await fetch(`/api/validator-exams/${exam.id}/questions`);
      const result = await response.json();
      if (result.success) {
        setModalQuestions(result.data);
      } else {
        showNotification("Failed to retrieve structure questions.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Could not load exam questions.", "error");
    } finally {
      setModalLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  // ✍️ Persist audit decision (Publish / Reject) to database
  const handleAuditDecision = async (examId, newStatus) => {
    setActionLoading(examId);

    try {
      // Route directed to your isolated validator endpoints
      const response = await fetch(`/api/validator-exams/${examId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        setExams((prev) => prev.filter((exam) => exam.id !== examId));
        setSelectedExam(null);
        setConfirmRejectModal({ show: false, examId: null });

        if (newStatus === "published") {
          showNotification(
            "Exam package passed structural audit. Material published live.",
            "success",
          );
        } else {
          showNotification(
            "Exam package rejected. Status updated to draft mode.",
            "error",
          );
        }
      } else {
        showNotification(result.message || "Operation failed.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to communicate with API server.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const triggerRejectConfirmation = (examId) => {
    setConfirmRejectModal({ show: true, examId });
  };

  if (loading) {
    return (
      <div className="space-y-8 bg-[#060d1f] min-h-screen p-6 sm:p-8">
        <div className="w-1/3 h-8 bg-white/5 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-56 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse p-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="w-16 h-5 bg-white/10 rounded-lg" />{" "}
                  <div className="w-12 h-4 bg-white/5 rounded" />
                </div>
                <div className="w-3/4 h-6 bg-white/10 rounded-lg" />
                <div className="w-1/2 h-4 bg-white/5 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-8 bg-white/5 rounded-xl w-full" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-8 bg-white/5 rounded-xl" />
                  <div className="h-8 bg-white/5 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#060d1f] min-h-screen p-6 sm:p-8 relative selection:bg-blue-500/30">
      {/* Dynamic Slide-in Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl max-w-sm ${
              toast.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200 shadow-emerald-950/20"
                : "bg-rose-950/40 border-rose-500/30 text-rose-200 shadow-rose-950/20"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl border ${
                toast.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-rose-500/10 border-rose-500/20"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle size={18} className="text-emerald-400" />
              ) : (
                <AlertCircle size={18} className="text-rose-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider opacity-60">
                Audit Guard
              </p>
              <p className="text-sm font-medium mt-0.5 leading-tight">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast((p) => ({ ...p, show: false }))}
              className="text-gray-400 hover:text-white p-1"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Red Confirmation Modal */}
      <AnimatePresence>
        {confirmRejectModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0f1629] border border-rose-500/30 rounded-2xl p-6 shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Reject Package
                  </h3>
                  <p className="text-xs text-gray-400">
                    Quality Check Intervention
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                Are you sure you want to fail the quality compliance check for
                this exam pack? It will be reverted back to the author's
                drafting workspace.
              </p>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-xs border border-white/5 bg-white/5 hover:bg-white/10"
                  onClick={() =>
                    setConfirmRejectModal({ show: false, examId: null })
                  }
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() =>
                    handleAuditDecision(confirmRejectModal.examId, "draft")
                  }
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors"
                >
                  {actionLoading ? "Processing..." : "Confirm Reject"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Page Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent tracking-tight">
              Exam Quality Audits
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Verify exam structure, accuracy, and JLPT standard compliance
              before publication
            </p>
          </div>
          {exams.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl self-start sm:self-center">
              <ShieldCheck
                size={15}
                className="text-emerald-400 animate-pulse"
              />
              <span className="text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                {exams.length} Pending Packages
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Content View Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.length === 0 ? (
          <div className="col-span-full">
            <div className="p-12 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-gray-500">
              <CheckCircle
                size={32}
                className="text-emerald-500 mb-2 animate-pulse"
              />
              <p className="text-gray-300 font-medium text-sm">
                No Exam Packages in Quality Queue
              </p>
              <p className="text-xs text-gray-500 mt-1">
                All submitted evaluation materials have been verified cleanly.
              </p>
            </div>
          </div>
        ) : (
          exams.map((exam, idx) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassCard className="p-5 flex flex-col justify-between h-full border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-all">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <Badge color="blue">JLPT {exam.level || "N/A"}</Badge>
                    <span className="text-blue-400 font-extrabold text-sm tracking-wide">
                      {exam.price > 0
                        ? `LKR ${exam.price.toLocaleString()}`
                        : "Free Tier"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 capitalize">
                    {exam.title}
                  </h3>
                  <div className="space-y-1 pt-1 mb-5">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <BookOpen size={13} className="text-blue-500/70" />
                      <span>
                        {exam.total_questions || 0} Dynamic Questions Enclosed
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                      <Clock size={13} className="text-gray-600" />
                      <span>
                        Submitted:{" "}
                        {exam.createdAt
                          ? new Date(
                              exam.createdAt.seconds * 1000,
                            ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <Button
                    variant="ghost"
                    fullWidth
                    size="sm"
                    onClick={() => handleOpenExamStructure(exam)}
                    className="text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 gap-1.5 rounded-xl py-2"
                  >
                    <Eye size={13} /> View Exam Structure
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      disabled={actionLoading !== null}
                      onClick={() => handleAuditDecision(exam.id, "published")}
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center justify-center gap-1"
                    >
                      {actionLoading === exam.id ? (
                        "..."
                      ) : (
                        <>
                          <Check size={12} /> Publish
                        </>
                      )}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={actionLoading !== null}
                      onClick={() => triggerRejectConfirmation(exam.id)}
                      className="text-xs font-bold bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/20 rounded-xl flex items-center justify-center gap-1"
                    >
                      {actionLoading === exam.id ? (
                        "..."
                      ) : (
                        <>
                          <X size={12} /> Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>

      {/* FULL-SCREEN INTERACTIVE QUALITY REVIEW MODAL */}
      <AnimatePresence>
        {selectedExam && (
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
              className="bg-[#0f1629] border border-white/10 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-3 text-blue-400">
                  <ShieldCheck size={18} />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      Auditing Package: {selectedExam.title}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">
                      Structural Integrity Check In-Progress
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedExam(null)}
                  className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sandbox Questions Viewer */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/10 scrollbar-thin">
                {modalLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-3">
                    <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-xs text-gray-400">
                      Loading audit metadata from sandbox...
                    </p>
                  </div>
                ) : modalQuestions && modalQuestions.length > 0 ? (
                  modalQuestions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                          Q{qIdx + 1}
                        </span>
                        <p className="text-white text-sm font-semibold leading-relaxed pt-0.5">
                          {q.questionText}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-9 select-none">
                        {q.options?.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-3 rounded-xl text-xs border transition-all flex items-center justify-between ${
                              oIdx === q.correctOptionIndex
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold shadow-sm"
                                : "bg-black/20 border-white/5 text-gray-400"
                            }`}
                          >
                            <span>
                              <span className="opacity-40 mr-2 font-mono">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>{" "}
                              {opt}
                            </span>
                            {oIdx === q.correctOptionIndex && (
                              <CheckCircle
                                size={12}
                                className="text-emerald-400 flex-shrink-0"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className="pl-9 text-xs text-gray-500 italic">
                          <span className="font-semibold text-gray-400 not-italic">
                            Explanation:
                          </span>{" "}
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-12">
                    <AlertTriangle size={36} className="text-rose-500" />
                    <p className="text-gray-200 font-bold text-sm">
                      Critical Structural Error Detected
                    </p>
                    <p className="text-xs text-gray-500 max-w-xs leading-normal">
                      This package metadata contains zero valid options or
                      schema parameters. Please reject immediately.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Decision Footer */}
              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedExam(null)}
                  className="text-xs border border-white/10 text-gray-400"
                >
                  Exit Review
                </Button>
                <div className="flex gap-2">
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => triggerRejectConfirmation(selectedExam.id)}
                    className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Reject Material
                  </button>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() =>
                      handleAuditDecision(selectedExam.id, "published")
                    }
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors"
                  >
                    Publish to Marketplace
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamQualityAuditsPage;
