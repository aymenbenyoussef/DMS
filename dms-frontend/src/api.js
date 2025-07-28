import axios from 'axios';

// Create axios instance with base configuration
const API_BASE_URL = 'http://192.168.1.115:5000';

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
API.interceptors.request.use(
  (config) => {
    if (config.method === 'get') {
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      config.headers['Pragma'] = 'no-cache';
      config.headers['Expires'] = '0';
    }
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
  forgotPassword: (email) => API.post('/forgot-password', { email }),
  changePassword: (newPassword) => API.post('/change-password', { newPassword }),
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
  getByDatatype: (datatypeId) => API.get(`/companies/by_datatype/${datatypeId}`),
};

// Document type management
const doctype = {
    create :(doctypeData) => API.post('/doctype',doctypeData),
    getAll: () => API.get('/doctype'),
    getCompanies: (doctypeId) => API.get(`/doctype/${doctypeId}/companies`),
    update: (id, doctypeData) => API.put(`/doctype/${id}`, doctypeData),
    delete: (id) => API.delete(`/doctype/${id}`),
    getByCompany: (companyId) => API.get(`/doctype/company/${companyId}`),
}
const partner = {
  getAll: () => API.get('/partners'),
  getByCompany: (companyId) => API.get(`/partners/company/${companyId}`),
  getById: (partnerId) => API.get(`/partners/${partnerId}`),
  create: (partnerData) => API.post('/partners', partnerData),
  update: (partnerId, partnerData) => API.put(`/partners/${partnerId}`, partnerData),
  updateStatus: (partnerId, status) => API.put(`/partners/${partnerId}/status`, { status }),
  delete: (partnerId) => API.delete(`/partners/${partnerId}`),
  search: (searchTerm, companyId = null) => {
    const params = new URLSearchParams();
    params.append('search', searchTerm);
    if (companyId) params.append('company_id', companyId);
    return API.get(`/partners/search?${params.toString()}`);
  }
};
const partnertype ={
  getAll : () => API.get('/partnertype'),
  create: (partnerTypeData) => API.post('/partnertype', partnerTypeData),
  update: (partnerTypeId, partnerTypeData) => API.put(`/partnertype/${partnerTypeId}`, partnerTypeData),
  updateStatus: (partnerTypeId, status) => API.put(`/partnertype/${partnerTypeId}/status`, { status }),
  delete: (partnerTypeId) => API.delete(`/partnertype/${partnerTypeId}`)
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
  
  // NEW: Single file upload function with OCR processing
  uploadSingleFile: (file, company_id, doctype_id) => {
    const formData = new FormData();
    
    // Add the single file to FormData
    formData.append("file", file);
    
    // Add company and doctype information using IDs
    formData.append('company_id', company_id);
    formData.append('doctype_id', doctype_id);
    
    return API.post('/upload_single', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        // Remove Content-Type to let browser set boundary
      },
      timeout: 60000, // 60 seconds timeout for large files
    });
  },
  
  // NEW: Temporary file upload function (no company/doctype required)
  uploadTempFile: (file) => {
    const formData = new FormData();
    
    // Add the single file to FormData
    formData.append("files", file);
    
    return API.post('/upload_temp', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds timeout for large files
    });
  },
  
  // Enhanced upload function for multiple files with OCR processing
  uploadMultipleFiles: (files, company_id, doctype_id) => {
    const formData = new FormData();
    
    // Add each file to FormData
    files.forEach((file) => {formData.append("files", file);});
    
    // Add company and doctype information using IDs
    formData.append('company_id', company_id);
    formData.append('doctype_id', doctype_id);
    
    return API.post('/upload', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
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
    window.dispatchEvent(new Event('FilesUploaded'));
  },
  
  // Legacy single file upload (keep for backward compatibility)
  uploadFiles: (formData) => API.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  download: (documentId) => {
    return API.get(`/documents/${documentId}/file`, {
      responseType: 'blob'
    });
  },

  getRapport: (documentId) => {
    return API.get(`/documents/${documentId}/rapport`, {
      responseType: 'blob'
    });
  },

  getOcrText: (documentId) => {
    return API.get(`/documents/${documentId}/ocr-text`, {
      responseType: 'blob'
    });
  },
  // Legacy confirm function (keep for backward compatibility)
  confirmDocument: (documentId, confirmedData) => 
    API.post(`/documents/${documentId}/confirm`, confirmedData),
    
  // Get documents by company and document type
  getByCompanyAndType: (company_id, doctype_id) => {
    return API.get(`/documents/company/${company_id}/type/${doctype_id}`);
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
  },

  // Get documents with filters
  getByCompanyFiltered: (companyId, filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.doctypeId) {
      params.append('doctype_id', filters.doctypeId);
    }
    if (filters.startDate) {
      params.append('start_date', filters.startDate);
    }
    if (filters.endDate) {
      params.append('end_date', filters.endDate);
    }
    
    const queryString = params.toString();
    const url = `/documents/company/${companyId}/filtered${queryString ? '?' + queryString : ''}`;
    
    return API.get(url);
  },

  // Get documents from last month
  getLastMonthByCompany: (companyId, doctypeId = null) => {
    const params = new URLSearchParams();
    if (doctypeId) {
      params.append('doctype_id', doctypeId);
    }
    
    const queryString = params.toString();
    const url = `/documents/company/${companyId}/last-month${queryString ? '?' + queryString : ''}`;
    
    return API.get(url);
  },

  // Get all documents for a company
  getAllByCompany: (companyId) => {
    return API.get(`/documents/company/${companyId}/all`);
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

// Group management endpoints
const groups = {
  getAll: () => API.get('/groups'),
  create: (groupData) => API.post('/groups', groupData),
  update: (groupId, groupData) => API.put(`/groups/${groupId}`, groupData),
  delete: (groupId) => API.delete(`/groups/${groupId}`),
  addDocuments: (groupId, documentIds) => API.post(`/groups/${groupId}/documents`, { document_ids: documentIds }),
  removeDocument: (groupId, documentId) => API.delete(`/groups/${groupId}/documents/${documentId}`),
  getDocuments: (groupId) => API.get(`/groups/${groupId}/documents`),
  getByDocument: (documentId) => API.get(`/documents/${documentId}/groups`)
};



// Email management endpoints
const email = {
  getUsersForSelection: (companyId = null) => {
    const params = companyId ? `?company_id=${companyId}` : '';
    return API.get(`/users/email-selection${params}`);
  },
  getDocumentInfo: (documentId) => API.get(`/documents/${documentId}/email-info`),
  sendDocument: (documentId, emailData) => API.post(`/documents/${documentId}/send-email`, emailData),
};

const tempDocuments = {
  upload: (files) => {
    const formData = new FormData();
    files.forEach((file) => {formData.append("files", file);});
    return API.post('/upload_temp', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  getAll: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return API.get(`/temp_documents?${params.toString()}`);
  },
  delete: (id) => API.delete(`/temp_documents/${id}`),
  download: (id) => API.get(`/temp_documents/${id}/file`, { responseType: 'blob' }),
};

// Export the API instance and endpoint groups
export default {
  ...API,
  users,
  admin,
  doctype,
  companies,
  partner,
  partnertype,
  documents,
  folders,
  ocr,
  groups,
  email,
  tempDocuments
};