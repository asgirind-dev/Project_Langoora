const express = require('express');
const router = express.Router();
const studentController = require('../controllers/StudentProfilePageController');


router.get('/:uid', studentController.getStudentProfile);
router.put('/:uid', studentController.updateStudentProfile);
router.delete('/:uid/bank-details', studentController.deleteBankDetails);
router.delete('/:uid/delete-account', studentController.deleteStudentAccount); 

module.exports = router;