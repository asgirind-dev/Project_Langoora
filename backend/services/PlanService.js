// backend/services/PlanService.js
const { db } = require('../config/firebase');
const notificationService = require('./NotificationService');

// ✅ Helper to get Admin User IDs for notifications
const getAdminIds = async () => {
  try {
    console.log('🔍 [PlanService] Fetching admin users...');
    const usersSnapshot = await db.collection('users')
      .where('role', 'in', ['admin', 'super_admin'])
      .get();
    
    console.log(`🔍 [PlanService] Found ${usersSnapshot.size} admin users`);
    
    const userIds = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      console.log(`🔍 [PlanService] Admin user: ${doc.id} - ${userData.email} - Role: ${userData.role}`);
      userIds.push(doc.id);
    });
    
    // ✅ If no users found with role filter, try alternative
    if (userIds.length === 0) {
      console.log('⚠️ [PlanService] No admin users found with role filter, trying all users...');
      const allUsers = await db.collection('users').get();
      allUsers.forEach(doc => {
        const userData = doc.data();
        const role = userData.role || userData.roleId || '';
        if (role === 'admin' || role === 'super_admin' || role === 'Admin' || role === 'Super Admin') {
          console.log(`🔍 [PlanService] Found admin user (alternative): ${doc.id} - ${userData.email} - Role: ${role}`);
          userIds.push(doc.id);
        }
      });
    }
    
    console.log(`🔍 [PlanService] Final Admin IDs:`, userIds);
    return userIds;
  } catch (error) {
    console.error('❌ [PlanService] Error fetching admin IDs:', error);
    return [];
  }
};

// ✅ Helper to get Finance Admin User IDs for notifications
const getFinanceAdminIds = async () => {
  try {
    console.log('🔍 [PlanService] Fetching finance admin users...');
    const usersSnapshot = await db.collection('users')
      .where('role', 'in', ['finance', 'finance_admin'])
      .get();
    
    console.log(`🔍 [PlanService] Found ${usersSnapshot.size} finance admin users`);
    
    const userIds = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      console.log(`🔍 [PlanService] Finance admin user: ${doc.id} - ${userData.email} - Role: ${userData.role}`);
      userIds.push(doc.id);
    });
    
    // ✅ If no users found with role filter, try alternative
    if (userIds.length === 0) {
      console.log('⚠️ [PlanService] No finance admin users found with role filter, trying all users...');
      const allUsers = await db.collection('users').get();
      allUsers.forEach(doc => {
        const userData = doc.data();
        const role = userData.role || userData.roleId || '';
        if (role === 'finance' || role === 'finance_admin' || role === 'Finance' || role === 'Finance Admin') {
          console.log(`🔍 [PlanService] Found finance admin user (alternative): ${doc.id} - ${userData.email} - Role: ${role}`);
          userIds.push(doc.id);
        }
      });
    }
    
    console.log(`🔍 [PlanService] Final Finance Admin IDs:`, userIds);
    return userIds;
  } catch (error) {
    console.error('❌ [PlanService] Error fetching finance admin IDs:', error);
    return [];
  }
};

