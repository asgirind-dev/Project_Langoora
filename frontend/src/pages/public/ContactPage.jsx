import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

const contactMethods = [
  { icon: Mail, title: 'Email Us', value: 'hello@langoora.lk', desc: 'We respond within 24 hours', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  { icon: Phone, title: 'Call Us', value: '+94 11 234 5678', desc: 'Mon–Fri, 9AM–6PM IST', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  { icon: MapPin, title: 'Visit Us', value: '45 Galle Road, Colombo 03', desc: 'Sri Lanka', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  { icon: MessageSquare, title: 'Live Chat', value: 'Available on website', desc: 'Mon–Sat, 8AM–10PM IST', color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
];

const faqs = [
  { q: 'How do I purchase an exam?', a: 'Browse the marketplace, select an exam, and click "Buy Now." You can pay via Visa, MasterCard, bank transfer, FriMi, or Genie.' },
  { q: 'Can I retake an exam?', a: 'Yes! Once purchased, you can retake any exam unlimited times. Each attempt is saved with full analytics.' },
  { q: 'How do I become a tutor?', a: 'Register as a tutor, upload your qualifications, and wait for verification. Once approved, you can create and sell exam packs.' },
  { q: 'Is there a refund policy?', a: 'We offer a 30-day money-back guarantee on all paid plans and individual exam purchases.' },
  { q: 'Do you support Sinhala and Tamil?', a: 'Yes, our interface is available in English, Sinhala, and Tamil. Some exam content is also localized.' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', category: 'general', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [openFaq, setOpenFaq] = useState(null);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (!form.message.trim()) e.message = 'Message is required';
    else if (form.message.trim().length < 10) e.message = 'Message must be at least 10 characters';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitted(true);
  };

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#060d1f] text-white">
        <Navbar />
        <section className="pt-32 pb-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={36} className="text-emerald-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Message Sent!</h1>
              <p className="text-gray-400 text-lg mb-2">Thank you for reaching out, {form.name}.</p>
              <p className="text-gray-400 mb-8">We'll get back to you at <span className="text-blue-400">{form.email}</span> within 24 hours.</p>
              <div className="flex items-center justify-center gap-4">
                <Button variant="primary" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', category: 'general', message: '' }); }}>
                  Send Another Message
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060d1f] text-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge color="blue" className="mb-4">Contact Us</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Get in Touch</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">Have a question, suggestion, or issue? We'd love to hear from you.</p>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactMethods.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <GlassCard className="p-5 text-center h-full">
                  <div className={`w-12 h-12 ${m.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                    <m.icon size={20} className={m.color} />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1">{m.title}</h3>
                  <p className="text-blue-300 text-sm font-medium mb-1">{m.value}</p>
                  <p className="text-xs text-gray-500">{m.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form + Info */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3">
              <GlassCard className="p-6 sm:p-8">
                <h2 className="text-xl font-bold text-white mb-6">Send Us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      placeholder="Kavindu Perera"
                      icon={Mail}
                      value={form.name}
                      onChange={set('name')}
                      error={errors.name}
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="you@example.com"
                      icon={Mail}
                      value={form.email}
                      onChange={set('email')}
                      error={errors.email}
                    />
                  </div>
                  <Input
                    label="Subject"
                    placeholder="What's this about?"
                    value={form.subject}
                    onChange={set('subject')}
                    error={errors.subject}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-300">Category</label>
                    <select
                      value={form.category}
                      onChange={set('category')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60"
                    >
                      <option value="general" className="bg-[#0f1629]">General Inquiry</option>
                      <option value="technical" className="bg-[#0f1629]">Technical Support</option>
                      <option value="billing" className="bg-[#0f1629]">Billing & Payments</option>
                      <option value="tutor" className="bg-[#0f1629]">Tutor Application</option>
                      <option value="feedback" className="bg-[#0f1629]">Feedback & Suggestions</option>
                      <option value="partnership" className="bg-[#0f1629]">Partnership Inquiry</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-300">Message</label>
                    <textarea
                      rows={5}
                      placeholder="Tell us more about your inquiry..."
                      value={form.message}
                      onChange={set('message')}
                      className={`w-full bg-white/5 border ${errors.message ? 'border-red-500/60' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/60 resize-none`}
                    />
                    {errors.message && <p className="text-xs text-red-400">{errors.message}</p>}
                    <p className="text-xs text-gray-500">{form.message.length}/1000 characters</p>
                  </div>
                  <Button type="submit" variant="primary" size="lg" fullWidth>
                    <Send size={16} /> Send Message
                  </Button>
                </form>
              </GlassCard>
            </motion.div>

            {/* Side Info */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-5">
              <GlassCard className="p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Clock size={16} className="text-blue-400" /> Business Hours</h3>
                <div className="space-y-2.5 text-sm">
                  {[
                    { day: 'Monday – Friday', time: '9:00 AM – 6:00 PM' },
                    { day: 'Saturday', time: '9:00 AM – 1:00 PM' },
                    { day: 'Sunday', time: 'Closed' },
                    { day: 'Public Holidays', time: 'Closed' },
                  ].map((h, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-400">{h.day}</span>
                      <span className="text-white font-medium">{h.time}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-xs text-blue-300">All times are in Sri Lanka Standard Time (UTC+5:30)</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Globe size={16} className="text-emerald-400" /> Office Location</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-300">45 Galle Road, Colombo 03</p>
                      <p className="text-gray-500 text-xs">Western Province, Sri Lanka</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Phone size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-300">+94 11 234 5678</p>
                      <p className="text-gray-500 text-xs">Main office line</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Mail size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-300">hello@langoora.lk</p>
                      <p className="text-gray-500 text-xs">General inquiries</p>
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 border-amber-500/20 bg-gradient-to-br from-amber-900/10 to-orange-900/5">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2"><AlertCircle size={16} className="text-amber-400" /> Urgent Issues?</h3>
                <p className="text-sm text-gray-400 mb-3">For exam-related emergencies during an active test session, use our live chat for immediate assistance.</p>
                <Button variant="secondary" size="sm" fullWidth>
                  <MessageSquare size={14} /> Start Live Chat
                </Button>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gradient-to-b from-transparent to-[#070e20]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400">Quick answers to common questions</p>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <GlassCard key={i} className="overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-medium text-white pr-4">{faq.q}</span>
                  <MessageSquare size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-5 pb-5">
                    <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}
