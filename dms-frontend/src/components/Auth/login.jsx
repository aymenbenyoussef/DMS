// src/components/Auth/Login.jsx
import React, { useState } from 'react';
import './login.css';

const Login = ({ onLogin, error }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(formData);
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
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
            <label className="form-label">Nom d'utilisateur</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="form-input"
              placeholder="Entrez votre nom d'utilisateur"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="form-input"
              placeholder="Entrez votre mot de passe"
              required
            />
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
            <span className="test-account-label">Administrateur:</span> admin / admin123
          </div>
          <div className="test-account-item">
            <span className="test-account-label">Utilisateur:</span> user / user123
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;