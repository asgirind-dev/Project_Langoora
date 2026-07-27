// frontend/src/services/userService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// ✅ Create axios instance with interceptors
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ Request interceptor - Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response interceptor - Handle 401/403 errors (BUT DON'T AUTO-REDIRECT)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ✅ Only redirect on 401 (Unauthorized - token expired)
    // ❌ Don't redirect on 403 (Forbidden - user just doesn't have permission)
    if (error.response?.status === 401) {
      console.error('🔴 Session expired - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      window.location.href = '/auth/login';
    }
    
    // ✅ For 403, just log and let the component handle it
    if (error.response?.status === 403) {
      console.error('🔴 Forbidden:', error.response?.data?.message);
      // Don't redirect - let the component show the error
    }
    
    return Promise.reject(error);
  }
);

// ✅ Helper: get auth config (still needed for backward compatibility)
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// ======================================================================
// USER MANAGEMENT
// ======================================================================

export const fetchUsers = async () => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
};

export const toggleUserLifecycle = async (uid, currentStatus, email) => {
  try {
    const response = await api.put(`/users/${uid}/lifecycle`, {
      currentStatus,
      email
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error toggling user lifecycle:', error);
    throw error;
  }
};

export const softDeleteUser = async (uid, currentStatus, email) => {
  try {
    const response = await api.put(`/users/${uid}/lifecycle`, {
      currentStatus: 'active',
      forcedTargetStatus: 'deleted',
      email
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error soft deleting user:', error);
    throw error;
  }
};

export const saveUserPrivileges = async (userId, payload) => {
  try {
    const response = await api.put(`/users/${userId}/privileges`, payload);
    return response.data;
  } catch (error) {
    console.error('❌ Error saving user privileges:', error);
    throw error;
  }
};

export const provisionUser = async (userData) => {
  try {
    const response = await api.post('/users/provision', userData);
    return response.data;
  } catch (error) {
    console.error('❌ Error provisioning user:', error);
    throw error;
  }
};

// ======================================================================
// ROLE MANAGEMENT
// ======================================================================

export const fetchRoles = async () => {
  try {
    const response = await api.get('/users/roles');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching roles:', error);
    throw error;
  }
};

export const createRole = async (roleData) => {
  try {
    const response = await api.post('/users/roles', roleData);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating role:', error);
    throw error;
  }
};

export const updateRole = async (roleId, roleData) => {
  try {
    const response = await api.put(`/users/roles/${roleId}`, roleData);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating role:', error);
    throw error;
  }
};

export const deleteRole = async (roleId) => {
  try {
    const response = await api.delete(`/users/roles/${roleId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting role:', error);
    throw error;
  }
};