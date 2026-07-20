import { useState, useEffect, useRef } from 'react';
import { useNavigate as useReactNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Search, ArrowRight, Play, Star, Users, BookOpen, Award, Mic,
  BarChart2, Coins, KeyRound, Zap, TrendingUp, ChevronRight, Languages, Clock, CheckCircle,
  RefreshCw, Rocket, Crown, Infinity as InfinityIcon, Layers, ChevronLeft, ChevronRight as ChevronRightIcon,
  AlertCircle
} from 'lucide-react';
import { examCategories, topTutors, featuredExams, testimonials, adminStats } from '../../data/mockData';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';
import StarRating from '../../components/ui/StarRating';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { fetchHeroBanners } from '../../services/cmsService';
import { fetchGlobalConfig } from '../../services/globalConfigService';

const iconMap = { Zap, Rocket, Crown, Infinity: InfinityIcon, Star, Award, Layers };
const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
const stagger = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

// ─── Brand tokens (Langoora) ─────────────────────────────────────────────
const BRAND = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  accent: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// ─── Loading Spinner Component (Same as ExamTakePage) ───────────────────
function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="min-h-screen bg-[#030810] flex flex-col items-center justify-center gap-4 text-white">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${BRAND.primary} transparent transparent transparent` }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <p className="text-gray-400 text-sm tracking-wide">{message}</p>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useReactNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  
  const [bannerImages, setBannerImages] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // 🌐 Global Config State for Announcement Banner
  const [globalConfig, setGlobalConfig] = useState({
    showAnnouncement: false,
    announcementText: '',
    announcementColor: 'amber'
  });
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  // 🆕 Banner Dismiss State
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  const handleTutorOnboarding = () => {
    if (user) {
      if (user.role === 'tutor' && user.status === 'pending') navigate('/auth/under-review');
      else if (user.role === 'tutor') navigate('/tutor');
      else navigate('/student');
    } else {
      navigate('/auth/register?role=tutor');
    }
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        const response = await axios.get('http://localhost:5000/api/subscription-management/plans');
        setPlans(response.data || []);
      } catch (error) {
        console.error("Error loading plans:", error);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Fetch live banners from Firestore
  useEffect(() => {
    const getBanners = async () => {
      try {
        setBannersLoading(true);
        const liveBanners = await fetchHeroBanners();
        if (liveBanners && liveBanners.length > 0) {
          setBannerImages(liveBanners);
        }
      } catch (error) {
        console.error("Error loading live banners:", error);
      } finally {
        setBannersLoading(false);
      }
    };
    getBanners();
  }, []);

  // 🌐 Fetch Global Config for Announcement Banner
  useEffect(() => {
    const loadGlobalConfig = async () => {
      try {
        setIsGlobalLoading(true);
        const config = await fetchGlobalConfig();
        if (config) {
          setGlobalConfig({
            showAnnouncement: config.showAnnouncement || false,
            announcementText: config.announcementText || '',
            announcementColor: config.announcementColor || 'amber'
          });
        }
      } catch (error) {
        console.error("Error loading global config:", error);
      } finally {
        setIsGlobalLoading(false);
      }
    };
    loadGlobalConfig();
  }, []);

  // 🎯 Banner timing
  useEffect(() => {
    if (bannerImages.length <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerImages.length);
    }, 12000);
    return () => clearInterval(timerRef.current);
  }, [bannerImages.length, isPaused]);

  useEffect(() => {
    const timer = setInterval(() => setActiveTestimonial(p => (p + 1) % testimonials.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const goToBanner = (index) => {
    setCurrentBannerIndex(index);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerImages.length);
    }, 12000);
  };

  const nextBanner = () => {
    goToBanner((currentBannerIndex + 1) % bannerImages.length);
  };

  const prevBanner = () => {
    goToBanner((currentBannerIndex - 1 + bannerImages.length) % bannerImages.length);
  };

  // ===================== BANNER STYLES =====================

  const getBannerColorClasses = (color) => {
    const colors = {
      amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      red: 'bg-red-500/10 border-red-500/20 text-red-400',
      green: 'bg-green-500/10 border-green-500/20 text-green-400',
      purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400'
    };
    return colors[color] || colors.amber;
  };

  const getBannerIcon = (color) => {
    const icons = {
      amber: '⚠️',
      blue: 'ℹ️',
      red: '🚨',
      green: '✅',
      purple: '🎉'
    };
    return icons[color] || '📢';
  };

  // 🆕 Countdown Style Helper Functions
  const getProgressColor = (color) => {
    const colors = {
      amber: 'bg-gradient-to-r from-amber-400 to-orange-500',
      blue: 'bg-gradient-to-r from-blue-400 to-cyan-500',
      red: 'bg-gradient-to-r from-red-400 to-pink-500',
      green: 'bg-gradient-to-r from-green-400 to-emerald-500',
      purple: 'bg-gradient-to-r from-purple-400 to-violet-500'
    };
    return colors[color] || colors.amber;
  };

  const getBadgeColor = (color) => {
    const badges = {
      amber: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      red: 'bg-red-500/20 text-red-400 border border-red-500/30',
      green: 'bg-green-500/20 text-green-400 border border-green-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    };
    return badges[color] || badges.amber;
  };

  const getBorderGlow = (color) => {
    const glows = {
      amber: 'shadow-[0_0_30px_rgba(245,158,11,0.1)]',
      blue: 'shadow-[0_0_30px_rgba(59,130,246,0.1)]',
      red: 'shadow-[0_0_30px_rgba(239,68,68,0.1)]',
      green: 'shadow-[0_0_30px_rgba(16,185,129,0.1)]',
      purple: 'shadow-[0_0_30px_rgba(139,92,246,0.1)]'
    };
    return glows[color] || glows.amber;
  };

  // =========================================================

  const features = [
    { icon: BookOpen, title: 'Authentic Simulations', desc: 'Exams mirror the real JLPT, EPS-TOPIK, and TOPIK I in format, timing, and difficulty.' },
    { icon: Mic, title: 'Listening Practice', desc: 'Native-speaker audio clips with speed controls and transcript support.' },
    { icon: BarChart2, title: 'Deep Analytics', desc: 'Track section-by-section performance and identify weaknesses instantly.' },
    { icon: Coins, title: 'Instant Evaluation', desc: 'Get automated scoring immediately, optimized through our structured credit-based framework.' },
    { icon: KeyRound, title: 'Value Driven Access', desc: 'Unlock specific exam categories dynamically using your plans assigned credit weights.' },
    { icon: Zap, title: 'Adaptive Study Plans', desc: 'Personalized study schedules based on your exam date and current level.' },
  ];

  const stats = [
    { value: adminStats?.totalUsers?.toLocaleString() || '24,000+', label: 'Students', icon: Users },
    { value: adminStats?.totalExams?.toLocaleString() || '1,847', label: 'Mock Exams', icon: BookOpen },
    { value: adminStats?.activeTutors?.toLocaleString() || '342', label: 'Expert Tutors', icon: Award },
    { value: '94%', label: 'Pass Rate', icon: TrendingUp },
  ];

  const activeBanner = bannerImages[currentBannerIndex] || null;

  // Check if banner should be shown
  const shouldShowBanner = !isGlobalLoading && 
                           globalConfig.showAnnouncement && 
                           globalConfig.announcementText && 
                           !isBannerDismissed;

  // ─── If still loading initial data, show the loading spinner ──────────
  if (bannersLoading || isGlobalLoading) {
    return <LoadingSpinner message="Loading Langoora..." />;
  }

  return (
    <div className="text-white overflow-x-hidden bg-[#040814]">
      
      {/* ============================================================
          🌐 COUNTDOWN STYLE ANNOUNCEMENT BANNER
          ============================================================ */}
      {shouldShowBanner && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className={`relative overflow-hidden border-b border-white/5 ${getBorderGlow(globalConfig.announcementColor)}`}
        >
          {/* Background Gradient */}
          <div className={`absolute inset-0 ${getBannerColorClasses(globalConfig.announcementColor)} opacity-50`} />
          
          {/* Animated Progress Bar - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
            <motion.div 
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 10, ease: 'linear' }}
              className={`h-full ${getProgressColor(globalConfig.announcementColor)}`}
            />
          </div>

          {/* Animated Progress Bar - Top */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/5">
            <motion.div 
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 8, ease: 'linear' }}
              className={`h-full ${getProgressColor(globalConfig.announcementColor)} opacity-50`}
            />
          </div>

          {/* Main Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
            {/* Left Side - Icon & Message */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Animated Icon */}
              <motion.span 
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-lg"
              >
                {getBannerIcon(globalConfig.announcementColor || 'amber')}
              </motion.span>
              
              {/* Message */}
              <span className="text-white/90 text-sm md:text-base font-medium">
                {globalConfig.announcementText}
              </span>
              
              {/* URGENT Badge for Red Color */}
              {globalConfig.announcementColor === 'red' && (
                <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full animate-pulse border border-red-500/30">
                  URGENT
                </span>
              )}
              
              {/* LIVE Badge for other colors */}
              {globalConfig.announcementColor !== 'red' && (
                <span className={`text-[9px] px-2 py-0.5 rounded-full ${getBadgeColor(globalConfig.announcementColor)} animate-pulse`}>
                  ● LIVE
                </span>
              )}
            </div>

            {/* Right Side - Time & Close Button */}
            <div className="flex items-center gap-3">
              {/* Time Display */}
              <span className="text-[10px] text-white/40 flex items-center gap-1 font-mono">
                <Clock size={12} />
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
              
              {/* Close/Dismiss Button */}
              <button 
                onClick={() => setIsBannerDismissed(true)}
                className="text-white/30 hover:text-white/70 transition-colors text-xs p-1 rounded-full hover:bg-white/5"
                aria-label="Dismiss announcement"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= HERO CAROUSEL BLOCK ================= */}
      <section 
        className={`relative w-full min-h-[580px] md:min-h-[640px] lg:min-h-[680px] flex items-center justify-center group overflow-hidden bg-[#050b1a] ${shouldShowBanner ? '' : ''}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {bannerImages.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm font-light">
            No active promotional templates configured in CMS.
          </div>
        ) : (
          <>
            {/* Background Image Layer Container */}
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#040814] via-transparent to-transparent z-10" />
              
              <AnimatePresence mode="wait">
                <motion.img 
                  key={currentBannerIndex}
                  src={activeBanner.url} 
                  alt={activeBanner.alt || 'Langoora Live Asset'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  className="w-full h-full object-cover object-center brightness-95 contrast-[1.03]"
                />
              </AnimatePresence>
            </div>

            {/* Dynamic Chevron Controls */}
            {bannerImages.length > 1 && (
              <>
                <button onClick={prevBanner} className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/80 transition-all duration-300 opacity-0 group-hover:opacity-100">
                  <ChevronLeft size={22} />
                </button>
                <button onClick={nextBanner} className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/80 transition-all duration-300 opacity-0 group-hover:opacity-100">
                  <ChevronRightIcon size={22} />
                </button>
              </>
            )}

            {/* Dot Indicators */}
            {bannerImages.length > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                {bannerImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToBanner(index)}
                    className={`transition-all duration-300 rounded-full ${
                      currentBannerIndex === index ? 'w-8 h-2 bg-gradient-to-r from-blue-400 to-purple-400 shadow-md shadow-blue-500/20' : 'w-2 h-2 bg-white/25 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Content Canvas Overlay Grid */}
            <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 text-left space-y-6 pt-16 pb-12 flex flex-col justify-center min-h-[460px] md:min-h-[540px]">
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={`content-container-${currentBannerIndex}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="space-y-6 max-w-4xl"
                  layout
                >
                  {/* Top Ribbon Container */}
                  {activeBanner.showRibbonContainer !== false && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500/10 to-blue-500/10 border border-white/10 text-gray-300 text-xs backdrop-blur-md">
                      <Languages size={12} className="text-red-400" />
                      <span>{activeBanner.ribbonCustomText || 'JLPT & TOPIK / EPS - TOPIK Prep Simulator'}</span>
                      
                      {activeBanner.badge && (
                        <span className="ml-1 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-[9px] font-bold">
                          {activeBanner.badge}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    {activeBanner.title && (
                      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.15] tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                        {activeBanner.title}
                      </h1>
                    )}

                    {activeBanner.subtitle && (
                      <p className="text-sm sm:text-base lg:text-lg text-gray-200 max-w-2xl leading-relaxed font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                        {activeBanner.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Buttons Wrapper Box */}
                  <div className="flex flex-wrap gap-4 pt-2 min-h-[52px] items-center">
                    {activeBanner.showRegisterBtn !== false && (
                      <Button variant="primary" size="md" className="shadow-lg shadow-purple-500/20 group py-3 px-6" onClick={() => navigate('/auth/register')}>
                        Create Free Account 
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </Button>
                    )}
                    {activeBanner.showTestRoomBtn !== false && (
                      <Button variant="secondary" size="md" onClick={() => navigate('/marketplace')} className="group py-3 px-6">
                        <Play size={16} className="text-purple-400 group-hover:scale-110 transition-transform" /> 
                        Enter Live Test Room
                      </Button>
                    )}
                    {activeBanner.showTutorBtn && (
                      <Button variant="secondary" size="md" onClick={handleTutorOnboarding} className="group border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50 py-3 px-6">
                        <Users size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" /> 
                        Become a Tutor
                      </Button>
                    )}
                  </div>

                </motion.div>
              </AnimatePresence>

            </div>
          </>
        )}
      </section>

      {/* ================= SEARCH SECTION ================= */}
      <section className="py-8 bg-[#040814] relative z-30">
        <div className="max-w-4xl mx-auto px-4">
          <GlassCard className="p-4 bg-[#0b1329]/40 border-white/5 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full relative p-1.5 flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl focus-within:border-blue-500/40 transition-all">
              <Search size={20} className="ml-2 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search levels & categories (e.g., JLPT N4, TOPIK I, EPS - TOPIK)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none py-2"
              />
            </div>
            <Button 
              variant="primary" 
              size="lg" 
              className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-cyan-500 border-none text-sm px-8 py-3.5 shadow-lg shadow-blue-500/30 hover:shadow-cyan-500/40 transition-all duration-300 font-semibold tracking-wide" 
              onClick={() => navigate(`/marketplace?q=${searchQuery}`)}
            >
              Search Simulation
            </Button>
          </GlassCard>
        </div>
      </section>

      {/* ================= STATS SECTION ================= */}
      <section className="pt-12 pb-10 bg-[#040814]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
          >
            {stats.map((stat, i) => (
              <GlassCard key={i} className="p-8 text-center border-white/5 bg-[#0b1329]/40 backdrop-blur-xl hover:border-blue-500/30 transition-all duration-500 shadow-2xl group">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 group-hover:border-blue-400/50 transition-all duration-300">
                  <stat.icon size={26} className="text-blue-400" />
                </div>
                <div className="text-3xl font-extrabold text-white mb-1 group-hover:text-blue-300 transition-colors">{stat.value}</div>
                <div className="text-sm font-medium text-gray-400 tracking-wide uppercase">{stat.label}</div>
              </GlassCard>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================= PLATFORM FEATURES SECTION ================= */}
      <section className="py-20 bg-gradient-to-b from-transparent to-[#070e20]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <Badge color="blue" className="mb-4">Platform Features</Badge>
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Pass</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Precision-engineered tools that replicate real exam conditions and accelerate your progress</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} {...stagger} transition={{ duration: 0.4, delay: i * 0.1 }}>
                <GlassCard className="p-6 h-full hover:border-blue-500/30 transition-all duration-300 group hover:-translate-y-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
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

      {/* ================= TOP EXAM PACKS SECTION ================= */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-2">Top Exam Packs</h2>
              <p className="text-gray-400">Expert-crafted mock exams with detailed explanations</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/marketplace')} className="group">
              View All <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredExams.slice(0, 6).map((exam, i) => (
              <motion.div key={exam.id} {...stagger} transition={{ duration: 0.4, delay: i * 0.08 }}>
                <GlassCard hover className="overflow-hidden cursor-pointer group" onClick={() => navigate(`/exam/${exam.id}/preview`)}>
                  <div className="relative h-44 overflow-hidden">
                    <img src={exam.thumbnail} alt={exam.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge color="blue">{exam.category}</Badge>
                      {exam.tag && <Badge color="amber">{exam.tag}</Badge>}
                    </div>
                    <div className="absolute bottom-3 right-3 text-right">
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

      {/* ================= CERTIFIED TOP TUTORS HUB ================= */}
      <section className="py-24 bg-gradient-to-br from-transparent to-[#070e20]">
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

      {/* ================= TESTIMONIALS SECTION ================= */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Success Stories</h2>
            <p className="text-gray-400 text-lg">Real students, real results</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {testimonials.map((t) => (
              <motion.div key={t.id} {...stagger} transition={{ duration: 0.4 }}>
                <GlassCard className={`p-5 h-full transition-all duration-300 ${t.id === activeTestimonial ? 'border-blue-500/40 bg-blue-500/5 shadow-lg shadow-blue-500/5' : ''}`}>
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

      {/* ================= PRICING SECTION ================= */}
      <section className="py-24 bg-gradient-to-b from-transparent to-[#070e20]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Start free, upgrade when ready to accelerate your studies</p>
          </motion.div>
          {plansLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: `${BRAND.primary} transparent transparent transparent` }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <p className="text-gray-400 text-sm tracking-wide">Loading plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white/[0.01] border border-white/5 rounded-2xl">
              <AlertCircle className="mx-auto text-gray-600 mb-2" size={24} />
              <p className="text-sm">No active plans are currently included in the core repositories.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans.filter(plan => plan.active === true).map((plan) => {
                const IconComponent = iconMap[plan.icon] || Zap;
                const isPopular = plan.popular || false;
                return (
                  <motion.div key={plan._id} whileHover={{ y: -6 }} className={`relative bg-[#0b1221]/60 backdrop-blur-md border rounded-3xl p-8 flex flex-col shadow-2xl transition-all duration-300 ${isPopular ? 'border-blue-500 shadow-blue-500/10' : 'border-white/10'}`}>
                    {isPopular && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-lg z-10 tracking-wider uppercase">MOST POPULAR</div>}
                    <div className="flex items-center gap-4 mb-6 mt-2">
                      <div className={`p-3 rounded-2xl ${isPopular ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                        <IconComponent className={isPopular ? 'text-cyan-400' : 'text-blue-400'} size={24} />
                      </div>
                      <h3 className="text-2xl font-bold capitalize tracking-wide text-white">{plan.name}</h3>
                    </div>
                    <div className="mb-4">
                      <span className="text-4xl sm:text-5xl font-extrabold text-white">LKR {Number(plan.price).toLocaleString()}</span>
                      <span className="text-gray-400 text-sm font-light ml-1">/mo</span>
                    </div>
                    
                    <ul className="space-y-4 mb-8 flex-grow mt-4">
                      {Array.isArray(plan.features) && plan.features.length > 0 ? (
                        plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-gray-300 font-light">
                            <CheckCircle size={16} className={`${isPopular ? 'text-cyan-400' : 'text-emerald-400'} mt-0.5 flex-shrink-0`} />
                            <span>{feature}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500 font-light">No features listed</li>
                      )}
                    </ul>
                    
                    <Button variant={isPopular ? "primary" : "outline"} size="lg" fullWidth onClick={() => navigate('/pricing')} className="group">
                      Choose {plan.name} <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ================= FINAL ACTION CALL SECTION ================= */}
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
                <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">Join {adminStats?.totalUsers?.toLocaleString() || '24,000+'} Sri Lankan students who trust Langoora for their exam preparation.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button variant="primary" size="xl" onClick={() => navigate('/auth/register')} className="group">
                    Start Learning Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button variant="secondary" size="xl" onClick={handleTutorOnboarding}>Become a Tutor</Button>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        </div>
      </section>
      
    </div>
  );
}
