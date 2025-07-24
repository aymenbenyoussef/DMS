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
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    setLoginError(error || '');
  }, [error]);

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
      if (err.response && err.response.status === 404) {
        setForgotError("Aucun utilisateur trouvé avec cet e-mail.");
      } else {
        setForgotError("Erreur lors de la demande de réinitialisation. Veuillez réessayer.");
      }
    }
  };

  // Make error disappear after 5 seconds
  React.useEffect(() => {
    if (forgotError) {
      const timer = setTimeout(() => setForgotError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [forgotError]);

  const handleForgotRetour = () => {
    setShowForgot(false);
    setForgotError('');
    setForgotSuccess('');
    setForgotEmail('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFieldErrors({ ...fieldErrors, [name]: '' });
  };

  // Fonctions pour le press and hold
  const handlePasswordShowStart = () => {
    setShowPassword(true);
  };

  const handlePasswordShowEnd = () => {
    setShowPassword(false);
  };

  // Gestionnaires d'événements pour souris et tactile
  const handleMouseDown = (e) => {
    e.preventDefault();
    handlePasswordShowStart();
  };

  const handleMouseUp = () => {
    handlePasswordShowEnd();
  };

  const handleMouseLeave = () => {
    handlePasswordShowEnd();
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    handlePasswordShowStart();
  };

  const handleTouchEnd = () => {
    handlePasswordShowEnd();
  };

  // Add effect to auto-return after success
  React.useEffect(() => {
    if (forgotSuccess) {
      const timer = setTimeout(() => {
        setShowForgot(false);
        setForgotSuccess('');
        setForgotEmail('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [forgotSuccess]);

  return (
    <div className="login-container">
      <div className="login-card">
        {showForgot ? (
          <form onSubmit={handleForgotSubmit} className="forgot-form">
            <h2 className="login-title">Mot de passe oublié</h2>
            <p className="login-subtitle">Entrez votre e-mail pour réinitialiser votre mot de passe</p>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                className="form-input"
                placeholder="Entrez votre e-mail"
              />
              {forgotError && <div className="field-error">{forgotError}</div>}
              {forgotSuccess && <div className="field-success" style={{ color: 'green', fontWeight: 500 }}>{forgotSuccess}</div>}
            </div>
            <div className="forgot-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="login-button">Envoyer</button>
              <button type="button" className="login-button" style={{ background: 'gray', color: 'white', border: '1px solid #d1d5db' }} onClick={handleForgotRetour}>Retour</button>
            </div>
          </form>
        ) : (
          <>
            <h2 className="login-title">Connexion</h2>
            <p className="login-subtitle">Veuillez entrer vos identifiants pour accéder au DMS</p>
            {loginError && (
              <div className="login-error">
                {loginError === 'Le système est inactif' ? (
                  <span style={{ fontWeight: 'bold', color: '#b91c1c' }}>{loginError}</span>
                ) : (
                  loginError
                )}
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
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input password-input"
                    placeholder="Entrez votre mot de passe"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    aria-label="Maintenir pour afficher le mot de passe"
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <div className="field-error">{fieldErrors.password}</div>
                )}
                <div className="forgot-password-container">
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => {
                      setShowForgot(true);
                      setForgotError('');
                      setForgotSuccess('');
                      setFieldErrors({ email: '', password: '' });
                      setLoginError('');
                    }}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
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

