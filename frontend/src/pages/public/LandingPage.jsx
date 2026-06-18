import { useState, useEffect } from 'react';
import { useNavigate as useReactNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, ArrowRight, Play, Star, Users, BookOpen, Award, Mic,
  BarChart2, Coins, KeyRound, Zap, TrendingUp, ChevronRight, Languages, Clock, CheckCircle
} from 'lucide-react';
import { examCategories, topTutors, featuredExams, testimonials, subscriptionPlans, adminStats } from '../../data/mockData';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';
import StarRating from '../../components/ui/StarRating';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';

// Animation Variants
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
  const navigate = useReactNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Tutor Onboarding Handler
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

  // Testimonial Carousel Effect
  useEffect(() => {
    const timer = setInterval(() => setActiveTestimonial(p => (p + 1) % testimonials.length), 4000);
    return () => clearInterval(timer);
  }, []);

  // Features Data Config
  const features = [
    { icon: BookOpen, title: 'Authentic Simulations', desc: 'Exams mirror the real JLPT, EPS-TOPIK, and TOPIK I in format, timing, and difficulty.' },
    { icon: Mic, title: 'Listening Practice', desc: 'Native-speaker audio clips with speed controls and transcript support.' },
    { icon: BarChart2, title: 'Deep Analytics', desc: 'Track section-by-section performance and identify weaknesses instantly.' },
    { icon: Coins, title: 'Instant Evaluation', desc: 'Get automated scoring immediately, optimized through our structured credit-based framework.' },
    { icon: KeyRound, title: 'Value Driven Access', desc: 'Unlock specific exam categories dynamically using your plans assigned credit weights.' },
    { icon: Zap, title: 'Adaptive Study Plans', desc: 'Personalized study schedules based on your exam date and current level.' },
  ];

  // Stats Data mapped directly with safe Fallbacks
  const stats = [
    { value: adminStats?.totalUsers?.toLocaleString() || '24,000+', label: 'Students', icon: Users },
    { value: adminStats?.totalExams?.toLocaleString() || '1,847', label: 'Mock Exams', icon: BookOpen },
    { value: adminStats?.activeTutors?.toLocaleString() || '342', label: 'Expert Tutors', icon: Award },
    { value: '94%', label: 'Pass Rate', icon: TrendingUp },
  ];

  return (
    <div className="text-white overflow-x-hidden bg-[#040814]">
      
      {/* ================= HERO SECTION (CRISTALIZED JAPANESE & KOREAN THEME) ================= */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 pb-16">
        
        {/* Background Layer with Dual Culture Split Visuals */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#060d1f]/40 via-[#0a1628]/90 to-[#040814]" />
          
          {/* Japan Aesthetic Component (Left Side Backdrop) */}
          <div className="absolute top-0 left-0 w-full md:w-1/2 h-full opacity-15 md:opacity-20 pointer-events-none mix-blend-lighten">
            <img 
              src="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1000&q=80" 
              alt="Tokyo Background" 
              className="w-full h-full object-cover object-center filter grayscale contrast-125"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#060d1f] via-transparent to-transparent" />
          </div>

          {/* Korea Aesthetic Component (Right Side Backdrop) */}
          <div className="absolute top-0 right-0 w-full md:w-1/2 h-full opacity-15 md:opacity-20 pointer-events-none mix-blend-lighten">
            <img 
              src="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1000&q=80" 
              alt="Seoul Background" 
              className="w-full h-full object-cover object-center filter grayscale contrast-125"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-[#060d1f] via-transparent to-transparent" />
          </div>

          {/* Glowing Ambient Neon Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
          
          {/* Cyber Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        {/* Traditional Cultural Elements Background Watermarks */}
        <div className="absolute top-24 left-12 opacity-5 text-7xl font-bold hidden xl:block select-none font-serif text-red-500">日本語</div>
        <div className="absolute bottom-24 right-12 opacity-5 text-7xl font-bold hidden xl:block select-none font-serif text-blue-500">한국어</div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Tagline Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-500/10 to-blue-500/10 border border-white/10 text-gray-300 text-sm mb-6 backdrop-blur-md"
          >
            <Languages size={14} className="text-red-400" />
            <span className="text-red-400 font-semibold">JLPT</span> & <span className="text-blue-400 font-semibold">TOPIK / EPS - TOPIK</span> Specialized Prep Hub
          </motion.div>

          {/* Main Hero Header */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6"
          >
            Pass Your <span className="bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">Japanese & Korean</span>
            <br />Exams on the First Attempt!
          </motion.h1>

          {/* Subtitle description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Sri Lanka's premier specialized simulator. Master the JLPT (N5 - N1) and TOPIK I & EPS - TOPIK with real mock paper formats, active time tracking, and native audio listening rooms.
          </motion.p>

          {/* Dynamic Dual Target Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            
            {/* Japan Track Card */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
              className="relative group overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-black/40 to-red-950/10 backdrop-blur-md p-6 text-left hover:border-red-500/40 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-red-600/10 rounded-full blur-xl group-hover:bg-red-600/20 transition-all" />
              <div className="flex items-center gap-4 mb-3">
                <span className="text-4xl filter drop-shadow-[0_4px_12px_rgba(239,68,68,0.3)]">🇯🇵</span>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-red-300 transition-colors">JLPT Portal</h3>
                  <p className="text-xs text-red-400 tracking-wider font-semibold">N5 • N4 • N3 • N2 • N1</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">Complete vocabulary banks, kanji test simulators, and native speech listening audio clips.</p>
              <button onClick={() => navigate('/marketplace?category=JLPT')} className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors">
                Explore Japan Papers <ChevronRight size={14} />
              </button>
            </motion.div>

            {/* Korea Track Card */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
              className="relative group overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-black/40 to-blue-950/10 backdrop-blur-md p-6 text-left hover:border-blue-500/40 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-600/10 rounded-full blur-xl group-hover:bg-blue-600/20 transition-all" />
              <div className="flex items-center gap-4 mb-3">
                <span className="text-4xl filter drop-shadow-[0_4px_12px_rgba(59,130,246,0.3)]">🇰🇷</span>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">Korean Track Hub</h3>
                  <p className="text-xs text-blue-400 tracking-wider font-semibold">TOPIK I • EPS - TOPIK</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">Industry-specific question banks, reading matrices, and authentic labor-department level audio guides.</p>
              <button onClick={() => navigate('/marketplace?category=EPS-TOPIK')} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                Explore Korean Papers <ChevronRight size={14} />
              </button>
            </motion.div>

          </div>

          {/* Call to Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
          >
            <Button variant="primary" size="xl" className="shadow-lg shadow-purple-500/20" onClick={() => navigate('/auth/register')}>
              Create Free Account <ArrowRight size={20} />
            </Button>
            <Button variant="secondary" size="xl" onClick={() => navigate('/marketplace')}>
              <Play size={18} className="text-purple-400" /> Enter Live Test Room
            </Button>
          </motion.div>

          {/* Quick Search Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
            className="relative max-w-2xl mx-auto mb-16"
          >
            <div className="relative bg-white/5 border border-white/10 rounded-2xl p-1.5 flex items-center gap-3 backdrop-blur-lg">
              <Search size={20} className="ml-3 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search specific levels (e.g., JLPT N4, EPS - TOPIK, TOPIK I)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none py-2"
              />
              <Button variant="primary" size="md" className="bg-gradient-to-r from-red-600 to-blue-600 border-none hover:opacity-90" onClick={() => navigate(`/marketplace?q=${searchQuery}`)}>
                Search
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
              {examCategories.map(cat => (
                <button key={cat.id} onClick={() => navigate(`/marketplace?q=${cat.name}`)} className="hover:text-purple-400 transition-colors font-medium">
                  {cat.name}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Metrics Displays */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <GlassCard key={i} className="p-4 text-center border-white/5 bg-white/[0.02]">
                <stat.icon size={20} className="text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </GlassCard>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
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

      {/* Featured Exams Section */}
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
                <GlassCard hover className="overflow-hidden cursor-pointer" onClick={() => navigate(`/exam/${exam.id}/preview`)}>
                  <div className="relative h-44 overflow-hidden">
                    <img src={exam.thumbnail} alt={exam.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge color="blue">{exam.category}</Badge>
                      {exam.tag && <Badge color="amber">{exam.tag}</Badge>}
                    </div>
                    <div className="absolute bottom-3 right-3 text-right">
                      {/* Credits ක්‍රමවේදය සඳහා ආරක්ෂිතව වෙනස් කරන ලදී */}
                      <div className="text-white font-bold text-lg flex items-center gap-1">
                        <Coins size={16} className="text-amber-400" />
                        {exam?.credits || 10} Credits
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2 leading-snug h-10">{exam.title}</h3>
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

      {/* Top Tutors Section */}
      <section className="py-24 bg-gradient-to-b from-transparent to-[#070e20]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-2">Top Tutors</h2>
              <p className="text-gray-400">Certified experts helping thousands of students pass every year</p>
            </div>
            <Button variant="outline" onClick={handleTutorOnboarding}>Become a Tutor <ChevronRight size={16} /></Button>
          </motion.div>
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
                  <h3 className="font-semibold text-white text-sm mb-1 truncate">{tutor.name}</h3>
                  <Badge color="blue" className="mb-2 text-xs">{tutor.badge}</Badge>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-amber-400 text-sm font-semibold">{tutor.rating}</span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>{tutor.students} students</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {tutor.exams.map(e => (
                      <span key={e} className="text-[10px] bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full">{e}</span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Success Stories</h2>
            <p className="text-gray-400 text-lg">Real students, real results</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {testimonials.map((t, i) => (
              <motion.div key={t.id} {...stagger} transition={{ duration: 0.4, delay: i * 0.1 }}>
                <GlassCard className={`p-5 h-full transition-all duration-300 ${i === activeTestimonial ? 'border-blue-500/40 bg-blue-500/5 shadow-lg shadow-blue-500/5' : ''}`}>
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

      {/* Pricing Preview Section */}
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
                        <span className="text-4xl font-bold text-white">LKR {plan?.price?.toLocaleString() || plan.price}</span>
                        <span className="text-gray-400 text-sm">/month</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-gray-300">
                        <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
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

      {/* Final CTA Section */}
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
                  Join {adminStats?.totalUsers?.toLocaleString() || '24,000+'} Sri Lankan students who trust Langoora for their exam preparation.
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