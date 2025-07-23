import React, { useState, useEffect, useContext } from 'react';
import DragDropUpload from './DragDropUpload';
import API from '../../api';
import { AppContext } from '../context';
import WelcomePanel from './WelcomePanel';
import { useNavigate } from 'react-router-dom';
import './DocumentArchive.css';

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
  
  // New state for documents and filters
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  
  // Filter states
  const [selectedDoctypeFilters, setSelectedDoctypeFilters] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [availableDoctypes, setAvailableDoctypes] = useState([]);

  // Group management states
  const [groups, setGroups] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupAction, setGroupAction] = useState(''); // 'add' or 'create'
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [groupError, setGroupError] = useState('');
  const [groupSuccess, setGroupSuccess] = useState('');

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

  // Function to fetch documents from the backend with filters
  const fetchDocuments = async () => {
    if (!selectedCompany) return;
    
    setIsLoading(true);
    try {
      let response;
      
      if (selectedDoctype) {
        // If a specific doctype is selected, use the existing API
        response = await API.documents.getByCompanyAndType(
          selectedCompany.id,
          selectedDoctype.id
        );
      } else {
        // If no specific doctype, get all documents for the company (no filters)
        response = await API.documents.getAllByCompany(selectedCompany.id);
      }
      
      setDocuments(response.data.documents || []);
      setFilteredDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error loading documents', error);
      setDocuments([]);
      setFilteredDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add FilesUploaded event listener only once per company/type change
  useEffect(() => {
    const documentHandler = () => fetchDocuments();
    window.addEventListener('FilesUploaded', documentHandler);
    return () => {
      window.removeEventListener('FilesUploaded', documentHandler);
    };
  }, [selectedCompany, selectedDoctype]);

  // Function to fetch available document types for the company
  const fetchAvailableDoctypes = async () => {
    if (!selectedCompany) return;
    
    try {
      const response = await API.doctype.getByCompany(selectedCompany.id);
      setAvailableDoctypes(response.data || []);
    } catch (error) {
      console.error('Error loading document types', error);
      setAvailableDoctypes([]);
    }
  };

  // Function to fetch groups
  const fetchGroups = async () => {
    try {
      const response = await API.groups.getAll();
      setGroups(response.data || []);
    } catch (error) {
      console.error('Error loading groups', error);
      setGroups([]);
    }
  };

  // Group management functions
  const handleAddToGroup = () => {
    setGroupAction('add');
    setIsGroupMode(true);
    setSelectedDocuments([]);
    setGroupError('');
    setGroupSuccess('');
  };

  const handleCreateGroup = () => {
    setGroupAction('create');
    setIsGroupMode(true);
    setSelectedDocuments([]);
    setNewGroupName('');
    setGroupError('');
    setGroupSuccess('');
  };

  const handleCancelGroupAction = () => {
    setIsGroupMode(false);
    setGroupAction('');
    setSelectedDocuments([]);
    setSelectedGroup('');
    setNewGroupName('');
    setGroupError('');
    setGroupSuccess('');
  };

  const handleDocumentSelection = (documentId) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const handleConfirmAddToGroup = async () => {
    if (!selectedGroup) {
      setGroupError('Veuillez sélectionner un groupe');
      return;
    }

    if (selectedDocuments.length === 0) {
      setGroupError('Veuillez sélectionner au moins un document');
      return;
    }

    try {
      await API.groups.addDocuments(selectedGroup, selectedDocuments);
      setGroupSuccess('Documents ajoutés au groupe avec succès');
      setTimeout(() => {
        handleCancelGroupAction();
      }, 2000);
    } catch (error) {
      setGroupError(error.response?.data?.msg || 'Erreur lors de l\'ajout des documents au groupe');
    }
  };

  const handleConfirmCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setGroupError('Veuillez saisir un nom de groupe');
      return;
    }

    try {
      // Create the group first
      const createResponse = await API.groups.create({ name: newGroupName.trim() });
      const newGroupId = createResponse.data.group_id;

      // Add documents to the group if any are selected
      if (selectedDocuments.length > 0) {
        await API.groups.addDocuments(newGroupId, selectedDocuments);
      }

      setGroupSuccess('Groupe créé avec succès');
      
      // Refresh groups list
      fetchGroups();
      
      setTimeout(() => {
        handleCancelGroupAction();
      }, 2000);
    } catch (error) {
      setGroupError(error.response?.data?.msg || 'Erreur lors de la création du groupe');
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
      fetchAvailableDoctypes();
      fetchGroups();
      
      // Set default date range to last month
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      setStartDate(lastMonth.toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
    }
  }, [selectedCompany]);

  // Fetch documents when company, doctype, or date filters change
  useEffect(() => {
    fetchDocuments();
  }, [selectedCompany, selectedDoctype, startDate, endDate]);

  // Filter documents based on search term and selected doctypes
  useEffect(() => {
    let filtered = [...documents];
    
    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => {
        // Search in filename, invoice_number, ocr_text (as before)
        const baseMatch =
          doc.filename?.toLowerCase().includes(lowerSearch) ||
          doc.invoice_number?.toLowerCase().includes(lowerSearch) ||
          doc.ocr_text?.toLowerCase().includes(lowerSearch);
        // Search in extracted_data (metadata)
        let metaMatch = false;
        if (doc.extracted_data) {
          let meta = doc.extracted_data;
          if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch { meta = {}; }
          }
          for (const key in meta) {
            if (
              meta[key] &&
              String(meta[key]).toLowerCase().includes(lowerSearch)
            ) {
              metaMatch = true;
              break;
            }
          }
        }
        // Search in extracted_text (OCR text)
        const ocrMatch = doc.extracted_text && doc.extracted_text.toLowerCase().includes(lowerSearch);
        return baseMatch || metaMatch || ocrMatch;
      });
    }
    
    // Filter by selected document types (only when no specific doctype is selected)
    if (!selectedDoctype && selectedDoctypeFilters.length > 0) {
      filtered = filtered.filter(doc => 
        selectedDoctypeFilters.includes(doc.doctype_id)
      );
    }

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filtered = filtered.filter(doc => {
        if (!doc.created_at) return false;
        const docDate = new Date(doc.created_at);
        // Set time to 0:0:0 for start, 23:59:59 for end to include full days
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        return docDate >= start && docDate <= end;
      });
    }
    
    setFilteredDocuments(filtered);
  }, [documents, searchTerm, selectedDoctypeFilters, selectedDoctype, startDate, endDate]);

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

  const handleDoctypeFilterChange = (doctypeId) => {
    setSelectedDoctypeFilters(prev => {
      if (prev.includes(doctypeId)) {
        return prev.filter(id => id !== doctypeId);
      } else {
        return [...prev, doctypeId];
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

  // Helper to build the file URL for viewing/downloading
  const getFileUrl = (doc) => {
    if (doc.id) {
      return `/api/documents/${doc.id}/file`;  // Use document ID to fetch file
    }
    return '#';
  };

  const handleDownload = async (doc) => {
    try {
      const response = await API.get(`/documents/${doc.id}/file`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.filename || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error.response?.data?.error || error.message}`);
    }
  };

  // State for document preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null); // 'pdf', 'image', 'txt', 'other'

  const handleViewDocument = async (doc) => {
    try {
      const response = await API.documents.download(doc.id);
      if (response.status !== 200) {
        if (response.status === 404) {
          alert('Document non disponible.');
          return;
        }
        throw new Error('Network response was not ok');
      }
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      // Determine file type
      let type = 'other';
      if (doc.filename && doc.filename.toLowerCase().endsWith('.pdf')) type = 'pdf';
      else if (doc.filename && ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => doc.filename.toLowerCase().endsWith(ext))) type = 'image';
      setPreviewType(type);
      setPreviewUrl(url);
      setPreviewModalOpen(true);
    } catch (error) {
      console.error('View failed:', error);
      alert('Échec de l\'ouverture. Veuillez réessayer.');
    }
  };

  const handleViewRapport = async (doc) => {
    try {
      const response = await API.documents.getRapport(doc.id);
      if (response.status !== 200) {
        if (response.status === 404) {
          alert('Rapport non disponible pour ce document.');
          return;
        }
        throw new Error('Network response was not ok');
      }
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      setPreviewType('pdf');
      setPreviewUrl(url);
      setPreviewModalOpen(true);
    } catch (error) {
      console.error('View failed:', error);
      alert('Échec de l\'ouverture. Veuillez réessayer.');
    }
  };

  const handleViewOcrText = async (doc) => {
    try {
      const response = await API.documents.getOcrText(doc.id);
      if (response.status !== 200) {
        if (response.status === 404) {
          alert('Texte OCR non disponible pour ce document.');
          return;
        }
        throw new Error('Network response was not ok');
      }
      const blob = response.data;
      const text = await blob.text();
      setPreviewType('txt');
      setPreviewUrl(text);
      setPreviewModalOpen(true);
    } catch (error) {
      console.error('View failed:', error);
      alert('Échec de l\'ouverture. Veuillez réessayer.');
    }
  };

  // Modal for document/rapport/OCR preview
  const renderPreviewModal = () => {
    if (!previewModalOpen) return null;
    // For PDF, append params to hide toolbar/sidebar
    const pdfUrl = previewType === 'pdf' && previewUrl ? `${previewUrl}#toolbar=0&navpanes=0&view=FitH` : previewUrl;
    let modalTitle = 'Aperçu du document';
    if (previewType === 'pdf') modalTitle = 'Aperçu du rapport';
    else if (previewType === 'image') modalTitle = "Aperçu de l'image";
    else if (previewType === 'txt') modalTitle = 'Aperçu du texte OCR';
    return (
      <div className="document-preview-modal-overlay">
        <div className="document-preview-modal-content">
          <div className="document-preview-modal-header">
            <span className="document-preview-modal-title">{modalTitle}</span>
            <button type="button" className="btn-close document-preview-modal-close" onClick={() => {
              setPreviewModalOpen(false);
              if (previewType !== 'txt' && previewUrl) window.URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }} aria-label="Close">&times;</button>
          </div>
          <div className="document-preview-modal-body">
            {previewType === 'pdf' ? (
              <iframe src={pdfUrl} title="Document PDF"></iframe>
            ) : previewType === 'image' ? (
              <img src={previewUrl} alt="Document" />
            ) : previewType === 'txt' ? (
              <pre>{previewUrl}</pre>
            ) : (
              <div className="text-muted">Aperçu non disponible pour ce type de fichier.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Function to render extracted data in a visual format
  const renderExtractedData = (extractedData) => {
    if (!extractedData) return <span className="text-muted">Aucune donnée</span>;
    
    if (typeof extractedData === 'string') {
      try {
        extractedData = JSON.parse(extractedData);
      } catch {
        return <span className="text-muted">Données non valides</span>;
      }
    }
    
    return (
      <div className="extracted-data-preview">
        {extractedData.invoice_number && (
          <div><strong>N°:</strong> {extractedData.invoice_number}</div>
        )}
        {extractedData.date && (
          <div><strong>Date:</strong> {extractedData.date}</div>
        )}
        {extractedData.total_ttc && (
          <div><strong>Total:</strong> {extractedData.total_ttc}€</div>
        )}
        {extractedData.partner && (
          <div><strong>Partenaire:</strong> {extractedData.partner}</div>
        )}
      </div>
    );
  };

  // Function to get file type from filename
  const getFileType = (filename) => {
    const parts = filename.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toUpperCase();
    }
    return 'Unknown';
  };

  const handleRapportDownload = async (doc) => {
    try {
      const response = await API.documents.getRapport(doc.id);
      if (response.status !== 200) {
        if (response.status === 404) {
          alert('Rapport non disponible pour ce document.');
          return;
        }
        throw new Error('Network response was not ok');
      }
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename.replace(/\.[^/.]+$/, "") + "_rapport.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Échec du téléchargement. Veuillez réessayer.');
    }
  };

  const handleOcrTextDownload = async (doc) => {
    try {
      const response = await API.documents.getOcrText(doc.id);
      if (response.status !== 200) {
        if (response.status === 404) {
          alert('Texte OCR non disponible pour ce document.');
          return;
        }
        throw new Error('Network response was not ok');
      }
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename.replace(/\.[^/.]+$/, "") + "_ocr.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Échec du téléchargement. Veuillez réessayer.');
    }
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

      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}
      
      {/* Search and Filter Section - MODIFIED to include Upload Button */}
      <div className="card mb-4 search-filter-container">
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h2 className="h6 mb-0">Recherche & Filtres</h2>
<<<<<<< HEAD
        {(selectedDoctype || selectedCompany) && (
          <button 
                className="btn btn-primary btn-sm d-flex align-items-center"
            onClick={openUploadModal}
          >
            <i className="bi bi-plus me-1"></i> Upload File
          </button>
        )}
      </div>
      
=======
            <div className="d-flex gap-2">
              {(selectedDoctype || selectedCompany) && (
                <button 
                  className="btn btn-blue btn-sm d-flex align-items-center"
                  onClick={openUploadModal}
                >
                  <i className="bi bi-plus me-1"></i> Upload File
                </button>
              )}
            </div>
          </div>
          
>>>>>>> 02616346194607b4b5d667839c14aded4ddabdaf
          <div className="row g-3">
            {/* Left Column - Filters */}
            <div className="col-md-6">
              {/* Date Range Filters */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small">Date de début</label>
              <input 
                type="date" 
                    className="form-control form-control-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
                <div className="col-6">
                  <label className="form-label small">Date de fin</label>
              <input 
                type="date" 
                    className="form-control form-control-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          {/* Document Type Filters - Only show when no specific doctype is selected */}
          {!selectedDoctype && availableDoctypes.length > 0 && (
            <div>
                  <h6 className="mb-2 small">Types de documents</h6>
                  <div className="d-flex flex-wrap gap-2">
                {availableDoctypes.map((doctype) => (
                      <div key={doctype.id} className="form-check form-check-sm">
                    <input 
                      type="checkbox" 
                      className="form-check-input" 
                      id={`filter-doctype-${doctype.id}`}
                      checked={selectedDoctypeFilters.includes(doctype.id)}
                      onChange={() => handleDoctypeFilterChange(doctype.id)}
                    />
                    <label 
                          className="form-check-label text-muted small" 
                      htmlFor={`filter-doctype-${doctype.id}`}
                    >
                      {doctype.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
            </div>
            
            {/* Right Column - Search */}
            <div className="col-md-6">
              <label className="form-label small">Rechercher</label>
              <div className="input-group input-group-sm">
                <input 
                  type="text" 
                  placeholder="Rechercher des documents..." 
                  className="form-control"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="btn btn-primary btn-sm">
                  <i className="bi bi-search me-1"></i>
                  Recherche
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="card">
        <div className="card-body">
          {/* Breadcrumb and Title Section */}
          <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <div className="d-flex align-items-center">
              <nav className="breadcrumb mb-0 me-3">
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
<<<<<<< HEAD
            <h2 className="h5 mb-0">Documents</h2>
=======
>>>>>>> 02616346194607b4b5d667839c14aded4ddabdaf
            </div>
            <div className="d-flex align-items-center gap-3">
              <span className="text-muted items-count">{filteredDocuments.length} items</span>
              
              {/* Group management buttons - moved to extreme right */}
              <div className="d-flex gap-2">
                {!isGroupMode && (
                  <>
                    <button 
                      className="btn btn-blue btn-sm d-flex align-items-center"
                      onClick={handleAddToGroup}
                    >
                      <i className="bi bi-plus-circle me-1"></i> Ajouter au groupe
                    </button>
                    <button 
                      className="btn btn-blue btn-sm d-flex align-items-center"
                      onClick={handleCreateGroup}
                    >
                      <i className="bi bi-folder-plus me-1"></i> Créer groupe
                    </button>
                  </>
                )}
                
                {/* Group action controls */}
                {isGroupMode && (
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    {groupAction === 'add' && (
                      <>
                        <select 
                          className="form-select form-select-sm" 
                          style={{ width: '200px' }}
                          value={selectedGroup}
                          onChange={(e) => setSelectedGroup(e.target.value)}
                          required
                        >
                          <option value="">Sélectionner un groupe</option>
                          {groups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                        </select>
                        <button 
                          className="btn btn-blue btn-sm"
                          onClick={handleConfirmAddToGroup}
                        >
                          Confirmer
                        </button>
                      </>
                    )}
                    
                    {groupAction === 'create' && (
                      <>
                        <input 
                          type="text"
                          className="form-control form-control-sm"
                          style={{ width: '200px' }}
                          placeholder="Nom du groupe"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          required
                        />
                        <button 
                          className="btn btn-blue btn-sm"
                          onClick={handleConfirmCreateGroup}
                        >
                          Confirmer
                        </button>
                      </>
                    )}
                    
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={handleCancelGroupAction}
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Group action messages */}
          {isGroupMode && (
            <div className="mb-3">
              {groupError && (
                <div className="alert alert-danger alert-sm py-2">{groupError}</div>
              )}
              {groupSuccess && (
                <div className="alert alert-success alert-sm py-2">{groupSuccess}</div>
              )}
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="table-responsive documents-table-container">
              <table className="table table-hover stylish-table">
                <thead className="table-header-sticky">
                  <tr>
                    {isGroupMode && (
                      <th style={{ width: '50px' }}>
                        <input 
                          type="checkbox" 
                          className="form-check-input"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocuments(filteredDocuments.map(doc => doc.id));
                            } else {
                              setSelectedDocuments([]);
                            }
                          }}
                          checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                        />
                      </th>
                    )}
                    <th>ID</th>
                    <th>Document</th>
                    <th>Partner</th>
                    <th>Facture</th>
                    <th>Rapport</th>
                    <th>OCR extrait</th>
                    <th>Date d'upload</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="table-row-hover">
                      {isGroupMode && (
                        <td>
                          <input 
                            type="checkbox" 
                            className="form-check-input"
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={() => handleDocumentSelection(doc.id)}
                          />
                        </td>
                      )}
                      <td className="text-muted">{doc.id}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <i className={`bi ${getFileIconClass(doc.filename)} me-2`}></i>
                          <div style={{ maxWidth: '400px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                            <div className="fw-medium document-filename">{doc.filename}</div>
                            <small className="text-muted">
                              {getFileType(doc.filename)} • {formatFileSize(doc.file_size || doc.size || 0)}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{doc.partner_name || '-'}</td>
                      <td>
                        {doc.is_invoice ? (
                          <span style={{
                            display: 'inline-block',
                            background: '#dcfce7',
                            color: '#16a34a',
                            fontWeight: 'bold',
                            borderRadius: '999px',
                            padding: '2px 14px',
                            fontSize: '0.95em',
                            border: '1px solid #bbf7d0',
                          }}>oui</span>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            background: '#fee2e2',
                            color: '#dc2626',
                            fontWeight: 'bold',
                            borderRadius: '999px',
                            padding: '2px 14px',
                            fontSize: '0.95em',
                            border: '1px solid #fecaca',
                          }}>non</span>
                        )}
                      </td>
                      <td>
                        <div className="extracted-data-cell">
                          {doc.rapport ? (
                            <div className="btn-group" role="group">
                              <button
                                className="btn btn-sm btn-outline-blue"
                                onClick={() => handleViewRapport(doc)}
                                title="Voir le rapport PDF"
                              >
                                Voir
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => handleRapportDownload(doc)}
                                title="Télécharger le rapport PDF"
                              >
                                Télécharger
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="ocr-text-cell">
                          {doc.ocr_text ? (
                            <div className="btn-group" role="group">
                              <button
                                className="btn btn-sm btn-outline-blue"
                                onClick={() => handleViewOcrText(doc)}
                                title="Voir le texte OCR"
                              >
                                Voir
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => handleOcrTextDownload(doc)}
                                title="Télécharger le texte OCR"
                              >
                                Télécharger
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted">Aucun texte OCR</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-sm btn-outline-blue"
                            onClick={() => handleViewDocument(doc)}
                            title="Voir le document"
                          >
                            Voir <i className="bi bi-eye"></i>
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleDownload(doc)}
                            title="Télécharger"
                          >
                            Télécharger <i className="bi bi-download"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5 border rounded empty-state">
              <i className="bi bi-folder2-open text-muted mb-3" style={{ fontSize: '3rem' }}></i>
              <p className="text-muted mb-3">Aucun document trouvé</p>
              <button 
                className="btn btn-blue"
                onClick={openUploadModal}
              >
                <i className="bi bi-plus me-1"></i>
                Télécharger des documents pour commencer
              </button>
            </div>
          )}       
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
                      <div className="border rounded p-2 mb-2" style={{ /* maxHeight: '200px', */ overflowY: 'auto' }}>
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
      {renderPreviewModal()}
    </div>
  );
};

export default DocumentArchive;

