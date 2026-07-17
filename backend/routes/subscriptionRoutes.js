const express = require('express');
const router = express.Router();
const subController = require('../controllers/subscriptionController');

// Plans Endpoints
router.get('/plans', subController.getPlans);
router.post('/plans', subController.createPlan);
router.put('/plans/:id', subController.updatePlan);
router.delete('/plans/:id', subController.deletePlan);

// Exam Categories Endpoints
router.get('/categories', subController.getCategories); // මින් ඉදිරියට කෙලින්ම අපේ දත්ත එනවා
router.post('/categories', subController.createCategory);
router.put('/categories/:id', subController.updateCategory);
router.delete('/categories/:id', subController.deleteCategory);

// Exams Endpoints
router.get('/exams', subController.getExams);

// Credit Fixer Endpoint
router.put('/categories/credits/:id', subController.updateCategoryCredits);

module.exports = router;