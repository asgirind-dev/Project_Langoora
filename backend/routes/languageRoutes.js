const express = require('express');
const router = express.Router();
const {
  addCategory,
  addLevelToCategory,
  getLanguageClusterSchema,
  getActiveSchemaForSystem,
  updateCategoryStatus,
  deleteCategory,
  getActiveLanguages           // ✅ Newly added import
} = require('../controllers/languageController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// 🌐 0. Public endpoint – no authentication required
// Used by the registration page to populate the language dropdown for tutors
router.get('/active-languages', getActiveLanguages);

// 🔒 Authentication Perimeter Layer (All system users must be logged in)
router.use(protect);

// 🌐 1. Semi-Public / Multi-Role Shared Endpoints
// (Tutors, Finance Admins, and Students can access this priced matrix)
router.get('/active-schema', getActiveSchemaForSystem);

// ⛔ 2. Absolute Perimeter Isolation for System Administration Control Blocks
// (Only Academic System Admins can bypass this gatekeeper layer)
// ✅ FIX: Allow both 'admin' and 'super_admin' roles
router.use(authorizeRoles('admin', 'super_admin'));

// Admin-only endpoints
router.get('/schema', getLanguageClusterSchema);
router.post('/categories', addCategory);
router.post('/categories/:categoryId/levels', addLevelToCategory);
router.put('/categories/:categoryId', updateCategoryStatus);
router.delete('/categories/:categoryId', deleteCategory);

module.exports = router;