const { db } = require('../config/firebase'); 

class TutorValidationService {

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
    await db.collection('users').doc(tutorId).update({
      status: 'active',
      verifiedAt: new Date().toISOString()
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
    return { success: true, tutorId };
  }


  async rejectApplication(tutorId, validatorId) {
    await db.collection('users').doc(tutorId).update({
      status: 'rejected',
      rejectedAt: new Date().toISOString()
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
        reviewed_at: new Date().toISOString()
      });
    }
    return { success: true, tutorId };
  }
}

module.exports = new TutorValidationService();