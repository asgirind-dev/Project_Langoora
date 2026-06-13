import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Chrome } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth(); // 🔥 Destructured loginWithGoogle
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters';
    return e;
  };

  // Safe navigation handler tool shared across both entry paths
  const handleRoleRedirection = (userObj) => {
    if (userObj && userObj.role === 'admin') navigate('/admin');
    else if (userObj && userObj.role === 'validator') navigate('/validator');
    else if (userObj && userObj.role === 'tutor') {
      if (userObj.status === 'pending') navigate('/auth/under-review');
      else navigate('/tutor');
    } 
    else navigate('/student'); // Default student target
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { 
      setErrors(errs); 
      return; 
    }
    
    setLoading(true);
    setErrors({}); 

    try {
      const authenticatedUser = await login(form.email, form.password);
      handleRoleRedirection(authenticatedUser);
    } catch (err) {
      console.error("Authentication submission rejected:", err);
      setErrors({ server: err.message || "Failed to log in. Please check your credentials." });
    } finally {
      setLoading(false);
    }
  };

  // 🔥 NEW: Google Action Click Trigger Workflow
  const handleGoogleClick = async () => {
    setLoading(true);
    setErrors({});
    try {
      const googleUser = await loginWithGoogle();
      handleRoleRedirection(googleUser);
    } catch (err) {
      console.error("Google authentication action crashed:", err);
      setErrors({ server: err.message || "Google registration interaction failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
      <p className="text-gray-400 mb-8">Sign in to continue your learning journey</p>

      {errors.server && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">
          {errors.server}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          icon={Mail}
          value={form.email}
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          error={errors.email}
        />
        
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className={`w-full bg-white/5 border ${errors.password ? 'border-red-500/60' : 'border-white/10'} rounded-xl px-4 py-3 pl-10 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 transition-all text-sm`}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
        </div>

        <div className="flex justify-end">
          <Link to="/auth/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">Forgot password?</Link>
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? 'Signing in...' : <>Sign In <ArrowRight size={18} /></>}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
          <div className="relative flex justify-center"><span className="bg-[#060d1f] px-3 text-gray-500 text-sm">or continue with</span></div>
        </div>

        {/* 🔥 FIXED: Hooked onClick parameter interface dynamically */}
        <Button variant="secondary" size="lg" fullWidth type="button" onClick={handleGoogleClick} disabled={loading}>
          <Chrome size={18} className="text-blue-400" /> Continue with Google
        </Button>
      </form>

      <p className="text-center text-gray-400 text-sm mt-6">
        Don't have an account?{' '}
        <Link to="/auth/register" className="text-blue-400 hover:text-blue-300 font-medium">Create one free</Link>
      </p>
    </div>
  );
}