import React, { useState ,useEffect} from 'react';
import './DocumentArchive.css';
import API from '../api';
const DocumentArchive = () => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');
  const selectedCompanyId = 1;
  const [successMessage, setSuccessMessage] = React.useState('');
  const [folders, setFolders] = useState([]);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFolderName('');
  };

  const fetchFolders = async () => {
  try {
    const response = await API.folders.getAll();
    setFolders(response.data);
  } catch (error) {
    console.error('Erreur lors du chargement des dossiers', error);
  }
};

useEffect(() => {
  fetchFolders();
}, []);

 const createFolder = async () => {
  if (folderName.trim() === '') {
    setError('Le nom du dossier est requis.');
    return;
  }

  if (!selectedCompanyId) {
    setError('Aucune entreprise sélectionnée.');
    return;
  }

  setError('');
  setSuccessMessage('');
  
  try {
    const response = await fetch('http://localhost:5000/folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        name: folderName.trim(),
        company_id: selectedCompanyId
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.msg || 'Erreur lors de la création du dossier');
    }
    const data = await response.json();
    setFolders((prevFolders) => [...prevFolders, data.folder]);

    window.dispatchEvent(new Event("folderCreated"));
    console.log('folderCreated event dispatched');
    
    setSuccessMessage('Dossier créé avec succès !');
    console.log('Dossier créé avec succès');

    

    closeModal();
  } catch (err) {
    console.error(err);
    setError(err.message);
  }
  



  };
  return (
    <div className="document-archive">
      <div className="archive-header">
        <h1 className="archive-title">Document Archive</h1>
        <button className="new-folder-btn" onClick={openModal}>
          + New Folder
        </button>
      </div>

      <div className="breadcrumb">DMS › DMS-M1 Documents</div>

      <div className="stats-container">
        <div className="stat-card">
          <h3>Total Documents</h3>
          <p>0 Active</p>
        </div>
        <div className="stat-card">
          <h3>Invoices</h3>
          <p>0 Active</p>
        </div>
        <div className="stat-card">
          <h3>Processed</h3>
          <p>0 Active</p>
        </div>
      </div>

      <div className="search-section">
        <h2>Search & Filter</h2>
        <div className="search-controls">
          <input 
            type="text" 
            placeholder="Search documents..." 
            className="search-input"
          />
          <button className="upload-btn">
            Search
          </button>
        </div>
      </div>

      <div className="documents-container">
        <div className="main-documents">
          <div className="section-header">
            <h2>Documents</h2>
            <span>0 items</span>
          </div>
          <div className="empty-state">
            No documents found
          </div>
        </div>

        <div className="recent-documents">
          <h2>Recent Documents</h2>
          <div className="empty-state">
            No recent documents
          </div>
        </div>
      </div>
       {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create New Folder</h2>
            <div className="modal-content">
          <input
          type="text"
          placeholder="Folder name"
          value={folderName}
           onChange={(e) => setFolderName(e.target.value)}
          />
            {error && <p className="error-message">{error}</p>}
            </div>
            <div className="modal-actions">
              <button onClick={createFolder}>Create</button>
              <button onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {successMessage && (
  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
    {successMessage}
  </div>
)}
    </div>
  );
};

export default DocumentArchive;