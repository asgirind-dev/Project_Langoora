// backend/controllers/tutorValidationController.js
const { db } = require('../config/firebase'); // ✅ ADD THIS - IMPORTANT!
const tutorValidationService = require('../services/tutorValidationService');

// ✅ ADD: Audit Log Service
const auditLogService = require('../services/auditLogService');

// ✅ Helper for non-blocking audit logging
const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

// GET PENDING QUEUE (NO AUDIT - READ ONLY)
exports.getPendingQueue = async (req, res) => {
  try {
    const queue = await tutorValidationService.getPendingApplications();
    res.status(200).json({ success: true, data: queue });
  } catch (error) {
    console.error('Get pending queue error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// APPROVE TUTOR - WITH AUDIT LOG
exports.approveTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const validatorId = req.user?.uid || req.user?.id || 'user_validator_002';

    // Get tutor details before approval
    const userDoc = await db.collection('users').doc(id).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    const result = await tutorValidationService.approveApplication(id, validatorId);

    // ✅ TUTOR VALIDATION AUDIT LOG - APPROVED
    logAudit(auditLogService.logTutorValidation, {
      tutorId: id,
      tutorEmail: userData?.email || 'unknown',
      validatorId: validatorId,
      validatorEmail: req.user?.email || 'unknown',
      action: 'approved',
      feedback: 'Tutor application approved',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    res.status(200).json({ 
      success: true, 
      result,
      message: result.emailSent 
        ? '✅ Tutor approved successfully. Notification email has been sent to the tutor.'
        : '⚠️ Tutor approved. (Email notification failed - check email configuration)'
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// REJECT TUTOR - WITH AUDIT LOG
exports.rejectTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const validatorId = req.user?.uid || req.user?.id || 'user_validator_002';

    // Get tutor details before rejection
    const userDoc = await db.collection('users').doc(id).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    const result = await tutorValidationService.rejectApplication(
      id, 
      validatorId, 
      rejectionReason || null
    );

    // ✅ TUTOR VALIDATION AUDIT LOG - REJECTED
    logAudit(auditLogService.logTutorValidation, {
      tutorId: id,
      tutorEmail: userData?.email || 'unknown',
      validatorId: validatorId,
      validatorEmail: req.user?.email || 'unknown',
      action: 'rejected',
      reason: rejectionReason || 'No specific reason provided',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    res.status(200).json({ 
      success: true, 
      result,
      message: result.emailSent 
        ? '📋 Tutor rejected. Notification email has been sent to the tutor.'
        : '⚠️ Tutor rejected. (Email notification failed - check email configuration)'
    });
  } catch (error) {
    console.error('Rejection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE REJECTION REASON - WITH AUDIT LOG
exports.updateRejectionReason = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rejection reason is required' 
      });
    }

    // Get tutor details before update
    const userDoc = await db.collection('users').doc(id).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const oldReason = userData?.rejectionReason || null;
    
    const result = await tutorValidationService.updateRejectionReason(id, reason);

    // ✅ TUTOR VALIDATION AUDIT LOG - REJECTION REASON UPDATED
    logAudit(auditLogService.logTutorValidation, {
      tutorId: id,
      tutorEmail: userData?.email || 'unknown',
      validatorId: req.user?.uid || req.user?.id || 'system',
      validatorEmail: req.user?.email || 'system@langoora.com',
      action: 'rejection_reason_updated',
      reason: reason,
      feedback: `Updated from: "${oldReason || 'None'}" to: "${reason}"`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    res.status(200).json({ 
      success: true, 
      result,
      message: 'Rejection reason updated successfully'
    });
  } catch (error) {
    console.error('Update rejection reason error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};