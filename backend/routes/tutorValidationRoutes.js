const express = require('express');
const router = express.Router();
const tutorValidationController = require('../controllers/tutorValidationController');


router.get('/pending-queue', tutorValidationController.getPendingQueue);
router.put('/approve/:id', tutorValidationController.approveTutor);
router.put('/reject/:id', tutorValidationController.rejectTutor);

module.exports = router;