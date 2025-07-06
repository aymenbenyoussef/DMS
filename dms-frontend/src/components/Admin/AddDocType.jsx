import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css'; // Keep same styling

const AddDocType = () => {
  // ⭐ NEW: include companies array
  const [formData, setFormData] = useState({
    name: '',
    status: true,
    companies: [],          // ⭐ NEW
  });

  const [loading, setLoading]   = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess]   = useState('');
  const [companies, setCompanies] = useState([]);
  const [error, setError]       = useState('');

  /* ---------- field change ---------- */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // ⭐ NEW: special handling for the companies checkboxes
    if (name === 'companies') {
      const id = Number(value);          // store as number
      setFormData((prev) => ({
        ...prev,
        companies: checked
          ? [...prev.companies, id]      // add when checked
          : prev.companies.filter((v) => v !== id), // remove when unchecked
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }

    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  /* ---------- load companies once ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await API.companies.getAll();
        const data = Array.isArray(res.data) ? res.data : res.data.companies;
        setCompanies(data ?? []);
      } catch (err) {
        setError('Error loading companies');
        console.error(err);
      }
    })();
  }, []);

  /* ---------- submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setLoading(true);

    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required.';

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const dataToSend = {
        name: formData.name.trim(),
        status: formData.status,
        companies: formData.companies,          
      };

      await API.doctype.create(dataToSend);     

      setSuccess('Document type created successfully!');
      // reset
      setFormData({ name: '', status: true, companies: [] });
      setFieldErrors({});
    window.dispatchEvent(new CustomEvent('doctypeAdded', {
  detail: {
    affectedCompanyIds: formData.companies // Send the array of company IDs
  }
}));
    } catch (err) {
      const msg = err.response?.data?.msg ||
                  'Error occurred while creating the document type.';
      if (msg.toLowerCase().includes('name')) {
        setFieldErrors({ name: 'This name already exists.' });
      } else {
        setFieldErrors({ global: msg });
      }
      console.error('Error creating document type:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="admin-users">
      <h1>Add New Document Type</h1>

      {fieldErrors.global && <div className="alert alert-error">{fieldErrors.global}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="user-form">
        <form onSubmit={handleSubmit}>
          {/* name */}
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
            {fieldErrors.name && <p className="error-text">{fieldErrors.name}</p>}
          </div>

          {/* companies list */}
          <div className="form-group">
            <label>Companies</label>
            <div className="checkbox-list">
              {companies.map((c) => (
                <label key={c.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    name="companies"
                    value={c.id}
                    checked={formData.companies.includes(c.id)}   // ⭐ WORKS now
                    onChange={handleInputChange}
                  />
                  <span className="company-name">{c.name}</span>
                </label>
              ))}
            </div>
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
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'En cours...' : 'Create Document Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDocType;
