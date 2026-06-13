import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={28} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
        <p className="text-gray-400 mb-6">We sent a password reset link to <span className="text-blue-400 font-medium">{email}</span></p>
        <p className="text-sm text-gray-500 mb-8">Didn't receive it? Check your spam folder or{' '}
          <button onClick={() => setSent(false)} className="text-blue-400 hover:text-blue-300">try again</button>
        </p>
        <Link to="/auth/login">
          <Button variant="secondary" fullWidth><ArrowLeft size={16} /> Back to Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-2">Reset your password</h2>
      <p className="text-gray-400 mb-8">Enter your email and we'll send you a reset link</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          icon={Mail}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading || !email}>
          {loading ? 'Sending...' : <>Send Reset Link <ArrowRight size={18} /></>}
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
