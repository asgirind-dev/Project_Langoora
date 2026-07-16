import axios from 'axios';

const API_URL = 'http://localhost:5000/api/exams';

/**
 * 🔐 Helper: Build perfect config context mapping with explicit bearer token
 */
const getAuthConfig = () => {
  const token = localStorage.getItem('token'); 
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

/**
 * 🔗 1. Fetch Admin approved language categories and unnested priced levels
 */
export const fetchActiveExamSchema = async () => {
  try {
    // Pass the config object as the second parameter directly
    const response = await axios.get('http://localhost:5000/api/languages/active-schema', getAuthConfig());
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to mirror target registry matrix.' };
  }
};

/**
 * 💾 2. Commit fully structured tutor mock papers into the core collection
 */
export const createTutorExam = async (examPayload) => {
  try {
    // For POST requests, config goes as the third parameter
    const response = await axios.post(`${API_URL}/create`, examPayload, getAuthConfig());
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to commit exam blueprint layer.' };
  }
};