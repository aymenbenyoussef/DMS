import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

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
    name: '',
    status: ''
  });
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    status: true
  });

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await API.partners.getAll();
      setPartners(response.data);
      setFilteredPartners(response.data);
    } catch (err) {
      setError('Error loading partners');
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, partners]);

  const applyFilters = () => {
    let result = [...partners];
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        if (key === 'status') {
          const filterValue = filters[key].toLowerCase();
          result = result.filter(partner => {
            const statusStr = partner.status ? 'active' : 'inactive';
            return statusStr.includes(filterValue);
          });
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

  const validate = () => {
    const errors = {};
    const errorMessages = [];

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
      errorMessages.push('Name is required');
    }

    setFieldErrors(errors);
    setGlobalErrors(errorMessages);
    return errorMessages.length === 0;
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name || '',
      status: partner.status || true
    });
    setShowModifyTab(true);
    setActiveTab('form');
    setFieldErrors({});
    setGlobalErrors([]);
  };

  const handleDelete = async (partnerId) => {
    if (window.confirm('Are you sure you want to delete this partner?')) {
      try {
        await API.partners.delete(partnerId);
        setSuccess('Partner deleted successfully');
        fetchPartners();
      } catch (err) {
        setError('Error deleting partner');
        console.error('Error deleting partner:', err);
      }
    }
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
    if (!editingPartner) return;
    
    try {
      await API.partners.update(editingPartner.id, formData);
      setSuccess('Partner updated successfully');
      setEditingPartner(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchPartners();
    } catch (err) {
      const apiError = err.response?.data;
      const errorMessage = apiError?.msg || apiError?.error || apiError?.message || '';
      
      if (errorMessage.toLowerCase().includes('name')) {
        setFieldErrors({ name: 'Partner name already exists' });
        setGlobalErrors(['Partner name already exists']);
      } else {
        setError('Error updating partner');
        console.error('Error updating partner:', err);
      }
    }
  };

  return (
    <div className="admin-users">
      <div className="admin-header">
        <h1>Partners Management</h1>
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('list');
              setShowModifyTab(false);
              setEditingPartner(null);
            }}
          >
            Partners List
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Modify Partner
            </button>
          )}
          <Link to="/AddPartner" className="btn-primary-2">
            Add Partner
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
                    Name
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
                    Status
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="loading-message">
                      Loading partners...
                    </td>
                  </tr>
                ) : filteredPartners.length > 0 ? (
                  filteredPartners.map(partner => (
                    <tr key={partner.id}>
                      <td>{partner.id}</td>
                      <td>{partner.name}</td>
                      <td>{partner.status ? 'Active' : 'Inactive'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(partner)}
                          >
                            Modify
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(partner.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="no-results">
                      {partners.length === 0 ? 'No partners available' : 'No partners found matching your filters'}
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
          <h2>Modify Partner</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Partner name"
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
                Active
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Update
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setActiveTab('list');
                  setShowModifyTab(false);
                  setEditingPartner(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPartners;