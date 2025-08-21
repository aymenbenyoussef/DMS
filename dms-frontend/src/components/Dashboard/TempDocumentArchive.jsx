import React, { useState, useEffect, useContext, useRef } from 'react';
import API from '../../api';
import { AppContext } from '../context';
import DocumentConfirmationForm from './DocumentConfirmationForm';
import DmsTempUploadModal from './DmsTempUploadModal';
import { exportToCSV, exportToJSON, exportToTXT, exportToExcel } from '../Admin/exportUtils';
import './TempDocumentArchive.css';

const TempDocumentArchive = ({ user }) => {
  const { selectedCompany, selectedDoctype, setSelectedCompany, setSelectedDoctype } = useContext(AppContext);

  const getOneMonthAgo = () => {
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(now.getMonth() - 1);
    if (lastMonth.getMonth() === now.getMonth()) {
      lastMonth.setDate(0);
    }
    const year = lastMonth.getFullYear();
    const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
    const day = String(lastMonth.getDate()).padStart(2, '0');
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
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [startDate, endDate]);

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
        }
        return searchFields.some(field => field.includes(searchLower));
      });
    }
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
  }, [documents, columnFilters, searchTerm, user?.role]);

  useEffect(() => {
    const handleTempDocumentUpload = () => {
      fetchDocuments();
    };
    window.addEventListener('TempDocumentsUploaded', handleTempDocumentUpload);
    return () => {
      window.removeEventListener('TempDocumentsUploaded', handleTempDocumentUpload);
    };
  }, []);

  const fetchDocuments = async () => {
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
  };

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
      return "Il n'y a pas de données";
    } else if (hasActiveFilters()) {
      return "Aucune donnée ne correspond aux filtres actuels";
    } else {
      return "Il n'y a pas de données";
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
      alert('Erreur lors de la prévisualisation.');
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
    } catch (error) {
      setDeleteError('Erreur lors de la suppression.');
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
        filename: doc.filename
      };
      setConfirmationData([confirmationData]);
      setShowConfirmationModal(true);
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Erreur lors du traitement du document: ' + (error.response?.data?.msg || error.message));
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
        if (savedDoc && !savedDoc.error) {
          setDocuments(prev => prev.filter(d => d.id !== currentDocument?.id));
          setFilteredDocuments(prev => prev.filter(d => d.id !== currentDocument?.id));
          window.dispatchEvent(new Event('TempDocumentsUploaded'));
        }
      }
    } catch (error) {
      console.error('Error confirming document:', error);
      alert('Erreur lors de la confirmation: ' + (error.response?.data?.msg || error.message));
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
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'filename', label: 'Document' },
      { key: 'created_at', label: 'Date d\'upload' }
    ];
    const data = filteredDocuments.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      created_at: doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR') : '-'
    }));
    if (type === 'csv') exportToCSV(data, columns, 'temp_documents.csv');
    if (type === 'json') exportToJSON(data, columns, 'temp_documents.json');
    if (type === 'txt') exportToTXT(data, columns, 'temp_documents.txt');
    if (type === 'excel') exportToExcel(data, columns, 'temp_documents.xls');
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
      <div className="container-fluid h-100">
        <div className="row h-100">
          {/* Main Content Area - Table */}
          <div className={`col-lg-${isFilterCollapsed ? '12' : '9'} col-md-${isFilterCollapsed ? '12' : '8'} h-100 d-flex flex-column`}>
            {/* Header with Upload Button */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h4 className="mb-0 text-dark fw-bold d-flex align-items-center gap-2">
                <i className="fas fa-history me-2 text-primary"></i>
                Documents Temporaires
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
                <button
                  className="btn-outline-primary btn-sm"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <i className="fas fa-upload me-1"></i>
                  Télécharger
                </button>
              </div>
            </div>

            {/* Documents Table */}
            <div className="documents-table-container flex-grow-1">
              <div className="table-responsive h-100" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <table className="table table-sm table-hover mb-0" style={{tableLayout: 'fixed', width: '100%'}}>
                  <thead className="table-light sticky-top">
                    <tr>
                      <th style={{ width: '20px', cursor: 'pointer' }} className="text-center" onClick={() => handleSort('id')} title="Trier par ID">ID</th>
                      <th style={{ width: '120px', cursor: 'pointer' }} onClick={() => handleSort('filename')} title="Trier par nom de fichier">Fichier</th>
                      {(user?.role === 'admin' || user?.role === 'superuser') && (
                        <th style={{ width: '120px', cursor: 'pointer' }} onClick={() => handleSort('owner')} title="Trier par propriétaire">Propriétaire</th>
                      )}
                      <th style={{ width: '90px', cursor: 'pointer' }} className="text-center" onClick={() => handleSort('created_at')} title="Trier par date">Date</th>
                      <th style={{ width: '120px' }} className="text-center">Actions</th>
                    </tr>
                    <tr className="bg-light">
                      <th><input type="text" className="form-control form-control-sm" placeholder="ID..." value={columnFilters.id} onChange={(e) => handleColumnFilterChange('id', e.target.value)} /></th>
                      <th><input type="text" className="form-control form-control-sm" placeholder="Nom du fichier..." value={columnFilters.filename} onChange={(e) => handleColumnFilterChange('filename', e.target.value)} /></th>
                      {(user?.role === 'admin' || user?.role === 'superuser') && (
                        <th><input type="text" className="form-control form-control-sm" placeholder="Propriétaire..." value={columnFilters.owner} onChange={(e) => handleColumnFilterChange('owner', e.target.value)} /></th>
                      )}
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                </table>
                <div style={{flex: 1, overflowY: 'auto', minHeight: 0}}>
                  <table className="table table-sm table-hover mb-0" style={{tableLayout: 'fixed', width: '100%'}}>
                    <colgroup>
                      <col style={{width: '20px'}} />
                      <col style={{width: '120px'}} />
                      {(user?.role === 'admin' || user?.role === 'superuser') && <col style={{width: '120px'}} />}
                      <col style={{width: '90px'}} />
                      <col style={{width: '120px'}} />
                    </colgroup>
                    <tbody>
                      {isLoading ? (
                        <tr><td colSpan={user?.role === 'admin' || user?.role === 'superuser' ? "5" : "4"} className="text-center py-4">Chargement...</td></tr>
                      ) : filteredDocuments.length > 0 ? (
                        filteredDocuments.map(doc => (
                          <tr key={doc.id}>
                            <td className="text-center" style={{width: '20px'}}>{doc.id}</td>
                            <td style={{width: '120px'}}>{doc.filename}</td>
                            {(user?.role === 'admin' || user?.role === 'superuser') && <td style={{width: '120px'}}>{doc.owner_name || doc.owner}</td>}
                            <td className="text-center" style={{width: '90px'}}>{new Date(doc.created_at).toLocaleDateString()}</td>
                            <td className="text-center" style={{width: '120px'}}>
                              <button className="btn btn-sm btn-outline-primary me-1" style={{backgroundColor:'blue'}} onClick={() => handleViewDocument(doc)}><i className="fas fa-eye"></i>voir</button>
                              <button className="btn btn-sm btn-outline-success me-1" style={{backgroundColor:'blue'}} onClick={() => handleSend(doc)} disabled={processingDocId === doc.id}>{processingDocId === doc.id ? <i className="fas fa-eye">deplacement</i> : <i className="fas fa-eye">deplacer</i>}</button>
                              <button className="btn btn-sm btn-outline-danger me-1" style={{backgroundColor:'orangered'}}  onClick={() => handleDeleteDocument(doc)}><i className="fas fa-eye">supprimer</i></button>
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
          </div>
          {/* Filter Sidebar */}
          {!isFilterCollapsed && (
            <div className="col-lg-3 col-md-4 h-100">
              <div className="card h-100">
                <div className="card-header bg-light py-2">
                  <h6 className="mb-0 d-flex align-items-center">
                    <i className="fas fa-filter me-2 text-primary"></i>
                    Filtres
                    <button
                      className="btn btn-link btn-sm ms-auto p-0"
                      onClick={handleResetFilters}
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
                  
                  
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
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
                <h4 style={{
                  margin: '0 0 20px 0',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#1f2937'
                }}>
                  Informations du document
                </h4>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    Nom du fichier
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
                    Date d'upload
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
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    ID du document
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
                  onClick={handleCancelDelete}
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
                  onClick={handleCancelDelete}
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

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <DmsTempUploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onUploadComplete={() => {
            setIsUploadModalOpen(false);
            fetchDocuments();
          }}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && confirmationData && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-container modal-container--large">
            <div className="modal-header">
              <div className="modal-header__content">
                <div className="modal-header__icon">📋</div>
                <h2 className="modal-title">Confirmation du document</h2>
              </div>
              <button className="modal-close-btn" onClick={handleCancelConfirmation} aria-label="Fermer">
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
        </div>
      )}
    </div>
  );
};

export default TempDocumentArchive;


