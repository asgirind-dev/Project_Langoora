import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Menu, X, ChevronDown, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Exams', href: '/marketplace' },
  { label: 'Services', href: '/services' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth(); 
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);


  const handleDashboardNavigation = () => {
    if (!user) {
      navigate('/auth/login');
      return;
    }


    if (user.role === 'tutor') {
      if (user.status === 'pending') {
        navigate('/auth/under-review');
      } else {
        navigate('/tutor');
      }
    } else if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/student');
    }
  };

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-[#060d1f]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">Langoora</span>
          </Link>

          <div className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {navLinks.map(link => (
              <Link key={link.label} to={link.href} className="text-gray-300 hover:text-white text-sm font-medium transition-colors hover:text-blue-300">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Navigation Group */}
          <div className="hidden lg:flex items-center gap-3 ml-auto">
            {user ? (
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleDashboardNavigation}>Dashboard</Button>
                <Button variant="secondary" size="sm" onClick={logout}>Logout</Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth/login')}>Sign In</Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/auth/register')}>Get Started</Button>
              </>
            )}
          </div>

          <button className="lg:hidden p-2 text-gray-300 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Group */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#060d1f]/98 border-t border-white/10"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {navLinks.map(link => (
                <Link key={link.label} to={link.href} className="text-gray-300 py-2 hover:text-white text-sm" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Button variant="secondary" size="sm" fullWidth onClick={() => { handleDashboardNavigation(); setMenuOpen(false); }}>Dashboard</Button>
                  <Button variant="ghost" size="sm" fullWidth onClick={() => { logout(); setMenuOpen(false); }}>Logout</Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" size="sm" fullWidth onClick={() => { navigate('/auth/login'); setMenuOpen(false); }}>Sign In</Button>
                  <Button variant="primary" size="sm" fullWidth onClick={() => { navigate('/auth/register'); setMenuOpen(false); }}>Get Started</Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}