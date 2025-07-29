import React, { useRef, useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css'; // Changed from AdminDashboard.css
import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { exportToCSV, exportToJSON, exportToTXT, exportToExcel } from './exportUtils';

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
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

  const navigate = useNavigate();

  // Move loadData to top level so it can be called after updates
  const loadData = async () => {
    setLoading(true);
    setError('');
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
      clearTimeout(timeoutId);
      setError('Erreur lors du chargement des données: ' + (err?.message || err));
      console.error('AdminUsers loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    axios.get('http://localhost:5000/api/settings').then(res => {
      setMaxUsers(res.data.maxUsers);
    });
  }, []);

  useEffect(() => {
    if (loadingUser || !user?.id) return;
    let isMounted = true;
    let timeoutId;

    const loadData = async () => {
      setLoading(true);
      setError('');
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
      } catch (err) {
        if (!isMounted) return;
        clearTimeout(timeoutId);
        setError('Erreur lors du chargement des données: ' + (err?.message || err));
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
    const timer = setTimeout(() => {
      if (success || error || Object.keys(fieldErrors).length > 0) {
        setError('');
        setSuccess('');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [success, error, fieldErrors]);
  
  useEffect(() => {
    const timer2 = setTimeout(() => {
      if (error || Object.keys(fieldErrors).length > 0) {
        setFieldErrors({});
      }
    }, 9999999999); 

    return () => clearTimeout(timer2);
  }, [error, fieldErrors]);

  useEffect(() => {
    if (globalLimitError) {
      const timer = setTimeout(() => setGlobalLimitError(''), 10000);
      return () => clearTimeout(timer);
    }
  }, [globalLimitError]);

  const handleTabChange = (tab) => {
    setGlobalLimitError('');
    if (tab !== 'list') {
      setError('');
      setSuccess('');
      setFieldErrors({});
    } else {
      setError('');
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
    if (!loading && filteredUsers.length === 0) {
      const message = users.length === 0 ? 'No users available' : 'No users found matching your filters';
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
  }, [loading, filteredUsers, users]);

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
      errors.email = 'Email is required';
      errorMessages.push('Email is required');
    } else if (!formData.email.includes('@')) {
      errors.email = 'Email is invalid';
      errorMessages.push('Email is invalid');
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
    setError('');
    setSuccess('');
    setGlobalErrors([]);
    setFieldErrors({});
    setGlobalLimitError('');
    if (!editingUser && maxUsers !== null && users.length >= maxUsers) {
      setGlobalLimitError('Vous avez atteint le nombre maximal d’utilisateurs. Veuillez contacter le support technique.');
      return;
    }
    if (!validate()) return;
    setLoading(true);

    try {
      if (editingUser) {
        await API.admin.updateUser(editingUser.id, formData);
        setSuccess('Utilisateur mis à jour avec succès');
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
        setSuccess('Utilisateur supprimé avec succès');
        //fetchUsers();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting user:', err);
      }
    }
  };

  const dismissNotification = () => {
    setShowNotification(false);
  };

  // Retry handler: retry both
  const handleRetry = () => {
    setRetryCount(c => c + 1);
    setError('');
    setTimeoutError(false);
  };

  // Determine loading/error state for both
  const isLoading = loading && !timeoutError;
  const isTimeout = timeoutError;
  const isError = !!error || timeoutError;
  const showSpinner = isLoading && !isTimeout;
  const showError = isError || isTimeout;
  const errorMsg = error || (timeoutError && 'Le chargement prend trop de temps.');
  const canShowList = !loading && !timeoutError && !error;

  // Sorting logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredUsers].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
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
      setGlobalLimitError('Vous avez atteint le nombre maximal d’utilisateurs. Veuillez contacter le support technique.');
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
          <button className="btn-primary-2" onClick={handleAddUser}>
            Ajouter un utilisateur
          </button>
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
              <ul ref={exportMenuRef} className="export-dropdown-list">
                <li onClick={() => { handleExport('csv'); setExportMenuOpen(false); }} style={{padding: '8px 16px', cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease'}} onMouseOver={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#1976d2'; }} onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'inherit'; }}>CSV</li>
                <li onClick={() => { handleExport('json'); setExportMenuOpen(false); }} style={{padding: '8px 16px', cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease'}} onMouseOver={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#1976d2'; }} onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'inherit'; }}>JSON</li>
                <li onClick={() => { handleExport('txt'); setExportMenuOpen(false); }} style={{padding: '8px 16px', cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease'}} onMouseOver={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#1976d2'; }} onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'inherit'; }}>TXT</li>
                <li onClick={() => { handleExport('excel'); setExportMenuOpen(false); }} style={{padding: '8px 16px', cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease'}} onMouseOver={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#1976d2'; }} onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'inherit'; }}>Excel</li>
              </ul>
            )}
          </div>
          
          {success && (
            <div className="alert alert-success" style={{marginBottom: '16px', textAlign: 'left'}}>
              {success}
            </div>
          )}
          {showSpinner ? (
            <div className="loading-message">
              <div className="loading-spinner" style={{marginRight:'8px',display:'inline-block',verticalAlign:'middle'}}></div>
              Chargement des utilisateurs...
            </div>
          
          ) : canShowList ? (
            <>
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
                      <th></th>
                      <th style={{cursor:'pointer', background: sortConfig.key === 'id' ? '#f0f4fa' : undefined, color: sortConfig.key === 'id' ? '#1976d2' : undefined}} onClick={() => handleSort('id')}>
                        Id <span style={{fontSize:'1em'}}>{sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>
                      <th style={{cursor:'pointer', background: sortConfig.key === 'username' ? '#f0f4fa' : undefined, color: sortConfig.key === 'username' ? '#1976d2' : undefined}} onClick={() => handleSort('username')}>
                        Nom complet <span style={{fontSize:'1em'}}>{sortConfig.key === 'username' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>
                      
                      <th className="email-col" style={{cursor:'pointer', background: sortConfig.key === 'email' ? '#f0f4fa' : undefined, color: sortConfig.key === 'email' ? '#1976d2' : undefined, wordBreak: 'break-all'}} onClick={() => handleSort('email')}>
                                Email <span style={{fontSize:'1em'}}>{sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>

                      <th style={{cursor:'pointer', background: sortConfig.key === 'role' ? '#f0f4fa' : undefined, color: sortConfig.key === 'role' ? '#1976d2' : undefined}} onClick={() => handleSort('role')}>
                        Rôle <span style={{fontSize:'1em'}}>{sortConfig.key === 'role' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>
                      <th style={{cursor:'pointer', background: sortConfig.key === 'companies' ? '#f0f4fa' : undefined, color: sortConfig.key === 'companies' ? '#1976d2' : undefined}} onClick={() => handleSort('companies')}>
                        Entités <span style={{fontSize:'1em'}}>{sortConfig.key === 'companies' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </th>
                      <th style={{cursor:'pointer', background: sortConfig.key === 'created_at' ? '#f0f4fa' : undefined, color: sortConfig.key === 'created_at' ? '#1976d2' : undefined}} onClick={() => handleSort('created_at')}>
                        Date de création <span style={{fontSize:'1em'}}>{sortConfig.key === 'created_at' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
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
                          placeholder="Filter ID"
                          className="filter-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={filters.username }
                          onChange={(e) => handleFilterChange(e, 'username')}
                          placeholder="Filter Name"
                          className="filter-input"
                        />
                      </td>
                      
                      <td>
                        <input
                          type="text"
                          value={filters.email}
                          onChange={(e) => handleFilterChange(e, 'email')}
                          placeholder="Filter Email"
                          className="filter-input"
                        />
                      </td>
                      <td>
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
                      <td></td>
                      <td></td>
                    </tr>
                  </thead>
                  <tbody className="table-body-scrollable">
                    
                    {!loading && filteredUsers.length > 0 && (
                      filteredUsers.map(rowUser => (
                        <tr
                          key={rowUser.id}
                          className={rowUser.role === 'superuser' && user.role !== 'superuser' ? 'row-disabled' : ''}
                        >
                          <td>
                            <div className={`status-led ${rowUser.is_active ? 'status-led-active' : 'status-led-inactive'}`}></div>
                          </td>
                          <td>{rowUser.id}</td>
                          <td>{`${rowUser.username} ${rowUser.surname}`}</td>
                          
                          <td className="email-col" style={{wordBreak: 'break-all'}}>{rowUser.email}</td>
                          <td>
                            <span >
                              {rowUser.role === 'user' ? 'utilisateur' : rowUser.role}
                            </span>
                          </td>
                          <td>
                            {rowUser.companies && rowUser.companies.length > 0 ? (
                              <ul className="company-tokens">
                                  {rowUser.companies.map(company => (
                                    <li key={company.id} className="company-token">{company.name}</li>
                                  ))}
                              </ul>
                            ) : (
                              <span></span>
                            )}
                          </td>
                          <td>{new Date(rowUser.created_at).toLocaleDateString()}</td>
                          <td>
                            {(user && (
                              (user.role === 'superuser') ||
                              (user.role === 'admin' && rowUser.role !== 'superuser')
                            )) && (
                              <div className="action-buttons">
                                <button
                                  className="btn-edit"
                                  onClick={() => handleEdit(rowUser)}
                                >
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
              <label htmlFor="surname">Entrez le nom d'utilisateur</label>
              <input
                type="text"
                id="surname"
                name="surname"
                value={formData.surname}
                onChange={handleInputChange}
                placeholder="Entrez le nom d'utilisateur"
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
                className={fieldErrors.email ? 'error-input' : ''}
                placeholder="Entrez l'e-mail"
              />
              {fieldErrors.email && (
                <div className="field-error">
                  {fieldErrors.email}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!editingUser}
                placeholder="Entrez le mot de passe"
              />
              {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
            </div>
            <div className="form-group">
              <label>Confirmer le mot de passe</label>
              <input
                type="password"
                name="passwordConfirm"
                placeholder="Confirmer le mot de passe"
                value={formData.passwordConfirm}
                onChange={handleInputChange}
                required={!editingUser}
              />
              {fieldErrors.passwordConfirm && <div className="field-error">{fieldErrors.passwordConfirm}</div>}
            </div>

            <div className="form-group">
              <label>Entités</label>
              <div className="checkbox-list">
                {companies.map((c) => (
                  <label key={c.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      name="companies"
                      value={c.id}
                      checked={formData.companies.includes(c.id)}
                      onChange={(e) => {
                        const { value, checked } = e.target;
                        const companyId = parseInt(value, 10);
                        setFormData(prev => ({
                          ...prev,
                          companies: checked
                            ? [...prev.companies, companyId]
                            : prev.companies.filter(id => id !== companyId)
                        }));
                      }}
                    />
                    <span className="company-name">{c.name}</span>
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
                />
                Utilisateur actif
              </label>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => handleTabChange('list')}
                className="btn-cancel"
              >
                Annuler
              </button>
              <button type="submit" disabled={loading} className="btn">
                {loading ? 'Chargement...' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;

 