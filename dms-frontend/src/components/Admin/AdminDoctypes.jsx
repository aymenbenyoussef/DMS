import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css'; // Keep same styling
import { useNavigate } from 'react-router-dom';

const AdminDoctypes = ({ user }) => {
  const [doctypes, setDoctypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [editingDoctype, setEditingDoctype] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // "list" or "form"
  const [showModifyTab, setShowModifyTab] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    status: true,
  });

  const fetchDoctypes = async () => {
    try {
      setLoading(true);
      const response = await API.doctype.getAll();
      setDoctypes(response.data);
    } catch (err) {
      setError('Error loading document types');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctypes();
  }, []);

  const handleEdit = (doctype) => {
    setEditingDoctype(doctype);
    setFormData({
      name: doctype.name || '',
      status: doctype.status || true,
    });
    setShowModifyTab(true);
    setActiveTab('form');
  };

  const handleDelete = async (doctypeId) => {
    if (window.confirm('Are you sure you want to delete this document type?')) {
      try {
        const response = await API.doctype.delete(doctypeId);
        setSuccess('Document type deleted successfully');
        fetchDoctypes();
        window.dispatchEvent(new CustomEvent('doctypeDeleted', {
        detail: {
          affectedCompanyIds: response.data.affectedCompanyIds || []
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
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!editingDoctype) return;
    
    try {
      await API.doctype.update(editingDoctype.id, formData);
      setSuccess('Document type updated successfully');
      setEditingDoctype(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchDoctypes();
    } catch (err) {
      setError('Error updating document type');
      console.error('Error updating document type:', err);
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
                required
              />
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