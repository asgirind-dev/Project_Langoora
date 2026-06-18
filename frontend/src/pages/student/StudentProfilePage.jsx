import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, MapPin, Edit3, Save, Camera, Award, Building, CreditCard, Trash2, AlertTriangle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; 

import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

// Firebase Re-authentication Instance 
import { auth } from '../../firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';

const API_BASE_URL = 'http://localhost:5000/api/student';

export default function StudentProfilePage() {
  const { user, logout } = useAuth(); 
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [profilePic, setProfilePic] = useState(null);

  // Form Initial State
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    city: '',
    targetExam: 'JLPT N5',
    targetDate: '',
    bankName: '',
    accountNo: '',
    accountHolder: '',
  });

  // ACCOUNT TERMINATION STATES 
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const calculateDaysLeft = (targetDateStr) => {
    if (!targetDateStr) return null;
    const diffTime = new Date(targetDateStr) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // 1. GET INITIAL SYNC
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
            name: data.name || user.name || '',
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
      } catch (error) {
        console.error("Error fetching profile registry node:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [user]);

  // 2. PROFILE IMAGE CONVERSION MAPPED DIRECTLY
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    const uid = user?.uid || user?.id;
    if (!file || !uid) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("The image is too large. Max allowed storage limit is 2MB.");
      return;
    }
    
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
      } finally {
        setLoading(false);
      }
    };
  };

  // 3. MUTATE REGISTRY DATA WITH SECURITY PATTERNS
  const handleProfileSave = async () => {
    const uid = user?.uid || user?.id;
    if (!uid) return;

    // A. Validation Interceptions
    if (form.name.trim().length < 3) {
      alert("Please specify a valid full name (Minimum 3 alphabetic characters required).");
      return;
    }

    const cleanPhone = form.phone.replace(/\s+/g, '').replace(/-/g, '');
    const phoneRegex = /^(?:\+94|0)?7[0-9]{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      alert("Invalid Phone Number configuration. Use structural SL format (07XXXXXXXX).");
      return;
    }

    if (form.accountNo) {
      const cleanAcc = form.accountNo.replace(/\s+/g, '').replace(/-/g, '');
      if (cleanAcc.length < 9 || cleanAcc.length > 15 || !/^\d+$/.test(cleanAcc)) {
        alert("Invalid Account Number. Bank accounts must contain between 9 and 15 numeric digits.");
        return;
      }
    }

    setErrors({});
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await response.json();
      if (result.success) {
        setEditing(false);
        alert("Success! Your student profile configurations have been locked inside the DB.");
      }
    } catch (error) {
      alert("Network exception error. Please review pipeline links.");
    } finally {
      setLoading(false);
    }
  };

  // 4. PURGE CREDIT CARD OR BANK PAYOUT MAPPING
  const handleRemoveBankDetails = async () => {
    const uid = user?.uid || user?.id;
    if (!window.confirm("Are you sure you want to completely erase your linked bank statement?")) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/${uid}/bank-details`, { method: 'DELETE' });
      setForm(p => ({ ...p, bankName: '', accountNo: '', accountHolder: '' }));
      alert("Linked bank details deleted successfully.");
    } finally {
      setLoading(false);
    }
  };

  // 5. UNIFIED ACCOUNT TERMINATION CONTROL (Danger Zone Workflow)
  const handleConfirmDeleteAccount = async (e) => {
    e.preventDefault();
    if (!confirmPassword) {
      setDeleteError("Please declare your current account entry password.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Authentication state pipeline missing. Re-login.");

      const credential = EmailAuthProvider.credential(currentUser.email, confirmPassword);
      await reauthenticateWithCredential(currentUser, credential);

      const token = await currentUser.getIdToken();
      const uid = user?.uid || user?.id;

      // Custom node express server core deletion dispatcher route link
      const response = await fetch(`${API_BASE_URL}/${uid}/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Backend verification registry abort exception.");

      await deleteUser(currentUser);
      alert("Your student profile has been entirely deleted from Langoora databases.");
      setShowDeleteModal(false);
      if (logout) await logout();
      navigate('/');

    } catch (error) {
      console.error(error);
      if (error.code === 'auth/wrong-password' || error.message.includes('invalid-credential')) {
        setDeleteError("Incorrect credentials. The password matching schema failed.");
      } else {
        setDeleteError(error.message || "An unhandled execution failure stopped the termination block.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl relative pb-12">
      {loading && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-mono text-xs tracking-widest">PROCESSING SECURE ENDPOINT DATA STREAM...</p>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-white mb-1">My Profile</h1>
        <p className="text-gray-400">Manage your personal information and preferences</p>
      </div>

      {/* Main Identity Info Header Avatar Section */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-lg select-none">
              {profilePic ? <img src={profilePic} alt="Profile" className="w-full h-full object-cover" /> : <span>{form.name?.charAt(0).toUpperCase() || 'S'}</span>}
            </div>
            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-400 cursor-pointer shadow-md transition-colors">
              <Camera size={14} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />
            </label>
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white capitalize">{form.name || "Loading..."}</h2>
                <p className="text-gray-400 text-sm mt-0.5">{form.email}</p>
                <div className="flex gap-2 mt-3">
                  <Badge color="blue">Pro Student</Badge>
                  <Badge color="amber">12-day streak</Badge>
                </div>
              </div>
              <Button variant={editing ? 'success' : 'secondary'} size="sm" onClick={editing ? handleProfileSave : () => setEditing(true)}>
                {editing ? <><Save size={14} className="mr-1" /> Save</> : <><Edit3 size={14} className="mr-1" /> Edit Profile</>}
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Primary Data Grid Field blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Personal Details Layout block */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <User size={18} className="text-blue-400" /> Personal Info
          </h3>
          <div className="space-y-4">
            <Input 
              label="Full Name" 
              value={form.name} 
              onChange={e => {
                const val = e.target.value.replace(/[^a-zA-Z\s.]/g, ''); // Non-alphabetic live filter block
                setForm(p => ({ ...p, name: val }));
              }} 
              icon={User} 
              disabled={!editing} 
            />
            <div>
              <Input label="Email Address" value={form.email} icon={Mail} disabled={true} className="opacity-60 cursor-not-allowed" />
              <p className="text-[11px] text-gray-500 mt-1 pl-1">Email identification nodes are unalterable.</p>
            </div>
            <Input 
              label="Phone Number" 
              value={form.phone} 
              onChange={e => {
                const val = e.target.value.replace(/[^0-9+]/g, ''); // Numeric phone pattern filter lock
                setForm(p => ({ ...p, phone: val }));
              }} 
              icon={Phone} 
              placeholder="e.g. +94771234567" 
              disabled={!editing} 
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date of Birth" type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} icon={Calendar} disabled={!editing} />
              <Input label="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} icon={MapPin} disabled={!editing} />
            </div>
          </div>
        </GlassCard>

        {/* Exam Tracking Targets Block */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Award size={18} className="text-amber-400" /> Exam Goals
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Target Level Exam</label>
              <select value={form.targetExam} onChange={e => setForm(p => ({ ...p, targetExam: e.target.value }))} disabled={!editing} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500/60 transition-all font-medium">
                {['JLPT N5', 'JLPT N4', 'JLPT N3', 'JLPT N2', 'EPS-TOPIK (Standard)'].map(exam => (
                  <option key={exam} value={exam} className="bg-[#0f1629] text-white">{exam}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Input label="Target Exam Date" type="date" value={form.targetDate} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))} icon={Calendar} disabled={!editing} />
              {form.targetDate && (
                <div className="mt-2 flex items-center justify-between bg-white/[0.02] border border-white/5 p-2.5 rounded-xl">
                  <span className="text-xs text-gray-400">Live Blueprint Estimate:</span>
                  <Badge color={calculateDaysLeft(form.targetDate) > 30 ? 'blue' : 'red'}>
                    ⏳ {calculateDaysLeft(form.targetDate)} Days Left
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Bank Account Linking Node Block */}
      <GlassCard className="p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-400" /> Linked Bank Statement
          </h3>
          {form.accountNo && !editing && (
            <Button variant="danger" size="xs" onClick={handleRemoveBankDetails} className="bg-red-500/20 text-red-400 border border-red-500/30">
              <Trash2 size={12} /> Disconnect Account
            </Button>
          )}
        </div>
        
        {!form.accountNo && !editing ? (
          <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl bg-white/3">
            <Building size={32} className="text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-4">No verified student bank accounts linked yet.</p>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>+ Link Account Profile</Button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Bank Name" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} disabled={!editing} icon={Building} />
              <Input 
                label="Account Number (Masked)" 
                value={form.accountNo} 
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, ''); // Numbers only restriction
                  setForm(p => ({ ...p, accountNo: val }));
                }} 
                disabled={!editing} 
                icon={CreditCard} 
              />
              <Input label="Account Holder" value={form.accountHolder} onChange={e => setForm(p => ({ ...p, accountHolder: e.target.value }))} disabled={!editing} icon={User} />
            </div>
            {editing && (
              <p className="text-xs text-amber-400 mt-3 animate-pulse">
                ⚠️ Click "Save Profile" at the top row to finalize payment registry edits.
              </p>
            )}
          </div>
        )}
      </GlassCard>

      {/* SYSTEM DANGER ZONE ACCOUNT DELETION ANCHOR */}
      <GlassCard className="p-6 border border-red-500/20 bg-red-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle size={20} /> Danger Zone Pipeline
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Permanently terminate your student data workspace node, removing active marketplace licenses, certificates, mock scores and planner tracks. This action is terminal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmPassword('');
              setDeleteError('');
              setShowDeleteModal(true);
            }}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-200 text-sm font-medium rounded-xl transition-all shrink-0 self-start sm:self-center"
          >
            Terminate Account
          </button>
        </div>
      </GlassCard>

      {/* RE-AUTHENTICATION VALIDATION PROMPT MODAL GRID */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f1629] border border-red-500/30 rounded-2xl p-6 shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-red-400 mb-4">
                <div className="p-2 bg-red-500/10 rounded-xl"><ShieldAlert size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold text-white">Security Verification</h3>
                  <p className="text-xs text-gray-400">Re-authentication gating mechanism triggered</p>
                </div>
              </div>

              <form onSubmit={handleConfirmDeleteAccount} className="space-y-4">
                <div className="relative">
                  <Input 
                    label="Confirm Account Password" type={showPassword ? "text" : "password"}
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Enter current master account password" required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[38px] text-gray-400 hover:text-white">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {deleteError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" /><span>{deleteError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>Cancel</Button>
                  <button type="submit" disabled={deleteLoading} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800/40 text-white font-medium text-sm rounded-xl flex items-center gap-2 shadow-lg transition-colors">
                    {deleteLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={14} />}
                    <span>{deleteLoading ? "Processing Account Purge..." : "Confirm Deletion Pipeline"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}