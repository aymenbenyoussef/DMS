import React, { useRef, useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { exportToCSV, exportToJSON, exportToTXT, exportToExcel } from './exportUtils';

const AdminPartnerTypes = ({ user }) => {
  const [partnerTypes, setPartnerTypes] = useState([]);
  const [filteredPartnerTypes, setFilteredPartnerTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [editingPartnerType, setEditingPartnerType] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showModifyTab, setShowModifyTab] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalErrors, setGlobalErrors] = useState([]);
  const [filters, setFilters] = useState({
    id: '',
    name: ''
  });
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    status: true
  });

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Central auto-hide for toasts: hide after 5 seconds unless user closes earlier
  useEffect(() => {
    if (!toast.visible) return;
    const id = setTimeout(() => {
      setToast(t => ({ ...t, visible: false }));
    }, 5000);
    return () => clearTimeout(id);
  }, [toast.visible]);

  useEffect(() => {
    fetchPartnerTypes();
  }, []);

  const fetchPartnerTypes = async () => {
    try {
      setLoading(true);
      const response = await API.partnertype.getAll();
      setPartnerTypes(response.data);
      setFilteredPartnerTypes(response.data);
      setInitialLoadComplete(true);
    } catch (err) {
        const errMsg = 'Error loading partner types';
        setToast({ visible: true, message: errMsg, type: 'error' });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
        console.error('Error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filters, partnerTypes]);

  // New useEffect to handle notification display
  useEffect(() => {
    if (initialLoadComplete && !loading && filteredPartnerTypes.length === 0) {
      const message = partnerTypes.length === 0 ? 'No partner types available' : 'No partner types found matching your filters';
        setToast({ visible: true, message: message, type: 'success' });
        const timer = setTimeout(() => {
            setToast(t => ({ ...t, visible: false }));
        }, 5000);
        
        return () => clearTimeout(timer);
    }
  }, [initialLoadComplete, loading, filteredPartnerTypes, partnerTypes]);

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

  const applyFilters = () => {
    let result = [...partnerTypes];
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        result = result.filter(partnerType => 
          String(partnerType[key]).toLowerCase().includes(filters[key].toLowerCase())
        );
      }
    });
    
    setFilteredPartnerTypes(result);
  };

  const handleFilterChange = (e, field) => {
    setFilters({
      ...filters,
      [field]: e.target.value
    });
  };

  const validate = () => {
    const errors = {};
    const errorMessages = [];

    if (!formData.name.trim()) {
      errors.name = 'Le nom est requis';
      errorMessages.push('Le nom est requis');
    }

    setFieldErrors(errors);
    setGlobalErrors(errorMessages);
    return errorMessages.length === 0;
  };

  const handleEdit = (partnerType) => {
    setEditingPartnerType(partnerType);
    setFormData({
      name: partnerType.name || '',
      status: partnerType.status
    });
    setShowModifyTab(true);
    setActiveTab('form');
    setFieldErrors({});
    setGlobalErrors([]);
  };


  // Sorting logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredPartnerTypes].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredPartnerTypes(sorted);
  };

  // Export logic
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nom' }
  ];
  const handleExport = (type) => {
    const data = filteredPartnerTypes.map(pt => ({
      id: pt.id,
      name: pt.name
    }));
    if (type === 'csv') exportToCSV(data, columns, 'partnertypes.csv');
    if (type === 'json') exportToJSON(data, 'partnertypes.json');
    if (type === 'txt') exportToTXT(data, columns, 'partnertypes.txt');
    if (type === 'excel') exportToExcel(data, columns, 'partnertypes.xls');
  };


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setGlobalErrors([]);
    
    if (!validate()) return;
    if (!editingPartnerType) return;
    
    try {
      await API.partnertype.update(editingPartnerType.id, formData);
        const msg = 'Type de partenaire mis à jour avec succès';
        setToast({ visible: true, message: msg, type: 'success' });
        setTimeout(() => {
            setToast(t => ({ ...t, visible: false }));
        }, 5000);
      setEditingPartnerType(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchPartnerTypes();
    } catch (err) {
      const apiError = err.response?.data;
      const errorMessage = apiError?.msg || apiError?.error || apiError?.message || 'Error updating partner';
      
      if (errorMessage.toLowerCase().includes('name')) {
        setFieldErrors({ name: 'Le nom du type de partenaire existe déjà' });
        setGlobalErrors(['Le nom du type de partenaire existe déjà']);
      } else {
        const errMsg = 'Erreur lors de la mise à jour du type de partenaire';
        setToast({ visible: true, message: errMsg, type: 'error' });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
        console.error('Erreur lors de la mise à jour du type de partenaire:', err);
      }
    }
  };
  
  const handleResetFilters = () => {
    // Reset all filters
    setFilters({
      id: '',
      name: ''
    });
    // Reset sorting
    setSortConfig({ key: null, direction: 'asc' });
    // Reset filtered partner types to show all partner types
    setFilteredPartnerTypes(partnerTypes);
  };

  return (
    <div className="admin-users">
        <div className={`top-toast ${toast.type === 'error' ? 'top-toast-error' : 'top-toast-success'} ${toast.visible ? 'show' : ''}`} role="status" aria-live="polite">
            <div className="top-toast-inner">
            <div className="top-toast-icon">{toast.type === 'error' ? '✖️' : '✓'}</div>
            <div className="top-toast-message">{toast.message}</div>
            <button className="top-toast-close" onClick={() => setToast(t => ({ ...t, visible: false }))} aria-label="Fermer la notification">✕</button>
            </div>
        </div>
      <div className="admin-header">
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('list');
              setShowModifyTab(false);
              setEditingPartnerType(null);
            }}
          >
            Liste des types de partenaires
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Modifier le type de partenaire
            </button>
          )}
          
          <div className="admin-tabs-right">
            <button className="btn-reset" onClick={handleResetFilters} disabled={loading}>
              Reset Filter
            </button>

            <div className="export-wrapper">
              <button className="export-dropdown-btn" onClick={() => setExportMenuOpen(v => !v)}>
                Export ▾
              </button>
              {exportMenuOpen && (
                <ul ref={exportMenuRef} className="export-dropdown-list">
                  <li onClick={() => { handleExport('csv'); setExportMenuOpen(false); }} style={{padding: '8px 16px', cursor: 'pointer'}}>CSV</li>
                  <li onClick={() => { handleExport('json'); setExportMenuOpen(false); }} style={{padding: '8px 16px', cursor: 'pointer'}}>JSON</li>
                  <li onClick={() => { handleExport('txt'); setExportMenuOpen(false); }} style={{padding: '8px 16px', cursor: 'pointer'}}>TXT</li>
                  <li onClick={() => { handleExport('excel'); setExportMenuOpen(false); }} style={{padding: '8px 16px', cursor: 'pointer'}}>Excel</li>
                </ul>
              )}
            </div>

            <Link to="/AddPartnerType" className="btn-primary-2" aria-label="Ajouter un type de partenaire" style={{fontWeight: 700, display: 'inline-flex', alignItems: 'center'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle'}} aria-hidden="true">
                <line x1="12" y1="4" x2="12" y2="20"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
              </svg>
              Type de partenaire
            </Link>
          </div>
        </div>
      </div>

      
      {activeTab === 'list' && (
        <div className="users-list">
          {/* Header-level controls are used now; duplicate list controls removed */}

          {loading && (
            <div className="loading-message">
              Chargement des types de partenaires...
            </div>
          )}

          <div className="users-table-container">
            <table className="users-table-fixed">
              <thead>
                <tr>
                  <th style={{width: '24px', minWidth: '24px', maxWidth: '24px', padding: 0}}></th>
                  <th style={{cursor:'pointer', background: sortConfig.key === 'id' ? '#f0f4fa' : undefined, color: sortConfig.key === 'id' ? '#1976d2' : undefined}} onClick={() => handleSort('id')}>
                    ID <span style={{fontSize:'1em'}}>{sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th style={{cursor:'pointer', background: sortConfig.key === 'name' ? '#f0f4fa' : undefined, color: sortConfig.key === 'name' ? '#1976d2' : undefined}} onClick={() => handleSort('name')}>
                    Nom <span style={{fontSize:'1em'}}>{sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th>Actions</th>
                </tr>
                <tr className="filter-row">
                  <td></td>
                  <td>
                    <input
                      type="text"
                      value={filters.id}
                      onChange={(e) => handleFilterChange(e, 'id')}
                      placeholder="Filtrer l'ID"
                      className="filter-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={filters.name}
                      onChange={(e) => handleFilterChange(e, 'name')}
                      placeholder="Filtrer le nom"
                      className="filter-input"
                    />
                  </td>
                  <td></td>
                </tr>
              </thead>
              <tbody className="table-body-scrollable">
                {!loading && filteredPartnerTypes.length > 0 && (
                  filteredPartnerTypes.map(partnerType => (
                    <tr key={partnerType.id}>
                      <td style={{width: '24px', minWidth: '24px', maxWidth: '24px', padding: 0, textAlign: 'center'}}>
                        <div className={`status-led ${partnerType.status ? 'status-led-active' : 'status-led-inactive'}`}></div>
                      </td>
                      <td>{partnerType.id}</td>
                      <td>{partnerType.name}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(partnerType)}
                            aria-label="Modifier le type de partenaire"
                            style={{display: 'inline-flex', alignItems: 'center', gap: '8px'}}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{marginRight: '6px'}}>
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                            Modifier
                          </button>
                          
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'form' && (
        <div className="user-form">
          
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="nom de type de partenaire"
                className={fieldErrors.name ? 'error-input' : ''}
              />
              {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
            </div>
            
            <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'flex-start' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <input
                  type="checkbox"
                  name="status"
                  checked={formData.status}
                  onChange={handleInputChange}
                />
                Active
              </label>
            </div>
            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setActiveTab('list');
                  setShowModifyTab(false);
                  setEditingPartnerType(null);
                }}
              >
                Annuler
              </button>
              <button type="submit" className="btn-primary">
                Mettre à jour 
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPartnerTypes;

