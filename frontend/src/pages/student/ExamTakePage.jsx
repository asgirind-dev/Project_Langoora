import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, Flag, CheckCircle, Mic, SkipForward, Send, LayoutGrid, X, Loader2 } from 'lucide-react';
import axios from 'axios'; // 🔌 Axios import කරන ලදී
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

const mockQuestions = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  section: i < 6 ? 'Grammar' : i < 12 ? 'Vocabulary' : i < 16 ? 'Listening' : 'Reading',
  type: 'mcq',
  text: i < 6
    ? `Grammar Question ${i + 1}: Choose the correct form of the verb in the given context.`
    : i < 12
    ? `Vocabulary Question ${i - 5}: Select the best synonym for the underlined word in the sentence.`
    : i < 16
    ? `Listening Question ${i - 11}: What is the main topic of the conversation you just heard?`
    : `Reading Question ${i - 15}: According to the passage, what does the author suggest about the topic?`,
  options: ['Option A — correct usage form', 'Option B — incorrect form', 'Option C — alternative form', 'Option D — wrong pattern'],
  audio: i >= 12 && i < 16,
}));

const sections = ['All', 'Grammar', 'Vocabulary', 'Listening', 'Reading'];

export default function ExamTakePage() {
  const { id } = useParams(); // 🆔 මේක තමයි purchased_exams document ID එක (Purchase ID)
  const navigate = useNavigate();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(105 * 60);
  const [paletteSection, setPaletteSection] = useState('All');
  const [submitModal, setSubmitModal] = useState(false);
  const [tabWarning, setTabWarning] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 🔄 Loading state
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0) { 
          clearInterval(intervalRef.current); 
          handleSubmit(); // ⏰ වෙලාව ඉවර වුනොත් Auto Submit වෙනවා
          return 0; 
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) setTabWarning(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const q = mockQuestions[currentQ];
  const answered = Object.keys(answers).length;
  const filteredQs = paletteSection === 'All' ? mockQuestions : mockQuestions.filter(q => q.section === paletteSection);

  const timeColor = timeLeft < 300 ? 'text-red-400' : timeLeft < 900 ? 'text-yellow-400' : 'text-emerald-400';

  // 🔌 5. Submit handle කරන සැබෑ API Connection එක:
  const handleSubmit = async () => {
    setSubmitModal(false);
    setIsSubmitting(true);
    clearInterval(intervalRef.current);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert("Session expired. Please login again.");
        navigate('/login');
        return;
      }

      // Backend API එකට POST Request එක යැවීම
      const response = await axios.post(
        `http://localhost:5000/api/exams/submit/${id}`, 
        { answers }, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        alert(`Exam submitted successfully! Your Score: ${response.data.score}% 🎉`);
        // ලකුණු පෙන්වන Results Page එකට යවනවා (score එකත් එක්ක)
        navigate(`/exam/${id}/results`, { state: { score: response.data.score } });
      }
    } catch (error) {
      console.error("Error submitting exam:", error);
      alert(error.response?.data?.message || "Failed to submit exam. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030810] text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-[#030810]/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3">
          <div className="min-w-0 flex-1 mr-3">
            <h2 className="font-semibold text-white text-sm truncate">JLPT N2 Full Mock Exam 2024</h2>
            <p className="text-xs text-gray-400 hidden sm:block">{q.section} Section · Q{currentQ + 1}/{mockQuestions.length}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
            <div className={`flex items-center gap-1.5 font-mono font-bold text-base sm:text-xl ${timeColor}`}>
              <Clock size={16} className="hidden sm:block" />
              {formatTime(timeLeft)}
            </div>
            <div className="text-center hidden sm:block">
              <div className="text-sm font-semibold text-white">{answered}/{mockQuestions.length}</div>
              <div className="text-xs text-gray-400">Done</div>
            </div>
            <button onClick={() => setPaletteOpen(true)} className="lg:hidden p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10">
              <LayoutGrid size={16} className="text-gray-300" />
            </button>
            <Button variant="danger" size="sm" onClick={() => setSubmitModal(true)} className="hidden sm:flex" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setSubmitModal(true)} className="sm:hidden" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
            style={{ width: `${((currentQ + 1) / mockQuestions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-gray-300 text-sm">Evaluating answers and saving score...</p>
        </div>
      )}

      <div className="flex pt-[68px] min-h-screen">
        {/* Main Question Area */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 lg:max-w-3xl lg:mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/30">{q.section}</span>
                <span className="text-gray-500 text-xs sm:text-sm">Q{currentQ + 1}</span>
                {flagged.has(q.id) && <span className="flex items-center gap-1 text-amber-400 text-xs"><Flag size={11} /> Flagged</span>}
              </div>

              {q.audio && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 sm:gap-4">
                  <button
                    onClick={() => setAudioPlaying(!audioPlaying)}
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-400 transition-colors flex-shrink-0"
                  >
                    {audioPlaying ? <SkipForward size={16} className="text-white" /> : <Mic size={16} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-300 mb-2">Audio Track {currentQ - 11}</p>
                    <div className="h-1.5 bg-white/10 rounded-full">
                      <div className="h-full w-1/3 bg-blue-500 rounded-full" />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">0:45 / 1:20</span>
                </div>
              )}

              <div className="mb-6 sm:mb-8">
                <h3 className="text-base sm:text-xl font-semibold text-white leading-relaxed">{q.text}</h3>
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                {q.options.map((opt, i) => {
                  const selected = answers[q.id] === i;
                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setAnswers(p => ({ ...p, [q.id]: i }))}
                      className={`w-full text-left p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 flex items-center gap-3 sm:gap-4 ${
                        selected
                          ? 'border-blue-500/70 bg-blue-500/15 text-white'
                          : 'border-white/10 bg-white/3 text-gray-300 hover:border-white/20 hover:bg-white/6'
                      }`}
                    >
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 transition-all ${
                        selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-white/20 text-gray-400'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-xs sm:text-sm leading-relaxed">{opt}</span>
                      {selected && <CheckCircle size={16} className="ml-auto text-blue-400 flex-shrink-0" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
            <Button variant="secondary" size="sm" disabled={currentQ === 0} onClick={() => setCurrentQ(p => p - 1)}>
              <ChevronLeft size={14} /> <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant={flagged.has(q.id) ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFlagged(p => { const s = new Set(p); s.has(q.id) ? s.delete(q.id) : s.add(q.id); return s; })}
            >
              <Flag size={14} className={flagged.has(q.id) ? 'text-amber-400' : ''} />
              <span className="hidden sm:inline ml-1">{flagged.has(q.id) ? 'Unflag' : 'Flag'}</span>
            </Button>
            <Button variant="primary" size="sm" disabled={currentQ === mockQuestions.length - 1} onClick={() => setCurrentQ(p => p + 1)}>
              <span className="hidden sm:inline">Next</span> <ChevronRight size={14} />
            </Button>
          </div>
        </div>

        {/* Question Palette - Desktop */}
        <div className="hidden lg:block w-64 xl:w-72 flex-shrink-0 p-5 border-l border-white/10 fixed right-0 top-[68px] bottom-0 overflow-y-auto bg-[#060d1f]/50">
          <PaletteContent
            sections={sections}
            paletteSection={paletteSection}
            setPaletteSection={setPaletteSection}
            filteredQs={filteredQs}
            mockQuestions={mockQuestions}
            answers={answers}
            flagged={flagged}
            currentQ={currentQ}
            setCurrentQ={setCurrentQ}
            answered={answered}
          />
        </div>
      </div>

      {/* Question Palette - Mobile Drawer */}
      <AnimatePresence>
        {paletteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setPaletteOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#060d1f] border-l border-white/10 z-50 lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold text-white text-sm">Question Navigator</h3>
                <button onClick={() => setPaletteOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="p-4">
                <PaletteContent
                  sections={sections}
                  paletteSection={paletteSection}
                  setPaletteSection={setPaletteSection}
                  filteredQs={filteredQs}
                  mockQuestions={mockQuestions}
                  answers={answers}
                  flagged={flagged}
                  currentQ={currentQ}
                  setCurrentQ={(idx) => { setCurrentQ(idx); setPaletteOpen(false); }}
                  answered={answered}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tab Warning */}
      <AnimatePresence>
        {tabWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/20 border border-red-500/50 text-red-300 px-4 sm:px-6 py-3 rounded-xl flex items-center gap-3 max-w-sm"
          >
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span className="text-sm">Tab switching detected!</span>
            <button onClick={() => setTabWarning(false)} className="ml-2 text-red-400 hover:text-white flex-shrink-0">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Modal */}
      <Modal isOpen={submitModal} onClose={() => setSubmitModal(false)} title="Submit Exam?">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="text-2xl font-bold text-emerald-400">{answered}</div>
              <div className="text-xs text-gray-400">Answered</div>
            </div>
            <div className="text-center p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="text-2xl font-bold text-amber-400">{flagged.size}</div>
              <div className="text-xs text-gray-400">Flagged</div>
            </div>
            <div className="text-center p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-2xl font-bold text-white">{mockQuestions.length - answered}</div>
              <div className="text-xs text-gray-400">Unanswered</div>
            </div>
          </div>
          {mockQuestions.length - answered > 0 && (
            <p className="text-amber-300 text-sm flex items-center gap-2"><AlertTriangle size={14} />{mockQuestions.length - answered} questions are unanswered.</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setSubmitModal(false)}>Continue Exam</Button>
            <Button variant="primary" fullWidth onClick={handleSubmit}>Submit Now</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PaletteContent({ sections, paletteSection, setPaletteSection, filteredQs, mockQuestions, answers, flagged, currentQ, setCurrentQ, answered }) {
  return (
    <>
      <h4 className="text-sm font-semibold text-gray-300 mb-3">Question Navigator</h4>
      <div className="flex flex-wrap gap-1 mb-4">
        {sections.map(s => (
          <button key={s} onClick={() => setPaletteSection(s)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${paletteSection === s ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {filteredQs.map(fq => {
          const idx = mockQuestions.indexOf(fq);
          const isAnswered = answers[fq.id] !== undefined;
          const isFlagged = flagged.has(fq.id);
          const isCurrent = idx === currentQ;
          return (
            <button key={fq.id} onClick={() => setCurrentQ(idx)}
              className={`w-9 h-9 rounded-lg text-xs font-bold transition-all border ${
                isCurrent ? 'bg-blue-500 border-blue-400 text-white' :
                isFlagged ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' :
                isAnswered ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
                'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
              }`}>
              {idx + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-2 text-xs">
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-emerald-500/20 border border-emerald-500/30 rounded" /><span className="text-gray-400">Answered ({answered})</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-amber-500/20 border border-amber-500/50 rounded" /><span className="text-gray-400">Flagged ({flagged.size})</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white/5 border border-white/10 rounded" /><span className="text-gray-400">Unanswered ({mockQuestions.length - answered})</span></div>
      </div>
    </>
  );
}