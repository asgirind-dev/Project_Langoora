import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, Zap, Shield, Star, ArrowRight, HelpCircle } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { subscriptionPlans } from '../../data/mockData';

const faqs = [
  { q: 'Can I switch plans anytime?', a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.' },
  { q: 'Is there a free trial for Pro?', a: 'Yes! Pro comes with a 7-day free trial. Cancel anytime before it ends and you won\'t be charged.' },
  { q: 'What payment methods do you accept?', a: 'We accept Visa, MasterCard, bank transfers, and mobile payments via FriMi and Genie.' },
  { q: 'Can I get a refund?', a: 'We offer a 30-day money-back guarantee on all paid plans. No questions asked.' },
  { q: 'Are the exams the same across plans?', a: 'Free users get 3 exams/month. Pro and Elite get unlimited access to all exam categories.' },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState('monthly');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleUpgrade = (plan) => {
    setSelected(plan);
    setModal(true);
  };

  return (
    <div className="min-h-screen bg-[#060d1f] text-white">
      <Navbar />

      <section className="pt-32 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <Badge color="blue" className="mb-4">Pricing</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Start free, upgrade when you're ready. No hidden fees, no surprises.</p>
          </motion.div>

          <div className="flex items-center justify-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit mx-auto mb-12">
            {['monthly', 'yearly'].map(b => (
              <button key={b} onClick={() => setBilling(b)}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium capitalize transition-all ${billing === b ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'text-gray-400 hover:text-white'}`}>
                {b}
                {b === 'yearly' && <span className="text-xs text-amber-300 ml-1.5 font-semibold">Save 20%</span>}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {subscriptionPlans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}>
                <GlassCard className={`p-8 h-full relative ${plan.popular ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg shadow-blue-500/30">MOST POPULAR</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 mb-5">
                    {plan.id === 'elite' ? <Star size={22} className="text-amber-400" /> : plan.id === 'pro' ? <Zap size={22} className="text-blue-400" /> : <Shield size={22} className="text-gray-400" />}
                    <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  </div>
                  <div className="mb-8">
                    {plan.price === 0 ? (
                      <div className="text-5xl font-bold text-white">Free</div>
                    ) : (
                      <div>
                        <span className="text-5xl font-bold text-white">
                          LKR {billing === 'yearly' ? Math.round(plan.price * 0.8).toLocaleString() : plan.price.toLocaleString()}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">/month</span>
                        {billing === 'yearly' && (
                          <p className="text-xs text-emerald-400 mt-1">Billed annually · LKR {(Math.round(plan.price * 0.8) * 12).toLocaleString()}/year</p>
                        )}
                      </div>
                    )}
                  </div>
                  <ul className="space-y-3.5 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm text-gray-300">
                        <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.popular ? 'primary' : plan.id === 'free' ? 'secondary' : 'outline'}
                    fullWidth
                    size="lg"
                    onClick={() => plan.price > 0 ? handleUpgrade(plan) : navigate('/auth/register')}
                  >
                    {plan.price === 0 ? 'Start Free' : `Get ${plan.name}`}
                    {plan.popular && <ArrowRight size={16} />}
                  </Button>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Feature Comparison */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-20">
            <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-gray-400 font-medium">Feature</th>
                      <th className="text-center p-4 text-gray-400 font-medium">Free</th>
                      <th className="text-center p-4 text-blue-400 font-medium">Pro</th>
                      <th className="text-center p-4 text-amber-400 font-medium">Elite</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ['Mock Exams', '3/month', 'Unlimited', 'Unlimited'],
                      ['Analytics', 'Basic', 'Advanced', 'Advanced + AI'],
                      ['Exam Categories', '2', 'All', 'All'],
                      ['Offline Access', '—', 'Yes', 'Yes'],
                      ['Certificates', '—', 'Yes', 'Yes'],
                      ['1-on-1 Tutor Sessions', '—', '—', '2/month'],
                      ['Personalized Study Plan', '—', '—', 'Yes'],
                      ['Career Guidance', '—', '—', 'Yes'],
                      ['Priority Support', '—', 'Yes', 'Yes'],
                    ].map(([feature, free, pro, elite], i) => (
                      <tr key={i} className="hover:bg-white/3 transition-colors">
                        <td className="p-4 text-gray-300">{feature}</td>
                        <td className="p-4 text-center text-gray-500">{free === '—' ? '—' : free}</td>
                        <td className="p-4 text-center text-gray-300">{pro === '—' ? '—' : pro}</td>
                        <td className="p-4 text-center text-gray-300">{elite === '—' ? '—' : elite}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>

          {/* FAQ */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <GlassCard key={i} className="overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span className="font-medium text-white pr-4">{faq.q}</span>
                    <HelpCircle size={18} className={`text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-5 pb-5">
                      <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </GlassCard>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-20 text-center">
            <GlassCard className="p-12 border-blue-500/20 bg-gradient-to-br from-blue-900/20 to-cyan-900/10">
              <h2 className="text-3xl font-bold mb-3">Still not sure?</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">Start with the free plan and upgrade when you're ready. No credit card required.</p>
              <Button variant="primary" size="xl" onClick={() => navigate('/auth/register')}>
                Start Free Today <ArrowRight size={18} />
              </Button>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={`Upgrade to ${selected?.name}`}>
        {selected && (
          <div className="space-y-5">
            <p className="text-gray-300">You're upgrading to <span className="text-white font-semibold">{selected.name}</span> plan.</p>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{selected.name} Plan ({billing})</span>
                <span className="text-white font-semibold">LKR {(billing === 'yearly' ? Math.round(selected.price * 0.8) : selected.price).toLocaleString()}/mo</span>
              </div>
              {billing === 'yearly' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Annual total</span>
                  <span className="text-emerald-400 font-semibold">LKR {(Math.round(selected.price * 0.8) * 12).toLocaleString()}/yr</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Billing starts</span>
                <span className="text-white">After 7-day free trial</span>
              </div>
            </div>
            <Button variant="primary" fullWidth onClick={() => { setModal(false); navigate('/auth/register'); }}>
              Start Free Trial
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
