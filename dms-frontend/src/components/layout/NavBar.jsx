import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../context';
import './NavBar.css';
import { BiServer } from 'react-icons/bi';
import { 
  BiFolder, 
  BiSearch, 
  BiBarChart, 
  BiGroup, 
  BiCog, 
  BiLogOut,
  BiChevronDown,
  BiBuildings,
  BiCollection,
  BiFile,
  BiData,
  BiLock
} from 'react-icons/bi';
import DmsTempUploadModal from '../Dashboard/DmsTempUploadModal';

const NavBar = ({ user, onLogout }) => {
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [showDmsTempModal, setShowDmsTempModal] = useState(false);
  const location = useLocation();
  const adminToolsRef = useRef(null);
  
  // Admin tools links grouped by category
  const adminToolsCategories = {
    systemConfig: {
      title: 'Système de configuration',
      icon: <BiServer size={16} />,
      items: [
        { icon: <BiGroup size={16} />, label: 'Utilisateurs', link: '/admin/users' },
        { icon: <BiCollection size={16} />, label: 'Types de données', link: '/doctypes' },
        { icon: <BiFolder size={16} />, label: 'Types de partenaires', link: '/partnertypes' },
        { icon: <BiFile size={16} />, label: 'Logs', link: '/admin/activity_logs' },
        // Paramètres will be conditionally rendered below
      ]
    },
    businessData: {
      title: 'Données commerciales',
      icon: <BiData size={16} />,
      items: [
        { icon: <BiBuildings size={16} />, label: 'Entités', link: '/companies' },
        { icon: <BiBarChart size={16} />, label: 'Partenaires', link: '/partners' }
      ]
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
    <>
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-brand" onClick={resetSelection}>
          <Link to="/" className="logo-link">
            <div className="logo">
              <span className="logo-icon"><BiData size={32} /></span>
              <div className="logo-text">
                <span className="logo-main">DocuManager</span>
                <span className="logo-sub">Système avancé de gestion des données</span>
              </div>
            </div> 
          </Link>
        </div>

        {/* Search Bar 
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
        */}
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
          {user && (user.role === 'admin' || user.role === 'superuser') && (
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
                    {/* DMS Column */}
                    <div className="dropdown-column">
                      <div className="category-header">
                        <span className="category-icon"><BiData size={16} /></span>
                        <span className="category-title">Document management </span>
                      </div>
                      <div className="category-items">
                        <button className="dropdown-item" onClick={() => { setShowDmsTempModal(true); setShowAdminTools(false); }}>
                          <span className="dropdown-icon"><BiFile size={16} /></span>
                          <span>Upload File</span>
                        </button>
                        <Link to="/dms/rapports" className="dropdown-item" onClick={() => setShowAdminTools(false)}>
                          <span className="dropdown-icon"><BiBarChart size={16} /></span>
                          <span>Rapports</span>
                        </Link>
                      </div>
                    </div>
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
                        {/* Show Paramètres only for superuser */}
                        {user.role === 'superuser' && (
                          <Link 
                            to="/settings" 
                            className="dropdown-item"
                            onClick={() => setShowAdminTools(false)}
                          >
                            <span className="dropdown-icon"><BiCog size={16} /></span>
                            <span>Paramètres</span>
                          </Link>
                        )}
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

          {/* User Tools Dropdown */}
          {user && user.role !== 'admin' && user.role !== 'superuser' && (
            <div className="admin-tools-container" ref={adminToolsRef}>
              <button 
                className={`nav-link ${isActive('/User/tools')}`}
                onClick={() => setShowAdminTools(!showAdminTools)}
              >
                <span className="nav-icon"><BiGroup size={20} /></span>
                <span>Outils</span>
                <span className={`dropdown-icon ${showAdminTools ? 'open' : ''}`}> <BiChevronDown size={14} /> </span>
              </button>
              {showAdminTools && (
                <div className="admin-tools-dropdown">
                  <div className="dropdown-columns">
                    {/* Document Management (same as admin) */}
                    <div className="dropdown-column">
                      <div className="category-header">
                        <span className="category-icon"><BiData size={16} /></span>
                        <span className="category-title">Document management</span>
                      </div>
                      <div className="category-items">
                        {/* Remove the Documents link for users */}
                        {/* <Link to="/temp-documents" className="dropdown-item" onClick={() => setShowAdminTools(false)}>
                          <span className="dropdown-icon"><BiFile size={16} /></span>
                          <span>Documents</span>
                        </Link> */}
                        <button className="dropdown-item" onClick={() => { setShowDmsTempModal(true); setShowAdminTools(false); }}>
                          <span className="dropdown-icon"><BiFile size={16} /></span>
                          <span>Upload File</span>
                        </button>
                        <Link to="/dms/rapports" className="dropdown-item" onClick={() => setShowAdminTools(false)}>
                          <span className="dropdown-icon"><BiBarChart size={16} /></span>
                          <span>Rapports</span>
                        </Link>
                        {/* Add more items if users have access, e.g., Rapports */}
                      </div>
                      {/* Password Reset Section */}
                      <div className="category-header" style={{marginTop: '2rem'}}>
                        <span className="category-icon"><BiLock size={16} /></span>
                        <span className="category-title">Sécurité</span>
                      </div>
                      <div className="category-items">
                        <Link to="/settings-users" className="dropdown-item" onClick={() => setShowAdminTools(false)}>
                          <span className="dropdown-icon"><BiLock size={16} /></span>
                          <span>Réinitialiser le mot de passe</span>
                        </Link>
                      </div>
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
        </div>
      </div>
    </nav>
      {showDmsTempModal && (
        <DmsTempUploadModal onClose={() => setShowDmsTempModal(false)} />
      )}
  </>
  );
};

export default NavBar;

