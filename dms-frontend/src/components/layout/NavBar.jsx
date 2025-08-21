import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BiData, BiBarChart, BiGroup, BiCog, BiFile, BiLogOut, BiChevronDown, BiUser, BiBuilding, BiTag, BiReceipt, BiCollection, BiFolder, BiBuildings, BiSearch, BiLock, BiMenu } from 'react-icons/bi';
import api from '../../api';
import { AppContext } from '../context';
import DmsTempUploadModal from '../Dashboard/DmsTempUploadModal';
import './NavBar.css';

const NavBar = ({ user, onLogout, toggleSidebar }) => {
  const { systemName, setSelectedCompany: setContextCompany, setSelectedDoctype: setContextDoctype } = useContext(AppContext);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [showDmsTempModal, setShowDmsTempModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const adminToolsRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [companies, setCompanies] = useState([]);
  const [doctypes, setDoctypes] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedDoctype, setSelectedDoctype] = useState('');
  const [isInvoice, setIsInvoice] = useState('');
  
  // Admin tools links grouped by category
  const adminToolsCategories = {
    systemConfig: {
      title: 'Système de configuration',
      icon: <BiGroup size={16} />,
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
    return navigate.pathname === path ? 'active' : '';
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (adminToolsRef.current && !adminToolsRef.current.contains(event.target)) {
        setShowAdminTools(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Fetch companies and doctypes on component mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const companiesRes = await api.companies.getAll();
        // Filter companies based on user role and access
        const filteredCompanies = companiesRes.data.filter(company => {
          // Show all companies for admin and superuser, only active ones for regular users
          if (user && (user.role === 'admin' || user.role === 'superuser')) {
            return true; // Show all companies (active and inactive)
          }
          return company.is_active; // Only show active companies for regular users
        });
        setCompanies(filteredCompanies);
        const doctypesRes = await api.doctype.getAll();
        setDoctypes(doctypesRes.data);
      } catch (error) {
        console.error("Error fetching filter data:", error);
      }
    };
    fetchFilters();
  }, [user]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // If no specific company is selected, use all accessible companies for the user
      let companyFilter = selectedCompany || null;
      
      // If no company is selected, pass the list of accessible company IDs
      if (!selectedCompany) {
        const accessibleCompanyIds = companies.map(company => company.id);
        // Pass the accessible company IDs as a parameter to the search
        // Note: This assumes the backend API supports filtering by multiple company IDs
        companyFilter = accessibleCompanyIds;
      }

      const response = await api.search.searchDocumentsFiltered(
        searchTerm,
        companyFilter,
        selectedDoctype || null,
        isInvoice === '' ? null : isInvoice === 'true'
      );
      
      // Additional client-side filtering to ensure only documents from accessible companies are shown
      let filteredResults = response.data;
      if (!selectedCompany) {
        // Filter results to only include documents from accessible companies
        filteredResults = response.data.filter(doc => {
          return companies.some(company => company.id === doc.company_id);
        });
      }
      
      setSearchResults(filteredResults);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Error searching documents:", error);
      setSearchResults([]);
      setShowSearchResults(true); // Still show the dropdown to display error message
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // If search term is empty, clear results
    if (!value.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch();
    }, 500); // 500ms delay
  };

  return (
    <>
    <nav className="navbar">
      <div className="navbar-container">
        {/* Sidebar toggle (visible on all sizes, styled in CSS) */}
        <button className="sidebar-toggle" onClick={() => typeof toggleSidebar === 'function' && toggleSidebar()} aria-label="Basculer la barre latérale">
          <BiMenu size={20} />
        </button>
        {/* Logo Section */}
        <div className="navbar-brand" onClick={resetSelection}>
          <Link to="/" className="logo-link">
            <div className="logo">
              <span className="logo-icon"><BiData size={32} /></span>
              <div className="logo-text">
                <span className="logo-main">{systemName}</span>
                <span className="logo-sub">Système avancé de gestion des données</span>
              </div>
            </div> 
          </Link>
        </div>

        {/* Search Bar*/}
        <div className="search-container" ref={searchDropdownRef}>
          <div className="search-bar">
            <span className="search-icon"><BiSearch size={18} /></span>
            <input 
              type="text" 
              placeholder="Recherche par nom de fichier..." 
              className="search-input"
              value={searchTerm}
              onChange={handleSearchInputChange}
              onFocus={() => setShowSearchResults(true)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <button onClick={handleSearch} className="search-button" disabled={isSearching}>
              {isSearching ? (
                <>
                  <i className="bi bi-arrow-clockwise me-1" style={{animation: 'spin 1s linear infinite'}}></i>
                  Recherche...
                </>
              ) : (
                'Rechercher'
              )}
            </button>
          </div>

          {showSearchResults && (
            <div className="search-dropdown">
              <div className="search-results">
                {isSearching ? (
                  <div className="loading-results">
                    <i className="bi bi-search me-2"></i>
                    Recherche en cours...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(doc => (
                    <div key={doc.id} className="search-result-item" onClick={() => {
                      // Find the company and doctype objects
                      const company = companies.find(c => c.id === doc.company_id);
                      const doctype = doctypes.find(d => d.id === doc.doctype_id);
                      // Update context with selected company and doctype
                      if (company) {
                        setContextCompany(company);
                      }
                      if (doctype) {
                        setContextDoctype(doctype);
                      }
                      // Navigate to document archive with the correct IDs and filename filter
                      const filenameParam = encodeURIComponent(doc.filename);
                      navigate(`/?company=${doc.company_id || ''}&doctype=${doc.doctype_id || ''}&filename=${filenameParam}`);
                      setShowSearchResults(false);
                      setSearchTerm('');
                    }}>
                      <div className="search-result-header">
                        <i className="bi bi-file-earmark-text me-2"></i>
                        <strong>{doc.filename}</strong>
                      </div>
                      <div className="search-result-details">
                        <span className="search-result-company">
                          <i className="bi bi-building me-1"></i>
                          {doc.company_name || 'N/A'}
                        </span>
                        <span className="search-result-doctype">
                          <i className="bi bi-tag me-1"></i>
                          {doc.doctype_name || 'N/A'}
                        </span>
                        <span className={`search-result-invoice ${doc.is_invoice ? 'invoice-yes' : 'invoice-no'}`}>
                          <i className="bi bi-receipt me-1"></i>
                          {doc.is_invoice ? 'Facturable' : 'Non Facturable'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : searchTerm.trim() ? (
                  <div className="no-results">
                    <i className="bi bi-search me-2"></i>
                    Aucun document trouvé pour "{searchTerm}"
                  </div>
                ) : (
                  <div className="search-placeholder">
                    <i className="bi bi-search me-2"></i>
                    Entrez un terme de recherche pour commencer
                  </div>
                )}
              </div>
            </div>
          )}
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
                          <span>DMS</span>
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
                          <span>DMS</span>
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

