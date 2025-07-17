import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../context';
import './NavBar.css';
import { BsFileEarmarkText } from 'react-icons/bs';
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
  BiFile,
  BiServer,
  BiData
} from 'react-icons/bi';

const NavBar = ({ user, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const location = useLocation();
  const profileRef = useRef(null);
  const adminToolsRef = useRef(null);
  
  // Admin tools links grouped by category
  const adminToolsCategories = {
    systemConfig: {
      title: 'Système de configuration',
      icon: <BiServer size={16} />,
      items: [
        { icon: <BiGroup size={16} />, label: 'Utilisateurs', link: '/admin/users' },
        { icon: <BiBuildings size={16} />, label: 'Entités', link: '/companies' },
        { icon: <BiCollection size={16} />, label: 'Types de données', link: '/doctypes' },
        { icon: <BiFolder size={16} />, label: 'Types de partenaires', link: '/partnertypes' },
        { icon: <BiBarChart size={16} />, label: 'Partenaires', link: '/partners' },
        { icon: <BiFile size={16} />, label: 'Logs', link: '/admin/activity_logs' },
        { icon: <BiCog size={16} />, label: 'Paramètres', link: '/settings' }
      ]
    },
    businessData: {
      title: 'Données commerciales',
      icon: <BiData size={16} />,
      items: [] // Empty for now as requested
    }
  };

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
              <span className="logo-icon"><BsFileEarmarkText size={32} /></span>
              <div className="logo-text">
                <span className="logo-main">DocuManager</span>
                <span className="logo-sub">Traitement de documents alimenté par l'IA</span>
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
              placeholder="Recherche..." 
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
            <span>Tableau de bord</span>
          </Link>
          
          {/* Admin Tools Dropdown */}
          {user && user.role === 'admin' && (
            <div className="admin-tools-container" ref={adminToolsRef}>
              <button 
                className={`nav-link ${isActive('/admin/tools')}`}
                onClick={() => setShowAdminTools(!showAdminTools)}
              >
                <span className="nav-icon"><BiGroup size={20} /></span>
                <span>Outils</span>
                <span className={`dropdown-icon ${showAdminTools ? 'open' : ''}`}>
                  <BiChevronDown size={14} />
                </span>
              </button>
              
              {showAdminTools && (
                <div className="admin-tools-dropdown">
                  <div className="dropdown-columns">
                    {/* System Configuration Column */}
                    <div className="dropdown-column">
                      <div className="category-header">
                        <span className="category-icon">{adminToolsCategories.systemConfig.icon}</span>
                        <span className="category-title">{adminToolsCategories.systemConfig.title}</span>
                      </div>
                      <div className="category-items">
                        {adminToolsCategories.systemConfig.items.map((item, index) => (
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
                    </div>
                    
                    {/* Business Data Column */}
                    <div className="dropdown-column">
                      <div className="category-header">
                        <span className="category-icon">{adminToolsCategories.businessData.icon}</span>
                        <span className="category-title">{adminToolsCategories.businessData.title}</span>
                      </div>
                      {adminToolsCategories.businessData.items.length > 0 ? (
                        <div className="category-items">
                          {adminToolsCategories.businessData.items.map((item, index) => (
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
                      ) : (
                        <div className="empty-category">Aucun élément disponible</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="dropdown-footer">
                    <button
                      onClick={() => {
                        setShowAdminTools(false);
                        onLogout();
                      }}
                      className="logout-button"
                    >
                      <BiLogOut size={16} />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Settings link - Only show if not admin */}
          {(!user || user.role !== 'admin') && (
            <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>
              <span className="nav-icon"><BiCog size={20} /></span>
              <span>Paramètres</span>
            </Link>
          )}
          
          {/* User Profile Dropdown - Only show if not admin */}
          {user && user.role !== 'admin' && (
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
                    <span>Profil</span>
                  </Link>
                  <button
                    onClick={onLogout}
                    className="profile-menu-item logout-item"
                  >
                    <span className="menu-icon"><BiLogOut size={18} /></span>
                    <span>Déconnexion</span>
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