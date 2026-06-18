import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarDays, Plus, Trash2, CheckCircle2, Circle, AlertTriangle, 
  Calendar, Hourglass, Loader2, CheckSquare, ListTodo, PieChart, TrendingUp 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import PlannerLockOverlay from '../../components/student/PlannerLockOverlay'; // 👈 අලුත් Overlay එක මෙතනින් Import කළා මචන්!

export default function StudyPlannerPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [profileGoal, setProfileGoal] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State for Adding New Task
  const [taskForm, setTaskForm] = useState({ title: '', description: '', scheduled_date: '' });

  const studentId = user?.uid || user?.id;

  // ==========================================
  // 🔄 1. READ: FETCH DASHBOARD DATA FROM BACKEND
  // ==========================================
  const fetchPlannerData = async () => {
    if (!studentId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/planner/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (response.status === 403 || result.isLocked) {
        setIsLocked(true);
      } else if (result.success) {
        setPlans(result.plans || []);
        setProfileGoal(result.profileGoal || null);
        setIsLocked(false);
      }
    } catch (error) {
      console.error("Error connecting to planner API registry:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlannerData(); }, [studentId]);

  // ==========================================
  // ➕ 2. CREATE: SUBMIT NEW TASK TO BACKEND
  // ==========================================
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.scheduled_date) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/planner/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...taskForm,
          target_exam: profileGoal?.targetExam || 'General'
        })
      });
      const result = await response.json();

      if (result.success) {
        setPlans(prev => [...prev, result.data].sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date)));
        setTaskForm({ title: '', description: '', scheduled_date: '' }); 
      }
    } catch (error) {
      console.error("Failed to commit task node:", error);
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // 📝 3. UPDATE: TOGGLE TASK STATUS (PENDING -> COMPLETED)
  // ==========================================
  const handleToggleStatus = async (planId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/planner/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const result = await response.json();

      if (result.success) {
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, status: nextStatus, achieved: nextStatus === 'completed' } : p));
      }
    } catch (error) {
      console.error("Failed to modify operational lifecycle state:", error);
    }
  };

  // ==========================================
  // ❌ 4. DELETE: PURGE TASK FROM FIREBASE
  // ==========================================
  const handleDeleteTask = async (planId) => {
    if (!window.confirm("Are you sure you want to permanently delete this milestone plan?")) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/planner/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        setPlans(prev => prev.filter(p => p.id !== planId));
      }
    } catch (error) {
      console.error("Failed to drop planner document node:", error);
    }
  };

  // Helper Countdown Calculations
  const calculateDaysLeft = (targetDateStr) => {
    if (!targetDateStr) return null;
    const diffTime = new Date(targetDateStr) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysLeft = profileGoal ? calculateDaysLeft(profileGoal.targetDate) : null;

  // 📈 DYNAMIC METRICS SUMMARY GENERATOR
  const totalTasks = plans.length;
  const completedTasks = plans.filter(p => p.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const metricsStats = [
    { label: 'Total Tasks', value: totalTasks, icon: ListTodo, color: 'text-blue-400', sub: 'Assigned targets' },
    { label: 'Completed Tasks', value: completedTasks, icon: CheckSquare, color: 'text-emerald-400', sub: 'Milestones met' },
    { label: 'Pending Work', value: pendingTasks, icon: Hourglass, color: 'text-amber-400', sub: 'Awaiting execution' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'text-purple-400', sub: 'Overall efficiency' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3 text-slate-400">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="font-medium animate-pulse">Syncing Personal Study Parameters...</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-12 selection:bg-blue-500/30">
      
      {/* 👑 --- SUBSCRIPTION PREMIUM LOCK OVERLAY SCREEN --- */}
     
      {isLocked && <PlannerLockOverlay />}

      {/* --- CONTENT CONTAINER (BLURRED IF LOCKED) --- */}
      <div className={`space-y-8 transition-all duration-300 ${isLocked ? 'blur-md pointer-events-none select-none' : ''}`}>
        
        {/* HEADER SECTION WITH DYNAMIC SYNC INFO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <CalendarDays className="text-blue-500" size={28} /> Personal Study Planner
            </h1>
            <p className="text-gray-400 mt-1 text-sm">Design structured workflows, map official exam dates, and earn milestones</p>
          </motion.div>

          {/* 🎯 SYNC WITH STUDENT PROFILE EXAM GOALS */}
          {profileGoal?.targetExam && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-2xl shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                <Hourglass size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Target: {profileGoal.targetExam}</div>
                <div className="text-sm font-extrabold text-white mt-0.5">
                  {daysLeft !== null ? `${daysLeft} Days Remaining` : 'Goal Date Reached'}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* 📊 --- PERFORMANCE CARD GRIDS INTERACTION LAYER --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metricsStats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="p-5 border-white/10">
                <s.icon size={20} className={`${s.color} mb-3`} />
                <div className="text-3xl font-bold text-white mb-1 tracking-tight">{s.value}</div>
                <div className="text-sm text-gray-300">{s.label}</div>
                <div className="text-xs text-gray-500 mt-1">{s.sub}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* CORE INTERACTION MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT SIDE: CREATE FORM PANEL */}
          <div className="space-y-6">
            <GlassCard className="p-6 border-white/10">
              <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2 pb-2 border-b border-white/5">
                <Plus size={18} className="text-blue-400" /> Commit New Milestone
              </h3>
              <form onSubmit={handleAddTask} className="space-y-4">
                <Input 
                  label="Task Title" 
                  required 
                  placeholder="e.g. Learn N4 Kanji Radicals" 
                  value={taskForm.title}
                  onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                />
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Task Context Description</label>
                  <textarea 
                    placeholder="Provide execution details..." 
                    value={taskForm.description}
                    onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 mt-1 min-h-[90px]"
                  />
                </div>
                <Input 
                  label="Scheduled Calendar Date" 
                  type="date" 
                  required 
                  value={taskForm.scheduled_date}
                  onChange={e => setTaskForm(p => ({ ...p, scheduled_date: e.target.value }))}
                />
                <Button type="submit" variant="primary" fullWidth disabled={actionLoading} className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 font-semibold py-3 rounded-xl text-xs tracking-wide hover:shadow-blue-500/20 shadow-md">
                  {actionLoading ? 'Saving Framework...' : 'Authorize Action Item'}
                </Button>
              </form>
            </GlassCard>
          </div>

          {/* RIGHT SIDE: READ & LIVE LIST WORKFLOWS WITH PROGRESS BREAKDOWN */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6 border-white/10">
              
              {/* Progress Bar Integration */}
              <div className="mb-6 pb-5 border-b border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-300 flex items-center gap-1.5"><PieChart size={14} className="text-purple-400"/> Micro Milestone Completion Status</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{completionRate}%</span>
                    <Badge color={completionRate >= 80 ? 'green' : completionRate >= 50 ? 'blue' : 'yellow'}>
                      {completionRate === 100 ? 'All Completed' : completionRate >= 75 ? 'Excellent Progress' : 'In Execution'}
                    </Badge>
                  </div>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} 
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                  />
                </div>
              </div>

              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-400" /> Active Schedule Tasks ({plans.length})
              </h3>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
                <AnimatePresence initial={false}>
                  {plans.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 text-sm">
                      <AlertTriangle size={24} className="mx-auto mb-2 text-gray-600 animate-pulse" />
                      No daily action blueprints created yet. Commit your first task above.
                    </div>
                  ) : (
                    plans.map((plan, i) => (
                      <motion.div 
                        key={plan.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 30 }}
                        transition={{ delay: i * 0.02 }}
                        className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                          plan.status === 'completed' 
                            ? 'bg-emerald-500/[0.01] border-emerald-500/10 text-gray-400 shadow-inner' 
                            : 'bg-white/[0.02] border-white/10 text-white hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* UPDATE BUTTON: TOGGLE LIFECYCLE */}
                          <button 
                            onClick={() => handleToggleStatus(plan.id, plan.status)}
                            className={`mt-0.5 shrink-0 transition-colors focus:outline-none ${plan.status === 'completed' ? 'text-emerald-500' : 'text-gray-500 hover:text-white'}`}
                          >
                            {plan.status === 'completed' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                          
                          <div className="min-w-0 flex-1">
                            <h4 className={`text-sm font-bold truncate ${plan.status === 'completed' ? 'line-through text-gray-500 font-medium' : 'text-white'}`}>
                              {plan.title}
                            </h4>
                            {plan.description && (
                              <p className="text-xs text-gray-400 mt-1 leading-relaxed break-words">{plan.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5 font-mono text-gray-400">
                                📅 {plan.scheduled_date}
                              </span>
                              <Badge className="text-[9px] uppercase tracking-wider scale-90 border-none font-extrabold" color={plan.status === 'completed' ? 'green' : 'blue'}>
                                {plan.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* DELETE BUTTON: PURGE OPERATION */}
                        <button 
                          onClick={() => handleDeleteTask(plan.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>
          </div>

        </div>
      </div>
    </div>
  );
}