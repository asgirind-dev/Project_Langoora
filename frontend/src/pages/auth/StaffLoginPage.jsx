import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert, AlertCircle, Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const { loginStaff } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const errs = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!form.email) {
      errs.email = 'Official corporate email is required';
    } else if (!emailRegex.test(form.email)) {
      errs.email = 'Please enter a valid corporate email structure';
    }

    if (!form.password) {
      errs.password = 'Security password is required';
    }

    return errs;
  };

const handleStaffRedirection = (role) => {
  const cleanRole = role?.toLowerCase().trim();

  if (cleanRole === 'admin' || cleanRole === 'super_admin') {
    navigate('/admin');
  } else if (cleanRole === 'validator') {
    navigate('/validator');
  } else if (cleanRole === 'finance' || cleanRole === 'finance_admin') {
    navigate('/finance-admin');
  } else {
    setErrors({ server: 'Access Denied: Unrecognized system node configuration.' });
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const formValidationErrors = validateForm();
    if (Object.keys(formValidationErrors).length > 0) {
      setErrors({ 
        ...formValidationErrors, 
        globalAlert: 'Please resolve the security credentials validation errors highlighted below.' 
      });
      return;
    }

    setLoading(true);

    try {
      const staffUser = await loginStaff(form.email, form.password);
      if (staffUser && staffUser.role) {
        handleStaffRedirection(staffUser.role);
      }
    } catch (err) {
      console.error('Identity gateway validation exception:', err);
      const serverMessage = err.message || 'Authentication failed. Unauthorized terminal access attempt.';
      setErrors({ server: serverMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 select-none relative overflow-hidden font-sans">
      
      {/* Premium Background Mesh Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none" />
      
      {/* Security Matrix Grid Overlay Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/40 border border-white/5 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative z-10 transition-all duration-300 hover:border-white/10">
        
        {/* Terminal Staging Label */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono tracking-widest text-indigo-400 uppercase mb-6 shadow-sm">
          <Terminal size={11} /> Node Connection: Secure
        </div>

        {/* Brand/Gateway Header Section */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl border border-indigo-500/20 shadow-inner">
            <ShieldAlert size={26} className="text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Staff Gateway
            </h2>
            <p className="text-[11px] text-indigo-400 uppercase tracking-widest font-bold mt-0.5">
              Secure Core Authentication
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed font-medium">
          Authorized operations network terminal. Unauthorized entries trigger continuous logging, dynamic access auditing, and trace protocols.
        </p>

        {/* Error Notification Panels */}
        <div className="space-y-3 mb-5">
          {errors.globalAlert && (
            <div className="bg-amber-500/5 border border-amber-500/20 text-amber-400 text-xs p-3.5 rounded-xl flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <span className="font-medium leading-normal">{errors.globalAlert}</span>
            </div>
          )}

          {errors.server && (
            <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-xl flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
              <span className="font-medium leading-normal">{errors.server}</span>
            </div>
          )}
        </div>

        {/* Input Form Submission Controls */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Corporate Identity Target (Email)"
            type="email"
            placeholder="username@novacore.com"
            icon={Mail}
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            className="focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gateway Access Key (Password)</label>
            <div className="relative group">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className={`w-full bg-slate-950/40 border ${errors.password ? 'border-rose-500/40 focus:border-rose-500' : 'border-white/5 focus:border-indigo-500/50'} rounded-xl px-4 py-3 pl-11 pr-11 text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${errors.password ? 'focus:ring-rose-500/10' : 'focus:ring-indigo-500/20'} transition-all text-sm font-medium`}
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)} 
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1 rounded"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-[11px] text-rose-400 font-medium mt-0.5">{errors.password}</p>}
          </div>

          <div className="pt-3">
            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              fullWidth 
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] shadow-lg shadow-indigo-950/50 font-bold tracking-wide transition-all text-sm rounded-xl py-3 text-white flex items-center justify-center gap-2 border border-indigo-500/30"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying Cryptography Nodes...
                </span>
              ) : (
                <>Authorize Session <ArrowRight size={16} /></>
              )}
            </Button>
          </div>
        </form>

        {/* Footer Audit Stamp */}
        <div className="mt-8 pt-4 border-t border-slate-800/60 text-center select-none">
          <p className="text-[10px] font-mono text-slate-600 tracking-wider">
            LANGOORA SECURITY PROTOCOL CORE SEC-NODE // v4.2.6
          </p>
        </div>

      </div>
    </div>
  );
}