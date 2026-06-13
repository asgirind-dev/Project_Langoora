import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, Play, Star, Users, BookOpen, Award, Mic,
  BarChart2, Globe, Shield, Clock, CheckCircle, TrendingUp, Zap, ChevronRight
} from 'lucide-react';
import { examCategories, topTutors, featuredExams, testimonials, subscriptionPlans } from '../../data/mockData';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';
import StarRating from '../../components/ui/StarRating';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 }
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const handleTutorOnboarding = () => {
    if (user) {
      if (user.role === 'tutor' && user.status === 'pending') {
        navigate('/auth/under-review');
      } else if (user.role === 'tutor') {
        navigate('/tutor');
      } else {
        navigate('/student'); 
      }
    } else {
      navigate('/auth/register?role=tutor');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setActiveTestimonial(p => (p + 1) % testimonials.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    { icon: BookOpen, title: 'Authentic Simulations', desc: 'Exams mirror the real JLPT, EPS-TOPIK, and IELTS in format, timing, and difficulty.' },
    { icon: Mic, title: 'Listening Practice', desc: 'Native-speaker audio clips with speed controls and transcript support.' },
    { icon: BarChart2, title: 'Deep Analytics', desc: 'Track section-by-section performance and identify weaknesses instantly.' },
    { icon: Award, title: 'Smart Grading', desc: 'Instant AI-powered grading with detailed explanations for every answer.' },
    { icon: Globe, title: 'Localized Learning', desc: 'Content and instructions adapted for Sri Lankan learners in Sinhala & Tamil.' },
    { icon: Zap, title: 'Adaptive Study Plans', desc: 'Personalized study schedules based on your exam date and current level.' },
  ];

  const stats = [
    { value: '24,000+', label: 'Students', icon: Users },
    { value: '1,847', label: 'Mock Exams', icon: BookOpen },
    { value: '342', label: 'Expert Tutors', icon: Award },
    { value: '94%', label: 'Pass Rate', icon: TrendingUp },
  ];

  return (
    <div className="text-white overflow-x-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#060d1f] via-[#0a1628] to-[#060d1f]" />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 12, repeat: Infinity, delay: 4 }}
            className="absolute top-1/2 right-1/3 w-64 h-64 bg-blue-400/15 rounded-full blur-3xl"
          />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-sm mb-8"
          >
            <Zap size={14} className="text-blue-400" />
            Sri Lanka's #1 Language Exam Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          >
            Ace Your <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">Language Exam</span>
            <br />With Confidence
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Authentic mock exams, expert tutors, and intelligent analytics — purpose-built for JLPT, EPS-TOPIK, IELTS, HSK, GRE & more.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <Button variant="primary" size="xl" onClick={() => navigate('/auth/register')}>
              Start Free Today <ArrowRight size={20} />
            </Button>
            <Button variant="secondary" size="xl" onClick={() => navigate('/marketplace')}>
              <Play size={18} className="text-blue-400" /> Browse Exams
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
            className="relative max-w-2xl mx-auto mb-16"
          >
            <div className="relative bg-white/5 border border-white/15 rounded-2xl p-1.5 flex items-center gap-3">
              <Search size={20} className="ml-3 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search JLPT, IELTS, EPS-TOPIK, GRE..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none py-2"
              />
              <Button variant="primary" size="md" onClick={() => navigate(`/marketplace?q=${searchQuery}`)}>
                Search
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
              {['JLPT N2', 'EPS-TOPIK', 'IELTS Band 7', 'GRE 320+'].map(tag => (
                <button key={tag} onClick={() => navigate(`/marketplace?q=${tag}`)} className="hover:text-blue-400 transition-colors">{tag}</button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <GlassCard key={i} className="p-4 text-center">
                <stat.icon size={20} className="text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </GlassCard>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Exam Categories */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Exams We Cover</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">From Japanese proficiency to English aptitude — authentic simulations for every major language exam</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {examCategories.map((cat, i) => (
              <motion.div
                key={cat.id}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <GlassCard hover className="p-5 text-center" onClick={() => navigate(`/marketplace?category=${cat.name}`)}>
                  <div className={`w-14 h-14 bg-gradient-to-br ${cat.color} rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg`}>
                    {cat.flag}
                  </div>
                  <h3 className="font-bold text-white mb-1">{cat.name}</h3>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{cat.description}</p>
                  <div className="text-xs text-blue-300 font-medium">{cat.students.toLocaleString()} students</div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gradient-to-b from-transparent to-[#070e20]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <Badge color="blue" className="mb-4">Platform Features</Badge>
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Pass</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Precision-engineered tools that replicate real exam conditions and accelerate your progress</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} {...stagger} transition={{ duration: 0.4, delay: i * 0.1 }}>
                <GlassCard className="p-6 h-full hover:border-blue-500/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-4">
                    <f.icon size={22} className="text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Exams */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-2">Top Exam Packs</h2>
              <p className="text-gray-400">Expert-crafted mock exams with detailed explanations</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/marketplace')}>View All <ChevronRight size={16} /></Button>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredExams.slice(0, 6).map((exam, i) => (
              <motion.div key={exam.id} {...stagger} transition={{ duration: 0.4, delay: i * 0.08 }}>
                <GlassCard hover className="overflow-hidden" onClick={() => navigate(`/exam/${exam.id}/preview`)}>
                  <div className="relative h-44 overflow-hidden">
                    <img src={exam.thumbnail} alt={exam.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge color="blue">{exam.category}</Badge>
                      {exam.tag && <Badge color="amber">{exam.tag}</Badge>}
                    </div>
                    <div className="absolute bottom-3 right-3 text-right">
                      <div className="text-white font-bold text-lg">LKR {exam.price.toLocaleString()}</div>
                      <div className="text-gray-400 text-xs line-through">LKR {exam.originalPrice.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2 leading-snug">{exam.title}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <img src={exam.tutorAvatar} alt={exam.tutor} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-xs text-gray-400">{exam.tutor}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <StarRating rating={exam.rating} count={exam.reviews} size={12} />
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock size={11} />{exam.duration}</span>
                        <span className="flex items-center gap-1"><BookOpen size={11} />{exam.questions}Q</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Tutors */}
      <section className="py-24 bg-gradient-to-b from-transparent to-[#070e20]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-2">Top Tutors</h2>
              <p className="text-gray-400">Certified experts helping thousands of students pass every year</p>
            </div>
          <Button variant="outline" onClick={handleTutorOnboarding}>Become a Tutor <ChevronRight size={16} /></Button>                </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {topTutors.map((tutor, i) => (
              <motion.div key={tutor.id} {...stagger} transition={{ duration: 0.4, delay: i * 0.1 }}>
                <GlassCard hover className="p-5 text-center">
                  <div className="relative inline-block mb-3">
                    <img src={tutor.avatar} alt={tutor.name} className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-blue-500/40" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#060d1f] flex items-center justify-center">
                      <CheckCircle size={10} className="text-white" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1">{tutor.name}</h3>
                  <Badge color="blue" className="mb-2 text-xs">{tutor.badge}</Badge>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-amber-400 text-sm font-semibold">{tutor.rating}</span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>{tutor.students} students</p>
                    <p className="text-emerald-400 font-medium">{tutor.earnings}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {tutor.exams.map(e => (
                      <span key={e} className="text-xs bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full">{e}</span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Success Stories</h2>
            <p className="text-gray-400 text-lg">Real students, real results</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {testimonials.map((t, i) => (
              <motion.div key={t.id} {...stagger} transition={{ duration: 0.4, delay: i * 0.1 }}>
                <GlassCard className={`p-5 h-full transition-all duration-300 ${i === activeTestimonial ? 'border-blue-500/40 bg-blue-500/5' : ''}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-white text-sm">{t.name}</p>
                      <p className="text-xs text-emerald-400">{t.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} size={13} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed italic">"{t.text}"</p>
                  <div className="mt-3">
                    <Badge color="blue" className="text-xs">{t.exam}</Badge>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 bg-gradient-to-b from-transparent to-[#070e20]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-lg">Start free, upgrade when ready</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscriptionPlans.map((plan, i) => (
              <motion.div key={plan.id} {...stagger} transition={{ duration: 0.4, delay: i * 0.1 }}>
                <GlassCard className={`p-7 h-full relative ${plan.popular ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</span>
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    {plan.price === 0 ? (
                      <span className="text-4xl font-bold text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-white">LKR {plan.price.toLocaleString()}</span>
                        <span className="text-gray-400 text-sm">/month</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-gray-300">
                        <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.popular ? 'primary' : 'secondary'}
                    fullWidth
                    onClick={() => navigate('/pricing')}
                  >
                    {plan.price === 0 ? 'Start Free' : `Get ${plan.name}`}
                  </Button>
                </GlassCard>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="ghost" onClick={() => navigate('/pricing')}>View full pricing comparison <ChevronRight size={16} /></Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-500/20 rounded-3xl blur-xl" />
              <GlassCard className="relative p-14 border-blue-500/30">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30">
                  <BookOpen size={28} className="text-white" />
                </div>
                <h2 className="text-4xl font-bold mb-4">Ready to Pass Your Exam?</h2>
                <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
                  Join 24,000+ Sri Lankan students who trust Langoora for their exam preparation.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button variant="primary" size="xl" onClick={() => navigate('/auth/register')}>
                    Start Learning Free <ArrowRight size={20} />
                  </Button>
                  <Button variant="secondary" size="xl" onClick={handleTutorOnboarding}>
                    Become a Tutor
                  </Button> 
                </div>
              </GlassCard>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
