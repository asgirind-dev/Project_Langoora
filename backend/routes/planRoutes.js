// backend/routes/planRoutes.js
const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');

// Public routes
router.get('/', planController.getPlans);
router.get('/status/:status', planController.getPlansByStatus);

// Protected routes (add auth middleware later)
router.post('/', planController.createPlan);
router.put('/:id', planController.updatePlan);
router.delete('/:id', planController.deletePlan);
router.post('/:id/approve', planController.approvePlan);
router.post('/:id/reject', planController.rejectPlan);

module.exports = router;