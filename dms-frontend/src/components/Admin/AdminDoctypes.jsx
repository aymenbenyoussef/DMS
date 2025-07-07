import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';

const AdminDoctypes = ({ user }) => {
  const [doctypes, setDoctypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [editingDoctype, setEditingDoctype] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showModifyTab, setShowModifyTab] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalErrors, setGlobalErrors] = useState([]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    status: true,
    companies: []
  });

  const fetchDoctypes = async () => {
    try {
      setLoading(true);
      const response = await API.doctype.getAll();
      setDoctypes(response.data);
    } catch (err) {
      setError('Error loading document types');
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
      console.error('Failed to load companies:', err);
    }
  };

  useEffect(() => {
    fetchDoctypes();
    fetchCompanies();
  }, []);

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

  const handleEdit = async (doctype) => {
    try {
      setLoading(true);
      const companiesResponse = await API.doctype.getCompanies(doctype.id);
      setEditingDoctype(doctype);
      setFormData({
        name: doctype.name || '',
        status: doctype.status || true,
        companies: companiesResponse.data.map(c => c.id) || []
      });
      setShowModifyTab(true);
      setActiveTab('form');
      // Clear errors when starting to edit
      setFieldErrors({});
      setGlobalErrors([]);
    } catch (err) {
      setError('Error loading document type companies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doctypeId) => {
    if (window.confirm('Are you sure you want to delete this document type?')) {
      try {
        const companiesResponse = await API.doctype.getCompanies(doctypeId);
        const affectedCompanyIds = companiesResponse.data.map(c => c.id);

        await API.doctype.delete(doctypeId);
        
        setSuccess('Document type deleted successfully');
        fetchDoctypes();
        window.dispatchEvent(new CustomEvent('doctypeDeleted', {
        detail: {
            affectedCompanyIds: affectedCompanyIds
        }
        }));
        navigate('/doctypes')
      } catch (err) {
        setError('Error deleting document type');
        console.error('Error deleting document type:', err);
      }

    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for this field if it exists
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCompanyChange = (e, companyId) => {
    const { checked } = e.target;
    setFormData(prev => ({
      ...prev,
      companies: checked
        ? [...prev.companies, companyId]
        : prev.companies.filter(id => id !== companyId)
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGlobalErrors([]);
    
    if (!validate()) return;
    if (!editingDoctype) return;
    
    try {
      await API.doctype.update(editingDoctype.id, formData);
      setSuccess('Document type updated successfully');
      setEditingDoctype(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchDoctypes();
      window.dispatchEvent(new CustomEvent('doctypeUpdated', {
    detail: {
        affectedCompanyIds: formData.companies
    }
    }));
    } catch (err) {
      const apiError = err.response?.data;
      const errorMessage = apiError?.msg || apiError?.error || apiError?.message || '';
      
      if (errorMessage.toLowerCase().includes('name')) {
        setFieldErrors({ name: 'Datatype name already exists' });
        setGlobalErrors(['Datatype name already exists']);
      } else {
        setError('Error updating document type');
        console.error('Error updating document type:', err);
      }
    }
    
  };

  return (
    <div className="admin-users">
      <div className="admin-header">
        <h1>Document Types Management</h1>
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('list');
              setShowModifyTab(false);
              setEditingDoctype(null);
            }}
          >
            Document Types List
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Modify Document Type
            </button>
          )}
        </div>
      </div>

      {loading && <p>Loading document types...</p>}
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
                  <th>Companies</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctypes.map(doctype => (
                  <tr key={doctype.id}>
                    <td>{doctype.id}</td>
                    <td>{doctype.name}</td>
                    <td>{doctype.status ? 'Active' : 'Inactive'}</td>
                    <td>
                      {doctype.companies && doctype.companies.length > 0 ? (
                        <ul className="company-list">
                          {doctype.companies.map(company => (
                            <li key={company.id}>{company.name}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>No companies</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(doctype)}
                        >
                          Modify
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(doctype.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'form' && (
        <div className="user-form">
          <h2>Modify Document Type</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Document type name"
                className={fieldErrors.name ? 'error-input' : ''}
              />
              {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
            </div>
            
            <div className="form-group">
              <label>Companies</label>
              <div className="checkbox-list">
                {companies.map(company => (
                  <label key={company.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      name="companies"
                      value={company.id}
                      checked={formData.companies.includes(company.id)}
                      onChange={(e) => handleCompanyChange(e, company.id)}
                    />
                    <span className="company-name">{company.name}</span>
                  </label>
                ))}
              </div>
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
                  setEditingDoctype(null);
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

export default AdminDoctypes;