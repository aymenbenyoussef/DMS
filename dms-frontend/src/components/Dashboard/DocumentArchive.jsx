import React, { useState, useEffect, useContext, useRef } from 'react';
import Logger from '../../utils/logger';
import DragDropUpload from './DragDropUpload';
import API from '../../api';
import { AppContext } from '../context';
import WelcomePanel from './WelcomePanel';
import { useNavigate, useLocation } from 'react-router-dom';
import EditDocumentForm from './EditDocumentForm';
import { exportToCSV, exportToJSON, exportToTXT, exportToExcel } from '../Admin/exportUtils';
import { ReactComponent as FullscreenIcon } from './fullscreen.svg';
import './DocumentArchive.css';
import RapportModal from './RapportModal';
import ShareModal from './ShareModal';


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
 // Helper function to get the same day last month

const getOneMonthAgo = () => {
  const now = new Date();
  const lastMonth = new Date(now);
  lastMonth.setMonth(now.getMonth() - 1);
  // Handle month wrap-around (e.g., March 31 -> Feb 28/29)
  if (lastMonth.getMonth() === now.getMonth()) {
    // If setMonth overflowed, set to last day of previous month
    lastMonth.setDate(0);
  }
  const year = lastMonth.getFullYear();
  const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
  const day = String(lastMonth.getDate()).padStart(2, '0');
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

  // Helper function for doctype name (placeholder)
  const getDoctypeName = (doctypeId) => {
    const doctype = availableDoctypes.find(dt => dt.id === doctypeId);
    return doctype ? doctype.name : 'Inconnu';
  };

  // Helper function for document group (placeholder)
  const getDocumentGroup = (document) => {
    // This would typically involve looking up the document's group from the 'groups' state
    // For now, return a placeholder or implement actual logic if groups are available
    if (document && document.group_id) {
      const group = groups.find(g => g.id === document.group_id);
      return group ? group.name : 'Aucun groupe';
    }
    return 'Aucun groupe';
  };

  // Helper function for uploader name (placeholder)
  const getUploaderName = (document) => {
    // This would typically involve looking up the uploader's name from user data
    // For now, return a placeholder or implement actual logic if user data is available
    if (document && document.uploaded_by_user_id) {
      // You would fetch user data here, e.g., from a 'users' state or API
      return `Utilisateur ${document.uploaded_by_user_id}`;
    }
    return 'Inconnu';
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
  const location = useLocation();
  
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
  const [startDate, setStartDate] = useState(getOneMonthAgo());
  const [endDate, setEndDate] = useState(getToday());
  const [searchTerm, setSearchTerm] = useState('');
  const [availableDoctypes, setAvailableDoctypes] = useState([]);
  const [billableFilter, setBillableFilter] = useState('all'); // 'all', 'billable', 'non-billable'
  const [selectedGroupFilters, setSelectedGroupFilters] = useState([]);
  const [documentsByGroup, setDocumentsByGroup] = useState({}); // Store documents by group ID
  // IDs of documents that belong to selected group filters (used by the filter panel)
  const [groupFilterDocIds, setGroupFilterDocIds] = useState(new Set());

  // Column filter states
  const [columnFilters, setColumnFilters] = useState({
    id: '',
    filename: '',
    doctype_name: '',
    partner_name: '',
    billable: '',
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
  const [dropdownPosition, setDropdownPosition] = useState(null);

  // Filter panel collapse state
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setOpenDropdownId(null);
        setDropdownPosition(null);
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
    if (!selectedCompany) return;
    
    try {
      const response = await API.groups.getAll(selectedCompany.id);
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

    if (!selectedCompany) {
      setGroupError('Aucune compagnie sélectionnée');
      return;
    }

    try {
      // Create the group first
      const createResponse = await API.groups.create({ 
        name: newGroupName.trim(),
        company_id: selectedCompany.id
      });
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
    console.log('handleSendEmail called for document', document?.id, document?.filename);
    // Fermer le fullscreen si ouvert
    if (isFullscreenModalOpen) {
      closeFullscreenModal();
    }

    // Toujours ouvrir le modal, même si l'API échoue
    setCurrentDocument(document);
    setDisplayedEmailFilename(document.filename || '');
    setEmailSubject(`Document: ${document.filename}`);
    setEmailMessage('');
    setSelectedRecipients([]);
    setEmailSuccess('');
    setAvailableEmailTypes([]);
    setEmailUsers([]);
    setEmailError('');

    setIsEmailModalOpen(true);
    setOpenDropdownId(null);

    // Charger les infos en asynchrone, mais ne pas bloquer l'ouverture du modal
    Promise.all([
      API.email.getDocumentInfo(document.id),
      API.email.getUsersForSelection(selectedCompany?.id)
    ]).then(([docInfoResponse, usersResponse]) => {
      setAvailableEmailTypes(docInfoResponse.data.available_types || []);
      setEmailUsers(usersResponse.data.users || []);
    }).catch((error) => {
      setEmailError("Erreur lors de la préparation de l'email : " + (error.response?.data?.msg || error.message));
    });
  };

  // Toggle recipient by email (used by ShareModal)
  const handleRecipientToggle = (email) => {
    setSelectedRecipients(prev => {
      if (prev.includes(email)) return prev.filter(e => e !== email);
      return [...prev, email];
    });
  };

  // Format file size helper
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i += 1;
    }
    return `${size.toFixed(size >= 10 ? 0 : 2)} ${units[i]}`;
  };

  // Sorting functions
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    // Affiche toujours deux flèches (haut/bas). La flèche active est en 'text-primary', l'autre en 'text-muted'.
    const isActive = sortConfig.key === columnKey;
    return (
      <span className="d-flex flex-column align-items-center" style={{ lineHeight: 0 }}>
        <i
          className={`fas fa-sort-up ${isActive && sortConfig.direction === 'asc' ? 'text-primary' : 'text-muted'}`}
          style={{ fontSize: '0.65rem' }}
          aria-hidden="true"
        />
        <i
          className={`fas fa-sort-down ${isActive && sortConfig.direction === 'desc' ? 'text-primary' : 'text-muted'}`}
          style={{ fontSize: '0.65rem' }}
          aria-hidden="true"
        />
      </span>
    );
  };

  // Export functions
  const handleExport = (format) => {
    const dataToExport = filteredDocuments.map(doc => ({
      ID: doc.id,
      'Nom du fichier': doc.filename,
      'Type': doc.doctype_name || '',
      'Partenaire': doc.partner_name || '',
      'Facturable': (doc.total_ht > 0 || doc.total_ttc > 0) ? 'Oui' : 'Non',
      'TVA': doc.tva || '',
      'Total HT': doc.total_ht || '',
      'Total TTC': doc.total_ttc || '',
      'Date': doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''
    }));

    const filename = `documents_${new Date().toISOString().split('T')[0]}`;

    switch (format) {
      case 'csv':
        exportToCSV(dataToExport, filename);
        break;
      case 'json':
        exportToJSON(dataToExport, filename);
        break;
      case 'txt':
        exportToTXT(dataToExport, filename);
        break;
      case 'excel':
        exportToExcel(dataToExport, filename);
        break;
      default:
        console.error('Format d\'export non supporté:', format);
    }
    
    setExportMenuOpen(false);
  };

  // Filter functions
  const applyFilters = () => {
    let filtered = [...documents];

    // Apply search term filter
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

    // Apply date range filter
    if (startDate && endDate) {
      filtered = filtered.filter(doc => {
        if (!doc.created_at) return false;
        const docDate = new Date(doc.created_at).toISOString().split('T')[0];
        return docDate >= startDate && docDate <= endDate;
      });
    }

    // Apply doctype filter
    if (selectedDoctypeFilters.length > 0) {
      filtered = filtered.filter(doc =>
        selectedDoctypeFilters.includes(doc.doctype_id)
      );
    }

    // Apply billable filter (sidebar global filter)
    if (billableFilter !== 'all') {
      filtered = filtered.filter(doc => {
        const isBillable = (parseFloat(doc.total_ht || 0) > 0) || (parseFloat(doc.total_ttc || 0) > 0);
        return billableFilter === 'billable' ? isBillable : !isBillable;
      });
    }

    // Apply group filter (sidebar) - use preloaded IDs
    if (selectedGroupFilters.length > 0) {
      if (groupFilterDocIds && groupFilterDocIds.size > 0) {
        filtered = filtered.filter(doc => groupFilterDocIds.has(doc.id));
      } else {
        // If groups selected but we haven't loaded their documents yet, return empty until loaded
        filtered = [];
      }
    }

    // Apply column filters
    Object.keys(columnFilters).forEach(key => {
      const filterValue = columnFilters[key];
      if (filterValue) {
        if (key === 'billable') {
          const fv = filterValue.toString().toLowerCase();
          filtered = filtered.filter(doc => {
            const isBillable = (parseFloat(doc.total_ht || 0) > 0) || (parseFloat(doc.total_ttc || 0) > 0);
            if (fv === 'oui' || fv === 'yes' || fv === 'true') return isBillable;
            if (fv === 'non' || fv === 'no' || fv === 'false') return !isBillable;
            // Fallback to text match on computed value
            return (isBillable ? 'oui' : 'non').includes(fv);
          });
        } else {
          filtered = filtered.filter(doc => {
            const docValue = doc[key];
            if (docValue === null || docValue === undefined) return false;
            return docValue.toString().toLowerCase().includes(filterValue.toLowerCase());
          });
        }
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredDocuments(filtered);
  };

  // Apply filters whenever filter states change
  useEffect(() => {
    applyFilters();
  }, [
    documents,
    searchTerm,
    startDate,
    endDate,
    selectedDoctypeFilters,
    billableFilter,
    selectedGroupFilters,
    columnFilters,
    sortConfig,
    groupFilterDocIds
  ]);

  // When selected group filters change, prefetch document IDs for those groups
  useEffect(() => {
    if (!selectedCompany || selectedGroupFilters.length === 0) {
      setGroupFilterDocIds(new Set());
      return;
    }
    
    let cancelled = false;
    const loaders = selectedGroupFilters.map(gid =>
      API.groups.getDocuments(gid)
        .then(res => res.data?.documents?.map(d => d.id) || [])
        .catch(() => [])
    );

    Promise.all(loaders).then(results => {
      if (cancelled) return;
      const allIds = new Set(results.flat());
      setGroupFilterDocIds(allIds);
    }).catch(() => {
      if (!cancelled) setGroupFilterDocIds(new Set());
    });

    return () => { cancelled = true; };
  }, [selectedGroupFilters, selectedCompany]);

  // Load initial data
  useEffect(() => {
    if (selectedCompany) {
      fetchDocuments();
      fetchAvailableDoctypes();
      fetchGroups();
    }
  }, [selectedCompany, selectedDoctype]);

  // Calculate totals
  const calculateTotals = () => {
    return filteredDocuments.reduce((totals, doc) => {
      totals.totalTVA += parseFloat(doc.tva || 0);
      totals.totalHT += parseFloat(doc.total_ht || 0);
      totals.totalTTC += parseFloat(doc.total_ttc || 0);
      totals.count += 1;
      return totals;
    }, { totalTVA: 0, totalHT: 0, totalTTC: 0, count: 0 });
  };

  const totals = calculateTotals();

  // Handle column filter changes
  const handleColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Handle doctype filter changes
  const handleDoctypeFilterChange = (doctypeId) => {
    setSelectedDoctypeFilters(prev => {
      if (prev.includes(doctypeId)) {
        return prev.filter(id => id !== doctypeId);
      } else {
        return [...prev, doctypeId];
      }
    });
  };

  // Handle group filter changes
  const handleGroupFilterChange = (groupId) => {
    setSelectedGroupFilters(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setStartDate(getOneMonthAgo());
    setEndDate(getToday());
    setSelectedDoctypeFilters([]);
    setBillableFilter('all');
    setSelectedGroupFilters([]);
    setColumnFilters({
      id: '',
      filename: '',
      doctype_name: '',
      partner_name: '',
      billable: '',
      tva: '',
      total_ht: '',
      total_ttc: ''
    });
    setSortConfig({ key: null, direction: 'asc' });
  };

  // Dropdown management
  const handleDropdownToggle = (documentId, event) => {
    event.stopPropagation();

    if (openDropdownId === documentId) {
      setOpenDropdownId(null);
      setDropdownPosition(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const tableContainer = document.querySelector('.documents-table-container');
      const containerRect = tableContainer?.getBoundingClientRect() || { top: 0, left: 0 };

      setDropdownPosition({
        top: rect.bottom - containerRect.top,
        left: rect.left - containerRect.left - 100
      });
      setOpenDropdownId(documentId);
    }
  };

  // Preview and fullscreen functions
  const handleRapport = async (document) => {
    try {
      setCurrentDocument(document);
      setPreviewTitle(document.filename);
      // Le RapportModal n'a pas besoin de la logique de prévisualisation de fichier
      // Il utilise les props passées pour afficher les informations du document
      await fetchRelatedDocuments(document.id);
      setActiveTab('report');
      setIsModalOpen(true);
      setOpenDropdownId(null);
    } catch (error) {
      console.error('Error opening RapportModal:', error);
      alert('Erreur lors de l\'ouverture du rapport');
    }
  };

  const closeRapportModal = () => {
    setIsModalOpen(false);
    setCurrentDocument(null);
    setPreviewTitle("");
    setRelatedDocuments([]);
    setActiveTab("report");
  };

  const openFullscreenModal = () => {
    setIsFullscreenModalOpen(true);
  };

  const closeFullscreenModal = () => {
    setIsFullscreenModalOpen(false);
  };

  // Edit document functions
  const handleEditDocument = (document) => {
    setEditingDocument(document);
    setIsEditModalOpen(true);
    setEditError('');
    setEditSuccess('');
    setOpenDropdownId(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingDocument(null);
    setEditError('');
    setEditSuccess('');
  };

  const handleSaveEdit = async (updatedDocument) => {
    setIsEditSaving(true);
    setEditError('');

    try {
      await API.documents.update(editingDocument.id, updatedDocument);
      setEditSuccess('Document mis à jour avec succès');

      // Refresh documents list
      fetchDocuments();

      setTimeout(() => {
        handleCloseEditModal();
      }, 1200);
    } catch (error) {
      setEditError(error.response?.data?.msg || 'Erreur lors de la mise à jour du document');
    } finally {
      setIsEditSaving(false);
    }
  };

  // Delete document functions
  const handleDeleteDocument = (document) => {
    setDeletingDocument(document);
    setIsDeleteModalOpen(true);
    setDeleteError('');
    setOpenDropdownId(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingDocument(null);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError('');

    try {
      await API.documents.delete(deletingDocument.id);

      // Refresh documents list
      fetchDocuments();

      handleCloseDeleteModal();
    } catch (error) {
      setDeleteError(error.response?.data?.msg || 'Erreur lors de la suppression du document');
    } finally {
      setIsDeleting(false);
    }
  };

  // Send email confirm
  const handleSendEmailConfirm = async () => {
    if (selectedRecipients.length === 0) {
      setEmailError('Veuillez sélectionner au moins un destinataire');
      return;
    }

    if (!emailSubject.trim()) {
      setEmailError('Veuillez saisir un objet');
      return;
    }

    if (selectedEmailTypes.length === 0) {
      setEmailError('Veuillez sélectionner au moins un type d\'email');
      return;
    }

    setIsEmailSending(true);
    setEmailError('');

    try {
      // Appel corrigé : envoyer l'id du document en premier paramètre puis les données
      await API.email.sendDocument(currentDocument.id, {
        recipients: selectedRecipients,
        subject: emailSubject,
        message: emailMessage,
        email_type: selectedEmailTypes
      });

      setEmailSuccess('Email envoyé avec succès');
      setTimeout(() => {
        handleCloseEmailModal();
      }, 1200);
    } catch (error) {
      setEmailError(error.response?.data?.msg || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setIsEmailSending(false);
    }
  };

  // Handler pour fermer le modal d'email (ShareModal)
  const handleCloseEmailModal = () => {
    setIsEmailModalOpen(false);
    setCurrentDocument(null);
    setDisplayedEmailFilename('');
    setSelectedRecipients([]);
    setSelectedEmailTypes([]);
    setEmailSubject('');
    setEmailMessage('');
    setEmailError('');
    setEmailSuccess('');
  };
  // Read URL parameters and set filters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const filenameParam = searchParams.get('filename');
    
    if (filenameParam) {
      // Set the filename filter
      setColumnFilters(prev => ({
        ...prev,
        filename: decodeURIComponent(filenameParam)
      }));
      
      // Clear the filename parameter from URL to avoid setting it again on refresh
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.delete('filename');
      const newUrl = location.pathname + (newSearchParams.toString() ? `?${newSearchParams.toString()}` : '');
      navigate(newUrl, { replace: true });
    }
  }, [location.search, navigate]);
  if (!selectedCompany) {
    return <WelcomePanel />;
  }

  // compute total columns dynamically (after removing the 'Type' column)
  const totalColumns = isGroupMode ? 10 : 9;

  return (
    <div className="document-archive">
      <div className="container-fluid h-100">
        <div className="row h-100">
          {/* Main Content Area - Table */}
          <div className={`col-lg-${isFilterCollapsed ? '12' : '9'} col-md-${isFilterCollapsed ? '12' : '8'} h-100 d-flex flex-column`}>
            {/* Header with Upload Button */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h4 className="mb-0 text-dark fw-bold d-flex align-items-center gap-2">
                <i className="fas fa-building me-2 text-primary"></i>
                {selectedCompany ? (
                  <>
                    <span className="text-truncate" style={{ maxWidth: '320px' }}>{selectedCompany.name}</span>
                    {selectedDoctype && (
                      <span className="badge bg-primary ms-2 fs-6">
                        {selectedDoctype.name}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-alt me-2 text-primary"></i>
                    Documents
                  </>
                )}
              </h4>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
                  title={isFilterCollapsed ? "Afficher les filtres" : "Masquer les filtres"}
                >
                  <i className={`fas fa-${isFilterCollapsed ? 'filter' : 'times'}`}></i>
                  <span className="ms-1">Filtres</span>
                </button>
                <button
                  className="btn-outline-primary btn-sm"
                  onClick={openUploadModal}
                >
                  <i className="fas fa-upload me-1"></i>
                  Télécharger
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex gap-2 mb-2 flex-column">
              <div className="d-flex gap-2">
                <button
                  className="btn-outline-primary btn-sm"
                  onClick={handleAddToGroup}
                  title="Ajouter les documents sélectionnés à un groupe"
                >
                  <i className="fas fa-plus me-1"></i>
                  Ajouter au groupe
                </button>
                <button
                  className="btn-outline-primary btn-sm"
                  onClick={handleCreateGroup}
                  title="Créer un nouveau groupe"
                >
                  <i className="fas fa-layer-group me-1"></i>
                  Créer un groupe
                </button>
                <div className="dropdown">
                  <button
                    className="btn btn-outline-secondary btn-sm dropdown-toggle"
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    ref={exportMenuRef}
                  >
                    <i className="fas fa-download me-1"></i>
                    Exporter
                  </button>
                  {exportMenuOpen && (
                    <div className="dropdown-menu show">
                      <button className="dropdown-item" onClick={() => handleExport('csv')}>
                        <i className="fas fa-file-csv me-2"></i>CSV
                      </button>
                      <button className="dropdown-item" onClick={() => handleExport('excel')}>
                        <i className="fas fa-file-excel me-2"></i>Excel
                      </button>
                      <button className="dropdown-item" onClick={() => handleExport('json')}>
                        <i className="fas fa-file-code me-2"></i>JSON
                      </button>
                      <button className="dropdown-item" onClick={() => handleExport('txt')}>
                        <i className="fas fa-file-alt me-2"></i>TXT
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline group action row shown under action buttons (does not float) */}
              {isGroupMode && (
                <div className="group-action-bar-inline d-flex align-items-center mt-2">
                  <div className="me-3 d-flex align-items-center">
                    <i className="fas fa-layer-group me-2 text-primary"></i>
                    <div>
                      <div className="small fw-bold">{groupAction === 'add' ? 'Ajouter aux groupes' : 'Créer un groupe'}</div>
                      <small className="text-muted">{selectedDocuments.length} document(s) sélectionné(s)</small>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2 me-2 flex-grow-1">
                    {groupAction === 'add' && (
                      <select
                        className="form-select form-select-sm"
                        value={selectedGroup}
                        onChange={(e) => handleGroupSelectionChange(e.target.value)}
                        style={{ width: '260px' }}
                      >
                        <option value="">Sélectionner un groupe</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {groupAction === 'create' && (
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Nom du groupe"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        style={{ width: '260px' }}
                      />
                    )}

                    <div className="ms-auto d-flex gap-2">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={groupAction === 'add' ? handleConfirmAddToGroup : handleConfirmCreateGroup}
                        disabled={
                          (groupAction === 'add' && !selectedGroup) ||
                          (groupAction === 'create' && !newGroupName.trim()) ||
                          selectedDocuments.length === 0
                        }
                      >
                        <i className="fas fa-check me-1"></i>
                        Confirmer
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={handleCancelGroupAction}
                      >
                        <i className="fas fa-times me-1"></i>
                        Annuler
                      </button>
                    </div>
                  </div>

                  {(groupError || groupSuccess) && (
                    <div className={`alert ${groupError ? 'alert-danger' : 'alert-primary'} alert-sm mb-0 ms-2`}>
                      {groupError || groupSuccess}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Documents Table */}
            <div className="documents-table-container flex-grow-1">
              <div className="table-responsive h-100">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      {isGroupMode && (
                        <th style={{ width: '40px' }}>
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

                      <th
                        style={{ width: '60px', cursor: 'pointer' }}
                        className="text-center"
                        onClick={() => handleSort('id')}
                        title="Trier par ID"
                      >
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          {getSortIcon('id')}
                          <span>ID</span>
                        </div>
                      </th>

                      <th
                        style={{ width: '200px', cursor: 'pointer' }}
                        onClick={() => handleSort('filename')}
                        title="Trier par nom de fichier"
                      >
                        <div className="d-flex align-items-center gap-1">
                          {getSortIcon('filename')}
                          <span>Fichier</span>
                        </div>
                      </th>

                      <th
                        style={{ width: '120px', cursor: 'pointer' }}
                        onClick={() => handleSort('partner_name')}
                        title="Trier par partenaire"
                      >
                        <div className="d-flex align-items-center gap-1">
                          {getSortIcon('partner_name')}
                          <span>Partenaire</span>
                        </div>
                      </th>

                      <th
                        style={{ width: '80px', cursor: 'pointer' }}
                        className="text-center"
                        onClick={() => handleSort('billable')}
                        title="Trier par facturable"
                      >
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          {getSortIcon('billable')}
                          <span>Facturable</span>
                        </div>
                      </th>

                      <th
                        style={{ width: '90px', cursor: 'pointer' }}
                        className="text-end"
                        onClick={() => handleSort('tva')}
                        title="Trier par TVA"
                      >
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          {getSortIcon('tva')}
                          <span>TVA</span>
                        </div>
                      </th>

                      <th
                        style={{ width: '90px', cursor: 'pointer' }}
                        className="text-end"
                        onClick={() => handleSort('total_ht')}
                        title="Trier par Total HT"
                      >
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          {getSortIcon('total_ht')}
                          <span>Total HT</span>
                        </div>
                      </th>

                      <th
                        style={{ width: '90px', cursor: 'pointer' }}
                        className="text-end"
                        onClick={() => handleSort('total_ttc')}
                        title="Trier par Total TTC"
                      >
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          {getSortIcon('total_ttc')}
                          <span>Total TTC</span>
                        </div>
                      </th>

                      <th
                        style={{ width: '90px', cursor: 'pointer' }}
                        className="text-center"
                        onClick={() => handleSort('created_at')}
                        title="Trier par date"
                      >
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          {getSortIcon('created_at')}
                          <span>Date</span>
                        </div>
                      </th>

                      <th style={{ width: '80px' }} className="text-center">Actions</th>
                    </tr>
                    {/* Filter Row */}
                    <tr className="bg-light">
                      {isGroupMode && <th></th>}
                      <th>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="ID..."
                          value={columnFilters.id}
                          onChange={(e) => handleColumnFilterChange('id', e.target.value)}
                        />
                      </th>
                      <th>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Nom du fichier..."
                          value={columnFilters.filename}
                          onChange={(e) => handleColumnFilterChange('filename', e.target.value)}
                        />
                      </th>
                      <th>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Partenaire..."
                          value={columnFilters.partner_name}
                          onChange={(e) => handleColumnFilterChange('partner_name', e.target.value)}
                        />
                      </th>
                      <th>
                        <select
                          className="form-select form-select-sm"
                          value={columnFilters.billable}
                          onChange={(e) => handleColumnFilterChange('billable', e.target.value)}
                        >
                          <option value="">Tous</option>
                          <option value="oui">Oui</option>
                          <option value="non">Non</option>
                        </select>
                      </th>
                      <th>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="TVA..."
                          value={columnFilters.tva}
                          onChange={(e) => handleColumnFilterChange('tva', e.target.value)}
                        />
                      </th>
                      <th>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Total HT..."
                          value={columnFilters.total_ht}
                          onChange={(e) => handleColumnFilterChange('total_ht', e.target.value)}
                        />
                      </th>
                      <th>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Total TTC..."
                          value={columnFilters.total_ttc}
                          onChange={(e) => handleColumnFilterChange('total_ttc', e.target.value)}
                        />
                      </th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={isGroupMode ? "9" : "8"} className="text-center py-4">
                          <div className="spinner-border spinner-border-sm me-2" role="status">
                            <span className="visually-hidden">Chargement...</span>
                          </div>
                          Chargement des documents...
                        </td>
                      </tr>
                    ) : filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={isGroupMode ? "9" : "8"} className="text-center py-4 text-muted">
                          <i className="fas fa-inbox fa-2x mb-2 d-block"></i>
                          Aucun document trouvé
                        </td>
                      </tr>
                    ) : (
                      filteredDocuments.map((document) => (
                        <tr key={document.id} className="align-middle">
                          {isGroupMode && (
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedDocuments.includes(document.id)}
                                onChange={() => handleDocumentSelection(document.id)}
                              />
                            </td>
                          )}
                          <td className="text-center">
                            <span className="badge bg-secondary">{document.id}</span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <i className="fas fa-file-alt me-2 text-muted"></i>
                              <span
                                className="text-truncate document-filename-link"
                                title={document.filename}
                                style={{ cursor: 'pointer', textDecoration: 'none', color: '#212529' }}
                                onClick={() => handleRapport(document)}
                              >
                                {document.filename}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="text-truncate" title={document.partner_name}>
                              {document.partner_name || '-'}
                            </span>
                          </td>
                          <td className="text-center">
                            {(document.total_ht > 0 || document.total_ttc > 0) ? (
                              <span className="badge bg-success">Oui</span>
                            ) : (
                              <span className="badge bg-secondary">Non</span>
                            )}
                          </td>
                          <td className="text-end">
                            {document.tva ? `${parseFloat(document.tva).toFixed(2)}€` : '-'}
                          </td>
                          <td className="text-end">
                            {document.total_ht ? `${parseFloat(document.total_ht).toFixed(2)}€` : '-'}
                          </td>
                          <td className="text-end">
                            {document.total_ttc ? `${parseFloat(document.total_ttc).toFixed(2)}€` : '-'}
                          </td>
                          <td className="text-center">
                            <small className="text-muted">
                              {document.created_at ? new Date(document.created_at).toLocaleDateString() : '-'}
                            </small>
                          </td>
                          <td className="text-center">
                            <div className="dropdown">
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={(e) => handleDropdownToggle(document.id, e)}
                              >
                                <i className="fas fa-ellipsis-v"></i>
                              </button>
                              {openDropdownId === document.id && (
                                <div
                                  className="dropdown-menu show"
                                  style={{
                                    position: 'fixed',
                                    top: dropdownPosition?.top,
                                    left: dropdownPosition?.left,
                                    zIndex: 9999
                                  }}
                                >
                                  <button
                                    className="dropdown-item"
                                    onClick={() => handleRapport(document)}
                                  >
                                    <i className="fas fa-eye me-2"></i>Aperçu
                                  </button>
                                  <button
                                    className="dropdown-item"
                                    onClick={() => handleSendEmail(document)}
                                  >
                                    <i className="fas fa-envelope me-2"></i>Envoyer
                                  </button>
                                  <button
                                    className="dropdown-item"
                                    onClick={() => handleEditDocument(document)}
                                  >
                                    <i className="fas fa-edit me-2"></i>Modifier
                                  </button>
                                  <div className="dropdown-divider"></div>
                                  <button
                                    className="dropdown-item text-danger"
                                    onClick={() => handleDeleteDocument(document)}
                                  >
                                    <i className="fas fa-trash me-2"></i>Supprimer
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* Totals Footer */}
                  {filteredDocuments.length > 0 && (
                    <tfoot className="table-light border-top">
                      <tr className="fw-bold">
                        <td colSpan={isGroupMode ? "5" : "4"} className="text-end">
                          Total ({totals.count} documents):
                        </td>
                        <td className="text-end">
                          {totals.totalTVA.toFixed(2)}€
                        </td>
                        <td className="text-end">
                          {totals.totalHT.toFixed(2)}€
                        </td>
                        <td className="text-end">
                          {totals.totalTTC.toFixed(2)}€
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar - Filters */}
          {!isFilterCollapsed && (
            <div className="col-lg-3 col-md-4 h-100">
              <div className="card h-100">
                <div className="card-header bg-light py-2">
                  <h6 className="mb-0 d-flex align-items-center">
                    <i className="fas fa-filter me-2 text-primary"></i>
                    Filtres
                    <button
                      className="btn btn-link btn-sm ms-auto p-0"
                      onClick={clearAllFilters}
                      title="Effacer tous les filtres"
                    >
                      <i className="fas fa-times text-muted"></i>
                    </button>
                  </h6>
                </div>
                <div className="card-body p-3 overflow-auto">
                  {/* Search */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Recherche</label>
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Période</label>
                    <div className="row g-2">
                      <div className="col-6">
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Types */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Types de documents</label>
                    <div className="max-height-150 overflow-auto">
                      {availableDoctypes.map(doctype => (
                        <div key={doctype.id} className="form-check form-check-sm">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`doctype-${doctype.id}`}
                            checked={selectedDoctypeFilters.includes(doctype.id)}
                            onChange={() => handleDoctypeFilterChange(doctype.id)}
                          />
                          <label className="form-check-label small" htmlFor={`doctype-${doctype.id}`}>
                            {doctype.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Billable Filter */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Facturable</label>
                    <select
                      className="form-select form-select-sm"
                      value={billableFilter}
                      onChange={(e) => setBillableFilter(e.target.value)}
                    >
                      <option value="all">Tous</option>
                      <option value="billable">Facturable</option>
                      <option value="non-billable">Non facturable</option>
                    </select>
                  </div>

                  {/* Groups */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Groupes</label>
                    <div className="max-height-150 overflow-auto">
                      {groups.map(group => (
                        <div key={group.id} className="form-check form-check-sm">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`group-${group.id}`}
                            checked={selectedGroupFilters.includes(group.id)}
                            onChange={() => handleGroupFilterChange(group.id)}
                          />
                          <label className="form-check-label small" htmlFor={`group-${group.id}`}>
                            {group.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-upload me-2"></i>
                  Télécharger des documents
                </h5>
                <button type="button" className="btn-close" onClick={closeUploadModal}></button>
              </div>
              <div className="modal-body">
                <DragDropUpload
                  selectedCompany={selectedCompany}
                  selectedDoctype={selectedDoctype}
                  onUploadComplete={() => {
                    closeUploadModal();
                    fetchDocuments();
                  }}
                />
                {uploadError && (
                  <div className="alert alert-danger mt-3">
                    {uploadError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Fullscreen Modal */}
      {isFullscreenModalOpen && currentDocument && (
        <div className="fullscreen-modal">
          <div className="fullscreen-modal-content">
            <button
              className="fullscreen-modal-close"
              onClick={closeFullscreenModal}
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="h-100 w-100">
              {previewType === 'pdf' && (
                <iframe
                  src={previewUrl}
                  className="w-100 h-100"
                  title="Document Fullscreen"
                />
              )}
              {previewType === 'image' && (
                <img
                  src={previewUrl}
                  alt="Document Fullscreen"
                  className="w-100 h-100"
                  style={{ objectFit: 'contain' }}
                />
              )}
              {previewType === 'text' && (
                <pre className="bg-white p-4 h-100 overflow-auto">
                  {previewText}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      <ShareModal
        isOpen={isEmailModalOpen}
        onClose={handleCloseEmailModal}
        currentDocument={currentDocument}
        displayedEmailFilename={displayedEmailFilename}
        emailUsers={emailUsers}
        selectedEmailTypes={selectedEmailTypes}
        setSelectedEmailTypes={setSelectedEmailTypes}
        selectedRecipients={selectedRecipients}
        setSelectedRecipients={setSelectedRecipients}
        handleRecipientToggle={handleRecipientToggle}
        availableEmailTypes={availableEmailTypes}
        emailSubject={emailSubject}
        setEmailSubject={setEmailSubject}
        emailMessage={emailMessage}
        setEmailMessage={setEmailMessage}
        emailError={emailError}
        emailSuccess={emailSuccess}
        isEmailSending={isEmailSending}
        handleConfirmSendEmail={handleSendEmailConfirm}
        handleCloseEmailModal={handleCloseEmailModal}
        formatFileSize={formatFileSize}
      />

      {/* Edit Modal */}
      {isEditModalOpen && editingDocument && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>
                  Modifier le document
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseEditModal}></button>
              </div>
              <div className="modal-body">
                <EditDocumentForm
                  document={editingDocument}
                  onSave={handleSaveEdit}
                  onCancel={handleCloseEditModal}
                  isLoading={isEditSaving}
                  error={editError}
                  success={editSuccess}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
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
                  style={{backgroundColor: '#6c757d', color: 'white'}}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleConfirmDelete}
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

      {/* Rapport Modal */}
      {isModalOpen &&        <RapportModal
          isOpen={isModalOpen}
          onClose={closeRapportModal}
          selectedCompany={selectedCompany}
          user={user}
          currentDocument={currentDocument}
          relatedDocuments={relatedDocuments}
          previewTitle={previewTitle}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          handleSendEmail={handleSendEmail}
          formatFileSize={formatFileSize}
          getDoctypeName={getDoctypeName}
          getDocumentGroup={getDocumentGroup}
          getUploaderName={getUploaderName}
        />   }

      
    </div>
  );
};

export default DocumentArchive;