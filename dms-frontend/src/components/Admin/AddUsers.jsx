// src/components/AddUser.jsx
import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
const AddUser = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    username: '',
    surname: '',
    email: '',
    password: '',
    passwordConfirm: '',
    role: 'user',
    is_active: true,
    companies: []
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [globalFormError, setGlobalFormError] = useState('');
  const [globalErrors, setGlobalErrors] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await API.companies.getAll();
        const data = response.data;
        if (Array.isArray(data)) setCompanies(data);
        else if (data.companies) setCompanies(data.companies);
      } catch (err) {
        setError('Error loading companies');
        console.error(err);
      }
    };
    fetchCompanies();
  }, []);

  const validate = () => {
  const errors = {};
  const errorMessages = [];

  if (!formData.username.trim()) {
    errors.username = 'Le nom d\'utilisateur est requis';
    errorMessages.push('Le nom d\'utilisateur est requis');
  }
  if (!formData.surname.trim()) {
    errors.surname = 'Le prénom est requis';
    errorMessages.push('Le prénom est requis');
  }
  if (!formData.email.trim()) {
    errors.email = 'L\'email est requis';
    errorMessages.push('L\'email est requis');
  } else if (!/^([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/.test(formData.email) || (formData.email.match(/@/g) || []).length !== 1) {
    errors.email = 'Format d\'email invalide.';
    errorMessages.push('Format d\'email invalide.');
  }
  if (!formData.password) {
    errors.password = 'Le mot de passe est requis';
    errorMessages.push('Le mot de passe est requis');
  }
  if (!formData.passwordConfirm) {
    errors.passwordConfirm = 'Veuillez confirmer le mot de passe';
    errorMessages.push('Veuillez confirmer le mot de passe');
  } else if (formData.password !== formData.passwordConfirm) {
    errors.passwordConfirm = 'Les mots de passe ne correspondent pas';
    errorMessages.push('Les mots de passe ne correspondent pas');
  }

  setFieldErrors(errors);
  setGlobalErrors(errorMessages);
  return errorMessages.length === 0;
};

  // Add per-tab validation functions
  const isProfileTabValid = () => {
    return (
      formData.username.trim() &&
      formData.surname.trim() &&
      formData.email.trim() &&
      formData.email.includes('@')
    );
  };

  const isSecurityTabValid = () => {
    return (
      formData.password &&
      formData.passwordConfirm &&
      formData.password === formData.passwordConfirm
    );
  };

  // Add tab navigation with validation
  const handleNextFromProfile = () => {
    const errors = {};
    if (!formData.username.trim()) errors.username = "Le nom d'utilisateur est requis";
    if (!formData.surname.trim()) errors.surname = 'Le prénom est requis';
    if (!formData.email.trim()) errors.email = "L'email est requis";
    else if (!/^([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/.test(formData.email) || (formData.email.match(/@/g) || []).length !== 1) errors.email = "Format d'email invalide.";
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) setActiveTab('security');
  };

  const handleNextFromSecurity = () => {
    const errors = {};
    if (!formData.password) errors.password = 'Le mot de passe est requis';
    if (!formData.passwordConfirm) errors.passwordConfirm = 'Veuillez confirmer le mot de passe';
    else if (formData.password !== formData.passwordConfirm) errors.passwordConfirm = 'Les mots de passe ne correspondent pas';
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) setActiveTab('access');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'companies') {
      const companyId = parseInt(value, 10);
      setFormData((prev) => {
        const current = Array.isArray(prev.companies) ? prev.companies : [];
        let next;
        if (checked) next = Array.from(new Set([...current, companyId]));
        else next = current.filter((id) => id !== companyId);
        return { ...prev, companies: next };
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  setGlobalFormError('');
  if (!validate()) return;

  setLoading(true);
  try {
    await API.admin.createUser(formData);
    setSuccess('Utilisateur créé avec succès');
    setFormData({
      username: '',
      surname: '',
      email: '',
      password: '',
      passwordConfirm: '',
      role: 'user',
      is_active: true,
      companies: []
    });
    setFieldErrors({});
    setGlobalFormError('');
    setActiveTab('profile');
    setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
    //navigate('/admin/users', { state: { successMessage: 'Utilisateur créé avec succès' } });
  } catch (err) {
  let errorMsg = 'Erreur lors de la création de l\'utilisateur';
  const errors = {};

  // Check if it's an email duplicate error
  if (err.response?.data?.msg?.toLowerCase().includes('email')) {
    errorMsg = 'L\'email existe déjà';
    errors.email = 'L\'email existe déjà';
  }

  setFieldErrors((prev) => ({
    ...prev,
    ...errors
  }));

  setGlobalErrors([errorMsg]);
  console.error(err);
} finally {
    setLoading(false);
  }
 
};

  return (
    <div className="admin-users">
      {/* Return arrow */}
      <div className="return-arrow-container">
        <Link to="/admin/users" className="return-arrow" title="Retour aux utilisateurs">
          <span className="return-arrow-icon">←</span>
          <span className="return-arrow-text">Retour aux utilisateurs</span>
        </Link>
      </div>

      <div className="admin-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          //onClick={() => setActiveTab('profile')}
        >
          Profil
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          //onClick={() => setActiveTab('security')}
        >
          Sécurité
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'access' ? 'active' : ''}`}
          //onClick={() => setActiveTab('access')}
        >
          Entités & Statut
        </button>
      </div>

      
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="user-form">
        {/* Profile Tab */}
        <div className="tab-panel" style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              name="username"
              placeholder="Entrez le nom d'utilisateur"
              value={formData.username}
              onChange={handleInputChange}
            />
            {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
          </div>
          <div className="form-group">
            <label>Prénom</label>
            <input
              type="text"
              name="surname"
              placeholder="Entrez le prénom"
              value={formData.surname}
              onChange={handleInputChange}
            />
            {fieldErrors.surname && <div className="field-error">{fieldErrors.surname}</div>}
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Entrez l'email"
              value={formData.email}
              onChange={handleInputChange}
            />
            {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-green"
              onClick={handleNextFromProfile}
            >
              Suivant
            </button>
          </div>
        </div>

        {/* Security Tab */}
        <div className="tab-panel" style={{ display: activeTab === 'security' ? 'block' : 'none' }}>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              name="password"
              placeholder="Entrez le mot de passe"
              value={formData.password}
              onChange={handleInputChange}
            />
            {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
          </div>
          <div className="form-group">
            <label>Confirmer le mot de passe</label>
            <input
              type="password"
              name="passwordConfirm"
              placeholder="Confirmer le mot de passe"
              value={formData.passwordConfirm}
              onChange={handleInputChange}
            />
            {fieldErrors.passwordConfirm && <div className="field-error">{fieldErrors.passwordConfirm}</div>}
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-green"
              onClick={() => setActiveTab('profile')}
            >
              Précédent
            </button>
            <button
              type="button"
              className="btn-green"
              onClick={handleNextFromSecurity}
            >
              Suivant
            </button>
          </div>
        </div>

        {/* Access & Companies Tab */}
        <div className="tab-panel" style={{ display: activeTab === 'access' ? 'block' : 'none' }}>
          <div className="form-group">
            <label>Entités</label>
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

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
              />{' '}
              Utilisateur actif
            </label>
          </div>
          {globalErrors.length > 0 && (
          <div className="form-error-message">
            
            <div>
              {globalErrors.map((err, index) => (
                <div key={index}>{err}</div>
              ))}
            </div>
          </div>
        )}

          <div className="form-actions">
          <button
              type="button"
              className="btn-green"
              onClick={() => setActiveTab('security')}
            >
              Précédent
            </button>
            <Link to="/admin/users" className="btn-cancel">
              Annuler
            </Link>
            <button type="submit" disabled={loading} className="btn-green">
              {loading ? 'Création...' : 'Créer un utilisateur'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddUser;
