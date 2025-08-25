import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import API from '../../api';
import { AppContext } from '../context';
import DocumentConfirmationForm from './DocumentConfirmationForm';
import './DragDropUpload.css';

const DragDropUpload = ({ onUpload, onClose }) => {
  const { selectedCompany, selectedDoctype } = useContext(AppContext);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [showConfirmations, setShowConfirmations] = useState([]);
  const [confirmationData, setConfirmationData] = useState([]);
  const [maxFileSize, setMaxFileSize] = useState(2014);

  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  // Verrouillage du défilement et gestion des touches
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

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

  const handleUpload = useCallback(async () => {
    if (!files.length) return;
    
    const hasCompany = selectedCompany;
    
    if (!hasCompany) {
      setIsUploading(true);
      setUploadStatus('pending');
      setUploadProgress(0);
      let confirmations = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const response = await API.documents.uploadTempFile(file);
          confirmations.push({
            sessionId: null,
            extractedData: null,
            file,
            isTempUpload: true,
            tempDocId: response.data?.files?.[0]?.id
          });
        } catch (error) {
          console.error('Temp upload failed:', error);
          confirmations.push({ error, file, isTempUpload: true });
        }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      setShowConfirmations(confirmations);
      setConfirmationData(confirmations.map(conf => ({ confirmedDocument: null, errors: {} })));
      setUploadStatus('processed');
      setIsUploading(false);
      return;
    }
    
    setIsUploading(true);
    setUploadStatus('pending');
    setUploadProgress(0);
    let confirmations = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const response = await API.documents.uploadSingleFile(
          file, 
          selectedCompany.id, 
          selectedDoctype?.id || null
        );
        confirmations.push({
          sessionId: response.data?.session_id,
          extractedData: response.data?.extracted_data,
          file
        });
      } catch (error) {
        console.error('Upload failed:', error);
        confirmations.push({ error, file });
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setShowConfirmations(confirmations);
    setConfirmationData(confirmations.map(conf => ({ confirmedDocument: null, errors: {} })));
    setUploadStatus('processed');
    setIsUploading(false);
  }, [files, selectedCompany, selectedDoctype]);

  const handleFormChange = (idx, confirmedDocument, errors) => {
    setConfirmationData(prev => {
      const updated = [...prev];
      updated[idx] = { confirmedDocument, errors };
      return updated;
    });
  };

  const handleConfirmAll = async () => {
    const hasTempUploads = showConfirmations.some(conf => conf.isTempUpload);
    
    if (hasTempUploads) {
      setUploadStatus('completed');
      setTimeout(() => {
        onClose();
      }, 2000);
      return;
    }
    
    let hasError = false;
    for (let i = 0; i < confirmationData.length; i++) {
      if (!confirmationData[i].confirmedDocument || Object.keys(confirmationData[i].errors).length > 0) {
        hasError = true;
        break;
      }
    }
    if (hasError) {
      setUploadStatus('error');
      alert('Veuillez corriger les erreurs dans tous les formulaires avant de confirmer.');
      return;
    }
    setIsUploading(true);
    setUploadStatus('confirming');
    try {
      for (let i = 0; i < showConfirmations.length; i++) {
        const conf = showConfirmations[i];
        const doc = confirmationData[i].confirmedDocument;
        if (conf.sessionId && doc) {
          const documentToConfirm = {
            ...doc,
            partner_id: doc.confirmed_data.partner_id || null,
            confirmed_data: { ...doc.confirmed_data }
          };
          const response = await API.documents.confirmDocuments(conf.sessionId, [documentToConfirm]);
          const savedDoc = response.data.saved_documents[0];
          if (savedDoc && !savedDoc.error) {
            onUpload({
              id: savedDoc.document_id,
              filename: savedDoc.filename,
              is_invoice: savedDoc.is_invoice,
              created_at: new Date().toISOString(),
              status: 'confirmed',
              partner_id: savedDoc.partner_id
            });
          }
        }
      }
      window.dispatchEvent(new Event('FilesUploaded'));
      setUploadStatus('completed');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setUploadStatus('error');
      alert('Erreur lors de la confirmation: ' + (error.response?.data?.msg || error.message));
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadStatus(null);
  };

  const onBackdropClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose?.();
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'pending':
        return 'Traitement en cours...';
      case 'processed':
        const hasTempUploads = showConfirmations.some(conf => conf.isTempUpload);
        if (hasTempUploads) {
          return 'Fichiers téléchargés avec succès.';
        }
        return 'Fichier traité avec succès. Vérifiez les informations.';
      case 'confirming':
        return 'Confirmation en cours...';
      case 'completed':
        const hasTempUploadsCompleted = showConfirmations.some(conf => conf.isTempUpload);
        if (hasTempUploadsCompleted) {
          return 'Téléchargement terminé avec succès !';
        }
        return 'Document confirmé et sauvegardé !';
      case 'error':
        return 'Erreur lors du traitement.';
      case 'invalid':
        return 'Type de fichier non valide.';
      case 'size_error':
        return `Taille maximale dépassée (${maxFileSize} Ko).`;
      case 'multiple_files_error':
        return 'Sélectionnez un seul fichier à la fois.';
      default:
        return '';
    }
  };

  // Icônes SVG
  const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  const UploadIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );

  const FileIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
    </svg>
  );

  if (showConfirmations.length > 0) {
    const validFiles = showConfirmations.filter(conf => !conf.error).map(conf => ({
      sessionId: conf.sessionId,
      extractedData: conf.extractedData,
      filename: conf.file?.name
    }));
    const erroredFiles = showConfirmations.filter(conf => conf.error);

    const content = (
      <div
        className="modal-overlay"
        ref={overlayRef}
        onMouseDown={onBackdropClick}
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-container modal-container--large" ref={dialogRef}>
          <div className="modal-header">
            <div className="modal-header__content">
              <div className="modal-header__icon">✅</div>
              <h2 className="modal-title">Confirmation des documents</h2>
            </div>
            <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
              <CloseIcon />
            </button>
          </div>

          <div className="modal-body modal-body--scrollable">
            {erroredFiles.map((conf, idx) => (
              <div key={idx} className="alert alert--error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Erreur lors du traitement du fichier {conf.file.name}: {conf.error.message}
              </div>
            ))}
            
            {validFiles.length > 0 && (
              <DocumentConfirmationForm
                files={validFiles}
                onConfirm={async (confirmedDocuments, errors) => {
                  const hasError = errors.some(err => Object.keys(err).length > 0);
                  if (hasError) {
                    setUploadStatus('error');
                    alert('Veuillez corriger les erreurs dans tous les formulaires avant de confirmer.');
                    return;
                  }
                  setIsUploading(true);
                  setUploadStatus('confirming');
                  try {
                    for (let i = 0; i < validFiles.length; i++) {
                      const conf = showConfirmations.find(c => c.sessionId === validFiles[i].sessionId);
                      const doc = confirmedDocuments[i];
                      if (conf.sessionId && doc) {
                        const documentToConfirm = {
                          ...doc,
                          company_id: doc.company_id,
                          doctype_id: doc.doctype_id,
                          partner_id: doc.confirmed_data.partner_id || null,
                          confirmed_data: { ...doc.confirmed_data }
                        };
                        const response = await API.documents.confirmDocuments(conf.sessionId, [documentToConfirm]);
                        const savedDoc = response.data.saved_documents[0];
                        if (savedDoc && !savedDoc.error) {
                          onUpload({
                            id: savedDoc.document_id,
                            filename: savedDoc.filename,
                            is_invoice: savedDoc.is_invoice,
                            created_at: new Date().toISOString(),
                            status: 'confirmed',
                            partner_id: savedDoc.partner_id
                          });
                        }
                      }
                    }
                    window.dispatchEvent(new Event('FilesUploaded'));
                    setUploadStatus('completed');
                    setTimeout(() => {
                      onClose();
                    }, 2000);
                  } catch (error) {
                    setUploadStatus('error');
                    alert('Erreur lors de la confirmation: ' + (error.response?.data?.msg || error.message));
                  } finally {
                    setIsUploading(false);
                  }
                }}
                onCancel={onClose}
                initialCompany={selectedCompany}
                initialDoctype={selectedDoctype}
                hideConfirmButton={false}
              />
            )}
            
            {uploadStatus && (
              <div className={`alert alert--${uploadStatus.includes('error') ? 'error' : uploadStatus === 'completed' ? 'success' : 'info'}`}>
                {uploadStatus === 'completed' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                ) : uploadStatus.includes('error') ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                ) : (
                  <div className="spinner"></div>
                )}
                {getStatusMessage()}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    return createPortal(content, document.body);
  }

  const content = (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onMouseDown={onBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div className="modal-container modal-container--medium" ref={dialogRef}>
        <div className="modal-header">
          <div className="modal-header__content">
            <div className="modal-header__icon">📤</div>
            <h2 className="modal-title">Téléchargement de documents</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body modal-body--scrollable">
          {/* Section d'information - plus compacte */}
          {selectedCompany && selectedDoctype && (
            <div className="selection-info">
              <p><strong>Entité :</strong> {selectedCompany.name}</p>
              <p><strong>Type :</strong> {selectedDoctype.name}</p>
            </div>
          )}

          {/* Zone de dépôt - avec classe conditionnelle pour la taille */}
          <div 
            className={`drop-zone ${isDragging ? 'dragging' : ''} ${files.length ? 'has-file' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <div className="upload-icon">
                <UploadIcon />
              </div>
              <p>{files.length > 0 ? 'Ajouter plus de fichiers' : 'Glissez-déposez vos fichiers ici'}</p>
              <label className="file-input-label">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
                  onChange={handleFileChange}
                  className="file-input"
                  multiple
                />
                {files.length > 0 ? 'Ajouter' : 'Parcourir'}
              </label>
              <p className="file-types">
                PDF, JPG, PNG, TIFF, DOC, DOCX
              </p>
              {maxFileSize && (
                <p className="single-file-note">
                  Max : {maxFileSize} Ko
                </p>
              )}
            </div>
          </div>

          {/* Section des fichiers - plus compacte */}
          {files.length > 0 && (
            <div className="uploaded-files-section">
              <h4 className="uploaded-files-title">Fichiers ({files.length})</h4>
              <div className="uploaded-files-list">
                {files.map((file, idx) => (
                  <div key={idx} className="file-preview">
                    <div className="file-icon">
                      <FileIcon />
                    </div>
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <button
                      className="remove-file-btn"
                      onClick={() => removeFile(idx)}
                      disabled={isUploading}
                      aria-label={`Supprimer ${file.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barre de progression */}
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

          {/* Messages de statut */}
          {uploadStatus && (
            <div className={`status-message ${uploadStatus}`}>
              {getStatusMessage()}
            </div>
          )}
        </div>

        {/* Actions - toujours visibles en bas */}
        <div className="upload-actions">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose} 
            disabled={isUploading}
          >
            Annuler
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleUpload} 
            disabled={isUploading || files.length === 0}
          >
            {isUploading ? (
              <>
                <div className="spinner"></div>
                Traitement...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Télécharger ({files.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default DragDropUpload;

