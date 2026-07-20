const express = require('express');
const router = express.Router();
const subController = require('../controllers/subscriptionController');

// Plans
router.get('/plans', subController.getPlans);
router.post('/plans', subController.createPlan);
router.put('/plans/:id', subController.updatePlan);
router.delete('/plans/:id', subController.deletePlan);

// Categories
router.get('/categories', subController.getCategories);
router.post('/categories', subController.createCategory);
router.put('/categories/:id', subController.updateCategory);
router.delete('/categories/:id', subController.deleteCategory);

// Level Credits
router.put('/categories/:categoryId/levels/:levelId/credits', subController.updateLevelCredits);

// Category Credits (levels නැති ඒවාට)
router.put('/categories/:id/credits', subController.updateCategoryCredits);

// Exams
router.get('/exams', subController.getExams);

// Credit History
router.get('/credit-history', subController.getCreditHistory);

// Clear Credit History
router.delete('/credit-history', subController.clearCreditHistory);

module.exports = router;