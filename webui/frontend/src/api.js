import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (email, password) => api.post('/login', { email, password });
export const logout = () => api.post('/logout');
export const getInstances = () => api.get('/instances');
export const createInstance = (data) => api.post('/instances', data);
export const updateInstance = (id, data) => api.put(`/instances/${id}`, data);
export const deleteInstance = (id) => api.delete(`/instances/${id}`);
export const startInstance = (id, script) => api.post(`/instances/${id}/start`, { script });
export const stopInstance = (id) => api.post(`/instances/${id}/stop`);
export const getInstanceFiles = (id) => api.get(`/instances/${id}/files`);
export const getFileContent = (id, filename) => api.get(`/instances/${id}/files/${filename}`);
export const saveFileContent = (id, filename, content) => api.post(`/instances/${id}/files/${filename}`, { content });

// Admin APIs
export const getAdminUsers = () => api.get('/admin/users');
export const updateAdminUser = (userData) => api.post('/admin/users', userData);
export const deleteAdminUser = (email) => api.delete(`/admin/users/${email}`);

export const getEnvConfig = () => api.get('/config/env');
export const updateEnvConfig = (config) => api.post('/config/env', config);

export const getInstanceEnv = (id) => api.get(`/instances/${id}/env`);
export const updateInstanceEnv = (id, env) => api.post(`/instances/${id}/env`, { envOverrides: env });

export default api;
