import React, { useState, useEffect, useContext } from 'react';
import API from '../../api';
import './Sidebar.css';
import { useNavigate } from 'react-router-dom'; 
import { AppContext } from '../context';
import { useLanguage } from '../../contexts/LanguageContext';

const Sidebar = ({ user, loadingUser, isOpen }) => {
  const { t } = useLanguage();
  const [companies, setCompanies] = useState([]);
  const [folders, setFolders] = useState({});
  const [error, setError] = useState('');
  const [loadingStates, setLoadingStates] = useState({
    companies: false,
    folders: {}
  });
  const [timeoutError, setTimeoutError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate(); 
  const {
    selectedCompany,
    setSelectedCompany,
    selectedDoctype,
    setSelectedDoctype,
    resetSelection
  } = useContext(AppContext);
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [tempDocumentsCount, setTempDocumentsCount] = useState(0);

  const fetchTempDocumentsCount = async () => {
    try {
      const response = await API.tempDocuments.getAll();
      setTempDocumentsCount(response.data?.length || 0);
    } catch (error) {
      console.error('Error fetching temp documents count:', error);
      setTempDocumentsCount(0);
    }
  };

  useEffect(() => {
    if (loadingUser || !user?.id) return;

    let isMounted = true;
    let timeoutId;

    const fetchCompanies = async () => {
      try {
        setLoadingStates(prev => ({ ...prev, companies: true }));
        setError('');
        setTimeoutError(false);
        timeoutId = setTimeout(() => {
          if (isMounted) setTimeoutError(true);
        }, 8000); // 8 seconds

        const response = await API.companies.getAll();
        if (!isMounted) return;
        clearTimeout(timeoutId);
        setTimeoutError(false);
        const rawData = response?.data;
        let companiesArray = [];
        if (Array.isArray(rawData)) {
          companiesArray = rawData;
        } else if (rawData && Array.isArray(rawData.companies)) {
          companiesArray = rawData.companies;
        } else {
          throw new Error("Format inattendu des données reçues");
        }
        setCompanies(companiesArray);
      } catch (err) {
        if (!isMounted) return;
        clearTimeout(timeoutId);
        setError(`Erreur de chargement: ${err.response?.data?.msg || err.message}`);
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoadingStates(prev => ({ ...prev, companies: false }));
        }
      }
    };

    fetchCompanies();
    fetchTempDocumentsCount();

    // Event listeners
    const companyHandler = () => fetchCompanies();

    const doctypeHandler = (e) => {
      let companyIds = [];
      if (e && e.detail && Array.isArray(e.detail.affectedCompanyIds)) {
        companyIds = e.detail.affectedCompanyIds;
      } else {
        companyIds = Object.keys(folders);
      }
      companyIds.forEach(companyId => {
        if (folders[companyId]) {
          fetchFoldersForCompany(companyId);
        }
      });
    };

    // Add listeners for companyUpdated and doctypeUpdated
    window.addEventListener('companyUpdated', companyHandler);
    window.addEventListener('doctypeUpdated', doctypeHandler);
    window.addEventListener('companyAdded', companyHandler);
    window.addEventListener('companyDeleted', companyHandler);
    window.addEventListener('doctypeAdded', doctypeHandler);
    window.addEventListener('doctypeDeleted', doctypeHandler);
    window.addEventListener('doctypeUpdated', doctypeHandler);

    return () => {
      window.removeEventListener('companyUpdated', companyHandler);
      window.removeEventListener('doctypeUpdated', doctypeHandler);
      window.removeEventListener('companyAdded', companyHandler);
      window.removeEventListener('companyDeleted', companyHandler);
      window.removeEventListener('doctypeAdded', doctypeHandler);
      window.removeEventListener('doctypeDeleted', doctypeHandler);
      window.removeEventListener('doctypeUpdated', doctypeHandler);
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [user, folders, loadingUser, retryCount]);

  // Add event listener for temporary document uploads
  useEffect(() => {
    const handleTempDocumentUpload = () => {
      fetchTempDocumentsCount();
    };

    // Listen for temporary document uploads
    window.addEventListener('TempDocumentsUploaded', handleTempDocumentUpload);
    
    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('TempDocumentsUploaded', handleTempDocumentUpload);
    };
  }, []);

  useEffect(() => {
    if (!selectedCompany) {
      setExpandedCompany(null);
    }
  }, [selectedCompany]);

  const fetchFoldersForCompany = async (companyId) => {
    if (loadingUser || !user?.id) return;

    let isMounted = true;

    try {
      setLoadingStates(prev => ({
        ...prev,
        folders: { ...prev.folders, [companyId]: true }
      }));

      const response = await API.folders.getByCompany(companyId);
      if (!isMounted) return;

      console.log("Folders data:", response);
      const data = response?.data || response;
      let foldersData = [];

      if (Array.isArray(data)) {
        foldersData = data;
      } else if (data && Array.isArray(data.folders)) {
        foldersData = data.folders;
      } else {
        throw new Error("Format inattendu des dossiers reçus");
      }

      setFolders(prev => ({
        ...prev,
        [companyId]: foldersData
      }));
    } catch (err) {
      if (!isMounted) return;
      console.error('Failed to load folders:', err);
      setError(`Erreur de chargement des dossiers: ${err.message}`);
    } finally {
      if (isMounted) {
        setLoadingStates(prev => ({
          ...prev,
          folders: { ...prev.folders, [companyId]: false }
        }));
      }
    }

    return () => {
      isMounted = false;
    };
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
    navigate('/');
  };

  // Retry handler
  const handleRetry = () => {
    setRetryCount(c => c + 1);
    setError('');
    setTimeoutError(false);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <header className="sidebar-header" onClick={handleHeaderClick}>
        <svg xmlns="http://www.w3.org/2000/svg" className="company-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 21v-2h18v2H3zm2-3V3h6v15H5zm8 0V7h6v11h-6z" />
        </svg>
        <h2>{t('company')}</h2>
      </header>

      {/* A verifier button */}
      <li 
          className="folder-item2"
          onClick={() => {
            resetSelection();
            navigate('/temp-documents');
          }}
          style={{ listStyle: 'none' }}
        >
          <span className="folder-name2">{t('toVerify')} ({tempDocumentsCount})</span>
        </li>
      {(error || timeoutError) && (
        <div className="error-message" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'8px'}}>
          {error || (timeoutError && t('loadingTimeout'))}<br/>
          <button className="btn btn-primary" onClick={handleRetry} style={{marginTop:'8px'}}>{t('retry')}</button>
        </div>
      )}
      <ul className="folder-list" role="list">
        {loadingStates.companies && !timeoutError ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : (!error && !timeoutError && companies.length === 0) ? (
          <div className="no-results">{t('noCompaniesFound')}</div>
        ) : (!error && !timeoutError && companies.map) ? (
          companies.filter(company => {
            // Show all companies for admin and superuser, only active ones for regular users
            if (user && (user.role === 'admin' || user.role === 'superuser')) {
              return true; // Show all companies (active and inactive)
            }
            return company.is_active; // Only show active companies for regular users
          }).map(company => (
            <React.Fragment key={company.id}>
              <li
                className={`folder-item ${selectedCompany?.id === company.id ? 'selected' : ''} ${!company.is_active ? 'inactive' : ''}`}
                onClick={() => handleCompanyClick(company)}
              >
                {company.name  && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="company-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 21v-2h18v2H3zm2-3V3h6v15H5zm8 0V7h6v11h-6z" />
                  </svg>
                )}
                <span className="company-name">{company.name}</span>
                {company.name  && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`expand-icon ${expandedCompany === company.id ? 'expanded' : ''}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                )}
              </li>
              {expandedCompany === company.id && company.name !== t('toVerify') && (
                <div className="folder-subitems">
                  {loadingStates.folders[company.id] ? (
                    <div className="loading-container small">
                      <div className="loading-spinner"></div>
                      <span>{t('loadingFolders')}</span>
                    </div>
                  ) : (
                    folders[company.id]?.length > 0 ? (
                      folders[company.id].filter(folder => {
                        // Show all doctypes for admin and superuser, only active ones for regular users
                        if (user && (user.role === 'admin' || user.role === 'superuser')) {
                          return true; // Show all doctypes (active and inactive)
                        }
                        return folder.status; // Only show active doctypes for regular users
                      }).map(folder => (
                        <li
                          key={folder.id}
                          className={`folder-item folder-subitem ${selectedDoctype?.id === folder.id ? 'selected' : ''} ${!folder.status ? 'inactive' : ''}`}
                          onClick={() => {
                            setSelectedDoctype(folder);
                            navigate('/');
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="folder-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
                          </svg>
                          <span className="folder-name">{folder.name}</span>
                        </li>
                      ))
                    ) : (
                      <div className="no-results small">{t('noFoldersFound')}</div>
                    )
                  )}
                </div>
              )}
            </React.Fragment>
          ))
        ) : null}
      </ul>
    </aside>
  );
};

export default Sidebar;
