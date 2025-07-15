// src/components/Auth/Login.jsx
import React, { useState } from 'react';
import './login.css';

const Login = ({ onLogin, error }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({ email: '', password: '' });

    const errors = {};
    if (!formData.email.trim()) {
      errors.email = "L'e-mail est requis";
    }
    if (!formData.password) {
      errors.password = 'Le mot de passe est requis';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await onLogin(formData);
    } catch (err) {
      console.error('Erreur de connexion:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFieldErrors({ ...fieldErrors, [name]: '' });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Connexion DMS</h2>
        <p className="login-subtitle">Accédez à votre espace personnel</p>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Entrez votre e-mail"
            />
            {fieldErrors.email && (
              <div className="field-error">{fieldErrors.email}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Entrez votre mot de passe"
            />
            {fieldErrors.password && (
              <div className="field-error">{fieldErrors.password}</div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="test-accounts">
          <p>Comptes de test :</p>
          <div className="test-account-item">
            <span className="test-account-label">Administrateur:</span> admin@dms.local / admin123
          </div>
          <div className="test-account-item">
            <span className="test-account-label">Utilisateur:</span> user@dms.local / user123
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;