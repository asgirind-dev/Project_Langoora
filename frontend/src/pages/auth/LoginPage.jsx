import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Chrome, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth(); 
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!form.email) {
      e.email = 'Email address is required';
    } else if (!emailRegex.test(form.email)) {
      e.email = 'Please enter a valid email address';
    }

    if (!form.password) {
      e.password = 'Password is required';
    }
    
    return e;
  };

  const handleRoleRedirection = (userObj) => {
    if (!userObj) {
      navigate('/auth/login');
      return;
    }

    if (userObj.status === 'profile_incomplete') {
      navigate('/auth/complete-profile', { state: { metadata: userObj } });
      return;
    }

    const currentRole = userObj.role || userObj.user?.role;

    if (currentRole === 'admin') navigate('/admin');
    else if (currentRole === 'validator') navigate('/validator');
    else if (currentRole === 'finance') navigate('/finance-admin');
    else if (currentRole === 'tutor') {
      if (userObj.status === 'pending' || userObj.user?.status === 'pending') {
        navigate('/auth/under-review');
      } else {
        navigate('/tutor');
      }
    } else if (currentRole === 'student') {
      navigate('/student');
    } else {
      setErrors({ server: "Role assignment configuration error. Contact support." });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    const errs = validate();
    if (Object.keys(errs).length > 0) { 
      setErrors({ ...errs, globalAlert: "Please resolve the input validation errors highlighted below." }); 
      return; 
    }
    
    const savedEmail = form.email.toLowerCase().trim();
    const savedPassword = form.password;

    // 🎯 CRITICAL ENTRY GUARD: Block corporate domain formats or known administrative strings on the client side
    if (savedEmail.includes('admin') || savedEmail.includes('validator') || savedEmail.includes('finance') || savedEmail === 'admin@novacore.com') {
      setErrors({
        server: "Access Denied: Internal system staff profiles are restricted from using this portal. Authenticate via the Corporate Gateway Terminal."
      });
      return;
    }

    setLoading(true);

    try {
      const authenticatedUser = await login(savedEmail, savedPassword);
      handleRoleRedirection(authenticatedUser);
    } catch (err) {
      console.log("Captured login error in component:", err.message);
      setForm({ email: savedEmail, password: savedPassword });
      setErrors({
        server: err.message || "Invalid email address or password. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    setErrors({});
    try {
      const googleUser = await loginWithGoogle();
      handleRoleRedirection(googleUser);
    } catch (err) {
      setErrors({ server: err.message || "Google registration interaction failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
      <p className="text-gray-400 mb-8">Sign in to continue your learning journey</p>

      {/* Global Validation Notification */}
      {errors.globalAlert && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm p-3.5 rounded-xl mb-5 flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{errors.globalAlert}</span>
        </div>
      )}

      {errors.server && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3.5 rounded-xl mb-5 flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{errors.server}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          icon={Mail}
          value={form.email}
          onChange={e => setForm({ email: e.target.value, password: form.password })} 
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
              onChange={e => setForm({ email: form.email, password: e.target.value })} 
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