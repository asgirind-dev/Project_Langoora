// frontend/src/pages/auth/LoginPage.jsx

import { useState, useRef, useEffect } from 'react';
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
  const [errorMessage, setErrorMessage] = useState(null);
  const [globalAlert, setGlobalAlert] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef(null);

  // ✅ One-time cleanup: if an older build left a stale key behind
  // (from the previous localStorage-relay workaround), clear it so
  // it can never resurface on an unrelated page load.
  useEffect(() => {
    localStorage.removeItem('loginError');
  }, []);

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
      setErrorMessage('Role assignment configuration error. Contact support.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setErrorMessage(null);
    setGlobalAlert(null);
    setFieldErrors({});

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setGlobalAlert('Please resolve the input validation errors highlighted below.');
      return;
    }

    const submittedEmail = form.email.toLowerCase().trim();
    const submittedPassword = form.password;

    // CRITICAL ENTRY GUARD: Block corporate domain formats
    if (
      submittedEmail.includes('admin') ||
      submittedEmail.includes('validator') ||
      submittedEmail.includes('finance') ||
      submittedEmail === 'admin@novacore.com'
    ) {
      setErrorMessage(
        'Access Denied: Internal system staff profiles are restricted from using this portal. Authenticate via the Corporate Gateway Terminal.'
      );
      return;
    }

    setLoading(true);

    try {
      const authenticatedUser = await login(submittedEmail, submittedPassword);
      handleRoleRedirection(authenticatedUser);
    } catch (err) {
      // Clear password for security
      setForm((prev) => ({ ...prev, password: '' }));

      setErrorMessage(err.message || 'Invalid email address or password. Please try again.');

      // Focus on password field after error
      setTimeout(() => {
        if (passwordInputRef.current) {
          passwordInputRef.current.focus();
        }
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    setErrorMessage(null);
    setGlobalAlert(null);
    try {
      const googleUser = await loginWithGoogle();
      handleRoleRedirection(googleUser);
    } catch (err) {
      let errorMsg = err.message || 'Google registration interaction failed.';

      if (
        errorMsg.toLowerCase().includes('popup-closed') ||
        errorMsg.toLowerCase().includes('cancelled')
      ) {
        errorMsg = 'Google sign-in popup was closed. Please try again.';
      } else if (
        errorMsg.toLowerCase().includes('account-exists') ||
        errorMsg.toLowerCase().includes('email already in use')
      ) {
        errorMsg = 'This email is already registered. Please login with your password.';
      } else if (errorMsg.toLowerCase().includes('network error')) {
        errorMsg = 'Network error. Please check your internet connection.';
      }

      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
      <p className="text-gray-400 mb-8">Sign in to continue your learning journey</p>

      {/* Error Message Display */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3.5 rounded-xl mb-5 flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span id="login-error-message">{errorMessage}</span>
        </div>
      )}

      {/* Global Validation Notification */}
      {globalAlert && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm p-3.5 rounded-xl mb-5 flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{globalAlert}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          icon={Mail}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={fieldErrors.email}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={passwordInputRef}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`w-full bg-white/5 border ${fieldErrors.password ? 'border-red-500/60' : 'border-white/10'} rounded-xl px-4 py-3 pl-10 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 transition-all text-sm`}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && <p className="text-xs text-red-400">{fieldErrors.password}</p>}
        </div>

        <div className="flex justify-end">
          <Link to="/auth/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </span>
          ) : (
            <>Sign In <ArrowRight size={18} /></>
          )}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#060d1f] px-3 text-gray-500 text-sm">or continue with</span>
          </div>
        </div>

        <Button variant="secondary" size="lg" fullWidth type="button" onClick={handleGoogleClick} disabled={loading}>
          <Chrome size={18} className="text-blue-400" /> Continue with Google
        </Button>
      </form>

      <p className="text-center text-gray-400 text-sm mt-6">
        Don't have an account?{' '}
        <Link to="/auth/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Create one free
        </Link>
      </p>
    </div>
  );
}