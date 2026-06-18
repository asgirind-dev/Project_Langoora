import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, FileText, Eye, ShieldAlert, X, Check, AlertTriangle } from "lucide-react";

import GlassCard from "../../components/ui/GlassCard";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function TutorVerificationPage() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null); 
  const [actionLoading, setActionLoading] = useState(null);

  // FETCH FROM EXPRESS CONTROLLER API
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
      console.error("Express credential registry node exception:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTutors();
  }, []);

  // ACTION DISPATCH: APPROVE WORKING PATH
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
      }
    } catch (error) {
      console.error("Approval flow synchronization crashed:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // ACTION DISPATCH: REJECT WORKING PATH
  const handleReject = async (tutorId) => {
    if (!window.confirm("Reject this tutor credentials application permanently?")) return;
    setActionLoading(tutorId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/validator/tutors/reject/${tutorId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setTutors((prev) => prev.filter((t) => t.id !== tutorId));
      }
    } catch (error) {
      console.error("Rejection flow execution exception:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 animate-pulse py-20 text-center bg-[#060d1f] min-h-screen font-mono">
        LOADING LIVE ACADEMIC CREDENTIALS VERIFICATION REGISTRY SYNC...
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#060d1f] min-h-screen p-6 sm:p-8">
      
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
                  <p className="text-xs text-gray-400 truncate">
                    {t.email} · <span className="text-blue-400 font-medium">{t.university}</span>
                  </p>
                  <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 pt-0.5">
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
                  disabled={actionLoading === t.id}
                  onClick={() => handleApprove(t.id)}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4"
                >
                  {actionLoading === t.id ? "..." : "Approve"}
                </Button>
                <Button 
                  variant="danger" 
                  size="sm" 
                  disabled={actionLoading === t.id}
                  onClick={() => handleReject(t.id)}
                  className="text-xs font-bold bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-400 hover:text-white px-4"
                >
                  Reject
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* BASE64 MODAL PREVIEWER */}
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