class PlanService {
  async getAllPlans() {
    try {
      const snapshot = await db.collection('subscription_plans').get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          popular: data.popular === true || data.popular === 'true',
          active: data.active !== undefined ? (data.active === true || data.active === 'true') : true,
          status: data.status || 'pending'
        };
      });
    } catch (error) {
      throw new Error(`Error fetching plans: ${error.message}`);
    }
  }

  async getPlansByStatus(status) {
    try {
      const snapshot = await db.collection('subscription_plans')
        .where('status', '==', status)
        .get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        popular: doc.data().popular === true || doc.data().popular === 'true',
        active: doc.data().active !== undefined ? (doc.data().active === true || doc.data().active === 'true') : true
      }));
    } catch (error) {
      throw new Error(`Error fetching plans by status: ${error.message}`);
    }
  }

  async createNewPlan(planData) {
    try {
      const payload = {
        ...planData,
        popular: planData.popular === true || planData.popular === 'true',
        active: planData.active !== undefined ? (planData.active === true || planData.active === 'true') : true,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      const docRef = await db.collection('subscription_plans').add(payload);
      const doc = await docRef.get();
      
      // ✅ FIX: Use getAdminIds() instead of sendToRole
      try {
        const adminIds = await getAdminIds();
        console.log(`📤 [PlanService] Sending plan_created notification to ${adminIds.length} admins:`, adminIds);
        
        if (adminIds.length > 0) {
          await notificationService.sendToMany(adminIds, {
            type: 'plan_created',
            title: '📋 New Subscription Plan Submitted',
            message: `A new plan "${planData.name}" (LKR ${planData.price}) has been created and requires review.`,
            actionUrl: '/admin/revenue?tab=approvals',
            planId: doc.id,
            planName: planData.name
          });
          console.log(`✅ [PlanService] Plan creation notifications sent to ${adminIds.length} admins`);
        } else {
          console.log('⚠️ [PlanService] No admin users found to send plan_created notification');
        }
      } catch (notifError) {
        console.error('❌ [PlanService] Failed to send plan_created notification:', notifError);
      }
      
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Error creating plan: ${error.message}`);
    }
  }

  async updateExistingPlan(id, planData) {
    try {
      const docRef = db.collection('subscription_plans').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error('Plan not found');
      }
      const currentData = doc.data();
      const updatePayload = { updatedAt: new Date().toISOString() };
      
      // ✅ Track if plan is being activated or deactivated
      const isBeingActivated = planData.active === true && (currentData.active !== true);
      const isBeingDeactivated = planData.active === false && currentData.active === true;
      
      if (planData.sortOrder !== undefined) {
        updatePayload.sortOrder = planData.sortOrder;
      }
      if (planData.name !== undefined) {
        updatePayload.name = planData.name;
      }
      if (planData.price !== undefined) {
        updatePayload.price = planData.price;
      }
      if (planData.credits !== undefined) {
        updatePayload.credits = planData.credits;
      }
      if (planData.features !== undefined) {
        updatePayload.features = planData.features;
      }
      if (planData.popular !== undefined) {
        updatePayload.popular = planData.popular === true || planData.popular === 'true';
      }
      if (planData.active !== undefined) {
        updatePayload.active = planData.active === true || planData.active === 'true';
      }
      
      // ✅ Get admin IDs once for all notifications
      const adminIds = await getAdminIds();
      
      // ✅ FIX: If plan is rejected and being updated, set status to 'pending' for re-approval
      if (currentData.status === 'rejected') {
        updatePayload.status = 'pending';
        updatePayload.reviewNotes = '';
        updatePayload.reviewedAt = null;
        
        // ✅ Notify admin that plan has been resubmitted
        if (adminIds.length > 0) {
          await notificationService.sendToMany(adminIds, {
            type: 'plan_resubmitted',
            title: '🔄 Plan Resubmitted for Review',
            message: `Plan "${planData.name || currentData.name}" has been updated and resubmitted for approval by Finance Admin.`,
            actionUrl: '/admin/revenue?tab=approvals',
            planId: id,
            planName: planData.name || currentData.name
          });
          console.log(`✅ [PlanService] Plan resubmitted notifications sent to ${adminIds.length} admins`);
        }
      }
      
      // ✅ NEW: Notify Admin when a plan is activated by Finance Admin
      if (isBeingActivated && currentData.status === 'approved') {
        if (adminIds.length > 0) {
          await notificationService.sendToMany(adminIds, {
            type: 'plan_activated',
            title: '🚀 Subscription Plan Activated',
            message: `Finance Admin has activated the plan "${currentData.name}". It is now live for users.`,
            actionUrl: '/admin/revenue',
            planId: id,
            planName: currentData.name
          });
          console.log(`✅ [PlanService] Plan activated notifications sent to ${adminIds.length} admins`);
        }
      }

      // ✅ NEW: Notify Admin when a plan is deactivated by Finance Admin
      if (isBeingDeactivated && currentData.status === 'approved') {
        if (adminIds.length > 0) {
          await notificationService.sendToMany(adminIds, {
            type: 'plan_deactivated',
            title: '⏸️ Subscription Plan Deactivated',
            message: `Finance Admin has deactivated the plan "${currentData.name}". It is no longer visible to users.`,
            actionUrl: '/admin/revenue',
            planId: id,
            planName: currentData.name
          });
          console.log(`✅ [PlanService] Plan deactivated notifications sent to ${adminIds.length} admins`);
        }
      }
      
      // If status is explicitly provided in update, use it (but only if not rejected)
      if (planData.status !== undefined && planData.status !== currentData.status && currentData.status !== 'rejected') {
        updatePayload.status = planData.status;
      }
      
      const needsReapproval = (planData.status !== undefined && 
                               planData.status !== currentData.status && 
                               currentData.status === 'approved' && 
                               currentData.status !== 'rejected');
      
      await docRef.update(updatePayload);
      
      if (needsReapproval) {
        if (adminIds.length > 0) {
          await notificationService.sendToMany(adminIds, {
            type: 'plan_updated',
            title: '🔄 Plan Updated',
            message: `Plan "${currentData.name}" has been updated and needs re-review.`,
            actionUrl: '/admin/revenue?tab=approvals',
            planId: id,
            planName: currentData.name
          });
          console.log(`✅ [PlanService] Plan updated notifications sent to ${adminIds.length} admins`);
        }
      }
      
      const updated = await docRef.get();
      return { id, ...updated.data() };
    } catch (error) {
      throw new Error(`Error updating plan: ${error.message}`);
    }
  }

  async deleteExistingPlan(id) {
    try {
      await db.collection('subscription_plans').doc(id).delete();
      return { id };
    } catch (error) {
      throw new Error(`Error deleting plan: ${error.message}`);
    }
  }

  async approvePlan(id, notes = '') {
    try {
      const docRef = db.collection('subscription_plans').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error('Plan not found');
      }
      const planData = doc.data();
      const updatePayload = {
        status: 'approved',
        active: true,
        reviewedAt: new Date().toISOString(),
        reviewNotes: notes,
        updatedAt: new Date().toISOString()
      };
      await docRef.update(updatePayload);
      
      // ✅ FIX: Use getFinanceAdminIds() instead of sendToRole
      try {
        const financeAdminIds = await getFinanceAdminIds();
        if (financeAdminIds.length > 0) {
          await notificationService.sendToMany(financeAdminIds, {
            type: 'plan_approved',
            title: '✅ Plan Approved',
            message: `Plan "${planData.name}" has been approved${notes ? `: "${notes}"` : ''}`,
            actionUrl: '/finance-admin/subscriptions',
            planId: id,
            planName: planData.name
          });
          console.log(`✅ [PlanService] Plan approved notifications sent to ${financeAdminIds.length} finance admins`);
        }
      } catch (notifError) {
        console.error('❌ [PlanService] Failed to send plan_approved notification:', notifError);
      }
      
      const updated = await docRef.get();
      return { id, ...updated.data() };
    } catch (error) {
      throw new Error(`Error approving plan: ${error.message}`);
    }
  }

  async rejectPlan(id, notes = '') {
    try {
      const docRef = db.collection('subscription_plans').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error('Plan not found');
      }
      const planData = doc.data();
      const updatePayload = {
        status: 'rejected',
        active: false,
        reviewedAt: new Date().toISOString(),
        reviewNotes: notes,
        updatedAt: new Date().toISOString()
      };
      await docRef.update(updatePayload);
      
      // ✅ FIX: Use getFinanceAdminIds() instead of sendToRole
      try {
        const financeAdminIds = await getFinanceAdminIds();
        if (financeAdminIds.length > 0) {
          await notificationService.sendToMany(financeAdminIds, {
            type: 'plan_rejected',
            title: '❌ Plan Rejected',
            message: `Plan "${planData.name}" has been rejected${notes ? `: "${notes}"` : ''}`,
            actionUrl: '/finance-admin/subscriptions',
            planId: id,
            planName: planData.name
          });
          console.log(`✅ [PlanService] Plan rejected notifications sent to ${financeAdminIds.length} finance admins`);
        }
      } catch (notifError) {
        console.error('❌ [PlanService] Failed to send plan_rejected notification:', notifError);
      }
      
      const updated = await docRef.get();
      return { id, ...updated.data() };
    } catch (error) {
      throw new Error(`Error rejecting plan: ${error.message}`);
    }
  }
}

module.exports = new PlanService();