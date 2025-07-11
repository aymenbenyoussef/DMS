import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminDashboard.css';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const AdminUsers = ({user}) => {
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
    status: '',
    companies:''
  });

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await API.companies.getAll();
        console.log("Companies data:", response.data);
        
        const data = response.data;

        if (Array.isArray(data)) {
          setCompanies(data);
        }
        else if (data && Array.isArray(data.companies)) {
          setCompanies(data.companies);
        }
        else {
          throw new Error("Format inattendu des données reçues");
        }
      } catch (err) {
        console.error('Failed to load companies:', err.response?.data || err.message);
        setError(`Erreur de chargement: ${err.response?.data?.msg || err.message}`);
      }
    };

    fetchCompanies();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await API.admin.getUsers();
      const usersWithCompanies = response.data.map(user => ({
        ...user,
        companies: user.companies || []
      }));
      setUsers(usersWithCompanies);
      setFilteredUsers(usersWithCompanies);
      const companiesMap = {};
      usersWithCompanies.forEach(user => {
        companiesMap[user.id] = user.companies;
      });
      setUserCompanies(companiesMap);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const applyFilters = () => {
    let result = [...users];
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        if (key === 'status') {
          const filterValue = filters[key].toLowerCase();
          result = result.filter(user => 
            (filterValue === 'active' && user.is_active) ||
            (filterValue === 'inactive' && !user.is_active)||
          (user.is_active ? 'active' : 'inactive').includes(filterValue)
          );
        } 
        else if (key === 'companies') {
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
        fetchUsers();
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
        fetchUsers();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting user:', err);
      }
    }
  };

  return (
    <div className="admin-users">
      <div className="admin-header">
        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => handleTabChange('list')}
          >
            Users List
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
              Modify User 
            </button>
          )}
          <Link to="/AddUsers" className="btn-primary-2">
            Add User
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {activeTab === 'list' && (
        <div className="users-list">
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>ID
                    <div className="filter-container">
                      <input
                        type="text"
                        value={filters.id}
                        onChange={(e) => handleFilterChange(e, 'id')}
                        placeholder="Filter ID"
                        className="filter-input"
                      />
                    </div>
                  </th>
                  <th>User Name
                    <div className="filter-container">
                      <input
                        type="text"
                        value={filters.username}
                        onChange={(e) => handleFilterChange(e, 'username')}
                        placeholder="Filter Name"
                        className="filter-input"
                      />
                    </div>
                  </th>
                  <th>User Surname
                    <div className="filter-container">
                      <input
                        type="text"
                        value={filters.surname}
                        onChange={(e) => handleFilterChange(e, 'surname')}
                        placeholder="Filter Surname"
                        className="filter-input"
                      />
                    </div>
                  </th>
                  <th>Email
                    <div className="filter-container">
                      <input
                        type="text"
                        value={filters.email}
                        onChange={(e) => handleFilterChange(e, 'email')}
                        placeholder="Filter Email"
                        className="filter-input"
                      />
                    </div>
                  </th>
                  <th>Role
                    <div className="filter-container">
                      <input
                        type="text"
                        value={filters.role}
                        onChange={(e) => handleFilterChange(e, 'role')}
                        placeholder="Filter Role"
                        className="filter-input"
                      />
                    </div>
                  </th>
                  <th>Status
                    <div className="filter-container">
                      <input
                        type="text"
                        value={filters.status}
                        onChange={(e) => handleFilterChange(e, 'status')}
                        placeholder="Filter Status (active/inactive)"
                        className="filter-input"
                      />
                    </div>
                  </th>
                  <th>Companies
                    <div className="filter-container">
                      <input
                        type="text"
                        value={filters.companies}
                        onChange={(e) => handleFilterChange(e, 'companies')}
                        placeholder="Filter entities "
                        className="filter-input"
                      />
                    </div>
                  </th>
                  <th>Creation date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="loading-message">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.surname}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-text ${user.is_active ? 'active' : 'inactive'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
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
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(user)}
                          >
                            Modify
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(user.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="no-results">
                      {users.length === 0 ? 'No users available' : 'No users found matching your filters'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'form' && (
        <div className="user-form">
          <h2> Modify User </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">User Name</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter User Name"
              />
              {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="surname">User Surname</label>
              <input
                type="text"
                id="surname"
                name="surname"
                value={formData.surname}
                onChange={handleInputChange}
                placeholder="Enter User Surname"
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
                placeholder="Enter Email"
              />
              {fieldErrors.email && (
                <div className="field-error">
                  {fieldErrors.email}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">
                New password 
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!editingUser}
                placeholder="Enter Password"
              />
              {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="passwordConfirm"
                placeholder="Confirm password"
                value={formData.passwordConfirm}
                onChange={handleInputChange}
                required={!editingUser}
              />
              {fieldErrors.passwordConfirm && <div className="field-error">{fieldErrors.passwordConfirm}</div>}
            </div>

            <div className="form-group">
              <label>Companies</label>
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
                Active user
              </label>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => handleTabChange('list')}
                className="btn-primary"
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Loading...' : (editingUser ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;