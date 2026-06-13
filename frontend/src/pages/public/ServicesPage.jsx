import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Mic, BarChart2, Award, Globe, Zap, Shield, Users,
  CheckCircle, ArrowRight, Headphones, FileText, PenTool, Volume2, Brain, Target
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const coreServices = [
  {
    icon: BookOpen,
    title: 'Authentic Mock Exams',
    desc: 'Full-length practice exams that mirror the real test format, timing, and difficulty for JLPT, EPS-TOPIK, IELTS, HSK, GRE, SAT, and more.',
    features: ['Real exam format replication', 'Timed sections with auto-submit', 'Section-by-section scoring', 'Detailed answer explanations'],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Mic,
    title: 'Listening Practice',
    desc: 'Native-speaker audio recordings with adjustable speed, transcript support, and comprehension questions for every listening section.',
    features: ['Native-speaker audio clips', 'Speed control (0.75x–1.5x)', 'Full transcripts available', 'Repeat & replay controls'],
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: BarChart2,
    title: 'Deep Performance Analytics',
    desc: 'Track your progress across every section, identify weak areas, and get personalized recommendations based on your score history.',
    features: ['Section-by-section breakdowns', 'Radar chart skill mapping', 'Historical score tracking', 'AI-powered recommendations'],
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Award,
    title: 'Smart Grading & Feedback',
    desc: 'Instant AI-powered grading with detailed explanations for every answer, so you understand why an answer is correct or incorrect.',
    features: ['Instant score calculation', 'Detailed explanations per question', 'Common mistake highlighting', 'Pass/fail prediction'],
    color: 'from-rose-500 to-pink-500',
  },
  {
    icon: Globe,
    title: 'Localized Learning',
    desc: 'Content and interface available in English, Sinhala, and Tamil. Payment via local banks, FriMi, and Genie.',
    features: ['Sinhala & Tamil interface', 'Local payment methods', 'Sri Lankan exam context', 'Regional tutor network'],
    color: 'from-sky-500 to-blue-500',
  },
  {
    icon: Zap,
    title: 'Adaptive Study Plans',
    desc: 'Personalized study schedules based on your exam date, current level, and target score. Adjusts as you improve.',
    features: ['Custom study schedules', 'Daily practice reminders', 'Streak tracking & rewards', 'Weak area focus mode'],
    color: 'from-violet-500 to-indigo-500',
  },
];

const examServices = [
  { exam: 'JLPT', levels: 'N1–N5', desc: 'Grammar, vocabulary, listening, and reading sections with authentic Japanese content', icon: BookOpen },
  { exam: 'EPS-TOPIK', levels: 'Basic & Standard', desc: 'Korean language proficiency for overseas employment with employment-focused vocabulary', icon: FileText },
  { exam: 'IELTS', levels: 'Academic & General', desc: 'All four sections with speaking practice prompts and writing task templates', icon: PenTool },
  { exam: 'HSK', levels: 'Levels 1–6', desc: 'Chinese proficiency with character recognition, listening, and reading comprehension', icon: Volume2 },
  { exam: 'TOPIK', levels: 'I & II', desc: 'Korean proficiency test with grammar, vocabulary, writing, listening, and reading', icon: Brain },
  { exam: 'GRE', levels: 'Verbal, Quant, AWA', desc: 'Graduate record exam with verbal reasoning, quantitative, and analytical writing', icon: Target },
  { exam: 'SAT', levels: 'Math & EBRW', desc: 'Scholastic assessment test with math, evidence-based reading, and writing', icon: Headphones },
  { exam: 'TOEFL', levels: 'iBT', desc: 'Internet-based test with reading, listening, speaking, and writing sections', icon: Users },
];

const processSteps = [
  { step: 1, title: 'Choose Your Exam', desc: 'Browse our marketplace and select the exam pack that matches your target test and level.' },
  { step: 2, title: 'Practice Under Real Conditions', desc: 'Take timed mock exams that replicate the real test environment, including listening audio.' },
  { step: 3, title: 'Review Your Results', desc: 'Get instant scores with detailed section analytics, answer explanations, and pass/fail prediction.' },
  { step: 4, title: 'Improve & Retake', desc: 'Focus on weak areas with targeted practice, then retake to track your improvement.' },
];

