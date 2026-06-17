import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Shield, User, BookOpen, DollarSign, AlertTriangle, Calendar, Search } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const logs = [
  { id: 1, type: 'user', action: 'User registered', actor: 'System', target: 'Amara Bandara', timestamp: '2024-06-10 14:32:01', severity: 'info' },
  { id: 2, type: 'tutor', action: 'Tutor approved', actor: 'Admin (You)', target: 'Chen Wei', timestamp: '2024-06-10 14:10:44', severity: 'success' },
  { id: 3, type: 'exam', action: 'Exam published', actor: 'Hiroshi Tanaka', target: 'JLPT N2 Full Mock 2024', timestamp: '2024-06-10 13:55:12', severity: 'info' },
  { id: 4, type: 'payment', action: 'Payment processed', actor: 'System', target: 'LKR 2,500 · TXN001', timestamp: '2024-06-10 13:20:55', severity: 'success' },
  { id: 5, type: 'security', action: 'Suspicious login detected', actor: 'System', target: 'dilini@gmail.com', timestamp: '2024-06-10 12:45:30', severity: 'warning' },
  { id: 6, type: 'user', action: 'User suspended', actor: 'Admin (You)', target: 'Tharaka Fernando', timestamp: '2024-06-10 11:30:00', severity: 'danger' },
  { id: 7, type: 'exam', action: 'Exam flagged for review', actor: 'System', target: 'HSK Level 5 Mock', timestamp: '2024-06-10 10:15:22', severity: 'warning' },
  { id: 8, type: 'payment', action: 'Refund issued', actor: 'Admin (You)', target: 'LKR 2,200 · TXN005', timestamp: '2024-06-09 16:45:00', severity: 'info' },
  { id: 9, type: 'security', action: 'Password reset requested', actor: 'System', target: 'nuwan@gmail.com', timestamp: '2024-06-09 14:20:00', severity: 'info' },
  { id: 10, type: 'tutor', action: 'Tutor application submitted', actor: 'System', target: 'Akira Yamamoto', timestamp: '2024-06-08 09:00:00', severity: 'info' },
];

const typeIcons = {
  user: User, tutor: User, exam: BookOpen, payment: DollarSign, security: Shield,
};

const severityColors = {
  info: 'blue', success: 'green', warning: 'yellow', danger: 'red',
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = logs.filter(l => {
    if (search && !l.action.toLowerCase().includes(search.toLowerCase()) && !l.target.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && l.type !== typeFilter) return false;
    if (severityFilter !== 'all' && l.severity !== severityFilter) return false;
    if (dateFrom) {
      const logDate = l.timestamp.split(' ')[0];
      if (logDate < dateFrom) return false;
    }
    if (dateTo) {
      const logDate = l.timestamp.split(' ')[0];
      if (logDate > dateTo) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Audit Logs</h1>
        <p className="text-gray-400">Complete activity trail for the platform</p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Events Today', value: '142', icon: Activity, color: 'text-blue-400' },
          { label: 'Warnings', value: '3', icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Security Events', value: '1', icon: Shield, color: 'text-red-400' },
          { label: 'Transactions', value: '38', icon: DollarSign, color: 'text-emerald-400' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className="p-4 flex items-center gap-3">
              <s.icon size={18} className={s.color} />
              <div>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search actions, targets..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pl-8 text-white text-xs focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex gap-1.5">
            {['all', 'user', 'tutor', 'exam', 'payment', 'security'].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${typeFilter === t ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {['all', 'info', 'success', 'warning', 'danger'].map(s => (
              <button key={s} onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${severityFilter === s ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-gray-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" />
            <span className="text-gray-500 text-xs">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Activity Feed</h3>
          <span className="text-xs text-gray-500">{filtered.length} events</span>
        </div>
        <div className="space-y-1">
          {filtered.map((log, i) => {
            const Icon = typeIcons[log.type] || Activity;
            return (
              <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="flex items-start gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl hover:bg-white/3 transition-colors group">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                    log.severity === 'danger' ? 'bg-red-500/20' :
                    log.severity === 'warning' ? 'bg-amber-500/20' :
                    log.severity === 'success' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                  }`}>
                    <Icon size={13} className={
                      log.severity === 'danger' ? 'text-red-400' :
                      log.severity === 'warning' ? 'text-amber-400' :
                      log.severity === 'success' ? 'text-emerald-400' : 'text-blue-400'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white">{log.action}</p>
                      <Badge color={severityColors[log.severity]} className="text-xs">{log.severity}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <span className="text-gray-300">{log.actor}</span> → <span className="text-blue-300">{log.target}</span>
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:block">{log.timestamp}</span>
                </div>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">No events match your filters</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
