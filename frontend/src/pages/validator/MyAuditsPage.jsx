import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, User, MessageSquare } from "lucide-react";
import GlassCard from "../../components/ui/GlassCard";
import Badge from "../../components/ui/Badge";
import { getMyAudits } from "../../services/examService";

export default function MyAuditsPage() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyAudits();
  }, []);

  const fetchMyAudits = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getMyAudits();
      if (response.success) {
        setAudits(response.exams || []);
      } else {
        setError(response.message || "Failed to load audits");
      }
    } catch (err) {
      console.error("Fetch audits error:", err);
      setError(err.message || "An error occurred while loading audits");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white/5 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl">
        Failed to load audits: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent tracking-tight">
          My Audits
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Exams you have reviewed and validated
        </p>
      </motion.div>

      {audits.length === 0 ? (
        <div className="p-12 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-gray-500">
          <CheckCircle size={32} className="text-gray-600 mb-2" />
          <p className="text-sm font-medium">No audits performed yet</p>
          <p className="text-xs text-gray-400">
            Exams you approve or reject will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {audits.map((exam, idx) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassCard className="p-5 flex flex-col justify-between h-full border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <Badge
                      color={exam.status === "published" ? "green" : "red"}
                    >
                      {exam.status === "published" ? "APPROVED" : "REJECTED"}
                    </Badge>
                    <span className="text-xs text-gray-400 font-mono">
                      <Clock size={12} className="inline mr-1" />
                      {exam.reviewedAt
                        ? new Date(exam.reviewedAt).toLocaleDateString()
                        : "Unknown date"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                    {exam.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <User size={13} className="text-blue-400" />
                    <span>By {exam.tutorName}</span>
                  </div>
                  {exam.status === "rejected" && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                      <MessageSquare size={12} />
                      <span>
                        {exam.rejectionFeedback.length} feedback item
                        {exam.rejectionFeedback.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
                    {exam.status === "published"
                      ? "Published to Marketplace"
                      : "Returned to Tutor"}
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
