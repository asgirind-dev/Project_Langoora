import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Calendar, MapPin, Edit3, Save, Camera, Award, Building, CreditCard, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; 

import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

const API_BASE_URL = 'http://localhost:5000/api/student';

export default function StudentProfilePage() {
  const { user } = useAuth(); 
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [form, setForm] = useState({
    name: '', email: '', phone: '', dob: '', city: '',
    targetExam: 'JLPT N5', targetDate: '',
    bankName: '', accountNo: '', accountHolder: '',
  });

  const [profilePic, setProfilePic] = useState(null);

  const calculateDaysLeft = (targetDateStr) => {
    if (!targetDateStr) return null;
    const diffTime = new Date(targetDateStr) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  useEffect(() => {
    const uid = user?.uid || user?.id;
    if (!uid) return;
    const fetchStudentData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/${uid}`);
        const result = await response.json();
        if (result.success && result.data) {
          const data = result.data;
          setForm({
            name: data.name || user.name || 'Student',
            email: user.email || '',
            phone: data.phone || '',
            dob: data.dob || '',
            city: data.city || '',
            targetExam: data.targetExam || 'JLPT N5',
            targetDate: data.targetDate || '',
            bankName: data.bankName || '', 
            accountNo: data.accountNo || '', 
            accountHolder: data.accountHolder || '',
          });
          if (data.profilePicUrl) setProfilePic(data.profilePicUrl);
        }
      } catch (error) { console.error("Error fetching student profile:", error); }
      finally { setLoading(false); }
    };
    fetchStudentData();
  }, [user]);

  const handleProfileSave = async () => {
    const uid = user?.uid || user?.id;
    if (!uid) return;

    let newErrors = {};
    const phoneRegex = /^[0-9]{10}$/; 
    if (!phoneRegex.test(form.phone)) {
        newErrors.phone = "Phone number must be exactly 10 digits";
    }
    
    // Validation for exactly 16 digits
    if (form.accountNo && form.accountNo.length !== 16) {
        newErrors.accountNo = "Card number must be exactly 16 digits";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; 
    }

    setErrors({});
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if ((await response.json()).success) {
        setEditing(false);
        alert("Success! Your profile settings have been securely saved.");
      }
    } catch (error) { alert("Network failure."); }
    finally { setLoading(false); }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    const uid = user?.uid || user?.id;
    if (!file || !uid) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64String = reader.result;
      setLoading(true);
      try {
        await fetch(`${API_BASE_URL}/${uid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profilePicUrl: base64String })
        });
        setProfilePic(base64String);
      } finally { setLoading(false); }
    };
  };

  const handleRemoveBankDetails = async () => {
    const uid = user?.uid || user?.id;
    if (!window.confirm("Remove your bank card information?")) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/${uid}/bank-details`, { method: 'DELETE' });
      setForm(p => ({ ...p, bankName: '', accountNo: '', accountHolder: '' }));
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 max-w-4xl relative pb-12">
      {loading && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center text-white backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-white mb-1">My Profile</h1>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white overflow-hidden">
              {profilePic ? <img src={profilePic} className="w-full h-full object-cover" /> : <span>{form.name?.charAt(0).toUpperCase()}</span>}
            </div>
            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center cursor-pointer">
              <Camera size={14} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />
            </label>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white capitalize">{form.name || "Student"}</h2>
            <p className="text-gray-400 text-sm">{form.email}</p>
            <div className="flex gap-2 mt-3 justify-center sm:justify-start">
              <Badge color="blue">Pro Student</Badge>
              <Badge color="green">Top Achiever</Badge>
              <Badge color="yellow">Nova Expert</Badge>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <User size={18} className="text-blue-400" /> Personal Info
            </h3>
            <Button variant={editing ? 'success' : 'secondary'} size="sm" onClick={editing ? handleProfileSave : () => setEditing(true)}>
              {editing ? <><Save size={14} className="mr-1" /> Save</> : <><Edit3 size={14} className="mr-1" /> Edit</>}
            </Button>
          </div>
          <div className="space-y-4">
            <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} icon={User} disabled={!editing} />
            <Input label="Phone" type="number" value={form.phone || ''} onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); if(errors.phone) setErrors(p => ({...p, phone: null})); }} icon={Phone} disabled={!editing} placeholder="07XXXXXXXX" />
            {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date of Birth" type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} icon={Calendar} disabled={!editing} />
              <Input label="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} icon={MapPin} disabled={!editing} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Award size={18} className="text-amber-400" /> Exam Goals
          </h3>
          <div className="space-y-4">
            <select value={form.targetExam} onChange={e => setForm(p => ({ ...p, targetExam: e.target.value }))} disabled={!editing} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm">
              {['JLPT N5', 'JLPT N4', 'JLPT N3', 'JLPT N2', 'EPS-TOPIK (Standard)'].map(exam => (
                <option key={exam} value={exam} className="bg-[#0f1629]">{exam}</option>
              ))}
            </select>
            <Input label="Target Exam Date" type="date" value={form.targetDate} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))} icon={Calendar} disabled={!editing} />
            {form.targetDate && (
              <Badge color={calculateDaysLeft(form.targetDate) > 30 ? 'blue' : 'red'}>
                {calculateDaysLeft(form.targetDate)} Days Remaining
              </Badge>
            )}
          </div>
        </GlassCard>
      </div>
      
      <GlassCard className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-400" /> 
            {(form.bankName || form.accountNo || form.accountHolder) ? "Bank Details" : "Add Bank Card"}
          </h3>
          {form.accountNo && !editing && (
            <button 
              onClick={handleRemoveBankDetails}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 size={16} /> Remove Card
            </button>
          )}
        </div>
        
        {editing && (
            <p className="text-amber-500 text-sm mb-4">⚠ Please click the "Save" button at the top of the profile to lock in your bank changes.</p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Bank Name</label>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
              {editing ? (
                <input className="w-full bg-transparent outline-none text-sm placeholder-gray-600" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} placeholder="e.g. Commercial Bank" />
              ) : (
                <span className={!form.bankName ? "text-gray-600 italic text-sm" : "text-white"}>
                  {form.bankName || "Enter bank name"}
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Card Number</label>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
              {editing ? (
                <input 
                    className="w-full bg-transparent outline-none text-sm placeholder-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    type="number" 
                    value={form.accountNo} 
                    onChange={e => {
                        setForm(p => ({ ...p, accountNo: e.target.value }));
                        if(errors.accountNo) setErrors(prev => ({...prev, accountNo: null}));
                    }} 
                    placeholder="Enter 16 digits"
                />
              ) : (
                <span className={!form.accountNo ? "text-gray-600 italic text-sm" : "text-emerald-400 font-mono text-sm"}>
                  {form.accountNo ? `xxxx xxxx xxxx ${form.accountNo.slice(-4)}` : "Enter card number"}
                </span>
              )}
            </div>
            {errors.accountNo && <p className="text-red-500 text-xs mt-1">{errors.accountNo}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Account Holder</label>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
              {editing ? (
                <input className="w-full bg-transparent outline-none text-sm placeholder-gray-600" value={form.accountHolder} onChange={e => setForm(p => ({ ...p, accountHolder: e.target.value }))} placeholder="Name on Card/Passbook" />
              ) : (
                <span className={!form.accountHolder ? "text-gray-600 italic text-sm" : "text-white"}>
                  {form.accountHolder || "Enter account holder name"}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-6">Bank details are used securely for internal processing, rewards, and tuition payouts.</p>
      </GlassCard>
    </div>
  );
}