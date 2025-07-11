import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

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
    description: ''
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, companies]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await API.companies.getAll();
      setCompanies(response.data);
      setFilteredCompanies(response.data);
    } catch (err) {
      setError('Error loading companies');
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...companies];
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        result = result.filter(company => 
          String(company[key]).toLowerCase().includes(filters[key].toLowerCase())
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

    if (!formData.name.trim()) {
      errors.name = 'Company name is required';
      errorMessages.push('Company name is required');
    }
    if (!formData.address.trim()) {
      errors.address = 'Address is required';
      errorMessages.push('Address is required');
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone is required';
      errorMessages.push('Phone is required');
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      errorMessages.push('Email is required');
    }

    setFieldErrors(errors);
    setGlobalErrors(errorMessages);
    return errorMessages.length === 0;
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      description: company.description || ''
    });
    setShowModifyTab(true);
    setActiveTab('form');
    setFieldErrors({});
    setGlobalErrors([]);
  };

  const handleDelete = async (companyId) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await API.companies.delete(companyId);
        setSuccess('Company deleted successfully');
        fetchCompanies();
      } catch (err) {
        setError('Error deleting company');
        console.error('Error deleting company:', err);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
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
      setSuccess('Company updated successfully');
      setEditingCompany(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchCompanies();
    } catch (err) {
      const apiError = err.response?.data;
      const errorMessage = apiError?.msg || apiError?.error || apiError?.message || 'Error updating company';
      
      if (errorMessage.toLowerCase().includes('name')) {
        setFieldErrors({ name: 'Company name already exists' });
        setGlobalErrors(['Company name already exists']);
      } else if (errorMessage.toLowerCase().includes('email')) {
        setFieldErrors({ email: 'Email already exists' });
        setGlobalErrors(['Email already exists']);
      } else {
        setError('Error updating company');
        console.error('Error updating company:', err);
      }
    }
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
              setEditingCompany(null);
            }}
          >
            Companies List
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Modify Company
            </button>
          )}
          <Link to="/AddCompany" className="btn-primary-2">
            Add Company 
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {globalErrors.length > 0 && (
        <div className="alert alert-error">
          {globalErrors.map((err, index) => (
            <div key={index}>{err}</div>
          ))}
        </div>
      )}

      {activeTab === 'list' && (
        <div className="users-list">
          {loading && (
            <div className="loading-message">
              Loading companies...
            </div>
          )}
          <div className="users-table-container">
            <table className="users-table-fixed">
              <thead>
                <tr>
                  <th></th> {/* Placeholder for status LED */}
                  <th>ID</th>
                  <th>Company Name</th>
                  <th>Address</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
                <tr className="filter-row">
                  <td></td> {/* Placeholder for status LED filter */}
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
                      value={filters.name}
                      onChange={(e) => handleFilterChange(e, 'name')}
                      placeholder="Filter Name"
                      className="filter-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={filters.address}
                      onChange={(e) => handleFilterChange(e, 'address')}
                      placeholder="Filter Address"
                      className="filter-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={filters.phone}
                      onChange={(e) => handleFilterChange(e, 'phone')}
                      placeholder="Filter Phone"
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
                  <td></td>
                </tr>
              </thead>
              <tbody className="table-body-scrollable">
                {!loading && filteredCompanies.length > 0 ? (
                  filteredCompanies.map(company => (
                    <tr key={company.id}>
                      <td></td> {/* Placeholder for status LED */}
                      <td>{company.id}</td>
                      <td>{company.name}</td>
                      <td>{company.address}</td>
                      <td>{company.phone}</td>
                      <td>{company.email}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(company)}
                          >
                            Modify
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(company.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : !loading ? (
                  <tr>
                    <td colSpan="7" className="no-results"> {/* Adjusted colspan */}
                      {companies.length === 0 ? 'No companies available' : 'No companies found matching your filters'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'form' && editingCompany && (
        <div className="user-form">
          <h2>Modify Company</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Company name *</label>
              <input
                type="text"
                name="name"
                placeholder="Enter company name"
                value={formData.name}
                onChange={handleInputChange}
                className={fieldErrors.name ? 'input-error' : ''}
              />
              {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
            </div>
            <div className="form-group">
              <label>Address *</label>
              <input
                type="text"
                name="address"
                placeholder="Enter address"
                value={formData.address}
                onChange={handleInputChange}
                className={fieldErrors.address ? 'input-error' : ''}
              />
              {fieldErrors.address && <div className="field-error">{fieldErrors.address}</div>}
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input
                type="text"
                name="phone"
                placeholder="Enter phone"
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
                placeholder="Enter email"
                value={formData.email}
                onChange={handleInputChange}
                className={fieldErrors.email ? 'input-error' : ''}
              />
              {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
            </div>
            <div className="form-group">
              <label>Website</label>
              <input
                type="text"
                name="website"
                placeholder="Enter website"
                value={formData.website}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                placeholder="Enter description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setActiveTab('list');
                  setShowModifyTab(false);
                  setEditingCompany(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Update Company
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminCompanies;



