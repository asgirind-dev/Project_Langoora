import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, BookOpen, Eye, CheckCircle, AlertTriangle, X, Clock } from "lucide-react";

// Importing modern Glassmorphic UI components from your global library
import GlassCard from "../../components/ui/GlassCard";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

const ExamQualityAuditsPage = () => {
  // 1. PURE HARDCODED MOCK DATA ARRAY
  // This allows the UI to render perfectly without needing the 'exams' collection in Firestore.
  const [exams, setExams] = useState([
    {
      id: "mock_exam_001",
      title: "JLPT N4 Comprehensive Mock Exam 2026",
      level: "N4",
      price: 1500,
      createdAt: { seconds: 1775822400 }, // Mock timestamp
      questions: [
        {
          questionText: "___ に 日本へ 行きますか。",
          options: ["いつ (Itsu)", "どこ (Doko)", "なに (Nani)", "だれ (Dare)"],
          correctOptionIndex: 0
        },
        {
          questionText: "きのうは 雨が ___ 。",
          options: ["ふりました (Furimashita)", "ふります (Furimasu)", "ふって (Futte)", "ふりません (Furimasen)"],
          correctOptionIndex: 0
        }
      ]
    },
    {
      id: "mock_exam_002",
      title: "JLPT N5 Kanji & Vocabulary Blitz",
      level: "N5",
      price: 0, // Free Tier
      createdAt: { seconds: 1775908800 },
      questions: [
        {
          questionText: "たなかさんは 毎朝 なにを ___ か。",
          options: ["たべます", "のみます", "よみます", "かいます"],
          correctOptionIndex: 0
        }
      ]
    }
  ]);

  const [loading, setLoading] = useState(false); // No database loading delay needed
  const [selectedExam, setSelectedExam] = useState(null); // Controls the dynamic audit modal view
  const [actionLoading, setActionLoading] = useState(null);

  // 2. SIMULATED STATE MUTATION
  // Simulates removing the document from the dashboard queue upon validator action
  const handleAuditDecision = (examId, newStatus) => {
    setActionLoading(examId);
    
    // Simulating frontend processing lag for realistic UX feedback
    setTimeout(() => {
      alert(`Frontend Mock Notification: State synchronized to [${newStatus}]`);
      // Filter out the certified/rejected exam from the current viewport queue
      setExams((prev) => prev.filter((exam) => exam.id !== examId));
      setSelectedExam(null);
      setActionLoading(null);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 animate-pulse py-4 bg-[#060d1f] min-h-screen p-8">
        Validating secure live audit database streams...
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#060d1f] min-h-screen p-2">
      {/* Page Header Section with Gradient Title */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
              Exam Quality Audits
            </h1>
            <p className="text-gray-400 mt-1">Verify exam structure, accuracy, and JLPT standard compliance before publication</p>
          </div>
          {exams.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span className="text-emerald-300 text-sm font-medium">{exams.length} packages awaiting audit</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Content: Grid Layout for Pending Audits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.length === 0 ? (
          <div className="col-span-full">
            <div className="p-8 text-center bg-white/2 rounded-2xl border border-white/5 space-y-2">
              <CheckCircle size={32} className="text-emerald-400 mx-auto animate-pulse" />
              <p className="text-gray-300 font-medium">No Exam Packages in Quality Queue</p>
              <p className="text-xs text-gray-500">All submitted materials have been audited and updated.</p>
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
              <GlassCard className="p-5 flex flex-col justify-between h-full hover:border-white/20 transition-all border-white/10">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <Badge color="blue">JLPT {exam.level || "N/A"}</Badge>
                    <span className="text-emerald-400 font-bold text-sm">
                      {exam.price > 0 ? `LKR ${exam.price}` : "Free Tier"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{exam.title}</h3>
                  <div className="space-y-1.5 mb-6">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <BookOpen size={13} className="text-blue-400" />
                      <span>{exam.questions?.length || 0} Questions Enclosed</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={13} className="text-gray-400" />
                      <span>Submitted: {new Date(exam.createdAt?.seconds * 1000).toLocaleDateString() || "Recent"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2">
                  <Button 
                    variant="ghost" 
                    fullWidth 
                    size="sm" 
                    onClick={() => setSelectedExam(exam)}
                    className="text-xs border border-white/10 text-gray-300 gap-1.5"
                  >
                    <Eye size={14} /> View Exam Structure
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="success" 
                      size="sm" 
                      disabled={actionLoading === exam.id}
                      onClick={() => handleAuditDecision(exam.id, "published")}
                      className="text-xs font-semibold"
                    >
                      {actionLoading === exam.id ? "Syncing..." : "Publish"}
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      disabled={actionLoading === exam.id}
                      onClick={() => handleAuditDecision(exam.id, "draft")}
                      className="text-xs font-semibold"
                    >
                      {actionLoading === exam.id ? "Syncing..." : "Reject"}
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0f1629] border border-white/10 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl"
            >
              {/* Modal Header Context */}
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-3 text-blue-400">
                  <ShieldCheck size={20} />
                  <div>
                    <h3 className="font-semibold text-white text-sm">Auditing Package: {selectedExam.title}</h3>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Structural Integrity Check In-Progress</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedExam(null)} 
                  className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Questions Sandbox Viewer */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/10">
                {selectedExam.questions && selectedExam.questions.length > 0 ? (
                  selectedExam.questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 bg-white/2 border border-white/5 rounded-xl space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold border border-blue-500/30 flex-shrink-0 mt-1">
                          Q{qIdx + 1}
                        </span>
                        <p className="text-white text-sm font-medium leading-relaxed">{q.questionText}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-9">
                        {q.options?.map((opt, oIdx) => (
                          <div 
                            key={oIdx} 
                            className={`p-2.5 rounded-lg text-xs border transition-all ${
                              oIdx === q.correctOptionIndex 
                                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium" 
                                : "bg-black/20 border-white/5 text-gray-400"
                            }`}
                          >
                            <span className="opacity-50 mr-2">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                            {oIdx === q.correctOptionIndex && <CheckCircle size={10} className="inline ml-2 mb-0.5" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                    <AlertTriangle size={40} className="text-rose-500" />
                    <p className="text-gray-300 font-medium text-sm">Critical Structural Error Detected</p>
                    <p className="text-xs text-gray-500">This package metadata contains zero valid questions. Please reject this material.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer Decisions */}
              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
                <Button variant="ghost" size="sm" onClick={() => setSelectedExam(null)} className="text-xs border border-white/10 text-gray-300">
                  Exit Audit View
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => handleAuditDecision(selectedExam.id, "draft")}
                    className="text-xs px-6"
                  >
                    Reject Material
                  </Button>
                  <Button 
                    variant="success" 
                    size="sm" 
                    onClick={() => handleAuditDecision(selectedExam.id, "published")}
                    className="text-xs px-6"
                  >
                    Publish to Marketplace
                  </Button>
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