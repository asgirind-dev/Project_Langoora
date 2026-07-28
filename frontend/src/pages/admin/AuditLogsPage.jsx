// frontend/src/pages/admin/AuditLogsPage.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Shield, User, BookOpen, DollarSign, 
  Calendar, Search, RefreshCw, Loader2, Clock, Filter, 
  Users, Lock, FileText, CreditCard, Settings, Award, Globe,
  TrendingUp, ChevronRight
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ============================================
// 📌 CONFIGURATIONS
// ============================================

const TYPE_LABELS = {
  'user_lifecycle': { label: 'User Lifecycle', icon: User, color: 'text-blue-400' },
  'privilege_change': { label: 'Privilege Changes', icon: Shield, color: 'text-purple-400' },
  'authentication': { label: 'Authentication', icon: Lock, color: 'text-emerald-400' },
  'content_moderation': { label: 'Content Moderation', icon: FileText, color: 'text-amber-400' },
  'financial': { label: 'Financial', icon: DollarSign, color: 'text-green-400' },
  'system_config': { label: 'System Config', icon: Settings, color: 'text-cyan-400' },
  'exam_attempt': { label: 'Exam Attempts', icon: BookOpen, color: 'text-indigo-400' },
  'tutor_validation': { label: 'Tutor Validation', icon: Award, color: 'text-pink-400' },
  'language_management': { label: 'Language Management', icon: Globe, color: 'text-teal-400' },
  'credit_management': { label: 'Credit Management', icon: CreditCard, color: 'text-yellow-400' },
  'plan_management': { label: 'Plan Management', icon: TrendingUp, color: 'text-rose-400' }
};

// ✅ FIXED: No duplicate keys - all keys are unique now
const ACTION_LABELS = {
  // Authentication
  'login': { label: 'Login', severity: 'info' },
  'register': { label: 'Registered', severity: 'success' },
  'staff_login': { label: 'Staff Login', severity: 'info' },
  'logout': { label: 'Logout', severity: 'info' },
  'login_failed': { label: 'Login Failed', severity: 'error' },
  
  // User Lifecycle
  'provisioned': { label: 'Staff Provisioned', severity: 'success' },
  'suspended': { label: 'User Suspended', severity: 'error' },
  'activated': { label: 'User Activated', severity: 'success' },
  'user_deleted': { label: 'User Deleted', severity: 'error' },
  'revoked': { label: 'Invitation Revoked', severity: 'error' },
  
  // Privilege Changes
  'priv_added': { label: 'Privileges Added', severity: 'success' },
  'priv_removed': { label: 'Privileges Removed', severity: 'error' },
  'priv_updated': { label: 'Privileges Updated', severity: 'warning' },
  'created_role': { label: 'Role Created', severity: 'success' },
  'updated_role': { label: 'Role Updated', severity: 'warning' },
  'deleted_role': { label: 'Role Deleted', severity: 'error' },
  
  // Content Moderation - all unique
  'content_created': { label: 'Content Created', severity: 'success' },
  'content_updated': { label: 'Content Updated', severity: 'warning' },
  'content_deleted': { label: 'Content Deleted', severity: 'error' },
  'restored': { label: 'Restored', severity: 'success' },
  'content_approved': { label: 'Content Approved', severity: 'success' },
  'content_rejected': { label: 'Content Rejected', severity: 'error' },
  
  // Financial
  'purchase': { label: 'Purchase', severity: 'success' },
  'subscription': { label: 'Subscription', severity: 'success' },
  'payout': { label: 'Payout', severity: 'info' },
  'refund': { label: 'Refund', severity: 'warning' },
  
  // System Config
  'settings_updated': { label: 'Settings Updated', severity: 'warning' },
  'banner_updated': { label: 'Banners Updated', severity: 'warning' },
  'commission_updated': { label: 'Commission Updated', severity: 'warning' },
  
  // Exam Attempt - all unique
  'exam_started': { label: 'Exam Started', severity: 'info' },
  'exam_submitted': { label: 'Exam Submitted', severity: 'success' },
  'violation': { label: 'Anti-Cheat Violation', severity: 'error' },
  
  // Tutor Validation - all unique
  'tutor_approved': { label: 'Tutor Approved', severity: 'success' },
  'tutor_rejected': { label: 'Tutor Rejected', severity: 'error' }
};

