import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../context';
import './NavBar.css';
import { 
  BiFolder, 
  BiSearch, 
  BiBarChart, 
  BiGroup, 
  BiCog, 
  BiUser, 
  BiLogOut,
  BiChevronDown,
  BiBuildings,
  BiCollection,
  BiFile
} from 'react-icons/bi';

const NavBar = ({ user, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const location = useLocation();
  const profileRef = useRef(null);
  const adminToolsRef = useRef(null);
  
  // Admin tools links
  const adminToolsLinks = [
    { icon: <BiGroup size={16} />, label: 'Users', link: '/admin/users' },
    { icon: <BiBuildings size={16} />, label: 'Entities', link: '/companies' },
    { icon: <BiCollection size={16} />, label: 'Data types', link: '/doctypes' },
    { icon: <BiFolder size={16} />, label: 'Partner types', link: '/partnertypes' },
    { icon: <BiBarChart size={16} />, label: 'Partner', link: '/partners' },
    { icon: <BiFile size={16} />, label: 'Log files', link: '/admin/activity_logs' },
  ];

  // Get resetSelection function from context
  const { resetSelection } = useContext(AppContext);
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (adminToolsRef.current && !adminToolsRef.current.contains(event.target)) {
        setShowAdminTools(false);
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
        <div className="navbar-brand" onClick={resetSelection}>
          <Link to="/" className="logo-link">
            <div className="logo">
              <span className="logo-icon"><BiFolder size={32} /></span>
              <div className="logo-text">
                <span className="logo-main">DocuManager</span>
                <span className="logo-sub">AI-powered document processing</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-bar">
            <span className="search-icon"><BiSearch size={18} /></span>
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="search-input"
            />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="navbar-links">
          {/* Dashboard link */}
          <Link 
            to="/" 
            className={`nav-link ${isActive('/')}`}
            onClick={resetSelection}
          >
            <span className="nav-icon"><BiBarChart size={20} /></span>
            <span>Dashboard</span>
          </Link>
          
          {/* Admin Tools Dropdown */}
          {user && user.role === 'admin' && (
            <div className="admin-tools-container" ref={adminToolsRef}>
              <button 
                className={`nav-link ${isActive('/admin/tools')}`}
                onClick={() => setShowAdminTools(!showAdminTools)}
              >
                <span className="nav-icon"><BiGroup size={20} /></span>
                <span>Admin Tools</span>
                <span className={`dropdown-icon ${showAdminTools ? 'open' : ''}`}>
                  <BiChevronDown size={14} />
                </span>
              </button>
              
              {showAdminTools && (
                <div className="admin-tools-dropdown">
                  {adminToolsLinks.map((item, index) => (
                    <Link 
                      key={index} 
                      to={item.link} 
                      className="dropdown-item"
                      onClick={() => setShowAdminTools(false)}
                    >
                      <span className="dropdown-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Settings link */}
          <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>
            <span className="nav-icon"><BiCog size={20} /></span>
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
                  <span className={`dropdown-icon ${showProfileMenu ? 'open' : ''}`}>
                    <BiChevronDown size={14} />
                  </span>
                </div>
              </button>
              
              {showProfileMenu && (
                <div className="profile-menu">
                  <Link 
                    to="/profile" 
                    className="profile-menu-item"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <span className="menu-icon"><BiUser size={18} /></span>
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={onLogout}
                    className="profile-menu-item logout-item"
                  >
                    <span className="menu-icon"><BiLogOut size={18} /></span>
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