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
  (response) => {
    // Handle success responses
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    console.error('API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    });
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
  getActivityLogs: () => API.get('/admin/activity_logs'), 
};

// Company management endpoints
const companies = {
  getAll: () => API.get('/companies'),
  create: (companyData) => API.post('/companies', companyData),
  delete:(company_id) => API.delete(`/companies/${company_id}`),
  getByUser:(user_id) => API.get(`/companies/${user_id}`),
  update: (company_id, companyData) => API.put(`/companies/${company_id}`, companyData),
};

// Document type management
const doctype = {
    create :(doctypeData) => API.post('/doctype',doctypeData),
    getAll: () => API.get('/doctype'),
    getCompanies: (doctypeId) => API.get(`/doctype/${doctypeId}/companies`),
    update: (id, doctypeData) => API.put(`/doctype/${id}`, doctypeData),
    delete: (id) => API.delete(`/doctype/${id}`),
    getByCompany: (companyId, parentId = null) => {
    const params = parentId ? `?company_id=${companyId}&parent_id=${parentId}` : `?company_id=${companyId}`;
    return API.get(`/doctype${params}`);
  },
}

// Document management endpoints - Enhanced for OCR workflow
const documents = {
  getByCompany: (companyId, documentType = null) => {
    const params = documentType ? `?company_id=${companyId}&document_type=${documentType}` : `?company_id=${companyId}`;
    return API.get(`/documents${params}`);
  },
  create: (documentData) => API.post('/documents', documentData),
  getHistory: (documentId) => API.get(`/documents/${documentId}/history`),
  update: (documentId, documentData) => API.put(`/documents/${documentId}`, documentData),
  delete: (documentId) => API.delete(`/documents/${documentId}`),
  
  // Enhanced upload function for multiple files with OCR processing
  uploadMultipleFiles: (files, company, doctype) => {
    const formData = new FormData();
    
    // Add each file to FormData
    files.forEach((file) => {formData.append("files", file);});
    
    // Add company and doctype information
    formData.append('company', company);
    formData.append('doctype', doctype);
    
    return API.post('/upload', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        // Remove Content-Type to let browser set boundary
      },
      timeout: 60000, // 60 seconds timeout for large files
    });
  },
  
  // Confirm documents after user validation
  confirmDocuments: (sessionId, documentsData) => {
    return API.post('/confirm_document', {
      session_id: sessionId,
      documents: documentsData
    });
  },
  
  // Legacy single file upload (keep for backward compatibility)
  uploadFiles: (formData) => API.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Legacy confirm function (keep for backward compatibility)
  confirmDocument: (documentId, confirmedData) => 
    API.post(`/documents/${documentId}/confirm`, confirmedData),
    
  // Get documents by company and document type
  getByCompanyAndType: (companyName, doctypeName) => {
    return API.get(`/documents/company/${companyName}/type/${doctypeName}`);
  },
  
  // Search documents
  searchDocuments: (searchTerm, companyName = null, doctypeName = null) => {
    const params = new URLSearchParams();
    params.append('search', searchTerm);
    if (companyName) params.append('company', companyName);
    if (doctypeName) params.append('doctype', doctypeName);
    
    return API.get(`/documents/search?${params.toString()}`);
  },
  
  // Get invoices by company
  getInvoicesByCompany: (companyName) => {
    return API.get(`/documents/invoices/${companyName}`);
  }
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
  getAll: () => API.get('/folders'),
};

// OCR and processing utilities
const ocr = {
  // Get processing status for a session
  getProcessingStatus: (sessionId) => {
    return API.get(`/ocr/status/${sessionId}`);
  },
  
  // Reprocess a document with OCR
  reprocessDocument: (documentId) => {
    return API.post(`/ocr/reprocess/${documentId}`);
  }
};

// Export the API instance and endpoint groups
export default {
  ...API,
  users,
  admin,
  doctype,
  companies,
  documents,
  folders,
  ocr,
};

// Export individual modules for easier imports
export { users, admin, doctype, companies, documents, folders, ocr }; 