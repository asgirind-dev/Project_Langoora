const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

class StudyPlannerService {

  async checkSubscriptionStatus(studentId) {
    const subSnapshot = await db.collection('subscriptions')
      .where('student_id', '==', studentId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    return !subSnapshot.empty; 
  }


  async createPlan(studentId, planData) {
    const isSubscribed = await this.checkSubscriptionStatus(studentId);
    if (!isSubscribed) {
      throw new Error("UNAUTHORIZED_LOCK: Study Planner is a premium feature. Please upgrade.");
    }

    const newPlan = {
      student_id: studentId,
      title: planData.title,
      description: planData.description || '',
      target_exam: planData.target_exam || 'General',
      scheduled_date: planData.scheduled_date, 
      status: 'pending', // pending, completed
      achieved: false,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('study_planners').add(newPlan);
    return { id: docRef.id, ...newPlan };
  }


  async getStudentPlannerDashboard(studentId) {
    const isSubscribed = await this.checkSubscriptionStatus(studentId);
    if (!isSubscribed) {
      return { isLocked: true, plans: [], profileGoal: null };
    }


    const studentDoc = await db.collection('users').doc(studentId).get();
    let profileGoal = null;
    
    if (studentDoc.exists) {
      const data = studentDoc.data();
      if (data.targetExam || data.targetDate) {
        profileGoal = {
          targetExam: data.targetExam || 'Not Specified',
          targetDate: data.targetDate || ''
        };
      }
    }


    const plansSnapshot = await db.collection('study_planners')
      .where('student_id', '==', studentId)
      .get();

    const plans = [];
    plansSnapshot.forEach(doc => {
      plans.push({ id: doc.id, ...doc.data() });
    });


    plans.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

    return {
      isLocked: false,
      profileGoal,
      plans
    };
  }

  async updatePlan(studentId, planId, updateData) {
    const isSubscribed = await this.checkSubscriptionStatus(studentId);
    if (!isSubscribed) throw new Error("UNAUTHORIZED_LOCK");

    const planRef = db.collection('study_planners').doc(planId);
    const planDoc = await planRef.get();


    if (!planDoc.exists || planDoc.data().student_id !== studentId) {
      throw new Error("Plan not found or unauthorized access.");
    }

    const cleanUpdates = {};
    if (updateData.title !== undefined) cleanUpdates.title = updateData.title;
    if (updateData.description !== undefined) cleanUpdates.description = updateData.description;
    if (updateData.scheduled_date !== undefined) cleanUpdates.scheduled_date = updateData.scheduled_date;
    if (updateData.status !== undefined) {
      cleanUpdates.status = updateData.status;
      cleanUpdates.achieved = updateData.status === 'completed';
    }
    cleanUpdates.updatedAt = new Date().toISOString();

    await planRef.update(cleanUpdates);
    return { id: planId, ...cleanUpdates };
  }

 
  async deletePlan(studentId, planId) {
    const planRef = db.collection('study_planners').doc(planId);
    const planDoc = await planRef.get();

    if (!planDoc.exists || planDoc.data().student_id !== studentId) {
      throw new Error("Plan not found or unauthorized access.");
    }

    await planRef.delete();
    return { success: true, id: planId };
  }
}

module.exports = new StudyPlannerService();