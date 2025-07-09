import React, { useState } from 'react';
import API from '../../api';
import './AdminUsers.css'; 
import { Link, useNavigate } from 'react-router-dom';

const AddPartner = () => {
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
    if (!formData.name.trim()) errors.name = 'Partner name is required.';

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const dataToSend = {
        name: formData.name.trim(),
        status: formData.status,
      };

      await API.partners.create(dataToSend);

      setSuccess('Partner created successfully!');
      setFormData({ name: '', status: true });
      setFieldErrors({});
      
      // Navigate after a short delay to show success message
      //setTimeout(() => navigate('/partners'), 1000);
    } catch (err) {
      const errorData = err.response?.data;
    let errorMsg = '';
    
    if (errorData) {
      // If error has a msg property
      if (errorData.msg) {
        errorMsg = errorData.msg;
      } 
      // If error is a string
      else if (typeof errorData === 'string') {
        errorMsg = errorData;
      }
    }
    
    // Default message if no specific message found
    errorMsg = errorMsg || 'Error occurred while creating the partner.';
    
    // Special handling for duplicate name errors
    if (errorMsg.toLowerCase().includes('name already exists')) {
      setFieldErrors({ name: errorMsg });
    } else {
      setError(errorMsg);
    }
      console.error('Error creating partner:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-users">
      <h1>Add New Partner</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="user-form">
        <form onSubmit={handleSubmit}>
          {/* name */}
          <div className="form-group">
            <label htmlFor="name">Partner Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter partner name"
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
            <Link to="/partners" className="btn btn-primary">
              Cancel
            </Link>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Partner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPartner;