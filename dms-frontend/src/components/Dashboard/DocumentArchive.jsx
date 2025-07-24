import React, { useState, useEffect, useContext } from 'react';
import DragDropUpload from './DragDropUpload';
import API from '../../api';
import { AppContext } from '../context';
import WelcomePanel from './WelcomePanel';
import { useNavigate } from 'react-router-dom';
import EditDocumentForm from './EditDocumentForm';
import './DocumentArchive.css';
// Remove: import path from 'path-browserify';

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

  // Enhanced preview modal state with document information
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewType, setPreviewType] = useState(''); // 'pdf', 'image', 'text', etc
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [currentDocument, setCurrentDocument] = useState(null); // Store full document info
  const [relatedDocuments, setRelatedDocuments] = useState([]); // Documents in same group

  // Email sending states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailUsers, setEmailUsers] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailType, setEmailType] = useState('document'); // 'document', 'rapport', 'ocr_text'
  const [availableEmailTypes, setAvailableEmailTypes] = useState([]);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Add a state to hold the displayed filename for the email modal
  const [displayedEmailFilename, setDisplayedEmailFilename] = useState('');

  // Document modification states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isEditSaving, setIsEditSaving] = useState(false);

  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Dropdown menu states
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdownId && !event.target.closest('.dropdown')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdownId]);

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

  // Function to fetch related documents for a document
  const fetchRelatedDocuments = async (documentId) => {
    try {
      // Use the groups API to get documents in the same group
      const response = await API.groups.getByDocument(documentId);
      if (response.data && response.data.length > 0) {
        // Get documents from the first group (assuming a document belongs to one main group)
        const groupId = response.data[0].id;
        const groupDocsResponse = await API.groups.getDocuments(groupId);
        // Filter out the current document
        const relatedDocs = groupDocsResponse.data.filter(doc => doc.id !== documentId);
        setRelatedDocuments(relatedDocs || []);
      } else {
        setRelatedDocuments([]);
      }
    } catch (error) {
      console.error('Error loading related documents', error);
      setRelatedDocuments([]);
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

  // Email management functions
  const handleSendEmail = async (document) => {
    try {
      // Fetch document email info and available users
      const [docInfoResponse, usersResponse] = await Promise.all([
        API.email.getDocumentInfo(document.id),
        API.email.getUsersForSelection(selectedCompany?.id)
      ]);

      setCurrentDocument(document);
      setAvailableEmailTypes(docInfoResponse.data.available_types);
      setEmailUsers(usersResponse.data.users);
      
      // Set default values
      setEmailType(docInfoResponse.data.available_types[0]?.type || 'document');
      setEmailSubject(`Document: ${document.filename}`);
      setEmailMessage('');
      setSelectedRecipients([]);
      setEmailError('');
      setEmailSuccess('');
      
      setIsEmailModalOpen(true);
      setOpenDropdownId(null); // Close dropdown after action
    } catch (error) {
      console.error('Error preparing email:', error);
      alert('Erreur lors de la préparation de l\'email');
    }
  };

  const handleCloseEmailModal = () => {
    setIsEmailModalOpen(false);
    setCurrentDocument(null);
    setEmailUsers([]);
    setSelectedRecipients([]);
    setEmailSubject('');
    setEmailMessage('');
    setEmailType('document');
    setAvailableEmailTypes([]);
    setEmailError('');
    setEmailSuccess('');
    setIsEmailSending(false);
  };

  const handleRecipientToggle = (userEmail) => {
    setSelectedRecipients(prev => {
      if (prev.includes(userEmail)) {
        return prev.filter(email => email !== userEmail);
      } else {
        return [...prev, userEmail];
      }
    });
  };

  const handleConfirmSendEmail = async () => {
    if (selectedRecipients.length === 0) {
      setEmailError('Veuillez sélectionner au moins un destinataire');
      return;
    }

    if (!emailSubject.trim()) {
      setEmailError('Veuillez saisir un objet');
      return;
    }

    setIsEmailSending(true);
    setEmailError('');

    try {
      const emailData = {
        recipients: selectedRecipients,
        email_type: emailType,
        subject: emailSubject.trim(),
        message: emailMessage.trim()
      };

      const response = await API.email.sendDocument(currentDocument.id, emailData);
      
      setEmailSuccess(response.data.msg);
      
      setTimeout(() => {
        handleCloseEmailModal();
      }, 2000);
    } catch (error) {
      setEmailError(error.response?.data?.msg || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setIsEmailSending(false);
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

  // Update handleViewDocument to open enhanced modal
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
      const ext = doc.filename.split('.').pop().toLowerCase();
      let type = '';
      if (["pdf"].includes(ext)) type = 'pdf';
      else if (["jpg","jpeg","png","gif","tiff","bmp","webp"].includes(ext)) type = 'image';
      else if (["txt"].includes(ext)) type = 'text';
      else type = 'other';
      
      setPreviewType(type);
      setPreviewUrl(url);
      setPreviewTitle(doc.filename);
      setPreviewText('');
      setCurrentDocument(doc);
      
      // Fetch related documents
      await fetchRelatedDocuments(doc.id);
      
      setIsPreviewModalOpen(true);
    } catch (error) {
      console.error('View failed:', error);
      alert('Échec de l\'ouverture. Veuillez réessayer.');
    }
  };

  // Update handleViewRapport to open enhanced modal
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
      setPreviewUrl(url + '#toolbar=0&navpanes=0&scrollbar=0');
      setPreviewTitle(doc.filename.replace(/\.[^/.]+$/, '') + '_rapport.pdf');
      setPreviewText('');
      setCurrentDocument(doc);
      
      // Fetch related documents
      await fetchRelatedDocuments(doc.id);
      
      setIsPreviewModalOpen(true);
    } catch (error) {
      console.error('View failed:', error);
      alert('Échec de l\'ouverture. Veuillez réessayer.');
    }
  };

  // Update handleViewOcrText to open enhanced modal
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
      // Try to read as text
      const reader = new FileReader();
      reader.onload = function(e) {
        setPreviewType('text');
        setPreviewUrl('');
        setPreviewTitle(doc.filename.replace(/\.[^/.]+$/, '') + '_ocr.txt');
        setPreviewText(e.target.result);
        setCurrentDocument(doc);
        
        // Fetch related documents
        fetchRelatedDocuments(doc.id);
        
        setIsPreviewModalOpen(true);
      };
      reader.readAsText(blob);
    } catch (error) {
      console.error('View failed:', error);
      alert('Échec de l\'ouverture. Veuillez réessayer.');
    }
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

  // Function to get document type name
  const getDoctypeName = (doctypeId) => {
    const doctype = availableDoctypes.find(dt => dt.id === doctypeId);
    return doctype ? doctype.name : 'Type inconnu';
  };

  // Function to get group name for a document
  const getDocumentGroup = (doc) => {
    // This would need to be implemented based on your API structure
    // For now, returning a placeholder
    return doc.group_name || 'Aucun groupe';
  };

  // Function to get uploader name
  const getUploaderName = (doc) => {
    return doc.uploaded_by || user?.name || 'Utilisateur inconnu';
  };

  // Update the effect that runs when emailType or currentDocument changes
  useEffect(() => {
    if (!currentDocument) {
      setDisplayedEmailFilename('');
      return;
    }
    const filename = getSelectedEmailFilename(emailType, currentDocument);
    setDisplayedEmailFilename(filename);
    setEmailSubject(`Document: ${filename}`);
  }, [emailType, currentDocument]);

  // Helper to get the filename for the selected email type
  function getSelectedEmailFilename(type, doc) {
    if (!doc) return '';
    if (type === 'rapport' && doc.rapport) {
      return doc.rapport.split(/[\\/]/).pop();
    } else if (type === 'ocr_text' && doc.ocr_text) {
      return doc.ocr_text.split(/[\\/]/).pop();
    } else {
      return doc.filename;
    }
  }

  // Stub handlers for edit/delete modal actions
  // Edit modal form state
  const [editForm, setEditForm] = useState({
    filename: '',
    partner_id: '',
    is_invoice: false,
    invoice_number: '',
    date: '',
    total_ht: '',
    tva: '',
    total_ttc: '',
  });
  const [editPartners, setEditPartners] = useState([]);
  const [isEditLoading, setIsEditLoading] = useState(false);

  // Open edit modal and prefill fields
  const handleEditDocument = async (doc) => {
    setEditingDocument(doc);
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(true);
    setIsEditLoading(true);
    try {
      // Fetch partners for the document's company
      const partnersRes = await API.partner.getByCompany(doc.company_id);
      let partnersList = partnersRes.data || [];
      let selectedPartnerId = doc.partner_id != null ? String(doc.partner_id) : '';
      // If the partner_id is set but not in the list, fetch it and add to the list
      if (selectedPartnerId && !partnersList.some(p => String(p.id) === selectedPartnerId)) {
        try {
          const partnerRes = await API.partner.getById(doc.partner_id);
          if (partnerRes.data) {
            partnersList = [...partnersList, partnerRes.data];
          }
        } catch (e) { /* ignore if not found */ }
      }
      setEditPartners(partnersList);
      setEditForm({
        filename: doc.filename || '',
        partner_id: selectedPartnerId,
      });
    } catch (e) {
      setEditPartners([]);
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingDocument(null);
    setEditError('');
    setEditSuccess('');
    setEditForm({
      filename: '', partner_id: '', is_invoice: false, invoice_number: '', date: '', total_ht: '', tva: '', total_ttc: ''
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEditDocument = async () => {
    if (!editingDocument) return;
    setIsEditSaving(true);
    setEditError('');
    setEditSuccess('');
    try {
      const updateData = {
        filename: editForm.filename,
        partner_id: editForm.partner_id ? Number(editForm.partner_id) : null,
      };
      await API.documents.update(editingDocument.id, updateData);
      setEditSuccess('Document modifié avec succès');
      // Update document in UI
      setDocuments(prev => prev.map(doc => doc.id === editingDocument.id ? { ...doc, ...updateData } : doc));
      setFilteredDocuments(prev => prev.map(doc => doc.id === editingDocument.id ? { ...doc, ...updateData } : doc));
      // Refresh the document list from the backend to reflect partner name change
      fetchDocuments();
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditingDocument(null);
        setEditSuccess('');
      }, 1200);
    } catch (error) {
      setEditError(error.response?.data?.msg || 'Erreur lors de la modification du document');
    } finally {
      setIsEditSaving(false);
    }
  };
  // Update handleDeleteDocument to open confirmation modal
  const handleDeleteDocument = (doc) => {
    setDeletingDocument(doc);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingDocument(null);
    setDeleteError('');
    setIsDeleting(false);
  };
  const handleConfirmDeleteDocument = async () => {
    if (!deletingDocument) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await API.delete(`/documents/${deletingDocument.id}`);
      setDocuments(prev => prev.filter(doc => doc.id !== deletingDocument.id));
      setFilteredDocuments(prev => prev.filter(doc => doc.id !== deletingDocument.id));
      setIsDeleteModalOpen(false);
      setDeletingDocument(null);
    } catch (error) {
      setDeleteError(error.response?.data?.msg || 'Erreur lors de la suppression du document');
    } finally {
      setIsDeleting(false);
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
                    <th>Plus d'actions</th>
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
                                style={{ padding: '10px 24px', fontSize: '1.15em', fontWeight: 600 }}
                                onClick={() => handleViewRapport(doc)}
                                title="Voir le rapport PDF"
                              >
                                Voir
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
                                style={{ padding: '10px 24px', fontSize: '1.15em', fontWeight: 600 }}
                                onClick={() => handleViewOcrText(doc)}
                                title="Voir le texte OCR"
                              >
                                Voir
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
                            style={{ padding: '10px 24px', fontSize: '1.15em', fontWeight: 600 }}
                            onClick={() => handleViewDocument(doc)}
                            title="Voir le document"
                          >
                            Voir <i className="bi bi-eye"></i>
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="dropdown">
                          <button 
                            className="btn btn-sm btn-outline-secondary dropdown-toggle"
                            type="button" 
                            id={`dropdownMenuButton${doc.id}`}
                            aria-expanded={openDropdownId === doc.id ? "true" : "false"}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent global click handler from firing
                              setOpenDropdownId(openDropdownId === doc.id ? null : doc.id);
                            }}
                            style={{ 
                              border: 'none', 
                              background: 'transparent',
                              padding: '8px 12px',
                              fontSize: '16px',
                              color: '#6c757d'
                            }}
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul 
                            className={`dropdown-menu ${openDropdownId === doc.id ? 'show' : ''}`}
                            aria-labelledby={`dropdownMenuButton${doc.id}`}
                            onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
                            style={{ zIndex: 1050, position: 'absolute' }}
                          >
                            <li>
                              <button 
                                className="dropdown-item d-flex align-items-center"
                                onClick={() => {
                                  setIsPreviewModalOpen(false); // Close any open modal first
                                  handleSendEmail(doc);
                                }}
                              >
                                <i className="bi bi-envelope me-2"></i>
                                Envoyer
                              </button>
                            </li>
                            <li>
                              <button 
                                className="dropdown-item d-flex align-items-center"
                                onClick={() => handleEditDocument(doc)}
                              >
                                <i className="bi bi-pencil-square me-2"></i>
                                Modifier
                              </button>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                              <button 
                                className="dropdown-item d-flex align-items-center text-danger"
                                onClick={() => handleDeleteDocument(doc)}
                              >
                                <i className="bi bi-trash me-2"></i>
                                Supprimer
                              </button>
                            </li>
                          </ul>
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

      {/* Enhanced Preview Modal with Two-Column Layout */}
      {isPreviewModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="modal-content-enhanced" style={{
            width: '95vw',
            height: '90vh',
            maxWidth: '1400px',
            backgroundColor: 'white',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div className="modal-header-enhanced" style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#1f2937'
              }}>
                {previewTitle}
              </h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  if (previewUrl) window.URL.revokeObjectURL(previewUrl);
                  setCurrentDocument(null);
                  setRelatedDocuments([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body - Two Column Layout */}
            <div className="modal-body-enhanced" style={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden'
            }}>
              {/* Left Column - File Display */}
              <div className="file-display-column" style={{
                flex: '1',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                borderRight: '1px solid #e5e7eb'
              }}>
                {previewType === 'pdf' && previewUrl && (
                  <iframe
                    src={previewUrl + (previewUrl.includes('#') ? '' : '#toolbar=0&navpanes=0&scrollbar=0')}
                    title="PDF Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                )}
                {previewType === 'image' && previewUrl && (
                  <img
                    src={previewUrl}
                    alt={previewTitle}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      backgroundColor: 'white'
                    }}
                  />
                )}
                {previewType === 'text' && (
                  <textarea
                    value={previewText}
                    readOnly
                    style={{
                      width: '100%',
                      height: '100%',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      color: '#1e293b',
                      resize: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                )}
                {previewType === 'other' && (
                  <div style={{
                    textAlign: 'center',
                    color: '#64748b',
                    padding: '40px'
                  }}>
                    <i className="bi bi-file-earmark-text" style={{
                      fontSize: '64px',
                      marginBottom: '16px',
                      display: 'block'
                    }}></i>
                    <p style={{ fontSize: '18px', marginBottom: '24px' }}>
                      Prévisualisation non supportée pour ce type de fichier
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column - Document Information */}
              <div className="document-info-column" style={{
                width: '400px',
                backgroundColor: 'white',
                padding: '24px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {currentDocument && (
                  <>
                    {/* Document Information Section */}
                    <div className="info-section" style={{ marginBottom: '24px' }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#1f2937',
                        marginBottom: '16px',
                        borderBottom: '2px solid #e5e7eb',
                        paddingBottom: '8px'
                      }}>
                        Informations du document
                      </h4>
                      
                      <div className="info-item" style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#374151', fontSize: '14px' }}>Utilisateur:</strong>
                        <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '14px' }}>
                          {getUploaderName(currentDocument)}
                        </span>
                      </div>
                      
                      <div className="info-item" style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#374151', fontSize: '14px' }}>Type de document:</strong>
                        <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '14px' }}>
                          {getDoctypeName(currentDocument.doctype_id)}
                        </span>
                      </div>
                      
                      <div className="info-item" style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#374151', fontSize: '14px' }}>Entreprise:</strong>
                        <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '14px' }}>
                          {selectedCompany?.name || 'Non spécifiée'}
                        </span>
                      </div>
                      
                      <div className="info-item" style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#374151', fontSize: '14px' }}>Groupe:</strong>
                        <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '14px' }}>
                          {getDocumentGroup(currentDocument)}
                        </span>
                      </div>
                      
                      <div className="info-item" style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#374151', fontSize: '14px' }}>Taille:</strong>
                        <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '14px' }}>
                          {formatFileSize(currentDocument.file_size || currentDocument.size || 0)}
                        </span>
                      </div>
                      
                      <div className="info-item" style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#374151', fontSize: '14px' }}>Date d'upload:</strong>
                        <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '14px' }}>
                          {currentDocument.created_at ? new Date(currentDocument.created_at).toLocaleDateString('fr-FR') : 'Non disponible'}
                        </span>
                      </div>
                    </div>

                    {/* Related Documents Section */}
                    <div className="info-section" style={{ marginBottom: '24px' }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#1f2937',
                        marginBottom: '16px',
                        borderBottom: '2px solid #e5e7eb',
                        paddingBottom: '8px'
                      }}>
                        Documents reliés
                      </h4>
                      
                      {relatedDocuments.length > 0 ? (
                        <div className="related-docs-list">
                          {relatedDocuments.map((relDoc) => (
                            <div key={relDoc.id} style={{
                              padding: '8px 12px',
                              backgroundColor: '#f8fafc',
                              borderRadius: '6px',
                              marginBottom: '8px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#374151',
                                marginBottom: '4px'
                              }}>
                                {relDoc.filename}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: '#6b7280'
                              }}>
                                {getFileType(relDoc.filename)} • {formatFileSize(relDoc.file_size || 0)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{
                          color: '#6b7280',
                          fontSize: '14px',
                          fontStyle: 'italic'
                        }}>
                          Aucun document relié
                        </p>
                      )}
                    </div>

                    {/* Action Buttons Section */}
                    <div className="action-buttons" style={{
                      marginTop: 'auto',
                      paddingTop: '24px',
                      borderTop: '1px solid #e5e7eb'
                    }}>
                      <button
                        className="btn btn-blue"
                        onClick={() => handleDownload(currentDocument)}
                        style={{
                          width: '100%',
                          marginBottom: '12px',
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <i className="bi bi-download"></i>
                        Télécharger
                      </button>
                      
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => {
                          setIsPreviewModalOpen(false); // Close the voir modal first
                          handleSendEmail(currentDocument); // Then open the email modal
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          backgroundColor: 'transparent',
                          border: '1px solid #2563eb',
                          color: '#2563eb'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#2563eb';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = '#2563eb';
                        }}
                      >
                        <i className="bi bi-send"></i>
                        Envoyer par email
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Sending Modal */}
      {isEmailModalOpen && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg" style={{ height: '80vh', maxHeight: '80vh', display: 'flex', alignItems: 'center' }}>
            <div className="modal-content" style={{ height: '80vh', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-envelope me-2"></i>
                  Envoyer le document par email
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={handleCloseEmailModal}
                ></button>
              </div>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                {currentDocument && (
                  <>
                    {/* Document Information */}
                    <div className="card mb-4" style={{height:'120px'}}>
                      <div className="card-body">
                        <h6 className="card-title">Document à envoyer</h6>
                        <div className="d-flex align-items-center">
                          <i className={`bi ${getFileIconClass(currentDocument.filename)} me-2`}></i>
                          <div>
                            <div className="fw-medium">{displayedEmailFilename || currentDocument.filename}</div>
                            <small className="text-muted">
                              {formatFileSize(currentDocument.file_size || 0)} • 
                              Créé le {currentDocument.created_at ? new Date(currentDocument.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email Type Selection */}
                    <div className="mb-4">
                      <label className="form-label">Type de fichier à envoyer</label>
                      <div className="row g-2">
                        {availableEmailTypes.map((type) => {
                          let fileLabel = '';
                          if (type.type === 'rapport' && currentDocument.rapport) {
                            fileLabel = currentDocument.rapport.split(/[\\/]/).pop();
                          } else if (type.type === 'ocr_text' && currentDocument.ocr_text) {
                            fileLabel = currentDocument.ocr_text.split(/[\\/]/).pop();
                          } else {
                            fileLabel = currentDocument.filename;
                          }
                          return (
                            <div key={type.type} className="col-md-4">
                              <div className="form-check">
                                <input 
                                  className="form-check-input" 
                                  type="radio" 
                                  name="emailType"
                                  id={`emailType-${type.type}`}
                                  value={type.type}
                                  checked={emailType === type.type}
                                  onChange={(e) => {
                                    setEmailType(e.target.value);
                                  }}
                                />
                                <label className="form-check-label" htmlFor={`emailType-${type.type}`}> 
                                  <strong>{type.label}</strong>
                                  <br />
                                  <span style={{ display: 'block', color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                                    Fichier : {fileLabel}
                                  </span>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recipients Selection */}
                    <div className="mb-4">
                      <label className="form-label">Destinataires</label>
                      <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {emailUsers.length > 0 ? (
                          <>
                            <div className="mb-2">
                              <button 
                                type="button" 
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => setSelectedRecipients(emailUsers.map(u => u.email))}
                              >
                                Tout sélectionner
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setSelectedRecipients([])}
                              >
                                Tout désélectionner
                              </button>
                            </div>
                            {emailUsers.map((user) => (
                              <div key={user.id} className="form-check">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  id={`user-${user.id}`}
                                  checked={selectedRecipients.includes(user.email)}
                                  onChange={() => handleRecipientToggle(user.email)}
                                />
                                <label className="form-check-label" htmlFor={`user-${user.id}`}>
                                  <strong>{user.username} {user.surname}</strong>
                                  <br />
                                  <small className="text-muted">{user.email} • {user.role}</small>
                                </label>
                              </div>
                            ))}
                          </>
                        ) : (
                          <p className="text-muted mb-0">Aucun utilisateur disponible</p>
                        )}
                      </div>
                      {selectedRecipients.length > 0 && (
                        <small className="text-muted">
                          {selectedRecipients.length} destinataire(s) sélectionné(s)
                        </small>
                      )}
                    </div>

                    {/* Email Subject */}
                    <div className="mb-3">
                      <label className="form-label">Objet</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Objet de l'email"
                      />
                    </div>

                    {/* Email Message */}
                    <div className="mb-4">
                      <label className="form-label">Message (optionnel)</label>
                      <textarea 
                        className="form-control"
                        rows="4"
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Message personnalisé à ajouter à l'email..."
                      />
                    </div>

                    {/* Error and Success Messages */}
                    {emailError && (
                      <div className="alert alert-danger">{emailError}</div>
                    )}
                    {emailSuccess && (
                      <div className="alert alert-success">{emailSuccess}</div>
                    )}
                  </>
                )}
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCloseEmailModal}
                  disabled={isEmailSending}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleConfirmSendEmail}
                  disabled={isEmailSending || selectedRecipients.length === 0}
                >
                  {isEmailSending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Envoyer l'email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Document Edit Modal - styled like DocumentConfirmationForm */}
      {isEditModalOpen && editingDocument && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg" style={{ marginTop: '120px' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-pencil-square me-2"></i>
                  Modifier le document
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={handleCloseEditModal}
                ></button>
              </div>
              <div className="modal-body">
                {isEditLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                ) : (
                  <form className="document-confirmation-form document-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Nom du document :</label>
                        <input
                          type="text"
                          value={editForm.filename}
                          onChange={e => handleEditFormChange('filename', e.target.value)}
                          className="form-control"
                        />
                      </div>
                      <div className="form-group">
                        <label>Partenaire externe :</label>
                        <select
                          value={editForm.partner_id}
                          onChange={e => handleEditFormChange('partner_id', e.target.value)}
                          className="form-control"
                        >
                          <option value="">Sélectionner un partenaire externe</option>
                          {editPartners.map(partner => (
                            <option key={partner.id} value={String(partner.id)}>{partner.company_name} ({partner.partnertypes?.map(pt => pt.name).join(', ')})</option>
                          ))}
                        </select>
                    </div>
                    </div>
                    {editError && <div className="alert alert-danger mt-3">{editError}</div>}
                    {editSuccess && <div className="alert alert-success mt-3">{editSuccess}</div>}
                  </form>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCloseEditModal}
                  disabled={isEditSaving}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSaveEditDocument}
                  disabled={isEditSaving}
                >
                  {isEditSaving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i>
                      Sauvegarder
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingDocument && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog" style={{ marginTop: '120px' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center">
                  <i className="bi bi-trash me-2 text-danger" style={{ fontSize: '1.5rem' }}></i>
                  Confirmation de suppression
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={handleCloseDeleteModal}
                  aria-label="Fermer"
                ></button>
              </div>
              <div className="modal-body" style={{ padding: '2rem 2.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  Êtes-vous sûr de vouloir supprimer ce document&nbsp;?
                </p>
                <p className="text-muted" style={{ fontSize: '0.98rem', marginBottom: 0 }}>
                  Cette action est <strong>irréversible</strong> et entraînera la suppression définitive du document de la base de données.
                </p>
                {deleteError && <div className="alert alert-danger mt-3">{deleteError}</div>}
              </div>
              <div className="modal-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCloseDeleteModal}
                  disabled={isDeleting}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleConfirmDeleteDocument}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Suppression...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash me-2"></i>
                      Supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentArchive;

