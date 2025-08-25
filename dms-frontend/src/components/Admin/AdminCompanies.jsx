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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
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

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [maxEntities, setMaxEntities] = useState(null);
  const [globalLimitError, setGlobalLimitError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    fetchCompanies();
    axios.get('http://localhost:5000/api/settings').then(res => {
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
    } catch (err) {
      setError('Erreur lors du chargement des entreprises');
      console.error('Error details:', err.response?.data || err.message);
      setCompanies([]);
      setFilteredCompanies([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let timer;
    if (success) {
      timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [success]);
  useEffect(() => {
    if (!loading && filteredCompanies.length === 0) {
      const message = companies.length === 0 ? 'Aucune entreprise disponible' : 'Aucune entreprise ne correspond à vos filtres';
      setNotificationMessage(message);
      setShowNotification(true);
      
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setShowNotification(false);
    }
  }, [loading, filteredCompanies, companies]);

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
        setSuccess('Entreprise supprimée avec succès');
        fetchCompanies();
      } catch (err) {
        setError('Erreur lors de la suppression de l\'entreprise');
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
    setError('');
    setSuccess('');
    setGlobalErrors([]);
    
    if (!validate()) return;
    if (!editingCompany) return;
    
    try {
      await API.companies.update(editingCompany.id, formData);
      setSuccess('Entreprise mise à jour avec succès');
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
        setError('Erreur lors de la mise à jour de l\'entreprise');
        console.error('Error updating company:', err);
      }
    }
  };

  const dismissNotification = () => {
    setShowNotification(false);
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
          <button
            className="btn-primary-2"
            onClick={handleAddEntity}
          >
            Ajouter une entité
          </button>
        </div>
      </div>

      
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
              Réinitialiser le filtre
            </button>
            <button className="export-dropdown-btn" onClick={() => setExportMenuOpen(v => !v)}>
              Exporter ▼
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
              Chargement des entités...
            </div>
          )}

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

