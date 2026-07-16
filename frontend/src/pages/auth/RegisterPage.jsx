import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Mail, Lock, Eye, EyeOff, User, Phone, Calendar, GraduationCap, 
  Upload, MapPin, ArrowRight, Chrome, BookOpen, CheckCircle, 
  AlertCircle, Check, X, Globe, User as UserIcon, FileText 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { fetchActiveLanguages } from '../../services/languageService'; // ✅ Updated import

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const timeoutRef = useRef(null);
  
  const { register, loginWithGoogle } = useAuth();
  
  const [role, setRole] = useState(params.get('role') || 'student');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false); 
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    firstName: '', 
    lastName: '',
    email: '', 
    password: '', 
    phone: '', 
    dob: '',
    qualifications: '', 
    university: '', 
    address: '', 
    certificate: null,
    language: '', // new field for tutor language selection
  });

  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '' });
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  
  // State for available languages from LanguageConfigPage
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [languagesLoading, setLanguagesLoading] = useState(false);

  // Fetch active languages when component mounts (public endpoint - no auth required)
  useEffect(() => {
    const fetchLanguages = async () => {
      setLanguagesLoading(true);
      try {
        const data = await fetchActiveLanguages();
        if (data.success) {
          // data.languages is already an array of unique language names
          setAvailableLanguages(data.languages);
          // Set default language if available
          if (data.languages.length > 0 && !form.language) {
            setForm(prev => ({ ...prev, language: data.languages[0] }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch languages:', error);
      } finally {
        setLanguagesLoading(false);
      }
    };
    fetchLanguages();
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Structural breakdown of policy rules matching for live UI feedback
  const getPasswordCriteria = (pass) => {
    return {
      hasLength: pass.length >= 8 && pass.length <= 12,
      hasNumeric: /[0-9]/.test(pass),
      hasLower: /[a-z]/.test(pass),
      hasUpper: /[A-Z]/.test(pass),
      hasSpecial: /[@#$%\^&\+=]/.test(pass),
    };
  };

  const checkPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '' };
    
    const criteria = getPasswordCriteria(pass);
    let criteriaMet = 0;
    if (criteria.hasNumeric) criteriaMet++;
    if (criteria.hasLower) criteriaMet++;
    if (criteria.hasUpper) criteriaMet++;
    if (criteria.hasSpecial) criteriaMet++;

    if (!criteria.hasLength) {
      if (pass.length < 8) return { score: 1, label: 'Too Short (Min. 8 Chars)' };
      if (pass.length > 12) return { score: 1, label: 'Too Long (Max. 12 Chars)' };
    }

    if (criteriaMet <= 1) return { score: 1, label: 'Weak' };
    if (criteriaMet === 2) return { score: 2, label: 'Fair' };
    if (criteriaMet === 3) return { score: 3, label: 'Good' };
    return { score: 4, label: 'Strong' };
  };

  const setField = (field) => (e) => {
    const value = e.target.type === 'file' ? e.target.files[0] : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    
    if (field === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.onerror = (error) => reject(error);
    });
  };

  const validate = () => {
    const e = {};
    
    if (!form.firstName.trim()) {
      e.firstName = 'First name is required';
    } else if (!/^[A-Za-z\s]{2,}$/.test(form.firstName.trim())) {
      e.firstName = 'First name must contain only letters';
    }

    if (!form.lastName.trim()) {
      e.lastName = 'Last name is required';
    } else if (!/^[A-Za-z\s]{2,}$/.test(form.lastName.trim())) {
      e.lastName = 'Last name must contain only letters';
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!form.email) {
      e.email = 'Valid email is required';
    } else if (!emailRegex.test(form.email)) {
      e.email = 'Invalid email structure format';
    }

    // Server-grade validation criteria block enforcement
    const criteria = getPasswordCriteria(form.password);
    let criteriaMet = 0;
    if (criteria.hasNumeric) criteriaMet++;
    if (criteria.hasLower) criteriaMet++;
    if (criteria.hasUpper) criteriaMet++;
    if (criteria.hasSpecial) criteriaMet++;

    if (!form.password) {
      e.password = 'Password structural requirement is missing';
    } else if (!criteria.hasLength) {
      e.password = 'Password must be between 8 and 12 characters long';
    } else if (criteriaMet < 3) {
      e.password = 'Must match at least 3 conditions: Uppercase, Lowercase, Number, or Symbol';
    }

    const slPhoneRegex = /^(?:\+94|0)?7[0-9]{8}$/;
    if (!form.phone.trim()) {
      e.phone = 'Phone number is required';
    } else if (!slPhoneRegex.test(form.phone.trim().replace(/\s+/g, ''))) {
      e.phone = 'Enter a valid Sri Lankan mobile number';
    }

    if (!form.dob) {
      e.dob = 'Date of birth is required';
    } else {
      const selectedDate = new Date(form.dob);
      const limitDate = new Date();
      limitDate.setFullYear(limitDate.getFullYear() - 15);
      if (selectedDate > new Date()) {
        e.dob = 'Date of birth cannot be in the future';
      } else if (selectedDate > limitDate) {
        e.dob = 'You must be at least 15 years old to register';
      }
    }
    
    if (role === 'tutor') {
      if (!form.qualifications.trim()) e.qualifications = 'Qualifications required';
      if (!form.university.trim()) e.university = 'University required';
      if (!form.certificate) e.certificate = 'Certificate file is required';
      if (!form.language) e.language = 'Please select your language expertise';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { 
      setErrors({ ...errs, globalAlert: "Submission blocked. Please rectify the highlighted registration errors." }); 
      return; 
    }
    
    setLoading(true);
    setErrors({});

    try {
      let certificateBase64 = '';
      if (role === 'tutor' && form.certificate) {
        certificateBase64 = await convertToBase64(form.certificate);
      }

      // Combine first and last name
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;

      const userData = {
        name: fullName,
        phone: form.phone.trim(),
        dob: form.dob,
        ...(role === 'tutor' && {
          university: form.university.trim(),
          qualifications: form.qualifications.trim(),
          address: form.address?.trim() || '',
          certificateData: certificateBase64,
          language: form.language, // new field
        })
      };

      await register(form.email, form.password, userData, role);
      
      setSuccess(true);
      timeoutRef.current = setTimeout(() => {
        navigate('/auth/login');
      }, 3000);

    } catch (err) {
      setErrors({ server: err.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    setErrors({});
    try {
      const result = await loginWithGoogle();
      if (result && result.status === 'profile_incomplete') {
        navigate('/auth/complete-profile', { 
          state: { metadata: { uid: result.uid, email: result.email, name: result.name } } 
        });
        return;
      }
      navigate('/student');
    } catch (err) {
      setErrors({ server: err.message || "Google single sign-on system breakdown." });
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'student', label: 'Student', icon: BookOpen, desc: 'Prepare for language exams and track your progress' },
    { id: 'tutor', label: 'Tutor', icon: GraduationCap, desc: 'Create and sell exam packs, earn from your expertise' },
  ];

  const currentCriteria = getPasswordCriteria(form.password);

  if (success) {
    return (
      <div className="text-center py-12 px-4 bg-white/5 border border-white/10 rounded-2xl max-w-md mx-auto my-8">
        <div className="flex justify-center mb-4 text-green-400">
          <CheckCircle size={56} className="animate-bounce" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          Your account has been created cleanly. Redirecting you to the login gateway to authenticate...
        </p>
        <div className="mt-6 text-xs text-blue-400 font-mono animate-pulse">
          Redirecting in 3 seconds...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-3xl font-bold text-white mb-2">Create your account</h2>
      <p className="text-gray-400 mb-8">Join 24,000+ learners on Langoora</p>

      {errors.globalAlert && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3.5 rounded-xl text-xs mb-5 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errors.globalAlert}</span>
        </div>
      )}

      {errors.server && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-xs mb-5 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errors.server}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-8">
        {roles.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => { setRole(r.id); setErrors({}); }}
            className={`p-4 rounded-xl border text-left transition-all ${
              role === r.id
                ? 'border-blue-500/60 bg-blue-500/10 text-white'
                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
            }`}
          >
            <r.icon size={20} className={`mb-2 ${role === r.id ? 'text-blue-400' : 'text-gray-500'}`} />
            <p className="font-semibold text-sm">{r.label}</p>
            <p className="text-xs mt-0.5 opacity-70">{r.desc}</p>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Name & Last Name in a grid */}
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="First Name" 
            placeholder="Asgiri" 
            icon={UserIcon} 
            value={form.firstName} 
            onChange={setField('firstName')} 
            error={errors.firstName} 
          />
          <Input 
            label="Last Name" 
            placeholder="Perera" 
            icon={UserIcon} 
            value={form.lastName} 
            onChange={setField('lastName')} 
            error={errors.lastName} 
          />
        </div>

        <Input label="Email Address" type="email" placeholder="you@example.com" icon={Mail} value={form.email} onChange={setField('email')} error={errors.email} />

        {/* Password Matrix Field with Real-time Tooltip Rules Modal Box */}
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-sm font-medium text-gray-300">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="8 - 12 characters"
              value={form.password}
              onChange={setField('password')}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              className={`w-full bg-white/5 border ${errors.password ? 'border-red-500/60' : 'border-white/10'} rounded-xl px-4 py-3 pl-10 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 text-sm transition-colors`}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Contextual Password Requirements Floating Tooltip Box */}
          <AnimatePresence>
            {isPasswordFocused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute z-20 top-full mt-2 w-full bg-[#0d1527] border border-white/15 p-4 rounded-xl shadow-2xl space-y-3 pointer-events-none"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <span className="text-xs font-semibold text-gray-200">Password Requirements</span>
                  <span className="text-[10px] text-amber-400 font-medium">Length + Min. 3 Criteria</span>
                </div>
                
                <ul className="space-y-1.5 text-xs text-gray-400">
                  <li className="flex items-center gap-2">
                    {currentCriteria.hasLength ? <Check size={14} className="text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20 bg-white/5 shrink-0" />}
                    <span className={currentCriteria.hasLength ? "text-emerald-400 transition-colors" : ""}>Length between 8 and 12 characters</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {currentCriteria.hasLower ? <Check size={14} className="text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20 bg-white/5 shrink-0" />}
                    <span className={currentCriteria.hasLower ? "text-emerald-400 transition-colors" : ""}>One lowercase letter (a-z)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {currentCriteria.hasUpper ? <Check size={14} className="text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20 bg-white/5 shrink-0" />}
                    <span className={currentCriteria.hasUpper ? "text-emerald-400 transition-colors" : ""}>One uppercase letter (A-Z)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {currentCriteria.hasNumeric ? <Check size={14} className="text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20 bg-white/5 shrink-0" />}
                    <span className={currentCriteria.hasNumeric ? "text-emerald-400 transition-colors" : ""}>One numeric digit (0-9)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {currentCriteria.hasSpecial ? <Check size={14} className="text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20 bg-white/5 shrink-0" />}
                    <span className={currentCriteria.hasSpecial ? "text-emerald-400 transition-colors" : ""}>One symbol (@, #, $, %, ^, &, +, =)</span>
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Real-time Color Bar Tracker */}
          {form.password && (
            <div className="mt-1">
              <div className="flex gap-1.5 h-1">
                {[1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.score >= index
                        ? passwordStrength.score <= 2
                          ? 'bg-red-500'
                          : passwordStrength.score === 3
                          ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Strength: <span className="font-semibold text-white">{passwordStrength.label}</span>
              </p>
            </div>
          )}
          
          {errors.password && <p className="text-xs text-red-400 mt-0.5">{errors.password}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone Number" type="tel" placeholder="+94 7X XXX XXXX" icon={Phone} value={form.phone} onChange={setField('phone')} error={errors.phone} />
          <Input label="Date of Birth" type="date" icon={Calendar} value={form.dob} onChange={setField('dob')} error={errors.dob} />
        </div>

        <AnimatePresence>
          {role === 'tutor' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Language Selection Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Language Expertise</label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={form.language}
                    onChange={setField('language')}
                    className={`w-full bg-white/5 border ${errors.language ? 'border-red-500/60' : 'border-white/10'} rounded-xl px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 text-sm transition-colors appearance-none`}
                  >
                    <option value="">Select your language expertise</option>
                    {availableLanguages.length === 0 && languagesLoading ? (
                      <option value="" disabled>Loading languages...</option>
                    ) : availableLanguages.length === 0 ? (
                      <option value="" disabled>No languages available</option>
                    ) : (
                      availableLanguages.map(lang => (
                        <option key={lang} value={lang} className="bg-[#0d1527]">
                          {lang}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {errors.language && <p className="text-xs text-red-400 mt-0.5">{errors.language}</p>}
                {languagesLoading && <p className="text-xs text-gray-400">Loading languages...</p>}
              </div>

              {/* Qualifications as textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Qualifications</label>
                <textarea
                  placeholder="Enter your qualifications (e.g., B.Ed Japanese, MA Linguistics...)"
                  value={form.qualifications}
                  onChange={setField('qualifications')}
                  rows={3}
                  className={`w-full bg-white/5 border ${errors.qualifications ? 'border-red-500/60' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 text-sm transition-colors resize-vertical`}
                />
                {errors.qualifications && <p className="text-xs text-red-400 mt-0.5">{errors.qualifications}</p>}
              </div>

              <Input label="University / Institution" placeholder="University Name" icon={GraduationCap} value={form.university} onChange={setField('university')} error={errors.university} />
              <Input label="Address" placeholder="Your physical address details" icon={MapPin} value={form.address} onChange={setField('address')} />
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Certificate Upload</label>
                <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-blue-500/40 transition-colors">
                  <Upload size={18} className="text-blue-400" />
                  <span className="text-sm text-gray-400 truncate max-w-xs">
                    {form.certificate ? form.certificate.name : 'Upload qualification certificate (PDF/JPG)'}
                  </span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={setField('certificate')} className="hidden" />
                </label>
                {errors.certificate && <p className="text-xs text-red-400 mt-0.5">{errors.certificate}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? 'Creating account...' : <span className="flex items-center justify-center gap-2">Create Account <ArrowRight size={18} /></span>}
        </Button>

        {role === 'student' && (
          <>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center"><span className="bg-[#060d1f] px-3 text-gray-500 text-sm">or</span></div>
            </div>

            <Button variant="secondary" size="lg" fullWidth type="button" onClick={handleGoogleClick} disabled={loading}>
              <span className="flex items-center justify-center gap-2">
                <Chrome size={18} className="text-blue-400" /> Continue with Google
              </span>
            </Button>
          </>
        )}
      </form>

      <p className="text-center text-gray-400 text-sm mt-6">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign in</Link>
      </p>
    </div>
  );
}