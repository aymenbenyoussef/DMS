import React, { useState, useEffect, useContext } from 'react';
import API from '../../api';
import './Sidebar.css';
import { Link, useNavigate } from 'react-router-dom'; 
import { AppContext } from '../context';

const Sidebar = ({ user }) => {
  const [companies, setCompanies] = useState([]);
  const [folders, setFolders] = useState({});
  const [error, setError] = useState('');
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
    const fetchCompanies = async () => {
      try {
        const response = await API.companies.getAll();
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
        console.error('Failed to load companies:', err.response?.data || err.message);
        setError(`Erreur de chargement: ${err.response?.data?.msg || err.message}`);
      }
    };

    if (user?.id) {
      fetchCompanies();
    }
    
    // Event handler for folderAdded event
    const folderHandler = (e) => {
      const { companyId, folder } = e.detail;
      
      // Auto-expand the company that received the new folder
      setExpandedCompany(companyId);
      
      // Update folders state to include the new folder
      setFolders(prev => ({
        ...prev,
        [companyId]: [...(prev[companyId] || []), folder]
      }));
    };

     const doctypeAddedHandler = (e) => {
    const companyIds = e.detail.affectedCompanyIds || [];
    // Refresh folders for each affected company
    companyIds.forEach(companyId => {
       // Only refresh if we have folders for this company
        fetchFoldersForCompany(companyId);
      
    });
  };

  const doctypeDeletedHandler = (e) => {
    const companyIds = e.detail.affectedCompanyIds || [];
    // Refresh folders for each affected company
    companyIds.forEach(companyId => {
       // Only refresh if we have folders for this company
        fetchFoldersForCompany(companyId);
      
    });
  };
    // Event handler for companyAdded event
    const companyHandler = () => fetchCompanies();
    const companyHandlerDel = () => fetchCompanies();
    // Add event listeners
    window.addEventListener('companyAdded', companyHandler);
    window.addEventListener('companyDeleted', companyHandlerDel);
    window.addEventListener('doctypeAdded', doctypeAddedHandler);
    window.addEventListener('doctypeDeleted', doctypeDeletedHandler);
    window.addEventListener('doctypeUpdated', doctypeAddedHandler);
    // Cleanup
    return () => {
      window.removeEventListener('companyAdded', companyHandler);
      window.removeEventListener('doctypeAdded', doctypeAddedHandler);
      window.removeEventListener('companyDeleted', companyHandlerDel);
      window.removeEventListener('doctypeDeleted', doctypeDeletedHandler);
      window.removeEventListener('doctypeUpdated', doctypeAddedHandler);
    };
  }, [user]);

  // Reset expanded company when selection changes
  useEffect(() => {
    if (!selectedCompany) {
      setExpandedCompany(null);
    }
  }, [selectedCompany]);

  const fetchFoldersForCompany = async (companyId) => {
    try {
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
      <header 
        className="sidebar-header"
        onClick={handleHeaderClick}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="company-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 21v-2h18v2H3zm2-3V3h6v15H5zm8 0V7h6v11h-6z" />
        </svg>
        <h2>Entities</h2>
      </header>

      {error && <div className="error-message">{error}</div>}

      <ul className="folder-list" role="list">
        {companies.map(company => (
          <React.Fragment key={company.id}>
            <li
              className={`folder-item ${selectedCompany?.id === company.id ? 'selected' : ''}`}
              tabIndex={0}
              role="button"
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
            
            {expandedCompany === company.id && folders[company.id] && (
              <div className="folder-subitems">
                {folders[company.id].map(folder => (
                  <li
                    key={folder.id}
                    className={`folder-item folder-subitem ${selectedDoctype?.id === folder.id ? 'selected' : ''}`}
                    tabIndex={0}
                    role="button"
                    onClick={() => setSelectedDoctype(folder)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="folder-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
                    </svg>
                    <span className="folder-name">{folder.name}</span>
                  </li>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;