// src/components/Auth/Login.jsx
import React, { useState } from 'react';
import './login.css';

const Login = ({ onLogin, error }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Reset field errors
    setFieldErrors({ username: '', password: '' });

    // Client-side validation
    const errors = {};
    if (!formData.username.trim()) {
      errors.username = "The username field is required";
    }
    if (!formData.password) {
      errors.password = 'The password field is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await onLogin(formData);
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear field error on change
    setFieldErrors({ ...fieldErrors, [name]: '' });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Connexion DMS</h2>
        <p className="login-subtitle">Access your personal space</p>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">User name</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your username"
            />
            {fieldErrors.username && (
              <div className="field-error">{fieldErrors.username}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your password"
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
            {loading ? 'Connection in progress...' : 'Log in'}
          </button>
        </form>

        <div className="test-accounts">
          <p>Test :</p>
          <div className="test-account-item">
            <span className="test-account-label">Administrateur:</span> admin / admin123
          </div>
          <div className="test-account-item">
            <span className="test-account-label">User:</span> user / user123
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
