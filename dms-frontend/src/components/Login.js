import React, { useState } from 'react';
import API from '../api';
import { jwtDecode } from 'jwt-decode';
import '../Login.css'; 

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await API.users.login(formData);
      const token = res.data.access_token;
      localStorage.setItem('token', token);
      const user = jwtDecode(token);
      onLogin(user.sub); // JWT payload is in 'sub' field
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>DocuManager</h1>
          <p>AI-powered document access</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <input
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <span className="icon">🔐</span> Login
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          © {new Date().getFullYear()} DocuManager - All rights reserved
        </div>
      </div>
    </div>
  );
};

export default Login;