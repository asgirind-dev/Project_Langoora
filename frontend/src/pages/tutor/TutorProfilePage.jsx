import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, GraduationCap, MapPin, Save, Camera, Edit3, Building, CreditCard, Trash2, Plus, AlertTriangle, Eye, EyeOff, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

import { auth } from '../../firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';

const API_BASE_URL = 'http://localhost:5000/api/tutors';

export default function TutorProfilePage() {
  const { user, logout } = useAuth(); 
  const navigate = useNavigate();
  
  const [editPersonal, setEditPersonal] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    qualifications: '',
    university: '',
    address: '',
  });

  const [bankCards, setBankCards] = useState([]);
  const [newCard, setNewCard] = useState({ bankName: '', accountNo: '', accountHolder: '' });
  const [showAddCard, setShowAddCard] = useState(false);
  const [profilePic, setProfilePic] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3500);
  };

  const [showCardDeleteModal, setShowCardDeleteModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!user?.uid) return;

    const fetchTutorData = async () => {
      try {
        const profileRes = await fetch(`${API_BASE_URL}/${user.uid}`);
        const profileResult = await profileRes.json();

        if (profileResult.success && profileResult.data) {
          const data = profileResult.data;
          
          setForm({
            name: data.name || user.name || '',
            email: user.email || '', 
            phone: data.phone || '',
            qualifications: data.qualifications || '', 
            university: data.university || '',         
            address: data.address || '',
          });

          if (data.profilePicUrl) {
            setProfilePic(data.profilePicUrl);
          }
        } else {
          setForm(p => ({ ...p, name: user.name || '', email: user.email || '' }));
        }

        const cardsRes = await fetch(`${API_BASE_URL}/${user.uid}/cards`);
        const cardsResult = await cardsRes.json();
        if (cardsResult.success) {
          setBankCards(cardsResult.data);
        }

      } catch (error) {
        console.error("Error fetching data from backend:", error);
        showToast("Failed to fetch profile details. Check connection.", "error");
      }
    };

    fetchTutorData();
  }, [user]);

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.uid) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("The selected image exceeds the 2MB size limit.", "error");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const response = await fetch(`${API_BASE_URL}/${user.uid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profilePicUrl: base64String })
        });
        const result = await response.json();
        if (result.success) {
          setProfilePic(base64String);
          showToast('Your profile picture has been updated successfully!', 'success');
        } else {
          showToast('Encountered an issue updating profile picture.', 'error');
        }
      } catch (error) {
        console.error("Upload Error:", error);
        showToast("Connection timed out. Please try again.", "error");
      }
    };
  };

  const handleSavePersonalInfo = async () => {
    if (!user?.uid) return;

    if (form.name.trim().length < 3) {
      showToast("Please enter a name that is at least 3 characters long.", "error");
      return;
    }

    const cleanPhone = form.phone.replace(/\s+/g, '').replace(/-/g, '');
    const phoneRegex = /^(?:\+94|0)?7[0-9]{8}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
      showToast("Invalid Sri Lankan mobile number format.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${user.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address,
          qualifications: form.qualifications, 
          university: form.university
        }),
      });
      const result = await response.json();
      if (result.success) {
        setEditPersonal(false);
        showToast('Your changes have been securely saved!', 'success');
      } else {
        showToast(`Update Failed: ${result.error || 'Unable to update details.'}`, 'error');
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast('Network error. Unable to connect to the server.', 'error');
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCard.bankName || !newCard.accountNo || !newCard.accountHolder || !user?.uid) return;

    // Strict Digit Validation Logic
    const cleanNo = newCard.accountNo.replace(/\s+/g, '').replace(/-/g, '');
    const isOnlyDigits = /^\d+$/.test(cleanNo);

    // FIXED: Validates Sri Lankan Standard Bank Account Digits (typically between 9 to 16 digits)
    if (!isOnlyDigits || cleanNo.length < 9 || cleanNo.length > 16) {
      showToast("Invalid Bank Account Number. Please enter a valid number containing 9 to 16 digits.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${user.uid}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCard),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setBankCards(prev => [...prev, result.data]);
        setNewCard({ bankName: '', accountNo: '', accountHolder: '' });
        setShowAddCard(false);
        showToast('Your payout bank account has been securely linked.', 'success');
      } else {
        showToast(`${result.error || 'Could not link this account.'}`, 'error');
      }
    } catch (error) {
      console.error("Error adding card:", error);
      showToast("Server connection failed. Try again later.", "error");
    }
  };

  const triggerDeleteCardConfirm = (id) => {
    setCardToDelete(id);
    setShowCardDeleteModal(true);
  };

  const handleConfirmDeleteCard = async () => {
    if (!user?.uid || !cardToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/${user.uid}/cards/${cardToDelete}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setBankCards(prev => prev.filter(card => card.id !== cardToDelete));
        showToast('The bank account has been successfully removed.', 'success');
      }
    } catch (error) {
      console.error("Error deleting card:", error);
      showToast("Failed to delete the bank account.", "error");
    } window.confirm
      setShowCardDeleteModal(false);
      setCardToDelete(null);
    
  };

  const handleConfirmDeleteAccount = async (e) => {
    e.preventDefault();
    if (!confirmPassword) {
      setDeleteError("Please type your password to confirm account deletion.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Authentication session expired. Please sign in again.");

      const credential = EmailAuthProvider.credential(currentUser.email, confirmPassword);
      await reauthenticateWithCredential(currentUser, credential);

      const token = await currentUser.getIdToken();

      const backendResponse = await fetch(`${API_BASE_URL}/${user.uid}/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error occurred.`);
      }

      const backendResult = await backendResponse.json();

      if (!backendResult.success) {
        throw new Error(backendResult.error || "Failed to remove data from the main database.");
      }

      await deleteUser(currentUser);
      setShowDeleteModal(false);
      
      if (logout) {
        await logout(); 
      }
      navigate('/'); 

    } catch (error) {
      console.error("Account Deletion Error:", error);
      if (error.code === 'auth/wrong-password' || error.message.includes('invalid-credential')) {
        setDeleteError("Incorrect password. Please verify and try again.");
      } else if (error.code === 'auth/too-many-requests') {
        setDeleteError("Too many incorrect attempts. Locked temporarily for security.");
      } else {
        setDeleteError(error.message || "An unexpected error occurred.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12 relative">
      
      {/* TOP CENTERED TOAST NOTIFICATION SYSTEM */}
      <div className="fixed top-5 inset-x-0 z-50 flex justify-center pointer-events-none">
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-xl border backdrop-blur-md shadow-2xl min-w-[300px] justify-center ${
                toast.type === 'success' 
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
                  : 'bg-red-950/90 border-red-500/30 text-red-300'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-400" /> : <XCircle size={18} className="text-red-400" />}
              <span className="text-sm font-medium">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Tutor Profile</h1>
        <p className="text-gray-400">Manage your public profile, qualifications, and payout settings</p>
      </motion.div>

      {/* Top Profile Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg overflow-hidden">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                form.name ? form.name.charAt(0) : 'U'
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
                <h2 className="text-2xl font-bold text-white">{form.name || "Loading..."}</h2>
                <p className="text-gray-400 text-sm mt-1">{form.email}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                  <Badge color="blue">Verified Tutor</Badge>
                  <Badge color="amber">Top Rated</Badge>
                  <Badge color="green">JLPT Expert</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info Card */}
        <GlassCard className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User size={18} className="text-blue-400" /> Personal Info
              </h3>
              {!editPersonal && (
                <Button variant="secondary" size="sm" onClick={() => setEditPersonal(true)}>
                  <Edit3 size={14} className="mr-1" /> Edit
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              <Input 
                label="Full Name" 
                value={form.name} 
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z\s.]/g, '');
                  setForm(p => ({ ...p, name: val }));
                }} 
                icon={User} 
                disabled={!editPersonal} 
              />

              <div>
                <Input label="Email Address" value={form.email} icon={Mail} disabled={true} className="opacity-60 cursor-not-allowed" />
                <p className="text-[11px] text-gray-500 mt-1 pl-1">Email address cannot be changed.</p>
              </div>

              <Input 
                label="Phone" 
                value={form.phone} 
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9+]/g, '');
                  setForm(p => ({ ...p, phone: val }));
                }} 
                icon={Phone} 
                maxLength={12}
                placeholder="e.g., 0771234567"
                disabled={!editPersonal} 
              />

              <Input label="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} icon={MapPin} disabled={!editPersonal} />
            </div>
          </div>

          {editPersonal && (
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditPersonal(false)}>Cancel</Button>
              <Button variant="success" size="sm" onClick={handleSavePersonalInfo}>
                <Save size={14} className="mr-1" /> Save Changes
              </Button>
            </div>
          )}
        </GlassCard>

        {/* Qualifications Card */}
        <GlassCard className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <GraduationCap size={18} className="text-amber-400" /> Qualifications
              </h3>
            </div>
            
            <div className="space-y-4">
              <Input label="Qualifications" value={form.qualifications} icon={GraduationCap} disabled={true} className="opacity-60 cursor-not-allowed" />
              <div>
                <Input label="University / Institution" value={form.university} icon={Building} disabled={true} className="opacity-60 cursor-not-allowed" />
                <p className="text-[11px] text-gray-500 mt-1 pl-1">Qualifications cannot be edited after registration.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-sm font-semibold text-emerald-400 mb-1">Verification Status</p>
            <p className="text-xs text-gray-400">Your qualifications have been verified by the team.</p>
          </div>
        </GlassCard>

        {/* Bank Details Card (RENAMED TO BANK ACCOUNTS) */}
        <GlassCard className="p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-400" /> Bank Accounts for Payouts
            </h3>
            
            {bankCards.length === 0 && (
              <Button variant="primary" size="sm" onClick={() => setShowAddCard(!showAddCard)}>
                <Plus size={14} className="mr-1" /> Add Bank Account
              </Button>
            )}
          </div>

          <AnimatePresence>
            {showAddCard && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddCard}
                className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
              >
                <Input 
                  label="Bank Name" 
                  value={newCard.bankName} 
                  onChange={e => setNewCard(p => ({ ...p, bankName: e.target.value }))} 
                  icon={Building} 
                  placeholder="e.g., BOC, Sampath Bank"
                  required 
                />
                
                <div>
                  {/* FIXED: Removed raw technical rule string from placeholder for clean professional display */}
                  <Input 
                    label="Bank Account Number" 
                    value={newCard.accountNo} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9\s-]/g, '');
                      setNewCard(p => ({ ...p, accountNo: val }));
                    }} 
                    icon={CreditCard} 
                    placeholder="e.g., 100123456789"
                    maxLength={20} 
                    required 
                />
                </div>

                <Input 
                  label="Account Holder Name" 
                  value={newCard.accountHolder} 
                  onChange={e => setNewCard(p => ({ ...p, accountHolder: e.target.value }))} 
                  icon={User} 
                  placeholder="As shown on passbook"
                  required 
                />
                
                <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddCard(false)}>Cancel</Button>
                  <Button type="submit" variant="success" size="sm">Verify & Save Account</Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankCards.map((card) => (
              <div key={card.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center hover:border-white/20 transition-all">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <Building size={14} className="text-gray-400" /> {card.bankName}
                  </p>
                  <p className="text-sm text-emerald-400 font-mono tracking-wider">{card.accountNo}</p>
                  <p className="text-xs text-gray-500">Holder: {card.accountHolder}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => triggerDeleteCardConfirm(card.id)} 
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  title="Remove Account"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {bankCards.length === 0 && (
              <div className="md:col-span-2 text-center p-6 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                No bank accounts added yet. Please add an account for payouts.
              </div>
            )}
          </div>
        </GlassCard>

        {/* Danger Zone */}
        <GlassCard className="p-6 md:col-span-2 border border-red-500/20 bg-red-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                <AlertTriangle size={20} /> Danger Zone
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Permanently delete your tutor account and remove all registered data, certificates, and bank account setups. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmPassword('');
                setDeleteError('');
                setShowDeleteModal(true);
              }}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-200 text-sm font-medium rounded-xl transition-all self-start sm:self-center"
            >
              Delete Account
            </button>
          </div>
        </GlassCard>
      </div>

      {/* CUSTOM BANK ACCOUNT REMOVAL MODAL */}
      <AnimatePresence>
        {showCardDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f1629] border border-red-500/30 rounded-2xl p-6 shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-red-400 mb-4">
                <div className="p-2 bg-red-500/10 rounded-xl">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Disconnect Bank Account</h3>
                  <p className="text-xs text-gray-400">Confirmation Required</p>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                Are you sure you want to permanently disconnect this bank account from your payouts? This action will remove the linked information instantly.
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowCardDeleteModal(false)}>Cancel</Button>
                <button
                  onClick={handleConfirmDeleteCard}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-xl transition-colors shadow-lg flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  <span>Remove Account</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SECURITY CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f1629] border border-red-500/30 rounded-2xl p-6 shadow-2xl overflow-hidden text-left"
            >
              <div className="flex items-center gap-3 text-red-400 mb-4">
                <div className="p-2 bg-red-500/10 rounded-xl">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Security Verification</h3>
                  <p className="text-xs text-gray-400">Confirm authentication required</p>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                To complete this critical operation, please re-enter your current account password below.
              </p>

              <form onSubmit={handleConfirmDeleteAccount} className="space-y-4">
                <div className="relative">
                  <Input 
                    label="Current Password" 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Enter your account password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {deleteError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2"
                  >
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    <span>{deleteError}</span>
                  </motion.div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800/50 text-white font-medium text-sm rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    <span>{deleteLoading ? "Processing..." : "Permanently Delete"}</span>
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