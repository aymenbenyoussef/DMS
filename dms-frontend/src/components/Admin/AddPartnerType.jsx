import React, { useState } from 'react';
import API from '../../api';
import './AdminUsers.css'; 
import { Link, useNavigate } from 'react-router-dom';

const AddPartnerType = () => {
  const [formData, setFormData] = useState({
    name: '',
    status: true,
  });

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setLoading(true);

    const errors = {};
    if (!formData.name.trim()) errors.name = 'Le nom du type de partenaire est requis.';

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }
    const dataToSend = {
        name: formData.name.trim(),
        status: !!formData.status
      };
    try {
      await API.partnertype.create(dataToSend);

      setSuccess('Type de partenaire créé avec succès!');
      setFormData({ name: '', status: true });
      setFieldErrors({});
      setError('');
      
      // Navigate after a short delay to show success message
      setTimeout(() => {
        navigate('/partnerTypes');
      }, 1500);
    } catch (err) {
      
      console.log('Sending data:', dataToSend);
      console.error('API error:', err.response?.data || err.message);
      
      const msg = err.response?.data?.msg || 'Erreur lors de la création du type de partenaire.';
      
      // Check for specific name conflict error
      if ((msg.toLowerCase().includes('name already exists') || msg.toLowerCase().includes('name')) && msg.toLowerCase().includes('exists')) {
        setFieldErrors({ name: 'Un type de partenaire avec ce nom existe déjà.' });
        setError('');
      } else {
        setError(msg);
        setFieldErrors({});
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-users">
      {/* Return arrow */}
      <div className="return-arrow-container">
        <Link to="/partnerTypes" className="return-arrow" title="Retour aux types de partenaires">
          <span className="return-arrow-icon">←</span>
          <span className="return-arrow-text">Retour aux types de partenaires</span>
        </Link>
      </div>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="user-form">
        <form onSubmit={handleSubmit}>
          {/* name */}
          <div className="form-group">
            <label htmlFor="name">Nom du type de partenaire</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Saisissez le nom du type de partenaire"
              className={fieldErrors.name ? 'input-error' : ''}
            />
            {fieldErrors.name && <p className="error-text">{fieldErrors.name}</p>}
          </div>

          {/* status */}
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

          {/* submit */}
          <div className="form-actions">
            <Link to="/partners" className="btn btn-cancel">
              Annuler
            </Link>
            <button 
              type="submit" 
              className="btn btn" 
              disabled={loading}>
              {loading ? 'Création...' : 'Créer un type de partenaire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPartnerType;