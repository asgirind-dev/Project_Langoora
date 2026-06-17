const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/', subscriptionController.getPlans);
router.post('/', authenticate, isAdmin, subscriptionController.createPlan);
router.put('/:id', authenticate, isAdmin, subscriptionController.updatePlan);
router.delete('/:id', authenticate, isAdmin, subscriptionController.deletePlan);
router.patch('/:id/toggle', authenticate, isAdmin, subscriptionController.togglePlanStatus);

module.exports = router;