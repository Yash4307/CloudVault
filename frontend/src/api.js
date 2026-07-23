import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============ Auth API ============
export const registerUser = (data) => API.post('/register', data);
export const loginUser = (data) => API.post('/login', data);

// ============ User API ============
export const getProfile = () => API.get('/profile');
export const deleteAccount = (data) => API.delete('/profile/delete-account', { data });

// ============ File API ============
export const uploadFile = (formData, folderId) =>
  API.post('/files/upload', formData, {
    params: folderId ? { folder_id: folderId } : undefined,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getFiles = (params) => API.get('/files', { params });
export const getFile = (fileId) => API.get(`/files/${fileId}`);
export const downloadFile = (fileId) => API.get(`/files/${fileId}/download`, { responseType: 'blob' });
export const renameFile = (fileId, data) => API.put(`/files/${fileId}/rename`, data);
export const deleteFile = (fileId) => API.delete(`/files/${fileId}`);
export const createShareLink = (fileId) => API.post(`/files/${fileId}/share`);
export const getSharedFile = (token) => API.get(`/share/${token}`);
export const downloadSharedFile = (token) => API.get(`/share/${token}/download`, { responseType: 'blob' });

// ============ Folder API ============
export const createFolder = (data) => API.post('/folders', data);
export const getFolders = (params) => API.get('/folders', { params });
export const renameFolder = (folderId, data) => API.put(`/folders/${folderId}/rename`, data);
export const deleteFolder = (folderId) => API.delete(`/folders/${folderId}`);

// ============ Dashboard API ============
export const getDashboard = () => API.get('/dashboard');

// ============ File Deletion ============
export const getTrashFiles = () => API.get('/files/trash');
export const restoreFile = (fileId) => API.post(`/files/${fileId}/restore`);
export const permanentDeleteFile = (fileId) => API.delete(`/files/${fileId}/permanent`);
export const changePassword = (data) => API.put('/profile/change-password', data);

export default API;
