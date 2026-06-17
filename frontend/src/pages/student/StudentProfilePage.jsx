import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Calendar, MapPin, CreditCard as Edit3, Save, Camera, BookOpen, Award, Globe, Lock } from 'lucide-react';
import { Building, CreditCard } from 'lucide-react';
// 🔥 ඔයාගේ Context එකෙන් දැනට ඉන්න යූසර්ව විතරක් ගන්නවා (Safe & Simple)
import { useAuth } from '../../context/AuthContext'; 

import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

export default function StudentProfilePage() {
  const { user } = useAuth(); // AuthContext එකෙන් දැනට ඉන්න යූසර්ව ගන්නවා
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 1. Personal & Exam Info State
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    city: '',
    targetExam: 'JLPT N2',
    targetDate: '',
    bankName: '',
    accountNo: '',
    accountHolder: '',
  });

  // 2. Language State
  const [language, setLanguage] = useState('English');

  // 3. Change Password State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });



  // 🔄 CRUD: Read 
  useEffect(() => {
    const fetchLatestProfile = async () => {
      const uid = user?.uid || user?.id;
      if (!uid) return;

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`http://localhost:5000/api/users/profile?uid=${uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data) {
            const dbUser = resData.data;
            setForm({
              name: dbUser.name || user.name || 'Student',
              email: user.email || '',
              phone: dbUser.phone || '',
              dob: dbUser.dob || '',
              city: dbUser.city || '',
              targetExam: dbUser.targetExam || 'JLPT N2',
              targetDate: dbUser.targetDate || '',
              bankName: resData.data.bankName || '', 
              accountNo: resData.data.accountNo || '', 
              accountHolder: resData.data.accountHolder || '',
            });
            if (dbUser.language) setLanguage(dbUser.language);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching latest profile from DB:", err);
      } finally {
        setLoading(false);
      }

     
      setForm(prev => ({
        ...prev,
        name: user.name || 'Student',
        email: user.email || '',
        phone: user.phone || '',
        dob: user.dob || '',
        city: user.city || '',
        targetExam: user.targetExam || 'JLPT N2',
        targetDate: user.targetDate || '',
      }));
      if (user.language) setLanguage(user.language);
    };

    if (user) {
      fetchLatestProfile();
    }
  }, [user]);

  const handlePasswordChange = (e) => {
    setPasswords(p => ({ ...p, [e.target.name]: e.target.value }));
  };


  const handleProfileSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token'); 

      const response = await fetch('http://localhost:5000/api/users/profile/update', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          uid: user?.uid || user?.id,
          name: form.name,
          phone: form.phone,
          dob: form.dob,
          city: form.city,
          targetExam: form.targetExam,
          targetDate: form.targetDate,
          bankName: form.bankName,
          accountNo: form.accountNo,
          accountHolder: form.accountHolder,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile on backend.');
      }

     
      const updatedUser = { ...user, ...form };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      alert("Profile updated successfully!");
      setEditing(false);
    } catch (error) {
      console.error("Profile update error:", error);
      alert(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 CRUD: Update - Language preference (Node.js Backend API)
  const handleLanguageSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/settings/language', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          uid: user?.uid || user?.id,
          language: language 
        })
      });

      if (!response.ok) throw new Error('Failed to update language');

      const updatedUser = { ...user, language };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      alert(`Language preference updated to ${language}!`);
    } catch (error) {
      console.error("Language update error:", error);
      alert(error.message || "Failed to update language");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 CRUD: Update - Change Password (Node.js Backend API)
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/settings/password', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          uid: user?.uid || user?.id,
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Password update failed');
      
      alert("Password updated successfully!");
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error("Password update error:", error);
      alert(error.message || "Password update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl relative">
      
      {/* 🔄 Loading Spinner Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center text-white font-medium backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-200">Updating settings via API...</p>
        </div>
      )}

      {/* Title Section */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">My Profile</h1>
        <p className="text-gray-400">Manage your personal information and preferences</p>
      </motion.div>

      {/* Main Avatar Card */}
      <GlassCard className="p-6">
        <div className="flex items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg select-none">
              {form.name ? form.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-400 transition-colors">
              <Camera size={14} className="text-white" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white capitalize">{form.name}</h2>
                <p className="text-gray-400 text-sm mt-1">{form.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge color="blue">Pro Student</Badge>
                  <Badge color="amber">12-day streak</Badge>
                </div>
              </div>
              <Button 
                variant={editing ? 'success' : 'secondary'} 
                size="sm" 
                onClick={editing ? handleProfileSave : () => setEditing(true)}
              >
                {editing ? <><Save size={14} /> Save</> : <><Edit3 size={14} /> Edit</>}
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Info & Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info Card */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><User size={18} className="text-blue-400" /> Personal Info</h3>
          <div className="space-y-4">
            <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} icon={User} disabled={!editing} />
            <Input label="Email" type="email" value={form.email} icon={Mail} disabled={true} />
            <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} icon={Phone} disabled={!editing} placeholder="+94 7X XXX XXXX" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date of Birth" type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} icon={Calendar} disabled={!editing} />
              <Input label="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} icon={MapPin} disabled={!editing} placeholder="Colombo" />
            </div>
          </div>
        </GlassCard>

        {/* Exam Goals Card */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><Award size={18} className="text-amber-400" /> Exam Goals</h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Target Exam</label>
              <select
                value={form.targetExam}
                onChange={e => setForm(p => ({ ...p, targetExam: e.target.value }))}
                disabled={!editing}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60 text-white"
              >
                {['JLPT N1','JLPT N2','JLPT N3','EPS-TOPIK','IELTS Academic','IELTS General','HSK 5','GRE','SAT'].map(e => (
                  <option key={e} value={e} className="bg-[#0f1629] text-white">{e}</option>
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

      {/* LANGUAGE & REGION CARD */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe size={18} className="text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Language & Region</h3>
        </div>
        
        <form onSubmit={handleLanguageSubmit} className="space-y-4 max-w-md">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Interface Language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60 text-white"
            >
              <option value="English" className="bg-[#0f1629] text-white">English</option>
              <option value="Sinhala" className="bg-[#0f1629] text-white">Sinhala</option>
              <option value="Tamil" className="bg-[#0f1629] text-white">Tamil</option>
            </select>
          </div>
          <Button type="submit" variant="primary" size="sm">
            Save Preference
          </Button>
        </form>
      </GlassCard>

      {/* CHANGE PASSWORD CARD */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={18} className="text-amber-400" />
          <h3 className="text-lg font-semibold text-white">Change Password</h3>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <Input 
            label="Current Password" 
            type="password" 
            name="currentPassword"
            value={passwords.currentPassword} 
            onChange={handlePasswordChange} 
            icon={Lock} 
            placeholder="••••••••"
          />
          <Input 
            label="New Password" 
            type="password" 
            name="newPassword"
            value={passwords.newPassword} 
            onChange={handlePasswordChange} 
            icon={Lock} 
            placeholder="••••••••"
          />
          <Input 
            label="Confirm New Password" 
            type="password" 
            name="confirmPassword"
            value={passwords.confirmPassword} 
            onChange={handlePasswordChange} 
            icon={Lock} 
            placeholder="••••••••"
          />
          <div className="pt-2">
            <Button type="submit" variant="primary" size="sm">
              Update Password
            </Button>
          </div>
        </form>
      </GlassCard>

      <GlassCard className="p-6">
  <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
    <CreditCard size={18} className="text-emerald-400" /> Bank Details
  </h3>
  
  {/* මෙතන grid-cols-1 md:grid-cols-3 දැම්මම ලස්සනට කාඩ් එක ඇතුලේ අයිතම 3ක් පේනවා */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Input 
      label="Bank Name" 
      value={form.bankName} 
      onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} 
      icon={Building} 
      disabled={!editing} 
    />
    <Input 
      label="Account Number" 
      value={form.accountNo} 
      onChange={e => setForm(p => ({ ...p, accountNo: e.target.value }))} 
      icon={CreditCard} 
      disabled={!editing} 
    />
    <Input 
      label="Account Holder" 
      value={form.accountHolder} 
      onChange={e => setForm(p => ({ ...p, accountHolder: e.target.value }))} 
      icon={User} 
      disabled={!editing} 
    />
  </div>
  <p className="text-xs text-gray-500 mt-3">Bank details are used for payout processing. All information is securely stored.</p>
</GlassCard>



     
    </div>
  );
}