import React, { useState } from 'react';
import API from '../../api';
import './AdminUsers.css'; // or AdminCompanies.css
import { useNavigate } from 'react-router-dom';

const AdminCompanies = ({ user }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
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
  if (!formData.name.trim()) errors.name = 'Name is required.';
  if (!formData.address.trim()) errors.address = 'Address is required.';
  if (!formData.email.trim()) errors.email = 'Email is required.';
  if (!formData.phone.trim()) errors.phone = 'Phone is required.';

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

    setSuccess('Company created successfully!');
    setFormData({
      name: '',
      address: '',
      email: '',
      phone: '',
    });
    setFieldErrors({});
    window.dispatchEvent(new Event('companyAdded'));
  } catch (err) {
    const errorMsg =
      err.response?.data?.msg ||
      "Error occurred while creating the company.";

    // If duplicate error, set field-level messages
    if (errorMsg.toLowerCase().includes("name") || errorMsg.toLowerCase().includes("email")) {
      const duplicateErrors = {};
      if (errorMsg.toLowerCase().includes("name")) {
        duplicateErrors.name = "This company name already exists.";
      }
      if (errorMsg.toLowerCase().includes("email")) {
        duplicateErrors.email = "This email is already in use.";
      }
      setFieldErrors(duplicateErrors);
    } else {
      setFieldErrors({ global: errorMsg });
    }

    console.error('Error creating company:', err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="admin-users">
      <h1>Add new company</h1>

      {fieldErrors.global && (
        <div className="alert alert-error">{fieldErrors.global}</div>
      )}
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
              placeholder="Entrez le nom"
              className={fieldErrors.name ? 'input-error' : ''}
            />
            {fieldErrors.name && (
              <p className="error-text">{fieldErrors.name}</p>
            )}
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
              className={fieldErrors.address ? 'input-error' : ''}
            />
            {fieldErrors.address && (
              <p className="error-text">{fieldErrors.address}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Entrez l'adresse email"
              className={fieldErrors.email ? 'input-error' : ''}
            />
            {fieldErrors.email && (
              <p className="error-text">{fieldErrors.email}</p>
            )}
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
              className={fieldErrors.phone ? 'input-error' : ''}
            />
            {fieldErrors.phone && (
              <p className="error-text">{fieldErrors.phone}</p>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'En cours...' : 'Create company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCompanies;
