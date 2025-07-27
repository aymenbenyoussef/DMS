import React, { useState, useEffect, useContext, useRef } from 'react';
import API from '../../api';
import { AppContext } from '../context';
import TempDocumentConfirmationForm from './TempDocumentConfirmationForm';
import DmsTempUploadModal from './DmsTempUploadModal';
import { exportToCSV, exportToJSON, exportToTXT, exportToExcel } from '../Admin/exportUtils';
import './TempDocumentArchive.css';

const TempDocumentArchive = ({ user }) => {
  const { selectedCompany, selectedDoctype, setSelectedCompany, setSelectedDoctype } = useContext(AppContext);
  
  // Note: User-based filtering is handled automatically by the backend
  // Regular users only see their own temp documents, while admins and superusers see all documents

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

  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
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
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Column filter states
  const [columnFilters, setColumnFilters] = useState({
    id: '',
    filename: '',
    owner: ''
  });
  
  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState(null);

  // Sorting and export states
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line
  }, [startDate, endDate]);

  // Filter documents based on column filters
  useEffect(() => {
    let filtered = [...documents];
    
    // Filter by search term (searches across all data)
    if (searchTerm && searchTerm.trim() !== '') {
      filtered = filtered.filter(doc => {
        const searchLower = searchTerm.toLowerCase();
        const searchFields = [
          String(doc.id).toLowerCase(),
          String(doc.filename).toLowerCase(),
          String(doc.created_at).toLowerCase()
        ];
        
        // Add owner field to search for admin and superuser
        if (user?.role === 'admin' || user?.role === 'superuser') {
          searchFields.push(String(doc.owner_name || doc.owner || '').toLowerCase());
        }
        
        return searchFields.some(field => field.includes(searchLower));
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
  }, [documents, columnFilters, searchTerm, user?.role]);

  // Add event listener for temporary document uploads
  useEffect(() => {
    const handleTempDocumentUpload = () => {
      fetchDocuments();
    };

    // Listen for temporary document uploads
    window.addEventListener('TempDocumentsUploaded', handleTempDocumentUpload);
    
    // Cleanup event listener on component unmount
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

  // Check if there are any active filters
  const hasActiveFilters = () => {
    // Check column filters
    const hasColumnFilters = Object.values(columnFilters).some(value => value && value.trim() !== '');
    
    // Check date filters (if they're different from default)
    const defaultStartDate = getFirstDayOfMonth();
    const defaultEndDate = getToday();
    const hasDateFilters = startDate !== defaultStartDate || endDate !== defaultEndDate;
    
    // Check search term
    const hasSearchTerm = searchTerm && searchTerm.trim() !== '';
    
    return hasColumnFilters || hasDateFilters || hasSearchTerm;
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


  const handleViewDocument = async (doc) => {
    try {
      const response = await API.tempDocuments.download(doc.id);
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
      
      // Dispatch event to refresh the table (in case other components need to know)
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
    
    // Store original company and doctype to restore later
    setOriginalCompany(selectedCompany);
    setOriginalDoctype(selectedDoctype);
    
    try {
      // Download the file to get the blob
      const response = await API.tempDocuments.download(doc.id);
      const blob = response.data;
      
      // Create a File object from the blob
      const file = new File([blob], doc.filename, { type: blob.type });
      
      // Process the file with OCR (similar to DragDropUpload)
      const ocrResponse = await API.documents.uploadSingleFile(
        file,
        selectedCompany?.id || null, // Use selected company if available
        selectedDoctype?.id || null  // Use selected doctype if available
      );
      
      // Set up confirmation data
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
          // Remove the temporary document from the list since it's now confirmed
          setDocuments(prev => prev.filter(d => d.id !== currentDocument?.id));
          setFilteredDocuments(prev => prev.filter(d => d.id !== currentDocument?.id));
          
          // Dispatch event to refresh the table
          window.dispatchEvent(new Event('TempDocumentsUploaded'));
          
          // Modal will be closed by the form after showing success message
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
    
    // Restore original company and doctype
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
    
    // Restore original company and doctype
    if (originalCompany) {
      setSelectedCompany(originalCompany);
    }
    if (originalDoctype) {
      setSelectedDoctype(originalDoctype);
    }
    
    setOriginalCompany(null);
    setOriginalDoctype(null);
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
      } else if (key === 'created_at') {
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
      { key: 'created_at', label: 'Date d\'upload' }
    ];

    const data = filteredDocuments.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      created_at: doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR') : '-'
    }));

    if (type === 'csv') exportToCSV(data, columns, 'temp_documents.csv');
    if (type === 'json') exportToJSON(data, 'temp_documents.json');
    if (type === 'txt') exportToTXT(data, columns, 'temp_documents.txt');
    if (type === 'excel') exportToExcel(data, columns, 'temp_documents.xls');
  };

  // Reset all filters and sorting
  const handleResetFilters = () => {
    setStartDate(getFirstDayOfMonth());
    setEndDate(getToday());
    setSearchTerm('');
    setColumnFilters({
      id: '',
      filename: '',
      owner: ''
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

  return (
    <div className="container-fluid py-4">

      <div className="card mb-4 search-filter-container">
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h6 mb-0">Recherche & Filtres</h2>
            <button 
              className="btn btn-blue d-flex align-items-center"
              style={{ marginRight: '20px'}}
              onClick={() => setIsUploadModalOpen(true)}
            >
              <i className="bi bi-plus me-2"></i> Télécharger
            </button>
          </div>
          <div className="row g-3">
            <div className="col-md-6">
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
            </div>
            <div className="col-md-6">
              <label className="form-label small">Rechercher</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Rechercher dans les données..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <h2 className="h6 mb-0">Documents temporaires</h2>
            <div className="d-flex align-items-center gap-3">
              <span className="text-muted items-count">{filteredDocuments.length} items</span>
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
            </div>
          </div>
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive documents-table-container">
              <table className="table table-hover stylish-table">
                <thead className="table-header-sticky">
                  <tr>
                    <th style={{cursor:'pointer', background: sortConfig.key === 'id' ? '#f0f4fa' : undefined, color: sortConfig.key === 'id' ? '#1976d2' : undefined}} onClick={() => handleSort('id')}>
                      ID <span style={{fontSize:'1em'}}>{sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                    <th style={{cursor:'pointer', background: sortConfig.key === 'filename' ? '#f0f4fa' : undefined, color: sortConfig.key === 'filename' ? '#1976d2' : undefined}} onClick={() => handleSort('filename')}>
                      Document <span style={{fontSize:'1em'}}>{sortConfig.key === 'filename' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                    {(user?.role === 'admin' || user?.role === 'superuser') && (
                      <th style={{cursor:'pointer', background: sortConfig.key === 'owner' ? '#f0f4fa' : undefined, color: sortConfig.key === 'owner' ? '#1976d2' : undefined}} onClick={() => handleSort('owner')}>
                        Owner <span style={{fontSize:'1em'}}>{sortConfig.key === 'owner' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>
                    )}
                    <th style={{cursor:'pointer', background: sortConfig.key === 'created_at' ? '#f0f4fa' : undefined, color: sortConfig.key === 'created_at' ? '#1976d2' : undefined}} onClick={() => handleSort('created_at')}>
                      Date d'upload <span style={{fontSize:'1em'}}>{sortConfig.key === 'created_at' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                    <th>Action</th>
                  </tr>
                  {/* Filter Row */}
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Filter ID..."
                        value={columnFilters.id}
                        onChange={(e) => handleColumnFilterChange('id', e.target.value)}
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Filter Document..."
                        value={columnFilters.filename}
                        onChange={(e) => handleColumnFilterChange('filename', e.target.value)}
                      />
                    </th>
                    {(user?.role === 'admin' || user?.role === 'superuser') && (
                      <th>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Filter Owner..."
                          value={columnFilters.owner}
                          onChange={(e) => handleColumnFilterChange('owner', e.target.value)}
                        />
                      </th>
                    )}
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="table-row-hover">
                      <td className="text-muted">{doc.id}</td>
                      <td>{doc.filename}</td>
                      {(user?.role === 'admin' || user?.role === 'superuser') && (
                        <td>{doc.owner_name || doc.owner || '-'}</td>
                      )}
                      <td>{doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR') : '-'}</td>
                                            <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-outline-primary d-flex align-items-center justify-content-center"
                            onClick={() => handleViewDocument(doc)}
                            title="Voir"
                            style={{
                              padding: '8px 12px',
                              fontSize: '14px',
                              minWidth: '80px'
                            }}
                          >
                            <i className="bi bi-eye me-1"></i>
                            Voir
                          </button>
                          <button
                            className="btn btn-outline-info d-flex align-items-center justify-content-center"
                            onClick={() => handleSend(doc)}
                            disabled={processingDocId === doc.id}
                            title="Envoyer"
                            style={{
                              padding: '8px 12px',
                              fontSize: '14px',
                              minWidth: '80px',
                              ...(processingDocId === doc.id && {
                              
                                color: 'white',
                                
                              })
                            }}
                          >
                            {processingDocId === doc.id ? (
                              'Traitement...'
                            ) : (
                              <>
                                <i className="bi bi-send me-1"></i>
                                déplacer
                              </>
                            )}
                          </button>
                          <button
                            className="btn btn-outline-warning d-flex align-items-center justify-content-center"
                            onClick={() => handleDeleteDocument(doc)}
                            disabled={isDeleting}
                            title="Supprimer"
                            style={{
                              padding: '8px 12px',
                              fontSize: '14px',
                              minWidth: '80px',
                              backgroundColor: 'orangered',
                              color: 'white'
                            }}
                          >
                            <i className="bi bi-trash me-1"></i>
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={(user?.role === 'admin' || user?.role === 'superuser') ? 5 : 4} className="text-center py-5">
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
                              onClick={() => setIsUploadModalOpen(true)}
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

      {/* Document Confirmation Modal */}
      {showConfirmationModal && confirmationData && (
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
          <div className="modal-content" style={{
            width: '80vw',
            maxWidth: '800px',
            maxHeight: '95vh',
            height: '90vh',
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Modal Header */}
            <div className="modal-header" style={{
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
                Confirmation de document
              </h3>
              <button
                className="close-btn"
                onClick={handleCancelConfirmation}
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
            
            {/* Modal Body */}
            <div className="modal-body" style={{ flex: 1, overflow: 'hidden' }}>
              <TempDocumentConfirmationForm
                files={confirmationData}
                onConfirm={handleConfirmDocuments}
                onCancel={handleModalClose}
                initialCompany={selectedCompany}
                initialDoctype={selectedDoctype}
                tempDocumentId={currentDocument?.id}
                onRefresh={fetchDocuments}
              />
            </div>
          </div>
        </div>
      )}

      {/* Temporary Document Upload Modal */}
      {isUploadModalOpen && (
        <DmsTempUploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            setIsUploadModalOpen(false);
            // The table will automatically refresh due to the event listener
          }}
        />
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
                  style={{backgroundColor: 'gray'}}
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
    </div>
  );
};

export default TempDocumentArchive; 