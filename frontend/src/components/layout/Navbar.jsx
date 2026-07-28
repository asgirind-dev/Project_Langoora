import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Menu, X, Bell, Coins, ArrowRight, CheckCircle } from 'lucide-react';
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
  const [notifOpen, setNotifOpen] = useState(false); // 🔔 Notification Dropdown toggle state
  const notifRef = useRef(null);

  const { user, logout } = useAuth(); 
  const navigate = useNavigate();

  // 🪙 Credits සහ 🔔 Notifications සඳහා States
  const [credits, setCredits] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // 🖱️ Dropdown එකෙන් පිටත Click කළාම Auto-close කිරීම
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔄 Credits & Notifications fetch කිරීම
  useEffect(() => {
    const userId = user?.uid || user?.id || user?._id;

    if (user && userId) {
      const token = localStorage.getItem('token') || user?.token;

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      // 🪙 1. Fetch Student Profile
      fetch(`http://localhost:5000/api/student/${userId}`, { headers })
        .then((res) => {
          if (!res.ok) throw new Error(`Credits Status: ${res.status}`);
          return res.json();
        })
        .then((resData) => {
          const profile = resData?.data || resData;

          const userCredits = 
            profile?.credits ?? 
            profile?.examCredits ?? 
            profile?.totalCredits ?? 
            profile?.coins ?? 
            0;

          setCredits(userCredits);
        })
        .catch((err) => console.error("Error fetching credits in Navbar:", err));

      // 🔔 2. Fetch Notification Unread Count
      fetch(`http://localhost:5000/api/notifications/user/${userId}/count`, { headers })
        .then((res) => {
          if (!res.ok) throw new Error(`Notifications Status: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          const count = data?.count ?? data?.unreadCount ?? (typeof data === 'number' ? data : 0);
          setUnreadCount(count);
        })
        .catch((err) => console.error("Error fetching notification count:", err));
    }
  }, [user]);

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
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">Langoora</span>
          </Link>

          {/* Center Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 mx-auto">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors hover:text-blue-300"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Navigation Group */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* 🪙 Credits Badge (Pricing / Plans Page එකට Navigate වේ) */}
                {(user.role === 'student' || !user.role) && (
                  <Link 
                    to="/pricing" 
                    className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-amber-500/20 transition cursor-pointer"
                    title="Buy More Credits / View Plans"
                  >
                    <Coins size={15} className="text-amber-400" />
                    <span>{credits} Credits</span>
                  </Link>
                )}

                {/* 🔔 Notification Icon & Dropdown Pop-up */}
                {(user.role === 'student' || !user.role) && (
                  <div className="relative" ref={notifRef}>
                    <button 
                      onClick={() => setNotifOpen(!notifOpen)}
                      className="relative p-2 text-gray-300 hover:text-white transition rounded-full hover:bg-white/10"
                      title="Notifications"
                    >
                      <Bell size={18} />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notification Dropdown Menu */}
                    <AnimatePresence>
                      {notifOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-3 w-80 bg-[#0a1633] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
                        >
                          <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                              <Bell size={16} className="text-blue-400" />
                              Notifications
                            </h4>
                            {unreadCount > 0 && (
                              <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">
                                {unreadCount} New
                              </span>
                            )}
                          </div>

                          <div className="max-h-64 overflow-y-auto p-3 space-y-2">
                            {unreadCount > 0 ? (
                              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200 flex items-start gap-2.5">
                                <CheckCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold text-white">New Notifications</p>
                                  <p className="text-gray-300 mt-0.5">You have {unreadCount} unread notification(s) waiting in your inbox.</p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-6 text-gray-400 text-xs">
                                No new notifications
                              </div>
                            )}
                          </div>

                          <div className="p-2.5 bg-white/5 border-t border-white/10 text-center">
                            <Link 
                              to="/student/notifications" 
                              onClick={() => setNotifOpen(false)}
                              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition flex items-center justify-center gap-1 py-1"
                            >
                              <span>View All Notifications</span>
                              <ArrowRight size={14} />
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

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
              {/* Mobile වලදී Logged in Student සඳහා Credits & Notifications */}
              {user && (user.role === 'student' || !user.role) && (
                <div className="flex items-center justify-between p-2.5 mb-2 bg-white/5 rounded-xl border border-white/10">
                  <Link 
                    to="/pricing" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-1.5 text-amber-400 text-sm font-semibold"
                  >
                    <Coins size={16} />
                    <span>{credits} Credits</span>
                  </Link>
                  <Link 
                    to="/student/notifications" 
                    onClick={() => setMenuOpen(false)}
                    className="relative text-gray-300 flex items-center gap-2 text-sm"
                  >
                    <Bell size={18} />
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                </div>
              )}

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