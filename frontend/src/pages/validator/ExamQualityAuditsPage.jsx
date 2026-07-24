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
  Loader,
  Mic,
  Image,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import GlassCard from "../../components/ui/GlassCard";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import {
  getPendingExams,
  approveExam,
  rejectExam,
  getExamById,
} from "../../services/examService";
import { useAuth } from "../../context/AuthContext"; // adjust path as needed

const ExamQualityAuditsPage = () => {
  const { user } = useAuth(); // assuming user object has languageGroup
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedExam, setSelectedExam] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // For the modal: track per sub-question validation status
  const [questionStatus, setQuestionStatus] = useState({});
  const [questionComments, setQuestionComments] = useState({});

  useEffect(() => {
    fetchPendingExams();
    // eslint-disable-next-line
  }, []);

  const fetchPendingExams = async () => {
    try {
      setLoading(true);
      const response = await getPendingExams();
      if (response.success) {
        setExams(response.exams || []);
      } else {
        setError(response.message || "Failed to load pending exams.");
      }
    } catch (err) {
      console.error("Fetch pending exams error:", err);
      setError(err.message || "Failed to load pending exams.");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  const handleViewExam = async (exam) => {
    try {
      setActionLoading(true);
      const response = await getExamById(exam.id);
      if (response.success) {
        setSelectedExam(response.exam);
        // Initialize question statuses: all as "correct" by default
        const initialStatus = {};
        const initialComments = {};
        response.exam.problems.forEach((problem) => {
          problem.sub_questions.forEach((sub) => {
            const key = `${problem.id}-${sub.id}`;
            initialStatus[key] = "correct";
            initialComments[key] = "";
          });
        });
        setQuestionStatus(initialStatus);
        setQuestionComments(initialComments);
      } else {
        showNotification("Failed to load exam details.", "error");
      }
    } catch (err) {
      console.error("View exam error:", err);
      showNotification(err.message || "Failed to load exam details.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleQuestionStatus = (key) => {
    setQuestionStatus((prev) => ({
      ...prev,
      [key]: prev[key] === "correct" ? "incorrect" : "correct",
    }));
  };

  const handleCommentChange = (key, value) => {
    setQuestionComments((prev) => ({ ...prev, [key]: value }));
  };

  const handleApprove = async () => {
    if (!selectedExam) return;
    try {
      setActionLoading(true);
      const response = await approveExam(selectedExam.id);
      if (response.success) {
        showNotification("Exam approved and published!", "success");
        setSelectedExam(null);
        fetchPendingExams();
      } else {
        showNotification(response.message || "Failed to approve.", "error");
      }
    } catch (err) {
      console.error("Approve error:", err);
      showNotification(err.message || "Failed to approve.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedExam) return;
    // Collect feedback for incorrect questions
    const feedback = [];
    selectedExam.problems.forEach((problem) => {
      problem.sub_questions.forEach((sub) => {
        const key = `${problem.id}-${sub.id}`;
        if (questionStatus[key] === "incorrect") {
          feedback.push({
            problemId: problem.id,
            subQuestionId: sub.id,
            comment: questionComments[key] || "No comment provided.",
          });
        }
      });
    });

    if (feedback.length === 0) {
      showNotification(
        "Please mark at least one question as incorrect before rejecting.",
        "error",
      );
      return;
    }

    try {
      setActionLoading(true);
      const response = await rejectExam(selectedExam.id, feedback);
      if (response.success) {
        showNotification("Exam rejected. Tutor notified.", "success");
        setSelectedExam(null);
        fetchPendingExams();
      } else {
        showNotification(response.message || "Failed to reject.", "error");
      }
    } catch (err) {
      console.error("Reject error:", err);
      showNotification(err.message || "Failed to reject.", "error");
    } finally {
      setActionLoading(false);
    }
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
      {/* Toast notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl max-w-sm ${
              toast.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                : "bg-rose-950/40 border-rose-500/30 text-rose-200"
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

      {/* Header */}
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

      {/* Error display */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Exam Cards Grid */}
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
                    <Badge color="blue">JLPT {exam.level_id || "N/A"}</Badge>
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
                        {new Date(exam.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <Button
                    variant="ghost"
                    fullWidth
                    size="sm"
                    onClick={() => handleViewExam(exam)}
                    className="text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 gap-1.5 rounded-xl py-2"
                  >
                    <Eye size={13} /> View Exam Structure
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>

      {/* ===== MODAL: Full Exam Review ===== */}
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
              className="bg-[#0f1629] border border-white/10 rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 flex-shrink-0">
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

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/10 scrollbar-thin">
                {selectedExam.problems && selectedExam.problems.length > 0 ? (
                  selectedExam.problems.map((problem, pIdx) => (
                    <div
                      key={problem.id}
                      className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4"
                    >
                      <div className="flex items-center gap-2">
                        <Badge color="blue">Problem {pIdx + 1}</Badge>
                        <span className="text-sm font-medium text-white">
                          {problem.problem_title}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {problem.section}
                        </span>
                      </div>
                      {problem.example && (
                        <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5">
                          <p className="text-xs text-gray-300">
                            <span className="text-blue-400 font-bold">
                              Example:
                            </span>{" "}
                            {problem.example.text}
                          </p>
                          <div className="flex gap-4 mt-1 text-xs">
                            {problem.example.options.map((opt, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded ${i === problem.example.correct_answer_index ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-gray-400"}`}
                              >
                                {String.fromCharCode(65 + i)}. {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {problem.sub_questions &&
                        problem.sub_questions.length > 0 && (
                          <div className="space-y-3">
                            <h5 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                              Sub-Questions
                            </h5>
                            {problem.sub_questions.map((sub, sIdx) => {
                              const key = `${problem.id}-${sub.id}`;
                              const status = questionStatus[key] || "correct";
                              return (
                                <div
                                  key={sub.id}
                                  className="bg-slate-900/30 border border-white/5 rounded-xl p-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="text-xs font-bold text-gray-400 mt-0.5">
                                      Q{sIdx + 1}
                                    </span>
                                    <div className="flex-1">
                                      <p className="text-sm text-white">
                                        {sub.text}
                                      </p>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {sub.options.map((opt, oIdx) => (
                                          <span
                                            key={oIdx}
                                            className={`text-xs px-2 py-0.5 rounded ${oIdx === sub.correct_answer_index ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-gray-400"}`}
                                          >
                                            {String.fromCharCode(65 + oIdx)}.{" "}
                                            {opt}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                      <button
                                        onClick={() =>
                                          toggleQuestionStatus(key)
                                        }
                                        className={`p-1.5 rounded-lg transition-all ${
                                          status === "correct"
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                        }`}
                                      >
                                        {status === "correct" ? (
                                          <ThumbsUp size={16} />
                                        ) : (
                                          <ThumbsDown size={16} />
                                        )}
                                      </button>
                                      <span className="text-[9px] uppercase font-bold text-gray-500">
                                        {status === "correct"
                                          ? "Correct"
                                          : "Incorrect"}
                                      </span>
                                    </div>
                                  </div>
                                  {status === "incorrect" && (
                                    <div className="mt-2">
                                      <textarea
                                        placeholder="Explain what's wrong or suggest correction..."
                                        value={questionComments[key] || ""}
                                        onChange={(e) =>
                                          handleCommentChange(
                                            key,
                                            e.target.value,
                                          )
                                        }
                                        className="w-full bg-slate-950/70 border border-rose-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50 resize-none"
                                        rows={2}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-12">
                    <AlertTriangle
                      size={36}
                      className="text-rose-500 animate-bounce"
                    />
                    <p className="text-gray-200 font-bold text-sm">
                      No questions found
                    </p>
                    <p className="text-xs text-gray-500 max-w-xs">
                      This exam has no sub-questions. Cannot validate.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-between items-center flex-shrink-0">
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
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 font-semibold text-xs rounded-xl transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader size={14} className="animate-spin" />
                    ) : (
                      "Reject Material"
                    )}
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader size={14} className="animate-spin" />
                    ) : (
                      "Publish to Marketplace"
                    )}
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
