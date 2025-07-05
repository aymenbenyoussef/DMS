import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';

const AdminCompanies = ({ user }) => {
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [editingCompany, setEditingCompany] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // "list" or "form"
  const [showModifyTab, setShowModifyTab] = useState(false);
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
      if (Array.isArray(data)) setCompanies(data);
      else if (data.companies) setCompanies(data.companies);
    } catch (err) {
      setError('Error loading companies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

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
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await API.companies.delete(companyId);
        setSuccess('Company deleted successfully');
        fetchCompanies();
      } catch (err) {
        setError('Error deleting company');
        console.error('Error deleting company:', err);
      }
      window.dispatchEvent(new Event('companyDeleted'));
      navigate('/companies');
    }
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
    try {
      await API.companies.update(editingCompany.id, formData);
      setSuccess('Company updated successfully');
      setEditingCompany(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchCompanies();
    } catch (err) {
      setError('Error updating company');
      console.error('Error updating company:', err);
    }
  };

  return (
    <div className="admin-users">
      <div className="admin-header">
        <h1>Companies Management</h1>
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
        </div>
      </div>

      {loading && <p>Loading companies...</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {activeTab === 'list' && (
        <div className="users-list">
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Company Name</th>
                  <th>Address</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Creation date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(company => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'form' && (
        <div className="user-form">
          <h2>Modify Company</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Company Name"
                required
              />
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
                  setEditingCompany(null);
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

export default AdminCompanies;
