const express = require('express');
const router = express.Router();
const studentController = require('../controllers/StudentProfilePageController');

// Student profile routes
router.get('/:uid', studentController.getStudentProfile);
router.put('/:uid', studentController.updateStudentProfile);
router.delete('/:uid/bank-details', studentController.deleteBankDetails);

module.exports = router;