// backend/services/tutorValidationService.js
const { db } = require('../config/firebase');
const emailService = require('./emailService');

class TutorValidationService {

  constructor() {
    this.emailService = emailService;
    // Initialize email service on startup
    this.emailService.initialize().catch(err => {
      console.warn('⚠️ Email service initialization warning:', err.message);
    });
  }

  async createApplication(userId, applicationData) {
    const newApplication = {
      user_id: userId,
      qualifications: applicationData.qualifications ? [applicationData.qualifications] : [],
      cv_url: applicationData.certificateData || '',
      verification_status: 'pending',
      reviewed_by: null,
      applied_at: new Date().toISOString()
    };

    const docRef = await db.collection('tutor_applications').add(newApplication);
    return { id: docRef.id, ...newApplication };
  }

  async getPendingApplications() {
    const appSnapshot = await db.collection('tutor_applications')
      .where('verification_status', '==', 'pending')
      .get();

    const pendingQueue = [];
    
    for (const docObj of appSnapshot.docs) {
      const appData = docObj.data();
      const userDoc = await db.collection('users').doc(appData.user_id).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        pendingQueue.push({
          id: appData.user_id,
          applicationId: docObj.id,
          name: userData.name || 'Anonymous Instructor',
          email: userData.email || '',
          university: userData.university || 'Independent Institution',
          qualifications: appData.qualifications.join(', '),
          certificateData: appData.cv_url,
          applied_at: appData.applied_at
        });
      }
    }
    return pendingQueue;
  }

  async approveApplication(tutorId, validatorId) {
    try {
      const userDoc = await db.collection('users').doc(tutorId).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      const userData = userDoc.data();

      await db.collection('users').doc(tutorId).update({
        status: 'active',
        verifiedAt: new Date().toISOString(),
        verifiedBy: validatorId
      });

      const appSnapshot = await db.collection('tutor_applications')
        .where('user_id', '==', tutorId)
        .where('verification_status', '==', 'pending')
        .limit(1)
        .get();

      if (!appSnapshot.empty) {
        const appDocRef = appSnapshot.docs[0].ref;
        await appDocRef.update({
          verification_status: 'approved',
          reviewed_by: validatorId || 'user_validator_002',
          reviewed_at: new Date().toISOString()
        });
      }

      // 📧 Send approval email
      const emailResult = await this.emailService.sendTutorApprovalEmail(
        userData.email,
        userData.name || 'Tutor',
        tutorId
      );

      return { 
        success: true, 
        tutorId,
        emailSent: emailResult.success,
        emailError: emailResult.error || null
      };

    } catch (error) {
      console.error('Error in approveApplication:', error);
      throw error;
    }
  }

  async rejectApplication(tutorId, validatorId, rejectionReason = null) {
    try {
      const userDoc = await db.collection('users').doc(tutorId).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      const userData = userDoc.data();

      await db.collection('users').doc(tutorId).update({
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: validatorId,
        rejectionReason: rejectionReason || null
      });

      const appSnapshot = await db.collection('tutor_applications')
        .where('user_id', '==', tutorId)
        .where('verification_status', '==', 'pending')
        .limit(1)
        .get();

      if (!appSnapshot.empty) {
        const appDocRef = appSnapshot.docs[0].ref;
        await appDocRef.update({
          verification_status: 'rejected',
          reviewed_by: validatorId || 'user_validator_002',
          reviewed_at: new Date().toISOString(),
          rejectionReason: rejectionReason || null
        });
      }

      // 📧 Send rejection email
      const emailResult = await this.emailService.sendTutorRejectionEmail(
        userData.email,
        userData.name || 'Tutor',
        rejectionReason
      );

      return { 
        success: true, 
        tutorId,
        emailSent: emailResult.success,
        emailError: emailResult.error || null
      };

    } catch (error) {
      console.error('Error in rejectApplication:', error);
      throw error;
    }
  }

  async updateRejectionReason(tutorId, reason) {
    try {
      await db.collection('users').doc(tutorId).update({
        rejectionReason: reason
      });

      const appSnapshot = await db.collection('tutor_applications')
        .where('user_id', '==', tutorId)
        .where('verification_status', '==', 'pending')
        .limit(1)
        .get();

      if (!appSnapshot.empty) {
        const appDocRef = appSnapshot.docs[0].ref;
        await appDocRef.update({
          rejectionReason: reason
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating rejection reason:', error);
      throw error;
    }
  }
}

module.exports = new TutorValidationService();