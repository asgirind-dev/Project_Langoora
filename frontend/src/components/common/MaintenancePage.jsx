// frontend/src/pages/MaintenancePage.jsx
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  Wrench, Clock, AlertTriangle, RefreshCw, Shield, Calendar, Eye, Lock
} from 'lucide-react';  // ✅ Eye import කරන්න
import { useAuth } from '../../context/AuthContext';
import maintenanceService from '../../services/maintenanceService';

export default function MaintenancePage() {
  const { user, hasReadOnlyAccess } = useAuth();
  const userRole = user?.role || localStorage.getItem('userRole');
  
  // ✅ State for maintenance details
  const [maintenanceDetails, setMaintenanceDetails] = useState({
    estimatedTime: null,
    message: '',
    isMaintenance: true
  });
  const [timeRemaining, setTimeRemaining] = useState('');

  // ✅ Fetch maintenance details
  useEffect(() => {
    const fetchMaintenanceDetails = async () => {
      try {
        const response = await maintenanceService.getMaintenanceDetails();
        if (response) {
          setMaintenanceDetails(response);
        }
      } catch (error) {
        console.error('Error fetching maintenance details:', error);
      }
    };
    
    fetchMaintenanceDetails();
    
    // Update every minute
    const interval = setInterval(fetchMaintenanceDetails, 60000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Calculate time remaining
  useEffect(() => {
    if (!maintenanceDetails.estimatedTime) {
      setTimeRemaining('');
      return;
    }

    const updateTimeRemaining = () => {
      const estimatedDate = new Date(maintenanceDetails.estimatedTime);
      const now = new Date();
      const diffMs = estimatedDate - now;
      
      if (diffMs <= 0) {
        setTimeRemaining('Any moment now');
        return;
      }
      
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      
      if (diffHours > 0) {
        setTimeRemaining(`${diffHours}h ${remainingMins}m remaining`);
      } else {
        setTimeRemaining(`${diffMins} minutes remaining`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [maintenanceDetails.estimatedTime]);

  // ✅ Get maintenance message based on user role
  const getMaintenanceMessage = () => {
    if (hasReadOnlyAccess()) {
      return {
        title: 'Maintenance Mode - Read Only',
        description: maintenanceDetails.message || 'The platform is currently under maintenance. You can view content but modifications are temporarily disabled.',
        icon: <Eye size={48} className="text-blue-400" />,  // ✅ Eye icon now works
        color: 'blue',
        showRefresh: true,
        isReadOnly: true
      };
    }
    
    // Students & Tutors - Blocked
    if (userRole === 'student' || userRole === 'tutor') {
      return {
        title: 'Platform Under Maintenance',
        description: maintenanceDetails.message || 'We\'re currently performing scheduled maintenance to improve your experience. Please check back shortly.',
        icon: <Wrench size={48} className="text-amber-400 animate-pulse" />,
        color: 'amber',
        showRefresh: true,
        isReadOnly: false
      };
    }
    
    // Public users - Blocked
    return {
      title: 'Under Maintenance',
      description: maintenanceDetails.message || 'We\'re currently performing scheduled maintenance to improve your experience. Please check back shortly.',
      icon: <Wrench size={48} className="text-amber-400 animate-pulse" />,
      color: 'amber',
      showRefresh: true,
      isReadOnly: false
    };
  };

  // ✅ Check if user is admin (they shouldn't see this page)
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'finance_admin';
  
  // If admin somehow ends up here, redirect to dashboard
  if (isAdmin) {
    window.location.href = '/admin';
    return null;
  }

  const message = getMaintenanceMessage();

  return (
    <div className="min-h-screen bg-[#080d1a] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        {/* Icon */}
        <div className={`w-24 h-24 ${message.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'} border rounded-3xl flex items-center justify-center mx-auto mb-6`}>
          {message.icon}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">
          {message.title}
        </h1>
        
        <p className="text-gray-400 text-sm mb-6">
          {message.description}
        </p>

        {/* ✅ Status Card with Time */}
        <div className={`${message.color === 'blue' ? 'border-blue-500/20' : 'border-amber-500/20'} bg-white/[0.03] border rounded-2xl p-4 mb-6`}>
          <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
            {timeRemaining ? (
              <>
                <Clock size={16} />
                <span>Estimated completion: <span className="font-bold">{timeRemaining}</span></span>
              </>
            ) : (
              <>
                <Clock size={16} />
                <span>Maintenance in progress</span>
              </>
            )}
          </div>
        </div>

        {/* ✅ Show estimated time if set */}
        {maintenanceDetails.estimatedTime && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-4">
            <Calendar size={12} />
            <span>Scheduled until: {new Date(maintenanceDetails.estimatedTime).toLocaleString()}</span>
          </div>
        )}

        {/* Role-specific messages */}
        {message.isReadOnly && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
            <p className="text-xs text-blue-400 flex items-start gap-2 text-left">
              <Shield size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>Read-Only Mode:</strong> You can view content but 
                cannot create, edit, or delete items during maintenance.
              </span>
            </p>
          </div>
        )}

        {userRole === 'student' && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6">
            <p className="text-xs text-amber-400 flex items-start gap-2 text-left">
              <Lock size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>Access Restricted:</strong> Exam taking and 
                other features are temporarily disabled during maintenance.
              </span>
            </p>
          </div>
        )}

        {/* Refresh Button */}
        {message.showRefresh && (
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium hover:bg-white/10 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Check Status
          </button>
        )}

        <p className="text-xs text-gray-600 mt-6">
          Admin: You can disable maintenance mode in System Settings → Governance & Security
        </p>
      </motion.div>
    </div>
  );
}