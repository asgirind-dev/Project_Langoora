import { useState, useEffect } from 'react';
import { motion } from 'react';
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
  
  
  // Form State
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

  // Profile Picture State
  const [profilePic, setProfilePic] = useState(null);

  // ==========================================
  // 1. FETCH PROFILE DATA FROM BACKEND API
  // ==========================================
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
            targetExam: data.targetExam || 'JLPT N2',
            targetDate: data.targetDate || '',
            bankName: data.bankName || '', 
            accountNo: data.accountNo || '', 
            accountHolder: data.accountHolder || '',
          });

          if (data.profilePicUrl) {
            setProfilePic(data.profilePicUrl);
          }
        } else {
          setForm(p => ({ ...p, name: user.name || '', email: user.email || '' }));
        }
      } catch (error) {
        console.error("Error fetching student profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user]);

  

  // ==========================================
  // 2. SAVE PERSONAL & GOALS & BANK DETAILS
  // ==========================================
  const handleProfileSave = async () => {
  const uid = user?.uid || user?.id;
  if (!uid) return;

  let newErrors = {};
  const phoneRegex = /^[0-9]{9}$/; 
  const accountRegex = /^[0-9]{9,15}$/; 

  // Validation
  if (!phoneRegex.test(form.phone)) newErrors.phone = "Phone number must be exactly 9 digits";
  if (!accountRegex.test(form.accountNo)) newErrors.accountNo = "Account number must be 9-15 digits";

  
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
    const result = await response.json();
    if (result.success) {
      setEditing(false);
      alert("Success! Your profile settings have been securely saved.");
    }
  } catch (error) {
    alert("Network failure. Please try again.");
  } finally {
    setLoading(false);
  }
};

  // ==========================================
  // 3. PROFILE PICTURE UPLOAD (BASE64 TUTOR STYLE)
  // ==========================================
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    const uid = user?.uid || user?.id;
    if (!file || !uid) return;

    // Max 2MB Limit Validation
    if (file.size > 2 * 1024 * 1024) {
      alert("The selected image is too large. Max size is 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onloadend = async () => {
      const base64String = reader.result;
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/${uid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profilePicUrl: base64String })
        });

        const result = await response.json();
        if (result.success) {
          setProfilePic(base64String);
          alert('Success! Your profile picture has been updated.');
        } else {
          alert('Unable to update profile picture.');
        }
      } catch (error) {
        console.error("Image upload error:", error);
        alert("Connection error. Please try again.");
      } finally {
        setLoading(false);
      }
    };
  };

  // ==========================================
  // 4. REMOVE BANK DETAILS VIA API
  // ==========================================
  const handleRemoveBankDetails = async () => {
    const uid = user?.uid || user?.id;
    if (!uid) return;

    const confirmDelete = window.confirm("Are you sure you want to remove your bank account information?");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/${uid}/bank-details`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        setForm(p => ({ ...p, bankName: '', accountNo: '', accountHolder: '' }));
        alert("Bank details removed successfully!");
      } else {
        alert("Failed to remove bank details.");
      }
    } catch (error) {
      console.error("Remove bank details error:", error);
      alert("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl relative pb-12">
      
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center text-white font-medium backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-200">Processing request via API...</p>
        </div>
      )}

      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">My Profile</h1>
        <p className="text-gray-400">Manage your personal information and preferences</p>
      </div>

      {/* Main Avatar Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg overflow-hidden select-none">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{form.name ? form.name.charAt(0).toUpperCase() : 'U'}</span>
              )}
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
                <p className="text-gray-400 text-sm mt-1">{form.email}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                  <Badge color="blue">Pro Student</Badge>
                  <Badge color="amber">12-day streak</Badge>
                </div>
              </div>
              <Button 
                variant={editing ? 'success' : 'secondary'} 
                size="sm" 
                onClick={editing ? handleProfileSave : () => setEditing(true)}
              >
                {editing ? <><Save size={14} className="mr-1" /> Save</> : <><Edit3 size={14} className="mr-1" /> Edit</>}
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Info & Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info Card */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <User size={18} className="text-blue-400" /> Personal Info
          </h3>
          <div className="space-y-4">
            <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} icon={User} disabled={!editing} />
            
            {/* Email Field - Permanently Disabled */}
            <div>
              <Input label="Email Address" value={form.email} icon={Mail} disabled={true} className="opacity-60 cursor-not-allowed" />
              <p className="text-[11px] text-gray-500 mt-1 pl-1">Email address cannot be changed.</p>
            </div>

            <div className="flex flex-col">
  <Input 
    label="Phone" 
    type="number" 
    value={form.phone || ''} 
    onChange={e => {
       const val = e.target.value;
       setForm(p => ({ ...p, phone: val }));
       if(errors.phone) setErrors(p => ({...p, phone: null}));
    }} 
    icon={Phone} 
    disabled={!editing} 
    placeholder="07XXXXXXXX" 
  />
  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
</div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date of Birth" type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} icon={Calendar} disabled={!editing} />
              <Input label="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} icon={MapPin} disabled={!editing} placeholder="Colombo" />
            </div>
          </div>
        </GlassCard>

        {/* Exam Goals Card */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Award size={18} className="text-amber-400" /> Exam Goals
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Target Exam</label>
              <select
                value={form.targetExam}
                onChange={e => setForm(p => ({ ...p, targetExam: e.target.value }))}
                disabled={!editing}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60"
              >
                {['JLPT N1','JLPT N2','JLPT N3','EPS-TOPIK','IELTS Academic','IELTS General'].map(exam => (
                  <option key={exam} value={exam} className="bg-[#0f1629] text-white">{exam}</option>
                ))}
              </select>
            </div>
            <Input label="Target Exam Date" type="date" value={form.targetDate} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))} icon={Calendar} disabled={!editing} />
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Achievements</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'First Exam' },
                { label: '10 Exams' },
                { label: '7-Day Streak' },
              ].map(achieve => (
                <div key={achieve.label} className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                  <Award size={20} className="text-amber-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-300">{achieve.label}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* BANK DETAILS CARD */}
      {/* ==========================================
    BANK DETAILS CARD (ADD / REMOVE MODES)
    ========================================== */}
<GlassCard className="p-6">
  <div className="flex justify-between items-center mb-5">
    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
      <CreditCard size={18} className="text-emerald-400" /> Bank Details
    </h3>
    
    {}
    {form.accountNo && !editing && (
      <Button 
        variant="danger" 
        size="xs" 
        onClick={handleRemoveBankDetails} 
        className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30"
      >
        <Trash2 size={12} /> Remove Account
      </Button>
    )}
  </div>
  
  {}
  {!form.accountNo && !editing ? (
    <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl bg-white/3">
      <Building size={32} className="text-gray-500 mx-auto mb-2" />
      <p className="text-sm text-gray-400 mb-4">No bank account details added yet.</p>
      <Button 
        variant="secondary" 
        size="sm" 
        onClick={() => setEditing(true)} 
        className="mx-auto"
      >
        + Add Bank Details
      </Button>
    </div>
  ) : (
    
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input 
          label="Bank Name" 
          value={form.bankName} 
          onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} 
          icon={Building} 
          disabled={!editing} 
          placeholder="e.g. Commercial Bank" 
        />

<div className="flex flex-col"> 
  <Input 
    label="Account Number" 
    type="number" 
    value={form.accountNo || ''} 
    onChange={e => { 
      setForm(p => ({...p, accountNo: e.target.value}));
      if(errors.accountNo) setErrors(p => ({...p, accountNo: null})); 
    }} 
    icon={CreditCard} 
    disabled={!editing} 
  />
  {errors.accountNo && <p className="text-red-500 text-xs mt-1">{errors.accountNo}</p>}
</div>
        <Input 
          label="Account Holder" 
          value={form.accountHolder} 
          onChange={e => setForm(p => ({ ...p, accountHolder: e.target.value }))} 
          icon={User} 
          disabled={!editing} 
          placeholder="Name on Card/Passbook" 
        />
      </div>
      
      
      {editing && (
        <p className="text-xs text-amber-400 mt-3 animate-pulse">
          ⚠️ Please click the "Save" button at the top of the profile to lock in your bank changes.
        </p>
      )}
    </div>
  )}
  
  <p className="text-xs text-gray-500 mt-3">
    Bank details are used securely for internal processing, rewards, and tuition payouts.
  </p>
</GlassCard>

    </div>
  );
}