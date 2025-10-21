import React, { useState, useEffect, useRef } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { exportToCSV, exportToJSON, exportToTXT, exportToExcel } from './exportUtils';

// Fonction pour générer une couleur basée sur le nom de la compagnie
const getCompanyTokenColor = (companyName) => {
  const colors = [
    'company-token-color-1',
    'company-token-color-2', 
    'company-token-color-3',
    'company-token-color-4',
    'company-token-color-5',
    'company-token-color-6',
    'company-token-color-7',
    'company-token-color-8'
  ];
  
  let hash = 0;
  for (let i = 0; i < companyName.length; i++) {
    const char = companyName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Composant React pour afficher les tokens (inline gris, séparés par des virgules)
const CompanyTokens = ({ companies }) => {
  if (!companies || companies.length === 0) return <span className="text-muted">Aucune entité</span>;

  const names = companies.map(c => c.name).filter(Boolean);
  if (names.length === 0) return <span className="text-muted">Aucune entité</span>;

  return (
    <div className="company-tokens-container">
      {companies.map((company, index) => (
        <React.Fragment key={company.id || index}>
          <span className="company-token" title={company.name}>
            {company.name}
          </span>
          {index < companies.length - 1 ? <span className="company-sep">,</span> : null}
          <br />
        </React.Fragment>
      ))}
    </div>
  );
};

const AdminDoctypes = ({ user }) => {
  const [doctypes, setDoctypes] = useState([]);
  const [filteredDoctypes, setFilteredDoctypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [editingDoctype, setEditingDoctype] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showModifyTab, setShowModifyTab] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalErrors, setGlobalErrors] = useState([]);
  const [filters, setFilters] = useState({
    id: '',
    name: '',
    company: ''
  });
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    status: true,
    companies: [],
  });

  const [allCompanies, setAllCompanies] = useState([]);
  const [relatedCompanies, setRelatedCompanies] = useState([]);

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    fetchDoctypes();
    fetchAllCompanies();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchDoctypes = async () => {
    try {
      setLoading(true);
      const response = await API.doctype.getAll();
      
      const doctypesWithCompanies = await Promise.all(
        response.data.map(async (dt) => {
          try {
            const companiesRes = await API.doctype.getCompanies(dt.id);
            return { 
              ...dt, 
              companies: Array.isArray(companiesRes?.data) ? companiesRes.data : []
            };
          } catch (err) {
            console.error(`Error fetching companies for doctype ${dt.id}:`, err);
            return { ...dt, companies: [] };
          }
        })
      );
      
      setDoctypes(doctypesWithCompanies);
      setFilteredDoctypes(doctypesWithCompanies);
    } catch (err) {
      setError('Erreur lors du chargement des types de documents');
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCompanies = async () => {
    try {
      const response = await API.companies.getAll();
      setAllCompanies(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des entreprises');
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filters, doctypes]);

  useEffect(() => {
    if (!loading && filteredDoctypes.length === 0) {
      const message = doctypes.length === 0 ? 'Aucun type de document disponible' : 'Aucun type de document ne correspond à vos filtres';
      setNotificationMessage(message);
      setShowNotification(true);
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowNotification(false);
    }
  }, [loading, filteredDoctypes, doctypes]);

  const applyFilters = () => {
    let result = [...doctypes];
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        if (key === 'company') {
          result = result.filter(doctype =>
            doctype.companies?.some(c =>
              c.name.toLowerCase().includes(filters.company.toLowerCase())
            )
          );
        } else {
          result = result.filter(doctype =>
            String(doctype[key]).toLowerCase().includes(filters[key].toLowerCase())
          );
        }
      }
    });
    setFilteredDoctypes(result);
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

  const handleEdit = async (doctype) => {
    setEditingDoctype(doctype);
    setFormData({
      name: doctype.name || '',
      status: doctype.status !== undefined ? doctype.status : true,
      companies: [],
    });
    setShowModifyTab(true);
    setActiveTab('form');
    setFieldErrors({});
    setGlobalErrors([]);
    
    try {
      const res = await API.doctype.getCompanies(doctype.id);
      const companyIds = Array.isArray(res?.data) ? res.data.map(c => c.id) : [];
      setRelatedCompanies(res?.data || []);
      setFormData(prev => ({
        ...prev,
        companies: companyIds,
        name: doctype.name || '',
        status: doctype.status !== undefined ? doctype.status : true
      }));
    } catch (err) {
      console.error('Error fetching related companies:', err);
      setRelatedCompanies([]);
      setFormData(prev => ({
        ...prev,
        companies: [],
        name: doctype.name || '',
        status: doctype.status !== undefined ? doctype.status : true
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'companies') {
      setFormData(prev => {
        let newCompanies = prev.companies.includes(Number(value))
          ? prev.companies.filter(id => id !== Number(value))
          : [...prev.companies, Number(value)];
        return { ...prev, companies: newCompanies };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
      if (fieldErrors[name]) {
        setFieldErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGlobalErrors([]);
    if (!validate()) return;
    if (!editingDoctype) return;
    try {
      await API.doctype.update(editingDoctype.id, {
        ...formData,
        companies: formData.companies
      });
      setSuccess('Type de document mis à jour avec succès');
      setEditingDoctype(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchDoctypes();
      window.dispatchEvent(new Event('doctypeUpdated'));
    } catch (err) {
      const apiError = err.response?.data;
      const errorMessage = apiError?.msg || apiError?.error || apiError?.message || 'Error updating document type';
      if (errorMessage.toLowerCase().includes('name')) {
        setFieldErrors({ name: 'Le nom du type de document existe déjà' });
        setGlobalErrors(['Le nom du type de document existe déjà']);
      } else {
        setError('Erreur lors de la mise à jour du type de document');
        console.error('Error updating document type:', err);
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
    const sorted = [...filteredDoctypes].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredDoctypes(sorted);
  };

  // Export logic
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nom' },
    { key: 'companies', label: 'Entités' }
  ];
  const handleExport = (type) => {
    const data = filteredDoctypes.map(dt => ({
      id: dt.id,
      name: dt.name,
      companies: Array.isArray(dt.companies) ? dt.companies.map(c => c.name).join('; ') : ''
    }));
    if (type === 'csv') exportToCSV(data, columns, 'doctypes.csv');
    if (type === 'json') exportToJSON(data, 'doctypes.json');
    if (type === 'txt') exportToTXT(data, columns, 'doctypes.txt');
    if (type === 'excel') exportToExcel(data, columns, 'doctypes.xls');
  };

  const handleResetFilters = () => {
    // Reset all filters
    setFilters({
      id: '',
      name: '',
      companies: ''
    });
    // Reset sorting
    setSortConfig({ key: null, direction: 'asc' });
    // Reset filtered doctypes to show all doctypes
    setFilteredDoctypes(doctypes);
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
    <div className="admin-users">
      <div className="admin-header">
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('list');
              setShowModifyTab(false);
              setEditingDoctype(null);
            }}
          >
            Liste des types de documents
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Modifier le type de document
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

            <Link to="/AddDoctype" className="btn-primary-2" aria-label="Ajouter un type de document" style={{fontWeight: 700, display: 'inline-flex', alignItems: 'center'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle'}} aria-hidden="true">
                <line x1="12" y1="4" x2="12" y2="20"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
              </svg>
              Type de document
            </Link>
          </div>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {activeTab === 'list' && (
        <div className="users-list">
          {/* Header-level export controls used; duplicate list controls removed */}
          {loading && (
            <div className="loading-message">
              Chargement des types de documents...
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
                    Nom <span style={{fontSize:'1em'}}>{sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th style={{cursor:'pointer', background: sortConfig.key === 'companies' ? '#f0f4fa' : undefined, color: sortConfig.key === 'companies' ? '#1976d2' : undefined}} onClick={() => handleSort('companies')}>
                    Entités <span style={{fontSize:'1em'}}>{sortConfig.key === 'companies' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
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
                  <td>
                    <input
                      type="text"
                      value={filters.company}
                      onChange={(e) => handleFilterChange(e, 'company')}
                      placeholder="Filtrer les entités"
                      className="filter-input"
                    />
                  </td>
                  <td></td>
                </tr>
              </thead>
              <tbody className="table-body-scrollable">
                {!loading && filteredDoctypes.length > 0 && (
                  filteredDoctypes.map(doctype => (
                    <tr key={doctype.id}>
                      <td style={{width: '24px', minWidth: '24px', maxWidth: '24px', padding: 0, textAlign: 'center'}}>
                        <div className={`status-led ${doctype.status ? 'status-led-active' : 'status-led-inactive'}`}></div>
                      </td>
                      <td>{doctype.id}</td>
                      <td>{doctype.name}</td>
                      <td>
                        <CompanyTokens companies={doctype.companies} />
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(doctype)}
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
          <h2>Modifier le type de document</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nom du type de document"
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
                Actif
              </label>
            </div>
            <div className="form-group">
              <label>Entreprises</label>
              <div className="checkbox-list">
                {allCompanies.map((c) => (
                  <label key={c.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      name="companies"
                      value={c.id}
                      checked={formData.companies.includes(c.id)}
                      onChange={handleInputChange}
                    />
                    <span className="company-name">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setActiveTab('list');
                  setShowModifyTab(false);
                  setEditingDoctype(null);
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

export default AdminDoctypes;