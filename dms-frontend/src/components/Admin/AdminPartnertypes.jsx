import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const AdminPartnerTypes = ({ user }) => {
  const [partnerTypes, setPartnerTypes] = useState([]);
  const [filteredPartnerTypes, setFilteredPartnerTypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [editingPartnerType, setEditingPartnerType] = useState(null);
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

  useEffect(() => {
    fetchPartnerTypes();
  }, []);

  const fetchPartnerTypes = async () => {
    try {
      setLoading(true);
      const response = await API.partnertype.getAll();
      setPartnerTypes(response.data);
      setFilteredPartnerTypes(response.data);
    } catch (err) {
      setError('Error loading partner types');
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filters, partnerTypes]);

  const applyFilters = () => {
    let result = [...partnerTypes];
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        if (key === 'status') {
          const filterValue = filters[key].toLowerCase();
          result = result.filter(partnerType => {
            const statusStr = partnerType.status ? 'active' : 'inactive';
            return statusStr.includes(filterValue);
          });
        } else {
          result = result.filter(partnerType => 
            String(partnerType[key]).toLowerCase().includes(filters[key].toLowerCase())
          );
        }
      }
    });
    
    setFilteredPartnerTypes(result);
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

  const handleEdit = (partnerType) => {
    setEditingPartnerType(partnerType);
    setFormData({
      name: partnerType.name || '',
      status: partnerType.status || true
    });
    setShowModifyTab(true);
    setActiveTab('form');
    setFieldErrors({});
    setGlobalErrors([]);
  };

  const handleDelete = async (partnerTypeId) => {
    if (window.confirm('Are you sure you want to delete this partner type?')) {
      try {
        await API.partnertype.delete(partnerTypeId);
        setSuccess('Partner type deleted successfully');
        fetchPartnerTypes();
      } catch (err) {
        setError('Error deleting partner type');
        console.error('Error deleting partner type:', err);
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
    if (!editingPartnerType) return;
    
    try {
      await API.partnertype.update(editingPartnerType.id, formData);
      setSuccess('Partner type updated successfully');
      setEditingPartnerType(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchPartnerTypes();
    } catch (err) {
      const apiError = err.response?.data;
      const errorMessage = apiError?.msg || apiError?.error || apiError?.message || 'Error updating partner';
      
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
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('list');
              setShowModifyTab(false);
              setEditingPartnerType(null);
            }}
          >
            Partner Types List
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Modify Partner Type
            </button>
          )}
          
          <Link to="/AddPartnerType" className="btn-primary-2">
            Add Partner Type
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
                    <th>ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                  <tr className="filter-row">
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
                        value={filters.status}
                        onChange={(e) => handleFilterChange(e, 'status')}
                        placeholder="Filter Status"
                        className="filter-input"
                      />
                    </td>
                    <td></td>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                  <tr>
                    <td colSpan="5" className="loading-message">
                      Loading partner types...
                    </td>
                  </tr>
                ) : 
                  filteredPartnerTypes.length > 0 ? (
                    filteredPartnerTypes.map(partnerType => (
                      <tr key={partnerType.id}>
                        <td>{partnerType.id}</td>
                        <td>{partnerType.name}</td>
                        <td>
                          <span className={`status-text ${partnerType.status ? 'status-active' : 'status-inactive'}`}>
                            {partnerType.status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-edit"
                              onClick={() => handleEdit(partnerType)}
                            >
                              Modify
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleDelete(partnerType.id)}
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
                        {partnerTypes.length === 0 ? 'No partner types available' : 'No partner types found matching your filters'}
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
          <h2>Modify Partner Type</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Partner type name"
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
              
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setActiveTab('list');
                  setShowModifyTab(false);
                  setEditingPartnerType(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Update
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPartnerTypes;