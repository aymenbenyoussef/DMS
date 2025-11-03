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
  const [progressTimer, setProgressTimer] = useState(null);

  // Fetch max file size from settings
  useEffect(() => {
    const fetchMaxFileSize = async () => {
      try {
        const response = await API.settings.getSettings();
        const settings = await response.json();
        if (settings.maxFileSize) {
          setMaxFileSize(settings.maxFileSize);
        }
      } catch (error) {
        console.log('Impossible de récupérer la taille maximale du fichier à partir des paramètres :', error);
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

  // Animate progress bar to 90% while uploading
  useEffect(() => {
    if (isUploading && uploadStatus === 'pending') {
      if (progressTimer) clearInterval(progressTimer);
      const timer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + 2;
          return 90;
        });
      }, 80);
      setProgressTimer(timer);
    } else if (!isUploading || uploadStatus === 'completed' || uploadStatus === 'error') {
      if (progressTimer) {
        clearInterval(progressTimer);
        setProgressTimer(null);
      }
      if (uploadStatus === 'completed') {
        setUploadProgress(100);
      }
      if (uploadStatus === 'error') {
        setUploadProgress(0);
      }
    }
    // eslint-disable-next-line
  }, [isUploading, uploadStatus]);

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
      for (let i = 0; i < files.length; i++) {
        await API.tempDocuments.upload([files[i]]);
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setUploadStatus('completed');
      setUploadProgress(100);
      // Wait 700ms to show 100% before closing/next stage
      setTimeout(() => {
        // Dispatch event to refresh TempDocumentArchive table
        window.dispatchEvent(new Event('TempDocumentsUploaded'));
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
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
        return 'Téléchargement de fichiers...';
      case 'completed':
        return 'Fichiers téléchargés avec succès !';
      case 'error':
        return 'Erreur lors du téléchargement.';
      case 'invalid':
        return 'Type de fichier non valide.';
      case 'size_error':
        return `La taille du fichier dépasse la limite maximale de ${maxFileSize} Ko.`;
      default:
        return '';
    }
  };

  return (
    <div className="upload-modal-overlay">
      <div className={`upload-modal${files.length > 0 ? ' has-files' : ' no-files'}`}> 
        <div className="upload-header fixed-header">
          <h3>Téléchargement temporaire vers DMS</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="upload-content scrollable-content">
          <div 
            className={`drop-zone ${isDragging ? 'dragging' : ''} ${files.length ? 'has-file' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <div className="upload-icon">📄</div>
              <p>Glisser des fichiers ici</p>
              <label className="file-input-label">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
                  onChange={handleFileChange}
                  className="file-input"
                  multiple
                />
                Parcourir
              </label>
              <p className="file-types">
                Formats acceptés: PDF, JPG, PNG, TIFF, DOC, DOCX
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
        </div>
        <div className="upload-actions fixed-footer">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={isUploading}
          >
            Annuler
          </button>
          <button 
            className="btn-primary" 
            onClick={handleUpload}
            disabled={!files.length || isUploading}
          >
            {isUploading ? 'Téléchargement...' : 'Télécharger'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DmsTempUploadModal;