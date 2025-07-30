import React, { useState, useEffect, useContext, useRef } from 'react';
import DragDropUpload from './DragDropUpload';
import API from '../../api';
import { AppContext } from '../context';
import WelcomePanel from './WelcomePanel';
import { useNavigate } from 'react-router-dom';
import EditDocumentForm from './EditDocumentForm';
import { exportToCSV, exportToJSON, exportToTXT, exportToExcel } from '../Admin/exportUtils';
import { ReactComponent as FullscreenIcon } from './fullscreen.svg';
import './DocumentArchive.css';
// Remove: import path from 'path-browserify';

const DocumentArchive = ({ user, selectedCompany, selectedDoctype }) => {
  // Helper function to get first day of current month
  const getFirstDayOfMonth = () => {
    const now = new Date();
    // Ensure we're working with local time to avoid timezone issues
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const year = firstDay.getFullYear();
    const month = String(firstDay.getMonth() + 1).padStart(2, '0');
    const day = String(firstDay.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to get today's date
  const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getToday());
  const [searchTerm, setSearchTerm] = useState('');
  const [availableDoctypes, setAvailableDoctypes] = useState([]);
  const [billableFilter, setBillableFilter] = useState('all'); // 'all', 'billable', 'non-billable'
  const [selectedGroupFilters, setSelectedGroupFilters] = useState([]);
  const [documentsByGroup, setDocumentsByGroup] = useState({}); // Store documents by group ID

  // Column filter states
  const [columnFilters, setColumnFilters] = useState({
    id: '',
    filename: '',
    partner_name: '',
    tva: '',
    total_ht: '',
    total_ttc: ''
  });

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
  const [activeTab, setActiveTab] = useState('report'); // 'report', 'ocr', 'actions'
  const [ocrText, setOcrText] = useState('');
  const [documentFileUrl, setDocumentFileUrl] = useState(''); // For File tab
  const [documentFileType, setDocumentFileType] = useState(''); // For File tab

  // Email sending states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailUsers, setEmailUsers] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [selectedEmailTypes, setSelectedEmailTypes] = useState(['document']); // Array of selected email types
  const [availableEmailTypes, setAvailableEmailTypes] = useState([]);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Sorting and export states
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

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

  // Fullscreen modal state
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);

  // Dropdown menu states
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

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
      if (response.data?.groups && response.data.groups.length > 0) {
        // Get documents from the first group (assuming a document belongs to one main group)
        const groupId = response.data.groups[0].id;
        const groupDocsResponse = await API.groups.getDocuments(groupId);
        // Fix: The backend returns { group, documents, count }, so we need to access response.data.documents
        const groupDocs = groupDocsResponse.data?.documents || [];
        // Filter out the current document
        const relatedDocs = groupDocs.filter(doc => doc.id !== documentId);
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

  // Handler for when group selection changes in the dropdown
  const handleGroupSelectionChange = async (groupId) => {
    setSelectedGroup(groupId);
    
    if (groupId) {
      try {
        // Fetch documents for the selected group
        const response = await API.groups.getDocuments(groupId);
        // Fix: The backend returns { group, documents, count }, so we need to access response.data.documents
        const groupDocs = response.data?.documents || [];
        const groupDocIds = groupDocs.map(doc => doc.id);
        
        // Update documentsByGroup state
        setDocumentsByGroup(prev => ({
          ...prev,
          [groupId]: groupDocs
        }));
        
        // Auto-check only documents from this group that are currently visible
        const visibleDocIds = filteredDocuments.map(doc => doc.id);
        const checkableDocIds = groupDocIds.filter(id => visibleDocIds.includes(id));
        
        if (checkableDocIds.length > 0) {
          setSelectedDocuments(checkableDocIds);
        } else {
          // If no documents from this group are visible, clear selection
          setSelectedDocuments([]);
        }
      } catch (error) {
        console.error('Error fetching documents for group:', groupId, error);
        // If API fails, clear selection
        setSelectedDocuments([]);
      }
    } else {
      // If no group selected, clear selected documents
      setSelectedDocuments([]);
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
    // Close fullscreen modal if open
    if (isFullscreenModalOpen) {
      closeFullscreenModal();
    }
    
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
    setSelectedEmailTypes(['document']);
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

    if (selectedEmailTypes.length === 0) {
      setEmailError('Veuillez sélectionner au moins un type de fichier à envoyer');
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
        email_type: selectedEmailTypes,
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
      
      // Set default date range to first day of current month and today
      setStartDate(getFirstDayOfMonth());
      setEndDate(getToday());
    }
  }, [selectedCompany]);

  // Pre-fetch documents for all groups when groups are loaded
  useEffect(() => {
    if (groups.length > 0) {
      groups.forEach(group => {
        fetchDocumentsByGroup(group.id);
      });
    }
  }, [groups]);

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

    // Filter by billable status
    if (billableFilter !== 'all') {
      filtered = filtered.filter(doc => {
        const isBillable = doc.is_invoice === true || doc.is_invoice === 1;
        if (billableFilter === 'billable') {
          return isBillable;
        } else if (billableFilter === 'non-billable') {
          return !isBillable;
        }
        return true;
      });
    }

    // Filter by groups
    if (selectedGroupFilters.length > 0) {
      filtered = filtered.filter(doc => {
        // Check if document exists in any of the selected groups
        return selectedGroupFilters.some(groupId => {
          const groupDocs = documentsByGroup[groupId] || [];
          return groupDocs.some(groupDoc => groupDoc.id === doc.id);
        });
        });
    }

    // Filter by column filters
    Object.keys(columnFilters).forEach(column => {
      const filterValue = columnFilters[column];
      if (filterValue && filterValue.trim() !== '') {
        filtered = filtered.filter(doc => {
          const docValue = doc[column];
          if (docValue === null || docValue === undefined) return false;
          
          const lowerFilterValue = filterValue.toLowerCase();
          const lowerDocValue = String(docValue).toLowerCase();
          
          return lowerDocValue.includes(lowerFilterValue);
        });
      }
    });
    
    setFilteredDocuments(filtered);
  }, [documents, searchTerm, selectedDoctypeFilters, selectedDoctype, startDate, endDate, billableFilter, selectedGroupFilters, documentsByGroup, columnFilters]);

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

  const handleBillableFilterChange = (value) => {
    setBillableFilter(value);
  };

  const handleGroupFilterChange = async (groupId) => {
    const isAdding = !selectedGroupFilters.includes(groupId);
    
    // Update selected group filters
    setSelectedGroupFilters(prev => 
      isAdding 
        ? [...prev, groupId]
        : prev.filter(id => id !== groupId)
    );
    
    // If adding a group, fetch its documents
    if (isAdding) {
      try {
        const response = await API.groups.getDocuments(groupId);
        const groupDocs = response.data?.documents || [];
        
        // Update documentsByGroup state
        setDocumentsByGroup(prev => ({
          ...prev,
          [groupId]: groupDocs
        }));
        
        // Auto-check documents from this group that are currently visible
        const visibleDocIds = filteredDocuments.map(doc => doc.id);
        const checkableDocIds = groupDocs
          .map(doc => doc.id)
          .filter(id => visibleDocIds.includes(id));
        
        setSelectedDocuments(prev => [
          ...new Set([...prev, ...checkableDocIds])
        ]);
      } catch (error) {
        console.error('Error fetching documents for group:', error);
      }
    }
  };

  // Reset all filters and sorting
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDoctypeFilters([]);
    setStartDate(getFirstDayOfMonth());
    setEndDate(getToday());
    setBillableFilter('all');
    setSelectedGroupFilters([]);
    setColumnFilters({
      id: '',
      filename: '',
      partner_name: '',
      tva: '',
      total_ht: '',
      total_ttc: ''
    });
    setSortConfig({ key: null, direction: 'asc' });
  };

  // Handle column filter change
  const handleColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Function to fetch documents by group
  const fetchDocumentsByGroup = async (groupId) => {
    try {
      console.log(`Fetching documents for group ${groupId}...`);
      
      // Check if the group exists first
      const groupExists = groups.find(g => g.id === groupId);
      if (!groupExists) {
        console.warn(`Group ${groupId} does not exist in the groups list`);
        setDocumentsByGroup(prev => ({
          ...prev,
          [groupId]: []
        }));
        return;
      }
      
      const response = await API.groups.getDocuments(groupId);
      // Fix: The backend returns { group, documents, count }, so we need to access response.data.documents
      const groupDocs = response.data?.documents || [];
      console.log(`Group ${groupId} has ${groupDocs.length} documents:`, groupDocs.map(doc => ({ id: doc.id, filename: doc.filename })));
      
      setDocumentsByGroup(prev => ({
        ...prev,
        [groupId]: groupDocs
      }));
    } catch (error) {
      console.error('Error fetching documents for group:', groupId, error);
      
      // Log more detailed error information
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      
      // Set empty array for this group to prevent further errors
      setDocumentsByGroup(prev => ({
        ...prev,
        [groupId]: []
      }));
    }
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

  // Function to format currency values
  const formatCurrency = (value) => {
    if (!value || isNaN(parseFloat(value))) return '-';
    return parseFloat(value).toFixed(2) + '€';
  };

  // Function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return '-';
    }
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
    // Close fullscreen modal if open
    if (isFullscreenModalOpen) {
      closeFullscreenModal();
    }
    
    try {
      const [documentResponse, ocrResponse] = await Promise.all([
        API.documents.download(doc.id),
        API.documents.getOcrText(doc.id).catch(() => null) // Don't fail if OCR not available
      ]);
      
      if (documentResponse.status !== 200) {
        if (documentResponse.status === 404) {
          alert('Document non disponible.');
          return;
        }
        throw new Error('Network response was not ok');
      }
      
      const blob = documentResponse.data;
      const url = window.URL.createObjectURL(blob);
      const ext = doc.filename.split('.').pop().toLowerCase();
      let type = '';
      if (["pdf"].includes(ext)) type = 'pdf';
      else if (["jpg","jpeg","png","gif","tiff","bmp","webp"].includes(ext)) type = 'image';
      else if (["txt"].includes(ext)) type = 'text';
      else type = 'other';
      
      // Handle OCR text if available
      if (ocrResponse && ocrResponse.status === 200) {
        const reader = new FileReader();
        reader.onload = function(e) {
          setOcrText(e.target.result);
        };
        reader.readAsText(ocrResponse.data);
      } else {
        setOcrText(''); // Clear OCR text if not available
      }
      
      setPreviewType(type);
      setPreviewUrl(url);
      setPreviewTitle(doc.filename);
      setPreviewText('');
      setCurrentDocument(doc);
      setActiveTab('report'); // Reset to default tab
      
      // Fetch related documents
      await fetchRelatedDocuments(doc.id);
      
      setIsPreviewModalOpen(true);
    } catch (error) {
      console.error('View failed:', error);
      alert('Échec de l\'ouverture. Veuillez réessayer.');
    }
  };

  // Update handleViewRapport to open enhanced modal with tabs
  const handleViewRapport = async (doc) => {
    // Close fullscreen modal if open
    if (isFullscreenModalOpen) {
      closeFullscreenModal();
    }
    
    try {
      const [rapportResponse, ocrResponse, documentResponse] = await Promise.all([
        API.documents.getRapport(doc.id),
        API.documents.getOcrText(doc.id).catch(() => null), // Don't fail if OCR not available
        API.documents.download(doc.id).catch(() => null) // Don't fail if document not available
      ]);
      
      if (rapportResponse.status !== 200) {
        if (rapportResponse.status === 404) {
          alert('Rapport non disponible pour ce document.');
          return;
        }
        throw new Error('Network response was not ok');
      }
      
      const rapportBlob = rapportResponse.data;
      const rapportUrl = window.URL.createObjectURL(rapportBlob);
      
      // Handle OCR text if available
      if (ocrResponse && ocrResponse.status === 200) {
        const reader = new FileReader();
        reader.onload = function(e) {
          setOcrText(e.target.result);
        };
        reader.readAsText(ocrResponse.data);
      }
      
      // Handle document file if available (for File tab)
      if (documentResponse && documentResponse.status === 200) {
        const documentBlob = documentResponse.data;
        const documentUrl = window.URL.createObjectURL(documentBlob);
        const ext = doc.filename.split('.').pop().toLowerCase();
        let type = '';
        if (["pdf"].includes(ext)) type = 'pdf';
        else if (["jpg","jpeg","png","gif","tiff","bmp","webp"].includes(ext)) type = 'image';
        else if (["txt"].includes(ext)) type = 'text';
        else type = 'other';
        
        setDocumentFileType(type);
        setDocumentFileUrl(documentUrl);
      }
      
      // Set report data for the main display
      setPreviewType('pdf');
      setPreviewUrl(rapportUrl + '#toolbar=0&navpanes=0&scrollbar=0');
      setPreviewTitle(doc.filename.replace(/\.[^/.]+$/, '') + '_rapport.pdf');
      setPreviewText('');
      setCurrentDocument(doc);
      setActiveTab('report');
      
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
    // Close fullscreen modal if open
    if (isFullscreenModalOpen) {
      closeFullscreenModal();
    }
    
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

  // New function to handle context-aware downloads based on active tab
  const handleContextDownload = async () => {
    if (!currentDocument) return;
    
    // If viewing a report (has tabs), download based on active tab
    if (previewTitle.includes('_rapport.pdf')) {
      switch (activeTab) {
        case 'report':
          await handleRapportDownload(currentDocument);
          break;
        case 'ocr':
          await handleOcrTextDownload(currentDocument);
          break;
        case 'actions':
          await handleDownload(currentDocument);
          break;
        default:
          await handleDownload(currentDocument);
      }
    } else {
      // For regular documents, download the document
      await handleDownload(currentDocument);
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
    const filename = getSelectedEmailFilename(selectedEmailTypes, currentDocument);
    setDisplayedEmailFilename(filename);
    setEmailSubject(`Document: ${filename}`);
  }, [selectedEmailTypes, currentDocument]);

  // Helper to get the filename for the selected email type
  function getSelectedEmailFilename(types, doc) {
    if (!doc) return '';
    if (types.length === 0) return doc.filename;
    if (types.length === 1) {
      if (types.includes('rapport') && doc.rapport) {
      return doc.rapport.split(/[\\/]/).pop();
      } else if (types.includes('ocr_text') && doc.ocr_text) {
      return doc.ocr_text.split(/[\\/]/).pop();
    } else {
      return doc.filename;
      }
    } else {
      // Multiple types selected - show a summary
      const typeLabels = types.map(type => {
        if (type === 'document') return 'Document';
        if (type === 'rapport') return 'Rapport';
        if (type === 'ocr_text') return 'OCR';
        return type;
      });
      return `${doc.filename} (${typeLabels.join(', ')})`;
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

  // Effect to set partner when partners are loaded and document is set
  useEffect(() => {
    if (editingDocument && editPartners.length > 0) {
      const selectedPartnerId = editingDocument.partner_id != null ? String(editingDocument.partner_id) : '';
      console.log('Setting partner in useEffect:', selectedPartnerId);
      console.log('Available partners:', editPartners.map(p => ({ id: p.id, name: p.company_name })));
      console.log('Editing document partner_id:', editingDocument.partner_id);
      
      // Only set if the partner_id is not already set correctly
      setEditForm(prev => {
        if (prev.partner_id !== selectedPartnerId) {
          console.log('Updating partner_id from', prev.partner_id, 'to', selectedPartnerId);
          return {
            ...prev,
            partner_id: selectedPartnerId
          };
        }
        return prev;
      });
    }
  }, [editingDocument, editPartners]);

  // Open edit modal and prefill fields
  const handleEditDocument = async (doc) => {
    console.log('=== handleEditDocument called ===');
    console.log('Document to edit:', doc);
    console.log('Document partner_id:', doc.partner_id, 'Type:', typeof doc.partner_id);
    
    // Close fullscreen modal if open
    if (isFullscreenModalOpen) {
      closeFullscreenModal();
    }
    
    setEditingDocument(doc);
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(true);
    setIsEditLoading(true);
    
    // Set initial form data
    setEditForm({
      filename: doc.filename || '',
      partner_id: '', // Will be set by useEffect when partners are loaded
      is_invoice: false,
      invoice_number: '',
      date: '',
      total_ht: '',
      tva: '',
      total_ttc: '',
    });
    
    try {
      // Fetch partners for the document's company
      const partnersRes = await API.partner.getByCompany(doc.company_id);
      let partnersList = partnersRes.data || [];
      console.log('Fetched partners for company:', partnersList);
      
      // If the partner_id is set but not in the list, fetch it and add to the list
      if (doc.partner_id && !partnersList.some(p => String(p.id) === String(doc.partner_id))) {
        console.log('Partner not in list, fetching individually...');
        try {
          const partnerRes = await API.partner.getById(doc.partner_id);
          if (partnerRes.data) {
            partnersList = [...partnersList, partnerRes.data];
            console.log('Added partner to list:', partnerRes.data);
          }
        } catch (e) { 
          console.log('Error fetching individual partner:', e);
      }
      }
      
      setEditPartners(partnersList);
      console.log('Final partners list:', partnersList);
      
      // Set partner immediately after partners are loaded
      const selectedPartnerId = doc.partner_id != null ? String(doc.partner_id) : '';
      console.log('Setting partner immediately:', selectedPartnerId);
      setEditForm(prev => ({
        ...prev,
        partner_id: selectedPartnerId
      }));
    } catch (e) {
      console.log('Error in handleEditDocument:', e);
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
    if (field === 'filename') {
      // Preserve the original file extension
      const originalExt = editingDocument?.filename?.split('.').pop();
      if (originalExt && !value.endsWith('.' + originalExt)) {
        // Remove any existing extension and add the original one
        const nameWithoutExt = value.split('.').slice(0, -1).join('.');
        value = nameWithoutExt + '.' + originalExt;
      }
    }
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
    // Close fullscreen modal if open
    if (isFullscreenModalOpen) {
      closeFullscreenModal();
    }
    
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

  // Fullscreen modal functions
  const openFullscreenModal = () => {
    setIsFullscreenModalOpen(true);
  };

  const closeFullscreenModal = () => {
    setIsFullscreenModalOpen(false);
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

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedDocuments = [...filteredDocuments].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];

      // Handle different data types
      if (key === 'id') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      } else if (key === 'total_ttc' || key === 'total_ht' || key === 'tva') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (key === 'date_facture' || key === 'upload_date') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setFilteredDocuments(sortedDocuments);
  };

  // Export function
  const handleExport = (type) => {
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'filename', label: 'Document' },
      { key: 'partner_name', label: 'Partner' },
      { key: 'date_facture', label: 'Date Facture' },
      { key: 'upload_date', label: 'Date Upload' },
      { key: 'tva', label: 'TVA' },
      { key: 'total_ht', label: 'HT' },
      { key: 'total_ttc', label: 'TTC' }
    ];

    const data = filteredDocuments.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      partner_name: doc.partner_name || '',
      date_facture: doc.date_facture ? formatDate(doc.date_facture) : '',
      upload_date: doc.upload_date ? formatDate(doc.upload_date) : '',
      tva: doc.tva ? formatCurrency(doc.tva) : '',
      total_ht: doc.total_ht ? formatCurrency(doc.total_ht) : '',
      total_ttc: doc.total_ttc ? formatCurrency(doc.total_ttc) : ''
    }));

    if (type === 'csv') exportToCSV(data, columns, 'documents.csv');
    if (type === 'json') exportToJSON(data, 'documents.json');
    if (type === 'txt') exportToTXT(data, columns, 'documents.txt');
    if (type === 'excel') exportToExcel(data, columns, 'documents.xls');
  };

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    }
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [exportMenuOpen]);

  // Check if there are any active filters
  const hasActiveFilters = () => {
    // Check column filters
    const hasColumnFilters = Object.values(columnFilters).some(value => value && value.trim() !== '');
    
    // Check date filters (if they're different from default)
    const defaultStartDate = getFirstDayOfMonth();
    const defaultEndDate = getToday();
    const hasDateFilters = startDate !== defaultStartDate || endDate !== defaultEndDate;
    
    // Check other filters
    const hasOtherFilters = selectedDoctypeFilters.length > 0 || 
                           (billableFilter !== '' && billableFilter !== 'all') || 
                           selectedGroupFilters.length > 0;
    
    return hasColumnFilters || hasDateFilters || hasOtherFilters;
  };

  // Get the appropriate no data message
  const getNoDataMessage = () => {
    if (documents.length === 0) {
      return "Il n'y a pas de données";
    } else if (hasActiveFilters()) {
      return "Aucune donnée ne correspond aux filtres actuels";
    } else {
      return "Il n'y a pas de données";
    }
  };

  if (!selectedCompany && !selectedDoctype) {
    return <WelcomePanel user={user} />;
  }

  return (
    <div className="container-fluid py-4">
      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
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
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}
      
      {/* Search and Filter Section - MODIFIED to include Upload Button */}
      <div className="card mb-4 search-filter-container" style={{height:'210px', maxHeight: '210px', marginTop: '-20px'}}>
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h2 className="h6 mb-0">Recherche & Filtres</h2>
            <div className="d-flex gap-2" style={{ marginTop: '0.5rem' }}>
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
          
          {/* All Filters Displayed Next to Each Other */}
          <div className="d-flex gap-4 flex-wrap" style={{width:'1000px'}}>
          {/* Document Type Filters - Only show when no specific doctype is selected */}
          {!selectedDoctype && availableDoctypes.length > 0 && (
              <div style={{ width: '300px', minWidth: '300px' }} className="mb-3">
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

            {/* Billable Filter - Show for both company and doctype archives */}
            {(selectedCompany || selectedDoctype) && (
              <div style={{ width: '300px', minWidth: '300px' }} className="mb-3">
                <h6 className="mb-2 small">Statut de facturation</h6>
                <div className="d-flex flex-wrap gap-2">
                  <div className="form-check form-check-sm">
                    <input 
                      type="radio" 
                      className="form-check-input" 
                      id="filter-billable-all"
                      name="billableFilter"
                      value="all"
                      checked={billableFilter === 'all'}
                      onChange={(e) => handleBillableFilterChange(e.target.value)}
                    />
                    <label 
                      className="form-check-label text-muted small" 
                      htmlFor="filter-billable-all"
                    >
                      Tous
                    </label>
                  </div>
                  <div className="form-check form-check-sm">
                    <input 
                      type="radio" 
                      className="form-check-input" 
                      id="filter-billable-billable"
                      name="billableFilter"
                      value="billable"
                      checked={billableFilter === 'billable'}
                      onChange={(e) => handleBillableFilterChange(e.target.value)}
                    />
                    <label 
                      className="form-check-label text-muted small" 
                      htmlFor="filter-billable-billable"
                    >
                      Facturable
                    </label>
                  </div>
                  <div className="form-check form-check-sm">
                    <input 
                      type="radio" 
                      className="form-check-input" 
                      id="filter-billable-non-billable"
                      name="billableFilter"
                      value="non-billable"
                      checked={billableFilter === 'non-billable'}
                      onChange={(e) => handleBillableFilterChange(e.target.value)}
                    />
                    <label 
                      className="form-check-label text-muted small" 
                      htmlFor="filter-billable-non-billable"
                    >
                      Non facturable
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Groups Filter - Show for both company and doctype archives */}
            {(selectedCompany || selectedDoctype) && (
              <div style={{ width: '300px', minWidth: '300px' }} className="mb-3">
                <h6 className="mb-2 small">Groupes</h6>
                <div className="d-flex flex-wrap gap-2">
                  {groups.map((group) => (
                    <div key={group.id} className="form-check form-check-sm">
                      <input 
                        type="checkbox" 
                        className="form-check-input" 
                        id={`filter-group-${group.id}`}
                        checked={selectedGroupFilters.includes(group.id)}
                        onChange={() => handleGroupFilterChange(group.id)}
                      />
                      <label 
                        className="form-check-label text-muted small" 
                        htmlFor={`filter-group-${group.id}`}
                      >
                        {group.name}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          )}
          </div>
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
                
          </div>
        </div>
      </div>

          {/* Group management buttons - moved higher */}
          <div className="d-flex justify-content-end" style={{ marginTop: '-3rem' }}>
              <div className="d-flex gap-2">
                {!isGroupMode && (
                  <>
                    <button 
                      className="btn btn-sm d-flex align-items-center"
                      onClick={handleAddToGroup}
                      style={{backgroundColor: '#198754', color: 'white', border: '1px solid #198754'}}
                    >
                      <i className="bi bi-plus-circle me-1"></i> Ajouter au groupe
                    </button>
                    <button 
                      className="btn btn-sm d-flex align-items-center"
                      onClick={handleCreateGroup}
                      style={{backgroundColor: '#198754', color: 'white', border: '1px solid #198754'}}
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
                          onChange={(e) => handleGroupSelectionChange(e.target.value)}
                          required
                        >
                          <option value="">Sélectionner un groupe</option>
                          {groups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                        </select>
                        <button 
                          className="btn btn-sm"
                          onClick={handleConfirmAddToGroup}
                          style={{backgroundColor: '#198754', color: 'white', border: '1px solid #198754'}}
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
                          className="btn btn-sm"
                          onClick={handleConfirmCreateGroup}
                          style={{backgroundColor: '#198754', color: 'white', border: '1px solid #198754'}}
                        >
                          Confirmer
                        </button>
                      </>
                    )}
                    
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={handleCancelGroupAction}
                      style={{backgroundColor: '#6c757d', color: 'white'}}
                    >
                      Annuler
                    </button>
                  </div>
                )}
            </div>
          </div>
          
          {/* Group action messages */}
          {isGroupMode && (
            <div className="mt-2">
              {groupError && (
                <div className="alert alert-danger alert-sm py-2">{groupError}</div>
              )}
              {groupSuccess && (
                <div className="alert alert-success alert-sm py-2">{groupSuccess}</div>
              )}
            </div>
          )}
          

        </div>
      </div>

      {/* Documents Table */}
      <div className="card" style={{ position: 'relative' }}>
        <div className="card-body">
          {/* Breadcrumb and Title Section */}
          <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom">
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
              
              {/* Export and Reset buttons */}
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-secondary btn-sm d-flex align-items-center"
                  onClick={handleResetFilters}
                  style={{ backgroundColor: 'gray', color: 'white' }}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i> Reset Filter
                </button>
                <div style={{ position: 'relative' }}>
                  <button 
                    className="btn btn-blue btn-sm d-flex align-items-center"
                    onClick={() => setExportMenuOpen(v => !v)}
                    style={{ backgroundColor: '#1976d2', color: 'white' }}
                  >
                    <i className="bi bi-download me-1"></i> Export ▼
                  </button>
                  {exportMenuOpen && (
                    <ul ref={exportMenuRef} style={{
                      position: 'absolute',
                      top: '110%',
                      right: 0,
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      zIndex: 99999,
                      minWidth: '140px',
                      padding: 0,
                      margin: 0,
                      listStyle: 'none',
                    }}>
                      <li style={{padding: '8px 16px', cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease'}} onMouseOver={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#1976d2'; }} onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'inherit'; }} onClick={() => { handleExport('csv'); setExportMenuOpen(false); }}>CSV</li>
                      <li style={{padding: '8px 16px', cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease'}} onMouseOver={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#1976d2'; }} onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'inherit'; }} onClick={() => { handleExport('json'); setExportMenuOpen(false); }}>JSON</li>
                      <li style={{padding: '8px 16px', cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease'}} onMouseOver={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#1976d2'; }} onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'inherit'; }} onClick={() => { handleExport('txt'); setExportMenuOpen(false); }}>TXT</li>
                      <li style={{padding: '8px 16px', cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease'}} onMouseOver={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#1976d2'; }} onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'inherit'; }} onClick={() => { handleExport('excel'); setExportMenuOpen(false); }}>Excel</li>
                    </ul>
                  )}
                </div>
                {/* Fullscreen Button */}
                <button 
                  className="btn btn-sm d-flex align-items-center"
                  onClick={openFullscreenModal}
                  title="Afficher en plein écran"
                  aria-label="Afficher en plein écran"
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: '#ced4da', // Bordure grise standard
                    color: '#6c757d',       // Couleur du texte/icône grise
                    transition: 'background-color 0.2s ease, color 0.2s ease'
                  }}
                  // Effet de survol
                  onMouseOver={e => {
                    e.currentTarget.style.backgroundColor = '#6c757d';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6c757d';
                  }}
                >
                  <FullscreenIcon width="16" height="16" fill="currentColor" />
                </button>
              </div>
            </div>
          </div>
          

          
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive documents-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="table table-hover stylish-table" style={{ width: '100%' }}>
                <thead className="table-header-sticky">
                  <tr>
                      <th style={{ width: '20px', minWidth: '20px', maxWidth: '20px' }}>
                      {isGroupMode && (
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
                    )}
                    </th>
                    <th style={{cursor:'pointer', background: sortConfig.key === 'id' ? '#f0f4fa' : undefined, color: sortConfig.key === 'id' ? '#1976d2' : undefined}} onClick={() => handleSort('id')}>
                      ID <span style={{fontSize:'1em'}}>{sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                    <th>Actions</th>
                    <th style={{cursor:'pointer', background: sortConfig.key === 'filename' ? '#f0f4fa' : undefined, color: sortConfig.key === 'filename' ? '#1976d2' : undefined}} onClick={() => handleSort('filename')}>
                      Document <span style={{fontSize:'1em'}}>{sortConfig.key === 'filename' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                    <th>Facturable</th>
                    <th>Rapport</th>
                    <th style={{cursor:'pointer', background: sortConfig.key === 'partner_name' ? '#f0f4fa' : undefined, color: sortConfig.key === 'partner_name' ? '#1976d2' : undefined}} onClick={() => handleSort('partner_name')}>
                      Partner <span style={{fontSize:'1em'}}>{sortConfig.key === 'partner_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                    <th style={{cursor:'pointer', background: sortConfig.key === 'date_facture' ? '#f0f4fa' : undefined, color: sortConfig.key === 'date_facture' ? '#1976d2' : undefined}} onClick={() => handleSort('date_facture')}>
                      Date Facture <span style={{fontSize:'1em'}}>{sortConfig.key === 'date_facture' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                    <th style={{cursor:'pointer', background: sortConfig.key === 'upload_date' ? '#f0f4fa' : undefined, color: sortConfig.key === 'upload_date' ? '#1976d2' : undefined}} onClick={() => handleSort('upload_date')}>
                      Date Upload <span style={{fontSize:'1em'}}>{sortConfig.key === 'upload_date' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                    <th style={{cursor:'pointer', background: sortConfig.key === 'tva' ? '#f0f4fa' : undefined, color: sortConfig.key === 'tva' ? '#1976d2' : undefined}} onClick={() => handleSort('tva')}>
                      TVA <span style={{fontSize:'1em'}}>{sortConfig.key === 'tva' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                    <th style={{cursor:'pointer', background: sortConfig.key === 'total_ht' ? '#f0f4fa' : undefined, color: sortConfig.key === 'total_ht' ? '#1976d2' : undefined}} onClick={() => handleSort('total_ht')}>
                      HT <span style={{fontSize:'1em'}}>{sortConfig.key === 'total_ht' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                    <th style={{cursor:'pointer', background: sortConfig.key === 'total_ttc' ? '#f0f4fa' : undefined, color: sortConfig.key === 'total_ttc' ? '#1976d2' : undefined, textAlign: 'right'}} onClick={() => handleSort('total_ttc')}>
                      TTC <span style={{fontSize:'1em'}}>{sortConfig.key === 'total_ttc' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                  </tr>
                  {/* Filter Row */}
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ width: '20px', minWidth: '20px', maxWidth: '20px' }}></th>
                    <th>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Filter ID..."
                        value={columnFilters.id}
                        onChange={(e) => handleColumnFilterChange('id', e.target.value)}
                      />
                    </th>
                    <th></th>
                    <th>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Filter Document..."
                        value={columnFilters.filename}
                        onChange={(e) => handleColumnFilterChange('filename', e.target.value)}
                      />
                    </th>
                    <th></th>
                    <th></th>
                    <th>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Filter Partner..."
                        value={columnFilters.partner_name}
                        onChange={(e) => handleColumnFilterChange('partner_name', e.target.value)}
                      />
                    </th>
                    <th></th>
                    <th></th>
                    <th>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Filter TVA..."
                        value={columnFilters.tva}
                        onChange={(e) => handleColumnFilterChange('tva', e.target.value)}
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Filter HT..."
                        value={columnFilters.total_ht}
                        onChange={(e) => handleColumnFilterChange('total_ht', e.target.value)}
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Filter TTC..."
                        value={columnFilters.total_ttc}
                        onChange={(e) => handleColumnFilterChange('total_ttc', e.target.value)}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.length > 0 ? (
                    <>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className={selectedDocuments.includes(doc.id) ? 'selected' : ''}>
                        <td>
                        {isGroupMode && (
                          <div className="form-check">
                          <input 
                            className="form-check-input"
                              type="checkbox"
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={() => handleDocumentSelection(doc.id)}
                          />
                          </div>
                        )}
                      </td>
                      <td className="text-muted">{doc.id}</td>
                      <td>
                        <div className="dropdown" style={{ position: 'relative' }}>
                          <button 
                            className="btn btn-sm p-1"
                            type="button" 
                            onClick={() => setOpenDropdownId(openDropdownId === doc.id ? null : doc.id)}
                            style={{ 
                              background: 'none',
                              border: 'none',
                              fontSize: '16px',
                              color: '#6c757d',
                              cursor: 'pointer'
                            }}
                            title="Actions"
                          >
                            ⋮
                          </button>
                          {openDropdownId === doc.id && (
                            <div 
                              className="dropdown-menu show" 
                              style={{ 
                            position: 'absolute',
                                top: '100%',
                                right: 0,
                                left: 'auto',
                                zIndex: 1000,
                                minWidth: '150px',
                                fontSize: '14px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                backgroundColor: 'white'
                              }}
                            >
                              <button 
                                className="dropdown-item d-flex align-items-center"
                                onClick={() => { 
                                  setOpenDropdownId(null);
                                  setIsPreviewModalOpen(false); 
                                  handleSendEmail(doc); 
                                }}
                                style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
                              >
                                <i className="bi bi-envelope me-2"></i>
                                Envoyer
                              </button>
                              <button 
                                className="dropdown-item d-flex align-items-center"
                                onClick={() => { 
                                  setOpenDropdownId(null);
                                  handleEditDocument(doc); 
                                }}
                                style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
                              >
                                <i className="bi bi-pencil-square me-2"></i>
                                Modifier
                              </button>
                              <hr className="dropdown-divider" style={{ margin: '4px 0' }} />
                              <button 
                                className="dropdown-item d-flex align-items-center text-danger"
                                onClick={() => { 
                                  setOpenDropdownId(null);
                                  handleDeleteDocument(doc); 
                                }}
                                style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', color: '#dc3545' }}
                              >
                                <i className="bi bi-trash me-2"></i>
                                Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
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
                      <td>
                        <span 
                          style={{ 
                            color: doc.is_invoice ? '#28a745' : '#dc3545',
                            fontWeight: 'bold'
                          }}
                        >
                          {doc.is_invoice ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td>
                        <div className="extracted-data-cell">
                            <div className="btn-group" role="group">
                              <button
                                className="btn btn-sm btn-outline-blue"
                                style={{ padding: '10px 24px', fontSize: '1.15em', fontWeight: 600 }}
                              onClick={() => doc.rapport ? handleViewRapport(doc) : handleViewDocument(doc)}
                              title={doc.rapport ? "Voir le rapport PDF" : "Voir le document"}
                              >
                                Voir
                              </button>
                            </div>
                        </div>
                      </td>
                      <td>{doc.partner_name || '-'}</td>
                      <td>{formatDate(doc.invoice_date)}</td>
                      <td>{formatDate(doc.created_at)}</td>
                      <td>{formatCurrency(doc.tva)}</td>
                      <td>{formatCurrency(doc.total_ht)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(doc.total_ttc)}</td>
                    </tr>
                  ))}
                
                  <tr style={{ 
                    backgroundColor: '#f8f9fa', 
                    borderTop: '2px solid #dee2e6',
                    fontWeight: 'bold'
                  }}>
                    <td colSpan="11" style={{ textAlign: 'right', padding: '12px 16px' }}>
                      <strong>Total TTC:</strong>
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      color: '#2563eb',
                      fontSize: '1.1em',
                      textAlign: 'right'
                    }}>
                      {formatCurrency(filteredDocuments
                        .filter(doc => doc.total_ttc && !isNaN(parseFloat(doc.total_ttc)))
                        .reduce((sum, doc) => sum + parseFloat(doc.total_ttc), 0)
                      )}
                    </td>
                  </tr>
                
                    </>
          ) : (
                    <tr>
                      <td colSpan="12" className="text-center py-5">
                        <div className="empty-state">
                          <i className="bi bi-search text-muted mb-3" style={{ fontSize: '3rem' }}></i>
                          <p className="text-muted mb-3">{getNoDataMessage()}</p>
                          {hasActiveFilters() ? (
                            <button 
                              className="btn btn-blue btn-sm"
                              onClick={handleResetFilters}
                            >
                              <i className="bi bi-arrow-clockwise me-1"></i>
                              Réinitialiser les filtres
                            </button>
                          ) : (
                            <button 
                              className="btn btn-blue btn-sm"
                              onClick={openUploadModal}
                            >
                              <i className="bi bi-download me-1"></i>
                              Télécharger
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
          )}       
                </tbody>
              </table>
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
                  if (documentFileUrl) window.URL.revokeObjectURL(documentFileUrl);
                  setCurrentDocument(null);
                  setRelatedDocuments([]);
                  setActiveTab('report');
                  setOcrText('');
                  setDocumentFileUrl('');
                  setDocumentFileType('');
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
              {/* Left Column - File Display with Tabs */}
              <div className="file-display-column" style={{
                flex: '1',
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #e5e7eb'
              }}>
                {/* Tabs Navigation - Show for all documents */}
                  <div className="tabs-navigation" style={{
                    padding: '16px 24px 0 24px',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: 'white'
                  }}>
                    <ul className="nav nav-tabs" style={{ borderBottom: 'none' }}>
                      <li className="nav-item">
                        <button
                          className={`nav-link ${activeTab === 'report' ? 'active' : ''}`}
                          onClick={() => setActiveTab('report')}
                          style={{
                            border: 'none',
                            alignItems: 'center',
                            backgroundColor: 'transparent',
                            color: activeTab === 'report' ? '#2563eb' : '#6b7280',
                            fontWeight: activeTab === 'report' ? '600' : '400',
                            padding: '12px 16px',
                            borderBottom: activeTab === 'report' ? '2px solid #2563eb' : '2px solid transparent'
                          }}
                        >
                          <i className="bi bi-file-earmark-pdf me-2"></i>
                          {previewTitle.includes('_rapport.pdf') ? 'Rapport' : 'Document'}
                        
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          className={`nav-link ${activeTab === 'ocr' ? 'active' : ''}`}
                          onClick={() => setActiveTab('ocr')}
                          style={{
                            border: 'none',
                            alignItems: 'center',
                            backgroundColor: 'transparent',
                            color: activeTab === 'ocr' ? '#2563eb' : '#6b7280',
                            fontWeight: activeTab === 'ocr' ? '600' : '400',
                            padding: '12px 16px',
                            borderBottom: activeTab === 'ocr' ? '2px solid #2563eb' : '2px solid transparent'
                          }}
                        >
                          <i className="bi bi-file-text me-2"></i>
                          OCR Extraits
                        </button>
                      </li>
                    {previewTitle.includes('_rapport.pdf') && (
                      <li className="nav-item">
                        <button
                          className={`nav-link ${activeTab === 'actions' ? 'active' : ''}`}
                          onClick={() => setActiveTab('actions')}
                          style={{
                            border: 'none',
                            alignItems: 'center',
                            
                            backgroundColor: 'transparent',
                            color: activeTab === 'actions' ? '#2563eb' : '#6b7280',
                            fontWeight: activeTab === 'actions' ? '600' : '400',
                            padding: '12px 16px',
                            borderBottom: activeTab === 'actions' ? '2px solid #2563eb' : '2px solid transparent'
                          }}
                        >
                          <i className="bi bi-file-earmark me-2"></i>
                          <div style={{textAlign: 'center'}}>File</div>
                          
                        </button>
                      </li>
                    )}
                    </ul>
                  </div>

                {/* Tab Content */}
                <div className="tab-content" style={{
                  flex: 1,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  {/* Show tabbed content for all documents */}
                    <>
                    {/* Document/Report Tab */}
                      {activeTab === 'report' && (
                        <div className="tab-pane active" style={{ 
                          width: '100%', 
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
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
                            <div style={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              height: '100%'
                            }}>
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
                            </div>
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
                        </div>
                      )}

                      {/* OCR Tab */}
                      {activeTab === 'ocr' && (
                        <div className="tab-pane active" style={{ 
                          width: '100%', 
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            {ocrText ? (
                              <textarea
                                value={ocrText}
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
                                  fontFamily: 'monospace',
                                  minHeight: '400px'
                                }}
                              />
                            ) : (
                              <div style={{
                                textAlign: 'center',
                                color: '#64748b',
                                padding: '40px'
                              }}>
                                <i className="bi bi-file-text" style={{
                                  fontSize: '64px',
                                  marginBottom: '16px',
                                  display: 'block'
                                }}></i>
                                <p style={{ fontSize: '18px', marginBottom: '24px' }}>
                                  Aucun texte OCR disponible pour ce document
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* File Tab - Only for invoice documents */}
                    {activeTab === 'actions' && previewTitle.includes('_rapport.pdf') && (
                        <div className="tab-pane active" style={{ 
                          width: '100%', 
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <div style={{ flex: 1, overflow: 'auto' }}>
                            {/* Document file display - same as regular document view */}
                            {documentFileType === 'pdf' && documentFileUrl && (
                              <iframe
                                src={documentFileUrl + (documentFileUrl.includes('#') ? '' : '#toolbar=0&navpanes=0&scrollbar=0')}
                                title="PDF Preview"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                  borderRadius: '8px',
                                  backgroundColor: 'white',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  minHeight: '600px'
                                }}
                              />
                            )}
                            {documentFileType === 'image' && documentFileUrl && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                alignItems: 'center',
                                minHeight: '600px'
                              }}>
                                <img
                                  src={documentFileUrl}
                                  alt={currentDocument?.filename}
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    backgroundColor: 'white'
                                  }}
                                />
                              </div>
                            )}
                            {documentFileType === 'text' && (
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
                                  fontFamily: 'monospace',
                                  minHeight: '600px'
                                }}
                              />
                            )}
                            {documentFileType === 'other' && (
                              <div style={{
                                textAlign: 'center',
                                color: '#64748b',
                                padding: '40px',
                                minHeight: '600px',
                                display: 'flex',
                                flexDirection: 'column',
                justifyContent: 'center',
                                alignItems: 'center'
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
                        </div>
                      )}
                    </>
                </div>
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



                    {/* Action Buttons Section */}
                    <div className="action-buttons" style={{
                      marginTop: 'auto',
                      paddingTop: '24px',
                      borderTop: '1px solid #e5e7eb'
                    }}>
                      <button
                        className="btn "
                        onClick={handleContextDownload}
                        style={{
                          width: '100%',
                          marginBottom: '12px',
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          backgroundColor: '#198754',
                          color: 'white'
                        }}
                      >
                        <i className="bi bi-download"></i>
                        Télécharger
                      </button>
                      
                      <button
                        className="btn "
                        onClick={() => {
                          setIsPreviewModalOpen(false); // Close the voir modal first
                          handleSendEmail(currentDocument); // Then open the email modal
                        }}
                        style={{
                          width: '100%',
                          marginBottom: '12px',
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          backgroundColor: '#2563eb',
                          
                          color: 'white'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#2563eb';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#2563eb';
                          e.target.style.color = 'white';
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
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }}>
          <div className="modal-dialog modal-lg" style={{ height: '90vh', maxHeight: '90vh', display: 'flex', alignItems: 'center' }}>
            <div className="modal-content" style={{ height: '90vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
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
                      <label className="form-label">
                        Type de fichier à envoyer
                        {selectedEmailTypes.length > 0 && (
                          <span className="badge bg-primary ms-2">{selectedEmailTypes.length} sélectionné(s)</span>
                        )}
                      </label>
                      <div className="mb-2">
                        <button 
                          type="button" 
                          className="btn btn-sm btn-primary me-2"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' , backgroundColor:'blue'}}
                          onClick={() => setSelectedEmailTypes(availableEmailTypes.map(type => type.type))}
                        >
                          Tout sélectionner
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-primary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' , backgroundColor:'blue'}}
                          onClick={() => setSelectedEmailTypes([])}
                        >
                          Tout désélectionner
                        </button>
                      </div>
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
                                  type="checkbox" 
                                  name="emailType"
                                  id={`emailType-${type.type}`}
                                  value={type.type}
                                  checked={selectedEmailTypes.includes(type.type)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedEmailTypes(prev => [...prev, type.type]);
                                    } else {
                                      setSelectedEmailTypes(prev => prev.filter(t => t !== type.type));
                                    }
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
                                className="btn btn-sm btn-primary me-2"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' , backgroundColor:'blue'}}
                                onClick={() => setSelectedRecipients(emailUsers.map(u => u.email))}
                              >
                                Tout sélectionner
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-sm btn-primary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' , backgroundColor:'blue'}}
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
                  style={{backgroundColor: 'gray'}}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleConfirmSendEmail}
                  disabled={isEmailSending || selectedRecipients.length === 0 || selectedEmailTypes.length === 0}
                  
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
                  style={{backgroundColor: '#6c757d', color: 'white'}}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSaveEditDocument}
                  disabled={isEditSaving}
                  style={{backgroundColor: '#198754', color: 'white', border: '1px solid #198754'}}
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
                  Cette action est <strong>irréversible</strong> et entraînera la suppression définitive du document.
                </p>
                {deleteError && <div className="alert alert-danger mt-3">{deleteError}</div>}
              </div>
              <div className="modal-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCloseDeleteModal}
                  disabled={isDeleting}
                  style={{backgroundColor: 'gray'}}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleConfirmDeleteDocument}
                  disabled={isDeleting}
                  style={{backgroundColor: 'orangered'}}
                >
                  {isDeleting ? (
                    'Suppression...'
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

      {/* Fullscreen Modal */}
      {isFullscreenModalOpen && (
        <div className="fullscreen-modal" onClick={closeFullscreenModal}>
          <div className="fullscreen-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
            className="fullscreen-modal-close" // Gardons la classe pour la structure
              onClick={closeFullscreenModal}
              title="Fermer le plein écran"
              aria-label="Fermer le plein écran"
            style={{
              // --- Style personnalisé ---
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: '#e7f5ff', // Fond bleu très clair
              border: 'none',
              borderRadius: '50%',   
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#007bff',      // Couleur de l'icône (bleu plus foncé)
              transition: 'background-color 0.2s ease, transform 0.2s ease'
            }}
            // Effet de survol pour une meilleure interaction
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#d0ebff'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#e7f5ff'}
          >
            {/* Remplacez <i className="bi bi-x"></i> par le nouveau composant SVG */}
            X
            </button>
            <div className="fullscreen-modal-body" style={{ overflow: 'hidden' }}>
              {isLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="table-responsive documents-table-container" style={{ height: '100%', overflow: 'auto' }}>
                  <table className="table table-hover stylish-table">
                    <thead className="table-header-sticky">
                      <tr>
                        <th style={{ width: '20px', minWidth: '20px', maxWidth: '20px' }}>
                          {isGroupMode && (
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
                          )}
                        </th>
                        <th style={{cursor:'pointer', background: sortConfig.key === 'id' ? '#f0f4fa' : undefined, color: sortConfig.key === 'id' ? '#1976d2' : undefined}} onClick={() => handleSort('id')}>
                          ID <span style={{fontSize:'1em'}}>{sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                        <th>Actions</th>
                        <th style={{cursor:'pointer', background: sortConfig.key === 'filename' ? '#f0f4fa' : undefined, color: sortConfig.key === 'filename' ? '#1976d2' : undefined}} onClick={() => handleSort('filename')}>
                          Document <span style={{fontSize:'1em'}}>{sortConfig.key === 'filename' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                        <th>Facturable</th>
                        <th>Rapport</th>
                        <th style={{cursor:'pointer', background: sortConfig.key === 'partner_name' ? '#f0f4fa' : undefined, color: sortConfig.key === 'partner_name' ? '#1976d2' : undefined}} onClick={() => handleSort('partner_name')}>
                          Partner <span style={{fontSize:'1em'}}>{sortConfig.key === 'partner_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                        <th style={{cursor:'pointer', background: sortConfig.key === 'date_facture' ? '#f0f4fa' : undefined, color: sortConfig.key === 'date_facture' ? '#1976d2' : undefined}} onClick={() => handleSort('date_facture')}>
                          Date Facture <span style={{fontSize:'1em'}}>{sortConfig.key === 'date_facture' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                        <th style={{cursor:'pointer', background: sortConfig.key === 'upload_date' ? '#f0f4fa' : undefined, color: sortConfig.key === 'upload_date' ? '#1976d2' : undefined}} onClick={() => handleSort('upload_date')}>
                          Date Upload <span style={{fontSize:'1em'}}>{sortConfig.key === 'upload_date' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                        <th style={{cursor:'pointer', background: sortConfig.key === 'tva' ? '#f0f4fa' : undefined, color: sortConfig.key === 'tva' ? '#1976d2' : undefined}} onClick={() => handleSort('tva')}>
                          TVA <span style={{fontSize:'1em'}}>{sortConfig.key === 'tva' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                        <th style={{cursor:'pointer', background: sortConfig.key === 'total_ht' ? '#f0f4fa' : undefined, color: sortConfig.key === 'total_ht' ? '#1976d2' : undefined}} onClick={() => handleSort('total_ht')}>
                          HT <span style={{fontSize:'1em'}}>{sortConfig.key === 'total_ht' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                        <th style={{cursor:'pointer', background: sortConfig.key === 'total_ttc' ? '#f0f4fa' : undefined, color: sortConfig.key === 'total_ttc' ? '#1976d2' : undefined, textAlign: 'right'}} onClick={() => handleSort('total_ttc')}>
                          TTC <span style={{fontSize:'1em'}}>{sortConfig.key === 'total_ttc' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                      </tr>
                      {/* Filter Row */}
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ width: '20px', minWidth: '20px', maxWidth: '20px' }}></th>
                        <th>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Filter ID..."
                            value={columnFilters.id}
                            onChange={(e) => handleColumnFilterChange('id', e.target.value)}
                          />
                        </th>
                        <th></th>
                        <th>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Filter Document..."
                            value={columnFilters.filename}
                            onChange={(e) => handleColumnFilterChange('filename', e.target.value)}
                          />
                        </th>
                        <th></th>
                        <th></th>
                        <th>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Filter Partner..."
                            value={columnFilters.partner_name}
                            onChange={(e) => handleColumnFilterChange('partner_name', e.target.value)}
                          />
                        </th>
                        <th></th>
                        <th></th>
                        <th>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Filter TVA..."
                            value={columnFilters.tva}
                            onChange={(e) => handleColumnFilterChange('tva', e.target.value)}
                          />
                        </th>
                        <th>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Filter HT..."
                            value={columnFilters.total_ht}
                            onChange={(e) => handleColumnFilterChange('total_ht', e.target.value)}
                          />
                        </th>
                        <th>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Filter TTC..."
                            value={columnFilters.total_ttc}
                            onChange={(e) => handleColumnFilterChange('total_ttc', e.target.value)}
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.length > 0 ? (
                        <>
                          {filteredDocuments.map((doc) => (
                            <tr key={doc.id} className={selectedDocuments.includes(doc.id) ? 'selected' : ''}>
                              <td>
                                {isGroupMode && (
                                  <div className="form-check">
                                    <input 
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={selectedDocuments.includes(doc.id)}
                                      onChange={() => handleDocumentSelection(doc.id)}
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="text-muted">{doc.id}</td>
                              <td>
                              <div className="dropdown" style={{ position: 'relative' }}>
                                  <button 
                                className="btn btn-sm p-1"
                                    type="button" 
                                    onClick={() => setOpenDropdownId(openDropdownId === doc.id ? null : doc.id)}
                                style={{ 
                                  background: 'none',
                                  border: 'none',
                                  fontSize: '16px',
                                  color: '#6c757d',
                                  cursor: 'pointer'
                                }}
                                title="Actions"
                              >
                                ⋮
                                  </button>
                              {openDropdownId === doc.id && (
                                <div 
                                  className="dropdown-menu show" 
                                  style={{ 
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    left: 'auto',
                                    zIndex: 1000,
                                    minWidth: '150px',
                                    fontSize: '14px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '6px',
                                    backgroundColor: 'white'
                                  }}
                                >
                                      <button 
                                        className="dropdown-item d-flex align-items-center"
                                        onClick={() => { 
                                          setOpenDropdownId(null);
                                          handleSendEmail(doc); 
                                        }}
                                    style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
                                      >
                                        <i className="bi bi-envelope me-2"></i>
                                        Envoyer
                                      </button>
                                      <button 
                                        className="dropdown-item d-flex align-items-center"
                                        onClick={() => { 
                                          setOpenDropdownId(null);
                                          handleEditDocument(doc); 
                                        }}
                                    style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
                                      >
                                        <i className="bi bi-pencil-square me-2"></i>
                                        Modifier
                                      </button>
                                  <hr className="dropdown-divider" style={{ margin: '4px 0' }} />
                                      <button 
                                        className="dropdown-item d-flex align-items-center text-danger"
                                        onClick={() => { 
                                          setOpenDropdownId(null);
                                          handleDeleteDocument(doc); 
                                        }}
                                    style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', color: '#dc3545' }}
                                      >
                                        <i className="bi bi-trash me-2"></i>
                                        Supprimer
                                      </button>
                                </div>
                              )}
                                </div>
                              </td>
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
                              <td>
                                <span 
                                  style={{ 
                                    color: doc.is_invoice ? '#28a745' : '#dc3545',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {doc.is_invoice ? 'Oui' : 'Non'}
                                </span>
                              </td>
                              <td>
                                <div className="extracted-data-cell">
                                  <div className="btn-group" role="group">
                                    <button
                                      className="btn btn-sm btn-outline-blue"
                                      style={{ padding: '10px 24px', fontSize: '1.15em', fontWeight: 600 }}
                                      onClick={() => doc.rapport ? handleViewRapport(doc) : handleViewDocument(doc)}
                                      title={doc.rapport ? "Voir le rapport PDF" : "Voir le document"}
                                      >
                                        Voir
                                      </button>
                                  </div>
                                </div>
                              </td>
                              <td>{doc.partner_name || '-'}</td>
                              <td>{formatDate(doc.invoice_date)}</td>
                              <td>{formatDate(doc.created_at)}</td>
                              <td>{formatCurrency(doc.tva)}</td>
                              <td>{formatCurrency(doc.total_ht)}</td>
                              <td style={{ textAlign: 'right' }}>{formatCurrency(doc.total_ttc)}</td>
                            </tr>
                          ))}
                          
                          <tr style={{ 
                            backgroundColor: '#f8f9fa', 
                            borderTop: '2px solid #dee2e6',
                            fontWeight: 'bold'
                          }}>
                            <td colSpan="11" style={{ textAlign: 'right', padding: '12px 16px' }}>
                              <strong>Total TTC:</strong>
                            </td>
                            <td style={{ 
                              padding: '12px 16px', 
                              color: '#2563eb',
                              fontSize: '1.1em',
                              textAlign: 'right'
                            }}>
                              {formatCurrency(filteredDocuments
                                .filter(doc => doc.total_ttc && !isNaN(parseFloat(doc.total_ttc)))
                                .reduce((sum, doc) => sum + parseFloat(doc.total_ttc), 0)
                              )}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td colSpan="12" className="text-center py-5">
                            <div className="empty-state">
                              <i className="bi bi-search text-muted mb-3" style={{ fontSize: '3rem' }}></i>
                              <p className="mt-3 text-muted">{getNoDataMessage()}</p>
                              {hasActiveFilters() ? (
                                <button 
                                  className="btn btn-blue btn-sm"
                                  onClick={handleResetFilters}
                                >
                                  <i className="bi bi-arrow-clockwise me-1"></i>
                                  Réinitialiser les filtres
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-blue btn-sm"
                                  onClick={openUploadModal}
                                >
                                  <i className="bi bi-download me-1"></i>
                                  Télécharger
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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

