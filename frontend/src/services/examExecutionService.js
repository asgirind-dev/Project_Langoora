import axios from 'axios';

const studentApi = axios.create({
  baseURL: 'http://localhost:5000/api',   // Backend core node setup entry point
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request context automatically
studentApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default studentApi;