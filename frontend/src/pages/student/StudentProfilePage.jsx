import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Calendar, MapPin, CreditCard as Edit3, Save, Camera, BookOpen, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || 'Kavindu Perera',
    email: user?.email || 'kavindu@example.com',
    phone: '+94 77 123 4567',
    dob: '1999-06-15',
    city: 'Colombo',
    targetExam: 'JLPT N2',
    targetDate: '2024-12-01',
  });

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">My Profile</h1>
        <p className="text-gray-400">Manage your personal information and preferences</p>
      </motion.div>

      <GlassCard className="p-6">
        <div className="flex items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {form.name.charAt(0)}
            </div>
            <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-400 transition-colors">
              <Camera size={14} className="text-white" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{form.name}</h2>
                <p className="text-gray-400 text-sm mt-1">{form.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge color="blue">Pro Student</Badge>
                  <Badge color="amber">12-day streak</Badge>
                </div>
              </div>
              <Button variant={editing ? 'success' : 'secondary'} size="sm" onClick={() => setEditing(!editing)}>
                {editing ? <><Save size={14} /> Save</> : <><Edit3 size={14} /> Edit</>}
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><User size={18} className="text-blue-400" /> Personal Info</h3>
          <div className="space-y-4">
            <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} icon={User} disabled={!editing} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} icon={Mail} disabled={!editing} />
            <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} icon={Phone} disabled={!editing} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date of Birth" type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} icon={Calendar} disabled={!editing} />
              <Input label="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} icon={MapPin} disabled={!editing} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><Award size={18} className="text-amber-400" /> Exam Goals</h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Target Exam</label>
              <select
                value={form.targetExam}
                onChange={e => setForm(p => ({ ...p, targetExam: e.target.value }))}
                disabled={!editing}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60 disabled:opacity-60"
              >
                {['JLPT N1','JLPT N2','JLPT N3','EPS-TOPIK','IELTS Academic','IELTS General','HSK 5','GRE','SAT'].map(e => (
                  <option key={e} value={e} className="bg-[#0f1629]">{e}</option>
                ))}
              </select>
            </div>
            <Input label="Target Exam Date" type="date" value={form.targetDate} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))} icon={Calendar} disabled={!editing} />
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Achievements</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'First Exam', color: 'amber' },
                { label: '10 Exams', color: 'blue' },
                { label: '7-Day Streak', color: 'emerald' },
              ].map(a => (
                <div key={a.label} className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                  <Award size={20} className="text-amber-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-300">{a.label}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><BookOpen size={18} className="text-emerald-400" /> Purchased Exams</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {['JLPT N2 Full Mock', 'EPS-TOPIK Standard', 'JLPT N2 Grammar', 'JLPT N2 Vocabulary'].map((e, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/3 rounded-xl border border-white/8">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <BookOpen size={14} className="text-blue-400" />
              </div>
              <span className="text-sm text-gray-300">{e}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
