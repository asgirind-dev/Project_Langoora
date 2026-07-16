// frontend/src/pages/student/StudentProfilePage.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Calendar, MapPin, Edit3, Save, Camera,
  Award, Building, CreditCard, Trash2, AlertTriangle, Eye, EyeOff, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

import { auth } from '../../firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';

const API_BASE_URL = 'http://localhost:5000/api/student';

export default function StudentProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ---- State declarations ----
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [profilePic, setProfilePic] = useState(null);

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

  // ---- Delete account modal states ----
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ---- Helpers ----
  const calculateDaysLeft = (targetDateStr) => {
    if (!targetDateStr) return null;
    const diffTime = new Date(targetDateStr) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // ---- Fetch profile data ----
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
        console.error('Error fetching student profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user]);

  // ---- SAVE PROFILE (single version) ----
  const handleProfileSave = async () => {
    const uid = user?.uid || user?.id;
    if (!uid) return;

    // Validation
    const newErrors = {};

    // Name length
    if (form.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters.';
    }

    // Phone (Sri Lankan format)
    const cleanPhone = form.phone.replace(/\s+/g, '').replace(/-/g, '');
    const phoneRegex = /^(?:\+94|0)?7[0-9]{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      newErrors.phone = 'Invalid phone number. Use e.g., 0712345678.';
    }

    // Account number (if provided)
    if (form.accountNo) {
      const cleanAcc = form.accountNo.replace(/\s+/g, '').replace(/-/g, '');
      if (cleanAcc.length < 9 || cleanAcc.length > 15 || !/^\d+$/.test(cleanAcc)) {
        newErrors.accountNo = 'Account number must be 9-15 digits.';
      }
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
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (result.success) {
        setEditing(false);
        alert('Profile updated successfully.');
      } else {
        alert('Update failed: ' + (result.message || 'Unknown error.'));
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Profile picture ----
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    const uid = user?.uid || user?.id;
    if (!file || !uid) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large. Max 2MB.');
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
          body: JSON.stringify({ profilePicUrl: base64String }),
        });
        setProfilePic(base64String);
      } catch (error) {
        alert('Failed to upload image.');
      } finally {
        setLoading(false);
      }
    };
  };

  // ---- Remove bank details (fixed) ----
  const handleRemoveBankDetails = async () => {
    const uid = user?.uid || user?.id;
    if (!window.confirm('Remove your bank card information?')) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/${uid}/bank-details`, { method: 'DELETE' });
      setForm((p) => ({ ...p, bankName: '', accountNo: '', accountHolder: '' }));
      alert('Bank details removed.');
    } catch (error) {
      alert('Failed to remove bank details.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Delete account (fixed) ----
  const handleConfirmDeleteAccount = async (e) => {
    e.preventDefault();
    if (!confirmPassword) {
      setDeleteError('Please enter your password.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user found.');

      const credential = EmailAuthProvider.credential(currentUser.email, confirmPassword);
      await reauthenticateWithCredential(currentUser, credential);

      const token = await currentUser.getIdToken();
      const uid = user?.uid || user?.id;

      const response = await fetch(`${API_BASE_URL}/${uid}/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Delete failed.');

      await deleteUser(currentUser);
      alert('Your account has been permanently deleted.');
      setShowDeleteModal(false);
      if (logout) await logout();
      navigate('/');
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/wrong-password' || error.message.includes('invalid-credential')) {
        setDeleteError('Incorrect password. Please try again.');
      } else {
        setDeleteError(error.message || 'An unexpected error occurred.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---- Render ----
  return (
    <div className="space-y-8 max-w-4xl relative pb-12">
      {/* Loading overlay */}
      {(loading || deleteLoading) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-mono text-xs tracking-widest">
            {deleteLoading ? 'DELETING ACCOUNT...' : 'PROCESSING...'}
          </p>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-white mb-1">My Profile</h1>
      </div>

      {/* Profile card */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white overflow-hidden">
              {profilePic ? (
                <img src={profilePic} className="w-full h-full object-cover" alt="profile" />
              ) : (
                <span>{form.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center cursor-pointer">
              <Camera size={14} className="text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePicChange}
              />
            </label>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white capitalize">{form.name || 'Student'}</h2>
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
        {/* Personal Info */}
        <GlassCard className="p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <User size={18} className="text-blue-400" /> Personal Info
            </h3>
            <Button
              variant={editing ? 'success' : 'secondary'}
              size="sm"
              onClick={editing ? handleProfileSave : () => setEditing(true)}
            >
              {editing ? (
                <><Save size={14} className="mr-1" /> Save</>
              ) : (
                <><Edit3 size={14} className="mr-1" /> Edit</>
              )}
            </Button>
          </div>
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={form.name}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z\s.]/g, '');
                setForm((p) => ({ ...p, name: val }));
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              icon={User}
              disabled={!editing}
              error={errors.name}
            />
            <div>
              <Input
                label="Email Address"
                value={form.email}
                icon={Mail}
                disabled={true}
                className="opacity-60 cursor-not-allowed"
              />
              <p className="text-[11px] text-gray-500 mt-1 pl-1">Email cannot be changed.</p>
            </div>
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9+]/g, '');
                setForm((p) => ({ ...p, phone: val }));
                if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
              }}
              icon={Phone}
              placeholder="e.g. +94771234567"
              disabled={!editing}
              error={errors.phone}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date of Birth"
                type="date"
                value={form.dob}
                onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
                icon={Calendar}
                disabled={!editing}
              />
              <Input
                label="City"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                icon={MapPin}
                disabled={!editing}
              />
            </div>
          </div>
        </GlassCard>

        {/* Exam Goals */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Award size={18} className="text-amber-400" /> Exam Goals
          </h3>
          <div className="space-y-4">
            <select
              value={form.targetExam}
              onChange={(e) => setForm((p) => ({ ...p, targetExam: e.target.value }))}
              disabled={!editing}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
            >
              {['JLPT N5', 'JLPT N4', 'JLPT N3', 'JLPT N2', 'EPS-TOPIK (Standard)'].map((exam) => (
                <option key={exam} value={exam} className="bg-[#0f1629]">
                  {exam}
                </option>
              ))}
            </select>
            <Input
              label="Target Exam Date"
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm((p) => ({ ...p, targetDate: e.target.value }))}
              icon={Calendar}
              disabled={!editing}
            />
            {form.targetDate && (
              <Badge color={calculateDaysLeft(form.targetDate) > 30 ? 'blue' : 'red'}>
                {calculateDaysLeft(form.targetDate)} Days Remaining
              </Badge>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Bank Details */}
      <GlassCard className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-400" />
            {form.bankName || form.accountNo || form.accountHolder ? 'Bank Details' : 'Add Bank Card'}
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
          <p className="text-amber-500 text-sm mb-4">
            ⚠ Please click the "Save" button at the top of the profile to lock in your bank changes.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Bank Name</label>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
              {editing ? (
                <input
                  className="w-full bg-transparent outline-none text-sm placeholder-gray-600"
                  value={form.bankName}
                  onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                  placeholder="e.g. Commercial Bank"
                />
              ) : (
                <span className={!form.bankName ? 'text-gray-600 italic text-sm' : 'text-white'}>
                  {form.bankName || 'Enter bank name'}
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
                  onChange={(e) => {
                    setForm((p) => ({ ...p, accountNo: e.target.value }));
                    if (errors.accountNo) setErrors((p) => ({ ...p, accountNo: undefined }));
                  }}
                  placeholder="Enter 16 digits"
                />
              ) : (
                <span className={!form.accountNo ? 'text-gray-600 italic text-sm' : 'text-emerald-400 font-mono text-sm'}>
                  {form.accountNo ? `xxxx xxxx xxxx ${form.accountNo.slice(-4)}` : 'Enter card number'}
                </span>
              )}
            </div>
            {errors.accountNo && <p className="text-red-500 text-xs mt-1">{errors.accountNo}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Account Holder</label>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
              {editing ? (
                <input
                  className="w-full bg-transparent outline-none text-sm placeholder-gray-600"
                  value={form.accountHolder}
                  onChange={(e) => setForm((p) => ({ ...p, accountHolder: e.target.value }))}
                  placeholder="Name on Card/Passbook"
                />
              ) : (
                <span className={!form.accountHolder ? 'text-gray-600 italic text-sm' : 'text-white'}>
                  {form.accountHolder || 'Enter account holder name'}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-6">
          Bank details are used securely for internal processing, rewards, and tuition payouts.
        </p>

        {/* Danger Zone */}
        <div className="mt-8 border-t border-white/5 pt-6">
          <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
            <ShieldAlert size={16} /> Danger Zone
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 size={14} className="mr-1" /> Delete Account
          </Button>
        </div>
      </GlassCard>

      {/* ---- DELETE ACCOUNT MODAL (fixed) ---- */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f1629] border border-rose-500/30 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <AlertTriangle size={22} />
                <h3 className="text-lg font-bold text-white">Delete Account</h3>
              </div>

              <p className="text-sm text-gray-300 mb-4">
                This action is <span className="font-bold text-rose-400">permanent</span>. All your data,
                exam history, and profile information will be erased.
              </p>

              <form onSubmit={handleConfirmDeleteAccount}>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      label="Confirm Password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setDeleteError('');
                      }}
                      placeholder="Enter your password"
                      icon={ShieldAlert}
                      className="pr-10"
                      error={deleteError}
                    />
                    <button
                      type="button"
                      className="absolute right-3 bottom-3 text-gray-400 hover:text-white transition-colors"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {deleteError && (
                    <p className="text-rose-400 text-xs mt-1">{deleteError}</p>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowDeleteModal(false);
                        setConfirmPassword('');
                        setDeleteError('');
                      }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="danger"
                      size="sm"
                      disabled={deleteLoading}
                      className="text-xs"
                    >
                      {deleteLoading ? 'Deleting...' : 'Confirm Deletion'}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}