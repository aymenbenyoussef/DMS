import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const AdminDoctypes = ({ user }) => {
  const [doctypes, setDoctypes] = useState([]);
  const [filteredDoctypes, setFilteredDoctypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [editingDoctype, setEditingDoctype] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showModifyTab, setShowModifyTab] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalErrors, setGlobalErrors] = useState([]);
  const [filters, setFilters] = useState({
    id: '',
    name: ''
  });
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    is_active: true
  });

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    fetchDoctypes();
  }, []);

  const fetchDoctypes = async () => {
    try {
      setLoading(true);
      const response = await API.doctype.getAll();
      setDoctypes(response.data);
      setFilteredDoctypes(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des types de documents');
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filters, doctypes]);

  // New useEffect to handle notification display
  useEffect(() => {
    if (!loading && filteredDoctypes.length === 0) {
      const message = doctypes.length === 0 ? 'Aucun type de document disponible' : 'Aucun type de document ne correspond à vos filtres';
      setNotificationMessage(message);
      setShowNotification(true);
      
      // Auto-hide notification after 5 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setShowNotification(false);
    }
  }, [loading, filteredDoctypes, doctypes]);

  const applyFilters = () => {
    let result = [...doctypes];
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        result = result.filter(doctype => 
          String(doctype[key]).toLowerCase().includes(filters[key].toLowerCase())
        );
      }
    });
    
    setFilteredDoctypes(result);
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
      errors.name = 'Le nom est requis';
      errorMessages.push('Le nom est requis');
    }

    setFieldErrors(errors);
    setGlobalErrors(errorMessages);
    return errorMessages.length === 0;
  };

  const handleEdit = (doctype) => {
    setEditingDoctype(doctype);
    setFormData({
      name: doctype.name || '',
      is_active: doctype.is_active || true
    });
    setShowModifyTab(true);
    setActiveTab('form');
    setFieldErrors({});
    setGlobalErrors([]);
  };

  const handleDelete = async (doctypeId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce type de document ?')) {
      try {
        await API.doctype.delete(doctypeId);
        setSuccess('Type de document supprimé avec succès');
        fetchDoctypes();
      } catch (err) {
        setError('Erreur lors de la suppression du type de document');
        console.error('Error deleting document type:', err);
      }
    }window.dispatchEvent(new CustomEvent('DoctypeDeleted'));
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
    if (!editingDoctype) return;
    
    try {
      await API.doctype.update(editingDoctype.id, formData);
      setSuccess('Type de document mis à jour avec succès');
      setEditingDoctype(null);
      setShowModifyTab(false);
      setActiveTab('list');
      fetchDoctypes();
    } catch (err) {
      const apiError = err.response?.data;
      const errorMessage = apiError?.msg || apiError?.error || apiError?.message || 'Error updating document type';
      
      if (errorMessage.toLowerCase().includes('name')) {
        setFieldErrors({ name: 'Le nom du type de document existe déjà' });
        setGlobalErrors(['Le nom du type de document existe déjà']);
      } else {
        setError('Erreur lors de la mise à jour du type de document');
        console.error('Error updating document type:', err);
      }
    }
  };

  const dismissNotification = () => {
    setShowNotification(false);
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
              setEditingDoctype(null);
            }}
          >
            Liste des types de documents
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Modifier le type de document
            </button>
          )}
          
          <Link to="/AddDoctype" className="btn-primary-2">
            Ajouter un type de document
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {activeTab === 'list' && (
        <div className="users-list">
          {loading && (
            <div className="loading-message">
              Chargement des types de documents...
            </div>
          )}

          {/* Notification using existing alert classes with inline styles for positioning */}
          {showNotification && (
            <div 
              className="alert alert-error" 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#e3f2fd',
                color: '#1565c0',
                border: '1px solid #2196f3',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>ℹ️</span>
                <span>{notificationMessage}</span>
              </div>
              <button 
                onClick={dismissNotification}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1976d2',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(33, 150, 243, 0.1)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            </div>
          )}

          <div className="users-table-container">
            <table className="users-table-fixed">
              <thead>
                <tr>
                  <th></th>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Actions</th>
                </tr>
                <tr className="filter-row">
                  <td></td>
                  <td>
                    <input
                      type="text"
                      value={filters.id}
                      onChange={(e) => handleFilterChange(e, 'id')}
                      placeholder="Filtrer par ID"
                      className="filter-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={filters.name}
                      onChange={(e) => handleFilterChange(e, 'name')}
                      placeholder="Filtrer par nom"
                      className="filter-input"
                    />
                  </td>
                  <td></td>
                </tr>
              </thead>
              <tbody className="table-body-scrollable">
                {!loading && filteredDoctypes.length > 0 && (
                  filteredDoctypes.map(doctype => (
                    <tr key={doctype.id}>
                      <td>
                        <div className={`status-led ${doctype.status ? 'status-led-active' : 'status-led-inactive'}`}></div>
                      </td>
                      <td>{doctype.id}</td>
                      <td>{doctype.name}</td>
                      <td>
                        <div className="action-buttons">
                         
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(doctype)}
                          >
                            Modifier
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(doctype.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'form' && (
        <div className="user-form">
          <h2>Modifier le type de document</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Nom du type de document</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nom du type de document"
                className={fieldErrors.name ? 'error-input' : ''}
              />
              {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                />{' '}
                Actif
              </label>
            </div>
            <div className="form-actions">
              
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setActiveTab('list');
                  setShowModifyTab(false);
                  setEditingDoctype(null);
                }}
              >
                Annuler
              </button>
              <button type="submit" className="btn-primary">
                Mettre à jour
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDoctypes;

