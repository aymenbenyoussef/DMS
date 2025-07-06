import React, { useState } from 'react';
import API from '../../api';
import './AdminUsers.css'; // Keep same styling

const AddDocType = ({ user }) => {
  const [formData, setFormData] = useState({
    name: '',
    status: true,
  });

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const dataToSend = {
        name: formData.name.trim(),
        status: formData.status,
      };

      await API.doctype.create(dataToSend);

      setSuccess('Document type created successfully!');
      setFormData({
        name: '',
        status: true,
      });
      setFieldErrors({});
      window.dispatchEvent(new Event('docTypeAdded'));
    } catch (err) {
      const errorMsg =
        err.response?.data?.msg ||
        "Error occurred while creating the document type.";

      // Check if duplicate error
      if (errorMsg.toLowerCase().includes("name")) {
        setFieldErrors({ name: "This name already exists." });
      } else {
        setFieldErrors({ global: errorMsg });
      }

      console.error('Error creating document type:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-users">
      <h1>Add New Document Type</h1>

      {fieldErrors.global && (
        <div className="alert alert-error">{fieldErrors.global}</div>
      )}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="user-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name of the document type</label>
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

          <div className="form-actions">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'En cours...' : 'Create Document Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDocType;
