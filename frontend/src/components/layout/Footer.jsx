import { Link } from 'react-router-dom';
import { BookOpen, Twitter, Facebook, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

const footerLinks = {
  Platform: [
    { label: 'Exam Marketplace', href: '/marketplace' },
    { label: 'Services', href: '/services' },
    { label: 'Pricing Plans', href: '/pricing' },
    { label: 'Become a Tutor', href: '/auth/register?role=tutor' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
  Exams: [
    { label: 'JLPT', href: '/marketplace?category=JLPT' },
    { label: 'EPS-TOPIK', href: '/marketplace?category=EPS-TOPIK' }
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#060d1f] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <BookOpen size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">Langoora</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Sri Lanka's premier language exam preparation platform. Helping students achieve their dreams with authentic simulations and expert tutors.
            </p>
            <div className="flex flex-col gap-2.5 text-sm text-gray-400">
              <div className="flex items-center gap-2"><Mail size={14} /><span>hello@langoora.lk</span></div>
              <div className="flex items-center gap-2"><Phone size={14} /><span>+94 11 234 5678</span></div>
              <div className="flex items-center gap-2"><MapPin size={14} /><span>Colombo 03, Sri Lanka</span></div>
            </div>
            <div className="flex items-center gap-3 mt-5">
              {[Twitter, Facebook, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-white/5 hover:bg-blue-500/20 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all">
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white font-semibold mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-gray-400 hover:text-blue-300 text-sm transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">© 2024 Langoora. All rights reserved.</p>
          <p className="text-gray-500 text-sm">Made with care for Sri Lankan learners</p>
        </div>
      </div>
    </footer>
  );
}
