const express = require('express');
const router = express.Router();
const {
  addCategory,
  updateCategory,
  addLevelToCategory,
  getLanguageClusterSchema,
  getActiveSchemaForSystem,
  updateCategoryStatus,
  deleteCategory,
  getActiveLanguages,
  updateLevel,
  getLevelById,
  getCategoryById
} = require('../controllers/languageController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// 🌐 0. Public endpoint – no authentication required
router.get('/active-languages', getActiveLanguages);

// 🔒 Authentication Perimeter Layer
router.use(protect);

// 🌐 1. Semi-Public / Multi-Role Shared Endpoints
router.get('/active-schema', getActiveSchemaForSystem);

// ⛔ 2. Admin Only endpoints
router.use(authorizeRoles('admin', 'super_admin'));

// Category endpoints
router.get('/schema', getLanguageClusterSchema);
router.get('/categories/:categoryId', getCategoryById);
router.post('/categories', addCategory);
router.put('/categories/:categoryId', updateCategory);
router.put('/categories/:categoryId/status', updateCategoryStatus);
router.delete('/categories/:categoryId', deleteCategory);

// Level endpoints
router.post('/categories/:categoryId/levels', addLevelToCategory);
router.put('/categories/:categoryId/levels/:levelId', updateLevel);
router.get('/categories/:categoryId/levels/:levelId', getLevelById);

module.exports = router;