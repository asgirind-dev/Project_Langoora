import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, BookOpen, Plus, Trash2, GripVertical, Upload, Eye, Save, Send, CheckCircle, Mic } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

const STEPS = ['Exam Details', 'Sections', 'Questions', 'Preview & Publish'];

export default function CreateExamPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState({
    title: '', category: '', level: '', duration: '', price: '', description: '', difficulty: 'Intermediate',
  });
  const [sections, setSections] = useState([
    { id: 1, name: 'Grammar', questions: 32, time: 25 },
    { id: 2, name: 'Vocabulary', questions: 26, time: 20 },
  ]);
  const [questions, setQuestions] = useState([
    { id: 1, section: 'Grammar', type: 'mcq', text: '', options: ['', '', '', ''], correct: 0, explanation: '', audio: null, image: null },
  ]);
  const [activeQIdx, setActiveQIdx] = useState(0);

  const addSection = () => setSections(p => [...p, { id: Date.now(), name: 'New Section', questions: 10, time: 15 }]);
  const removeSection = (id) => setSections(p => p.filter(s => s.id !== id));
  const updateSection = (id, field, val) => setSections(p => p.map(s => s.id === id ? { ...s, [field]: val } : s));

  const addQuestion = () => {
    const newQ = { id: Date.now(), section: sections[0]?.name || 'Grammar', type: 'mcq', text: '', options: ['', '', '', ''], correct: 0, explanation: '', audio: null, image: null };
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

  const categories = ['JLPT', 'EPS-TOPIK', 'IELTS', 'HSK', 'TOPIK', 'GRE', 'SAT', 'TOEFL'];
  

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Create Exam</h1>
        <p className="text-gray-400">Build and publish a new mock exam for students</p>
      </motion.div>

      {/* Step Indicator */}
      <GlassCard className="p-4">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex items-center">
              <button
                onClick={() => i < step + 1 && setStep(i)}
                className="flex items-center gap-2.5 group"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'
                }`}>
                  {i < step ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span className={`text-sm font-medium hidden md:block ${i === step ? 'text-white' : i < step ? 'text-emerald-400' : 'text-gray-400'}`}>{s}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 transition-all ${i < step ? 'bg-emerald-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          {/* Step 1: Metadata */}
          {step === 0 && (
            <GlassCard className="p-6 space-y-5">
              <h2 className="text-lg font-semibold text-white mb-2">Exam Details</h2>
              <Input label="Exam Title" placeholder="e.g., JLPT N2 Full Mock Exam 2024" value={meta.title} onChange={e => setMeta(p => ({ ...p, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-300">Category</label>
                  <select value={meta.category} onChange={e => setMeta(p => ({ ...p, category: e.target.value }))} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60">
                    <option value="" className="bg-[#0f1629]">Select Category</option>
                    {categories.map(c => <option key={c} value={c} className="bg-[#0f1629]">{c}</option>)}
                  </select>
                </div>
                <Input label="Level" placeholder="e.g., N2, Band 7, Level 5" value={meta.level} onChange={e => setMeta(p => ({ ...p, level: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <Input label="Duration (minutes)" type="number" placeholder="105" value={meta.duration} onChange={e => setMeta(p => ({ ...p, duration: e.target.value }))} />
                <Input label="Price (LKR)" type="number" placeholder="2500" value={meta.price} onChange={e => setMeta(p => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Difficulty</label>
                <div className="flex gap-3">
                  {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(d => (
                    <button key={d} type="button" onClick={() => setMeta(p => ({ ...p, difficulty: d }))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${meta.difficulty === d ? 'bg-blue-500 text-white' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <textarea
                  rows={4} placeholder="Describe what students will practice in this exam..."
                  value={meta.description} onChange={e => setMeta(p => ({ ...p, description: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/60 resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Thumbnail Image</label>
                <label className="flex items-center gap-3 px-4 py-5 bg-white/5 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-blue-500/40 transition-colors">
                  <Upload size={20} className="text-blue-400" />
                  <span className="text-sm text-gray-400">Click to upload thumbnail image</span>
                  <input type="file" accept="image/*" className="hidden" />
                </label>
              </div>
            </GlassCard>
          )}

          {/* Step 2: Sections */}
          {step === 1 && (
            <GlassCard className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Exam Sections</h2>
                <Button variant="secondary" size="sm" onClick={addSection}><Plus size={14} /> Add Section</Button>
              </div>
              <div className="space-y-3">
                {sections.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 p-4 bg-white/3 rounded-xl border border-white/8">
                    <GripVertical size={16} className="text-gray-500 cursor-grab" />
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <Input placeholder="Section name" value={s.name} onChange={e => updateSection(s.id, 'name', e.target.value)} />
                      <Input type="number" placeholder="Questions" value={s.questions} onChange={e => updateSection(s.id, 'questions', e.target.value)} />
                      <Input type="number" placeholder="Time (min)" value={s.time} onChange={e => updateSection(s.id, 'time', e.target.value)} />
                    </div>
                    <button onClick={() => removeSection(s.id)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Questions:</span>
                  <span className="text-white font-semibold">{sections.reduce((s, r) => s + Number(r.questions), 0)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Total Duration:</span>
                  <span className="text-white font-semibold">{sections.reduce((s, r) => s + Number(r.time), 0)} min</span>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Step 3: Questions */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              {/* Question List */}
              <div className="lg:col-span-1 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">Questions ({questions.length})</h3>
                  <Button variant="primary" size="sm" onClick={addQuestion}><Plus size={12} /></Button>
                </div>
                {questions.map((q, i) => (
                  <button key={q.id} onClick={() => setActiveQIdx(i)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${activeQIdx === i ? 'border-blue-500/60 bg-blue-500/10 text-white' : 'border-white/8 bg-white/3 text-gray-400 hover:border-white/15'}`}>
                    <div className="flex items-center justify-between">
                      <span>Q{i + 1}</span>
                      <Badge color="blue" className="text-xs">{q.section}</Badge>
                    </div>
                    {q.text && <p className="text-xs mt-1 truncate text-gray-400">{q.text}</p>}
                  </button>
                ))}
              </div>

              {/* Question Editor */}
              <GlassCard className="lg:col-span-3 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Question {activeQIdx + 1}</h3>
                  <button onClick={() => removeQuestion(activeQIdx)} className="text-red-400 hover:text-red-300">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-300">Section</label>
                    <select value={q.section} onChange={e => updateQ(activeQIdx, 'section', e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                      {sections.map(s => <option key={s.id} value={s.name} className="bg-[#0f1629]">{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-300">Type</label>
                    <select value={q.type} onChange={e => updateQ(activeQIdx, 'type', e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                      <option value="mcq" className="bg-[#0f1629]">Multiple Choice</option>
                      <option value="typed" className="bg-[#0f1629]">Typed Answer</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-300">Question Text</label>
                  <textarea rows={3} placeholder="Enter your question here..." value={q.text} onChange={e => updateQ(activeQIdx, 'text', e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/60 resize-none" />
                </div>

                {q.type === 'mcq' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300">Answer Options</label>
                    {q.options.map((opt, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateQ(activeQIdx, 'correct', j)}
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                            q.correct === j ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-white/20 text-gray-400 hover:border-white/40'
                          }`}
                        >
                          {String.fromCharCode(65 + j)}
                        </button>
                        <input
                          type="text" placeholder={`Option ${String.fromCharCode(65 + j)}`}
                          value={opt} onChange={e => updateOption(activeQIdx, j, e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/60"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">Click a letter to mark the correct answer</p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-300">Explanation</label>
                  <textarea rows={2} placeholder="Explain the correct answer..." value={q.explanation} onChange={e => updateQ(activeQIdx, 'explanation', e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/60 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-blue-500/40 transition-colors">
                    <Upload size={16} className="text-blue-400" />
                    <span className="text-xs text-gray-400">Upload Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => updateQ(activeQIdx, 'image', e.target.files[0])} />
                  </label>
                  <label className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-blue-500/40 transition-colors">
                    <Mic size={16} className="text-blue-400" />
                    <span className="text-xs text-gray-400">Upload Audio</span>
                    <input type="file" accept="audio/*" className="hidden" onChange={e => updateQ(activeQIdx, 'audio', e.target.files[0])} />
                  </label>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Step 4: Preview & Publish */}
          {step === 3 && (
            <div className="space-y-6">
              <GlassCard className="p-6">
                <h2 className="text-lg font-semibold text-white mb-5">Exam Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  {[
                    { label: 'Title', value: meta.title || 'Untitled Exam' },
                    { label: 'Category', value: meta.category || 'Not set' },
                    { label: 'Total Questions', value: questions.length },
                    { label: 'Price', value: meta.price ? `LKR ${Number(meta.price).toLocaleString()}` : 'Not set' },
                  ].map((s, i) => (
                    <div key={i} className="p-3 bg-white/3 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                      <p className="text-sm font-semibold text-white">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {sections.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/3 rounded-xl text-sm">
                      <span className="text-gray-300">{s.name}</span>
                      <div className="flex gap-4 text-gray-400">
                        <span>{s.questions} questions</span>
                        <span>{s.time} min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <div className="flex gap-4">
                <Button variant="secondary" size="lg" onClick={() => navigate('/tutor/exams')}>
                  <Save size={18} /> Save as Draft
                </Button>
                <Button variant="primary" size="lg" onClick={() => { navigate('/tutor'); }}>
                  <Send size={18} /> Publish Exam
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep(p => p - 1)}>
          <ChevronLeft size={16} /> Previous
        </Button>
        {step < STEPS.length - 1 && (
          <Button variant="primary" onClick={() => setStep(p => p + 1)}>
            Next <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
