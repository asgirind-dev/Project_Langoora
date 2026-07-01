import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronLeft, BookOpen, Plus, Trash2, 
  GripVertical, Upload, Save, Send, CheckCircle, 
  Mic, ShieldAlert, Loader, X, AlertCircle
} from 'lucide-react';
import { createTutorExam } from '../../services/examService';
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
    title: '', category_id: '', level_id: '', duration_minutes: '', description: '', thumbnail: ''
  });
  
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

  useEffect(() => {
    const syncSchemaMatrix = async () => {
      try {
        setGlobalLoading(true);
        const responseData = await fetchActiveExamSchema();
        
        // 🎯 Safe check if response has .schema or if it is a direct array
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

  const handleCategoryChange = (catId) => {
    setMeta(p => ({ ...p, category_id: catId, level_id: '' }));
    
    // 🎯 Firestore document ID එක හෝ category_name එක සමානද කියා බැලීම
    const targetCluster = activeSchema.find(c => c.id === catId || c.category_name === catId);
    if (targetCluster && targetCluster.levels) {
      setAvailableLevels(targetCluster.levels);
    } else {
      setAvailableLevels([]);
    }
  };

  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMeta(p => ({ ...p, thumbnail: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const addSection = () => setSections(p => [...p, { id: Date.now(), name: 'New Section', questions: 10, time: 15 }]);
  const removeSection = (id) => setSections(p => p.filter(s => s.id !== id));
  const updateSection = (id, field, val) => setSections(p => p.map(s => s.id === id ? { ...s, [field]: val } : s));

  const addQuestion = () => {
    const newQ = { id: Date.now(), section: sections[0]?.name || 'Grammar', type: 'mcq', text: '', options: ['', '', '', ''], correct: 0, explanation: '', audio_url: null, image_url: null };
    setQuestions(p => [...p, newQ]);
    setActiveQIdx(questions.length);
  };
  
  const removeQuestion = (idx) => {
    setQuestions(p => p.filter((_, i) => i !== idx));
    setActiveQIdx(Math.max(0, activeQIdx - 1));
  };
  
  const updateQ = (idx, field, val) => setQuestions(p => p.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  const updateOption = (qIdx, optIdx, val) => setQuestions(p => p.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? val : o) } : q));

  const q = questions[activeQIdx];

  const handlePublishExam = async (publishStatus = 'active') => {
    setError('');
    if (!meta.title.trim() || !meta.category_id || !meta.level_id || !meta.duration_minutes) {
      return setError('Core identification metadata parameters cannot stand void.');
    }

    try {
      setSubmitLoading(true);
      const payload = {
        ...meta,
        duration_minutes: Number(meta.duration_minutes),
        total_questions: questions.length,
        status: publishStatus,
        sections: sections.map(({ id, ...rest }) => rest),
        questions: questions.map(({ id, ...rest }) => rest)
      };

      const result = await createTutorExam(payload);
      if (result.success) {
        showNotification(`Exam matrix saved as [${publishStatus}] successfully!`);
        setTimeout(() => navigate('/tutor'), 1500);
      }
    } catch (err) {
      setError(err.message || 'Execution exception node failed.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (globalLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3 text-slate-400">
        <Loader className="animate-spin text-blue-500" size={32} />
        <span className="animate-pulse text-xs font-mono tracking-widest uppercase">Synchronizing Platform Active Schema Matrices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl text-white relative">
      
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
              <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">Exam Config Node</p>
              <p className="text-xs font-semibold mt-0.5 leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => setToast(p => ({ ...p, show: false }))} className="text-slate-400 hover:text-white transition-colors ml-2">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">Create Exam</h1>
        <p className="text-gray-400 text-xs mt-0.5">Build, map, and deploy official structural mock templates</p>
      </motion.div>

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
          
          {step === 0 && (
            <GlassCard className="p-6 space-y-5 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl">
              <h2 className="text-base font-bold text-white uppercase tracking-wider mb-2">Exam Vector Identification</h2>
              {error && <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold"><ShieldAlert size={14}/>{error}</div>}
              
              <Input label="Exam Title" placeholder="e.g., JLPT N4 Official Realistic Mock Exam - Paper 01" value={meta.title} onChange={e => setMeta(p => ({ ...p, title: e.target.value }))} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Cluster Category</label>
                  <select value={meta.category_id} onChange={e => handleCategoryChange(e.target.value)} className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
                    <option value="" className="bg-[#070c19]">Select Language Cluster</option>
                    {activeSchema && activeSchema.map(c => (
                      <option key={c.id || c.category_name} value={c.id || c.category_name} className="bg-[#070c19]">
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Target Structural Level</label>
                  <select disabled={availableLevels.length === 0} value={meta.level_id} onChange={e => setMeta(p => ({ ...p, level_id: e.target.value }))} className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 disabled:opacity-40">
                    <option value="" className="bg-[#070c19]">Select Mapped Level</option>
                    {availableLevels.map(l => (
                      <option key={l.id || l.level_name} value={l.id || l.level_name} className="bg-[#070c19]">
                        {l.level_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <Input label="Duration (Total minutes)" type="number" placeholder="105" value={meta.duration_minutes} onChange={e => setMeta(p => ({ ...p, duration_minutes: e.target.value }))} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Strategic Overview Description</label>
                <textarea rows={4} placeholder="Describe what components students will evaluate inside this bundle mapping..."
                  value={meta.description} onChange={e => setMeta(p => ({ ...p, description: e.target.value }))}
                  className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/50 resize-none" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Thumbnail Image</label>
                <label className="flex items-center gap-3 px-4 py-5 bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/30 transition-colors relative overflow-hidden h-24">
                  {meta.thumbnail ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <img src={meta.thumbnail} alt="Thumbnail preview" className="h-full w-full object-cover" />
                      <div className="absolute bg-black/60 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md text-white">Change Image</div>
                    </div>
                  ) : (
                    <>
                      <Upload size={20} className="text-blue-400" />
                      <span className="text-xs text-gray-400">Click to upload mock exam cover thumbnail</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                </label>
              </div>
            </GlassCard>
          )}

          {step === 1 && (
            <GlassCard className="p-6 space-y-5 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h2 className="text-base font-bold uppercase tracking-wider">Operational Category Partitioning</h2>
                <Button variant="secondary" size="sm" onClick={addSection} className="bg-white/5 border-white/10 text-gray-300"><Plus size={14} /> Add Section Node</Button>
              </div>
              <div className="space-y-3">
                {sections.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-4 bg-slate-950/40 rounded-2xl border border-white/5">
                    <GripVertical size={16} className="text-slate-600 cursor-grab flex-shrink-0" />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input placeholder="Section Segment Name" value={s.name} onChange={e => updateSection(s.id, 'name', e.target.value)} />
                      <Input type="number" placeholder="Target Evaluation Bound Count" value={s.questions} onChange={e => updateSection(s.id, 'questions', e.target.value)} />
                      <Input type="number" placeholder="Allocated Block Time (min)" value={s.time} onChange={e => updateSection(s.id, 'time', e.target.value)} />
                    </div>
                    <button onClick={() => removeSection(s.id)} className="text-rose-400 hover:text-rose-300 p-1 flex-shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl flex justify-between text-xs font-mono font-bold tracking-wide uppercase">
                <div>Total Partition Bounds: <span className="text-blue-400 ml-1">{sections.reduce((s, r) => s + Number(r.questions), 0)} Qs</span></div>
                <div>Aggregated Operational Time: <span className="text-blue-400 ml-1">{sections.reduce((s, r) => s + Number(r.time), 0)} Mins</span></div>
              </div>
            </GlassCard>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              <div className="lg:col-span-1 space-y-2">
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Index Nodes ({questions.length})</h3>
                  <button onClick={addQuestion} className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-all"><Plus size={13} /></button>
                </div>
                <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin">
                  {questions.map((q, i) => (
                    <button key={q.id} onClick={() => setActiveQIdx(i)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs font-semibold block ${activeQIdx === i ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-slate-900/30 text-gray-400 hover:border-white/10'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span>Query Block #{i + 1}</span>
                        <Badge color="blue" className="text-[9px] font-bold font-mono">{q.section}</Badge>
                      </div>
                      {q.text && <p className="text-[10px] opacity-60 truncate font-light">{q.text}</p>}
                    </button>
                  ))}
                </div>
              </div>

              <GlassCard className="lg:col-span-3 p-6 space-y-5 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">Evaluation Element Workspace #{activeQIdx + 1}</h3>
                  <button onClick={() => removeQuestion(activeQIdx)} disabled={questions.length === 1} className="text-rose-400 hover:text-rose-300 disabled:opacity-30">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Target Section Bound</label>
                    <select value={q.section} onChange={e => updateQ(activeQIdx, 'section', e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none">
                      {sections.map(s => <option key={s.id} value={s.name} className="bg-[#070c19]">{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Evaluation Type Matrix</label>
                    <select value={q.type} onChange={e => updateQ(activeQIdx, 'type', e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none">
                      <option value="mcq" className="bg-[#070c19]">Multiple Choice Question (MCQ)</option>
                      <option value="typed" className="bg-[#070c19]">Typed Response Node</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Question Content String</label>
                  <textarea rows={3} placeholder="Provide question data expression block..." value={q.text} onChange={e => updateQ(activeQIdx, 'text', e.target.value)}
                    className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-blue-500/50 resize-none" />
                </div>

                {q.type === 'mcq' && (
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
                          type="text" placeholder={`Option Expression ${String.fromCharCode(65 + j)}`}
                          value={opt} onChange={e => updateOption(activeQIdx, j, e.target.value)}
                          className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-500 font-mono tracking-wide italic">Target letters represent correct vector indices.</p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Structural Explanation Sequence</label>
                  <textarea rows={2} placeholder="Provide logical sequence resolution details..." value={q.explanation} onChange={e => updateQ(activeQIdx, 'explanation', e.target.value)}
                    className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-blue-500/50 resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/30 transition-colors">
                    <Upload size={14} className="text-blue-400" />
                    <span className="text-xs text-slate-400">Attach Static Asset (.png, .jpg)</span>
                    <input type="file" accept="image/*" className="hidden" />
                  </label>
                  <label className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/30 transition-colors">
                    <Mic size={14} className="text-blue-400" />
                    <span className="text-xs text-slate-400">Attach Listening Asset Room (.mp3)</span>
                    <input type="file" accept="audio/*" className="hidden" />
                  </label>
                </div>
              </GlassCard>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <GlassCard className="p-6 bg-white/[0.01] border-white/5 shadow-2xl rounded-3xl space-y-6">
                <h2 className="text-base font-bold uppercase tracking-wider border-b border-white/5 pb-2">Final Matrix Assembly Summary</h2>
                {error && <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold"><ShieldAlert size={14}/>{error}</div>}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Exam Node Title', value: meta.title || 'Draft Node Layer' },
                    { label: 'Cluster Mapping Group', value: meta.category_id ? meta.category_id.toUpperCase() : 'Void Node' },
                    { label: 'Aggregated Quantities', value: `${questions.length} Items Mapped` },
                    { label: 'Execution Level Target', value: meta.level_id ? meta.level_id.toUpperCase() : 'Void' },
                  ].map((s, i) => (
                    <div key={i} className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl shadow-md">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-xs font-bold text-slate-200 truncate">{s.value}</p>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Partition Layout Layer Validation</h4>
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