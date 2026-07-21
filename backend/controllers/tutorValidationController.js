// backend/controllers/tutorValidationController.js
const tutorValidationService = require('../services/tutorValidationService');

exports.getPendingQueue = async (req, res) => {
  try {
    const queue = await tutorValidationService.getPendingApplications();
    res.status(200).json({ success: true, data: queue });
  } catch (error) {
    console.error('Get pending queue error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const validatorId = req.user?.uid || req.user?.id || 'user_validator_002';
    const result = await tutorValidationService.approveApplication(id, validatorId);
    
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

exports.rejectTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const validatorId = req.user?.uid || req.user?.id || 'user_validator_002';
    
    const result = await tutorValidationService.rejectApplication(
      id, 
      validatorId, 
      rejectionReason || null
    );
    
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
    
    const result = await tutorValidationService.updateRejectionReason(id, reason);
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