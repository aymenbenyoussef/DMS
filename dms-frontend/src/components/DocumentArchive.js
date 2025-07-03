import React, { useState, useEffect } from 'react';
import './DocumentArchive.css';
import API from '../api';

const DocumentArchive = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');
  const selectedCompanyId = 1;
  const [successMessage, setSuccessMessage] = React.useState('');
  const [folders, setFolders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setFolderName('');
  };

  const openUploadModal = () => setIsUploadModalOpen(true);
  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return alert("Please select a file first.");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("company_id", 1);
    formData.append("document_type", "non_invoice");

    try {
      const response = await fetch("http://localhost:5000/documents", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.msg || "Upload failed");
      }
      alert("File uploaded successfully");
      setSelectedFile(null);
      closeUploadModal();
    } catch (err) {
      alert("Upload error: " + err.message);
    }
  };

  const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

  const fetchFolders = async () => {
    try {
      const response = await API.folders.getAll();
      setFolders(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers', error);
    }
  };

  useEffect(() => { fetchFolders(); }, []);

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
      setSuccessMessage('Dossier créé avec succès !');
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="document-archive">
      {/* Header */}
      <div className="archive-header">
        <h1>Document Archive</h1>
        <div className="header-buttons">
          <button className="new-folder-btn" onClick={openModal}>
            + New Folder
          </button>
          <button className="upload-file" onClick={openUploadModal}>
            + Upload File
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="breadcrumb">DMS › DMS-M1 Documents</div>

      {/* Stats Cards */}
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

      {/* Search Section */}
      <div className="search-section">
        <h2>Search & Filter</h2>
        <div className="search-controls">
          <input 
            type="text" 
            placeholder="Search documents..." 
            className="search-input"
          />
          <button className="search-btn">Search</button>
        </div>
        <div className="filter-options">
          {['Invoice', 'Receive', 'Record', 'Pending', 'Active'].map((item) => (
            <label key={item} className="filter-option">
              <input type="checkbox" />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Documents Container */}
      <div className="documents-container">
        {/* Main Documents */}
        <div className="main-documents">
          <div className="section-header">
            <h2>Documents</h2>
            <span>0 items</span>
          </div>
          <div className="empty-state">
            <p>No documents found</p>
            <button onClick={openUploadModal}>Upload documents to get started</button>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="recent-documents">
          <h2>Recent Documents</h2>
          <div className="recent-files">
            {[
              { name: 'MyCV (1).pdf', date: '24/06/2025', status: 'GETED' },
              { name: 'Invoice_001.pdf', date: '24/06/2025', status: 'GETED' },
              { name: 'Invoice_001.pdf', date: '24/06/2025', status: 'GETED' },
              { name: 'MyCV.pdf', date: '27/06/2025', status: 'GETED' },
            ].map((doc, index) => (
              <div key={index} className="recent-file">
                <div className="file-info">
                  <div className="file-name">{doc.name}</div>
                  <div className="file-date">{doc.date}</div>
                </div>
                <span className="file-status">{doc.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Document Details */}
      <div className="document-details">
        <h3>Document Details</h3>
        <div className="detail-item">
          <span>MyCV.pdf</span>
        </div>
        <div className="detail-row">
          <div className="detail-item">
            <span className="label">Size:</span>
            <span>687 KB</span>
          </div>
          <div className="detail-item">
            <span className="label">Type:</span>
            <span>PDF</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-item">
            <span className="label">Uploaded:</span>
            <span>27/06/2025</span>
          </div>
          <div className="detail-item">
            <span className="label">Status:</span>
            <span className="status-badge">GETED</span>
          </div>
        </div>
      </div>

      {/* Create Folder Modal */}
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

      {/* Upload File Modal */}
      {isUploadModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Upload File</h2>
            <div className="modal-content">
              <input type="file" onChange={handleFileChange} />
              {selectedFile && <p>Selected file: {selectedFile.name}</p>}
            </div>
            <div className="modal-actions">
              <button onClick={handleUploadFile}>Upload</button>
              <button onClick={closeUploadModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
    </div>
  );
};

export default DocumentArchive;