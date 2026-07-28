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

// =========================================================================
// 📚 Category APIs
// =========================================================================

/**
 * 📚 Fetch ALL exam categories including archived (for sync)
 * ✅ NEW: Gets all categories with status 'active', 'inactive', and 'archived'
 */
export const fetchAllLanguageSchema = async () => {
  try {
    const response = await axios.get(`${API_URL}/schema/all`, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Fetch all schema error:', error);
    throw error.response?.data || new Error('Failed to fetch full language schema.');
  }
};

/**
 * 📚 Fetch exam categories (original - all categories including archived)
 * @deprecated Use fetchAllLanguageSchema for complete data
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
 * 📚 Fetch archived categories only
 * ✅ NEW: Returns all categories with status 'archived'
 */
export const fetchArchivedCategories = async () => {
  try {
    const response = await axios.get(`${API_URL}/archived`, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Fetch archived categories error:', error);
    throw error.response?.data || new Error('Failed to fetch archived categories.');
  }
};

/**
 * 📚 Create new language category
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
 * 📚 Update category
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
    console.error('Update category error:', error);
    throw error.response?.data || new Error('Failed to update category.');
  }
};

/**
 * 📚 Update category status (active/inactive/archived)
 */
export const updateCategoryStatus = async (categoryId, newStatus) => {
  try {
    const response = await axios.put(
      `${API_URL}/categories/${categoryId}/status`,
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
 * 📚 Archive category (soft delete)
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
 * 📚 Restore category from archived
 * ✅ NEW: Restores an archived category to 'inactive' status
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
    console.error('Restore category error:', error);
    throw error.response?.data || new Error('Failed to restore category.');
  }
};

/**
 * 📚 Permanently delete category (hard delete)
 * ✅ NEW: Completely removes category and all its levels from database
 */
export const hardDeleteCategory = async (categoryId) => {
  try {
    const response = await axios.delete(
      `${API_URL}/categories/${categoryId}/hard`,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Hard delete category error:', error);
    throw error.response?.data || new Error('Failed to permanently delete category.');
  }
};

/**
 * 📚 Get single category by ID
 */
export const getCategoryById = async (categoryId) => {
  try {
    const response = await axios.get(
      `${API_URL}/categories/${categoryId}`,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Get category error:', error);
    throw error.response?.data || new Error('Failed to fetch category.');
  }
};

// =========================================================================
// 📚 Level APIs
// =========================================================================

/**
 * 📚 Create level in category
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
 * 📚 Update level
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
    console.error('Update level error:', error);
    throw error.response?.data || new Error('Failed to update level.');
  }
};

/**
 * 📚 Update level with scoring configuration
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

/**
 * 📚 Get level by ID
 */
export const getLevelById = async (categoryId, levelId) => {
  try {
    const response = await axios.get(
      `${API_URL}/categories/${categoryId}/levels/${levelId}`,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Get level error:', error);
    throw error.response?.data || new Error('Failed to fetch level.');
  }
};

/**
 * 📚 Update level status (active/inactive)
 */
export const updateLevelStatus = async (categoryId, levelId, status) => {
  try {
    const response = await axios.put(
      `${API_URL}/categories/${categoryId}/levels/${levelId}/status`,
      { status },
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Update level status error:', error);
    throw error.response?.data || new Error('Failed to update level status.');
  }
};

// =========================================================================
// 📚 Public APIs (No Auth Required)
// =========================================================================

/**
 * 🌐 Fetch active languages for registration (public endpoint – no auth required)
 * Returns an array of unique language names from active exam categories.
 * Used by the tutor registration form to populate the language dropdown.
 */
export const fetchActiveLanguages = async () => {
  try {
    // This endpoint is public, so we don't need auth headers
    const response = await axios.get(`${API_URL}/active-languages`);
    return response.data;
  } catch (error) {
    console.error('Fetch active languages error:', error);
    throw error.response?.data || new Error('Failed to fetch active languages.');
  }
};

/**
 * 🌐 Fetch active unnested schema categories with priced level layers
 * Accessible by Tutors, Finance, and Students
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

// =========================================================================
// 📚 Utility / Helper Functions
// =========================================================================

/**
 * 📊 Get category stats from schema
 */
export const getCategoryStats = (schema) => {
  if (!schema || !Array.isArray(schema)) {
    return { total: 0, active: 0, inactive: 0, archived: 0 };
  }
  
  const stats = {
    total: schema.length,
    active: 0,
    inactive: 0,
    archived: 0,
    other: 0
  };
  
  schema.forEach(cat => {
    const status = cat.status || 'inactive';
    if (status === 'active') stats.active++;
    else if (status === 'inactive') stats.inactive++;
    else if (status === 'archived') stats.archived++;
    else stats.other++;
  });
  
  return stats;
};

/**
 * 📊 Get level stats from schema
 */
export const getLevelStats = (schema) => {
  if (!schema || !Array.isArray(schema)) {
    return { total: 0, active: 0, inactive: 0, pendingCredits: 0, setCredits: 0 };
  }
  
  let total = 0;
  let active = 0;
  let inactive = 0;
  let pendingCredits = 0;
  let setCredits = 0;
  
  schema.forEach(cat => {
    if (cat.levels && Array.isArray(cat.levels)) {
      cat.levels.forEach(level => {
        total++;
        if (level.status === 'active') active++;
        else if (level.status === 'inactive') inactive++;
        
        if (level.isCreditSet && level.credit_cost > 0) {
          setCredits++;
        } else {
          pendingCredits++;
        }
      });
    }
  });
  
  return { total, active, inactive, pendingCredits, setCredits };
};

// =========================================================================
// 📚 Default Export
// =========================================================================

export default {
  // Category APIs
  fetchAllLanguageSchema,
  fetchLanguageSchema,
  fetchArchivedCategories,
  createLanguageCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
  restoreCategory,
  hardDeleteCategory,
  getCategoryById,
  
  // Level APIs
  createCategoryLevel,
  updateLevel,
  updateLevelScoring,
  getLevelById,
  updateLevelStatus,
  
  // Public APIs
  fetchActiveLanguages,
  fetchActiveExamSchema,
  
  // Utilities
  getCategoryStats,
  getLevelStats
};