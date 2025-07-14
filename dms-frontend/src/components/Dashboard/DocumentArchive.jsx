import React, { useState, useEffect, useContext } from 'react';
import DragDropUpload from './DragDropUpload';
import API from '../../api';
import { AppContext } from '../context';
import WelcomePanel from './WelcomePanel';
import { useNavigate } from 'react-router-dom';

const DocumentArchive = ({ user, selectedCompany, selectedDoctype }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [folders, setFolders] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const { setSelectedDoctype } = useContext(AppContext);
  const navigate = useNavigate();
  
  // Document type states
  const [documentTypes, setDocumentTypes] = useState([]);
  const [showNewDocTypeForm, setShowNewDocTypeForm] = useState(false);
  const [newDocTypeError, setNewDocTypeError] = useState('');
  const [newDocTypeSuccess, setNewDocTypeSuccess] = useState('');
  const [selectedDocTypes, setSelectedDocTypes] = useState([]);
  const [newDocTypeName, setNewDocTypeName] = useState('');
  const [newDocTypeStatus, setNewDocTypeStatus] = useState(true);
  
  // New state for documents
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setFolderName('');
    setShowNewDocTypeForm(false);
    setSelectedDocTypes([]);
    setNewDocTypeError('');
    setNewDocTypeSuccess('');
    setNewDocTypeName('');
    setNewDocTypeStatus(true);
  };

  const openUploadModal = () => setIsUploadModalOpen(true);
  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadError('');
  };

  // Function to fetch documents from the backend
  const fetchDocuments = async () => {
    if (!selectedCompany || !selectedDoctype) return;
    
    setIsLoading(true);
    try {
      const response = await API.documents.getByCompanyAndType(
        selectedCompany.name,
        selectedDoctype.name
      );
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error loading documents', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFolders = async () => {
    if (!selectedCompany) return;
    
    try {
      const response = await API.folders.getByCompany(selectedCompany.id);
      setFolders(response.data);
    } catch (error) {
      console.error('Error loading folders', error);
    }
  };

  // Fetch document types when modal opens
  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        const response = await API.doctype.getAll();
        setDocumentTypes(response.data);
      } catch (error) {
        console.error('Error loading document types', error);
      }
    };
    
    if (isModalOpen) {
      fetchDocumentTypes();
    }
  }, [isModalOpen]);

  useEffect(() => { 
    if (selectedCompany) {
      fetchFolders();
    }
  }, [selectedCompany]);

  // Fetch documents when company or doctype changes
  useEffect(() => {
    fetchDocuments();
  }, [selectedCompany, selectedDoctype]);

  const createFolder = async () => {
    if (folderName.trim() === '') {
      setError('Folder name is required.');
      return;
    }
 
    if (!selectedCompany) {
      setError('No company selected.');
      return;
    }

    setError('');
    setSuccessMessage('');
    
    try {
      const response = await API.folders.create({
        name: folderName.trim(),
        company_id: selectedCompany.id,
        document_types: selectedDocTypes
      });
      
      setFolders(prev => [...prev, response.data]);
      selectedCompany.folders = [...(selectedCompany.folders || []), response.data];
      
      setSuccessMessage('Folder created successfully!');
      closeModal();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.msg || 'Error creating folder');
    }
  };

  const handleUploadDocuments = async (documents) => {
    try {
      const uploadData = documents.map(doc => ({
        ...doc,
        folder_id: selectedDoctype?.id || null,
        company_id: selectedCompany.id
      }));
      
      await API.documents.create(uploadData);
      alert(`${documents.length} files uploaded successfully!`);
      closeUploadModal();
      fetchDocuments(); // Refresh the documents list
    } catch (error) {
      setUploadError('Upload failed: ' + (error.response?.data?.msg || error.message));
    }
  };

  const getBreadcrumb = () => {
    if (selectedDoctype && selectedCompany) {
      return `${selectedCompany.name} > ${selectedDoctype.name}`;
    }
    if (selectedCompany) {
      return `${selectedCompany.name} >`;
    }
    return 'DMS >';
  };

  const handleDocTypeChange = (typeId) => {
    setSelectedDocTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(id => id !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  const handleCreateDocType = async (e) => {
    e.preventDefault();
    setNewDocTypeError('');
    setNewDocTypeSuccess('');
    
    if (!newDocTypeName.trim()) {
      setNewDocTypeError('Name is required');
      return;
    }
    
    try {
      const response = await API.doctype.create({
        name: newDocTypeName.trim(),
        status: newDocTypeStatus
      });
      
      setDocumentTypes(prev => [...prev, response.data]);
      setSelectedDocTypes(prev => [...prev, response.data.id]);
      
      setNewDocTypeSuccess('Document type created successfully!');
      
      setNewDocTypeName('');
      setNewDocTypeStatus(true);
      
      setTimeout(() => {
        setShowNewDocTypeForm(false);
        setNewDocTypeSuccess('');
      }, 2000);
    } catch (error) {
      setNewDocTypeError(error.response?.data?.msg || 'Failed to create document type');
    }
  };

  // Function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const getFileIconClass = (filename) => {
  const extension = filename.split('.').pop().toLowerCase();
  switch(extension) {
    case 'pdf':
      return 'bi-filetype-pdf text-danger';
    case 'doc':
    case 'docx':
      return 'bi-filetype-docx text-primary';
    case 'xls':
    case 'xlsx':
      return 'bi-filetype-xlsx text-success';
    case 'ppt':
    case 'pptx':
      return 'bi-filetype-pptx text-warning';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'bi-file-image text-info';
    case 'zip':
    case 'rar':
      return 'bi-file-zip text-secondary';
    default:
      return 'bi-file-earmark-text';
  }
};
const handleDownload = async (doc) => {
  try {
    const response = await fetch(doc.path);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    alert('Download failed. Please try again.');
  }
};
  // Function to get file type from filename
  const getFileType = (filename) => {
    const parts = filename.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toUpperCase();
    }
    return 'Unknown';
  };

  if (!selectedCompany && !selectedDoctype) {
    return <WelcomePanel user={user} />;
  }

  return (
    <div className="container-fluid py-4">
      {/* Upload Modal */}
      {isUploadModalOpen && (
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-body">
                <DragDropUpload 
                  onClose={closeUploadModal}
                  onUpload={handleUploadDocuments}
                />
                {uploadError && <p className="text-danger mt-3">{uploadError}</p>}
              </div>
            </div>
          </div>
      )}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <nav className="breadcrumb mb-0">
          <ol className="breadcrumb">
            {getBreadcrumb().split(' > ').map((item, index, arr) => (
              <li 
                key={index} 
                className={`breadcrumb-item ${index === arr.length - 1 ? 'active' : ''}`}
              >
                {item}
              </li>
            ))}
          </ol>
        </nav>
        
        {selectedDoctype && (
          <button 
            className="btn btn-primary d-flex align-items-center ms-auto"
            onClick={openUploadModal}
          >
            <i className="bi bi-plus me-1"></i> Upload File
          </button>
        )}
      </div>
      
      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}
      
      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        {['Total Documents', 'Invoices', 'Processed'].map((title, index) => (
          <div key={index} className="col-md-4">
            <div className="card h-100">
              <div className="card-body">
                <h3 className="card-title fs-6 text-muted">{title}</h3>
                <p className="card-text fs-4 fw-bold">0 Active</p>
              </div>
            </div>
          </div>
        ))}
      </div>
        
      {/* Search Section */}
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Search & Filter</h2>
          <div className="input-group mb-3">
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="form-control"
            />
            <button className="btn btn-primary">Search</button>
          </div>
          <div className="d-flex flex-wrap gap-3">
            {['Invoice', 'Receive', 'Record', 'Pending', 'Active'].map((item) => (
              <div key={item} className="form-check">
                <input 
                  type="checkbox" 
                  className="form-check-input" 
                  id={`filter-${item}`}
                />
                <label 
                  className="form-check-label text-muted" 
                  htmlFor={`filter-${item}`}
                >
                  {item}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Documents Container */}
      <div className="col-lg-8">
        <div className="card h-100">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h2 className="h5 mb-0">Documents</h2>
              <span className="text-muted">{documents.length} items</span>
            </div>
            
            {/* Replace the current documents list rendering with this */}
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : documents.length > 0 ? (
              <div className="document-grid">
                {documents.map((doc) => (
                  <div key={doc.id} className="document-card">
                    <div className="document-thumbnail">
                      {doc.mimetype && doc.mimetype.startsWith('image/') ? (
                        <img 
                          src={doc.path} 
                          alt={doc.filename} 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.parentElement.innerHTML = `
                              <i class="bi bi-file-earmark ${getFileIconClass(doc.filename)}"></i>
                            `;
                          }}
                        />
                      ) : (
                        <i className={`bi bi-file-earmark ${getFileIconClass(doc.filename)} file-icon`}></i>
                      )}
                    </div>
                    <div className="document-details">
                      <div>
                        <h5 className="document-title">{doc.filename}</h5>
                        <div className="document-meta">
                          <div>{getFileType(doc.filename)} • {formatFileSize(doc.size)}</div>
                          <div>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="document-actions">
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => window.open(doc.path, '_blank')}
                        >
                          View
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleDownload(doc)}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 border rounded">
                <p className="text-muted mb-3">No documents found</p>
                <button 
                  className="btn btn-link text-primary p-0"
                  onClick={openUploadModal}
                >
                  Upload documents to get started
                </button>
              </div>
            )}       
             </div>
      </div>
      </div>
      {/* Create Folder/Add Data Type Modal */}
      {isModalOpen && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {showNewDocTypeForm ? 'Add New Document Type' : 'Create New Folder'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={closeModal}
                ></button>
              </div>
              
              <div className="modal-body">
                {!showNewDocTypeForm ? (
                  <>
                    <div className="mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Folder name"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                      />
                    </div>
                    
                    <div className="mb-3">
                      <h6>Document Types</h6>
                      <div className="border rounded p-2 mb-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {documentTypes.length > 0 ? (
                          documentTypes.map((type) => (
                            <div key={type.id} className="form-check">
                              <input 
                                className="form-check-input" 
                                type="checkbox" 
                                checked={selectedDocTypes.includes(type.id)}
                                onChange={() => handleDocTypeChange(type.id)}
                                id={`type-${type.id}`}
                              />
                              <label className="form-check-label d-flex justify-content-between w-100" htmlFor={`type-${type.id}`}>
                                <span>{type.name}</span>
                                <span className={`badge ${type.status ? 'bg-success' : 'bg-danger'}`}>
                                  {type.status ? 'Active' : 'Inactive'}
                                </span>
                              </label>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted">No document types available</p>
                        )}
                      </div>
                      
                      <button 
                        className="btn btn-link p-0 text-decoration-none"
                        onClick={() => setShowNewDocTypeForm(true)}
                      >
                        + Add new document type
                      </button>
                    </div>
                    
                    {error && <p className="text-danger">{error}</p>}
                  </>
                ) : (
                  <form onSubmit={handleCreateDocType}>
                    <div className="mb-3">
                      <label className="form-label">Name of the document type</label>
                      <input
                        type="text"
                        className={`form-control ${newDocTypeError ? 'is-invalid' : ''}`}
                        placeholder="Enter the name"
                        value={newDocTypeName}
                        onChange={(e) => setNewDocTypeName(e.target.value)}
                      />
                      {newDocTypeError && <div className="invalid-feedback">{newDocTypeError}</div>}
                    </div>
                    
                    <div className="form-check mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={newDocTypeStatus}
                        onChange={(e) => setNewDocTypeStatus(e.target.checked)}
                        id="docTypeStatus"
                      />
                      <label className="form-check-label" htmlFor="docTypeStatus">
                        Active
                      </label>
                    </div>
                    
                    {newDocTypeSuccess && (
                      <div className="alert alert-success">{newDocTypeSuccess}</div>
                    )}
                    
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-primary flex-grow-1">
                        Create Document Type
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary"
                        onClick={() => setShowNewDocTypeForm(false)}
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}
              </div>
              
              {!showNewDocTypeForm && (
                <div className="modal-footer">
                  <button 
                    className="btn btn-primary"
                    onClick={createFolder}
                  >
                    Create
                  </button>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentArchive;