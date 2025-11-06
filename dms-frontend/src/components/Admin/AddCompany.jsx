import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css'; // or AdminCompanies.css
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const AdminCompanies = ({ user }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    is_active: true, // Added is_active
    description: '', // Added description
  });

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  // auto-hide toast after 5s
  useEffect(() => {
    if (!toast.visible) return;
    const id = setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
    return () => clearTimeout(id);
  }, [toast.visible]);
  const navigate = useNavigate();
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when typing
    setFieldErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setSuccess('');
  setLoading(true);

  const errors = {};
  if (!formData.name.trim()) errors.name = 'Le nom est requis.';
  if (!formData.address.trim()) errors.address = 'L\'adresse est requise.';
  if (!formData.email.trim()) {
    errors.email = 'L\'email est requis.';
  } else if (!/^([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/.test(formData.email) || (formData.email.match(/@/g) || []).length !== 1) {
    errors.email = 'Format d\'email invalide.';
  }
  if (!formData.phone.trim()) {
    errors.phone = 'Le téléphone est requis.';
  } else if (!/^\d{8}$/.test(formData.phone)) {
    errors.phone = 'Le numéro de téléphone doit contenir exactement 8 chiffres';
  }

  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors);
    setLoading(false);
    return;
  }

  try {
    const dataToSend = {
      ...formData,
      user_id: user.id,
    };
    await API.companies.create(dataToSend);

  const successMsg = 'Entité créée avec succès !';
  setSuccess(successMsg);
  setToast({ visible: true, message: successMsg, type: 'success' });
    setFormData({
      name: '',
      address: '',
      email: '',
      phone: '',
      is_active: true, // Reset is_active
      description: '', // Reset description
    });
    setFieldErrors({});
    
    window.dispatchEvent(new Event('companyAdded'));
    setTimeout(() => {
        navigate('/companies');
      }, 1500);
    
  } catch (err) {
    const errorMsg =
      err.response?.data?.msg ||
      "Error occurred while creating the entity.";

    // If duplicate error, set field-level messages; otherwise set global error
    if (errorMsg.toLowerCase().includes("name") || errorMsg.toLowerCase().includes("email")) {
      const duplicateErrors = {};
      if (errorMsg.toLowerCase().includes("name")) {
        duplicateErrors.name = "Ce nom d'entité existe déjà.";
      }
      if (errorMsg.toLowerCase().includes("email")) {
        duplicateErrors.email = "Cet email est déjà utilisé.";
      }
      setFieldErrors(duplicateErrors);
      // also show a concise toast
      setToast({ visible: true, message: 'Erreur: données en doublon', type: 'error' });
    } else {
      setFieldErrors({ global: errorMsg });
      setToast({ visible: true, message: errorMsg, type: 'error' });
    }
    } finally {
    setLoading(false);
  }
};

  return (
    <div className="admin-users">
      <div className={`top-toast ${toast.type === 'error' ? 'top-toast-error' : 'top-toast-success'} ${toast.visible ? 'show' : ''}`} role="status" aria-live="polite">
        <div className="top-toast-inner">
          <div className="top-toast-icon">{toast.type === 'error' ? '✖️' : '✓'}</div>
          <div className="top-toast-message">{toast.message}</div>
          <button className="top-toast-close" onClick={() => setToast(t => ({ ...t, visible: false }))} aria-label="Fermer la notification">✕</button>
        </div>
      </div>
      {/* Return arrow */}
      <div className="return-arrow-container">
        <Link to="/companies" className="return-arrow" title="Retour aux entités">
          <span className="return-arrow-text">Retour aux entités</span>
        </Link>
      </div>

      {fieldErrors.global && (
        <div className="alert alert-error">{fieldErrors.global}</div>
      )}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="user-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Nom de l'entité</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Entrez le nom de l'entité"
              className={fieldErrors.name ? 'input-error' : ''}
            />
            {fieldErrors.name && (
              <p className="error-text">{fieldErrors.name}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="address">Adresse</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Entrez l'adresse"
              className={fieldErrors.address ? 'input-error' : ''}
            />
            {fieldErrors.address && (
              <p className="error-text">{fieldErrors.address}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Entrez l'adresse e-mail"
              className={fieldErrors.email ? 'input-error' : ''}
            />
            {fieldErrors.email && (
              <p className="error-text">{fieldErrors.email}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Téléphone</label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Entrez le numéro de téléphone"
              className={fieldErrors.phone ? 'input-error' : ''}
            />
            {fieldErrors.phone && (
              <p className="error-text">{fieldErrors.phone}</p>
            )}
          </div>

          <div className="form-group checkbox-group">
            <label htmlFor="is_active">Active</label>
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="checkbox-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Entrez la description de l'entité"
              className={fieldErrors.description ? 'input-error' : ''}
            />
            {fieldErrors.description && (
              <p className="error-text">{fieldErrors.description}</p>
            )}
          </div>

          <div className="form-actions">
            <Link to="/companies" className="btn-cancel">
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn"
            >
              {loading ? 'Chargement...' : 'Créer l\'entité'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCompanies;
