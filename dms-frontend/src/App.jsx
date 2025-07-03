// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Layout from './components/layout/layout';
import Login from './components/Auth/login';
import Dashboard from './components/DocumentArchive';
import AdminUsers from './components/Admin/AdminUsers';
import AdminTools from './components/Admin/Admin_Tools';
import UserTools from './components/Admin/User_Tools';
import Profile from './components/Auth/Profile';
import Settings from './components/Auth/Settings';
import AddComp from './components/Admin/AddCompany';
import './App.css';

// API configuration remains the same as in your original file
const API_BASE = 'http://localhost:5000';

const api = {
  login: async (credentials) => {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  },
  
  createCompany: async (token, companyData) => {
    const response = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(companyData)
    });
    return response.json();
  },

  getUsers: async (token) => {
    const response = await fetch(`${API_BASE}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },
  
  createUser: async (token, userData) => {
    const response = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(userData)
    });
    return response.json();
  },
  
  updateUser: async (token, userId, userData) => {
    const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(userData)
    });
    return response.json();
  },
  
  deleteUser: async (token, userId) => {
    const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const userInfo = {
          id: decoded.id,
          username: decoded.sub,
          role: decoded.role
        };
        setUser(userInfo);
      } catch (e) {
        localStorage.removeItem('token');
        setAuthError('Session expirée. Veuillez vous reconnecter.');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = async (loginData) => {
    try {
      const response = await api.login(loginData);
      if (response.access_token) {
        const token = response.access_token;
        localStorage.setItem('token', token);
        
        const decoded = jwtDecode(token);
        const userInfo = {
          id: decoded.id,
          username: decoded.sub,
          role: decoded.role
        };
        setUser(userInfo);
        setAuthError('');
      } else {
        setAuthError(response.msg || 'Erreur de connexion');
      }
    } catch (err) {
      setAuthError('Erreur de connexion. Vérifiez vos identifiants.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setAuthError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} error={authError} />;
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          {user.role === 'admin' && (
            <Route path="/admin/users" element={<AdminUsers />} />
          )}

          <Route path="*" element={<Navigate to="/" replace />} />
          <Route 
        path="/admin/tools" element={<AdminTools /> }/>
        <Route 
        path="/User/tools" element={<UserTools/>} />  
        <Route 
        path="/profile" element={<Profile user={user}/>} /> 
        <Route 
        path="/settings" element={<Settings user={user}/>} /> 
        <Route 
        path="/AddComp" element={<AddComp user={user}/>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;