import React, { useRef, useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { exportToCSV, exportToJSON, exportToTXT, exportToExcel } from './exportUtils';

const AdminCompanies = ({ user }) => {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [editingCompany, setEditingCompany] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showModifyTab, setShowModifyTab] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalErrors, setGlobalErrors] = useState([]);
  const [filters, setFilters] = useState({
    id: '',
    name: '',
    address: '',
    phone: '',
    email: ''
  });
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    is_active: true
  });

  const [maxEntities, setMaxEntities] = useState(null);
  const [globalLimitError, setGlobalLimitError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    fetchCompanies();
    API.settings.getSettings().then(res => {
      setMaxEntities(res.data.maxEntities);
    });
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, companies]);

  useEffect(() => {
    if (globalLimitError) {
      const timer = setTimeout(() => setGlobalLimitError(''), 10000);
      return () => clearTimeout(timer);
    }
  }, [globalLimitError]);

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

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await API.companies.getAll();
      const companiesData = Array.isArray(response?.data) ? response.data : [];
      setCompanies(companiesData);
      setFilteredCompanies(companiesData);
      setInitialLoadComplete(true);
    } catch (err) {
        const errMsg = 'Erreur lors du chargement des entreprises';
        setToast({ visible: true, message: errMsg, type: 'error' });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
        console.error('Error details:', err.response?.data || err.message);
      setCompanies([]);
      setFilteredCompanies([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (initialLoadComplete && !loading && filteredCompanies.length === 0) {
      const message = companies.length === 0 ? 'Aucune entreprise disponible' : 'Aucune entreprise ne correspond à vos filtres';
        setToast({ visible: true, message: message, type: 'success' });
        const timer = setTimeout(() => {
            setToast(t => ({ ...t, visible: false }));
        }, 5000);
        
        return () => clearTimeout(timer);
    }
  }, [initialLoadComplete, loading, filteredCompanies, companies]);

  const applyFilters = () => {
    const companiesArray = Array.isArray(companies) ? companies : [];
    let result = [...companiesArray];
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        result = result.filter(company => 
          company && String(company[key]).toLowerCase().includes(filters[key].toLowerCase())
        );
      }
    });
    
    setFilteredCompanies(result);
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
  
    if (!String(formData.name || '').trim()) {
      errors.name = 'Le nom de l\'entreprise est requis';
      errorMessages.push('Le nom de l\'entreprise est requis');
    }
    if (!String(formData.address || '').trim()) {
      errors.address = 'L\'adresse est requise';
      errorMessages.push('L\'adresse est requise');
    }
    if (!String(formData.phone || '').trim()) {
      errors.phone = 'Le numéro de téléphone est requis';
      errorMessages.push('Le numéro de téléphone est requis');
    } else if (!/^\d{8}$/.test(formData.phone)) {
      errors.phone = 'Le numéro de téléphone doit contenir exactement 8 chiffres';
      errorMessages.push('Le numéro de téléphone doit contenir exactement 8 chiffres');
    }
    if (!String(formData.email || '').trim()) {
      errors.email = 'L\'email est requis';
      errorMessages.push('L\'email est requis');
    } else if (!/^([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/.test(formData.email) || (formData.email.match(/@/g) || []).length !== 1) {
      errors.email = 'Format d\'email invalide.';
      errorMessages.push('Format d\'email invalide.');
    }
  
    setFieldErrors(errors);
    setGlobalErrors(errorMessages);
    return errorMessages.length === 0;
  };

  const handleEdit = (company) => {
    setGlobalLimitError('');
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      description: company.description || '',
      is_active: company.is_active !== undefined ? company.is_active : true
    });
    setShowModifyTab(true);
    setActiveTab('form');
    setFieldErrors({});
    setGlobalErrors([]);
  };

  const handleDelete = async (companyId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) {
      try {
        await API.companies.delete(companyId);
        const msg = 'Entreprise supprimée avec succès';
        setToast({ visible: true, message: msg, type: 'success' });
        setTimeout(() => {
            setToast(t => ({ ...t, visible: false }));
        }, 5000);
        fetchCompanies();
      } catch (err) {
        const errMsg = 'Erreur lors de la suppression de l\'entreprise';
        setToast({ visible: true, message: errMsg, type: 'error' });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
        console.error('Error deleting company:', err);
      }
    }
    window.dispatchEvent(new CustomEvent('companyDeleted'));
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
    if (!editingCompany) return;
    
    try {
      await API.companies.update(editingCompany.id, formData);
        const msg = 'Entreprise mise à jour avec succès';
        setToast({ visible: true, message: msg, type: 'success' });
        setTimeout(() => {
            setToast(t => ({ ...t, visible: false }));
        }, 4000);
      setEditingCompany(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchCompanies();
      window.dispatchEvent(new Event('companyUpdated'));
    } catch (err) {
      const apiError = err.response?.data;
      const errorMessage = apiError?.msg || apiError?.error || apiError?.message || 'Error updating company';
      
      if (errorMessage.toLowerCase().includes('name')) {
        setFieldErrors({ name: 'Le nom de l\'entreprise existe déjà' });
        setGlobalErrors(['Le nom de l\'entreprise existe déjà']);
      } else if (errorMessage.toLowerCase().includes('email')) {
        setFieldErrors({ email: 'L\'email existe déjà' });
        setGlobalErrors(['L\'email existe déjà']);
      } else {
        const errMsg = 'Erreur lors de la mise à jour de l\'entreprise';
        setToast({ visible: true, message: errMsg, type: 'error' });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
        console.error('Error updating company:', err);
      }
    }
  };

  const dismissNotification = () => {
    setToast(t => ({ ...t, visible: false }));
  };

  const handleAddEntity = (e) => {
    setGlobalLimitError('');
    if (maxEntities !== null && companies.length >= maxEntities) {
      setGlobalLimitError('Vous avez atteint le nombre maximal d entités. Veuillez contacter le support technique.');
      return;
    }
    else {
      navigate('/AddComp');
    }
  };

  const handleTabChange = (tab) => {
    setGlobalLimitError('');
    setActiveTab(tab);
    setShowModifyTab(false);
    setEditingCompany(null);
  };

  // Sorting logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredCompanies].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredCompanies(sorted);
  };

  // Export logic
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: "Nom de l'entité" },
    { key: 'address', label: 'Adresse' },
    { key: 'email', label: 'Email' }
  ];
  const handleExport = (type) => {
    const data = filteredCompanies.map(c => ({
      id: c.id,
      name: c.name,
      address: c.address,
      email: c.email
    }));
    if (type === 'csv') exportToCSV(data, columns, 'companies.csv');
    if (type === 'json') exportToJSON(data, 'companies.json');
    if (type === 'txt') exportToTXT(data, columns, 'companies.txt');
    if (type === 'excel') exportToExcel(data, columns, 'companies.xls');
  };

  const handleResetFilters = () => {
    // Reset all filters
    setFilters({
      id: '',
      name: '',
      address: '',
      email: ''
    });
    // Reset sorting
    setSortConfig({ key: null, direction: 'asc' });
    // Reset filtered companies to show all companies
    setFilteredCompanies(companies);
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
            onClick={() => handleTabChange('list')}
          >
            Liste des entités
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => handleTabChange('form')}
            >
              Modifier l'entité
            </button>
          )}
          <div className="admin-tabs-right">
            <button className="btn-reset" onClick={handleResetFilters} disabled={loading}>
              Réinitialiser le filtre
            </button>

            <div className="export-wrapper">
              <button className="export-dropdown-btn" onClick={() => setExportMenuOpen(v => !v)}>
                Exporter ▾
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

            <button
              className="btn-primary-2"
              onClick={handleAddEntity}
              disabled={loading}
              aria-label="Ajouter une entité"
              style={{fontWeight: 700, display: 'inline-flex', alignItems: 'center'}}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle'}} aria-hidden="true">
                <line x1="12" y1="4" x2="12" y2="20"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
              </svg>
              Entité
            </button>
          </div>
        </div>
      </div>

      {/* Show global limit error if present */}
        {globalLimitError && (
          <div className="alert alert-error" style={{marginBottom: '12px'}}>
            {globalLimitError}
          </div>
        )}
      
      

      {activeTab === 'list' && (
        <div className="users-list">
          {/* Inline export/reset removed — toolbar in header handles these actions */}

          {loading && (
            <div className="loading-message">
              Chargement des entités...
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
                    Nom de l'entité <span style={{fontSize:'1em'}}>{sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th style={{cursor:'pointer', background: sortConfig.key === 'address' ? '#f0f4fa' : undefined, color: sortConfig.key === 'address' ? '#1976d2' : undefined}} onClick={() => handleSort('address')}>
                    Adresse <span style={{fontSize:'1em'}}>{sortConfig.key === 'address' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th style={{cursor:'pointer', background: sortConfig.key === 'email' ? '#f0f4fa' : undefined, color: sortConfig.key === 'email' ? '#1976d2' : undefined}} onClick={() => handleSort('email')}>
                    Email <span style={{fontSize:'1em'}}>{sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
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
                      placeholder="Filtrer par ID"
                      className="filter-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={filters.name}
                      onChange={(e) => handleFilterChange(e, 'name')}
                      placeholder="Filtrer par nom"
                      className="filter-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={filters.address}
                      onChange={(e) => handleFilterChange(e, 'address')}
                      placeholder="Filtrer par adresse"
                      className="filter-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={filters.email}
                      onChange={(e) => handleFilterChange(e, 'email')}
                      placeholder="Filtrer par email"
                      className="filter-input"
                    />
                  </td>
                  <td></td>
                </tr>
              </thead>
              <tbody className="table-body-scrollable">
                {!loading && filteredCompanies.length > 0 && (
                  filteredCompanies.map(company => (
                    <tr key={company.id}>
                      <td style={{width: '24px', minWidth: '24px', maxWidth: '24px', padding: 0, textAlign: 'center'}}>
                        <div className={`status-led ${company.is_active ? 'status-led-active' : 'status-led-inactive'}`}></div>
                      </td>
                      <td>{company.id}</td>
                      <td>{company.name}</td>
                      <td>{company.address}</td>
                      <td>{company.email}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(company)}
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

      {activeTab === 'form' && editingCompany && (
        <div className="user-form">
          <h2>Modifier l'entité</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Nom de l'entité *</label>
              <input
                type="text"
                name="name"
                placeholder="Entrez le nom de l'entité"
                value={formData.name}
                onChange={handleInputChange}
                className={fieldErrors.name ? 'input-error' : ''}
              />
              {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
            </div>
            <div className="form-group">
              <label>Adresse *</label>
              <input
                type="text"
                name="address"
                placeholder="Entrez l'adresse"
                value={formData.address}
                onChange={handleInputChange}
                className={fieldErrors.address ? 'input-error' : ''}
              />
              {fieldErrors.address && <div className="field-error">{fieldErrors.address}</div>}
            </div>
            <div className="form-group">
              <label>Téléphone *</label>
              <input
                type="text"
                name="phone"
                placeholder="Entrez le téléphone"
                value={formData.phone}
                onChange={handleInputChange}
                className={fieldErrors.phone ? 'input-error' : ''}
              />
              {fieldErrors.phone && <div className="field-error">{fieldErrors.phone}</div>}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                placeholder="Entrez l'email"
                value={formData.email}
                onChange={handleInputChange}
                className={fieldErrors.email ? 'input-error' : ''}
              />
              {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                placeholder="Entrez le description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
              />
            </div>

            <div className="form-group checkbox-group">
              <label>Actif</label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setActiveTab('list');
                  setShowModifyTab(false);
                  setEditingCompany(null);
                }}
              >
                Annuler
              </button>
              <button type="submit" className="btn">
                Mettre à jour l'entité
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminCompanies;

