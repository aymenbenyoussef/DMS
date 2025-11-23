import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import API from '../../api';
import { AppContext } from '../context';
import DocumentConfirmationForm from './DocumentConfirmationForm';
import DmsTempUploadModal from './DmsTempUploadModal';
import { exportToCSV, exportToJSON, exportToTXT, exportToExcel } from '../Admin/exportUtils';
import { useLanguage } from '../../contexts/LanguageContext';
import { ReactComponent as UploadIcon } from './upload.svg';
import './TempDocumentArchive.css';
import './ModalStyles.css';

const TempDocumentArchive = ({ user }) => {
  const { t } = useLanguage();
  const { selectedCompany, selectedDoctype, setSelectedCompany, setSelectedDoctype } = useContext(AppContext);

  const getOneMonthAgo = () => {
    const now = new Date();
    // Go to the first day of the previous month
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = firstDayLastMonth.getFullYear();
    const month = String(firstDayLastMonth.getMonth() + 1).padStart(2, '0');
    const day = '01';
    return `${year}-${month}-${day}`;
  };

  const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(getOneMonthAgo());
  const [endDate, setEndDate] = useState(getToday());
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewType, setPreviewType] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [currentDocument, setCurrentDocument] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [processingDocId, setProcessingDocId] = useState(null);
  const [originalCompany, setOriginalCompany] = useState(null);
  const [originalDoctype, setOriginalDoctype] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({
    id: '',
    filename: '',
    owner: ''
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  // Filters overlay state
  const [filterOverlayOpen, setFilterOverlayOpen] = useState(false);
  const filterOverlayRef = useRef(null);
  const [filterHeight, setFilterHeight] = useState(0);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // auto-hide toast after 5s
  useEffect(() => {
    if (!toast.visible) return;
    const id = setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
    return () => clearTimeout(id);
  }, [toast.visible]);
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

  useEffect(() => {
    if (filterOverlayOpen) {
      const element = filterOverlayRef.current;
      if (element) {
        const resizeObserver = new ResizeObserver(() => {
          setFilterHeight(element.offsetHeight + 16); // 16px for mb-3
        });
        resizeObserver.observe(element);
        return () => resizeObserver.disconnect();
      }
    } else {
      setFilterHeight(0);
    }
  }, [filterOverlayOpen]);

  // close filter overlay when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (!filterOverlayOpen) return;
      if (filterOverlayRef.current && !filterOverlayRef.current.contains(e.target) && !e.target.closest('.btn-filter-toggle')) {
        setFilterOverlayOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [filterOverlayOpen]);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await API.tempDocuments.getAll(startDate, endDate);
      setDocuments(response.data || []);
      setFilteredDocuments(response.data || []);
    } catch (error) {
      setDocuments([]);
      setFilteredDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    let filtered = [...documents];
    if (searchTerm && searchTerm.trim() !== '') {
      filtered = filtered.filter(doc => {
        const searchLower = searchTerm.toLowerCase();
        const searchFields = [
          String(doc.id).toLowerCase(),
          String(doc.filename).toLowerCase(),
          String(doc.created_at).toLowerCase()
        ];
        if (user?.role === 'admin' || user?.role === 'superuser') {
          searchFields.push(String(doc.owner_name || doc.owner || '').toLowerCase());
          searchFields.push(String(doc.owner_surname || '').toLowerCase());
        }
        return searchFields.some(field => field.includes(searchLower));
      });
    }
    Object.keys(columnFilters).forEach(column => {
      const filterValue = columnFilters[column];
      if (filterValue && filterValue.trim() !== '') {
        filtered = filtered.filter(doc => {
          if (column === 'owner') {
            const ownerName = String(doc.owner_name || doc.owner || '').toLowerCase();
            const ownerSurname = String(doc.owner_surname || '').toLowerCase();
            const fullName = `${ownerName} ${ownerSurname}`.trim().toLowerCase();
            const lowerFilterValue = filterValue.toLowerCase();

            return ownerName.includes(lowerFilterValue) ||
              ownerSurname.includes(lowerFilterValue) ||
              fullName.includes(lowerFilterValue);
          }
          const docValue = doc[column];
          if (docValue === null || docValue === undefined) return false;
          const lowerFilterValue = filterValue.toLowerCase();
          const lowerDocValue = String(docValue).toLowerCase();
          return lowerDocValue.includes(lowerFilterValue);
        });
      }
    });
    setFilteredDocuments(filtered);
  }, [documents, columnFilters, searchTerm, user?.role]);

  useEffect(() => {
    const handleTempDocumentUpload = () => {
      fetchDocuments();
    };
    window.addEventListener('TempDocumentsUploaded', handleTempDocumentUpload);
    return () => {
      window.removeEventListener('TempDocumentsUploaded', handleTempDocumentUpload);
    };
  }, [fetchDocuments]);

  // Note: fetchDocuments is defined above using useCallback

  const hasActiveFilters = () => {
    const hasColumnFilters = Object.values(columnFilters).some(value => value && value.trim() !== '');
    const defaultStartDate = getOneMonthAgo();
    const defaultEndDate = getToday();
    const hasDateFilters = startDate !== defaultStartDate || endDate !== defaultEndDate;
    const hasSearchTerm = searchTerm && searchTerm.trim() !== '';
    return hasColumnFilters || hasDateFilters || hasSearchTerm;
  };

  const getNoDataMessage = () => {
    if (documents.length === 0) {
      return t('noData');
    } else if (hasActiveFilters()) {
      return t('noResultsFound');
    } else {
      return t('noData');
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const response = await API.tempDocuments.download(doc.id);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const ext = doc.filename.split('.').pop().toLowerCase();
      let type = '';
      if (['pdf'].includes(ext)) type = 'pdf';
      else if (['jpg', 'jpeg', 'png', 'gif', 'tiff', 'bmp', 'webp'].includes(ext)) type = 'image';
      else if (['txt'].includes(ext)) type = 'text';
      else type = 'other';
      setPreviewType(type);
      setPreviewUrl(url);
      setPreviewTitle(doc.filename);
      setCurrentDocument(doc);
      setIsPreviewModalOpen(true);
    } catch (error) {
      alert(t('previewError'));
    }
  };

  const handleDeleteDocument = async (doc) => {
    setDeletingDocument(doc);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDocument) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await API.tempDocuments.delete(deletingDocument.id);
      setDocuments(prev => prev.filter(d => d.id !== deletingDocument.id));
      setFilteredDocuments(prev => prev.filter(d => d.id !== deletingDocument.id));
      window.dispatchEvent(new Event('TempDocumentsUploaded'));
      setIsDeleteModalOpen(false);
      setDeletingDocument(null);
      setToast({ visible: true, message: 'Document temporaire supprimé avec succès', type: 'success' });
    } catch (error) {
      setDeleteError(t('deleteError'));
      setToast({ visible: true, message: 'Erreur lors de la confirmation des documents temporaires', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setDeletingDocument(null);
  };

  const handleSend = async (doc) => {
    setProcessingDocId(doc.id);
    setCurrentDocument(doc);

    setOriginalCompany(selectedCompany);
    setOriginalDoctype(selectedDoctype);

    try {
      const response = await API.tempDocuments.download(doc.id);
      const blob = response.data;
      const file = new File([blob], doc.filename, { type: blob.type });

      const ocrResponse = await API.documents.uploadSingleFile(
        file,
        selectedCompany?.id || null,
        selectedDoctype?.id || null
      );

      const confirmationData = {
        sessionId: ocrResponse.data?.session_id,
        extractedData: ocrResponse.data?.extracted_data,
        filename: doc.filename,
        // include the original temp document id so the confirmation modal can fetch the file
        temp_id: doc.id
      };

      setConfirmationData([confirmationData]);
      setShowConfirmationModal(true);
    } catch (error) {
      console.error('Error processing document:', error);
      alert(t('processError') + (error.response?.data?.msg || error.message));
    } finally {
      setProcessingDocId(null);
    }
  };

  const handleConfirmDocuments = async (confirmedDocuments, errors) => {
    if (!confirmationData || !confirmationData[0]) return;

    try {
      const sessionId = confirmationData[0].sessionId;
      const doc = confirmedDocuments[0];

      if (doc && sessionId) {
        const documentToConfirm = {
          ...doc,
          partner_id: doc.confirmed_data.partner_id || null,
          confirmed_data: { ...doc.confirmed_data }
        };

        const response = await API.documents.confirmDocuments(sessionId, [documentToConfirm]);
        const savedDoc = response.data.saved_documents[0];
        setToast({ visible: true, message: 'Document envoyé avec succès!', type: 'success' });

        if (savedDoc && !savedDoc.error) {
          setDocuments(prev => prev.filter(d => d.id !== currentDocument?.id));
          setFilteredDocuments(prev => prev.filter(d => d.id !== currentDocument?.id));

          window.dispatchEvent(new Event('TempDocumentsUploaded'));
        }
      }
      try {
        console.log('Deleting temp document with ID:', currentDocument.id);
        await API.tempDocuments.delete(currentDocument.id);
        console.log('Temp document deleted successfully');
        // Show success message, close modal, refresh documents
        setSuccessMessage(t('moveSuccess'));
        setShowConfirmationModal(false);
        setConfirmationData(null);
        fetchDocuments();
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (deleteError) {
        console.error('Error deleting temp document:', deleteError);
      }
    } catch (error) {
      console.error('Error confirming document:', error);
      setToast({ visible: true, message: 'Erreur lors de l\'envoi des documents', type: 'error' });
      alert(t('confirmError') + (error.response?.data?.msg || error.message));
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmationModal(false);
    setConfirmationData(null);
    if (originalCompany) {
      setSelectedCompany(originalCompany);
    }
    if (originalDoctype) {
      setSelectedDoctype(originalDoctype);
    }
    setOriginalCompany(null);
    setOriginalDoctype(null);
  };

  const handleModalClose = () => {
    setShowConfirmationModal(false);
    setConfirmationData(null);
    if (originalCompany) {
      setSelectedCompany(originalCompany);
    }
    if (originalDoctype) {
      setSelectedDoctype(originalDoctype);
    }
    setOriginalCompany(null);
    setOriginalDoctype(null);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sortedDocuments = [...filteredDocuments].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];
      if (key === 'id') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      } else if (key === 'created_at') {
        const aDate = aValue ? new Date(aValue) : new Date(0);
        const bDate = bValue ? new Date(bValue) : new Date(0);
        if (isNaN(aDate.getTime()) && isNaN(bDate.getTime())) {
          aValue = 0;
          bValue = 0;
        } else if (isNaN(aDate.getTime())) {
          aValue = 0;
          bValue = bDate.getTime();
        } else if (isNaN(bDate.getTime())) {
          aValue = aDate.getTime();
          bValue = 0;
        } else {
          aValue = aDate.getTime();
          bValue = bDate.getTime();
        }
      }
      else if (key === 'owner') {
        // Special handling for owner - use full name for sorting
        const aFullName = `${a.owner_name || a.owner || ''} ${a.owner_surname || ''}`.trim().toLowerCase();
        const bFullName = `${b.owner_name || b.owner || ''} ${b.owner_surname || ''}`.trim().toLowerCase();
        aValue = aFullName;
        bValue = bFullName;
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

  const handleExport = (type) => {
    if (filteredDocuments.length === 0) {
      alert("Il n'y a pas de données à exporter.");
      setExportMenuOpen(false);
      return;
    }

    const columns = [
      { key: 'id', label: t('id') },
      { key: 'filename', label: t('filename') },
    ];
    if (user?.role === 'admin' || user?.role === 'superuser') {
      columns.push({ key: 'owner', label: t('owner') });
    }
    columns.push({ key: 'created_at', label: t('uploadDate') });

    const dataToExport = filteredDocuments.map(doc => {
      const ownerName = `${doc.owner_name || doc.owner || ''} ${doc.owner_surname || ''}`.trim();
      const rowData = {
        id: doc.id,
        filename: doc.filename,
      };

      if (user?.role === 'admin' || user?.role === 'superuser') {
        rowData.owner = ownerName;
      }

      rowData.created_at = doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR') : '-';

      return rowData;
    });

    const filename = `temp_documents_${new Date().toISOString().split('T')[0]}`;

    switch (type) {
      case 'csv':
        exportToCSV(dataToExport, columns, filename);
        break;
      case 'json':
        exportToJSON(dataToExport, filename);
        break;
      case 'txt':
        exportToTXT(dataToExport, columns, filename);
        break;
      case 'excel':
        exportToExcel(dataToExport, columns, filename);
        break;
      default:
        console.error(`Unsupported export format: ${type}`);
    }
    setExportMenuOpen(false);
  };

  const handleResetFilters = () => {
    setStartDate(getOneMonthAgo());
    setEndDate(getToday());
    setSearchTerm('');
    setColumnFilters({
      id: '',
      filename: '',
      owner: ''
    });
    setSortConfig({ key: null, direction: 'asc' });
  };

  const handleColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

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

  return (
    <div className="document-archive">
      <div className={`top-toast ${toast.type === 'error' ? 'top-toast-error' : 'top-toast-success'} ${toast.visible ? 'show' : ''}`} role="status" aria-live="polite">
        <div className="top-toast-inner">
          <div className="top-toast-icon">{toast.type === 'error' ? '✖️' : '✓'}</div>
          <div className="top-toast-message">{toast.message}</div>
          <button className="top-toast-close" onClick={() => setToast(t => ({ ...t, visible: false }))} aria-label="Fermer la notification">✕</button>
        </div>
      </div>

      <div className="container-fluid h-100">
        <div className="row h-100">
          {/* Main Content Area - Table */}
          <div className={`col-lg-12 col-md-12 h-100 d-flex flex-column`}>
            {/* Header with Upload Button */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h4 className="mb-0 text-dark fw-bold d-flex align-items-center gap-2">
                <i className="fas fa-history me-2 text-primary"></i>
                {t('tempDocuments')}
              </h4>
              <div className="d-flex gap-2 action-buttons align-items-center">

                <button
                  className="btn btn-outline-secondary btn-sm btn-filter-toggle no-hover"
                  onClick={() => setFilterOverlayOpen(!filterOverlayOpen)}
                  title={filterOverlayOpen ? t('hideFilters') : t('showFilters')}
                >
                  <i className={`fas fa-${filterOverlayOpen ? 'times' : 'filter'}`}></i>
                  <span className="ms-1">{t('filters')}</span>
                </button>

                <button
                  className="btn btn-outline-secondary btn-sm btn-import"
                  onClick={() => setIsUploadModalOpen(true)}
                  title={t('upload')}
                >
                  <UploadIcon className="me-1" width="25" height="25" />
                  Importer des documents
                </button>

                <div className="dropdown" ref={exportMenuRef}>
                  <button
                    className="btn btn-outline-secondary btn-sm dropdown-toggle no-hover"
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  >
                    <i className="fas fa-download me-1"></i>
                    {t('export')}
                  </button>
                  {exportMenuOpen && (
                    <div className="dropdown-menu show">
                      <button className="dropdown-item" onClick={() => handleExport('csv')}>
                        <i className="fas fa-file-csv me-2"></i>{t('exportCSV')}
                      </button>
                      <button className="dropdown-item" onClick={() => handleExport('excel')}>
                        <i className="fas fa-file-excel me-2"></i>{t('exportExcel')}
                      </button>
                      <button className="dropdown-item" onClick={() => handleExport('json')}>
                        <i className="fas fa-file-code me-2"></i>{t('exportJSON')}
                      </button>
                      <button className="dropdown-item" onClick={() => handleExport('txt')}>
                        <i className="fas fa-file-alt me-2"></i>{t('exportTXT')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Section */}
            {filterOverlayOpen && (
              <div ref={filterOverlayRef} className="card shadow-sm mb-3" style={{ borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <div className="card-body">
                  <div className="row g-3 align-items-center">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">{t('search')}</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold">{t('dateRange')}</label>
                      <div className="d-flex align-items-center">
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="mx-2">-</span>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    {/*
                    <div className="col-md-2 d-flex align-items-end">
                      <button className="btn btn-sm btn-outline-secondary w-100" onClick={handleResetFilters} title={t('clearAllFilters')}>
                        <i className="fas fa-times me-1"></i> {t('reset', 'Reset')}
                      </button>
                      
                    </div>
                    */}
                  </div>
                </div>
              </div>
            )}

            {/* Documents Table */}
            <div className="documents-table-container flex-grow-1" style={{ maxHeight: `calc(100vh - 180px - ${filterHeight}px)` }}>
              <div className="table-responsive h-100">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th
                        style={{ width: '60px', cursor: 'pointer' }}
                        className="text-start"
                        onClick={() => handleSort('id')}
                        title="Trier par ID"
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          <span>ID</span>
                          {getSortIcon('id')}
                        </div>
                      </th>

                      <th
                        style={{ width: '240px', cursor: 'pointer' }}
                        className="text-start"
                        onClick={() => handleSort('filename')}
                        title={t('sortByFilename')}
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          <span>{t('filename')}</span>
                          {getSortIcon('filename')}
                        </div>
                      </th>

                      {(user?.role === 'admin' || user?.role === 'superuser') && (
                        <th
                          style={{ width: '150px', cursor: 'pointer' }}
                          className="text-start"
                          onClick={() => handleSort('owner')}
                          title={t('sortByOwner')}
                        >
                          <div className="d-flex align-items-center justify-content-start gap-1">
                            <span>{t('owner')}</span>
                            {getSortIcon('owner')}
                          </div>
                        </th>
                      )}

                      <th
                        style={{ width: '120px', cursor: 'pointer' }}
                        className="text-start"
                        onClick={() => handleSort('created_at')}
                        title={t('sortByDate')}
                      >
                        <div className="d-flex align-items-center justify-content-start gap-1">
                          <span>Date d'import</span>
                          {getSortIcon('created_at')}
                        </div>
                      </th>
                      <th style={{ width: '120px' }} className="text-center"></th>
                    </tr>
                    <tr className="bg-light">
                      <th>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="ID..."
                          value={columnFilters.id}
                          onChange={(e) => handleColumnFilterChange('id', e.target.value)}
                        />
                      </th>
                      <th><input type="text" className="form-control form-control-sm" placeholder={t('filenamePlaceholder')} value={columnFilters.filename} onChange={(e) => handleColumnFilterChange('filename', e.target.value)} /></th>
                      {(user?.role === 'admin' || user?.role === 'superuser') && (
                        <th><input type="text" className="form-control form-control-sm" placeholder={t('ownerPlaceholder')} value={columnFilters.owner} onChange={(e) => handleColumnFilterChange('owner', e.target.value)} /></th>
                      )}
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={user?.role === 'admin' || user?.role === 'superuser' ? "5" : "4"} className="text-center py-4">{t('loading')}</td></tr>
                    ) : filteredDocuments.length > 0 ? (
                      filteredDocuments.map(doc => (
                        <tr
                          key={doc.id}
                          onClick={() => handleViewDocument(doc)}
                          style={{ cursor: 'pointer' }}
                          className="table-row-hover"
                        >
                          <td>{doc.id}</td>
                          <td>{doc.filename}</td>
                          {(user?.role === 'admin' || user?.role === 'superuser') && <td>{`${doc.owner_name || doc.owner || ''} ${doc.owner_surname || ''}`.trim()}</td>}
                          <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-outline-success me-1"
                              style={{ backgroundColor: 'blue', color: 'white' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSend(doc);
                              }}
                              disabled={processingDocId === doc.id}
                            >
                              {processingDocId === doc.id ? t('moving') : t('move')}
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger me-1"
                              style={{ backgroundColor: 'orangered', color: 'white' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDocument(doc);
                              }}
                            >
                              {t('delete')}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={user?.role === 'admin' || user?.role === 'superuser' ? "5" : "4"} className="text-center py-4">{getNoDataMessage()}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* filters removed - table is full-width */}
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewModalOpen && createPortal(
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
          justifyContent: 'center',
        }}>
          <div className="modal-content-enhanced" style={{
            width: '95vw',
            height: '90vh',
            maxWidth: '900px',
            backgroundColor: 'white',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div className="modal-header-enhanced" style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#1f2937',
              }}>
                {previewTitle}
              </h3>
              <button
                className="close-btn"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  if (previewUrl) window.URL.revokeObjectURL(previewUrl);
                  setCurrentDocument(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
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
                    value={previewUrl}
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
                      {t('previewNotSupported')}
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
                <h4 style={{
                  margin: '0 0 20px 0',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#1f2937'
                }}>
                  {t('documentInfo')}
                </h4>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    {t('filename')}
                  </label>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#1f2937',
                    wordBreak: 'break-word'
                  }}>
                    {currentDocument?.filename || '-'}
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    {t('uploadDate')}
                  </label>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#1f2937'
                  }}>
                    {currentDocument?.created_at ? new Date(currentDocument.created_at).toLocaleDateString('fr-FR') : '-'}
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '##6b7280',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    {t('documentId')}
                  </label>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#1f2937'
                  }}>
                    {currentDocument?.id || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingDocument && createPortal(
        <div className="modal-overlay">
          <div className="modal-container modal-container--medium">
            <div className="modal-header">
              <div className="modal-header__content">
                <div className="modal-header__icon">🗑️</div>
                <h2 className="modal-title">{t('confirmDelete')}</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={handleCancelDelete}
                aria-label={t('close')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body modal-body--scrollable" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {t('deleteConfirmation')}
              </p>
              <p className="text-muted" style={{ fontSize: '0.98rem', marginBottom: 0 }}>
                {t('deleteWarning')}
              </p>
              {deleteError && <div className="alert alert--error mt-3">{deleteError}</div>}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="action-btn action-btn--secondary"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="action-btn action-btn--primary"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{ backgroundColor: 'orangered' }}
              >
                {isDeleting ? (
                  t('deleting')
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 .5.5V6h3v1h-1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7H2V6h3v-.5zM14 3H10l-.5-1A1 1 0 0 0 8.6 1H7.4a1 1 0 0 0-.9.5L6 3H2v1h12V3z" />
                    </svg>
                    Oui, supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && createPortal(
        <DmsTempUploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onUploadComplete={() => {
            setIsUploadModalOpen(false);
            fetchDocuments();
          }}
        />,
        document.body
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && confirmationData && createPortal(
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-container modal-container--large">
            <div className="modal-header">
              <div className="modal-header__content">
                <div className="modal-header__icon">📋</div>
                <h2 className="modal-title">Import vers DMS: Étape 2/2 - Chargement</h2>
              </div>
              <button className="modal-close-btn" onClick={handleCancelConfirmation} aria-label={t('close')}>
                ×
              </button>
            </div>
            <div className="modal-body modal-body--scrollable">
              <DocumentConfirmationForm
                files={confirmationData}
                onConfirm={handleConfirmDocuments}
                onCancel={handleModalClose}
                initialCompany={selectedCompany}
                initialDoctype={selectedDoctype}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TempDocumentArchive;