import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { Link, useNavigate } from 'react-router-dom';

// Helper to convert snake_case to camelCase
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

const AddPartner = ({ user }) => {
  const [activeTab, setActiveTab] = useState('Identity');
  const [formData, setFormData] = useState({
    companyName: '',
    tradeName: '',
    uniqueIdentifier: '',
    mailingAddress: '',
    billingAddress: '',
    phone1: '',
    phone2: '',
    phone3: '',
    email: '',
    paymentTerms: '',
    billingTerms: '',
    bankAccountNumber: '',
    bankName: '',
    notes: '',
    isActive: true,
    companies: [],
    partnertypes: []
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [globalErrors, setGlobalErrors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [partnertypes, setPartnertypes] = useState([]);
  const [fieldValidation, setFieldValidation] = useState({});
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const validateFieldAsync = async (fieldName, fieldValue) => {
    if (!fieldValue || fieldValue.trim() === '') {
      setFieldValidation(prev => ({ ...prev, [fieldName]: null }));
      return;
    }

    // Only validate unique fields
    const uniqueFields = ['companyName', 'uniqueIdentifier', 'email', 'phone1', 'mailingAddress', 'bankAccountNumber'];
    if (!uniqueFields.includes(fieldName)) return;

    try {
      // Map frontend field names to backend field names
      const fieldMapping = {
        companyName: 'company_name',
        uniqueIdentifier: 'unique_identifier',
        mailingAddress: 'mailing_address',
        bankAccountNumber: 'bank_account_number'
      };
      
      const backendFieldName = fieldMapping[fieldName] || fieldName;
      const response = await API.partner.checkField(backendFieldName, fieldValue.trim());
      
      if (response.data.exists) {
        setFieldValidation(prev => ({ 
          ...prev, 
          [fieldName]: { 
            isValid: false, 
            message: `Ce ${fieldName === 'companyName' ? 'nom d\'entreprise' : 
                              fieldName === 'uniqueIdentifier' ? 'identifiant unique' :
                              fieldName === 'email' ? 'e-mail' :
                              fieldName === 'phone1' ? 'numéro de téléphone' :
                              fieldName === 'mailingAddress' ? 'adresse postale' :
                              fieldName === 'bankAccountNumber' ? 'numéro de compte bancaire' : 'champ'} existe déjà` 
          }
        }));
        setFieldErrors(prev => ({ 
          ...prev, 
          [fieldName]: `Ce ${fieldName === 'companyName' ? 'nom d\'entreprise' : 
                              fieldName === 'uniqueIdentifier' ? 'identifiant unique' :
                              fieldName === 'email' ? 'e-mail' :
                              fieldName === 'phone1' ? 'numéro de téléphone' :
                              fieldName === 'mailingAddress' ? 'adresse postale' :
                              fieldName === 'bankAccountNumber' ? 'numéro de compte bancaire' : 'champ'} existe déjà` 
        }));
      } else {
        setFieldValidation(prev => ({ 
          ...prev, 
          [fieldName]: { isValid: true, message: 'Disponible' }
        }));
        setFieldErrors(prev => ({ ...prev, [fieldName]: '' }));
      }
    } catch (err) {
      console.error('Error validating field:', err);
      setFieldValidation(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const validate = (tab = activeTab) => {
    const errors = {};
    const errorMessages = [];

    // Identity tab validation
    if (tab === 'Identity') {
      if (!formData.companyName.trim()) {
        errors.companyName = 'Le nom d entite est requis';
        errorMessages.push('Le nom d entite est requis');
      }
      if (!formData.uniqueIdentifier.trim()) {
        errors.uniqueIdentifier = 'Un identifiant unique est requis';
        errorMessages.push('Un identifiant unique est requis');
      }
      if (formData.companies.length === 0) {
        errors.companies = 'Au moins une entite doit être sélectionnée';
        errorMessages.push('Au moins une entite doit être sélectionnée');
      }
      if (formData.partnertypes.length === 0) {
        errors.partnertypes = 'Un type de partenaire doit être sélectionné';
        errorMessages.push('Un type de partenaire doit être sélectionné');
      }
    }

    // Contact tab validation
    if (tab === 'Contact') {
      if (!formData.mailingAddress.trim()) {
        errors.mailingAddress = 'L adresse postale est requise';
        errorMessages.push('L adresse postale est requise');
      }
      if (!formData.phone1.trim()) {
        errors.phone1 = 'Le téléphone principal est requis';
        errorMessages.push('Le téléphone principal est requis');
      } else if (!/^\d{8}$/.test(formData.phone1)) {
        errors.phone1 = 'Le numéro de téléphone principal doit contenir exactement 8 chiffres';
        errorMessages.push('Le numéro de téléphone principal doit contenir exactement 8 chiffres');
      }
      if (formData.phone2 && !/^\d{8}$/.test(formData.phone2)) {
        errors.phone2 = 'Le numéro de téléphone secondaire doit contenir exactement 8 chiffres';
        errorMessages.push('Le numéro de téléphone secondaire doit contenir exactement 8 chiffres');
      }
      if (formData.phone3 && !/^\d{8}$/.test(formData.phone3)) {
        errors.phone3 = 'Le numéro de téléphone additionnel doit contenir exactement 8 chiffres';
        errorMessages.push('Le numéro de téléphone additionnel doit contenir exactement 8 chiffres');
      }
      if (!formData.email.trim()) {
        errors.email = 'L e-mail est requis';
        errorMessages.push('L e-mail est requis');
      } else if (!/^([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/.test(formData.email) || (formData.email.match(/@/g) || []).length !== 1) {
        errors.email = 'Format d\'email invalide.';
        errorMessages.push('Format d\'email invalide.');
      }
    }

    // Billing and payments tab validation
    

    return { errors, errorMessages };
  };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await API.companies.getAll();
        const data = response.data;
        if (Array.isArray(data)) setCompanies(data);
        else if (data.companies) setCompanies(data.companies);
      } catch (err) {
        setError('Erreur lors du chargement des entreprises');
        console.error(err);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    const fetchPartnertypes = async () => {
      try {
        const response = await API.partnertype.getAll();
        const data = response.data;
        if (Array.isArray(data)) setPartnertypes(data);
        else if (data.partnertypes) setPartnertypes(data.partnertypes);
      } catch (err) {
        setError('Erreur lors du chargement des types de partenaires');
        console.error(err);
      }
    };
    fetchPartnertypes();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    if (name === 'companies' || name === 'partnertypes') {
      const id = parseInt(value, 10);
      setFormData((prev) => {
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
      setFormData((prev) => ({
        ...prev,
        [name]: newValue
      }));
      
      // Validate unique fields in real-time with debouncing
      const uniqueFields = ['companyName', 'uniqueIdentifier', 'email', 'phone1', 'mailingAddress', 'bankAccountNumber'];
      if (uniqueFields.includes(name) && type !== 'checkbox') {
        // Clear previous validation state
        setFieldValidation(prev => ({ ...prev, [name]: null }));
        
        // Debounce validation
        setTimeout(() => {
          validateFieldAsync(name, value);
        }, 500);
      }
    }
    
    // Only clear the error for this field if the value actually changes
    setFieldErrors((prev) => {
      if (prev[name]) {
        return { ...prev, [name]: '' };
      }
      return prev;
    });
    setHasSubmitted(false);
  };

  const handleTabChange = (tab) => {
    const { errors, errorMessages } = validate(activeTab);
    
    if (errorMessages.length === 0) {
      setActiveTab(tab);
      setGlobalErrors([]);
    } else {
      setFieldErrors(errors);
      setGlobalErrors(errorMessages);
    }
    setHasSubmitted(false);
  };

  // In AddPartner.jsx, update the handleSubmit function
const handleSubmit = async (e) => {
  e.preventDefault();
  setHasSubmitted(true);
  setGlobalErrors([]);
  
  // Validate all tabs before submitting
  const { errors: identityErrors, errorMessages: identityMessages } = validate('Identity');
  const { errors: contactErrors, errorMessages: contactMessages } = validate('Contact');
  const { errors: billingErrors, errorMessages: billingMessages } = validate('Billing and payments');
  
  const allErrors = { ...identityErrors, ...contactErrors, ...billingErrors };
  const allMessages = [...identityMessages, ...contactMessages, ...billingMessages];
  
  if (allMessages.length > 0) {
    setFieldErrors(allErrors);
    setGlobalErrors(allMessages);
    return;
  }

  setLoading(true);
  try {
    const partnerData = {
      company_name: formData.companyName,
      trade_name: formData.tradeName || null,
      unique_identifier: formData.uniqueIdentifier,
      mailing_address: formData.mailingAddress,
      billing_address: formData.billingAddress || null,
      phone1: formData.phone1,
      phone2: formData.phone2 || null,
      phone3: formData.phone3 || null,
      email: formData.email,
      payment_terms: formData.paymentTerms || null,
      billing_terms: formData.billingTerms || null,
      bank_account_number: formData.bankAccountNumber || null,
      bank_name: formData.bankName || null,
      notes: formData.notes || null,
      is_active: formData.isActive,
      companies: formData.companies,
      partnertypes: formData.partnertypes
    };

    const response = await API.partner.create(partnerData);
    setSuccess('Partenaire créé avec succès');
    
    setTimeout(() => {
      navigate('/partners');
    }, 1500);
  } catch (err) {
    let errorMsg = 'Erreur lors de la création du partenaire';
    let errors = {};
    if (err.response) {
      const msg = err.response.data.message || err.response.data.msg || '';
      if (msg.toLowerCase().includes('nom d\'entreprise')) {
        errorMsg = 'Le nom d\'entreprise existe déjà';
        errors.companyName = 'Le nom d\'entreprise existe déjà';
      } else if (msg.toLowerCase().includes('identifiant unique')) {
        errorMsg = 'L\'identifiant unique existe déjà';
        errors.uniqueIdentifier = 'L\'identifiant unique existe déjà';
      } else if (msg.toLowerCase().includes('email')) {
        errorMsg = 'L\'email existe déjà';
        errors.email = 'L\'email existe déjà';
      } else if (msg.toLowerCase().includes('numéro de téléphone principal')) {
        errorMsg = 'Le numéro de téléphone principal existe déjà';
        errors.phone1 = 'Le numéro de téléphone principal existe déjà';
      } else if (msg.toLowerCase().includes('adresse postale')) {
        errorMsg = 'L\'adresse postale existe déjà';
        errors.mailingAddress = 'L\'adresse postale existe déjà';
      } else if (msg.toLowerCase().includes('numéro de compte bancaire')) {
        errorMsg = 'Le numéro de compte bancaire existe déjà';
        errors.bankAccountNumber = 'Le numéro de compte bancaire existe déjà';
      }
      // Add more fields as needed
    }
    setFieldErrors((prev) => ({ ...prev, ...errors }));
    setGlobalErrors([errorMsg]);
    console.error('Partner creation error:', err);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="admin-users">
      {/* Return arrow */}
      <div className="return-arrow-container">
        <Link to="/partners" className="return-arrow" title="Retour aux partenaires">
          <span className="return-arrow-text">Retour aux partenaires</span>
        </Link>
      </div>

      <div className="admin-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'Identity' ? 'active' : ''}`}
          onClick={() => handleTabChange('Identity')}
        >
          Identité
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'Contact' ? 'active' : ''}`}
          onClick={() => handleTabChange('Contact')}
        >
          Contact
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'Billing and payments' ? 'active' : ''}`}
          onClick={() => handleTabChange('Billing and payments')}
        >
          Facturation et paiement
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'Notes' ? 'active' : ''}`}
          onClick={() => handleTabChange('Notes')}
        >
          Notes
        </button>
      </div>

      {/* Error and success messages */}
      {success && <div className="alert alert-success">{success}</div>}
      

      <form onSubmit={handleSubmit} className="user-form">
        {/* Identity Tab */}
        <div className="tab-panel" style={{ display: activeTab === 'Identity' ? 'block' : 'none' }}>
          <div className="form-group">
            <label>Nom de l'entité *</label>
            <input
              type="text"
              name="companyName"
              placeholder="Entrez le nom de l'entité"
              value={formData.companyName}
              onChange={handleInputChange}
              className={fieldErrors.companyName ? 'input-error' : ''}
            />
            {fieldErrors.companyName && <div className="field-error">{fieldErrors.companyName}</div>}
            {fieldValidation.companyName && (
              <div className={`field-validation ${fieldValidation.companyName.isValid ? 'valid' : 'invalid'}`}>
                {fieldValidation.companyName.message}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Nom commercial (si différent)</label>
            <input
              type="text"
              name="tradeName"
              placeholder="Entrez le nom commercial"
              value={formData.tradeName}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Identifiant unique *</label>
            <input
              type="text"
              name="uniqueIdentifier"
              placeholder="Entrez l'identifiant unique"
              value={formData.uniqueIdentifier}
              onChange={handleInputChange}
              className={fieldErrors.uniqueIdentifier ? 'input-error' : ''}
            />
            {fieldErrors.uniqueIdentifier && <div className="field-error">{fieldErrors.uniqueIdentifier}</div>}
            {fieldValidation.uniqueIdentifier && (
              <div className={`field-validation ${fieldValidation.uniqueIdentifier.isValid ? 'valid' : 'invalid'}`}>
                {fieldValidation.uniqueIdentifier.message}
              </div>
            )}
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
            <div className="radio-list">
              {partnertypes.map((c) => (
                <label key={c.id} className="radio-item">
                  <input
                    type="radio"
                    name="partnertypes"
                    value={c.id}
                    checked={formData.partnertypes.length === 1 && formData.partnertypes[0] === c.id}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        partnertypes: [parseInt(e.target.value, 10)]
                      }));
                      setFieldErrors((prev) => {
                        if (prev.partnertypes) {
                          return { ...prev, partnertypes: '' };
                        }
                        return prev;
                      });
                      setHasSubmitted(false);
                    }}
                  />
                  <span className="partnertype-name">{c.name}</span>
                </label>
              ))}
            </div>
          </div>  
          <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'flex-start' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
              />{' '}
              Actif
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-green"
              onClick={() => handleTabChange('Contact')}
            >
              Suivant
            </button>
          </div>
        </div>

        {/* Contact Tab */}
        <div className="tab-panel" style={{ display: activeTab === 'Contact' ? 'block' : 'none' }}>
          <div className="form-group">
            <label>Adresse postale *</label>
            <input
              type="text"
              name="mailingAddress"
              placeholder="Entrez l'adresse postale"
              value={formData.mailingAddress}
              onChange={handleInputChange}
              className={fieldErrors.mailingAddress ? 'input-error' : ''}
            />
            {fieldErrors.mailingAddress && <div className="field-error">{fieldErrors.mailingAddress}</div>}
            {fieldValidation.mailingAddress && (
              <div className={`field-validation ${fieldValidation.mailingAddress.isValid ? 'valid' : 'invalid'}`}>
                {fieldValidation.mailingAddress.message}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Adresse de facturation</label>
            <input
              type="text"
              name="billingAddress"
              placeholder="Entrez l'adresse de facturation"
              value={formData.billingAddress}
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
            {fieldValidation.phone1 && (
              <div className={`field-validation ${fieldValidation.phone1.isValid ? 'valid' : 'invalid'}`}>
                {fieldValidation.phone1.message}
              </div>
            )}
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
            {fieldErrors.phone2 && <div className="field-error">{fieldErrors.phone2}</div>}
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
            {fieldErrors.phone3 && <div className="field-error">{fieldErrors.phone3}</div>}
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              placeholder="Entrez l'email"
              value={formData.email}
              onChange={handleInputChange}
              className={fieldErrors.email ? 'input-error' : ''}
            />
            {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
            {fieldValidation.email && (
              <div className={`field-validation ${fieldValidation.email.isValid ? 'valid' : 'invalid'}`}>
                {fieldValidation.email.message}
              </div>
            )}
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-green"
              onClick={() => handleTabChange('Identity')}
            >
              Précédent
            </button>
            <button
              type="button"
              className="btn-green"
              onClick={() => handleTabChange('Billing and payments')}
            >
              Suivant
            </button>
          </div>
        </div>

        {/* Billing and payments Tab */}
        <div className="tab-panel" style={{ display: activeTab === 'Billing and payments' ? 'block' : 'none' }}>
          <div className="form-group">
            <label>Conditions de paiement</label>
            <input
              type="text"
              name="paymentTerms"
              placeholder="Entrez les conditions de paiement"
              value={formData.paymentTerms}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Conditions de facturation</label>
            <input
              type="text"
              name="billingTerms"
              placeholder="Entrez les conditions de facturation"
              value={formData.billingTerms}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Numéro de compte bancaire *</label>
            <input
              type="text"
              name="bankAccountNumber"
              placeholder="Entrez le numéro de compte bancaire *"
              value={formData.bankAccountNumber}
              onChange={handleInputChange}
              className={fieldErrors.bankAccountNumber ? 'input-error' : ''}
            />
            {fieldErrors.bankAccountNumber && <div className="field-error">{fieldErrors.bankAccountNumber}</div>}
            {fieldValidation.bankAccountNumber && (
              <div className={`field-validation ${fieldValidation.bankAccountNumber.isValid ? 'valid' : 'invalid'}`}>
                {fieldValidation.bankAccountNumber.message}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Nom de la banque</label>
            <input
              type="text"
              name="bankName"
              placeholder="Entrez le nom de la banque"
              value={formData.bankName}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-green"
              onClick={() => handleTabChange('Contact')}
            >
              Précédent
            </button>
            <button
              type="button"
              className="btn-green"
              onClick={() => handleTabChange('Notes')}
            >
              Suivant
            </button>
          </div>
        </div>

        {/* Notes Tab */}
        <div className="tab-panel" style={{ display: activeTab === 'Notes' ? 'block' : 'none' }}>
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

          {/* Show global existence errors above the Create button */}
          {hasSubmitted && Object.keys(fieldErrors).length > 0 && !success && (
            <div className="alert alert-error" style={{marginBottom: '16px'}}>
              <ul style={{margin: 0, paddingLeft: '20px'}}>
                {Object.entries(fieldErrors).map(([key, msg]) =>
                  msg ? <li key={key}>{msg}</li> : null
                )}
              </ul>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn-green"
              onClick={() => handleTabChange('Billing and payments')}
            >
              Précédent
            </button>
            <Link to="/partners" className="btn-cancel">
              Annuler
            </Link>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'En cours...' : 'Créer le partenaire'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddPartner;