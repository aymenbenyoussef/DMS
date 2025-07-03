import React, { useState } from 'react';
import API from '../../api';
import './AdminUsers.css'; // Tu peux la renommer en AdminCompanies.css si besoin

const AdminCompanies = ({user}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  setLoading(true);

  try {
    // Validation minimale
    if (!formData.name || !formData.name.trim()) {
      setError('Le nom de l\'entreprise est obligatoire');
      setLoading(false);
      return;
    }

    if (formData.email && !formData.email.includes('@')) {
      setError('Adresse email invalide');
      setLoading(false);
      return;
    }
     const dataToSend = {
      ...formData,
      user_id: user.id
    };
    await API.companies.create(dataToSend);
    setSuccess('Entreprise créée avec succès');

    // Réinitialiser le formulaire
    setFormData({
      name: '',
      address: '',
      email: '',
      phone: '',
      
    });
  } catch (err) {
    const errorMsg = err.response?.data?.msg || "Erreur lors de la création de l'entreprise";
    setError(errorMsg);
    console.error('Error creating company:', err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="admin-users">
      <h1>Add new company</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="user-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name of the company</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Entrez le nom"
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Entrez l'adresse"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Address email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Entrez l'adresse email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone number</label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Entrez le numéro de téléphone"
            />
          </div>

          

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'En cours...' : 'Create company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCompanies;