// ============================================
// 📊 AUDIT LOGS PAGE COMPONENT
// ============================================

export default function AuditLogsPage() {
  // State
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ============================================
  // 📡 API CALLS
  // ============================================

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query params
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (search) params.append('search', search);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('limit', '500');

      const [logsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/audit/logs?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/audit/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (logsRes.data.success) {
        setLogs(logsRes.data.logs || []);
      }
      
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Handle filter changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) fetchAuditLogs();
    }, 500);
    return () => clearTimeout(timer);
  }, [typeFilter, actionFilter, search, dateFrom, dateTo]);

  // ============================================
  // 📊 HELPER FUNCTIONS
  // ============================================

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  const getTypeInfo = (type) => {
    return TYPE_LABELS[type] || { label: type || 'Unknown', icon: Activity, color: 'text-gray-400' };
  };

  const getActionInfo = (action) => {
    return ACTION_LABELS[action] || { label: action || 'Unknown', severity: 'info' };
  };

  const getSeverityColor = (severity) => {
    const map = {
      'success': 'emerald',
      'error': 'red',
      'warning': 'amber',
      'info': 'blue'
    };
    return map[severity] || 'gray';
  };

  const getUniqueActions = () => {
    const actions = new Set();
    logs.forEach(log => {
      if (log.action) actions.add(log.action);
    });
    return Array.from(actions).sort();
  };

  // ============================================
  // 📈 STATS CARDS
  // ============================================

  const statsCards = stats ? [
    { label: 'Total Events', value: stats.total || 0, icon: Activity, color: 'text-blue-400' },
    { label: 'Today', value: stats.today || 0, icon: Clock, color: 'text-emerald-400' },
    { label: 'This Week', value: stats.thisWeek || 0, icon: Calendar, color: 'text-purple-400' },
    { label: 'This Month', value: stats.thisMonth || 0, icon: TrendingUp, color: 'text-amber-400' },
    { label: 'Unique Users', value: stats.uniqueUsers || 0, icon: Users, color: 'text-cyan-400' },
    { label: 'Unique Actors', value: stats.uniqueActors || 0, icon: Shield, color: 'text-rose-400' }
  ] : [];

  // ============================================
  // 🎨 RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Audit Logs</h1>
            <p className="text-gray-400">
              Complete activity trail for the platform - {stats?.total || 0} total events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => {
                setRefreshing(true);
                fetchAuditLogs();
              }}
              disabled={refreshing}
            >
              <RefreshCw size={14} className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={14} className="mr-1" />
              Filters
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsCards.map((s, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard className="p-3 text-center">
              <s.icon size={16} className={`${s.color} mx-auto mb-1`} />
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-[10px] text-gray-400">{s.label}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-4 overflow-hidden">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by email, entity, reason..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-gray-500"
                  />
                </div>

                {/* ✅ Type Filter - Dark Theme Dropdown */}
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer min-w-[140px]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="all" className="bg-[#0a0e1a] text-white">All Types</option>
                  {Object.entries(TYPE_LABELS).map(([key, val]) => (
                    <option key={key} value={key} className="bg-[#0a0e1a] text-white">{val.label}</option>
                  ))}
                </select>

                {/* ✅ Action Filter - Dark Theme Dropdown */}
                <select
                  value={actionFilter}
                  onChange={e => setActionFilter(e.target.value)}
                  className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer min-w-[150px]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="all" className="bg-[#0a0e1a] text-white">All Actions</option>
                  {getUniqueActions().map(action => {
                    const info = getActionInfo(action);
                    return (
                      <option key={action} value={action} className="bg-[#0a0e1a] text-white">
                        {info.label}
                      </option>
                    );
                  })}
                </select>

                {/* ✅ Date Range - Dark Theme */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="bg-[#0a0e1a] border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                  />
                  <span className="text-gray-500 text-xs">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="bg-[#0a0e1a] border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* Clear Filters */}
                {(search || typeFilter !== 'all' || actionFilter !== 'all' || dateFrom || dateTo) && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setTypeFilter('all');
                      setActionFilter('all');
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logs Table */}
      <GlassCard className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Activity Feed</h3>
          <span className="text-xs text-gray-500">
            {logs.length} events {search && `(filtered)`}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="animate-spin text-blue-500" size={28} />
            <p className="text-gray-400 text-sm">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            <Activity size={32} className="mx-auto mb-3 opacity-20" />
            <p>No events match your filters</p>
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('all');
                setActionFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-blue-400 hover:text-blue-300 text-xs mt-2"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => {
              const typeInfo = getTypeInfo(log.type);
              const actionInfo = getActionInfo(log.action);
              const TypeIcon = typeInfo.icon;
              const severityColor = getSeverityColor(actionInfo.severity);
              const isExpanded = expandedLog === log.id;

              return (
                <motion.div
                  key={log.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                >
                  <div 
                    className={`flex flex-col p-3 rounded-xl hover:bg-white/3 transition-all cursor-pointer border border-transparent hover:border-white/5 ${
                      isExpanded ? 'bg-white/5 border-white/10' : ''
                    }`}
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-${severityColor}-500/10`}>
                        <TypeIcon size={14} className={typeInfo.color} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">
                            {actionInfo.label}
                          </span>
                          <Badge color={severityColor} className="text-xs">
                            {actionInfo.severity}
                          </Badge>
                          <Badge color="gray" className="text-xs">
                            {typeInfo.label}
                          </Badge>
                          {log.entityType && (
                            <Badge color="gray" className="text-xs border-white/10">
                              {log.entityType}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 mt-0.5">
                          <span className="text-gray-300 font-medium">
                            {log.actorEmail || 'System'}
                          </span>
                          <span className="text-gray-500 mx-1">→</span>
                          <span className="text-blue-300">
                            {log.userEmail || log.studentEmail || log.tutorEmail || 'Unknown'}
                          </span>
                          {log.entityName && (
                            <span className="text-gray-500 ml-2">
                              • <span className="text-amber-300">{log.entityName}</span>
                            </span>
                          )}
                        </p>

                        {/* Changes Preview */}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {log.changes.added?.map(p => (
                              <span key={p} className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                                + {p}
                              </span>
                            ))}
                            {log.changes.removed?.map(p => (
                              <span key={p} className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                                - {p}
                              </span>
                            ))}
                            {log.changes.old !== undefined && log.changes.new !== undefined && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                                {log.changes.old} → {log.changes.new}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Reason */}
                        {log.reason && (
                          <p className="text-[10px] text-gray-500 mt-0.5 italic">
                            "{log.reason}"
                          </p>
                        )}

                        {/* Error */}
                        {log.error && (
                          <p className="text-[10px] text-red-400 mt-0.5">
                            ❌ {log.error}
                          </p>
                        )}
                      </div>

                      {/* Timestamp & Expand */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-gray-500 hidden sm:block">
                          {formatDate(log.timestamp)}
                        </span>
                        <ChevronRight 
                          size={14} 
                          className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 pt-3 border-t border-white/5 overflow-hidden"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-white/5 rounded-lg p-2">
                              <span className="text-gray-500">Log ID</span>
                              <p className="text-white font-mono text-[10px] truncate">{log.id}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                              <span className="text-gray-500">Timestamp</span>
                              <p className="text-white">{formatDate(log.timestamp)}</p>
                            </div>
                            {log.ip && (
                              <div className="bg-white/5 rounded-lg p-2">
                                <span className="text-gray-500">IP Address</span>
                                <p className="text-white">{log.ip}</p>
                              </div>
                            )}
                            {log.userAgent && (
                              <div className="bg-white/5 rounded-lg p-2">
                                <span className="text-gray-500">User Agent</span>
                                <p className="text-white truncate">{log.userAgent}</p>
                              </div>
                            )}
                            {log.entityId && (
                              <div className="bg-white/5 rounded-lg p-2">
                                <span className="text-gray-500">Entity ID</span>
                                <p className="text-white font-mono text-[10px] truncate">{log.entityId}</p>
                              </div>
                            )}
                            {log.feedback && (
                              <div className="bg-white/5 rounded-lg p-2 col-span-2">
                                <span className="text-gray-500">Feedback</span>
                                <p className="text-white">{log.feedback}</p>
                              </div>
                            )}
                            {log.changes && Object.keys(log.changes).length > 0 && (
                              <div className="bg-white/5 rounded-lg p-2 col-span-2">
                                <span className="text-gray-500">Full Changes</span>
                                <pre className="text-white text-[10px] overflow-auto max-h-32 mt-1">
                                  {JSON.stringify(log.changes, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}