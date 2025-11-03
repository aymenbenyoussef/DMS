import React, { useRef, useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css'; // Changed from AdminDashboard.css
import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
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
  
  // Simple hash function pour assigner une couleur consistante
  let hash = 0;
  for (let i = 0; i < companyName.length; i++) {
    const char = companyName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Composant React pour afficher les tokens de compagnies (liste inline grisée, séparée par des virgules)
const CompanyTokens = ({ companies }) => {
  if (!companies || companies.length === 0) return null;

  const names = companies.map(c => c.name).filter(Boolean);
  if (names.length === 0) return null;

  return (
    <div className="company-tokens-container">
      {companies.map((company, index) => (
        <React.Fragment key={company.id || index}>
          <span
            className="company-token"
            title={company.name}
          >
            {company.name}
          </span>
          {index < companies.length - 1 ? <span className="company-sep">,</span> : null}
          <br />
        </React.Fragment>
      ))}
    </div>
  );
};

const AdminUsers = ({user ,loadingUser}) => {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [formData, setFormData] = useState({
    username: '',
    surname: '',
    email: '',
    password: '',
    passwordConfirm: '',
    role: 'user',
    is_active: true,
    companies: []
  });
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [companies, setCompanies] = useState([]);
  const [userCompanies, setUserCompanies] = useState({});
  const [showModifyTab, setShowModifyTab] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalErrors, setGlobalErrors] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filters, setFilters] = useState({
    id: '',
    username: '',
    surname: '',
    email: '',
    role: '',
    companies:''
  });
  const [timeoutError, setTimeoutError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // New: separate loading/error state for users and companies
  const [usersLoading, setUsersLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [companiesError, setCompaniesError] = useState('');
  const [usersTimeout, setUsersTimeout] = useState(false);
  const [companiesTimeout, setCompaniesTimeout] = useState(false);
  const [maxUsers, setMaxUsers] = useState(null);
  const [globalLimitError, setGlobalLimitError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const navigate = useNavigate();

  // Move loadData to top level so it can be called after updates
  const loadData = async () => {
    setLoading(true);
    setTimeoutError(false);
    let timeoutId;
    timeoutId = setTimeout(() => {
      setTimeoutError(true);
    }, 8000);
    try {
      const [companiesRes, usersRes] = await Promise.all([
        API.companies.getAll(),
        API.admin.getUsers()
      ]);
      clearTimeout(timeoutId);
      setTimeoutError(false);
      let companiesArray = Array.isArray(companiesRes?.data) ? companiesRes.data : companiesRes?.data?.companies;
      if (!Array.isArray(companiesArray)) companiesArray = [];
      setCompanies(companiesArray);
      const usersWithCompanies = Array.isArray(usersRes?.data)
        ? usersRes.data.map(u => ({ ...u, companies: u.companies || [] }))
        : [];
      setUsers(usersWithCompanies);
      setFilteredUsers(usersWithCompanies);
      const companiesMap = {};
      usersWithCompanies.forEach(u => {
        companiesMap[u.id] = u.companies;
      });
      setUserCompanies(companiesMap);
    } catch (err) {
        const errMsg = 'Erreur lors du chargement des données: ' + (err?.message || err);
        setToast({ visible: true, message: errMsg, type: 'error' });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
        console.error('AdminUsers loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    API.settings.getSettings().then(res => {
      setMaxUsers(res.data.maxUsers);
    });
  }, []);

  useEffect(() => {
    if (loadingUser || !user?.id) return;
    let isMounted = true;
    let timeoutId;

    const loadData = async () => {
      setLoading(true);
      setTimeoutError(false);
      timeoutId = setTimeout(() => {
        if (isMounted) setTimeoutError(true);
      }, 8000);
      try {
        const [companiesRes, usersRes] = await Promise.all([
          API.companies.getAll(),
          API.admin.getUsers()
        ]);
        if (!isMounted) return;
        clearTimeout(timeoutId);
        setTimeoutError(false);
        // Defensive: log and check data
        console.log('Companies API response:', companiesRes);
        console.log('Users API response:', usersRes);
        let companiesArray = Array.isArray(companiesRes?.data) ? companiesRes.data : companiesRes?.data?.companies;
        if (!Array.isArray(companiesArray)) companiesArray = [];
        setCompanies(companiesArray);
        const usersWithCompanies = Array.isArray(usersRes?.data)
          ? usersRes.data.map(u => ({ ...u, companies: u.companies || [] }))
          : [];
        setUsers(usersWithCompanies);
        setFilteredUsers(usersWithCompanies);
        const companiesMap = {};
        usersWithCompanies.forEach(u => {
          companiesMap[u.id] = u.companies;
        });
        setUserCompanies(companiesMap);
        setInitialLoadComplete(true);
      } catch (err) {
        if (!isMounted) return;
        clearTimeout(timeoutId);
        const errMsg = 'Erreur lors du chargement des données: ' + (err?.message || err);
        setToast({ visible: true, message: errMsg, type: 'error' });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
        console.error('AdminUsers loadData error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [loadingUser, user, retryCount]);

  useEffect(() => {
    const timer2 = setTimeout(() => {
      if (Object.keys(fieldErrors).length > 0) {
        setFieldErrors({});
      }
    }, 9999999999); 

    return () => clearTimeout(timer2);
  }, [fieldErrors]);

  useEffect(() => {
    if (globalLimitError) {
      const timer = setTimeout(() => setGlobalLimitError(''), 10000);
      return () => clearTimeout(timer);
    }
  }, [globalLimitError]);

  const handleTabChange = (tab) => {
    setGlobalLimitError('');
    if (tab !== 'list') {
      setFieldErrors({});
    } else {
      setFieldErrors({});
    }
    setActiveTab(tab);
    if (tab !== 'form') {
      setShowModifyTab(false);
      setEditingUser(null);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filters, users]);

  // New useEffect to handle notification display
  useEffect(() => {
    if (initialLoadComplete && !loading && filteredUsers.length === 0) {
      const message = users.length === 0 ? 'No users available' : 'No users found matching your filters';
      setToast({ visible: true, message: message, type: 'success' });
      const timer = setTimeout(() => {
        setToast(t => ({ ...t, visible: false }));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [initialLoadComplete, loading, filteredUsers, users]);

  const applyFilters = () => {
    let result = [...users];
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        if (key === 'companies') {
          const filterValue = filters[key].toLowerCase();
          result = result.filter(user => {
            if (!user.companies || user.companies.length === 0) return false;
            return user.companies.some(company => 
              company.name.toLowerCase().includes(filterValue)
            );
          });
        }
        else {
          result = result.filter(user => 
            String(user[key]).toLowerCase().includes(filters[key].toLowerCase())
          );
        }
      }
    });
    
    setFilteredUsers(result);
  };

  const handleFilterChange = (e, field) => {
    setFilters({
      ...filters,
      [field]: e.target.value
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    const errorMessages = [];

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
      errorMessages.push('Username is required');
    }
    if (!formData.surname.trim()) {
      errors.surname = 'Surname is required';
      errorMessages.push('Surname is required');
    }
    if (!formData.email.trim()) {
      errors.email = 'L\'email est requis.';
    } else if (!/^([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/.test(formData.email) || (formData.email.match(/@/g) || []).length !== 1) {
      errors.email = 'Format d\'email invalide.';
    }
    if (!editingUser && !formData.password) {
      errors.password = 'Password is required';
      errorMessages.push('Password is required');
    }
    if (!editingUser && !formData.passwordConfirm) {
      errors.passwordConfirm = 'Please confirm password';
      errorMessages.push('Please confirm password');
    } else if (formData.password !== formData.passwordConfirm) {
      errors.passwordConfirm = 'Passwords do not match';
      errorMessages.push('Passwords do not match');
    }

    setFieldErrors(errors);
    setGlobalErrors(errorMessages);
    return errorMessages.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalErrors([]);
    setFieldErrors({});
    setGlobalLimitError('');
    if (!editingUser && maxUsers !== null && users.length >= maxUsers) {
      setGlobalLimitError('Vous avez atteint le nombre maximal d utilisateurs. Veuillez contacter le support technique.');
      return;
    }
    if (!validate()) return;
    setLoading(true);

    try {
      if (editingUser) {
        await API.admin.updateUser(editingUser.id, formData);
        setTimeout(() => {
            setToast(t => ({ ...t, visible: false }));
        }, 5000);
        setShowModifyTab(false);
        setFormData({
          id:'',
          username: '',
          surname:'',
          email:'',
          password: '',
          passwordConfirm: '',
          role: 'user',
          is_active: true,
          companies:[]
        });
        setEditingUser(null);
        setActiveTab('list');
        await loadData();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.msg || "Error occurred while creating the entity.";
    
      if (errorMsg.includes("already exists")) {
        const duplicateErrors = {};
        if (errorMsg.includes("name")) {
          duplicateErrors.name = "This entity name already exists.";
        }
        if (errorMsg.includes("email")) {
          duplicateErrors.email = "This email is already in use.";
        }
        setFieldErrors(duplicateErrors);
      } else {
        setFieldErrors({ global: errorMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setGlobalLimitError('');
    setEditingUser(user);
    setFormData({
      id: user.id,
      username: user.username,
      surname: user.surname,
      email: user.email,
      password: '',
      passwordConfirm: '',
      is_active: user.is_active,
      companies: userCompanies[user.id] ? userCompanies[user.id].map(c => c.id) : []
    });
    setShowModifyTab(true);
    setActiveTab('form');
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        await API.admin.deleteUser(userId);
        const msg = 'Utilisateur supprimé avec succès';
        setToast({ visible: true, message: msg, type: 'success' });
        setTimeout(() => {
            setToast(t => ({ ...t, visible: false }));
        }, 5000);
        //fetchUsers();
      } catch (err) {
        const errMsg = 'Erreur lors de la suppression';
        setToast({ visible: true, message: errMsg, type: 'error' });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
        console.error('Error deleting user:', err);
      }
    }
  };

  const dismissNotification = () => {
    setToast(t => ({ ...t, visible: false }));
  };

  // Retry handler: retry both
  const handleRetry = () => {
    setRetryCount(c => c + 1);
    setTimeoutError(false);
  };

  // Determine loading/error state for both
  const isLoading = loading && !timeoutError;
  const isTimeout = timeoutError;
  const isError = timeoutError;
  const showSpinner = isLoading && !isTimeout;
  const showError = isError || isTimeout;
  const errorMsg = (timeoutError && 'Le chargement prend trop de temps.');
  const canShowList = !loading && !timeoutError;

  // Sorting logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredUsers].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];

      // Handle different data types
      if (key === 'id') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      } else if (key === 'created_at') {
        // Handle date sorting properly
        const aDate = aValue ? new Date(aValue) : new Date(0);
        const bDate = bValue ? new Date(bValue) : new Date(0);
        
        // Check if dates are valid
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
        // Handle string values
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
    setFilteredUsers(sorted);
  };

  // Export logic
  const columns = [
    { key: 'id', label: 'Id' },
    { key: 'username', label: 'Nom complet' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Rôle' },
    { key: 'companies', label: 'Entités' },
    { key: 'created_at', label: 'Date de création' }
  ];
  const handleExport = (type) => {
    const data = filteredUsers.map(u => ({
      id: u.id,
      username: `${u.username} ${u.surname}`,
      email: u.email,
      role: u.role,
      companies: Array.isArray(u.companies) ? u.companies.map(c => c.name).join('; ') : '',
      created_at: u.created_at ? new Date(u.created_at).toLocaleDateString() : ''
    }));
    if (type === 'csv') exportToCSV(data, columns, 'users.csv');
    if (type === 'json') exportToJSON(data, 'users.json');
    if (type === 'txt') exportToTXT(data, columns, 'users.txt');
    if (type === 'excel') exportToExcel(data, columns, 'users.xls');
  };

  const handleResetFilters = () => {
    // Reset all filters
    setFilters({
      id: '',
      username: '',
      surname: '',
      email: '',
      role: '',
      companies: ''
    });
    // Reset sorting
    setSortConfig({ key: null, direction: 'asc' });
    // Reset filtered users to show all users
    setFilteredUsers(users);
  };

  const handleAddUser = (e) => {
    setGlobalLimitError('');
    if (maxUsers !== null && users.length >= maxUsers) {
      setGlobalLimitError('Vous avez atteint le nombre maximal d utilisateurs. Veuillez contacter le support technique');
      return;
    }
    navigate('/AddUsers');
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
            Liste des utilisateurs
          </button>
          {showModifyTab && (
            <button 
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => {
                handleTabChange('form');
                setFormData({
                  id:'',
                  username: '',
                  surname: '',
                  email: '',
                  password: '',
                  passwordConfirm: '',
                  role: 'user',
                  is_active: true,
                  companies: []
                });
              }}
            >
              Modifier l'utilisateur
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

            <button className="btn-primary-2" onClick={handleAddUser} disabled={loading} aria-label="Ajouter un utilisateur" style={{fontWeight: 700, display: 'inline-flex', alignItems: 'center'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle'}} aria-hidden="true">
                <line x1="12" y1="4" x2="12" y2="20"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
              </svg>
              Utilisateur
            </button>
          </div>
        </div>
      </div>

      {globalLimitError && (
        <div className="alert alert-error" style={{marginBottom: '1rem', fontWeight: 600}}>{globalLimitError}</div>
      )}

      {showError && (
        <div className="alert alert-error" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'8px'}}>
          {errorMsg}<br/>
          <button className="btn btn-primary" onClick={handleRetry} style={{marginTop:'8px'}}>Réessayer</button>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="users-list">
          {/* Header-level controls moved to the top; removed duplicate buttons here */}
          
          {showSpinner ? (
            <div className="loading-message">
              <div className="loading-spinner" style={{marginRight:'8px',display:'inline-block',verticalAlign:'middle'}}></div>
              Chargement des utilisateurs...
            </div>
          
          ) : canShowList ? (
            <>
              
              <div className="users-table-container">
                <table className="users-table-fixed">
                  <thead>
                    <tr>
                      <th style={{width: '24px', minWidth: '24px', maxWidth: '24px', padding: 0}}></th>
                      <th className="col-id" style={{cursor:'pointer', background: sortConfig.key === 'id' ? '#f0f4fa' : undefined, color: sortConfig.key === 'id' ? '#1976d2' : undefined}} onClick={() => handleSort('id')}>
                        Id <span style={{fontSize:'1em'}}>{sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>
                      <th style={{cursor:'pointer', background: sortConfig.key === 'username' ? '#f0f4fa' : undefined, color: sortConfig.key === 'username' ? '#1976d2' : undefined, width: '250px', minWidth: '250px'}} onClick={() => handleSort('username')}>
                        Nom complet <span style={{fontSize:'1em'}}>{sortConfig.key === 'username' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>
                      
                      <th className="email-col" style={{cursor:'pointer', background: sortConfig.key === 'email' ? '#f0f4fa' : undefined, color: sortConfig.key === 'email' ? '#1976d2' : undefined, wordBreak: 'break-all', width: '300px', minWidth: '300px'}} onClick={() => handleSort('email')}>
                                Email <span style={{fontSize:'1em'}}>{sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>

                      <th style={{cursor:'pointer', background: sortConfig.key === 'role' ? '#f0f4fa' : undefined, color: sortConfig.key === 'role' ? '#1976d2' : undefined, width: '100px', minWidth: '100px'}} onClick={() => handleSort('role')}>
                        Rôle <span style={{fontSize:'1em'}}>{sortConfig.key === 'role' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>
                      <th style={{cursor:'pointer', background: sortConfig.key === 'companies' ? '#f0f4fa' : undefined, color: sortConfig.key === 'companies' ? '#1976d2' : undefined}} onClick={() => handleSort('companies')}>
                        Entités <span style={{fontSize:'1em'}}>{sortConfig.key === 'companies' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>
                      <th style={{cursor:'pointer', background: sortConfig.key === 'created_at' ? '#f0f4fa' : undefined, color: sortConfig.key === 'created_at' ? '#1976d2' : undefined, width: '180px', minWidth: '180px'}} onClick={() => handleSort('created_at')}>
                        Date de création <span style={{fontSize:'1em'}}>{sortConfig.key === 'created_at' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>
                      <th style={{width: '60px', minWidth: '60px'}}>Actions</th>
                    </tr>
                    <tr className="filter-row">
                      <td></td>
                      <td className="col-id">
                        <input
                          type="text"
                          value={filters.id}
                          onChange={(e) => handleFilterChange(e, 'id')}
                          placeholder="Filter ID"
                          className="filter-input"
                        />
                      </td>
                      <td style={{width: '250px', minWidth: '250px'}}>
                        <input
                          type="text"
                          value={filters.username }
                          onChange={(e) => handleFilterChange(e, 'username')}
                          placeholder="Filter Name"
                          className="filter-input"
                        />
                      </td>
                      
                      <td style={{width: '300px', minWidth: '300px'}}>
                        <input
                          type="text"
                          value={filters.email}
                          onChange={(e) => handleFilterChange(e, 'email')}
                          placeholder="Filter Email"
                          className="filter-input"
                        />
                      </td>
                      <td style={{width: '100px', minWidth: '100px'}}>
                        <input
                          type="text"
                          value={filters.role}
                          onChange={(e) => handleFilterChange(e, 'role')}
                          placeholder="Filter Role"
                          className="filter-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={filters.companies}
                          onChange={(e) => handleFilterChange(e, 'companies')}
                          placeholder="Filter Companies"
                          className="filter-input"
                        />
                      </td>
                      <td style={{width: '180px', minWidth: '180px'}}>
                        <input
                          type="text"
                          value={filters.created_at}
                          onChange={(e) => handleFilterChange(e, 'created_at')}
                          placeholder="Filter Date"
                          className="filter-input"
                        />
                      </td>
                      <td style={{width: '60px', minWidth: '60px'}}></td>
                    </tr>
                  </thead>
                  <tbody className="table-body-scrollable">
                    
                    {!loading && filteredUsers.length > 0 && (
                      filteredUsers.map(rowUser => (
                        <tr
                          key={rowUser.id}
                          className={rowUser.role === 'superuser' && user.role !== 'superuser' ? 'row-disabled' : ''}
                        >
                          <td style={{width: '24px', minWidth: '24px', maxWidth: '24px', padding: 0, textAlign: 'center'}}>
                            <div className={`status-led ${rowUser.is_active ? 'status-led-active' : 'status-led-inactive'}`}></div>
                          </td>
                          <td className="col-id">{rowUser.id}</td>
                          <td style={{width: '250px', minWidth: '250px'}}>{`${rowUser.username} ${rowUser.surname}`}</td>
                          
                          <td className="email-col" style={{wordBreak: 'break-all', width: '300px', minWidth: '300px'}}>{rowUser.email}</td>
                          <td style={{width: '100px', minWidth: '100px'}}>
                            <span >
                              {rowUser.role === 'user' ? 'utilisateur' : rowUser.role}
                            </span>
                          </td>
                          <td>
                            <CompanyTokens companies={rowUser.companies} />
                          </td>
                          <td style={{width: '180px', minWidth: '180px'}}>{new Date(rowUser.created_at).toLocaleDateString()}</td>
                          <td style={{width: '60px', minWidth: '60px'}}>
                            {(user && (
                              (user.role === 'superuser') ||
                              (user.role === 'admin' && rowUser.role !== 'superuser')
                            )) && (
                              <div className="action-buttons">
                                <button
                                  className="btn-edit"
                                  onClick={() => handleEdit(rowUser)}
                                  aria-label="Modifier utilisateur"
                                  style={{display: 'inline-flex', alignItems: 'center', gap: '8px'}}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{marginRight: '6px'}}>
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                  </svg>
                                  Modifier
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}

      {activeTab === 'form' && (
        <div className="user-form">
          <h2> Modifier l'utilisateur</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Nom d'utilisateur</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Entrez le nom d'utilisateur"
              />
              {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="surname">Prénom</label>
              <input
                type="text"
                id="surname"
                name="surname"
                value={formData.surname}
                onChange={handleInputChange}
                placeholder="Entrez le prénom"
              />
              {fieldErrors.surname && <div className="field-error">{fieldErrors.surname}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Entrez l'email"
              />
              {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Entrez le mot de passe"
              />
              {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="passwordConfirm">Confirmer le mot de passe</label>
              <input
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleInputChange}
                placeholder="Confirmez le mot de passe"
              />
              {fieldErrors.passwordConfirm && <div className="field-error">{fieldErrors.passwordConfirm}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="role">Rôle</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                />
                Utilisateur actif
              </label>
            </div>

            <div className="form-group checklist-group">
              <label>Entités associées</label>
              <div className="checkbox-list">
                {companies.map(company => (
                  <div key={company.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`company-${company.id}`}
                      name="companies"
                      value={company.id}
                      checked={formData.companies.includes(company.id)}
                      onChange={(e) => {
                        const companyId = parseInt(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          companies: e.target.checked
                            ? [...prev.companies, companyId]
                            : prev.companies.filter(id => id !== companyId)
                        }));
                      }}
                    />
                    <label htmlFor={`company-${company.id}`} className="company-name">
                      {company.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setActiveTab('list');
                  setShowModifyTab(false);
                  setEditingUser(null);
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;

