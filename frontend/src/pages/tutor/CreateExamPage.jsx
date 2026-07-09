import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronLeft, BookOpen, Plus, Trash2, 
  GripVertical, Upload, Save, Send, CheckCircle, 
  Mic, ShieldAlert, Loader, X, AlertCircle, Info
} from 'lucide-react';
import { createTutorExam , uploadExamAsset } from '../../services/examService';
import { fetchActiveExamSchema } from '../../services/languageService';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

const STEPS = ['Exam Details', 'Sections', 'Questions', 'Preview & Publish'];

export default function CreateExamPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  
  const [activeSchema, setActiveSchema] = useState([]);
  const [availableLevels, setAvailableLevels] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [error, setError] = useState('');

  const [meta, setMeta] = useState({
    title: '', category_id: '', level_id: '', duration_minutes: 0, description: '', thumbnail: ''
  });
  
  // 🧭 Default initial sections setup
  const [sections, setSections] = useState([
    { id: 1, name: 'Grammar', questions: 10, time: 25 },
  ]);
  
  const [questions, setQuestions] = useState([
    { id: 1, section: 'Grammar', type: 'mcq', text: '', options: ['', '', '', ''], correct: 0, explanation: '', audio_url: null, image_url: null },
  ]);
  
  const [activeQIdx, setActiveQIdx] = useState(0);

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // 📡 API Connection: Fetch Active Categories/Schema from Backend
  useEffect(() => {
    const syncSchemaMatrix = async () => {
      try {
        setGlobalLoading(true);
        const responseData = await fetchActiveExamSchema();
        
        let extractedSchema = [];
        if (responseData && responseData.success && Array.isArray(responseData.schema)) {
          extractedSchema = responseData.schema;
        } else if (Array.isArray(responseData)) {
          extractedSchema = responseData;
        } else if (responseData && Array.isArray(responseData.schema)) {
          extractedSchema = responseData.schema;
        }
        
        setActiveSchema(extractedSchema);
      } catch (err) {
        console.error("Schema Fetch Error:", err);
        showNotification(err.message || 'Matrix sync connection dropped.', 'error');
      } finally {
        setGlobalLoading(false);
      }
    };
    syncSchemaMatrix();
  }, []);

  // 🔄 💥 Auto-Calculate Total Duration from Sections
  useEffect(() => {
    const totalTime = sections.reduce((sum, currentSec) => sum + Number(currentSec.time || 0), 0);
    setMeta(p => ({ ...p, duration_minutes: totalTime }));
  }, [sections]);

  // 🎯 Handle Category Change + Auto Setup Sections for JLPT (Empty Inputs)
  const handleCategoryChange = (catId) => {
    setMeta(p => ({ ...p, category_id: catId, level_id: '' }));
    
    const targetCluster = activeSchema.find(c => c.id === catId || c.category_name === catId);
    
    // JLPT Fallback options setup (N1-N5) dynamic levels mapping
    if (targetCluster && targetCluster.levels && targetCluster.levels.length > 0) {
      setAvailableLevels(targetCluster.levels);
    } else if (catId.toUpperCase() === 'JLPT' || (targetCluster && targetCluster.category_name.toUpperCase() === 'JLPT')) {
      setAvailableLevels([
        { id: 'n5', level_name: 'N5 (Beginner)' },
        { id: 'n4', level_name: 'N4 (Basic)' },
        { id: 'n3', level_name: 'N3 (Intermediate)' },
        { id: 'n2', level_name: 'N2 (Pre-Advanced)' },
        { id: 'n1', level_name: 'N1 (Advanced)' }
      ]);
    } else {
      setAvailableLevels([]);
    }

    // 🔥 🧠 JLPT වුණොත් inputs හිස්ව (Tutor ටම fill කරන්න) සෙක්ෂන් 3ක් හදනවා:
    const isJlpt = catId.toUpperCase() === 'JLPT' || (targetCluster && targetCluster.category_name.toUpperCase() === 'JLPT');
    if (isJlpt) {
      setSections([
        { id: Date.now() + 1, name: 'Vocabulary', questions: '', time: '' },
        { id: Date.now() + 2, name: 'Grammar', questions: '', time: '' },
        { id: Date.now() + 3, name: 'Listening', questions: '', time: '' }
      ]);
      // Update first question's section to match standard JLPT workspace
      setQuestions(p => p.map((q, idx) => idx === 0 ? { ...q, section: 'Vocabulary' } : q));
    } else {
      // Default fallback for other general clusters
      setSections([{ id: Date.now(), name: 'General Section', questions: '', time: '' }]);
    }
  };

  // 📷 Cloud Thumbnail Upload for Exam Cover
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showNotification('Uploading exam cover image...', 'info');
      
      // 📡 API එක හරහා Thumbnail File එක යවනවා
      const result = await uploadExamAsset(file);
      
      if (result && result.success) {
        // ලැබෙන public URL එක meta data වල thumbnail එකට දානවා
        setMeta(p => ({ ...p, thumbnail: result.fileUrl })); 
        showNotification('Exam cover uploaded successfully!', 'success');
      }
    } catch (err) {
      console.error("Thumbnail Cloud Upload Error:", err);
      showNotification(err.message || 'Image cloud upload failed.', 'error');
    }
  };

  const addSection = () => setSections(p => [...p, { id: Date.now(), name: 'New Section Block', questions: 10, time: 15 }]);
  const removeSection = (id) => setSections(p => p.filter(s => s.id !== id));
  const updateSection = (id, field, val) => setSections(p => p.map(s => s.id === id ? { ...s, [field]: val } : s));

  // ➕ Add Question to a Specific Section Block
  const addQuestion = (sectionName) => {
    const targetSection = sections.find(s => s.name === sectionName);
    const currentQsInSection = questions.filter(q => q.section === sectionName).length;
    
    // 🛑 Block adding if it exceeds the limit set in Phase 02
    if (currentQsInSection >= Number(targetSection.questions)) {
      showNotification(`Maximum limit of ${targetSection.questions} questions reached for ${sectionName}.`, 'error');
      return;
    }

    const newQ = { 
      id: Date.now(), 
      section: sectionName, 
      type: 'mcq', 
      text: '', 
      options: ['', '', '', ''], 
      correct: 0, 
      explanation: '', 
      image_url: null 
    };
    
    setQuestions(p => [...p, newQ]);
    setActiveQIdx(questions.length); // Focus on the new question
  };

  // 🎵 Cloud Master Audio Upload for Listening Block
  const handleSectionAudioUpload = async (sectionId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showNotification('Uploading audio track to cloud storage...', 'info');
      
      // 📡 API එක හරහා Firebase Storage එකට File එක යවනවා
      const result = await uploadExamAsset(file);
      
      if (result && result.success) {
        // Backend එකෙන් ලැබෙන public URL එක section එකට සෙට් කරනවා
        updateSection(sectionId, 'audio_url', result.fileUrl); 
        showNotification('Master Audio uploaded and attached successfully!', 'success');
      }
    } catch (err) {
      console.error("Audio Cloud Upload Error:", err);
      showNotification(err.message || 'Audio cloud upload failed.', 'error');
    }
  };
  
  const removeQuestion = (idx) => {
    setQuestions(p => p.filter((_, i) => i !== idx));
    setActiveQIdx(Math.max(0, activeQIdx - 1));
  };
  
  const updateQ = (idx, field, val) => setQuestions(p => p.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  const updateOption = (qIdx, optIdx, val) => setQuestions(p => p.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? val : o) } : q));

  // 📡 Commit Payload Data and Trigger Backend Core Controller
  const handlePublishExam = async (statusType) => {
    try {
      setError('');
      setSubmitLoading(true);

      if (!meta.title.trim()) throw new Error('Exam Architecture Node requires a Title.');
      if (!meta.category_id) throw new Error('Language Cluster mapping is missing.');
      if (!meta.level_id) throw new Error('Target Structural Level mapping is missing.');

      const examPayload = {
        title: meta.title.trim(),
        category_id: meta.category_id,
        level_id: meta.level_id,
        duration_minutes: Number(meta.duration_minutes),
        description: meta.description,
        status: statusType, // 'draft' or 'active'
        sections: sections.map(s => ({
          name: s.name,
          questions: Number(s.questions),
          time: Number(s.time),
          audio_url: s.audio_url || null
        })),
        questions: questions.map(q => ({
          section: q.section,
          type: q.type,
          text: q.text,
          options: q.options,
          correct: Number(q.correct),
          explanation: q.explanation,
          audio_url: q.audio_url,
          image_url: q.image_url
        }))
      };

      const response = await createTutorExam(examPayload);

      if (response && response.success) {
        showNotification(statusType === 'active' ? 'Exam Matrix Deployed Successfully!' : 'Blueprint saved as Draft Node!', 'success');
        setTimeout(() => navigate('/tutor/dashboard'), 2500); 
      }
    } catch (err) {
      console.error("Submission Error Matrix:", err);
      setError(err.message || 'Database blueprint commit exception occurred.');
      showNotification(err.message || 'Deployment aborted.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const q = questions[activeQIdx];

  // Frontend Axios/Fetch Example:
const deleteAudio = async (urlToDelete) => {
  try {
    const response = await axios.post('http://localhost:5000/api/exams/delete-asset', {
      fileUrl: urlToDelete // 👈 ඩිලීට් කරන්න ඕන audio එකේ සම්පූර්ණ URL එක මෙතනට දෙන්න
    });
    
    if(response.data.success) {
       alert("Audio එක Cloudinary එකෙන් මැකුණා මචං!");
       // මෙතනින් පස්සේ ඔයාගේ state එක හෝ input field එක clear කරගන්න
    }
  } catch (error) {
     console.error("Deletion failed", error);
  }
};

  return (
    <div className="space-y-6 max-w-6xl text-white relative">
      
      {/* Toast System Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, x: 60, scale: 0.9 }} 
            animate={{ opacity: 1, x: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl max-w-sm ${
              toast.type === 'success' ? 'bg-[#0f1629] border-emerald-500/30 text-emerald-200' : 'bg-[#0f1629] border-rose-500/30 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-rose-400" />}
            <div className="flex-1">
              <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">Exam Config System</p>
              <p className="text-xs font-semibold mt-0.5 leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => setToast(p => ({ ...p, show: false }))} className="text-slate-400 hover:text-white transition-colors ml-2">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">Create Exam Node</h1>
        <p className="text-gray-400 text-xs mt-0.5">Build, auto-calculate components, and deploy fully structural mock environments</p>
      </motion.div>

      {/* Progress Wizard Tracker */}
      <GlassCard className="p-4 bg-white/[0.01] border-white/5 shadow-xl">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex items-center">
              <button disabled={submitLoading} onClick={() => i < step + 1 && setStep(i)} className="flex items-center gap-2.5 group focus:outline-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10'
                }`}>
                  {i < step ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider hidden md:block ${i === step ? 'text-white' : i < step ? 'text-emerald-400' : 'text-gray-500'}`}>{s}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 transition-all ${i < step ? 'bg-emerald-500' : 'bg-white/5'}`} />
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.15 }}>
          
          {/* PHASE 01: EXAM DETAILS */}
          {step === 0 && (
            <GlassCard className="p-6 space-y-5 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl">
              <h2 className="text-base font-bold text-white uppercase tracking-wider mb-2">Exam Structural Setup</h2>
              {error && <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold"><ShieldAlert size={14}/>{error}</div>}
              
              <Input label="Exam Paper Title" placeholder="e.g., JLPT N4 Official Full Length Mock - Paper 01" value={meta.title} onChange={e => setMeta(p => ({ ...p, title: e.target.value }))} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Language Cluster Category</label>
                  <select value={meta.category_id} onChange={e => handleCategoryChange(e.target.value)} className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
                    <option value="" className="bg-[#070c19]">Select Language Cluster</option>
                    {activeSchema && activeSchema.map(c => (
                      <option key={c.id || c.category_name} value={c.id || c.category_name} className="bg-[#070c19]">
                        {c.category_name}
                      </option>
                    ))}
                    {/* Fallback option inline if collection fetch is empty during cold boot */}
                    <option value="JLPT" className="bg-[#070c19]">JLPT (Japanese Language Proficiency Test)</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Target Structural Level</label>
                  {/* 📜 Scrollable Select Dropdown Implementation */}
                  <select 
                    disabled={availableLevels.length === 0} 
                    value={meta.level_id} 
                    onChange={e => setMeta(p => ({ ...p, level_id: e.target.value }))} 
                    className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 disabled:opacity-40 max-h-40 overflow-y-auto scrollbar-thin"
                  >
                    <option value="" className="bg-[#070c19]">Select Mapped Level Node</option>
                    {availableLevels.map(l => (
                      <option key={l.id || l.level_name} value={l.id || l.level_name} className="bg-[#070c19]">
                        {l.level_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 🕒 Auto Updating Total Duration Notice Box */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Calculated Duration (Minutes)</label>
                  <div className="flex items-center gap-3 bg-slate-950/40 border border-white/10 rounded-xl px-4 py-3 text-blue-400 font-mono font-bold text-base">
                    <span>{meta.duration_minutes} Mins</span>
                    <div className="ml-auto text-[10px] uppercase bg-blue-500/10 border border-blue-500/20 text-blue-300 font-sans tracking-widest px-2 py-1 rounded-md flex items-center gap-1">
                      <Info size={12}/> Auto-Calculated via Section Segments
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Strategic Overview Description</label>
                <textarea rows={3} placeholder="Describe what components students will evaluate inside this bundle mapping..."
                  value={meta.description} onChange={e => setMeta(p => ({ ...p, description: e.target.value }))}
                  className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/50 resize-none" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Thumbnail Image Base</label>
                <label className="flex items-center gap-3 px-4 py-5 bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/30 transition-colors relative overflow-hidden h-20">
                  {meta.thumbnail ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <img src={meta.thumbnail} alt="Thumbnail preview" className="h-full w-full object-cover" />
                      <div className="absolute bg-black/60 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md text-white">Change Image Asset</div>
                    </div>
                  ) : (
                    <>
                      <Upload size={20} className="text-blue-400" />
                      <span className="text-xs text-gray-400">Click to attach mock cover matrix string</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                </label>
              </div>
            </GlassCard>
          )}

          {/* PHASE 02: OPERATIONAL SECTIONS SEPARATION */}
          {step === 1 && (
            <GlassCard className="p-6 space-y-5 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h2 className="text-base font-bold uppercase tracking-wider">Exam Segment Matrix Partitioning</h2>
                  {meta.category_id.toUpperCase() === 'JLPT' && (
                    <p className="text-emerald-400 font-mono text-[10px] mt-0.5 tracking-wider uppercase">🎯 Auto-Generated 3-Core Framework Loaded for JLPT</p>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={addSection} className="bg-white/5 border-white/10 text-gray-300"><Plus size={14} /> Insert Segment Node</Button>
              </div>

              <div className="space-y-3">
                {sections.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-4 bg-slate-950/40 rounded-2xl border border-white/5">
                    <GripVertical size={16} className="text-slate-600 flex-shrink-0" />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1 block">Component Layer Name</label>
                        <Input placeholder="e.g., Vocabulary / Grammar" value={s.name} onChange={e => updateSection(s.id, 'name', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1 block">Questions Count Bound</label>
                        <Input type="number" placeholder="Target Qs" value={s.questions} onChange={e => updateSection(s.id, 'questions', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1 block">Allocated Time Block (Mins)</label>
                        <Input type="number" placeholder="Allocated Block Mins" value={s.time} onChange={e => updateSection(s.id, 'time', e.target.value)} />
                      </div>
                    </div>
                    <button onClick={() => removeSection(s.id)} className="text-rose-400 hover:text-rose-300 p-1 flex-shrink-0 self-end mb-2">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Live Evaluation Aggregator Display */}
              <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl flex justify-between text-xs font-mono font-bold tracking-wide uppercase">
                <div>Total Operational Items: <span className="text-blue-400 ml-1">{sections.reduce((s, r) => s + Number(r.questions || 0), 0)} Items</span></div>
                <div>Aggregated Master Clock: <span className="text-blue-400 ml-1">{meta.duration_minutes} Minutes</span></div>
              </div>
            </GlassCard>
          )}

          {/* PHASE 03: QUESTIONS STRUCTURAL STRING DATA */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              
              {/* 🗂️ SIDEBAR: Evaluation Blocks Grouped by Sections */}
              <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                {sections.map(sec => {
                  const secQuestions = questions.filter(q => q.section === sec.name);
                  const isListening = sec.name.toLowerCase().includes('listen');

                  return (
                    <div key={sec.id} className="bg-slate-950/40 border border-white/5 rounded-2xl p-3">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 truncate">
                            {sec.name}
                          </h3>
                          {/* 🗑️ Quick Delete Section Option */}
                          <button 
                            onClick={() => {
                              if(window.confirm(`Are you sure you want to completely delete the ${sec.name} section and all its questions?`)) {
                                // 1. Remove all questions belonging to this section
                                setQuestions(p => p.filter(q => q.section !== sec.name));
                                // 2. Remove the section itself
                                removeSection(sec.id);
                                showNotification(`${sec.name} section completely removed.`, 'info');
                              }
                            }}
                            className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                            title={`Delete ${sec.name} Section`}
                          >
                            <X size={11} />
                          </button>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                          {secQuestions.length} / {sec.questions || 0}
                        </span>
                      </div>

                      {/* 🎵 Global Audio Upload for Listening Block */}
                      {isListening && (
                        <div className="mb-3 space-y-2">
                          <label className={`flex items-center justify-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer transition-colors text-[10px] uppercase font-bold tracking-wider ${
                            sec.audio_url ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:border-blue-500/30'
                          }`}>
                            <Mic size={12} />
                            {sec.audio_url ? 'Audio Track Attached' : 'Attach Master Audio'}
                            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleSectionAudioUpload(sec.id, e)} />
                          </label>

                          {/* 🎧 Audio Preview Player Player */}
                          {sec.audio_url && (
                            <div className="bg-slate-900/80 p-2 rounded-xl border border-white/5 space-y-1">
                              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Audio Preview
                              </p>
                              <audio 
                                src={sec.audio_url} 
                                controls 
                                className="w-full h-8 rounded-lg bg-transparent text-white filter invert opacity-80 hover:opacity-100 transition-opacity"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* 📝 List of Questions for this Section */}
                      <div className="space-y-1.5 mb-2">
                        {secQuestions.map((q, i) => {
                          // Find the absolute index of this question in the main array
                          const absoluteIdx = questions.findIndex(item => item.id === q.id);
                          return (
                            <button 
                              key={q.id} 
                              onClick={() => setActiveQIdx(absoluteIdx)}
                              className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-[11px] font-semibold flex items-center justify-between ${
                                activeQIdx === absoluteIdx ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-slate-900/30 text-gray-500 hover:border-white/10'
                              }`}
                            >
                              <span>Q {i + 1}</span>
                              {q.text ? <span className="truncate ml-2 opacity-50 font-light max-w-[100px]">{q.text}</span> : <span className="opacity-30">Empty</span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* ➕ Add Question Button */}
                      <button 
                        onClick={() => addQuestion(sec.name)}
                        disabled={secQuestions.length >= Number(sec.questions)}
                        className="w-full py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 border border-white/5 rounded-lg text-white transition-all flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider"
                      >
                        <Plus size={12} /> Add Item
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 🎯 MAIN PANEL: Edit Selected Question */}
              <GlassCard className="lg:col-span-3 p-6 space-y-5 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl">
                {questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 min-h-[300px]">
                    <BookOpen size={40} className="opacity-20 mb-3" />
                    <p className="text-sm font-semibold">No questions created yet.</p>
                    <p className="text-xs opacity-60">Click 'Add Item' in the left panel to begin.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                          Workspace Integration Node
                        </h3>
                        <Badge color="blue" className="text-[10px] font-mono">{q?.section}</Badge>
                      </div>
                      <button onClick={() => removeQuestion(activeQIdx)} disabled={questions.length === 1} className="text-rose-400 hover:text-rose-300 disabled:opacity-30">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Evaluation Mode Matrix</label>
                      <select value={q?.type || 'mcq'} onChange={e => updateQ(activeQIdx, 'type', e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none w-fit">
                        <option value="mcq" className="bg-[#070c19]">Multiple Choice Question (MCQ)</option>
                        <option value="typed" className="bg-[#070c19]">Typed Response String</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Question Content String</label>
                      <textarea rows={3} placeholder="Provide target structural expression code block..." value={q?.text || ''} onChange={e => updateQ(activeQIdx, 'text', e.target.value)}
                        className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-blue-500/50 resize-none" />
                    </div>

                    {q?.type === 'mcq' && (
                      <div className="space-y-3 bg-slate-950/20 p-4 border border-white/5 rounded-2xl">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Response Dimensions Array</label>
                        {q.options.map((opt, j) => (
                          <div key={j} className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => updateQ(activeQIdx, 'correct', j)}
                              className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                                q.correct === j ? 'border-emerald-500 bg-emerald-500 text-white shadow-md' : 'border-white/10 text-gray-500 hover:border-white/30'
                              }`}
                            >
                              {String.fromCharCode(65 + j)}
                            </button>
                            <input
                              type="text" placeholder={`Option Index Dimension ${String.fromCharCode(65 + j)}`}
                              value={opt} onChange={e => updateOption(activeQIdx, j, e.target.value)}
                              className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-blue-500/50"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Structural Explanation Sequence</label>
                      <textarea rows={2} placeholder="Provide structural resolution sequence mapping details..." value={q?.explanation || ''} onChange={e => updateQ(activeQIdx, 'explanation', e.target.value)}
                        className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-blue-500/50 resize-none" />
                    </div>

                    {/* Question Specific Image Upload */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/30 transition-colors">
                        <Upload size={14} className="text-blue-400" />
                        <span className="text-xs text-slate-400">Attach Graphic Asset Node</span>
                        <input type="file" accept="image/*" className="hidden" />
                      </label>
                    </div>
                  </>
                )}
              </GlassCard>
            </div>
          )}

          {/* PHASE 04: PREVIEW & FINAL DEPLOYMENT ASSEMBLY */}
          {step === 3 && (
            <div className="space-y-6">
              <GlassCard className="p-6 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl space-y-6">
                <h2 className="text-base font-bold uppercase tracking-wider border-b border-white/5 pb-2">Final Matrix Assembly Summary</h2>
                {error && <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold"><ShieldAlert size={14}/>{error}</div>}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Exam Node Title', value: meta.title || 'Draft Blueprint Node' },
                    { label: 'Cluster Group Matrix', value: meta.category_id ? meta.category_id.toUpperCase() : 'Void Node' },
                    { label: 'Master Clock Bound', value: `${meta.duration_minutes} Minutes` },
                    { label: 'Execution Level Target', value: meta.level_id ? meta.level_id.toUpperCase() : 'Unmapped' },
                  ].map((s, i) => (
                    <div key={i} className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl shadow-md">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-xs font-bold text-slate-200 truncate">{s.value}</p>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Partition Layer Matrix Validation</h4>
                  {sections.map((s, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-3 bg-slate-900/20 border border-white/5 rounded-xl text-xs font-medium">
                      <span className="text-slate-300 font-bold">{s.name}</span>
                      <div className="flex gap-4 text-slate-500 font-mono">
                        <span>{s.questions} Questions</span>
                        <span>{s.time} Mins</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              
              <div className="flex gap-3 justify-end">
                <button 
                  disabled={submitLoading} 
                  onClick={() => handlePublishExam('draft')} 
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider border border-white/10 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Save size={15} /> Save Blueprint Draft
                </button>
                <button 
                  disabled={submitLoading} 
                  onClick={() => handlePublishExam('active')} 
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-xs font-bold uppercase tracking-wider text-white rounded-xl shadow-lg shadow-blue-950/30 transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  {submitLoading ? <Loader size={15} className="animate-spin" /> : <Send size={15} />} Authorize & Deploy Matrix
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Footer Action Bounds */}
      <div className="flex justify-between pt-4 border-t border-white/5">
        <Button variant="secondary" disabled={step === 0 || submitLoading} onClick={() => setStep(p => p - 1)} className="bg-white/5 text-gray-400 border border-white/10">
          <ChevronLeft size={16} /> Previous Phase
        </Button>
        {step < STEPS.length - 1 && (
          <Button variant="primary" onClick={() => setStep(p => p + 1)} className="bg-blue-600 text-white">
            Advance Phase <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}