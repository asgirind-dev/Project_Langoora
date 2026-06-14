import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, GraduationCap, MapPin, Save, Camera, CreditCard as Edit3, Building, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

export default function TutorProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || 'Hiroshi Tanaka', email: user?.email || 'hiroshi@example.com',
    phone: '+94 77 987 6543', qualifications: 'JLPT N1 Certified, M.Ed TESOL',
    university: 'University of Kelaniya', address: '45 Temple Road, Kandy',
    bankName: 'Commercial Bank', accountNo: '****4521', accountHolder: 'Hiroshi Tanaka',
  });

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Tutor Profile</h1>
        <p className="text-gray-400">Your public profile and account settings</p>
      </motion.div>

      <GlassCard className="p-6">
        <div className="flex items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {form.name.charAt(0)}
            </div>
            <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-400">
              <Camera size={14} className="text-white" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{form.name}</h2>
                <p className="text-gray-400 text-sm mt-1">{form.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge color="blue">Verified Tutor</Badge>
                  <Badge color="amber">Top Rated</Badge>
                  <Badge color="green">JLPT Expert</Badge>
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
            <Input label="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} icon={Mail} disabled={!editing} />
            <Input label="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} icon={Phone} disabled={!editing} />
            <Input label="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} icon={MapPin} disabled={!editing} />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><GraduationCap size={18} className="text-amber-400" /> Qualifications</h3>
          <div className="space-y-4">
            <Input label="Qualifications" value={form.qualifications} onChange={e => setForm(p => ({ ...p, qualifications: e.target.value }))} icon={GraduationCap} disabled={!editing} />
            <Input label="University / Institution" value={form.university} onChange={e => setForm(p => ({ ...p, university: e.target.value }))} icon={Building} disabled={!editing} />
          </div>
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-sm font-semibold text-emerald-400 mb-1">Verification Status</p>
            <p className="text-xs text-gray-400">Your qualifications have been verified by the Langoora team.</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><CreditCard size={18} className="text-emerald-400" /> Bank Details</h3>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Bank Name" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} icon={Building} disabled={!editing} />
            <Input label="Account Number" value={form.accountNo} onChange={e => setForm(p => ({ ...p, accountNo: e.target.value }))} icon={CreditCard} disabled={!editing} />
            <Input label="Account Holder" value={form.accountHolder} onChange={e => setForm(p => ({ ...p, accountHolder: e.target.value }))} icon={User} disabled={!editing} />
          </div>
          <p className="text-xs text-gray-500 mt-3">Bank details are used for payout processing. All information is securely stored.</p>
        </GlassCard>
      </div>
    </div>
  );
}
