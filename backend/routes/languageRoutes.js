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
  getCategoryById,
  // ✅ NEW: Archived category functions
  getArchivedCategories,
  restoreCategory,
  getAllCategoriesIncludingArchived,
  hardDeleteCategoryPermanent
} = require('../controllers/languageController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// =========================================================================
// 🌐 0. Public endpoint – no authentication required
// =========================================================================
router.get('/active-languages', getActiveLanguages);

// =========================================================================
// 🔒 Authentication Perimeter Layer
// =========================================================================
router.use(protect);

// =========================================================================
// 🌐 1. Semi-Public / Multi-Role Shared Endpoints
// =========================================================================
router.get('/active-schema', getActiveSchemaForSystem);

// =========================================================================
// ⛔ 2. Admin Only endpoints
// =========================================================================
router.use(authorizeRoles('admin', 'super_admin'));

// =========================================================================
// 📚 Category Endpoints - Admin Only
// =========================================================================

// ✅ Get ALL categories including archived (for sync)
router.get('/schema/all', getAllCategoriesIncludingArchived);

// Get full language cluster schema (original - all categories)
router.get('/schema', getLanguageClusterSchema);

// Get archived categories only
router.get('/archived', getArchivedCategories);

// Get single category by ID
router.get('/categories/:categoryId', getCategoryById);

// Create new category
router.post('/categories', addCategory);

// Update category
router.put('/categories/:categoryId', updateCategory);

// Update category status (active/inactive/archived)
router.put('/categories/:categoryId/status', updateCategoryStatus);

// Archive category (soft delete)
router.delete('/categories/:categoryId', deleteCategory);

// ✅ NEW: Restore category from archived
router.put('/categories/:categoryId/restore', restoreCategory);

// ✅ NEW: Permanently delete category (hard delete)
router.delete('/categories/:categoryId/hard', hardDeleteCategoryPermanent);

// =========================================================================
// 📚 Level Endpoints - Admin Only
// =========================================================================

// Add level to category
router.post('/categories/:categoryId/levels', addLevelToCategory);

// Update level
router.put('/categories/:categoryId/levels/:levelId', updateLevel);

// Get level by ID
router.get('/categories/:categoryId/levels/:levelId', getLevelById);

module.exports = router;