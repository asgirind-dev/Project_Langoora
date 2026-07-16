// backend/routes/roleRoutes.js
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// All role routes require admin
router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/', roleController.getAllRoles);
router.post('/', roleController.createRole);
router.put('/:id', roleController.updateRole);
router.delete('/:id', roleController.deleteRole);

module.exports = router;