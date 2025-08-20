import React, { useRef, useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { exportToCSV, exportToJSON, exportToTXT, exportToExcel } from './exportUtils';

const AdminPartnerTypes = ({ user }) => {
  const [partnerTypes, setPartnerTypes] = useState([]);
  const [filteredPartnerTypes, setFilteredPartnerTypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
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

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    fetchPartnerTypes();
  }, []);

  const fetchPartnerTypes = async () => {
    try {
      setLoading(true);
      const response = await API.partnertype.getAll();
      setPartnerTypes(response.data);
      setFilteredPartnerTypes(response.data);
    } catch (err) {
      setError('Error loading partner types');
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    applyFilters();
  }, [filters, partnerTypes]);

  // New useEffect to handle notification display
  useEffect(() => {
    if (!loading && filteredPartnerTypes.length === 0) {
      const message = partnerTypes.length === 0 ? 'No partner types available' : 'No partner types found matching your filters';
      setNotificationMessage(message);
      setShowNotification(true);
      
      // Auto-hide notification after 5 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setShowNotification(false);
    }
  }, [loading, filteredPartnerTypes, partnerTypes]);

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

  const handleDelete = async (partnerTypeId) => {
    if (window.confirm('Are you sure you want to delete this partner type?')) {
      try {
        await API.partnertype.delete(partnerTypeId);
        setSuccess('Partner type deleted successfully');
        fetchPartnerTypes();
      } catch (err) {
        setError('Error deleting partner type');
        console.error('Error deleting partner type:', err);
      }
    }
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
    setError('');
    setSuccess('');
    setGlobalErrors([]);
    
    if (!validate()) return;
    if (!editingPartnerType) return;
    
    try {
      await API.partnertype.update(editingPartnerType.id, formData);
      setSuccess('Type de partenaire mis à jour avec succès');
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
        setError('Erreur lors de la mise à jour du type de partenaire');
        console.error('Erreur lors de la mise à jour du type de partenaire:', err);
      }
    }
  };

  const dismissNotification = () => {
    setShowNotification(false);
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
          
          <Link to="/AddPartnerType" className="btn-primary-2">
            Ajouter un type de partenaire
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {activeTab === 'list' && (
        <div className="users-list">
          {/* Export dropdown */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', gap: '8px' }}>
            <button 
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onClick={handleResetFilters}
            >
              Reset Filter
            </button>
            <button className="export-dropdown-btn" onClick={() => setExportMenuOpen(v => !v)}>
              Export ▼
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
                zIndex: 10,
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

          {loading && (
            <div className="loading-message">
              Chargement des types de partenaires...
            </div>
          )}

          {/* Notification using existing alert classes with inline styles for positioning */}
          {showNotification && (
            <div 
              className="alert alert-error" 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#e3f2fd',
                color: '#1565c0',
                border: '1px solid #2196f3',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>ℹ️</span>
                <span>{notificationMessage}</span>
              </div>
              <button 
                onClick={dismissNotification}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1976d2',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(33, 150, 243, 0.1)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
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
                          >
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
          <h2>Modifier type de partenaire</h2>
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
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="status"
                  checked={formData.status}
                  onChange={handleInputChange}
                />{' '}
                Active
              </label>
            </div>
            <div className="form-actions">
              
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
              <button type="submit" className="btn">
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

