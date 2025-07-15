import axios from 'axios';

// Create axios instance with base configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
API.interceptors.request.use(
  (config) => {
    try {
      // Clone the config to avoid unintended mutations
      const modifiedConfig = { ...config };
      
      modifiedConfig.headers = {
        ...modifiedConfig.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      };
      const token = localStorage.getItem('token');
      if (token) {
        modifiedConfig.headers.Authorization = `Bearer ${token.trim()}`;
      }
      modifiedConfig.metadata = { 
        ...modifiedConfig.metadata,
        requestTime: new Date().toISOString() 
      };
      modifiedConfig.headers = modifiedConfig.headers || {};

      return modifiedConfig;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return Promise.reject(new Error('Failed to process request configuration'));
    }
  },
  (error) => {
    console.error('Request interceptor rejection:', error);
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

// User-related API endpoints and loaders
const users = {
  login: (credentials) => API.post('/login', credentials),
  verifyToken: () => API.get('/verify'),
  
  // Loaders
  loader: {
    verifyToken: async () => {
      try {
        const response = await API.get('/verify');
        return response.data;
      } catch (error) {
        if (error.response?.status === 401) {
          throw new Response('Unauthorized', { status: 401 });
        }
        throw new Response('Failed to verify token', { status: 500 });
      }
    }
  }
};

// Admin user management endpoints and loaders
const admin = {
  getUsers: () => API.get('/admin/users'),
  createUser: (userData) => API.post('/admin/users', userData),
  updateUser: (userId, userData) => API.put(`/admin/users/${userId}`, userData),
  deleteUser: (userId) => API.delete(`/admin/users/${userId}`),
  getActivityLogs: () => API.get('/admin/activity_logs'),
  
  // Loaders
  loader: {
    getUsers: async () => {
      try {
        const response = await API.get('/admin/users');
        return response.data;
      } catch (error) {
        throw new Response('Failed to load users', { status: error.response?.status || 500 });
      }
    },
    getActivityLogs: async () => {
      try {
        const response = await API.get('/admin/activity_logs');
        return response.data;
      } catch (error) {
        throw new Response('Failed to load activity logs', { status: error.response?.status || 500 });
      }
    }
  }
};

// Company management endpoints and loaders
const companies = {
  getAll: () => API.get('/companies'),
  create: (companyData) => API.post('/companies', companyData),
  delete: (company_id) => API.delete(`/companies/${company_id}`),
  getByUser: (user_id) => API.get(`/companies/${user_id}`),
  update: (company_id, companyData) => API.put(`/companies/${company_id}`, companyData),
  
  // Loaders
  loader: {
    getAll: async () => {
      try {
        const response = await API.get('/companies');
        return response.data;
      } catch (error) {
        throw new Response('Failed to load companies', { status: error.response?.status || 500 });
      }
    },
    getByUser: async ({ params }) => {
      try {
        const response = await API.get(`/companies/${params.user_id}`);
        return response.data;
      } catch (error) {
        throw new Response('Failed to load user companies', { status: error.response?.status || 500 });
      }
    }
  }
};

// Document type management endpoints and loaders
const doctype = {
  create: (doctypeData) => API.post('/doctype', doctypeData),
  getAll: () => API.get('/doctype'),
  getCompanies: (doctypeId) => API.get(`/doctype/${doctypeId}/companies`),
  update: (id, doctypeData) => API.put(`/doctype/${id}`, doctypeData),
  delete: (id) => API.delete(`/doctype/${id}`),
  getByCompany: (companyId) => API.get(`/doctype/company/${companyId}`),
  
  // Loaders
  loader: {
    getAll: async () => {
      try {
        const response = await API.get('/doctype');
        return response.data;
      } catch (error) {
        throw new Response('Failed to load document types', { status: error.response?.status || 500 });
      }
    },
    getByCompany: async ({ params }) => {
      try {
        const response = await API.get(`/doctype/company/${params.companyId}`);
        return response.data;
      } catch (error) {
        throw new Response('Failed to load company document types', { status: error.response?.status || 500 });
      }
    }
  }
};

// Partner management endpoints and loaders
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
  },
  
  // Loaders
  loader: {
    getAll: async () => {
      try {
        const response = await API.get('/partners');
        return response.data;
      } catch (error) {
        throw new Response('Failed to load partners', { status: error.response?.status || 500 });
      }
    },
    getByCompany: async ({ params }) => {
      try {
        const response = await API.get(`/partners/company/${params.companyId}`);
        return response.data;
      } catch (error) {
        throw new Response('Failed to load company partners', { status: error.response?.status || 500 });
      }
    },
    getById: async ({ params }) => {
      try {
        const response = await API.get(`/partners/${params.partnerId}`);
        return response.data;
      } catch (error) {
        throw new Response('Failed to load partner details', { status: error.response?.status || 500 });
      }
    }
  }
};

