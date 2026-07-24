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

export const fetchLanguageSchema = async () => {
  try {
    const response = await axios.get(`${API_URL}/schema`, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Frontend service layer error:', error);
    throw error.response?.data || new Error('Network execution failure.');
  }
};

export const createLanguageCategory = async (categoryData) => {
  try {
    const response = await axios.post(`${API_URL}/categories`, categoryData, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Frontend service layer error:', error);
    throw error.response?.data || new Error('Network execution failure.');
  }
};

export const createCategoryLevel = async (categoryId, levelData) => {
  try {
    const response = await axios.post(`${API_URL}/categories/${categoryId}/levels`, levelData, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Frontend service layer error:', error);
    throw error.response?.data || new Error('Network execution failure.');
  }
};

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
 * Fetch active languages for registration (public endpoint – no auth required)
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