import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../firebaseConfig"; // Ensure this matches your global config path
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { Clock, FileText, Eye, ShieldAlert, X } from "lucide-react";

// Importing dynamic structural global UI primitives matching dashboard specs
import GlassCard from "../../components/ui/GlassCard";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

const TutorVerificationPage = () => {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null); // Managed state for verification modal previewer
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch pending tutor profiles awaiting authorization gates from Firestore
  const fetchPendingTutors = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "tutor"),
        where("status", "==", "pending")
      );
      
      const querySnapshot = await getDocs(q);
      const tutorList = [];
      querySnapshot.forEach((doc) => {
        tutorList.push({ id: doc.id, ...doc.data() });
      });
      
      setTutors(tutorList);
    } catch (error) {
      console.error("Firestore credential pipeline compilation exception:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTutors();
  }, []);

  // Sync state mutation with live database cluster (Approve)
  const handleApprove = async (tutorId) => {
    setActionLoading(tutorId);
    try {
      const tutorRef = doc(db, "users", tutorId);
      // Updates status to active to match AcademicValidatorDashboard specifications
      await updateDoc(tutorRef, { 
        status: "active",
        verifiedAt: new Date()
      });
      setTutors((prev) => prev.filter((t) => t.id !== tutorId));
    } catch (error) {
      console.error("Approval state synchronization crashed:", error);
      alert("Failed to finalize tutor authorization.");
    } finally {
      setActionLoading(null);
    }
  };

  // Sync state mutation with live database cluster (Reject)
  const handleReject = async (tutorId) => {
    if (window.confirm("Reject this tutor credentials application?")) {
      setActionLoading(tutorId);
      try {
        const tutorRef = doc(db, "users", tutorId);
        await updateDoc(tutorRef, { 
          status: "rejected",
          rejectedAt: new Date()
        });
        setTutors((prev) => prev.filter((t) => t.id !== tutorId));
      } catch (error) {
        console.error("Rejection state synchronization crashed:", error);
        alert("Failed to execute rejection routing.");
      } finally {
        setActionLoading(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 animate-pulse py-4 bg-[#060d1f] min-h-screen p-8">
        Validating secure live verification database streams...
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#060d1f] min-h-screen">
      {/* Structural Modern Header Section */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
              Tutor Credentials Verification
            </h1>
            <p className="text-gray-400 mt-1">Review academic qualifications, university degrees, and language accreditations</p>
          </div>
          {tutors.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/15 border border-blue-500/30 rounded-xl">
              <ShieldAlert size={16} className="text-blue-400" />
              <span className="text-blue-300 text-sm font-medium">{tutors.length} verifications outstanding</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Core Queue Content Block */}
      <div className="space-y-4">
        {tutors.length === 0 ? (
          <p className="text-gray-500 text-sm p-4 bg-white/2 rounded-xl border border-white/5">
            No instructors currently pending qualification verification gates.
          </p>
        ) : (
          tutors.map((t, idx) => (
            <motion.div 
              key={t.id} 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: idx * 0.05 }}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white/3 rounded-xl border border-white/8 hover:border-white/15 transition-all"
            >
              {/* Dynamic Gradient User Identity Placeholder avatar */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-md">
                {t.name ? t.name.charAt(0) : "T"}
              </div>

              {/* Tutor Demographics aligned directly with your Firestore Root Schema properties */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-white text-base">{t.name || "Anonymous Instructor"}</h4>
                  <Badge color="blue">{t.qualifications || "JLPT Level Unspecified"}</Badge>
                </div>
                <p className="text-xs text-gray-400">
                  {t.email} · <span className="text-blue-300">{t.university || "Independent Institution"}</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-sans pt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> UID: {t.id.substring(0, 12)}
                  </span>
                </div>
              </div>

              {/* Dynamic Interaction Action Alignment Layer */}
              <div className="flex items-center gap-2 mt-3 sm:mt-0 self-end sm:self-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedDoc(t.certificateData || "placeholder_not_found")}
                  className="text-xs border border-white/10 text-gray-300 gap-1.5 py-2 px-3 hover:bg-white/5"
                >
                  <Eye size={14} /> View Credentials
                </Button>
                <Button 
                  variant="success" 
                  size="sm" 
                  disabled={actionLoading === t.id}
                  onClick={() => handleApprove(t.id)}
                  className="text-xs font-semibold"
                >
                  {actionLoading === t.id ? "Processing..." : "Approve"}
                </Button>
                <Button 
                  variant="danger" 
                  size="sm" 
                  disabled={actionLoading === t.id}
                  onClick={() => handleReject(t.id)}
                  className="text-xs font-semibold"
                >
                  Reject
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ANIMATED INTERACTIVE CREDENTIAL PREVIEWER MODAL FOR BASE64 STRINGS */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0f1629] border border-white/10 rounded-2xl max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Context Header */}
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-2 text-blue-400">
                  <FileText size={18} />
                  <h3 className="font-semibold text-white text-sm">Academic Qualification Verification File</h3>
                </div>
                <button 
                  onClick={() => setSelectedDoc(null)} 
                  className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Dynamic Base64 Parser Sandbox Component (Supports Embedded application/pdf or standard data:image formats) */}
              <div className="flex-1 bg-black/40 p-4 flex items-center justify-center overflow-hidden">
                {selectedDoc === "placeholder_not_found" || !selectedDoc ? (
                  <div className="text-center p-6 space-y-2">
                    <ShieldAlert size={36} className="text-amber-500 mx-auto" />
                    <p className="text-gray-300 font-medium text-sm">No Verification File Uploaded</p>
                    <p className="text-xs text-gray-500">The tutor profile did not bind a dynamic storage document asset link during registration.</p>
                  </div>
                ) : selectedDoc.startsWith("data:application/pdf") ? (
                  <iframe 
                    src={selectedDoc} 
                    title="Academic Proof PDF Content" 
                    className="w-full h-full rounded-xl border border-white/5"
                  />
                ) : (
                  <div className="w-full h-full overflow-auto flex items-center justify-center">
                    <img 
                      src={selectedDoc} 
                      alt="Tutor Qualification Academic Proof Document" 
                      className="max-w-full max-h-full object-contain rounded-xl border border-white/5 shadow-lg"
                    />
                  </div>
                )}
              </div>

              {/* Modal Context Footer Controls */}
              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)} className="text-xs border border-white/10 text-gray-300">
                  Close Preview
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TutorVerificationPage;