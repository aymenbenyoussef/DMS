import React, { useState, useCallback, useContext, useEffect } from 'react';
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
  const [showConfirmations, setShowConfirmations] = useState([]); // [{sessionId, extractedData, file}]
  const [confirmationData, setConfirmationData] = useState([]); // [{confirmedDocument, errors}]
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
    // Accept if extension matches, even if type is empty
    return (
      (file.type && validTypes.includes(file.type)) ||
      validExtensions.some(ext => fileName.endsWith(ext))
    );
  };

  const handleUpload = useCallback(async () => {
    if (!files.length) return;
    
    // Check if company is selected (doctype is optional)
    const hasCompany = selectedCompany;
    
    if (!hasCompany) {
      // Use temp upload if no company selected
      setIsUploading(true);
      setUploadStatus('pending');
      setUploadProgress(0);
      let confirmations = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const response = await API.documents.uploadTempFile(file);
          confirmations.push({
            sessionId: null, // No session for temp uploads
            extractedData: null, // No OCR processing for temp uploads
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
    
    // Logic for when company is selected (doctype optional)
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
        selectedDoctype?.id || null // Use null if doctype not selected
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
    // Initialize confirmationData for each file
    setConfirmationData(confirmations.map(conf => ({ confirmedDocument: null, errors: {} })));
      setUploadStatus('processed');
    setIsUploading(false);
  }, [files, selectedCompany, selectedDoctype]);

  // Handler to update confirmation form data for each file
  const handleFormChange = (idx, confirmedDocument, errors) => {
    setConfirmationData(prev => {
      const updated = [...prev];
      updated[idx] = { confirmedDocument, errors };
      return updated;
    });
  };

  // Validate all forms and confirm all
  const handleConfirmAll = async () => {
    // Check if we have temp uploads (no company/doctype selected)
    const hasTempUploads = showConfirmations.some(conf => conf.isTempUpload);
    
    if (hasTempUploads) {
      // For temp uploads, just show success and close
      setUploadStatus('completed');
      setTimeout(() => {
        onClose();
      }, 2000);
      return;
    }
    
    // Original logic for regular uploads with company/doctype
    let hasError = false;
    // Check for errors in all forms
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

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'pending':
        return 'Processing file...';
      case 'processed':
        // Check if we have temp uploads
        const hasTempUploads = showConfirmations.some(conf => conf.isTempUpload);
        if (hasTempUploads) {
          return 'Files uploaded successfully to temporary storage.';
        }
        return 'File processed successfully. Please verify the information below.';
      case 'confirming':
        return 'Confirming...';
      case 'completed':
        const hasTempUploadsCompleted = showConfirmations.some(conf => conf.isTempUpload);
        if (hasTempUploadsCompleted) {
          return 'Files uploaded to temporary storage successfully!';
        }
        return 'Document confirmed and saved successfully!';
      case 'error':
        return 'Error during processing.';
      case 'invalid':
        return 'Invalid file type.';
      case 'size_error':
        return `La taille du fichier dépasse la limite maximale de ${maxFileSize} Ko.`;
      case 'multiple_files_error':
        return 'Please select only one file at a time.';
      default:
        return '';
    }
  };

  if (showConfirmations.length > 0) {
    // Filter out errored files for the form
    const validFiles = showConfirmations.filter(conf => !conf.error).map(conf => ({
      sessionId: conf.sessionId,
      extractedData: conf.extractedData,
      filename: conf.file?.name
    }));
    const erroredFiles = showConfirmations.filter(conf => conf.error);
    return (
      <div className="upload-modal-overlay">
        <div className="upload-modal confirmation-modal">
          <div className="upload-header">
            <h3>Confirmation des documents</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          {erroredFiles.map((conf, idx) => (
              <div key={idx} className="status-message error">
                Erreur lors du traitement du fichier{conf.file.name}: {conf.error.message}
              </div>
          ))}
          {validFiles.length > 0 && (
          <DocumentConfirmationForm
              files={validFiles}
              onConfirm={async (confirmedDocuments, errors) => {
                // If any errors, do not proceed
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
            <div className={`status-message ${uploadStatus}`}>
              {getStatusMessage()}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="upload-modal-overlay">
      <div className="upload-modal">
        <div className="upload-header">
          <h3>Téléchargement de documents</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="upload-content">
          {selectedCompany && selectedDoctype && (
            <div className="selection-info">
              <p><strong>Entité :</strong> {selectedCompany.name}</p>
              <p><strong>Type de document :</strong> {selectedDoctype.name}</p>
            </div>
          )}
          
          <div 
            className={`drop-zone ${isDragging ? 'dragging' : ''} ${files.length ? 'has-file' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <div className="upload-icon">📄</div>
              <p>Téléchargez votre/vos fichier(s) ici</p>
              <label className="file-input-label">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
                  onChange={handleFileChange}
                  className="file-input"
                  multiple
                />
                Parcourir les fichiers
              </label>
              <p className="file-types">
                Formats acceptés : PDF, JPG, PNG, TIFF, DOC, DOCX
              </p>
            </div>
          </div>
          
          {/* Section des fichiers téléchargés - maintenant en dehors de la drop-zone */}
          {files.length > 0 && (
            <div className="uploaded-files-section">
              <h4 className="uploaded-files-title">Fichiers sélectionnés ({files.length})</h4>
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
              Annuler
            </button>
            <button 
              className="btn-primary" 
              onClick={handleUpload}
              disabled={!files.length || isUploading || !selectedCompany}
            >
              {isUploading ? 'Treatment...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragDropUpload;