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
  // Bulk delete handler
  const handleBulkDelete = async (documentIds) => {
    try {
      await API.documents.deleteMultiple(documentIds);
      // Remove deleted documents from state
      setDocuments(prev => prev.filter(doc => !documentIds.includes(doc.id)));
      setFilteredDocuments(prev => prev.filter(doc => !documentIds.includes(doc.id)));
      setCheckedDocuments([]);
      setSuccessMessage('Documents supprimés avec succès');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Erreur lors de la suppression multiple');
      setTimeout(() => setError(''), 3000);
    }
  };

  // State for bulk delete modal
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  // State and ref for Action Global dropdown
  const [globalActionMenuOpen, setGlobalActionMenuOpen] = useState(false);
  const globalActionMenuRef = useRef(null);
  // State for global action selection mode
  const [isGlobalActionMode, setIsGlobalActionMode] = useState(false);
  const [globalActionType, setGlobalActionType] = useState(''); // 'delete' or 'send'
  const [checkedDocuments, setCheckedDocuments] = useState([]);
  const [currency, setCurrency] = useState('dt');

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
  // Go to the first day of the previous month
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = firstDayLastMonth.getFullYear();
  const month = String(firstDayLastMonth.getMonth() + 1).padStart(2, '0');
  const day = '01';
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
  const [dateFilterType, setDateFilterType] = useState('upload');
  const [partnerFilter, setPartnerFilter] = useState([]);
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');

  // New state for documents and filters
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  
  // Filter states
  const [selectedDoctypeFilters, setSelectedDoctypeFilters] = useState([]);
  const [startDate, setStartDate] = useState(getOneMonthAgo());
  const [endDate, setEndDate] = useState(getToday());
  // Invoice date filter states
  const [invoiceStartDate, setInvoiceStartDate] = useState('');
  const [invoiceEndDate, setInvoiceEndDate] = useState('');
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
    total_ttc: '',
    devise: '',
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
  const [doctypeSearchTerm, setDoctypeSearchTerm] = useState('');

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
  const [openDropdownId2, setOpenDropdownId2] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState(null);

  // Filter panel state (now dropdown overlay)
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true); // default collapsed because filters are now a dropdown
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);

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

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (!filterDropdownOpen) return;
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target) && !e.target.closest('.btn-filter-toggle')) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [filterDropdownOpen]);

  useEffect(() => {
    API.settings.getSettings().then(res => {
      if (res.data && res.data.currency) {
        setCurrency(res.data.currency);
      }
    }).catch(() => setCurrency('dt'));
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
    const filteredDoctypes = availableDoctypes.filter((d) =>
    d.name.toLowerCase().includes(doctypeSearchTerm.toLowerCase())
  );
  const filteredPartners = Array.from(
    new Set(documents.map((doc) => doc.partner_name).filter(Boolean))
  ).filter((partner) =>
    partner.toLowerCase().includes(partnerSearchTerm.toLowerCase())
  );
  // Function to fetch related documents for a document
  const fetchRelatedDocuments = async (documentId) => {
    try {
      // Use the groups API to get documents in the same group
      const response = await API.groups.getByDocument(documentId);
      if (response.data?.groups && response.data.groups.length > 0) {
        // Get documents from the first group (assuming a document belongs to one main group)
        const groupId = response.data.groups[0].id;
        const groupDocsResponse = await API.groups.getDocuments(groupId);
        // Fix: The backend returns { group,
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
  // Clear any previous multi-selection so the modal shows only the current document
  setSelectedDocuments([]);
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

    // Apply invoice date range filter (allow filtering with only start or end date)
    if (invoiceStartDate || invoiceEndDate) {
      filtered = filtered.filter(doc => {
        if (!doc.invoice_date) return false;
        const invoiceDate = new Date(doc.invoice_date).toISOString().split('T')[0];
        if (invoiceStartDate && invoiceEndDate) {
          return invoiceDate >= invoiceStartDate && invoiceDate <= invoiceEndDate;
        } else if (invoiceStartDate) {
          return invoiceDate >= invoiceStartDate;
        } else if (invoiceEndDate) {
          return invoiceDate <= invoiceEndDate;
        }
        return true;
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
            return (isBillable ? 'oui' : 'non').includes(fv);
          });
        } else if (key === 'partner_name' && Array.isArray(filterValue) && filterValue.length > 0) {
          filtered = filtered.filter(doc => filterValue.includes(doc.partner_name));
        } else {
          filtered = filtered.filter(doc => {
            const docValue = doc[key];
            if (docValue === null || docValue === undefined) return false;
            if (key === 'tva' || key === 'total_ht' || key === 'total_ttc') {
              return applyMathFilter(docValue, filterValue);
            }
            return docValue.toString().toLowerCase().includes(filterValue.toString().toLowerCase());
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
    invoiceStartDate,
    invoiceEndDate,
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
    setInvoiceStartDate(getOneMonthAgo());
    setInvoiceEndDate(getToday());
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
      total_ttc: '',
      devise: '',
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
      // Always open upwards: estimate dropdown height (adjust if needed)
      const dropdownHeight = 120;
      setDropdownPosition({
        top: rect.top - containerRect.top - dropdownHeight,
        left: rect.left - containerRect.left - 100,
        openUpwards: true
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
      // If multiple documents are selected (global action), call the dedicated endpoint
      if (selectedDocuments && selectedDocuments.length > 0) {
        const documentIds = selectedDocuments.map(d => d.id);
        const payload = {
          recipients: selectedRecipients,
          email_type: selectedEmailTypes,
          subject: emailSubject,
          message: emailMessage
        };
        const res = await API.email.sendMultipleDocuments(documentIds, payload);
        // Backend may return partial failures; show appropriate message
        if (res?.data) {
          const msg = res.data.msg || 'Email envoyé (multiple)';
          setEmailSuccess(msg);
        } else {
          setEmailSuccess('Email envoyé (multiple)');
        }
      } else {
        // Single document send (existing behavior)
        if (!currentDocument || !currentDocument.id) {
          throw new Error('Aucun document sélectionné pour l\'envoi');
        }
        await API.email.sendDocument(currentDocument.id, {
          recipients: selectedRecipients,
          subject: emailSubject,
          message: emailMessage,
          email_type: selectedEmailTypes
        });
        setEmailSuccess('Email envoyé avec succès');
      }

      setTimeout(() => {
        handleCloseEmailModal();
      }, 1200);
    } catch (error) {
      // Prefer server-provided structured errors when available
      const serverMsg = error.response?.data?.msg || error.response?.data || null;
      if (serverMsg) {
        setEmailError(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));
      } else {
        setEmailError(error.message || 'Erreur lors de l\'envoi de l\'email');
      }
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
  const totalColumns = isGroupMode ? 10 : 10;
// Function to parse mathematical operations in filters
  const parseMathOperation = (filterValue) => {
    const trimmed = filterValue.trim();
    
    // Check for mathematical operators
    if (trimmed.startsWith('>')) {
      return { operator: '>', value: parseFloat(trimmed.substring(1)) };
    } else if (trimmed.startsWith('<')) {
      return { operator: '<', value: parseFloat(trimmed.substring(1)) };
    } else if (trimmed.startsWith('>=')) {
      return { operator: '>=', value: parseFloat(trimmed.substring(2)) };
    } else if (trimmed.startsWith('<=')) {
      return { operator: '<=', value: parseFloat(trimmed.substring(2)) };
    } else if (trimmed.startsWith('=')) {
      return { operator: '=', value: parseFloat(trimmed.substring(1)) };
    } else if (trimmed.startsWith('==')) {
      return { operator: '=', value: parseFloat(trimmed.substring(2)) };
    }
    
    // If no operator, treat as contains search
    return { operator: 'contains', value: trimmed };
  };

  // Function to apply mathematical filter
  const applyMathFilter = (docValue, filterValue) => {
    if (!docValue || isNaN(parseFloat(docValue))) return false;
    
    const docNum = parseFloat(docValue);
    const parsed = parseMathOperation(filterValue);
    
    if (parsed.operator === 'contains') {
      // Fall back to string contains for non-mathematical fields
      const lowerFilterValue = filterValue.toLowerCase();
      const lowerDocValue = String(docValue).toLowerCase();
      return lowerDocValue.includes(lowerFilterValue);
    }
    
    if (isNaN(parsed.value)) return false;
    
    switch (parsed.operator) {
      case '>':
        return docNum > parsed.value;
      case '<':
        return docNum < parsed.value;
      case '>=':
        return docNum >= parsed.value;
      case '<=':
        return docNum <= parsed.value;
      case '=':
        return docNum === parsed.value;
      default:
        return false;
    }
  };
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
                    <span className="text-truncate" style={{ maxWidth: '320px' }}>DMS &gt; {selectedCompany.name}</span>
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
                {isGlobalActionMode && (
                  <>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        setIsGlobalActionMode(false);
                        setGlobalActionType('');
                        setCheckedDocuments([]);
                      }}
                    >
                      <i className="fas fa-times me-1"></i>
                      Annuler
                    </button>
                    <button
                      className="btn btn-outline-success btn-sm"
                      disabled={checkedDocuments.length === 0}
                      style={checkedDocuments.length === 0 ? { color: 'black' } : {}}
                      onClick={() => {
                        if (checkedDocuments.length === 0) return;
                        if (globalActionType === 'delete') {
                          setIsBulkDeleteModalOpen(true);
                        } else if (globalActionType === 'send') {
                          // Multi-file send: collect checked documents and open ShareModal
                          const docsToSend = documents.filter(doc => checkedDocuments.includes(doc.id));
                          setSelectedDocuments(docsToSend);
                          setCurrentDocument(null); // Not a single doc
                          setDisplayedEmailFilename('');
                          setEmailSubject('');
                          setEmailMessage('');
                          setSelectedRecipients([]);
                          setSelectedEmailTypes([]);
                          setEmailError('');
                          setEmailSuccess('');
                          // Fetch available email types and users for multi-file
                          // For multi-file, intersect available types and union users
                          if (docsToSend.length > 0) {
                            Promise.all([
                              Promise.all(docsToSend.map(doc => API.email.getDocumentInfo(doc.id))),
                              API.email.getUsersForSelection(selectedCompany?.id)
                            ]).then(([typesResponses, usersResponse]) => {
                              // Intersect available types across all selected docs
                              const allTypes = typesResponses.map(r => r.data.available_types || []);
                              let intersectedTypes = allTypes[0] || [];
                              for (let i = 1; i < allTypes.length; i++) {
                                intersectedTypes = intersectedTypes.filter(typeObj =>
                                  allTypes[i].some(t => t.type === typeObj.type)
                                );
                              }
                              setAvailableEmailTypes(intersectedTypes);
                              setEmailUsers(usersResponse.data.users || []);
                              setIsEmailModalOpen(true);
                            }).catch(error => {
                              setEmailError("Erreur lors de la préparation de l'email : " + (error.response?.data?.msg || error.message));
                              setIsEmailModalOpen(true);
                            });
                          } else {
                            setAvailableEmailTypes([]);
                            setEmailUsers([]);
                            setIsEmailModalOpen(true);
                          }
                        }
                      }}
                    >
                      <i className="fas fa-check me-1"></i>
                      Confirmer
                    </button>
                  </>
                )}
      {/* Bulk Delete Confirmation Modal - matches single delete modal design */}
      {isBulkDeleteModalOpen && (
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
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  aria-label="Fermer"
                ></button>
              </div>
              <div className="modal-body" style={{ padding: '2rem 2.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  Cette action supprimera les fichiers sélectionnés.
                </p>
                <p className="text-muted" style={{ fontSize: '0.98rem', marginBottom: 0 }}>
                 Êtes-vous certain de vouloir continuer?
                </p>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  style={{backgroundColor: '#6c757d', color: 'white'}}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={async () => {
                    await handleBulkDelete(checkedDocuments);
                    setIsBulkDeleteModalOpen(false);
                    setIsGlobalActionMode(false);
                    setGlobalActionType('');
                    setCheckedDocuments([]);
                  }}
                  style={{backgroundColor: 'orangered'}}
                >
                  <i className="bi bi-trash me-2"></i>
                  Oui, supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
                <div className="dropdown">
                  <button
                    className="btn btn-outline-secondary btn-sm dropdown-toggle"
                    onClick={() => setGlobalActionMenuOpen(!globalActionMenuOpen)}
                    ref={globalActionMenuRef}
                  >
                    <i className="fas fa-cogs me-1"></i>
                    Edition en masse
                  </button>
                  {globalActionMenuOpen && (
                    <div className="dropdown-menu show">
                      <button className="dropdown-item" onClick={() => { setIsGlobalActionMode(true); setGlobalActionType('delete'); setGlobalActionMenuOpen(false); }}>
                        <i className="fas fa-trash-alt me-2"></i>Supprimer
                      </button>
                      <button className="dropdown-item" onClick={() => { setIsGlobalActionMode(true); setGlobalActionType('send'); setGlobalActionMenuOpen(false); }}>
                        <i className="fas fa-paper-plane me-2"></i>Envoyer
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-outline-secondary btn-sm btn-filter-toggle"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                  title={filterDropdownOpen ? "Masquer les filtres" : "Filtres"}
                >
                  <i className="fas fa-filter"></i>
                  <span className="ms-1">Filtres</span>
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={openUploadModal}
                >
                  <i className="fas fa-upload me-1"></i>
                  Importer des documents
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
            </div>

            {/* Action Buttons */}
            <div className="d-flex gap-2 mb-2 flex-column">
              

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
                      {isGlobalActionMode && (
                        <th style={{ width: '40px' }}>
                          
                        </th>
                      )}

                      <th
                        style={{ width: '60px', cursor: 'pointer' }}
                        className="text-start"
                        onClick={() => handleSort('id')}
                        title="Trier par ID"
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          {getSortIcon('id')}
                          <span>ID</span>
                          <span style={{ fontSize: '1em', color: sortConfig.key === 'id' ? '#1976d2' : '#888' }}>
                          {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                        </div>
                      </th>

                      <th
                        style={{ width: '200px', cursor: 'pointer' }}
                        className="text-start"
                        onClick={() => handleSort('filename')}
                        title="Trier par nom de document"
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          {getSortIcon('filename')}
                          <span>Document</span>
                          <span style={{ fontSize: '1em', color: sortConfig.key === 'filename' ? '#1976d2' : '#888' }}>
                          {sortConfig.key === 'filename' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                        </div>
                      </th>

                      <th
                        style={{ width: '120px', cursor: 'pointer' }}
                        className="text-start"
                        onClick={() => handleSort('partner_name')}
                        title="Trier par partenaire"
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          {getSortIcon('partner_name')}
                          <span>Partenaire</span>
                          <span style={{ fontSize: '1em', color: sortConfig.key === 'partner_name' ? '#1976d2' : '#888' }}>
                          {sortConfig.key === 'partner_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                        </div>
                      </th>

                      <th
                        style={{ width: '80px', cursor: 'pointer' }}
                        className="text-start"
                        onClick={() => handleSort('billable')}
                        title="Trier par facturable"
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          {getSortIcon('billable')}
                          <span>Facturable</span>
                          <span style={{ fontSize: '1em', color: sortConfig.key === 'billable' ? '#1976d2' : '#888' }}>
                          {sortConfig.key === 'billable' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                        </div>
                      </th>

                      <th
                        style={{ width: '90px', cursor: 'pointer' }}
                        className="text-start"
                        onClick={() => handleSort('tva')}
                        title="Trier par TVA"
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          {getSortIcon('tva')}
                          <span>TVA</span>
                          <span style={{ fontSize: '1em', color: sortConfig.key === 'tva' ? '#1976d2' : '#888' }}>
                          {sortConfig.key === 'tva' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                        </div>
                      </th>

                      <th
                        style={{ width: '90px', cursor: 'pointer' }}
                        className="text-start"
                        onClick={() => handleSort('total_ht')}
                        title="Trier par Total HT"
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          {getSortIcon('total_ht')}
                          <span>Total HT</span>
                          <span style={{ fontSize: '1em', color: sortConfig.key === 'total_ht' ? '#1976d2' : '#888' }}>
                          {sortConfig.key === 'total_ht' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                        </div>
                      </th>

                      <th
                        style={{ width: '90px', cursor: 'pointer' }}
                        className="text-start"
                        onClick={() => handleSort('total_ttc')}
                        title="Trier par Total TTC"
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          {getSortIcon('total_ttc')}
                          <span>Total TTC</span>
                          <span style={{ fontSize: '1em', color: sortConfig.key === 'total_ttc' ? '#1976d2' : '#888' }}>
                          {sortConfig.key === 'total_ttc' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                        </div>
                      </th>
                      <th
                        style={{ width: '70px', cursor: 'pointer' }}
                        className="text-start"
                        title="Devise"
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          <span>Devise</span>
                        </div>
                      </th>

                      <th
                        style={{ width: '90px', cursor: 'pointer' }}
                        className="text-start"
                        onClick={() => handleSort('created_at')}
                        title="Trier par date"
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          {getSortIcon('created_at')}
                          <span>Date</span>
                          <span style={{ fontSize: '1em', color: sortConfig.key === 'created_at' ? '#1976d2' : '#888' }}>
                          {sortConfig.key === 'created_at' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                        </div>
                      </th>

                      <th style={{ width: '80px' }} className="text-center"></th>
                    </tr>
                    {/* Filter Row */}
                    <tr className="bg-light" style={{paddingTop: '0px', paddingBottom: '0px', margin: 0}}>
                      {isGlobalActionMode && (
                        <th>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCheckedDocuments(filteredDocuments.map(doc => doc.id));
                              } else {
                                setCheckedDocuments([]);
                              }
                            }}
                            checked={checkedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                          />
                        </th>
                      )}
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
                        <div className="dropdown" style={{ position: 'relative' }}>
                        <button
                          className="form-select form-select-sm text-start"
                          type="button"
                          style={{ minWidth: '120px' }}
                          onClick={() => setOpenDropdownId(openDropdownId === 'partner' ? null : 'partner')}
                        >
                          {columnFilters.partner_name && Array.isArray(columnFilters.partner_name) && columnFilters.partner_name.length > 0
                            ? `Partenaire (${columnFilters.partner_name.length})`
                            : 'Partenaire...'}
                        </button>

                        {openDropdownId === 'partner' && (
                          <div
                            className="dropdown-menu show"
                            style={{ maxHeight: '200px', overflowY: 'auto', minWidth: '200px', padding: '8px', zIndex: 10 }}
                          >
                            {/* Search input */}
                            <input
                              type="text"
                              placeholder="Rechercher..."
                              className="form-control form-control-sm mb-2"
                              value={partnerSearchTerm}
                              onChange={(e) => setPartnerSearchTerm(e.target.value)}
                            />

                            {filteredPartners.length === 0 ? (
                              <div className="text-muted small">Aucun partenaire</div>
                            ) : (
                              filteredPartners.map((partner, idx) => (
                                <div
                                  key={partner}
                                  className="form-check d-flex align-items-center"
                                  style={{ whiteSpace: 'nowrap', paddingLeft: '0.5rem' }}
                                >
                                  <input
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    id={`partner-filter-${idx}`}
                                    checked={Array.isArray(columnFilters.partner_name) && columnFilters.partner_name.includes(partner)}
                                    onChange={(e) => {
                                      let newSelected = Array.isArray(columnFilters.partner_name)
                                        ? [...columnFilters.partner_name]
                                        : [];
                                      if (e.target.checked) {
                                        newSelected.push(partner);
                                      } else {
                                        newSelected = newSelected.filter((p) => p !== partner);
                                      }
                                      handleColumnFilterChange('partner_name', newSelected);
                                    }}
                                  />
                                  <label
                                    className="form-check-label"
                                    htmlFor={`partner-filter-${idx}`}
                                    style={{
                                      marginBottom: 0,
                                      cursor: 'pointer',
                                      textTransform: 'none',
                                      maxWidth: '200px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      verticalAlign: 'middle',
                                    }}
                                    title={partner}
                                  >
                                    {partner.length > 18 ? partner.slice(0, 15) + '...' : partner}
                                  </label>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

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
                      <th>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Devise..."
                          value={columnFilters.devise}
                          onChange={(e) => handleColumnFilterChange('devise', e.target.value)}
                        />
                      </th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={isGroupMode ? "10" : "9"} className="text-center py-4">
                          
                          Chargement des documents...
                        </td>
                      </tr>
                    ) : filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={isGroupMode ? "10" : "9"} className="text-center py-4 text-muted">
                          <i className="fas fa-inbox fa-2x mb-2 d-block"></i>
                          Aucun document trouvé
                        </td>
                      </tr>
                    ) : (
                      // Render document rows and pad with empty rows if less than 3
                      [
                        ...filteredDocuments.map((document) => (
                          <tr
                            key={document.id}
                            className="align-middle document-row"
                            onClick={(e) => {
                              const ignored = e.target?.closest && e.target.closest('input, button, .dropdown, a, select, .form-check-input, .dropdown-menu');
                              if (ignored) return;
                              handleRapport(document);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {isGlobalActionMode && (
                              <td>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  onClick={(e) => e.stopPropagation()}
                                  checked={checkedDocuments.includes(document.id)}
                                  onChange={() => {
                                    if (checkedDocuments.includes(document.id)) {
                                      setCheckedDocuments(checkedDocuments.filter(id => id !== document.id));
                                    } else {
                                      setCheckedDocuments([...checkedDocuments, document.id]);
                                    }
                                  }}
                                />
                              </td>
                            )}
                            <td className="text-center">
                              <span className="badge bg-secondary">{document.id}</span>
                            </td>
                            <td style={{ maxWidth: '180px', minWidth: '140px', width: '180px' }}>
                              <div className="d-flex align-items-center">
                                <i className="fas fa-file-alt me-2 text-muted"></i>
                                <span
                                  className="document-filename-ellipsis"
                                  title={document.filename}
                                  style={{
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    color: '#212529',
                                    display: 'inline-block',
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    verticalAlign: 'middle',
                                  }}
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
                              {document.tva ? parseFloat(document.tva).toFixed(2) : '-'}
                            </td>
                            <td className="text-end">
                              {document.total_ht ? parseFloat(document.total_ht).toFixed(2) : '-'}
                            </td>
                            <td className="text-end">
                              {document.total_ttc ? parseFloat(document.total_ttc).toFixed(2) : '-'}
                            </td>
                            <td className="text-center">
                              {currency || '-'}
                            </td>
                            <td className="text-center">
                              <small className="text-muted">
                                {document.created_at ? new Date(document.created_at).toLocaleDateString() : '-'}
                              </small>
                            </td>
                            <td className="text-center">
                              <div className="d-flex align-items-center justify-content-center">
                                <div className="dropdown">
                                  <button
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={(e) => handleDropdownToggle(document.id, e)}
                                  >
                                    <i className="fas fa-ellipsis-v">...</i>
                                  </button>
                                  {openDropdownId === document.id && (
                                    <div
                                      className="dropdown-menu show dropdown-menu-up"
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
                                    </div>
                                  )}
                                </div>

                                {/* Quick delete button to the right of the options button */}
                                <button
                                  className="btn btn-outline-danger btn-sm ms-2"
                                  title="Supprimer"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteDocument(document); }}
                                  aria-label={`Supprimer ${document.filename || 'document'}`}
                                >
                                  {/* Inline SVG trash icon (uses currentColor) */}
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 .5.5V6h3v1h-1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7H2V6h3v-.5zM14 3H10l-.5-1A1 1 0 0 0 8.6 1H7.4a1 1 0 0 0-.9.5L6 3H2v1h12V3z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )),
                      ]
                    )}
                  </tbody>
                  {/* Totals Footer */}
                  {filteredDocuments.length > 0 && (
                    <>
                      <tfoot className="table-light border-top">
                        <tr className="fw-bold">
                          <td colSpan={isGroupMode ? "6" : "5"} className="text-end">
                            Total ({totals.count} documents):
                          </td>
                          <td className="text-end">
                            {totals.totalTVA.toFixed(2)}{currency}
                          </td>
                          <td className="text-end">
                            {totals.totalHT.toFixed(2)}{currency}
                          </td>
                          <td className="text-end">
                            {totals.totalTTC.toFixed(2)}{currency}
                          </td>
                          <td colSpan="2"></td>
                        </tr>
                      </tfoot>
                      {/* Add two empty rows for spacing after the footer, as part of the table */}
                      
                    </>
                  )}
                  
                </table>
              </div>
            </div>
          </div>

          {/* Filter Dropdown Overlay - renders as absolute overlay so it doesn't affect table width */}
          {filterDropdownOpen && (
  <div
    ref={filterDropdownRef}
    className="filter-dropdown-overlay"
    style={{
      position: 'fixed',
      right: 40,
      top: 64,
      zIndex: 1050,
      width: '90%',
      maxWidth: '1220px'
    }}
  >
    <div className="card shadow-sm" style={{ borderRadius: '8px' }}>
      <div className="card-header bg-light py-2 d-flex align-items-center justify-content-between">
        <h6 className="mb-0 d-flex align-items-center">
          <i className="fas fa-filter me-2 text-primary"></i>
          Filtres
        </h6>
        <button
          className="btn btn-link btn-sm p-0"
          onClick={clearAllFilters}
          title="Effacer tous les filtres"
        >
          <i className="fas fa-times text-muted"></i>
        </button>
      </div>

      <div className="card-body">
        <div className="row g-3 align-items-end">

          {/* Search */}
          <div className="col-md-4">
            <label className="form-label small fw-bold">Recherche</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{width:'570px'}}
            />
          </div>

         {/* Date Filter Type */}
          <div className="col-md-4">
            <div className="fw-bold small mb-1" style={{alignItems: 'right',justifyContent: 'flex-end', paddingLeft:'190px'}}>Filtrer par la date de :</div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '12px',
                lineHeight: '1.1',
                justifyContent: 'flex-end', // <-- push items to the right
                alignItems: 'center',       // <-- vertically align radio buttons
              }}
            >
              <label className="form-check-label small d-flex align-items-center" style={{ margin: 0 }}>
                <input
                  className="form-check-input me-1"
                  type="radio"
                  name="dateFilterType"
                  id="dateUpload"
                  value="upload"
                  checked={dateFilterType === 'upload'}
                  onChange={() => setDateFilterType('upload')}
                  style={{ marginTop: 0 }}
                />
                Chargement
              </label>

              <label className="form-check-label small d-flex align-items-center" style={{ margin: 0 }}>
                <input
                  className="form-check-input me-1"
                  type="radio"
                  name="dateFilterType"
                  id="dateDocument"
                  value="document"
                  checked={dateFilterType === 'document'}
                  onChange={() => setDateFilterType('document')}
                  style={{ marginTop: 0 }}
                />
                Document
              </label>
            </div>
          </div>



          {/* Date Range */}
          <div className="col-md-4 d-flex align-items-center gap-2">
            <input
              type="date"
              className="form-control form-control-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="form-control form-control-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

       

        {/* Second row: dropdowns */}
        <div className="row g-3">
          <div className="col-md-4">
  <label className="form-label small fw-bold">Types de documents</label>
  <div className="dropdown" style={{ position: 'relative' }}>
    <button
      className="form-select form-select-sm text-start"
      type="button"
      onClick={() =>
        setOpenDropdownId(openDropdownId === 'doctype-filter' ? null : 'doctype-filter')
      }
    >
      {selectedDoctypeFilters.length === 0
        ? 'Sélectionner...'
        : `${selectedDoctypeFilters.length} sélectionné(s)`}
    </button>

    {openDropdownId === 'doctype-filter' && (
      <div
        className="dropdown-menu show"
        style={{
          maxHeight: '250px',
          overflowY: 'auto',
          width: '380px',
          padding: '8px',
          
          zIndex: 10,
        }}
      >
        {/* Search input */}
        <input
          type="text"
          placeholder="Rechercher..."
          className="form-control form-control-sm mb-2"
          value={doctypeSearchTerm}
          onChange={(e) => setDoctypeSearchTerm(e.target.value)}
        />

        {filteredDoctypes.length === 0 ? (
          <div className="text-muted small">Aucun type</div>
        ) : (
          filteredDoctypes.map((doctype, idx) => (
            <div
              key={doctype.id}
              className="form-check d-flex align-items-center"
              style={{ paddingLeft: '1.5rem', height: '30px' }}
            >
              <input
                className="form-check-input me-2"
                type="checkbox"
                id={`doctype-filter-${idx}`}
                checked={selectedDoctypeFilters.includes(doctype.id)}
                onChange={() => handleDoctypeFilterChange(doctype.id)}
              />
              <label
                className="form-check-label"
                htmlFor={`doctype-filter-${idx}`}
                title={doctype.name}
                style={{
                  marginBottom: 0,
                  cursor: 'pointer',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  maxWidth: '200px',
                }}
              >
                {doctype.name}
              </label>
            </div>
          ))
        )}
      </div>
    )}
  </div>
</div>


          <div className="col-md-4">
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

          <div className="col-md-4">
  <label className="form-label small fw-bold">Partenaire</label>
  <div className="dropdown" style={{ position: 'relative' }}>
    <button
      className="form-select form-select-sm text-start"
      type="button"
      onClick={() =>
        setOpenDropdownId(openDropdownId === 'partner_filter' ? null : 'partner_filter')
      } // 👈 unique ID
    >
      {columnFilters.partner_name && Array.isArray(columnFilters.partner_name) && columnFilters.partner_name.length > 0
        ? `Partenaire (${columnFilters.partner_name.length})`
        : 'Sélectionner...'}
    </button>

    {openDropdownId === 'partner_filter' && ( // 👈 same unique ID
      <div
        className="dropdown-menu show"
        style={{
          maxHeight: '210px',
          overflowY: 'auto',
          width: '100%',
          padding: '8px',
          zIndex: 10
        }}
      >
        {/* Search input */}
        <input
          type="text"
          placeholder="Rechercher..."
          className="form-control form-control-sm mb-2"
          value={partnerSearchTerm}
          onChange={(e) => setPartnerSearchTerm(e.target.value)}
        />

        {filteredPartners.length === 0 ? (
          <div className="text-muted small">Aucun partenaire</div>
        ) : (
          filteredPartners.map((partner, idx) => (
            <div
              key={partner}
              className="form-check d-flex align-items-center"
              style={{ paddingLeft: '1.5rem', height: '30px' }}
            >
              <input
                className="form-check-input me-2"
                type="checkbox"
                id={`partner-filter-${idx}`}
                checked={Array.isArray(columnFilters.partner_name) && columnFilters.partner_name.includes(partner)}
                onChange={(e) => {
                  let newSelected = Array.isArray(columnFilters.partner_name)
                    ? [...columnFilters.partner_name]
                    : [];
                  if (e.target.checked) {
                    newSelected.push(partner);
                  } else {
                    newSelected = newSelected.filter(p => p !== partner);
                  }
                  handleColumnFilterChange('partner_name', newSelected);
                }}
              />
              <label
                className="form-check-label"
                htmlFor={`partner-filter-${idx}`}
                style={{
                  marginBottom: 0,
                  cursor: 'pointer',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  maxWidth: '200px'
                }}
                title={partner}
              >
                {partner.length > 18 ? partner.slice(0, 15) + '...' : partner}
              </label>
            </div>
          ))
        )}
      </div>
    )}
  </div>
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
                  onClose={() => {
                    // Only close the upload modal. Do not refresh documents here.
                    closeUploadModal();
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
        selectedDocuments={selectedDocuments}
      />

      {/* Edit Modal */}
      {isEditModalOpen && editingDocument && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered" style={{ height: '80vh', display: 'flex', alignItems: 'center' }}>
            <div className="modal-content edit-modal-content-fixed-height">
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
                  Cette action supprimera les fichiers sélectionnés.
                </p>
                <p className="text-muted" style={{ fontSize: '0.98rem', marginBottom: 0 }}>
                  Êtes-vous certain de vouloir continuer?
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
                  className="btn btn-secondary"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  style={{backgroundColor: 'orangered'}}
                >
                  {isDeleting ? (
                    'Suppression...'
                  ) : (
                    <>
                      <i className="bi bi-trash me-2"></i>
                      Oui, supprimer
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
        />
      }
    </div>
  );
}

export default DocumentArchive;