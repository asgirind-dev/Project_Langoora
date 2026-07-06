import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Helper: inject auth token into headers
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

export const fetchUsers = async () => {
  const response = await axios.get(`${API_URL}/users`, getAuthConfig());
  return response.data;
};

export const toggleUserLifecycle = async (uid, currentStatus, email) => {
  const response = await axios.put(
    `${API_URL}/users/${uid}/lifecycle`,
    { currentStatus, email },
    getAuthConfig()
  );
  return response.data;
};

export const softDeleteUser = async (uid, currentStatus, email) => {
  const response = await axios.put(
    `${API_URL}/users/${uid}/lifecycle`,
    { currentStatus: 'active', forcedTargetStatus: 'deleted', email },
    getAuthConfig()
  );
  return response.data;
};

export const saveUserPrivileges = async (userId, payload) => {
  const response = await axios.put(
    `${API_URL}/users/${userId}/privileges`,
    payload,
    getAuthConfig()
  );
  return response.data;
};

export const provisionUser = async (userData) => {
  const response = await axios.post(
    `${API_URL}/users/provision`,
    userData,
    getAuthConfig()
  );
  return response.data;
};

// ======================================================================
//  ROLE MANAGEMENT – Corrected endpoints (/users/roles)
// ======================================================================

export const fetchRoles = async () => {
  const response = await axios.get(`${API_URL}/users/roles`, getAuthConfig());
  return response.data;
};

export const createRole = async (roleData) => {
  const response = await axios.post(`${API_URL}/users/roles`, roleData, getAuthConfig());
  return response.data;
};

export const updateRole = async (roleId, roleData) => {
  const response = await axios.put(`${API_URL}/users/roles/${roleId}`, roleData, getAuthConfig());
  return response.data;
};

export const deleteRole = async (roleId) => {
  const response = await axios.delete(`${API_URL}/users/roles/${roleId}`, getAuthConfig());
  return response.data;
};