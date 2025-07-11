import React, { useState } from 'react';
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

    setSuccess('Entity created successfully!');
    setFormData({
      name: '',
      address: '',
      email: '',
      phone: '',
    });
    setFieldErrors({});
    window.dispatchEvent(new Event('companyAdded'));
    navigate('/companies');
  } catch (err) {
    const errorMsg =
      err.response?.data?.msg ||
      "Error occurred while creating the entity.";

    // If duplicate error, set field-level messages
    if (errorMsg.toLowerCase().includes("name") || errorMsg.toLowerCase().includes("email")) {
        const duplicateErrors = {};
      if (errorMsg.toLowerCase().includes("name")) {
        duplicateErrors.name = "This entity name already exists.";
      }
      if (errorMsg.toLowerCase().includes("email")) {
        duplicateErrors.email = "This email is already in use.";
      }
      setFieldErrors(duplicateErrors);
    } else {
      setFieldErrors({ global: errorMsg });
    }

    
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="admin-users">
      

      {fieldErrors.global && (
        <div className="alert alert-error">{fieldErrors.global}</div>
      )}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="user-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name of the entity</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter the name"
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
              placeholder="Enter the address"
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
              placeholder="Enter the email address"
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
              placeholder="Enter the phone number"
              className={fieldErrors.phone ? 'input-error' : ''}
            />
            {fieldErrors.phone && (
              <p className="error-text">{fieldErrors.phone}</p>
            )}
          </div>

          <div className="form-actions">
            <Link to="/companies" className="btn-primary">
            Cancel
          </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'loading...' : 'Create entity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCompanies;
