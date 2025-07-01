import axios from 'axios';

// Create axios instance with base configuration
const API = axios.create({
  baseURL: 'http://localhost:5000', // Corrected base URL to match Flask backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// User-related API endpoints
const users = {
  login: (credentials) => API.post('/login', credentials),
  verifyToken: () => API.get('/verify'),
};

// Admin user management endpoints
const admin = {
  getUsers: () => API.get('/admin/users'),
  createUser: (userData) => API.post('/admin/users', userData),
  updateUser: (userId, userData) => API.put(`/admin/users/${userId}`, userData),
  deleteUser: (userId) => API.delete(`/admin/users/${userId}`),
};

// Company management endpoints
const companies = {
  getAll: () => API.get('/companies'),
  create: (companyData) => API.post('/companies', companyData),
};

// Document management endpoints
const documents = {
  getByCompany: (companyId, documentType = null) => {
    const params = documentType ? `?company_id=${companyId}&document_type=${documentType}` : `?company_id=${companyId}`;
    return API.get(`/documents${params}`);
  },
  create: (documentData) => API.post('/documents', documentData),
  getHistory: (documentId) => API.get(`/documents/${documentId}/history`),
  update: (documentId, documentData) => API.put(`/documents/${documentId}`, documentData),
  delete: (documentId) => API.delete(`/documents/${documentId}`),
};

// Folder management endpoints
const folders = {
  getByCompany: (companyId, parentId = null) => {
    const params = parentId ? `?company_id=${companyId}&parent_id=${parentId}` : `?company_id=${companyId}`;
    return API.get(`/folders${params}`);
  },
  create: (folderData) => API.post('/folders', folderData),
  update: (folderId, folderData) => API.put(`/folders/${folderId}`, folderData),
  delete: (folderId) => API.delete(`/folders/${folderId}`),
};

// Export the API instance and endpoint groups
export default {
  ...API,
  users,
  admin,
  companies,
  documents,
  folders,
};

