// frontend/src/pages/auth/ForgotPasswordPage.jsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import axios from 'axios'; // ✅ මෙය add කරන්න

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) {
      setError('Email address is required to dispatch recovery configurations.');
      setLoading(false);
      return;
    } else if (!emailRegex.test(email)) {
      setError('Please provide a legitimate, verified structure layout email address.');
      setLoading(false);
      return;
    }

    try {
      console.log('📤 Sending forgot password request for:', email);
      
      // ✅ API call එක - Backend එකට request එක යවන්න
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
        email: email.toLowerCase().trim()
      });

      console.log('📥 Response:', response.data);

      if (response.data.success) {
        setSent(true);
      } else {
        setError(response.data.message || 'Failed to send reset link. Please try again.');
      }
    } catch (err) {
      console.error('❌ Forgot password error:', err);
      console.error('❌ Error response:', err.response?.data);
      
      // ✅ Better error messages
      if (err.response?.status === 404) {
        setError('No account found with this email address. Please check your email or register.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={28} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
        <p className="text-gray-400 mb-6">
          We sent a password reset link to <br />
          <span className="text-blue-400 font-medium">{email}</span>
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Didn't receive it? Check your spam folder or{' '}
          <button onClick={() => { setSent(false); setError(''); setLoading(false); }} className="text-blue-400 hover:text-blue-300">
            try again
          </button>
        </p>
        <Link to="/auth/login">
          <Button variant="secondary" fullWidth>
            <ArrowLeft size={16} /> Back to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-2">Reset your password</h2>
      <p className="text-gray-400 mb-8">Enter your email and we'll send you a reset link</p>

      {/* Error Notification */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3.5 rounded-xl mb-5 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          icon={Mail}
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
        />
        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading || !email}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </span>
          ) : (
            <>Send Reset Link <ArrowRight size={18} /></>
          )}
        </Button>
      </form>

      <div className="text-center mt-6">
        <Link to="/auth/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}