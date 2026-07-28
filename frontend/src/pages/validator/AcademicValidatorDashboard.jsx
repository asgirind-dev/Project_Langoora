import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CheckCircle,
  ShieldAlert,
  Clock,
  Mail,
  GraduationCap,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import GlassCard from "../../components/ui/GlassCard";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function AcademicValidatorDashboard() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [confirmRejectModal, setConfirmRejectModal] = useState({
    show: false,
    tutorId: null,
  });

  const showNotification = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  const fetchPendingTutors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/validator/tutors/pending-queue",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();
      if (result.success) {
        setTutors(result.data || []);
      }
    } catch (error) {
      console.error("Dashboard profile synchronization crashed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTutors();
  }, []);

  const handleApprove = async (tutorId) => {
    try {
      const tutorRef = doc(db, "users", tutorId);
      await updateDoc(tutorRef, { status: "active" });
      setTutors((prev) => prev.filter((t) => t.id !== tutorId));
      showNotification(
        "Instructor application approved successfully. Credentials synced.",
        "success",
      );
    } catch (error) {
      console.error("Approval state synchronization crashed:", error);
      showNotification("Failed to synchronize active state change.", "error");
    }
  };

  const triggerRejectConfirmation = (tutorId) => {
    setConfirmRejectModal({ show: true, tutorId });
  };

  const handleConfirmReject = async () => {
    const tutorId = confirmRejectModal.tutorId;
    if (!tutorId) return;

    try {
      const tutorRef = doc(db, "users", tutorId);
      await updateDoc(tutorRef, { status: "rejected" });
      setTutors((prev) => prev.filter((t) => t.id !== tutorId));
      setConfirmRejectModal({ show: false, tutorId: null });
      showNotification(
        "Instructor credentials rejected. Profile access suspended.",
        "error",
      );
    } catch (error) {
      console.error("Rejection state synchronization crashed:", error);
      showNotification("Failed to process rejection routine metrics.", "error");
    }
  };

  return (
    <div className="space-y-8 p-2 selection:bg-blue-500/30 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
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
                System Notice
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

      {/* Reject Confirmation Modal */}
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
                    Confirm Rejection
                  </h3>
                  <p className="text-xs text-gray-400">
                    Critical workflow authorization
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                Are you absolutely sure you want to permanently reject this
                tutor's credentials application? This profile tracking state
                will shift immediately.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-xs border border-white/5 bg-white/5 hover:bg-white/10"
                  onClick={() =>
                    setConfirmRejectModal({ show: false, tutorId: null })
                  }
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors"
                >
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </div>
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
              Academic Validator Dashboard
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Platform standard verification and exam quality audits
            </p>
          </div>
          {tutors.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl self-start sm:self-center">
              <ShieldAlert size={15} className="text-blue-400 animate-pulse" />
              <span className="text-blue-300 text-xs font-semibold tracking-wide uppercase">
                {tutors.length} Action Required
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 select-none">
        {[
          {
            label: "Pending Tutors",
            value: tutors.length,
            icon: Users,
            color: "text-blue-400 border-blue-500/10 bg-blue-500/5",
          },
          {
            label: "Resolved Audits",
            value: "384",
            icon: ShieldAlert,
            color: "text-emerald-400 border-emerald-500/10 bg-emerald-500/5",
          },
          {
            label: "System Accuracy",
            value: "98.2%",
            icon: CheckCircle,
            color: "text-cyan-400 border-cyan-500/10 bg-cyan-500/5",
          },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard
              className={`p-5 border ${s.color} rounded-2xl flex flex-col justify-between h-28 hover:scale-[1.02] transition-all`}
            >
              <s.icon size={18} className="opacity-80" />
              <div>
                <div className="text-2xl font-extrabold text-white tracking-tight">
                  {s.value}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mt-0.5">
                  {s.label}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Pending Tutors List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
          <Users size={18} className="text-blue-400" /> Instructor Approvals (
          {tutors.length})
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="w-full h-20 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-4 w-2/3">
                  <div className="w-10 h-10 bg-white/5 rounded-xl" />
                  <div className="space-y-2 w-1/2">
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-2 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
                <div className="flex gap-2 w-24">
                  <div className="h-7 bg-white/5 rounded-lg flex-1" />
                  <div className="h-7 bg-white/5 rounded-lg flex-1" />
                </div>
              </div>
            ))}
          </div>
        ) : tutors.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/5 bg-white/[0.01] rounded-2xl flex flex-col items-center justify-center text-gray-500">
            <CheckCircle
              size={28}
              className="text-gray-600 mb-2 animate-pulse"
            />
            <p className="text-sm font-medium">
              No instructors currently pending authorization gates.
            </p>
          </div>
        ) : (
          tutors.map((t) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={t.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/5 transition-all"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md select-none uppercase">
                  {t.name ? t.name.charAt(0) : "T"}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white text-sm capitalize leading-none">
                      {t.name || "Anonymous Instructor"}
                    </p>
                    <Badge color="blue">
                      {t.qualifications || "Language Educator"}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-0.5 text-xs text-gray-400 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <Mail size={12} className="text-gray-500" /> {t.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <GraduationCap size={12} className="text-blue-500/70" />{" "}
                      {t.university || "Independent Instructor"}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-1">
                    <Clock size={11} /> Application Reference ID:{" "}
                    {t.id.substring(0, 8).toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 self-end sm:self-center">
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleApprove(t.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"
                >
                  <Check size={12} /> Approve
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => triggerRejectConfirmation(t.id)}
                  className="bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/20 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"
                >
                  <X size={12} /> Reject
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
