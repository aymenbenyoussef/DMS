import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const AdminCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [error, setError] = useState('');
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

  useEffect(() => {
    
    const handleCompanyAdded = () => {
      setSuccess('Entity created successfully!');
      fetchCompanies(); // Refresh the list
    }
      // Clear the message after 5 seconds
     

    window.addEventListener('companyAdded', handleCompanyAdded);

    return () => {
      window.removeEventListener('companyAdded', handleCompanyAdded);
    };
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
    if (window.confirm('Are you sure you want to delete this Entity?')) {
      try {
        await API.companies.delete(companyId);
        setSuccess('Entity deleted successfully');
        fetchCompanies();
      } catch (err) {
        setError('Error deleting entity');
        console.error('Error deleting entity:', err);
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
      setSuccess('Entity updated successfully');
      setEditingCompany(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchCompanies();
    } catch (err) {
      setError('Error updating entity');
      console.error('Error updating entity:', err);
    }
  };
  return (
    <div className="admin-users">
      <div className="admin-header">
        <h1>Entities Management</h1>
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('list');
              setShowModifyTab(false);
              setEditingCompany(null);
            }}
          >
            Entities List
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Modify Entity
            </button>
          )}
        </div>
      </div>

      
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