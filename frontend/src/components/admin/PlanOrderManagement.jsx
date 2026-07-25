// frontend/src/components/admin/PlanOrderManagement.jsx
import { useState, useEffect } from 'react';
import {
  GripVertical, CheckCircle, XCircle, RefreshCw, Save,
  ArrowUp, ArrowDown, Layers
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import SubscriptionService from '../../services/subscriptionService';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortablePlanItem({ plan, index, total, onMoveUp, onMoveDown }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-white/5 rounded-xl border transition-all duration-200 ${isDragging
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
          : 'border-white/10 hover:border-white/20'
        }`}
    >
      <div className="flex items-center gap-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <GripVertical size={20} />
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">{plan.icon === 'Rocket' ? '🚀' : '📦'}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{plan.name}</span>
            {plan.popular && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                ★ Popular
              </span>
            )}
            <span className="text-[10px] text-gray-500">#{index + 1}</span>
          </div>
          <div className="text-xs text-gray-400">
            LKR {plan.price?.toLocaleString()} / month • {plan.credits} credits
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-gray-500 min-w-[24px] text-center">
            {index + 1}
          </span>
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="p-0.5 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowUp size={12} />
            </button>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === total - 1}
              className="p-0.5 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDown size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlanOrderManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await SubscriptionService.getAllPlans();
      const approvedPlans = (data || [])
        .filter(plan => plan.status === 'approved' && plan.active === true)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setPlans(approvedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = plans.findIndex((item) => item.id === active.id);
      const newIndex = plans.findIndex((item) => item.id === over.id);
      const newPlans = arrayMove(plans, oldIndex, newIndex);
      const updatedPlans = newPlans.map((plan, index) => ({
        ...plan,
        sortOrder: index + 1
      }));
      setPlans(updatedPlans);
    }
  };

  const movePlan = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= plans.length) return;
    const newPlans = arrayMove(plans, index, newIndex);
    const updatedPlans = newPlans.map((plan, idx) => ({
      ...plan,
      sortOrder: idx + 1
    }));
    setPlans(updatedPlans);
  };

  const saveOrder = async () => {
    setSaving(true);
    setSaveStatus(null);
    setSaveMessage('');
    try {
      const updatePromises = plans.map(plan =>
        SubscriptionService.updateExistingPlan(plan.id, {
          sortOrder: plan.sortOrder
        })
      );
      await Promise.all(updatePromises);
      setSaveStatus('success');
      setSaveMessage('✅ Plan order saved successfully!');
      await fetchPlans();
      setTimeout(() => {
        setSaveStatus(null);
        setSaveMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error saving order:', error);
      setSaveStatus('error');
      setSaveMessage('❌ Failed to save plan order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RefreshCw className="animate-spin text-purple-400" size={40} />
        <p className="text-gray-400 mt-4">Loading plans...</p>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Layers size={32} className="text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">No Plans Available</h3>
        <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
          No approved plans found to manage order. Please approve plans first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-blue-400" />
            <h2 className="text-xl font-bold text-white">Plan Order Management</h2>
            <Badge color="blue">{plans.length} plans</Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Drag and drop to reorder subscription plans on landing and pricing pages
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-emerald-400 text-sm">
              <CheckCircle size={16} /> {saveMessage}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <XCircle size={16} /> {saveMessage}
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchPlans}
          >
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={saveOrder}
            disabled={saving}
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save Order'}
          </Button>
        </div>
      </div>

      <GlassCard className="p-4 border-white/10">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={plans.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {plans.map((plan, index) => (
                <SortablePlanItem
                  key={plan.id}
                  plan={plan}
                  index={index}
                  total={plans.length}
                  onMoveUp={movePlan}
                  onMoveDown={movePlan}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </GlassCard>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-xs font-medium text-gray-400 mb-2">🖥️ Landing Page Preview</h4>
          <div className="flex gap-2">
            {plans.slice(0, 3).map((plan, idx) => (
              <div
                key={plan.id}
                className={`flex-1 p-2 rounded-lg text-center text-xs ${idx === 0 ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/5 border border-white/10'
                  }`}
              >
                <span className="text-white font-medium">{plan.name}</span>
                <span className="text-gray-400 block text-[10px]">LKR {plan.price}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Order will reflect on landing and pricing pages</p>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-xs font-medium text-gray-400 mb-2">📊 Order Summary</h4>
          <div className="space-y-1">
            {plans.map((plan, idx) => (
              <div key={plan.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{idx + 1}. {plan.name}</span>
                <span className="text-gray-500">{plan.sortOrder || idx + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <p className="text-xs text-amber-400">
          💡 Changes will be reflected on the landing page and pricing page after saving.
          Only approved plans are shown in the order list.
        </p>
      </div>
    </div>
  );
}