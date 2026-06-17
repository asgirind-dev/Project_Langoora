const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/TutorProfilePageController');

// Profile routes
router.get('/:uid', tutorController.getTutorProfile);
router.put('/:uid', tutorController.updateTutorProfile); // Profile updates (including profile pic URL)

// Bank cards routes
router.get('/:uid/cards', tutorController.getBankCards);
router.post('/:uid/cards', tutorController.addBankCard);
router.delete('/:uid/cards/:cardId', tutorController.deleteBankCard);

// Delete account route
router.delete('/:uid', tutorController.deleteTutorAccount);

module.exports = router;