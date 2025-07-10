import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const AdminCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [editingCompany, setEditingCompany] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showModifyTab, setShowModifyTab] = useState(false);
  const [filters, setFilters] = useState({
    id: '',
    name: '',
    address: '',
    email: '',
    phone: ''
  });
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
  });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await API.companies.getAll();
      const data = response.data;
      if (Array.isArray(data)) {
        setCompanies(data);
        setFilteredCompanies(data);
      }
      else if (data.companies) {
        setCompanies(data.companies);
        setFilteredCompanies(data.companies);
      }
    } catch (err) {
      setError('Error loading entities');
      console.error(err);
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
    }, 3000); // 5 seconds

    return () => clearTimeout(timer);
  }, [success, error, fieldErrors]);
  
  useEffect(() => {
  const timer2 = setTimeout(() => {
      if (error || Object.keys(fieldErrors).length > 0) {
        
        setFieldErrors({});
      }
    }, 9999999999); 

    return () => clearTimeout(timer2);
  }, [ error, fieldErrors]);

  // Add this useEffect to clear on tab change
 const handleTabChange = (tab) => {
    if (tab !== 'list') {
      // Clear all messages when switching away from list
      setError('');
      setSuccess('');
      setFieldErrors({});
    } else {
      // When switching to list, only clear errors (keep success)
      setError('');
      setSuccess('');
      setFieldErrors({});
    }
    setActiveTab(tab);
    if (tab !== 'form') {
      setShowModifyTab(false);
      setEditingCompany(null);
    }
    setFieldErrors({});
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, companies]);

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

  

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      address: company.address || '',
      email: company.email || '',
      phone: company.phone || '',
    });
    setShowModifyTab(true);
    setActiveTab('form');
  };



  const handleDelete = async (companyId) => {
    if (window.confirm('Are you sure you want to delete this Entity?')) {
      try {
        await API.companies.delete(companyId);
        setSuccess('Entity deleted successfully');
        fetchCompanies();
      } catch (err) {
        setError('Error deleting entity');
        console.error('Error deleting entity:', err);
        
        window.dispatchEvent(new Event('companyDeleted'));
        navigate('/companies');
      }
  };
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!editingCompany) return;
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required.';
    if (!formData.address.trim()) errors.address = 'Address is required.';
    if (!formData.email.trim()) errors.email = 'Email is required.';
    if (!formData.phone) errors.phone = 'Phone is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      await API.companies.update(editingCompany.id, formData);
      setSuccess('Entity updated successfully');
      setEditingCompany(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchCompanies();
    } catch (err) {
      
      const errorMsg =
      err.response?.data?.msg ||
      "Error occurred while updating the entity.";

      // If duplicate error, set field-level messages
      if (errorMsg.toLowerCase().includes("name") || errorMsg.toLowerCase().includes("email")) {
        const duplicateErrors = {};
        if (errorMsg.toLowerCase().includes("name")) {
          duplicateErrors.name = "This entity name already exists.";
        }
        if (errorMsg.toLowerCase().includes("email")) {
          duplicateErrors.email = "This email is already in use.";
        }
        setFieldErrors(duplicateErrors);
        }else {
      setFieldErrors({ global: errorMsg });
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
            Entities List
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => handleTabChange('form')}
            >
              Modify Entity
            </button>
          )}
        </div>
      </div>

      {fieldErrors.global && (
        <div className="alert alert-error">{fieldErrors.global}</div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {activeTab === 'list' && (
        <div className="users-list">
          <div className="filter-controls">
            
          
          <Link to="/AddComp" className="btn-primary-2">
            Add Entity
          </Link>
          </div>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>
                    ID
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
                  <th>
                    Entity Name
                    <div className="filter-container">
                      <input
                        type="text"
                        value={filters.name}
                        onChange={(e) => handleFilterChange(e, 'name')}
                        placeholder="Filter Name"
                        className="filter-input"
                      />
                    </div>
                  </th>
                  <th>
                    Address
                    <div className="filter-container">
                      <input
                        type="text"
                        value={filters.address}
                        onChange={(e) => handleFilterChange(e, 'address')}
                        placeholder="Filter Address"
                        className="filter-input"
                      />
                    </div>
                  </th>
                  <th>
                    Email
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
                  <th>
                    Phone
                    <div className="filter-container">
                      <input
                        type="text"
                        value={filters.phone}
                        onChange={(e) => handleFilterChange(e, 'phone')}
                        placeholder="Filter Phone"
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
                    <td colSpan="7" className="loading-message">
                      Loading entities...
                    </td>
                  </tr>
                ) :
                filteredCompanies.length > 0 ? (
                  filteredCompanies.map(company => (
                    <tr key={company.id}>
                      <td>{company.id}</td>
                      <td>{company.name}</td>
                      <td>{company.address}</td>
                      <td>{company.email}</td>
                      <td>{company.phone}</td>
                      <td>{company.created_at}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => {handleEdit(company)
                              setFieldErrors({});
                            }}
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
                ) : (
                  <tr>
                    <td colSpan="7" className="no-results">
                      {companies.length === 0 ? 'No entities available' : 'No entities found matching your filters'}
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
          <h2>Modify entity</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Entity Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Entity Name"
                
              />
              {fieldErrors.name && (
              <p className="error-text">{fieldErrors.name}</p>
            )}
            </div>
            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Address"
              />
              {fieldErrors.address && (
              <p className="error-text">{fieldErrors.address}</p>
            )}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email"
              />
              {fieldErrors.email && (
              <p className="error-text">{fieldErrors.email}</p>
            )}
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Phone"
              />
              {fieldErrors.phone && (
              <p className="error-text">{fieldErrors.phone}</p>
            )}
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleTabChange('list')}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary"  >
                Update
              </button>
              
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminCompanies;