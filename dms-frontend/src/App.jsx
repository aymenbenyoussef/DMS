// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Layout from './components/layout/layout';
import Login from './components/Auth/login';
import Dashboard from './components/Dashboard/Dashboard';
import TempDocumentArchive from './components/Dashboard/TempDocumentArchive';
import AdminUsers from './components/Admin/AdminUsers';
import AdminCompanies from './components/Admin/AdminCompanies';
import AdminTools from './components/Admin/Admin_Tools';
import UserTools from './components/Admin/User_Tools';
import Profile from './components/Auth/Profile';
import Settings from './components/Auth/Settings';
import AddComp from './components/Admin/AddCompany';
import AddUsers from  './components/Admin/AddUsers';
import ActivityLogs from './components/Admin/ActivityLogs'; 
import AddDoctype from './components/Admin/AddDocType';
import AdminDoctypes from './components/Admin/AdminDoctypes';
import AdminPartnertypes from './components/Admin/AdminPartnertypes';
import AdminPartners from './components/Admin/AdminPartners';
import AddPartnerType from './components/Admin/AddPartnerType';
import AddPartner from './components/Admin/AddPartner';
import { AppProvider } from './components/context';  
import './App.css';
import SettingsUsers from './components/Auth/SettingsUsers';

// API configuration remains the same as in your original file
const API_BASE = 'http://192.168.1.115:5000';

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
  },
  
  // Add this new method for activity logs
  getActivityLogs: async (token) => {
    const response = await fetch(`${API_BASE}/admin/activity_logs`, {
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
          username: decoded.username,
          email: decoded.sub,
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
          username: decoded.username,
          email: decoded.sub,
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
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const userInfo = {
          id: decoded.id,
          username: decoded.username,
          email: decoded.sub,
          role: decoded.role
        };
        setUser(userInfo);
      } catch (e) {
        localStorage.removeItem('token');
        setAuthError('Session expirée. Veuillez vous reconnecter.');
      }
    }
    setLoadingUser(false);
  }, []);
  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} error={authError} />;
  }

  return (
    <AppProvider>  {/* Using the correct AppProvider from context */}
      <Router>
        <Layout user={user} loadingUser={loading} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
  
            {(user.role === 'admin' || user.role === 'superuser') && (
              <>
                <Route path="/admin/users" element={<AdminUsers user={user} loadingUser={loading} />} />
                {/* Updated to ActivityLogs component */}
                <Route path="/admin/activity_logs" element={<ActivityLogs user={user} loadingUser={loading} />} />
                <Route path="/companies" element={<AdminCompanies user={user} loadingUser={loading} />} />
                <Route path="/doctypes" element={<AdminDoctypes user={user} loadingUser={loading} />} />
                <Route path="/partnertypes" element={<AdminPartnertypes user={user} loadingUser={loading} />} />
                <Route path="/partners" element={<AdminPartners user={user} loadingUser={loading} />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route 
              path="/admin/tools" element={<AdminTools user={user} loadingUser={loading} />} />
            <Route 
              path="/User/tools" element={<UserTools user={user} loadingUser={loading} />} />  
            <Route 
              path="/profile" element={<Profile user={user}/>} /> 
            <Route 
              path="/settings" element={<Settings user={user}/>} /> 
            <Route 
              path="/settings-users" element={<SettingsUsers />} />
            <Route 
              path="/AddComp" element={<AddComp user={user}/>} />
              <Route 
              path="/AddDoctype" element={<AddDoctype user={user}/>} />
            <Route 
              path="/AddUsers" element={<AddUsers />} />
              <Route 
              path="/AddPartnerType" element={<AddPartnerType user={user}/>} />
              <Route 
              path="/AddPartner" element={<AddPartner user={user}/>} />
              <Route 
              path="/temp-documents" element={<TempDocumentArchive user={user}/>} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;

