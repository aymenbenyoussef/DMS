import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css'; // Changed from AdminDashboard.css
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

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

  const handleTabChange = (tab) => {
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
        //fetchUsers();
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
          <Link to="/AddUsers" className="btn-primary-2">
            Ajouter un utilisateur
          </Link>
        </div>
      </div>

      {showError && (
        <div className="alert alert-error" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'8px'}}>
          {errorMsg}<br/>
          <button className="btn btn-primary" onClick={handleRetry} style={{marginTop:'8px'}}>Réessayer</button>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="users-list">
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
                      <th>Id</th>
                      <th>Nom complet</th>

                      <th>Email</th>
                      <th>Rôle</th>
                      <th>Entités</th>
                      <th>Date de création</th>
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
                      filteredUsers.map(user => (
                        <tr key={user.id}>
                          <td>
                            <div className={`status-led ${user.is_active ? 'status-led-active' : 'status-led-inactive'}`}></div>
                          </td>
                          <td>{user.id}</td>
                          <td>{`${user.username} ${user.surname}`}</td>
                          
                          <td>{user.email}</td>
                          <td>
                            <span >
                              {user.role === 'user' ? 'utilisateur' : user.role}
                            </span>
                          </td>
                          <td>
                            {user.companies && user.companies.length > 0 ? (
                              <ul className="company-tokens">
                                  {user.companies.map(company => (
                                    <li key={company.id} className="company-token">{company.name}</li>
                                  ))}
                              </ul>
                            ) : (
                              <span></span>
                            )}
                          </td>
                          <td>{new Date(user.created_at).toLocaleDateString()}</td>
                          <td>
                           {user.role === 'user' && ( 
                            <div className="action-buttons">
                              <button
                                className="btn-edit"
                                onClick={() => handleEdit(user)}
                              >
                                Modifier
                              </button>
                              
                            </div>)}
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

