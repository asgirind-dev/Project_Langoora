import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, MessageSquare, ShieldAlert, X, Eye, ArrowRight } from 'lucide-react';

// Importing dynamic UI atoms matching architecture blueprints
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
      questionText: "きのうは 雨が ___ 。",
      studentFeedback: "Typo in Option B. It says 'furimasu' instead of the past negative format required by 'kinou'.",
      reportedBy: "UGC0423882",
      status: "open",
      createdAt: "2026-06-10T08:05:00Z"
    }
  ]);

  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionLoading, setResolutionLoading] = useState(null);

  // 2. STATE MUTATION: Simulates marking a dispute as resolved
  const handleResolveDispute = async (disputeId) => {
    setResolutionLoading(disputeId);
    
    // Simulating API network lag execution block
    setTimeout(() => {
      setDisputes(prev => prev.filter(item => item.id !== disputeId));
      setSelectedDispute(null);
      setResolutionLoading(null);
      alert("Dispute resolved and verified successfully! Mutation synced.");
    }, 1200);
  };

  return (
    <div className="space-y-8 bg-[#060d1f] min-h-screen text-white">
      {/* Dynamic Header Frame Component */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
              Content Dispute Management
            </h1>
            <p className="text-gray-400 mt-1">Review, audit, and resolve student flags regarding incorrect answer keys or typos</p>
          </div>
          {disputes.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-amber-300 text-sm font-medium">{disputes.length} Open Flags Awaiting Evaluation</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Stream Queue Layer */}
      <div className="space-y-4">
        {disputes.length === 0 ? (
          <div className="p-8 text-center bg-white/2 rounded-2xl border border-white/5 space-y-2">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto animate-bounce" />
            <p className="text-gray-300 font-medium">All Content Disputes Cleared</p>
            <p className="text-xs text-gray-500">Instructors and students are completely aligned on academic materials.</p>
          </div>
        ) : (
          disputes.map((disp, index) => (
            <motion.div
              key={disp.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <GlassCard className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-white/10 hover:border-amber-500/20 transition-all">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color="amber">Status: Open Flag</Badge>
                    <span className="text-xs text-gray-500 font-mono">Exam ID: {disp.examId}</span>
                  </div>
                  <h3 className="font-bold text-lg text-white truncate">{disp.examTitle}</h3>
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-xs text-blue-400 font-medium mb-1">Reported Question Context:</p>
                    <p className="text-sm font-sans text-gray-200">{disp.questionText}</p>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 italic">
                    " {disp.studentFeedback} "
                  </p>
                </div>

                {/* Micro Action Buttons Matrix */}
                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedDispute(disp)}
                    className="text-xs border border-white/10 text-gray-300 gap-1.5"
                  >
                    <Eye size={14} /> Audit Details
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    disabled={resolutionLoading === disp.id}
                    onClick={() => handleResolveDispute(disp.id)}
                    className="text-xs font-semibold"
                  >
                    {resolutionLoading === disp.id ? "Resolving..." : "Mark Resolved"}
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0f1629] border border-white/10 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Context Branding Header */}
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-2 text-amber-400">
                  <ShieldAlert size={18} />
                  <h3 className="font-semibold text-white text-sm">Dispute Investigation Audit Trail</h3>
                </div>
                <button 
                  onClick={() => setSelectedDispute(null)} 
                  className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Central Core Inspection Content Field */}
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Originating Package Target</p>
                  <h4 className="text-lg font-bold text-white mt-0.5">{selectedDispute.examTitle}</h4>
                </div>

                <div className="p-4 bg-black/30 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                    Flagged Question String
                  </span>
                  <p className="text-base text-gray-200 pt-1 font-medium">{selectedDispute.questionText}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <MessageSquare size={14} />
                    <span className="font-semibold">Student Feedback & Argument Parameters:</span>
                  </div>
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <p className="text-sm text-amber-200/90 leading-relaxed italic">
                      "{selectedDispute.studentFeedback}"
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 text-xs text-gray-500 border-t border-white/5">
                  <span>Reported By: Student UID <strong className="text-gray-400 font-mono">{selectedDispute.reportedBy}</strong></span>
                  <span>Logged Date: {new Date(selectedDispute.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Bottom Action Footer Control Panel */}
              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedDispute(null)} className="text-xs border border-white/10 text-gray-300">
                  Close Review
                </Button>
                <Button 
                  variant="success" 
                  size="sm" 
                  disabled={resolutionLoading === selectedDispute.id}
                  onClick={() => handleResolveDispute(selectedDispute.id)}
                  className="text-xs font-semibold px-4"
                >
                  {resolutionLoading === selectedDispute.id ? "Syncing..." : "Resolve & Close Issue"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}