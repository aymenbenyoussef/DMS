// src/components/AddUser.jsx
import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';

const AddUser = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    username: '',
    surname: '',
    email: '',
    password: '',
    passwordConfirm: '',
    role: 'user',
    is_active: true,
    user_limit: 0,
    companies: []
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await API.companies.getAll();
        const data = response.data;
        if (Array.isArray(data)) setCompanies(data);
        else if (data.companies) setCompanies(data.companies);
      } catch (err) {
        setError('Error loading companies');
        console.error(err);
      }
    };
    fetchCompanies();
  }, []);

  const validate = () => {
    const errors = {};
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.surname.trim()) errors.surname = 'First name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!formData.email.includes('@')) errors.email = 'Email is invalid';
    if (!formData.password) errors.password = 'Password is required';
    if (!formData.passwordConfirm) errors.passwordConfirm = 'Please confirm password';
    else if (formData.password !== formData.passwordConfirm) errors.passwordConfirm = 'Passwords do not match';
    // no validation for optional fields
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'companies') {
      const companyId = parseInt(value, 10);
      setFormData((prev) => {
        const current = Array.isArray(prev.companies) ? prev.companies : [];
        let next;
        if (checked) next = Array.from(new Set([...current, companyId]));
        else next = current.filter((id) => id !== companyId);
        return { ...prev, companies: next };
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    // clear error on change
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;

    setLoading(true);
    try {
      await API.admin.createUser(formData);
      setSuccess('User created successfully');
      setFormData({
        username: '', surname: '', email: '', password: '', passwordConfirm: '',
        role: 'user', is_active: true, user_limit: 0, companies: []
      });
      setFieldErrors({});
      setActiveTab('profile');
    } catch (err) {
      setError('Error creating user');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-users">
      <h1>Add New User</h1>

      <div className="admin-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'access' ? 'active' : ''}`}
          onClick={() => setActiveTab('access')}
        >
          Access & Companies
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="user-form">
        {/* Profile Tab */}
        <div className="tab-panel" style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              placeholder="Enter username"
              value={formData.username}
              onChange={handleInputChange}
            />
            {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
          </div>
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="surname"
              placeholder="Enter first name"
              value={formData.surname}
              onChange={handleInputChange}
            />
            {fieldErrors.surname && <div className="field-error">{fieldErrors.surname}</div>}
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter email"
              value={formData.email}
              onChange={handleInputChange}
            />
            {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
          </div>
        </div>

        {/* Security Tab */}
        <div className="tab-panel" style={{ display: activeTab === 'security' ? 'block' : 'none' }}>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleInputChange}
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
            />
            {fieldErrors.passwordConfirm && <div className="field-error">{fieldErrors.passwordConfirm}</div>}
          </div>
        </div>

        {/* Access & Companies Tab */}
        <div className="tab-panel" style={{ display: activeTab === 'access' ? 'block' : 'none' }}>
          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleInputChange}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
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
                    onChange={handleInputChange}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>User Limit</label>
            <input
              type="number"
              name="user_limit"
              min="0"
              placeholder="Enter user limit"
              value={formData.user_limit}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
              /> Active User
            </label>
          </div>
          <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
        </div>

        
      </form>
    </div>
  );
};

export default AddUser;
