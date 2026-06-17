const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// ALL user management routes are strictly isolated to authenticated ADMINS only
router.use(protect);
router.use(authorizeRoles('admin'));

// Directory fetch path
router.get('/', userController.getAllUsers);

// Staff generation endpoint
router.post('/provision', userController.provisionStaffNode);

// Profile runtime configuration updates
router.put('/:uid/privileges', userController.updatePrivileges);

// Account suspension/revocation mapping
router.put('/:uid/lifecycle', userController.toggleUserLifecycle);

module.exports = router;