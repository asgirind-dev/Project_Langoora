// backend/services/PlanService.js
const { db } = require('../config/firebase');
const notificationService = require('./NotificationService');

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
      await notificationService.sendToRole(['admin', 'super_admin'], {
        type: 'plan_created',
        title: '🆕 New Plan Created',
        message: `Plan "${planData.name}" (LKR ${planData.price}) created by finance team. Needs review.`,
        actionUrl: '/admin/revenue?tab=approvals',
        planId: doc.id,
        planName: planData.name
      });
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
      if (planData.status !== undefined && planData.status !== currentData.status) {
        updatePayload.status = planData.status;
      }
      const needsReapproval = (planData.status !== undefined && 
                               planData.status !== currentData.status && 
                               currentData.status === 'approved');
      await docRef.update(updatePayload);
      if (needsReapproval) {
        await notificationService.sendToRole(['admin', 'super_admin'], {
          type: 'plan_updated',
          title: '🔄 Plan Updated',
          message: `Plan "${currentData.name}" has been updated and needs re-review.`,
          actionUrl: '/admin/revenue?tab=approvals',
          planId: id,
          planName: currentData.name
        });
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
      await notificationService.sendToRole(['finance', 'finance_admin'], {
        type: 'plan_approved',
        title: '✅ Plan Approved',
        message: `Plan "${planData.name}" has been approved${notes ? `: "${notes}"` : ''}`,
        actionUrl: '/finance-admin/subscriptions',
        planId: id,
        planName: planData.name
      });
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
      await notificationService.sendToRole(['finance', 'finance_admin'], {
        type: 'plan_rejected',
        title: '❌ Plan Rejected',
        message: `Plan "${planData.name}" has been rejected${notes ? `: "${notes}"` : ''}`,
        actionUrl: '/finance-admin/subscriptions',
        planId: id,
        planName: planData.name
      });
      const updated = await docRef.get();
      return { id, ...updated.data() };
    } catch (error) {
      throw new Error(`Error rejecting plan: ${error.message}`);
    }
  }
}

module.exports = new PlanService();