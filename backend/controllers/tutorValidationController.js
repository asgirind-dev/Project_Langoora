const tutorValidationService = require('../services/tutorValidationService');

exports.getPendingQueue = async (req, res) => {
  try {
    const queue = await tutorValidationService.getPendingApplications();
    res.status(200).json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const validatorId = req.user?.uid || 'user_validator_002'; 
    const result = await tutorValidationService.approveApplication(id, validatorId);
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const validatorId = req.user?.uid || 'user_validator_002';
    const result = await tutorValidationService.rejectApplication(id, validatorId);
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};