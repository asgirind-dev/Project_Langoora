const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/TutorProfilePageController');


router.delete('/:uid/delete-account', (req, res, next) => {
    tutorController.deleteTutorAccount(req, res, next);
});

// Profile routes
router.get('/:uid', (req, res, next) => tutorController.getTutorProfile(req, res, next));
router.put('/:uid', (req, res, next) => tutorController.updateTutorProfile(req, res, next)); 

// Bank cards routes
router.get('/:uid/cards', (req, res, next) => tutorController.getBankCards(req, res, next));
router.post('/:uid/cards', (req, res, next) => tutorController.addBankCard(req, res, next));
router.delete('/:uid/cards/:cardId', (req, res, next) => tutorController.deleteBankCard(req, res, next));

module.exports = router;