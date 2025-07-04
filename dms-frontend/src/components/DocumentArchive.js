import React, { useState, useEffect, useContext } from 'react';
import './DocumentArchive.css';
import API from '../api';
import { AppContext } from './context';
import { useNavigate } from 'react-router-dom';

const DocumentArchive = ({ user, selectedCompany, selectedFolder }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [folders, setFolders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const { setSelectedFolder } = useContext(AppContext);
  const navigate = useNavigate();
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

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadFile = async (file = null) => {
    const fileToUpload = file || selectedFile;
    if (!fileToUpload) return alert("Please select a file first.");
    if (!selectedFolder) return;

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("company_id", selectedCompany.id);
    formData.append("folder_id", selectedFolder.id);
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
    if (!selectedCompany) return;
    
    try {
      const response = await API.folders.getByCompany(selectedCompany.id);
      setFolders(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers', error);
    }
  };

  useEffect(() => { 
    if (selectedCompany) {
      fetchFolders();
    }
  }, [selectedCompany]);

  const createFolder = async () => {
    if (folderName.trim() === '') {
      setError('Le nom du dossier est requis.');
      return;
    }

    if (!selectedCompany) {
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
          company_id: selectedCompany.id
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.msg || 'Erreur lors de la création du dossier');
      }
      const data = await response.json();
      
      // Update folders state
      setFolders(prev => [...prev, data.folder]);
      
      // Update company in context to include new folder
      selectedCompany.folders = [...(selectedCompany.folders || []), data.folder];
      
      setSuccessMessage('File created successfully!');
      // Dispatch custom event with folder data
      window.dispatchEvent(new CustomEvent('folderAdded', {
      detail: {
        companyId: selectedCompany.id,
        folder: data.folder
      }
    }));
    
    closeModal();
    navigate('/');
    } catch (err) {
      setError(err.message);
    }
    
    
  };

  // Get breadcrumb path
  const getBreadcrumb = () => {
    if (selectedFolder && selectedCompany) {
      return `${selectedCompany.name} > ${selectedFolder.name}`;
    }
    if (selectedCompany) {
      return `${selectedCompany.name} >`;
    }
    return 'DMS >';
  };

  return (
    <div className="document-archive">
      {/* Header */}
      <div className="archive-header">
        <h1>Document Archive</h1>

         
        <div className="header-buttons">
          {user && user.role === 'admin' && selectedCompany && !selectedFolder && (
            <button className="new-folder-btn" onClick={openModal}>
              + New Folder
            </button>
          )}
          {selectedFolder && (
            <button className="upload-file" onClick={openUploadModal}>
              + Upload File
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="breadcrumb">{getBreadcrumb()}</div>
          {successMessage && (
        <div className="success-message">{successMessage}</div>
          )}
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

      {/* Drag & Drop Area (only shown when folder is selected) */}
      {selectedFolder && (
        <div 
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p>Drag & Drop files here to upload</p>
        </div>
      )}

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
              <button onClick={() => handleUploadFile()}>Upload</button>
              <button onClick={closeUploadModal}>Close</button>
            </div>
          </div>
        </div>
      )}

     
    </div>
  );
};

export default DocumentArchive;