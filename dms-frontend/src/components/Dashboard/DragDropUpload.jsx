import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import API from '../../api';
import { AppContext, useNotification } from '../context';
import DocumentConfirmationForm from './DocumentConfirmationForm';
import './DragDropUpload.css';

const DragDropUpload = ({ onUpload, onClose }) => {
  const { showNotification } = useNotification();
  const { selectedCompany, selectedDoctype } = useContext(AppContext);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmations, setShowConfirmations] = useState([]);
  const [confirmationData, setConfirmationData] = useState([]);
  const [maxFileSize, setMaxFileSize] = useState(2014);
  const [currentStep, setCurrentStep] = useState(1);
  const [tempDocIdsToCleanup, setTempDocIdsToCleanup] = useState(new Set());
  const [uploadStatus, setUploadStatus] = useState('');

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Téléchargement en cours...';
      case 'confirming':
        return 'Confirmation en cours...';
      case 'completed':
        return 'Téléchargement terminé avec succès !';
      case 'error':
        return 'Une erreur est survenue.';
      default:
        return '';
    }
  };
  
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  // Verrouillage du défilement et gestion des touches
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        closeAndCleanup();
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
      showNotification('Type de fichier non valide.', 'error');
      return;
    }
    
    const oversizedFiles = droppedFiles.filter(file => file.size > maxFileSize * 1024);
    if (oversizedFiles.length > 0) {
      showNotification(`Taille maximale dépassée (${maxFileSize} Ko).`, 'error');
      return;
    }
    
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(isValidFileType);
    if (selectedFiles.length === 0) {
      showNotification('Type de fichier non valide.', 'error');
      return;
    }
    
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize * 1024);
    if (oversizedFiles.length > 0) {
      showNotification(`Taille maximale dépassée (${maxFileSize} Ko).`, 'error');
      return;
    }
    
    setFiles(prev => [...prev, ...selectedFiles]);
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
    setCurrentStep(2);
    // Always save uploads as temporary documents first so they are available
    // in the Temp Documents archive if the user doesn't complete confirmation.
    setIsUploading(true);
    showNotification('Traitement en cours...', 'info');
    setUploadProgress(0);

    let confirmations = [];

    try {
      // Upload all files to temp storage (backend will create temp documents)
      const tempResp = await API.tempDocuments.upload(files);
      // Notify other components (like the sidebar) that temp docs exist
      window.dispatchEvent(new Event('TempDocumentsUploaded'));

      const tempFiles = tempResp.data?.files || [];

      // For each original File, trigger OCR processing which returns a session id
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // try to find matching temp file entry by filename
        const matchedTemp = tempFiles.find(tf => tf.filename === file.name) || tempFiles[i];
        const tempDocId = matchedTemp?.id || null;
        try {
          const response = await API.documents.uploadSingleFile(
            file,
            selectedCompany?.id || null,
            selectedDoctype?.id || null
          );
          confirmations.push({
            sessionId: response.data?.session_id,
            extractedData: response.data?.extracted_data,
            file,
            tempDocId,
            isTempUpload: true
          });
        } catch (error) {
          console.error('Processing (OCR) failed for file:', file.name, error);
          // still keep the tempDocId so the file remains in temp storage
          confirmations.push({ error, file, tempDocId, isTempUpload: true });
        }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      // Track temp doc ids for cleanup on close
      setTempDocIdsToCleanup(new Set(tempFiles.map(tf => tf.id).filter(Boolean)));
    } catch (err) {
      // If temp upload as batch failed, fall back to per-file temp upload
      console.error('Batch temp upload failed, trying per-file upload', err);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const tempResp = await API.tempDocuments.upload([file]);
          const tempDocId = tempResp.data?.files?.[0]?.id || null;
          try {
            const response = await API.documents.uploadSingleFile(
              file,
              selectedCompany?.id || null,
              selectedDoctype?.id || null
            );
            confirmations.push({
              sessionId: response.data?.session_id,
              extractedData: response.data?.extracted_data,
              file,
              tempDocId,
              isTempUpload: true
            });
          } catch (error) {
            console.error('Processing (OCR) failed for file:', file.name, error);
            confirmations.push({ error, file, tempDocId, isTempUpload: true });
          }
        } catch (error) {
          console.error('Temp upload failed for file:', file.name, error);
          confirmations.push({ error, file });
        }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
    }

    setShowConfirmations(confirmations);
    // Also capture any collected temp ids from confirmations (fallback)
    setTempDocIdsToCleanup(prev => {
      const next = new Set(prev);
      confirmations.forEach(c => { if (c.tempDocId) next.add(c.tempDocId); });
      return next;
    });
    setConfirmationData(confirmations.map(conf => ({ confirmedDocument: null, errors: {} })));
    showNotification('Fichiers téléchargés avec succès.', 'success');
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

    // if temp uploads exist, we'll still perform validation and confirmation
    // and after successful confirmation we'll delete the corresponding temp documents
    
    let hasError = false;
    for (let i = 0; i < confirmationData.length; i++) {
      if (!confirmationData[i].confirmedDocument || Object.keys(confirmationData[i].errors).length > 0) {
        hasError = true;
        break;
      }
    }
    if (hasError) {
      showNotification('Veuillez corriger les erreurs dans tous les formulaires avant de confirmer.', 'error');
      return;
    }
    setIsUploading(true);
    showNotification('Confirmation en cours...', 'info');
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
            // If this file was stored as a temp document, delete the temp entry
            if (conf.tempDocId) {
              try {
                await API.tempDocuments.delete(conf.tempDocId);
                setTempDocIdsToCleanup(prev => { const next = new Set(prev); next.delete(conf.tempDocId); return next; });
                // notify other components that temp documents changed
                window.dispatchEvent(new Event('TempDocumentsUploaded'));
              } catch (delErr) {
                console.error('Failed to delete temp document', conf.tempDocId, delErr);
              }
            }
          }
        }
      }
      window.dispatchEvent(new Event('FilesUploaded'));
      showNotification('Téléchargement terminé avec succès !', 'success');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      showNotification('Erreur lors de la confirmation: ' + (error.response?.data?.msg || error.message), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onBackdropClick = (e) => {
    if (e.target === overlayRef.current) {
      closeAndCleanup();
    }
  };

  const closeAndCleanup = useCallback(async () => {
    try {
      const ids = Array.from(tempDocIdsToCleanup || []);
      if (ids.length > 0) {
        try {
          await Promise.allSettled(ids.map(id => API.tempDocuments.delete(id)));
        } catch (_) {}
      }
      // Notify listeners (e.g., sidebar) that temp documents changed
      window.dispatchEvent(new Event('TempDocumentsUploaded'));
      setTempDocIdsToCleanup(new Set());
    } finally {
      onClose?.();
    }
  }, [onClose, tempDocIdsToCleanup]);

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
  const getHeaderText = () => {
    return `Import vers DMS: Étape ${currentStep}/2 - Chargement`;
  };
  if (showConfirmations.length > 0) {
    const validFiles = showConfirmations.filter(conf => !conf.error).map(conf => ({
      sessionId: conf.sessionId,
      extractedData: conf.extractedData,
      filename: conf.file?.name,
      temp_id: conf.tempDocId || conf.temp_id || null
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
              
            <h2 className="modal-title">{getHeaderText()}</h2>
            </div>
            <button className="modal-close-btn" onClick={closeAndCleanup} aria-label="Fermer">
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
                            // delete temp document if present
                            if (conf.tempDocId) {
                              try {
                                await API.tempDocuments.delete(conf.tempDocId);
                                setTempDocIdsToCleanup(prev => { const next = new Set(prev); next.delete(conf.tempDocId); return next; });
                                window.dispatchEvent(new Event('TempDocumentsUploaded'));
                              } catch (delErr) {
                                console.error('Failed to delete temp document', conf.tempDocId, delErr);
                              }
                            }
                        }
                      }
                    }
                    window.dispatchEvent(new Event('FilesUploaded'));
                    setUploadStatus('completed');
                    setTimeout(() => {
                      closeAndCleanup();
                    }, 2000);
                  } catch (error) {
                    setUploadStatus('error');
                    alert('Erreur lors de la confirmation: ' + (error.response?.data?.msg || error.message));
                  } finally {
                    setIsUploading(false);
                  }
                }}
                onCancel={closeAndCleanup}
                initialCompany={selectedCompany}
                initialDoctype={selectedDoctype}
                hideConfirmButton={false}
              />
            )}
            
            {uploadStatus && validFiles.length === 0 && (
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
            <h2 className="modal-title">Import vers DMS: Étape 1/2 - Chargement</h2>
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
              <p>{files.length > 0 ? 'Ajouter plus de fichiers' : 'Glisser des fichiers ici'}</p>
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
                Formats acceptés: PDF, JPG, PNG, TIFF, DOC, DOCX
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

