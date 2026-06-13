import { Outlet, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#060d1f] flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 via-[#060d1f] to-cyan-900/30" />
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-10"
              style={{
                width: Math.random() * 200 + 50,
                height: Math.random() * 200 + 50,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: i % 2 === 0 ? 'radial-gradient(circle, #3b82f6, transparent)' : 'radial-gradient(circle, #06b6d4, transparent)',
              }}
            />
          ))}
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <Link to="/" className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
              <BookOpen size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold">Langoora</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Your path to <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">language mastery</span>
          </h1>
          <p className="text-gray-300 text-lg mb-10 leading-relaxed">
            Join 24,000+ Sri Lankan students preparing for JLPT, EPS-TOPIK, IELTS, HSK, GRE and more with authentic simulations.
          </p>
          <div className="flex gap-6">
            {[
              { number: '24K+', label: 'Students' },
              { number: '1,800+', label: 'Exams' },
              { number: '340+', label: 'Tutors' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-blue-300">{stat.number}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Langoora</span>
          </Link>
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