export default function ServicesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#060d1f] text-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge color="blue" className="mb-4">Our Services</Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Everything You Need to <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Pass Your Exam</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              From authentic mock exams to AI-powered analytics, Langoora provides a complete preparation ecosystem designed specifically for Sri Lankan learners.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Services */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Core Services</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Six pillars that make Langoora the most effective exam prep platform</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreServices.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <GlassCard className="p-6 h-full flex flex-col">
                  <div className={`w-12 h-12 bg-gradient-to-br ${s.color} rounded-2xl flex items-center justify-center mb-5 shadow-lg`}>
                    <s.icon size={22} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-5">{s.desc}</p>
                  <ul className="space-y-2.5 mt-auto">
                    {s.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm text-gray-300">
                        <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Exam-Specific Services */}
      <section className="py-20 bg-gradient-to-b from-transparent to-[#070e20]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Exam-Specific Preparation</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Tailored content and practice for every major language exam</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {examServices.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <GlassCard className="p-5 h-full hover:border-blue-500/30 transition-all">
                  <div className="w-10 h-10 bg-blue-500/15 border border-blue-500/30 rounded-xl flex items-center justify-center mb-4">
                    <s.icon size={18} className="text-blue-400" />
                  </div>
                  <h3 className="font-bold text-white mb-1">{s.exam}</h3>
                  <p className="text-xs text-blue-300 mb-2">{s.levels}</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">Four steps to exam success</p>
          </motion.div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-cyan-500/30 to-transparent hidden sm:block" />
            <div className="space-y-8">
              {processSteps.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                  <div className="flex gap-5 items-start">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center">
                        <span className="text-blue-400 font-bold text-lg">{s.step}</span>
                      </div>
                    </div>
                    <GlassCard className="flex-1 p-5">
                      <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                    </GlassCard>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For Tutors */}
      <section className="py-20 bg-gradient-to-b from-transparent to-[#070e20]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <GlassCard className="p-8 sm:p-12 border-emerald-500/20 bg-gradient-to-br from-emerald-900/10 to-teal-900/10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge color="green" className="mb-4">For Tutors</Badge>
                  <h2 className="text-3xl font-bold mb-4">Earn From Your Expertise</h2>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    Create and sell exam packs on Langoora. Set your own prices, reach thousands of students, and earn revenue from every purchase.
                  </p>
                  <ul className="space-y-3 mb-8">
                    {[
                      'Create unlimited exam packs with our wizard',
                      'Set your own pricing (LKR 500–10,000)',
                      'Earn 50% revenue share on every sale',
                      'Track student performance and reviews',
                      'Withdraw earnings to any Sri Lankan bank',
                    ].map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                        <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant="primary" size="lg" onClick={() => navigate('/auth/register?role=tutor')}>
                    Become a Tutor <ArrowRight size={18} />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: '340+', label: 'Active Tutors' },
                    { value: '50%', label: 'Revenue Share' },
                    { value: 'LKR 1.5M+', label: 'Total Payouts' },
                    { value: '4.8', label: 'Avg. Tutor Rating' },
                  ].map((s, i) => (
                    <div key={i} className="p-5 bg-white/5 rounded-xl border border-white/10 text-center">
                      <div className="text-2xl font-bold text-emerald-400 mb-1">{s.value}</div>
                      <div className="text-xs text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <GlassCard className="p-14 border-blue-500/20 bg-gradient-to-br from-blue-900/20 to-cyan-900/10">
              <h2 className="text-3xl font-bold mb-4">Ready to Start Preparing?</h2>
              <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">Join 24,000+ students and start your journey to exam success today.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="primary" size="xl" onClick={() => navigate('/auth/register')}>
                  Start Free <ArrowRight size={18} />
                </Button>
                <Button variant="secondary" size="xl" onClick={() => navigate('/contact')}>
                  Contact Us
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

   
    </div>
  );
}
