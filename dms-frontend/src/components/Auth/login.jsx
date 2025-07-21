// src/components/Auth/Login.jsx
import React, { useState } from 'react';
import './login.css';
import API from '../../api';

const Login = ({ onLogin, error }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

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

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    if (!forgotEmail.trim()) {
      setForgotError("L'e-mail est requis");
      return;
    }
    try {
      await API.users.forgotPassword(forgotEmail);
      setForgotSuccess('Veuillez vérifier votre email pour un mot de passe temporaire.');
    } catch (err) {
      setForgotError("Erreur lors de la demande de réinitialisation. Veuillez réessayer.");
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
        <p className="login-subtitle">Service fourni par RAN ESMERALD</p>

        {showForgot ? (
          <form onSubmit={handleForgotSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                name="forgotEmail"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                className="form-input"
                placeholder="Entrez votre e-mail"
              />
            </div>
            {forgotError && <div className="login-error">{forgotError}</div>}
            {forgotSuccess && <div className="login-error" style={{ color: '#059669', background: '#f0fdf4' }}>{forgotSuccess}</div>}
            <button type="submit" className="login-button">Envoyer</button>
            <button type="button" className="login-button" style={{ background: '#d1d5db', color: '#166534', marginTop: 8 }} onClick={() => setShowForgot(false)}>Retour</button>
          </form>
        ) : (
        <>
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

          <div style={{ textAlign: 'right', marginBottom: 8 }}>
            <button type="button" style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: 13, textDecoration: 'underline', padding: 0 }} onClick={() => setShowForgot(true)}>
              Mot de passe oublié ?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Connexion en cours...' : 'Connecter'}
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
        </>
        )}
      </div>
    </div>
  );
};

export default Login;