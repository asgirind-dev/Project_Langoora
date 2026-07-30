// frontend/src/services/languageService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/languages';

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// ================================================================
// ✅ NEW: Fetch ALL language schema (including archived)
// ================================================================
/**
 * ✅ Fetch ALL exam categories including archived
 * GET /api/languages/schema/all
 * Used by LanguageConfigPage to show all categories
 */
export const fetchAllLanguageSchema = async () => {
  try {
    const response = await axios.get(`${API_URL}/schema/all`, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Fetch all language schema error:', error);
    throw error.response?.data || new Error('Failed to fetch all language schema.');
  }
};

// ================================================================
// ✅ EXISTING FUNCTIONS
// ================================================================

/**
 * 📚 Fetch full language cluster schema (all categories with levels)
 * GET /api/languages/schema
 */
export const fetchLanguageSchema = async () => {
  try {
    const response = await axios.get(`${API_URL}/schema`, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Frontend service layer error:', error);
    throw error.response?.data || new Error('Network execution failure.');
  }
};

/**
 * 📚 Create new language category
 * POST /api/languages/categories
 */
export const createLanguageCategory = async (categoryData) => {
  try {
    const response = await axios.post(`${API_URL}/categories`, categoryData, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Frontend service layer error:', error);
    throw error.response?.data || new Error('Network execution failure.');
  }
};

/**
 * 📚 Create new level inside a category
 * POST /api/languages/categories/:categoryId/levels
 */
export const createCategoryLevel = async (categoryId, levelData) => {
  try {
    const response = await axios.post(
      `${API_URL}/categories/${categoryId}/levels`, 
      levelData, 
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Frontend service layer error:', error);
    throw error.response?.data || new Error('Network execution failure.');
  }
};

/**
 * 📚 Update category status
 * PUT /api/languages/categories/:categoryId
 */
export const updateCategoryStatus = async (categoryId, newStatus) => {
  try {
    const response = await axios.put(
      `${API_URL}/categories/${categoryId}`,
      { status: newStatus },
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Update category status error:', error);
    throw error.response?.data || new Error('Failed to update category status.');
  }
};

/**
 * 📚 Delete/Archive category
 * DELETE /api/languages/categories/:categoryId
 */
export const deleteCategory = async (categoryId) => {
  try {
    const response = await axios.delete(
      `${API_URL}/categories/${categoryId}`,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Delete category error:', error);
    throw error.response?.data || new Error('Failed to archive category.');
  }
};

/**
 * 🌐 Fetch active languages for registration (public endpoint – no auth required)
 * GET /api/languages/active-languages
 */
export const fetchActiveLanguages = async () => {
  try {
    const response = await axios.get(`${API_URL}/active-languages`);
    return response.data;
  } catch (error) {
    console.error('Fetch active languages error:', error);
    throw error.response?.data || new Error('Failed to fetch active languages.');
  }
};

/**
 * 🌐 Fetch active unnested schema categories with priced level layers
 * GET /api/languages/active-schema
 */
export const fetchActiveExamSchema = async () => {
  try {
    const response = await axios.get(`${API_URL}/active-schema`, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Fetch active schema error:', error);
    throw error.response?.data || new Error('Failed to fetch system active schema matrix.');
  }
};

/**
 * ✅ NEW: Update level with scoring configuration
 * PUT /api/languages/categories/:categoryId/levels/:levelId
 */
export const updateLevelScoring = async (categoryId, levelId, scoringData) => {
  try {
    const response = await axios.put(
      `${API_URL}/categories/${categoryId}/levels/${levelId}`,
      scoringData,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Update level scoring error:', error);
    throw error.response?.data || new Error('Failed to update level scoring configuration.');
  }
};

// ================================================================
// ✅ NEW FUNCTIONS
// ================================================================

/**
 * ✅ Get category by ID
 * GET /api/languages/categories/:categoryId
 */
export const fetchCategoryById = async (categoryId) => {
  try {
    const response = await axios.get(`${API_URL}/categories/${categoryId}`, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Failed to fetch category:', error);
    throw error.response?.data || new Error('Failed to fetch category.');
  }
};

/**
 * ✅ Update category
 * PUT /api/languages/categories/:categoryId (full update)
 */
export const updateCategory = async (categoryId, categoryData) => {
  try {
    const response = await axios.put(
      `${API_URL}/categories/${categoryId}`,
      categoryData,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to update category:', error);
    throw error.response?.data || new Error('Failed to update category.');
  }
};

/**
 * ✅ Update level
 * PUT /api/languages/categories/:categoryId/levels/:levelId
 */
export const updateLevel = async (categoryId, levelId, levelData) => {
  try {
    const response = await axios.put(
      `${API_URL}/categories/${categoryId}/levels/${levelId}`,
      levelData,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to update level:', error);
    throw error.response?.data || new Error('Failed to update level.');
  }
};

/**
 * ✅ Restore category from archived
 * PUT /api/languages/categories/:categoryId/restore
 */
export const restoreCategory = async (categoryId) => {
  try {
    const response = await axios.put(
      `${API_URL}/categories/${categoryId}/restore`,
      {},
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to restore category:', error);
    throw error.response?.data || new Error('Failed to restore category.');
  }
};

/**
 * ✅ Get archived categories
 * GET /api/languages/archived
 */
export const fetchArchivedCategories = async () => {
  try {
    const response = await axios.get(`${API_URL}/archived`, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Failed to fetch archived categories:', error);
    throw error.response?.data || new Error('Failed to fetch archived categories.');
  }
};

/**
 * ✅ Hard delete category (permanent)
 * DELETE /api/languages/categories/:categoryId/hard
 */
export const hardDeleteCategory = async (categoryId) => {
  try {
    const response = await axios.delete(
      `${API_URL}/categories/${categoryId}/hard`,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Failed to hard delete category:', error);
    throw error.response?.data || new Error('Failed to permanently delete category.');
  }
};

// ================================================================
// ✅ DEFAULT EXPORT
// ================================================================
export default {
  fetchAllLanguageSchema,
  fetchLanguageSchema,
  fetchActiveExamSchema,
  fetchActiveLanguages,
  fetchCategoryById,
  fetchArchivedCategories,
  createLanguageCategory,
  createCategoryLevel,
  updateCategory,
  updateCategoryStatus,
  updateLevel,
  updateLevelScoring,
  deleteCategory,
  restoreCategory,
  hardDeleteCategory,
};