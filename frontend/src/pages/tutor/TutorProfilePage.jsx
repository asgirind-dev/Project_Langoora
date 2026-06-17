import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, GraduationCap, MapPin, Save, Camera, Edit3, Building, CreditCard, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

// Storage import retained for profile picture handling
import { storage } from '../../firebaseConfig'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';


const API_BASE_URL = 'http://localhost:5000/api/tutors';

export default function TutorProfilePage() {
  const { user } = useAuth();
  
  // States for Editing Modes
  const [editPersonal, setEditPersonal] = useState(false);
  
  // Profile Form States
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    qualifications: '',
    university: '',
    address: '',
  });

  // Bank Cards State
  const [bankCards, setBankCards] = useState([]);

  // New Card Form State
  const [newCard, setNewCard] = useState({ bankName: '', accountNo: '', accountHolder: '' });
  const [showAddCard, setShowAddCard] = useState(false);

  // Profile Picture State
  const [profilePic, setProfilePic] = useState(null);

  // ==========================================
  // 1. FETCH PROFILE DATA FROM BACKEND API
  // ==========================================
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
      }
    };

    fetchTutorData();
  }, [user]);

  // ==========================================
  // 2. BACKEND API MUTATION HANDLERS
  // ==========================================

  // Process selected image, convert to Base64 and upload via backend API
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.uid) return;

    // Validate image file size (Enforce max 2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      alert("The selected image is too large. Please select a photo smaller than 2MB.");
      return;
    }

    // Convert raw image file to readable Base64 data string
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
          setProfilePic(base64String); // Set target image live onto the client UI
          alert('Success! Your profile picture has been updated.');
        } else {
          alert('Unable to update profile picture. Please try again or contact support.');
        }
      } catch (error) {
        console.error("Upload Error:", error);
        alert("Connection error. Please check your internet and try again.");
      }
    };
  };

  // Persist Personal Info & Qualifications via PUT Request to Backend
  const handleSavePersonalInfo = async () => {
    if (!user?.uid) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${user.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
        alert('Success! Your profile settings have been securely saved.');
      } else {
        alert('Could not save updates. Please ensure all required fields are filled.');
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('Network failure. Please verify your connection and click save again.');
    }
  };

  // Add new payout method card via POST Request to Backend
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCard.bankName || !newCard.accountNo || !newCard.accountHolder || !user?.uid) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/${user.uid}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCard),
      });

      const result = await response.json();

      if (result.success) {
        setBankCards(prev => [...prev, result.data]);
        setNewCard({ bankName: '', accountNo: '', accountHolder: '' });
        setShowAddCard(false);
        alert('Success! Your new bank card has been securely added.');
      }
    } catch (error) {
      console.error("Error adding card:", error);
      alert('Failed to add bank card. Please verify the numbers and try again.');
    }
  };

  // Terminate registered bank card entry via DELETE Request to Backend
  const handleDeleteCard = async (id) => {
    if (!user?.uid) return;

    if (window.confirm('Are you sure you want to permanently delete this bank card?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/${user.uid}/cards/${id}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (result.success) {
          setBankCards(prev => prev.filter(card => card.id !== id));
          alert('The selected bank card has been successfully removed.');
        }
      } catch (error) {
        console.error("Error deleting card:", error);
        alert('Unable to delete bank card. Please refresh the page and try again.');
      }
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Tutor Profile</h1>
        <p className="text-gray-400">Manage your public profile, qualifications, and payout settings</p>
      </motion.div>

      {/* Top Profile Card with Image Upload */}
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
              <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} icon={User} disabled={!editPersonal} />
              
              <div>
                <Input label="Email Address" value={form.email} icon={Mail} disabled={true} className="opacity-60 cursor-not-allowed" />
                <p className="text-[11px] text-gray-500 mt-1 pl-1">Email address cannot be changed as it is linked to your login account.</p>
              </div>

              <Input label="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} icon={Phone} disabled={!editPersonal} />
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
              <div>
                <Input label="Qualifications" value={form.qualifications} icon={GraduationCap} disabled={true} className="opacity-60 cursor-not-allowed" />
              </div>
              
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

        {/* Bank Details Card */}
        <GlassCard className="p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-400" /> Bank Accounts for Payouts
            </h3>
            <Button variant="primary" size="sm" onClick={() => setShowAddCard(!showAddCard)}>
              <Plus size={14} className="mr-1" /> Add New Card
            </Button>
          </div>

          {/* Add New Card Form Accordion */}
          <AnimatePresence>
            {showAddCard && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddCard}
                className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
              >
                <Input label="Bank Name" value={newCard.bankName} onChange={e => setNewCard(p => ({ ...p, bankName: e.target.value }))} icon={Building} required />
                <Input label="Account Number" value={newCard.accountNo} onChange={e => setNewCard(p => ({ ...p, accountNo: e.target.value }))} icon={CreditCard} required />
                <Input label="Account Holder" value={newCard.accountHolder} onChange={e => setNewCard(p => ({ ...p, accountHolder: e.target.value }))} icon={User} required />
                <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddCard(false)}>Cancel</Button>
                  <Button type="submit" variant="success" size="sm">Save Card</Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Cards List Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankCards.map((card) => (
              <div key={card.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center hover:border-white/20 transition-all">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <Building size={14} className="text-gray-400" /> {card.bankName}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">Acc No: {card.accountNo}</p>
                  <p className="text-xs text-gray-500">Holder: {card.accountHolder}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => handleDeleteCard(card.id)} 
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  title="Delete Card"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {bankCards.length === 0 && (
              <div className="md:col-span-2 text-center p-6 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                No bank accounts added yet. Please add a card for payouts.
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4">Bank details are used for payout processing. All information is securely encrypted and stored.</p>
        </GlassCard>
      </div>
    </div>
  );
}