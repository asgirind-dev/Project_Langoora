import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Phone, Calendar, User, Mail, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function CompleteProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Retrieve the Google data passed from RegisterPage through 'state'
  const { uid, email, name } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    phone: '',
    dob: ''
  });

  // If the user directly accesses this page via URL (without Google data),
  // redirect them back to the registration page
  if (!uid || !email) {
    setTimeout(() => navigate('/auth/register'), 0);
    return null;
  }

  const handleInputChange = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
  };

  const validate = () => {
    const e = {};
    if (!form.phone) e.phone = 'Phone number is required for verification';
    if (!form.dob) e.dob = 'Date of birth is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});

    try {
      // 🚀 Send the data to the newly created backend endpoint
      const response = await fetch('http://localhost:5000/api/auth/complete-google-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          email,
          name,
          phone: form.phone,
          dob: form.dob,
          role: 'student' // Users registering through Google are assigned as students by default
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete profile creation.');
      }

      // If successful, save the token and user data,
      // then redirect directly to the Student Dashboard
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Typically used to refresh the AuthContext (depending on your implementation)
      window.location.href = '/student'; 

    } catch (err) {
      console.error("Profile completion sequence failure:", err);
      setErrors({ server: err.message || 'Submitting configuration failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-[#060d1f] p-8 border border-white/10 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-2">Almost There! 🌟</h2>
      <p className="text-gray-400 text-sm mb-6">
        Hey {name?.split(' ')[0]}, we just need a few more essential details to finalize your Student Account.
      </p>

      {errors.server && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-xs mb-5">
          {errors.server}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Details received from Google (read-only for the user) */}
        <Input
          label="Full Name (From Google)"
          icon={User}
          value={name}
          disabled
          className="opacity-60 bg-white/5 cursor-not-allowed"
        />

        <Input
          label="Email Address (From Google)"
          icon={Mail}
          value={email}
          disabled
          className="opacity-60 bg-white/5 cursor-not-allowed"
        />

        {/* Additional required information */}
        <Input 
          label="Phone Number" 
          type="tel" 
          placeholder="+94 7X XXX XXXX" 
          icon={Phone} 
          value={form.phone} 
          onChange={handleInputChange('phone')} 
          error={errors.phone} 
        />
        
        <Input 
          label="Date of Birth" 
          type="date" 
          icon={Calendar} 
          value={form.dob} 
          onChange={handleInputChange('dob')} 
          error={errors.dob} 
        />

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? 'Finalizing Profile...' : <>Complete Registration <ArrowRight size={18} /></>}
        </Button>
      </form>
    </div>
  );
}