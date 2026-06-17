import { motion } from "framer-motion";
import {
  BookOpen,
  Users,
  Award,
  Globe,
  Target,
  Heart,
  ArrowRight,
  Zap,
  BarChart2,
  Mic,
  GraduationCap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import GlassCard from "../../components/ui/GlassCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

const team = [
  {
    name: "Ranil Wickramasinghe",
    role: "Founder & CEO",
    avatar:
      "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=200",
    desc: "Former language teacher turned edtech entrepreneur dedicated to localizing global education.",
  },
  {
    name: "Priya Mendis",
    role: "Head of Content",
    avatar:
      "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?w=200",
    desc: "JLPT N1 certified with 10+ years of language teaching experience across Sri Lanka.",
  },
  {
    name: "Dinesh Fernando",
    role: "CTO",
    avatar:
      "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?w=200",
    desc: "Full-stack engineer, ex-WSO2. Building scalable, high-performance web solutions.",
  },
  {
    name: "Amaya Silva",
    role: "Head of Design",
    avatar:
      "https://images.pexels.com/photos/3763152/pexels-photo-3763152.jpeg?w=200",
    desc: "UI/UX Designer specialized in creating gamified, user-centric educational flows.",
  },
];

const milestones = [
  {
    year: "2022",
    title: "Langoora Founded",
    desc: "Started as a simple portal offering JLPT mock exams for 50 ambitious language students.",
  },
  {
    year: "2023",
    title: "5,000+ Active Students",
    desc: "Expanded support by introducing intensive preparation pools for EPS-TOPIK, IELTS, and HSK.",
  },
  {
    year: "2024",
    title: "24,000+ Platform Learners",
    desc: "Launched our Pro & Elite preparation ecosystems with over 340+ verified academic tutors.",
  },
  {
    year: "2025",
    title: "Regional Expansion",
    desc: "Bringing personalized, localized exam simulation tech to South Asian learners.",
  },
];

const values = [
  {
    icon: Target,
    title: "Exam Accuracy",
    desc: "Every mock examination accurately mirrors the real test format, strict timing parameters, and difficulty scaling.",
  },
  {
    icon: Heart,
    title: "Student First",
    desc: "Tailored explicitly for Sri Lankan learners — built with localized support, flexible payment structures, and rich contextual learning.",
  },
  {
    icon: Globe,
    title: "Total Accessibility",
    desc: "Fully operational across English, Sinhala, and Tamil. Engineered to perform efficiently on any network connection.",
  },
  {
    icon: Award,
    title: "Certified Mentors",
    desc: "Every listed instructor undergoes thorough qualification checks, portfolio screening, and background reviews.",
  },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#060d1f] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge color="blue" className="mb-4">
              About Langoora
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Empowering Sri Lankan <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Learners Worldwide
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Langoora was born from a simple observation: Sri Lankan students
              deserve world-class exam preparation that deeply understands their unique
              linguistic needs, localized payment preferences, and professional global ambitions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Every single year, over 100,000 Sri Lankans step forward to sit for major international language proficiency
                exams aimed at higher university admissions, specialized overseas employment, or global immigration. Yet, standard test resources often lack localized support.
              </p>
              <p className="text-gray-300 leading-relaxed mb-6">
                Langoora bridges this gap completely. We deliver immersive, interactive mock platforms built around native-speaker testing environments, structured localized interfaces, and robust multi-tier tutor validation.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "24,000+", label: "Active Platform Learners" },
                  { value: "94%", label: "Verified Pass Rate" },
                  { value: "340+", label: "Certified Tutors" },
                  { value: "1,840+", label: "Available Mock Tests" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="p-4 bg-white/5 rounded-xl border border-white/10"
                  >
                    <div className="text-2xl font-bold text-blue-400">
                      {s.value}
                    </div>
                    <div className="text-sm text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl" />
                <GlassCard className="relative p-8">
                  <h3 className="text-xl font-bold mb-6">
                    What Makes Us Stand Out
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        icon: BookOpen,
                        text: "Authentic full-length simulations curated by professional instructors.",
                      },
                      {
                        icon: Mic,
                        text: "Crystal clear native-speaker audio for immersive listening modules.",
                      },
                      {
                        icon: BarChart2,
                        text: "Granular dashboard analytics tracking individual structural weak areas.",
                      },
                      {
                        icon: GraduationCap,
                        text: "Comprehensive focus metrics aligned with official JLPT, HSK, and IELTS guidelines.",
                      },
                      {
                        icon: Zap,
                        text: "Adaptive structural feedback frameworks customized to your study timeline.",
                      },
                    ].map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                          <f.icon size={15} className="text-blue-400" />
                        </div>
                        <p className="text-gray-300 text-sm">{f.text}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gradient-to-b from-transparent to-[#070e20]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Our Driving Values</h2>
            <p className="text-gray-400 text-lg">
              The foundational benchmarks guiding our architectural frameworks
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 h-full">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-4">
                    <v.icon size={22} className="text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {v.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {v.desc}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Our Corporate Journey</h2>
            <p className="text-gray-400 text-lg">
              Tracing our growth from a local vision to an expansive learning platform
            </p>
          </motion.div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-cyan-500/30 to-transparent" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                >
                  <div className="flex gap-6 items-start">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 bg-blue-500/15 border border-blue-500/30 rounded-2xl flex items-center justify-center">
                        <span className="text-blue-400 font-bold text-sm">
                          {m.year}
                        </span>
                      </div>
                    </div>
                    <GlassCard className="flex-1 p-5">
                      <h3 className="font-semibold text-white mb-1">
                        {m.title}
                      </h3>
                      <p className="text-sm text-gray-400">{m.desc}</p>
                    </GlassCard>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gradient-to-b from-transparent to-[#070e20]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Meet the Leadership</h2>
            <p className="text-gray-400 text-lg">The dedicated team pioneering the language technology shift</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 text-center">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 border-2 border-blue-500/30"
                  />
                  <h3 className="font-semibold text-white mb-1">{t.name}</h3>
                  <p className="text-blue-400 text-sm mb-2">{t.role}</p>
                  <p className="text-gray-400 text-xs px-1">{t.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GlassCard className="p-14 border-blue-500/20 bg-gradient-to-br from-blue-900/20 to-cyan-900/10">
              <h2 className="text-3xl font-bold mb-4">
                Join the Langoora Community
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
                Accelerate your progress today. Sign up as a self-paced student or join as a registered language academic tutor.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  variant="primary"
                  size="xl"
                  onClick={() => navigate("/auth/register")}
                >
                  Start Learning Free <ArrowRight size={18} />
                </Button>
                <Button
                  variant="secondary"
                  size="xl"
                  onClick={() => navigate("/auth/register?role=tutor")}
                >
                  Become a Tutor
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

    </div>
  );
}