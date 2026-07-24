// frontend/src/components/EmailAnalytics.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, CheckCircle, XCircle, Clock, TrendingUp, 
  TrendingDown, RefreshCw, Activity, BarChart2
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import Badge from '../ui/Badge';

export default function EmailAnalytics() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rateLimit, setRateLimit] = useState(null);
  const [timeRange, setTimeRange] = useState('day');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch analytics
      const analyticsRes = await fetch(
        `http://localhost:5000/api/email-logs/analytics?timeRange=${timeRange}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const analyticsData = await analyticsRes.json();
      if (analyticsData.success) {
        setStats(analyticsData.stats);
      }

      // Fetch recent logs
      const logsRes = await fetch(
        'http://localhost:5000/api/email-logs/logs?limit=20',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const logsData = await logsRes.json();
      if (logsData.success) {
        setLogs(logsData.logs);
      }

      // Fetch rate limit status
      const rateRes = await fetch(
        'http://localhost:5000/api/email-logs/rate-limit',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const rateData = await rateRes.json();
      if (rateData.success) {
        setRateLimit(rateData.status);
      }

    } catch (error) {
      console.error('Error fetching email analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const statCards = [
    { label: 'Total Emails', value: stats?.total || 0, icon: Mail, color: 'text-blue-400' },
    { label: 'Sent Successfully', value: stats?.sent || 0, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Failed', value: stats?.failed || 0, icon: XCircle, color: 'text-red-400' },
    { label: 'Success Rate', value: `${stats?.successRate || 0}%`, icon: Activity, color: 'text-purple-400' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={32} className="animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Email Analytics</h3>
        <div className="flex gap-2">
          {['day', 'week', 'month'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
          <button
            onClick={fetchAnalytics}
            className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon size={18} className={stat.color} />
                {stat.label === 'Success Rate' && (
                  <Badge color={stats?.successRate >= 90 ? 'green' : stats?.successRate >= 70 ? 'yellow' : 'red'}>
                    {stats?.successRate >= 90 ? 'Excellent' : stats?.successRate >= 70 ? 'Good' : 'Needs Attention'}
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Rate Limit Status */}
      {rateLimit && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">Rate Limit Status</h4>
              <p className="text-xs text-gray-400">Current email sending limits</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-sm font-bold text-white">
                  {rateLimit.remaining?.perMinute || 0}/{rateLimit.limits?.perMinute || 0}
                </div>
                <div className="text-[10px] text-gray-500">Per Minute</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white">
                  {rateLimit.remaining?.perHour || 0}/{rateLimit.limits?.perHour || 0}
                </div>
                <div className="text-[10px] text-gray-500">Per Hour</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white">
                  {rateLimit.remaining?.perDay || 0}/{rateLimit.limits?.perDay || 0}
                </div>
                <div className="text-[10px] text-gray-500">Per Day</div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Recent Email Logs */}
      <GlassCard className="p-4">
        <h4 className="text-sm font-medium text-white mb-4">Recent Email Activity</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No email activity recorded yet
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"
              >
                <div className="flex items-center gap-3">
                  {log.status === 'sent' ? (
                    <CheckCircle size={16} className="text-emerald-400" />
                  ) : (
                    <XCircle size={16} className="text-red-400" />
                  )}
                  <div>
                    <p className="text-sm text-white">{log.recipient}</p>
                    <p className="text-xs text-gray-400">{log.type} • {log.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={log.status === 'sent' ? 'green' : 'red'}>
                    {log.status}
                  </Badge>
                  <span className="text-[10px] text-gray-500">
                    {log.sentAt ? new Date(log.sentAt).toLocaleTimeString() : ''}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}