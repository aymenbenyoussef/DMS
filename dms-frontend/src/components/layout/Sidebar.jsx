import React, { useState, useEffect, useContext } from 'react';
import API from '../../api';
import './Sidebar.css';
import { useNavigate } from 'react-router-dom'; 
import { AppContext } from '../context';

const Sidebar = ({ user }) => {
  const [companies, setCompanies] = useState([]);
  const [folders, setFolders] = useState({});
  const [error, setError] = useState('');
  const [loadingStates, setLoadingStates] = useState({
    companies: false,
    folders: {}
  });
  const navigate = useNavigate(); 
  const { 
    selectedCompany, 
    setSelectedCompany, 
    selectedDoctype, 
    setSelectedDoctype,
    resetSelection 
  } = useContext(AppContext);
  const [expandedCompany, setExpandedCompany] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCompanies = async () => {
      try {
        setLoadingStates(prev => ({ ...prev, companies: true }));
        setError('');
        
        const response = await API.companies.getAll();
        if (!isMounted) return;
        
        console.log("Companies data:", response.data);
        const data = response.data;

        if (Array.isArray(data)) {
          setCompanies(data);
        }
        else if (data && Array.isArray(data.companies)) {
          setCompanies(data.companies);
        }
        else {
          throw new Error("Format inattendu des données reçues");
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load companies:', err.response?.data || err.message);
        setError(`Erreur de chargement: ${err.response?.data?.msg || err.message}`);
      } finally {
        if (isMounted) setLoadingStates(prev => ({ ...prev, companies: false }));
      }
    };

    if (user?.id) {
      fetchCompanies();
    }
    
    // Event handlers
    const folderHandler = (e) => {
      const { companyId, folder } = e.detail;
      setExpandedCompany(companyId);
      setFolders(prev => ({
        ...prev,
        [companyId]: [...(prev[companyId] || []), folder]
      }));
    };

    const doctypeHandler = (e) => {
      const companyIds = e.detail.affectedCompanyIds || [];
      companyIds.forEach(companyId => {
        if (folders[companyId]) {
          fetchFoldersForCompany(companyId);
        }
      });
    };
    
    const companyHandler = () => fetchCompanies();

    // Add event listeners
    window.addEventListener('companyAdded', companyHandler);
    window.addEventListener('companyDeleted', companyHandler);
    window.addEventListener('doctypeAdded', doctypeHandler);
    window.addEventListener('doctypeDeleted', doctypeHandler);
    window.addEventListener('doctypeUpdated', doctypeHandler);
    
    // Cleanup
    return () => {
      window.removeEventListener('companyAdded', companyHandler);
      window.removeEventListener('companyDeleted', companyHandler);
      window.removeEventListener('doctypeAdded', doctypeHandler);
      window.removeEventListener('doctypeDeleted', doctypeHandler);
      window.removeEventListener('doctypeUpdated', doctypeHandler);
      isMounted = false;
    };
  }, [user, folders]);

  useEffect(() => {
    if (!selectedCompany) {
      setExpandedCompany(null);
    }
  }, [selectedCompany]);

  const fetchFoldersForCompany = async (companyId) => {
    try {
      setLoadingStates(prev => ({
        ...prev,
        folders: { ...prev.folders, [companyId]: true }
      }));
      
      const response = await API.folders.getByCompany(companyId);
      console.log("Folders data:", response.data);
      
      const data = response.data;
      let foldersData = [];

      if (Array.isArray(data)) {
        foldersData = data;
      }
      else if (data && Array.isArray(data.folders)) {
        foldersData = data.folders;
      }
      else {
        throw new Error("Format inattendu des données reçues");
      }

      setFolders(prev => ({
        ...prev,
        [companyId]: foldersData
      }));
    } catch (err) {
      console.error('Failed to load folders:', err.response?.data || err.message);
      setError(`Erreur de chargement des dossiers: ${err.response?.data?.msg || err.message}`);
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        folders: { ...prev.folders, [companyId]: false }
      }));
    }
  };

  const handleCompanyClick = (company) => {
    setSelectedCompany(company);
    setSelectedDoctype(null);
    navigate('/');
    if (expandedCompany === company.id) {
      setExpandedCompany(null);
    } else {
      setExpandedCompany(company.id);
      if (!folders[company.id]) {
        fetchFoldersForCompany(company.id);
      }
    }
  };

  const handleHeaderClick = () => {
    resetSelection();
    setExpandedCompany(null);
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-header" onClick={handleHeaderClick}>
        <svg xmlns="http://www.w3.org/2000/svg" className="company-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 21v-2h18v2H3zm2-3V3h6v15H5zm8 0V7h6v11h-6z" />
        </svg>
        <h2>Entités</h2>
      </header>

      {error && <div className="error-message">{error}</div>}

      <ul className="folder-list" role="list">
        {loadingStates.companies ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>Chargement des entreprises...</span>
          </div>
        ) : companies.length === 0 ? (
          <div className="no-results">Aucune entreprise trouvée</div>
        ) : (
          companies.map(company => (
            <React.Fragment key={company.id}>
              <li
                className={`folder-item ${selectedCompany?.id === company.id ? 'selected' : ''}`}
                onClick={() => handleCompanyClick(company)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="company-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 21v-2h18v2H3zm2-3V3h6v15H5zm8 0V7h6v11h-6z" />
                </svg>
                <span className="company-name">{company.name}</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`expand-icon ${expandedCompany === company.id ? 'expanded' : ''}`} 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </li>
              
              {expandedCompany === company.id && (
                <div className="folder-subitems">
                  {loadingStates.folders[company.id] ? (
                    <div className="loading-container small">
                      <div className="loading-spinner"></div>
                      <span>Chargement des dossiers...</span>
                    </div>
                  ) : (
                    folders[company.id]?.length > 0 ? (
                      folders[company.id].map(folder => (
                        <li
                          key={folder.id}
                          className={`folder-item folder-subitem ${selectedDoctype?.id === folder.id ? 'selected' : ''}`}
                          onClick={() => setSelectedDoctype(folder)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="folder-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
                          </svg>
                          <span className="folder-name">{folder.name}</span>
                        </li>
                      ))
                    ) : (
                      <div className="no-results small">Aucun dossier trouvé</div>
                    )
                  )}
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </ul>
    </aside>
  );
};

export default Sidebar;