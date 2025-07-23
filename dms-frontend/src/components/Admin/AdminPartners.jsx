import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import axios from 'axios';

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
    unique_identifier: '',
    company_name: '',
    email: '',
    phone: '',
    company: '',
    partnertype: ''
  });
  const [companies, setCompanies] = useState([]);
  const [partnertypes, setPartnertypes] = useState([]);
  const navigate = useNavigate();
  const [maxExternalEntities, setMaxExternalEntities] = useState(null);
  const [globalLimitError, setGlobalLimitError] = useState('');

  const [formData, setFormData] = useState({
    company_name: '',
    trade_name: '',
    unique_identifier: '',
    mailing_address: '',
    billing_address: '',
    phone1: '',
    phone2: '',
    phone3: '',
    email: '',
    payment_terms: '',
    billing_terms: '',
    bank_account_number: '',
    bank_name: '',
    notes: '',
    is_active: true,
    companies: [],
    partnertypes: []
  });

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (globalLimitError) {
      const timer = setTimeout(() => setGlobalLimitError(''), 10000);
      return () => clearTimeout(timer);
    }
  }, [globalLimitError]);

  // Fetch data on component mount
  useEffect(() => {
    fetchPartners();
    fetchCompanies();
    fetchPartnerTypes();
    axios.get('http://localhost:5000/api/settings').then(res => {
      setMaxExternalEntities(res.data.maxExternalEntities);
    });
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, partners]);

  // New useEffect to handle notification display
  useEffect(() => {
    if (!loading && filteredPartners.length === 0) {
      const message = partners.length === 0 ? 'Aucun partenaire disponible' : 'Aucun partenaire trouvé correspondant à vos filtres';
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
  }, [loading, filteredPartners, partners]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await API.partner.getAll();
      setPartners(response.data);
      setFilteredPartners(response.data);
    } catch (err) {
      setError('Error loading partners');
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
      console.error('Error loading companies:', err);
    }
  };

  const fetchPartnerTypes = async () => {
    try {
      const response = await API.partnertype.getAll();
      setPartnertypes(response.data);
    } catch (err) {
      console.error('Error loading partner types:', err);
    }
  };

  const applyFilters = () => {
    let result = [...partners];
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        if (key === 'phone') {
          const filterValue = filters[key].toLowerCase();
          result = result.filter(partner => 
            (partner.phone1 && partner.phone1.toLowerCase().includes(filterValue)) ||
            (partner.phone2 && partner.phone2.toLowerCase().includes(filterValue)) ||
            (partner.phone3 && partner.phone3.toLowerCase().includes(filterValue))
          );
        } else if (key === 'company') {
                const filterValue = filters[key].toLowerCase();
                result = result.filter(partner => 
                  partner.companies?.some(c => c.name.toLowerCase().includes(filterValue))
                );
              } else if (key === 'partnertype') {
          const filterValue = filters[key].toLowerCase();
          result = result.filter(partner => 
            partner.partnertypes?.some(pt => pt.name.toLowerCase().includes(filterValue))
          );
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

    if (!formData.company_name.trim()) {
      errors.company_name = 'Company name is required';
      errorMessages.push('Company name is required');
    }
    if (!formData.unique_identifier.trim()) {
      errors.unique_identifier = 'Unique identifier is required';
      errorMessages.push('Unique identifier is required');
    }
    if (!formData.mailing_address.trim()) {
      errors.mailing_address = 'Mailing address is required';
      errorMessages.push('Mailing address is required');
    }
    if (!formData.phone1.trim()) {
      errors.phone1 = 'Primary phone is required';
      errorMessages.push('Primary phone is required');
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      errorMessages.push('Email is required');
    }
    if (formData.companies.length === 0) {
      errors.companies = 'At least one company must be selected';
      errorMessages.push('At least one company must be selected');
    }
    if (formData.partnertypes.length === 0) {
      errors.partnertypes = 'At least one partner type must be selected';
      errorMessages.push('At least one partner type must be selected');
    }

    setFieldErrors(errors);
    setGlobalErrors(errorMessages);
    return errorMessages.length === 0;
  };

  const handleEdit = async (partner) => {
    setGlobalLimitError('');
    try {
      const fullPartner = await API.partner.getById(partner.id);
      setEditingPartner(fullPartner.data);
      
      setFormData({
        company_name: fullPartner.data.company_name || '',
        trade_name: fullPartner.data.trade_name || '',
        unique_identifier: fullPartner.data.unique_identifier || '',
        mailing_address: fullPartner.data.mailing_address || '',
        billing_address: fullPartner.data.billing_address || '',
        phone1: fullPartner.data.phone1 || '',
        phone2: fullPartner.data.phone2 || '',
        phone3: fullPartner.data.phone3 || '',
        email: fullPartner.data.email || '',
        payment_terms: fullPartner.data.payment_terms || '',
        billing_terms: fullPartner.data.billing_terms || '',
        bank_account_number: fullPartner.data.bank_account_number || '',
        bank_name: fullPartner.data.bank_name || '',
        notes: fullPartner.data.notes || '',
        is_active: fullPartner.data.is_active || true,
        companies: fullPartner.data.companies?.map(c => c.id) || [],
        partnertypes: fullPartner.data.partnertypes?.map(pt => pt.id) || []
      });
      
      setShowModifyTab(true);
      setActiveTab('form');
      setFieldErrors({});
      setGlobalErrors([]);
    } catch (err) {
      setError('Error loading partner details');
      console.error('Error loading partner details:', err);
    }
  };

 const handleDelete = async (partnerId) => {
    if (window.confirm('Are you sure you want to delete this partner?')) {
      try {
        setLoading(true);
        await API.partner.delete(partnerId);
        setSuccess('Partner deleted successfully');
        setError('');
        fetchPartners(); // Refresh the list after deletion
      } catch (err) {
        const errorMessage = err.response?.data?.msg || 
                            err.message || 
                            'Error deleting partner';
        setError(errorMessage);
        console.error('Error deleting partner:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'companies' || name === 'partnertypes') {
      const id = parseInt(value, 10);
      setFormData(prev => {
        const current = Array.isArray(prev[name]) ? prev[name] : [];
        let updated;
        
        if (checked) {
          updated = [...current, id];
        } else {
          updated = current.filter(item => item !== id);
        }
        
        return { ...prev, [name]: updated };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
    
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
    const partnerData = {
      company_name: formData.company_name,
      trade_name: formData.trade_name,
      unique_identifier: formData.unique_identifier,
      mailing_address: formData.mailing_address,
      billing_address: formData.billing_address,
      phone1: formData.phone1,
      phone2: formData.phone2,
      phone3: formData.phone3,
      email: formData.email,
      payment_terms: formData.payment_terms,
      billing_terms: formData.billing_terms,
      bank_account_number: formData.bank_account_number,
      bank_name: formData.bank_name,
      notes: formData.notes,
      is_active: formData.is_active,
      companies: formData.companies,
      partnertypes: formData.partnertypes
    };
    
    const response = await API.partner.update(editingPartner.id, partnerData);
    
    // Get the updated partner with all associations
    const updatedPartner = await API.partner.getById(editingPartner.id);
    
    setSuccess('Partner updated successfully');
    setEditingPartner(null);
    setShowModifyTab(false);
    setActiveTab('list');
    fetchPartners();
  } catch (err) {
    console.error('Full error object:', err); // Log the full error for debugging
    const apiError = err.response?.data;
    const errorMessage = apiError?.msg || apiError?.error || apiError?.message || 'Error updating partner';
    
    if (errorMessage.toLowerCase().includes('unique')) {
      setFieldErrors({ unique_identifier: 'Unique identifier already exists' });
      setGlobalErrors(['Unique identifier already exists']);
    } else if (errorMessage.toLowerCase().includes('email')) {
      setFieldErrors({ email: 'Email already exists' });
      setGlobalErrors(['Email already exists']);
    } 
    else if (errorMessage.toLowerCase().includes('nom')) {
      setFieldErrors({ company_name: 'Nom de société exist déja' });
      setGlobalErrors(['Nom de société exist déja']);
    }else if (errorMessage.toLowerCase().includes('adresse')) {
      setFieldErrors({ mailing_address: 'adresse postale exist déja' });
      setGlobalErrors(['adresse postale exist déja']);
    }else if (errorMessage.toLowerCase().includes('téléphone')) {
      setFieldErrors({ phone1: 'Numéro de téléphone exist déja' });
      setGlobalErrors(['Numéro de téléphone exist déja']);
    }else {
      setError(errorMessage); // Show the actual error message from the server
      setGlobalErrors([errorMessage]);
      console.error('Error updating partner:', err);
    }
  }
};

  const dismissNotification = () => {
    setShowNotification(false);
  };

  const handleAddPartner = (e) => {
    setGlobalLimitError('');
    if (maxExternalEntities !== null && partners.length >= maxExternalEntities) {
      setGlobalLimitError('Vous avez atteint le nombre maximal d’entités externes. Veuillez contacter le support technique.');
      return;
    }
    navigate('/AddPartner');
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
              setEditingPartner(null);
            }}
          >
            Liste des partenaires
          </button>
          {showModifyTab && (
            <button
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Modifier le partenaire
            </button>
          )}
          <button className="btn-primary-2" onClick={handleAddPartner}>
            Ajouter un partenaire
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {globalLimitError && (
        <div className="alert alert-error" style={{marginBottom: '1rem', fontWeight: 600}}>{globalLimitError}</div>
      )}
      

      {activeTab === 'list' && (
        <div className="users-list">
          {loading && (
            <div className="loading-message">
              Chargement des partenaires...
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
                  
                  <th style={{ width: '150px' }}>Unique Identifier</th>
                  <th style={{ width: '200px' }}>Company Name</th>
                  <th style={{ width: '200px' }}>Entities</th>
                  <th style={{ width: '150px' }}>Partner Types</th>
                  <th style={{ width: '80px' }}>Phone</th>
                  <th style={{ width: '250px' }}>Email</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
                <tr className="filter-row">
                  <td></td>
                  
                  <td style={{ width: '150px' }}>
                    <input
                      type="text"
                      value={filters.unique_identifier}
                      onChange={(e) => handleFilterChange(e, 'unique_identifier')}
                      placeholder="Filtrer l'identifiant"
                      className="filter-input"
                    />
                  </td>
                  <td style={{ width: '200px' }}>
                    <input
                      type="text"
                      value={filters.company_name}
                      onChange={(e) => handleFilterChange(e, 'company_name')}
                      placeholder="Filtrer le nom"
                      className="filter-input"
                    />
                  </td>
                  <td style={{ width: '150px' }}>
                    <input
                      type="text"
                      value={filters.company}
                      onChange={(e) => handleFilterChange(e, 'company')}
                      placeholder="Filtrer les entités"
                      className="filter-input"
                    />
                  </td>
                  <td style={{ width: '150px' }}>
                    <input
                      type="text"
                      value={filters.partnertype}
                      onChange={(e) => handleFilterChange(e, 'partnertype')}
                      placeholder="Filtrer les types"
                      className="filter-input"
                    />
                  </td>
                  <td style={{ width: '80px' }}>
                    <input
                      type="text"
                      value={filters.phone}
                      onChange={(e) => handleFilterChange(e, 'phone')}
                      placeholder="Filtrer le téléphone"
                      className="filter-input"
                    />
                  </td>
                  <td style={{ width: '250px' }}>
                    <input
                      type="text"
                      value={filters.email}
                      onChange={(e) => handleFilterChange(e, 'email')}
                      placeholder="Filtrer l'email"
                      className="filter-input"
                    />
                  </td>
                  <td></td>
                </tr>
              </thead>
              <tbody className="table-body-scrollable">
                {!loading && filteredPartners.length > 0 && (
                  filteredPartners.map(partner => (
                    <tr key={partner.id}>
                      <td>
                        <div className={`status-led ${partner.is_active ? 'status-led-active' : 'status-led-inactive'}`}></div>
                      </td>
                      
                      <td style={{ width: '150px' }}>{partner.unique_identifier}</td>
                      <td style={{ width: '200px' }}>{partner.company_name}</td>
                      <td style={{ width: '200px' }}>
                        <ul className="company-tokens" style={{flexWrap: 'wrap', display: 'flex'}}>


                        {partner.companies?.map(c => (<li key={c.id} className="company-token">{c.name}</li>))}
                        </ul>
                      </td>
                      <td style={{ width: '150px' }}>
                        <ul className="company-tokens">
                        {partner.partnertypes?.map(pt => (<li key={pt.id} className="company-token">{pt.name}</li>))}
                        </ul>
                      </td>
                      <td style={{ width: '80px' }}>{partner.phone1 || 'N/A'}</td>
                      <td style={{ width: '250px' }}>{partner.email}</td>
                      <td style={{ width: '100px' }}>
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
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'form' && editingPartner && (
        <div className="user-form">
            <h2>Modifier le partenaire</h2>
          <form onSubmit={handleUpdate}>
            <div className="tab-panel">
              {/* Identity Tab */}
              <div className="form-section">
                <h3>Identité</h3>
                <div className="form-group">
                  <label>Nom de l'entité *</label>
                  <input
                    type="text"
                    name="company_name"
                    placeholder="Entrez le nom de l'entité"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className={fieldErrors.company_name ? 'input-error' : ''}
                  />
                  {fieldErrors.company_name && <div className="field-error">{fieldErrors.company_name}</div>}
                </div>
                <div className="form-group">
                  <label>Nom commercial (si différent)</label>
                  <input
                    type="text"
                    name="trade_name"
                    placeholder="Entrez le nom commercial"
                    value={formData.trade_name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Identifiant unique *</label>
                  <input
                    type="text"
                    name="unique_identifier"
                    placeholder="Entrez un identifiant unique"
                    value={formData.unique_identifier}
                    onChange={handleInputChange}
                    className={fieldErrors.unique_identifier ? 'input-error' : ''}
                  />
                  {fieldErrors.unique_identifier && <div className="field-error">{fieldErrors.unique_identifier}</div>}
                </div>

                <div className="form-group">
                  <label>Entités *</label>
                  {fieldErrors.companies && <div className="field-error">{fieldErrors.companies}</div>}
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
                        <span className="company-name">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Types de partenaire *</label>
                  {fieldErrors.partnertypes && <div className="field-error">{fieldErrors.partnertypes}</div>}
                  <div className="checkbox-list">
                    {partnertypes.map((pt) => (
                      <label key={pt.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          name="partnertypes"
                          value={pt.id}
                          checked={formData.partnertypes.includes(pt.id)}
                          onChange={handleInputChange}
                        />
                        <span className="partnertype-name">{pt.name}</span>
                      </label>
                    ))}
                  </div>
                </div>  
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />{' '}
                    Active
                  </label>
                </div>
              </div>

              {/* Contact Tab */}
              <div className="form-section">
                <h3>Contact</h3>
                <div className="form-group">
                  <label>Adresse postale *</label>
                  <input
                    type="text"
                    name="mailing_address"
                    placeholder="Entrez l'adresse postale"
                    value={formData.mailing_address}
                    onChange={handleInputChange}
                    className={fieldErrors.mailing_address ? 'input-error' : ''}
                  />
                  {fieldErrors.mailing_address && <div className="field-error">{fieldErrors.mailing_address}</div>}
                </div>
                <div className="form-group">
                  <label>Adresse de facturation</label>
                  <input
                    type="text"
                    name="billing_address"
                    placeholder="Entrez l'adresse de facturation"
                    value={formData.billing_address}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Téléphone 1 (principal) *</label>
                  <input
                    type="text"
                    name="phone1"
                    placeholder="Entrez le téléphone principal"
                    value={formData.phone1}
                    onChange={handleInputChange}
                    className={fieldErrors.phone1 ? 'input-error' : ''}
                  />
                  {fieldErrors.phone1 && <div className="field-error">{fieldErrors.phone1}</div>}
                </div>
                <div className="form-group">
                  <label>Téléphone 2</label>
                  <input
                    type="text"
                    name="phone2"
                    placeholder="Entrez le téléphone secondaire"
                    value={formData.phone2}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Téléphone 3</label>
                  <input
                    type="text"
                    name="phone3"
                    placeholder="Entrez le téléphone additionnel"
                    value={formData.phone3}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Entrez l'email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={fieldErrors.email ? 'input-error' : ''}
                  />
                  {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
                </div>
              </div>

              {/* Billing and payments Tab */}
              <div className="form-section">
                  <h3>Facturation et paiement</h3>
                <div className="form-group">
                  <label>Conditions de paiement</label>
                  <input
                    type="text"
                    name="payment_terms"
                    placeholder="Entrez les conditions de paiement"
                    value={formData.payment_terms}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Conditions de facturation</label>
                  <input
                    type="text"
                    name="billing_terms"
                    placeholder="Entrez les conditions de facturation"
                    value={formData.billing_terms}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Numéro de compte bancaire</label>
                  <input
                    type="text"
                    name="bank_account_number"
                    placeholder="Entrez le numéro de compte bancaire"
                    value={formData.bank_account_number}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Nom de la banque</label>
                  <input
                    type="text"
                    name="bank_name"
                    placeholder="Entrez le nom de la banque"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Notes Tab */}
              <div className="form-section">
                <h3>Notes</h3>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    placeholder="Entrez les notes supplémentaires"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="4"
                  />
                </div>
              </div>
            </div>
            {globalErrors.length > 0 && (
              <div className="alert alert-error">
                {globalErrors.map((err, index) => (
                  <div key={index}>{err}</div>
                ))}
              </div>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setActiveTab('list');
                  setShowModifyTab(false);
                  setEditingPartner(null);
                }}
              >
                Annuler
              </button>
              <button type="submit" className="btn">
                Mettre à jour le partenaire
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPartners;





