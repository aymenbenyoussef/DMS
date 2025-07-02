// src/components/Layout/NavBar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './NavBar.css';

const NavBar = ({ user, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const location = useLocation();
  const profileRef = useRef(null);
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-brand">
          <div className="logo">
            <span className="logo-icon">📂</span>
            <div className="logo-text">
              <span className="logo-main">DocuManager</span>
              <span className="logo-sub">AI-powered document processing</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="search-input"
            />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="navbar-links">
          <Link to="/" className={`nav-link ${isActive('/')}`}>
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </Link>
          
          {user && user.role === 'admin' && (
            <Link to="/admin/tools" className={`nav-link ${isActive('/admin/users')}`}>
              <span className="nav-icon">👥</span>
              <span>Admin Tools</span>
            </Link>
          )}
          {user && user.role === 'user' && (
            <Link to="/User/tools" className={`nav-link ${isActive('/User/users')}`}>
              <span className="nav-icon">👥</span>
              <span>User Tools</span>
            </Link>
          )}
          <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </Link>
          
          {/* User Profile Dropdown */}
          {user && (
            <div className="profile-container" ref={profileRef}>
              <button 
                className="profile-button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="user-info">
                  <div className="user-avatar">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-details">
                    <span className="username">{user.username}</span>
                    <span className="user-role">{user.role}</span>
                  </div>
                  <span className={`dropdown-icon ${showProfileMenu ? 'open' : ''}`}>▼</span>
                </div>
              </button>
              
              {showProfileMenu && (
                <div className="profile-menu">
                  <Link 
                    to="/profile" 
                    className="profile-menu-item"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <span className="menu-icon">👤</span>
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={onLogout}
                    className="profile-menu-item logout-item"
                  >
                    <span className="menu-icon">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;