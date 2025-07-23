import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css'; 
import { Link} from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

const AddDocType = () => {
  
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
  const navigate = useNavigate();
  /* ---------- field change ---------- */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'companies') {
      const id = Number(value);         
      setFormData((prev) => ({
        ...prev,
        companies: checked
          ? [...prev.companies, id]      
          : prev.companies.filter((v) => v !== id), 
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
        setError('Erreur lors du chargement des entités');
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
    if (!formData.name.trim()) errors.name = 'Le nom est requis.';

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

      setSuccess('Type de document créé avec succès!');
      // reset
      setFormData({ name: '', status: true, companies: [] });
      setFieldErrors({});
    window.dispatchEvent(new CustomEvent('doctypeAdded', {
      detail: {
        affectedCompanyIds: formData.companies // Send the array of company IDs
      }
      
    }));
    setTimeout(() => {
        navigate('/doctypes');
      }, 1500);
      
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
      {/* Return arrow */}
      <div className="return-arrow-container">
        <Link to="/doctypes" className="return-arrow" title="Retour aux types de documents">
          <span className="return-arrow-icon">←</span>
          <span className="return-arrow-text">Retour aux types de documents</span>
        </Link>
      </div>

      {fieldErrors.global && <div className="alert alert-error">{fieldErrors.global}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="user-form">
        <form onSubmit={handleSubmit}>
          {/* name */}
          <div className="form-group">
            <label htmlFor="name">Nom du type de document</label>
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
            <label>Entités</label>
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
              Actif
            </label>
          </div>

          {/* submit */}
          <div className="form-actions">
            <Link to="/doctypes" className="btn-cancel">
                Annuler
            </Link>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'En cours...' : 'Créer le type de document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDocType;
