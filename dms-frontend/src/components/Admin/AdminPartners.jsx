import React, { useState, useEffect, useRef } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { exportToCSV, exportToJSON, exportToTXT, exportToExcel } from './exportUtils';

// Fonction pour générer une couleur basée sur le nom
const getTokenColor = (name) => {
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
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Composant pour afficher les tokens
const TokenList = ({ items, type = 'company' }) => {
  if (!items || items.length === 0) {
    return <span className="text-muted">Aucun</span>;
  }

  return (
    <div className="company-tokens-container">
      {items.map((item, index) => (
        <span 
          key={item.id || index}
          className={`company-token ${getTokenColor(item.name)}`}
          title={item.name}
        >
          {item.name}
        </span>
      ))}
    </div>
  );
};

const AdminPartners = ({ user }) => {
  const [partners, setPartners] = useState([]);
  const [filteredPartners, setFilteredPartners] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [editingPartner, setEditingPartner] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showModifyTab, setShowModifyTab] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalErrors, setGlobalErrors] = useState([]);
  const [filters, setFilters] = useState({
    id: '',
    unique_identifier: '',
    company_name: '',
    email: '',
    phone: '',
    company: '',
    partnertype: ''
  });
  const [companies, setCompanies] = useState([]);
  const [partnertypes, setPartnertypes] = useState([]);
  const navigate = useNavigate();
  const [maxExternalEntities, setMaxExternalEntities] = useState(null);
  const [globalLimitError, setGlobalLimitError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  const [formData, setFormData] = useState({
    company_name: '',
    trade_name: '',
    unique_identifier: '',
    mailing_address: '',
    billing_address: '',
    phone1: '',
    phone2: '',
    phone3: '',
    email: '',
    payment_terms: '',
    billing_terms: '',
    bank_account_number: '',
    bank_name: '',
    notes: '',
    is_active: true,
    companies: [],
    partnertypes: []
  });

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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

  // Fetch data on component mount
  useEffect(() => {
    fetchPartners();
    fetchCompanies();
    fetchPartnerTypes();
    API.settings.getSettings().then(res => {
      setMaxExternalEntities(res.data.maxExternalEntities);
    });
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, partners]);

  // New useEffect to handle notification display
  useEffect(() => {
    if (!loading && filteredPartners.length === 0) {
      const message = partners.length === 0 ? 'Aucun partenaire disponible' : 'Aucun partenaire trouvé correspondant à vos filtres';
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
  }, [loading, filteredPartners, partners]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await API.partner.getAll();
      setPartners(response.data);
      setFilteredPartners(response.data);
    } catch (err) {
      setError('Error loading partners');
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await API.companies.getAll();
      setCompanies(response.data);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  const fetchPartnerTypes = async () => {
    try {
      const response = await API.partnertype.getAll();
      setPartnertypes(response.data);
    } catch (err) {
      console.error('Error loading partner types:', err);
    }
  };

  const applyFilters = () => {
    let result = [...partners];
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        if (key === 'phone') {
          const filterValue = filters[key].toLowerCase();
          result = result.filter(partner => 
            (partner.phone1 && partner.phone1.toLowerCase().includes(filterValue)) ||
            (partner.phone2 && partner.phone2.toLowerCase().includes(filterValue)) ||
            (partner.phone3 && partner.phone3.toLowerCase().includes(filterValue))
          );
        } else if (key === 'company') {
                const filterValue = filters[key].toLowerCase();
                result = result.filter(partner => 
                  partner.companies?.some(c => c.name.toLowerCase().includes(filterValue))
                );
              } else if (key === 'partnertype') {
          const filterValue = filters[key].toLowerCase();
          result = result.filter(partner => 
            partner.partnertypes?.some(pt => pt.name.toLowerCase().includes(filterValue))
          );
        } else {
          result = result.filter(partner => 
            String(partner[key]).toLowerCase().includes(filters[key].toLowerCase())
          );
        }
      }
    });
    
    setFilteredPartners(result);
  };

  const handleFilterChange = (e, field) => {
    setFilters({
      ...filters,
      [field]: e.target.value
    });
  };

  const handleEdit = async (partner) => {
    setGlobalLimitError('');
    try {
      const fullPartner = await API.partner.getById(partner.id);
      setEditingPartner(fullPartner.data);
      
      setFormData({
        company_name: fullPartner.data.company_name || '',
        trade_name: fullPartner.data.trade_name || '',
        unique_identifier: fullPartner.data.unique_identifier || '',
        mailing_address: fullPartner.data.mailing_address || '',
        billing_address: fullPartner.data.billing_address || '',
        phone1: fullPartner.data.phone1 || '',
        phone2: fullPartner.data.phone2 || '',
        phone3: fullPartner.data.phone3 || '',
        email: fullPartner.data.email || '',
        payment_terms: fullPartner.data.payment_terms || '',
        billing_terms: fullPartner.data.billing_terms || '',
        bank_account_number: fullPartner.data.bank_account_number || '',
        bank_name: fullPartner.data.bank_name || '',
        notes: fullPartner.data.notes || '',
        is_active: fullPartner.data.is_active || true,
        companies: fullPartner.data.companies?.map(c => c.id) || [],
        partnertypes: fullPartner.data.partnertypes?.map(pt => pt.id) || []
      });
      
      setShowModifyTab(true);
      setActiveTab('form');
      setFieldErrors({});
      setGlobalErrors([]);
    } catch (err) {
      setError('Error loading partner details');
      console.error('Error loading partner details:', err);
    }
  };

    const validate = () => {
    const errors = {};
    const errorMessages = [];

    if (!formData.company_name.trim()) {
      errors.company_name = 'Company name is required';
      errorMessages.push('Company name is required');
    }
    if (!formData.unique_identifier.trim()) {
      errors.unique_identifier = 'Unique identifier is required';
      errorMessages.push('Unique identifier is required');
    }
    if (!formData.mailing_address.trim()) {
      errors.mailing_address = 'Mailing address is required';
      errorMessages.push('Mailing address is required');
    }
    if (!String(formData.phone1 || '').trim()) {
      errors.phone1 = 'Le numéro de téléphone principal est requis';
      errorMessages.push('Le numéro de téléphone principal est requis');
    } else if (!/^\d{8}$/.test(formData.phone1)) {
      errors.phone1 = 'Le numéro de téléphone principal doit contenir exactement 8 chiffres';
      errorMessages.push('Le numéro de téléphone principal doit contenir exactement 8 chiffres');
    }
    if (formData.phone2 && !/^\d{8}$/.test(formData.phone2)) {
      errors.phone2 = 'Le numéro de téléphone secondaire doit contenir exactement 8 chiffres';
      errorMessages.push('Le numéro de téléphone secondaire doit contenir exactement 8 chiffres');
    }
    if (formData.phone3 && !/^\d{8}$/.test(formData.phone3)) {
      errors.phone3 = 'Le numéro de téléphone additionnel doit contenir exactement 8 chiffres';
      errorMessages.push('Le numéro de téléphone additionnel doit contenir exactement 8 chiffres');
    }
    if (!String(formData.email || '').trim()) {
      errors.email = 'L\'email est requis';
      errorMessages.push('L\'email est requis');
    } else if (!/^([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/.test(formData.email) || (formData.email.match(/@/g) || []).length !== 1) {
      errors.email = 'Format d\'email invalide.';
      errorMessages.push('Format d\'email invalide.');
    }
    if (formData.companies.length === 0) {
      errors.companies = 'At least one company must be selected';
      errorMessages.push('At least one company must be selected');
    }
    if (formData.partnertypes.length === 0) {
      errors.partnertypes = 'At least one partner type must be selected';
      errorMessages.push('At least one partner type must be selected');
    }

    setFieldErrors(errors);
    setGlobalErrors(errorMessages);
    return errorMessages.length === 0;
  };
  
   const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'companies' || name === 'partnertypes') {
      const id = parseInt(value, 10);
      setFormData(prev => {
        const current = Array.isArray(prev[name]) ? prev[name] : [];
        let updated;
        
        if (checked) {
          updated = [...current, id];
        } else {
          updated = current.filter(item => item !== id);
        }
        
        return { ...prev, [name]: updated };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
    
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
  if (!editingPartner) return;
  
  try {
    const partnerData = {
      company_name: formData.company_name,
      trade_name: formData.trade_name,
      unique_identifier: formData.unique_identifier,
      mailing_address: formData.mailing_address,
      billing_address: formData.billing_address,
      phone1: formData.phone1,
      phone2: formData.phone2,
      phone3: formData.phone3,
      email: formData.email,
      payment_terms: formData.payment_terms,
      billing_terms: formData.billing_terms,
      bank_account_number: formData.bank_account_number,
      bank_name: formData.bank_name,
      notes: formData.notes,
      is_active: formData.is_active,
      companies: formData.companies,
      partnertypes: formData.partnertypes
    };
        const response = await API.partner.update(editingPartner.id, partnerData);
    
    // Get the updated partner with all associations
    const updatedPartner = await API.partner.getById(editingPartner.id);
    
    setSuccess('Partner updated successfully');
    setEditingPartner(null);
    setShowModifyTab(false);
    setActiveTab('list');
    fetchPartners();
  } catch (err) {
    console.error('Full error object:', err); // Log the full error for debugging
    const apiError = err.response?.data;
    const errorMessage = apiError?.msg || apiError?.error || apiError?.message || 'Error updating partner';
    
    if (errorMessage.toLowerCase().includes('unique')) {
      setFieldErrors({ unique_identifier: 'Unique identifier already exists' });
      setGlobalErrors(['Unique identifier already exists']);
    } else if (errorMessage.toLowerCase().includes('email')) {
      setFieldErrors({ email: 'Email already exists' });
      setGlobalErrors(['Email already exists']);
    } 
    else if (errorMessage.toLowerCase().includes('nom')) {
      setFieldErrors({ company_name: 'Nom de société exist déja' });
      setGlobalErrors(['Nom de société exist déja']);
    }else if (errorMessage.toLowerCase().includes('adresse')) {
      setFieldErrors({ mailing_address: 'adresse postale exist déja' });
      setGlobalErrors(['adresse postale exist déja']);
    }else if (errorMessage.toLowerCase().includes('téléphone')) {
      setFieldErrors({ phone1: 'Numéro de téléphone exist déja' });
      setGlobalErrors(['Numéro de téléphone exist déja']);
    }else {
      setError(errorMessage); // Show the actual error message from the server
      setGlobalErrors([errorMessage]);
      console.error('Error updating partner:', err);
    }
  }
};

  const dismissNotification = () => {
    setShowNotification(false);
  };

  const handleAddPartner = (e) => {
    setGlobalLimitError('');
    if (maxExternalEntities !== null && partners.length >= maxExternalEntities) {
      setGlobalLimitError('Vous avez atteint le nombre maximal d entités externes. Veuillez contacter le support technique.');
      return;
    }
    navigate('/AddPartner');
  };

  // Sorting logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredPartners].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredPartners(sorted);
  };

  // Export logic
  const columns = [
    { key: 'unique_identifier', label: 'Unique Identifier' },
    { key: 'company_name', label: 'Company Name' },
    { key: 'companies', label: 'Entities' },
    { key: 'partnertypes', label: 'Partner Types' },
    { key: 'phone1', label: 'Phone' },
    { key: 'email', label: 'Email' }
  ];
  const handleExport = (type) => {
    const data = filteredPartners.map(p => ({
      unique_identifier: p.unique_identifier,
      company_name: p.company_name,
      companies: Array.isArray(p.companies) ? p.companies.map(c => c.name).join('; ') : '',
      partnertypes: Array.isArray(p.partnertypes) ? p.partnertypes.map(pt => pt.name).join('; ') : '',
      phone1: p.phone1,
      email: p.email
    }));
    if (type === 'csv') exportToCSV(data, columns, 'partners.csv');
    if (type === 'json') exportToJSON(data, 'partners.json');
    if (type === 'txt') exportToTXT(data, columns, 'partners.txt');
    if (type === 'excel') exportToExcel(data, columns, 'partners.xls');
  };

  const handleResetFilters = () => {
    // Reset all filters
    setFilters({
      unique_identifier: '',
      company_name: '',
      companies: '',
      partnertypes: '',
      phone1: '',
      email: ''
    });
    // Reset sorting
    setSortConfig({ key: null, direction: 'asc' });
    // Reset filtered partners to show all partners
    setFilteredPartners(partners);
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
              setEditingPartner(null);
            }}
          >
            Liste des partenaires
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Modifier le partenaire
            </button>
          )}
          
          <button className="btn-primary-2" onClick={handleAddPartner}>
            Ajouter un partenaire
          </button>
        </div>
      </div>

      {globalLimitError && (
        <div className="alert alert-error" style={{marginBottom: '1rem', fontWeight: 600}}>{globalLimitError}</div>
      )}

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
              Chargement des partenaires...
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
                  
                  <th style={{cursor:'pointer', background: sortConfig.key === 'unique_identifier' ? '#f0f4fa' : undefined, color: sortConfig.key === 'unique_identifier' ? '#1976d2' : undefined}} onClick={() => handleSort('unique_identifier')}>
                    Identifiant unique <span style={{fontSize:'1em'}}>{sortConfig.key === 'unique_identifier' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th style={{cursor:'pointer', background: sortConfig.key === 'company_name' ? '#f0f4fa' : undefined, color: sortConfig.key === 'company_name' ? '#1976d2' : undefined}} onClick={() => handleSort('company_name')}>
                    Nom d'entreprise <span style={{fontSize:'1em'}}>{sortConfig.key === 'company_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th style={{cursor:'pointer', background: sortConfig.key === 'companies' ? '#f0f4fa' : undefined, color: sortConfig.key === 'companies' ? '#1976d2' : undefined}} onClick={() => handleSort('companies')}>
                    Entités <span style={{fontSize:'1em'}}>{sortConfig.key === 'companies' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th style={{cursor:'pointer', background: sortConfig.key === 'partnertypes' ? '#f0f4fa' : undefined, color: sortConfig.key === 'partnertypes' ? '#1976d2' : undefined}} onClick={() => handleSort('partnertypes')}>
                    Type de partenaire <span style={{fontSize:'1em'}}>{sortConfig.key === 'partnertypes' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th style={{cursor:'pointer', background: sortConfig.key === 'phone1' ? '#f0f4fa' : undefined, color: sortConfig.key === 'phone1' ? '#1976d2' : undefined}} onClick={() => handleSort('phone1')}>
                    Téléphone <span style={{fontSize:'1em'}}>{sortConfig.key === 'phone1' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th style={{cursor:'pointer', background: sortConfig.key === 'email' ? '#f0f4fa' : undefined, color: sortConfig.key === 'email' ? '#1976d2' : undefined}} onClick={() => handleSort('email')}>
                    Email <span style={{fontSize:'1em'}}>{sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th>Actions</th>
                </tr>
                <tr className="filter-row">
                  <td></td>
                  
                  <td style={{ width: '150px' }}>
                    <input
                      type="text"
                      value={filters.unique_identifier}
                      onChange={(e) => handleFilterChange(e, 'unique_identifier')}
                      placeholder="Filtrer l'identifiant"
                      className="filter-input"
                    />
                  </td>
                  <td style={{ width: '200px' }}>
                    <input
                      type="text"
                      value={filters.company_name}
                      onChange={(e) => handleFilterChange(e, 'company_name')}
                      placeholder="Filtrer le nom"
                      className="filter-input"
                    />
                  </td>
                  <td style={{ width: '150px' }}>
                    <input
                      type="text"
                      value={filters.company}
                      onChange={(e) => handleFilterChange(e, 'company')}
                      placeholder="Filtrer les entités"
                      className="filter-input"
                    />
                  </td>
                  <td style={{ width: '150px' }}>
                    <input
                      type="text"
                      value={filters.partnertype}
                      onChange={(e) => handleFilterChange(e, 'partnertype')}
                      placeholder="Filtrer les types"
                      className="filter-input"
                    />
                  </td>
                  <td style={{ width: '80px' }}>
                    <input
                      type="text"
                      value={filters.phone}
                      onChange={(e) => handleFilterChange(e, 'phone')}
                      placeholder="Filtrer le téléphone"
                      className="filter-input"
                    />
                  </td>
                  <td style={{ width: '250px' }}>
                    <input
                      type="text"
                      value={filters.email}
                      onChange={(e) => handleFilterChange(e, 'email')}
                      placeholder="Filtrer l'email"
                      className="filter-input"
                    />
                  </td>
                  <td></td>
                </tr>
              </thead>
              <tbody className="table-body-scrollable">
                {!loading && filteredPartners.length > 0 && (
                  filteredPartners.map(partner => (
                    <tr key={partner.id}>
                      <td style={{width: '24px', minWidth: '24px', maxWidth: '24px', padding: 0, textAlign: 'center'}}>
                        <div className={`status-led ${partner.is_active ? 'status-led-active' : 'status-led-inactive'}`}></div>
                      </td>
                      
                      <td style={{ width: '150px' }}>{partner.unique_identifier}</td>
                      <td style={{ width: '200px' }}>{partner.company_name}</td>
                      <td style={{ width: '200px' }}>
                        <TokenList items={partner.companies} type="company" />
                      </td>
                      <td style={{ width: '150px' }}>
                        <TokenList items={partner.partnertypes} type="partnertype" />
                      </td>
                      <td style={{ width: '80px' }}>{partner.phone1 || 'N/A'}</td>
                      <td style={{ width: '250px' }}>{partner.email}</td>
                      <td style={{ width: '100px' }}>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(partner)}
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

      {activeTab === 'form' && editingPartner && (
        <div className="user-form">
            <h2>Modifier le partenaire</h2>
          <form onSubmit={handleUpdate}>
            <div className="tab-panel">
              {/* Identity Tab */}
              <div className="form-section">
                <h3>Identité</h3>
                <div className="form-group">
                  <label>Nom de l'entité *</label>
                  <input
                    type="text"
                    name="company_name"
                    placeholder="Entrez le nom de l'entité"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className={fieldErrors.company_name ? 'input-error' : ''}
                  />
                  {fieldErrors.company_name && <div className="field-error">{fieldErrors.company_name}</div>}
                </div>
                <div className="form-group">
                  <label>Nom commercial (si différent)</label>
                  <input
                    type="text"
                    name="trade_name"
                    placeholder="Entrez le nom commercial"
                    value={formData.trade_name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Identifiant unique *</label>
                  <input
                    type="text"
                    name="unique_identifier"
                    placeholder="Entrez un identifiant unique"
                    value={formData.unique_identifier}
                    onChange={handleInputChange}
                    className={fieldErrors.unique_identifier ? 'input-error' : ''}
                  />
                  {fieldErrors.unique_identifier && <div className="field-error">{fieldErrors.unique_identifier}</div>}
                </div>

                <div className="form-group">
                  <label>Entités *</label>
                  {fieldErrors.companies && <div className="field-error">{fieldErrors.companies}</div>}
                  <div className="checkbox-list">
                    {companies.map((c) => (
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
                <div className="form-group">
                  <label>Types de partenaire *</label>
                  {fieldErrors.partnertypes && <div className="field-error">{fieldErrors.partnertypes}</div>}
                  <div className="checkbox-list">
                    {partnertypes.map((pt) => (
                      <label key={pt.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          name="partnertypes"
                          value={pt.id}
                          checked={formData.partnertypes.includes(pt.id)}
                          onChange={handleInputChange}
                        />
                        <span className="partnertype-name">{pt.name}</span>
                      </label>
                    ))}
                  </div>
                </div>  
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />{' '}
                    Active
                  </label>
                </div>
              </div>

              {/* Contact Tab */}
              <div className="form-section">
                <h3>Contact</h3>
                <div className="form-group">
                  <label>Adresse postale *</label>
                  <input
                    type="text"
                    name="mailing_address"
                    placeholder="Entrez l'adresse postale"
                    value={formData.mailing_address}
                    onChange={handleInputChange}
                    className={fieldErrors.mailing_address ? 'input-error' : ''}
                  />
                  {fieldErrors.mailing_address && <div className="field-error">{fieldErrors.mailing_address}</div>}
                </div>
                <div className="form-group">
                  <label>Adresse de facturation</label>
                  <input
                    type="text"
                    name="billing_address"
                    placeholder="Entrez l'adresse de facturation"
                    value={formData.billing_address}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Téléphone 1 (principal) *</label>
                  <input
                    type="text"
                    name="phone1"
                    placeholder="Entrez le téléphone principal"
                    value={formData.phone1}
                    onChange={handleInputChange}
                    className={fieldErrors.phone1 ? 'input-error' : ''}
                  />
                  {fieldErrors.phone1 && <div className="field-error">{fieldErrors.phone1}</div>}
                </div>
                <div className="form-group">
                  <label>Téléphone 2</label>
                  <input
                    type="text"
                    name="phone2"
                    placeholder="Entrez le téléphone secondaire"
                    value={formData.phone2}
                    onChange={handleInputChange}
                    className={fieldErrors.phone2 ? 'input-error' : ''}
                  />
                  {fieldErrors.phone2 && <div className="field-error">{fieldErrors.phone2}</div>}
                </div>
                <div className="form-group">
                  <label>Téléphone 3</label>
                  <input
                    type="text"
                    name="phone3"
                    placeholder="Entrez le téléphone additionnel"
                    value={formData.phone3}
                    onChange={handleInputChange}
                    className={fieldErrors.phone3 ? 'input-error' : ''}
                  />
                  {fieldErrors.phone3 && <div className="field-error">{fieldErrors.phone3}</div>}
                </div>
                <div className="form-group">
                  <label>Email</label>
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
              </div>

              {/* Billing and payments Tab */}
              <div className="form-section">
                  <h3>Facturation et paiement</h3>
                <div className="form-group">
                  <label>Conditions de paiement</label>
                  <input
                    type="text"
                    name="payment_terms"
                    placeholder="Entrez les conditions de paiement"
                    value={formData.payment_terms}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Conditions de facturation</label>
                  <input
                    type="text"
                    name="billing_terms"
                    placeholder="Entrez les conditions de facturation"
                    value={formData.billing_terms}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Numéro de compte bancaire</label>
                  <input
                    type="text"
                    name="bank_account_number"
                    placeholder="Entrez le numéro de compte bancaire"
                    value={formData.bank_account_number}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Nom de la banque</label>
                  <input
                    type="text"
                    name="bank_name"
                    placeholder="Entrez le nom de la banque"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Notes Tab */}
              <div className="form-section">
                <h3>Notes</h3>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    placeholder="Entrez les notes supplémentaires"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="4"
                  />
                </div>
              </div>
            </div>
            {globalErrors.length > 0 && (
              <div className="alert alert-error">
                {globalErrors.map((err, index) => (
                  <div key={index}>{err}</div>
                ))}
              </div>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setActiveTab('list');
                  setShowModifyTab(false);
                  setEditingPartner(null);
                }}
              >
                Annuler
              </button>
              <button type="submit" className="btn">
                Mettre à jour le partenaire
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPartners;

