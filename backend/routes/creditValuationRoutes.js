const express = require('express');
const router = express.Router();
const creditController = require('../controllers/creditValuationController');

router.get('/categories', creditController.getCategories);
router.put('/categories/:categoryId/levels/:levelId/credits', creditController.updateLevelCredits);
router.put('/categories/:id/credits', creditController.updateCategoryCredits);
router.get('/history', creditController.getCreditHistory);
router.delete('/history', creditController.clearCreditHistory);

module.exports = router;