// Partner type management endpoints and loaders
const partnertype = {
  getAll: () => API.get('/partnertype'),
  create: (partnerTypeData) => API.post('/partnertype', partnerTypeData),
  update: (partnerTypeId, partnerTypeData) => API.put(`/partnertype/${partnerTypeId}`, partnerTypeData),
  updateStatus: (partnerTypeId, status) => API.put(`/partnertype/${partnerTypeId}/status`, { status }),
  delete: (partnerTypeId) => API.delete(`/partnertype/${partnerTypeId}`),
  
  // Loaders
  loader: {
    getAll: async () => {
      try {
        const response = await API.get('/partnertype');
        return response.data;
      } catch (error) {
        throw new Response('Failed to load partner types', { status: error.response?.status || 500 });
      }
    }
  }
};

// Document management endpoints and loaders
const documents = {
  getByCompany: (companyId, documentType = null) => {
    const params = documentType ? `?company_id=${companyId}&document_type=${documentType}` : `?company_id=${companyId}`;
    return API.get(`/documents${params}`);
  },
  create: (documentData) => API.post('/documents', documentData),
  getHistory: (documentId) => API.get(`/documents/${documentId}/history`),
  update: (documentId, documentData) => API.put(`/documents/${documentId}`, documentData),
  delete: (documentId) => API.delete(`/documents/${documentId}`),
  uploadSingleFile: (file, company_id, doctype_id) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append('company_id', company_id);
    formData.append('doctype_id', doctype_id);
    return API.post('/upload_single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  uploadMultipleFiles: (files, company_id, doctype_id) => {
    const formData = new FormData();
    files.forEach((file) => { formData.append("files", file); });
    formData.append('company_id', company_id);
    formData.append('doctype_id', doctype_id);
    return API.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  confirmDocuments: (sessionId, documentsData) => {
    return API.post('/confirm_document', {
      session_id: sessionId,
      documents: documentsData
    });
  },
  uploadFiles: (formData) => API.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  confirmDocument: (documentId, confirmedData) => 
    API.post(`/documents/${documentId}/confirm`, confirmedData),
  getByCompanyAndType: (companyName, doctypeName) => {
    return API.get(`/documents/company/${companyName}/type/${doctypeName}`);
  },
  searchDocuments: (searchTerm, companyName = null, doctypeName = null) => {
    const params = new URLSearchParams();
    params.append('search', searchTerm);
    if (companyName) params.append('company', companyName);
    if (doctypeName) params.append('doctype', doctypeName);
    return API.get(`/documents/search?${params.toString()}`);
  },
  getInvoicesByCompany: (companyName) => {
    return API.get(`/documents/invoices/${companyName}`);
  },
  
  // Loaders
  loader: {
    getByCompany: async ({ params, request }) => {
      const url = new URL(request.url);
      const documentType = url.searchParams.get('document_type');
      try {
        const response = await API.get(
          documentType 
            ? `/documents?company_id=${params.companyId}&document_type=${documentType}`
            : `/documents?company_id=${params.companyId}`
        );
        return response.data;
      } catch (error) {
        throw new Response('Failed to load company documents', { status: error.response?.status || 500 });
      }
    },
    getHistory: async ({ params }) => {
      try {
        const response = await API.get(`/documents/${params.documentId}/history`);
        return response.data;
      } catch (error) {
        throw new Response('Failed to load document history', { status: error.response?.status || 500 });
      }
    },
    getByCompanyAndType: async ({ params }) => {
      try {
        const response = await API.get(`/documents/company/${params.companyName}/type/${params.doctypeName}`);
        return response.data;
      } catch (error) {
        throw new Response('Failed to load documents by company and type', { status: error.response?.status || 500 });
      }
    }
  }
};

// Folder management endpoints and loaders
const folders = {
  getByCompany: (companyId, parentId = null) => {
    const params = parentId ? `?company_id=${companyId}&parent_id=${parentId}` : `?company_id=${companyId}`;
    return API.get(`/folders${params}`);
  },
  create: (folderData) => API.post('/folders', folderData),
  update: (folderId, folderData) => API.put(`/folders/${folderId}`, folderData),
  delete: (folderId) => API.delete(`/folders/${folderId}`),
  getAll: () => API.get('/folders'),
  
  // Loaders
  loader: {
    getByCompany: async ({ params, request }) => {
      const url = new URL(request.url);
      const parentId = url.searchParams.get('parent_id');
      try {
        const response = await API.get(
          parentId 
            ? `/folders?company_id=${params.companyId}&parent_id=${parentId}`
            : `/folders?company_id=${params.companyId}`
        );
        return response.data;
      } catch (error) {
        throw new Response('Failed to load company folders', { status: error.response?.status || 500 });
      }
    },
    getAll: async () => {
      try {
        const response = await API.get('/folders');
        return response.data;
      } catch (error) {
        throw new Response('Failed to load folders', { status: error.response?.status || 500 });
      }
    }
  }
};

// OCR and processing utilities endpoints and loaders
const ocr = {
  getProcessingStatus: (sessionId) => {
    return API.get(`/ocr/status/${sessionId}`);
  },
  reprocessDocument: (documentId) => {
    return API.post(`/ocr/reprocess/${documentId}`);
  },
  
  // Loaders
  loader: {
    getProcessingStatus: async ({ params }) => {
      try {
        const response = await API.get(`/ocr/status/${params.sessionId}`);
        return response.data;
      } catch (error) {
        throw new Response('Failed to load OCR status', { status: error.response?.status || 500 });
      }
    }
  }
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
  ocr
};