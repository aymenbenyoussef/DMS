import React, { useState, useEffect } from 'react';
import API from '../../api';
import './DmsTempUploadModal.css';

const DmsTempUploadModal = ({ onClose, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [maxFileSize, setMaxFileSize] = useState(2014); // Default max file size in KB

  // Fetch max file size from settings
  useEffect(() => {
    const fetchMaxFileSize = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/settings');
        const settings = await response.json();
        if (settings.maxFileSize) {
          setMaxFileSize(settings.maxFileSize);
        }
      } catch (error) {
        console.log('Could not fetch max file size from settings:', error);
      }
    };
    
    fetchMaxFileSize();
  }, []);

  // Clear size error after 5 seconds
  useEffect(() => {
    if (uploadStatus === 'size_error') {
      const timer = setTimeout(() => {
        setUploadStatus(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(isValidFileType);
    if (droppedFiles.length === 0) {
      setUploadStatus('invalid');
      return;
    }
    
    // Check file sizes
    const oversizedFiles = droppedFiles.filter(file => file.size > maxFileSize * 1024);
    if (oversizedFiles.length > 0) {
      setUploadStatus('size_error');
      return;
    }
    
    setFiles(prev => [...prev, ...droppedFiles]);
    setUploadStatus(null);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(isValidFileType);
    if (selectedFiles.length === 0) {
      setUploadStatus('invalid');
      return;
    }
    
    // Check file sizes
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize * 1024);
    if (oversizedFiles.length > 0) {
      setUploadStatus('size_error');
      return;
    }
    
    setFiles(prev => [...prev, ...selectedFiles]);
    setUploadStatus(null);
  };

  const isValidFileType = (file) => {
    const validTypes = [
      'application/pdf', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 
      'image/png', 
      'image/tiff', 
    ];
    const validExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.tiff'];
    const fileName = file.name.toLowerCase();
    return (
      (file.type && validTypes.includes(file.type)) ||
      validExtensions.some(ext => fileName.endsWith(ext))
    );
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setIsUploading(true);
    setUploadStatus('pending');
    setUploadProgress(0);
    try {
      await API.tempDocuments.upload(files);
      setUploadStatus('completed');
      setUploadProgress(100);
      
      // Dispatch event to refresh TempDocumentArchive table
      window.dispatchEvent(new Event('TempDocumentsUploaded'));
      
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (error) {
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadStatus(null);
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'pending':
        return 'Uploading files...';
      case 'completed':
        return 'Files uploaded successfully!';
      case 'error':
        return 'Error during upload.';
      case 'invalid':
        return 'Invalid file type.';
      case 'size_error':
        return `La taille du fichier dépasse la limite maximale de ${maxFileSize} Ko.`;
      default:
        return '';
    }
  };

  return (
    <div className="upload-modal-overlay">
      <div className="upload-modal">
        <div className="upload-header">
          <h3>Téléchargement temporaire vers DMS</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="upload-content">
          <div 
            className={`drop-zone ${isDragging ? 'dragging' : ''} ${files.length ? 'has-file' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <div className="upload-icon">📄</div>
              <p>Upload Your File(s) Here</p>
              <label className="file-input-label">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
                  onChange={handleFileChange}
                  className="file-input"
                  multiple
                />
                Browse Files
              </label>
              <p className="file-types">
                Accepted Format : PDF, JPG, PNG, TIFF, DOC, DOCX
              </p>
            </div>
          </div>
          
          {/* Section des fichiers téléchargés - maintenant en dehors de la drop-zone */}
          {files.length > 0 && (
            <div className="uploaded-files-section">
              <h4 className="uploaded-files-title">Fichiers temporaires sélectionnés ({files.length})</h4>
              <div className="uploaded-files-list">
                {files.map((file, idx) => (
                  <div className="file-preview" key={idx}>
                    <div className="file-icon">📄</div>
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button 
                      className="remove-file-btn"
                      onClick={() => removeFile(idx)}
                      disabled={isUploading}
                      title="Supprimer ce fichier"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isUploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="progress-text">{uploadProgress}%</span>
            </div>
          )}
          {uploadStatus && (
            <div className={`status-message ${uploadStatus}`}>
              {getStatusMessage()}
            </div>
          )}
          <div className="upload-actions">
            <button 
              className="btn-secondary" 
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={handleUpload}
              disabled={!files.length || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DmsTempUploadModal; 