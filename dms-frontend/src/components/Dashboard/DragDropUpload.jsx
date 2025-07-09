import React, { useState, useCallback, useContext } from 'react';
import API from '../../api';
import { AppContext } from '../context';
import './DragDropUpload.css';

const DragDropUpload = ({ onUpload, onClose }) => {
  const { selectedCompany, selectedDoctype } = useContext(AppContext);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [confirmedDocument, setConfirmedDocument] = useState(null);

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
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 1) {
      setUploadStatus('multiple_files_error');
      return;
    }
    
    const droppedFile = droppedFiles[0];
    if (droppedFile && isValidFileType(droppedFile)) {
      setFile(droppedFile);
      setUploadStatus(null);
    } else {
      setUploadStatus('invalid');
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 1) {
      setUploadStatus('multiple_files_error');
      return;
    }
    
    const selectedFile = selectedFiles[0];
    if (selectedFile && isValidFileType(selectedFile)) {
      setFile(selectedFile);
      setUploadStatus(null);
    } else {
      setUploadStatus('invalid');
    }
  };

  const isValidFileType = (file) => {
    const validTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/png', 
      'image/tiff', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    return validTypes.includes(file.type);
  };

  const handleUpload = useCallback(async () => {
    if (!file) return;
    if (!selectedCompany || !selectedDoctype) {
      setUploadStatus('error');
      alert('Veuillez sélectionner une entreprise et un type de document.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('pending');
    setUploadProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Upload single file with OCR processing
      const response = await API.documents.uploadSingleFile(
        file, 
        selectedCompany.name, 
        selectedDoctype.name
      );
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('processed');
      
      // Store session data for confirmation
      setSessionId(response.data?.session_id);
      setExtractedData(response.data?.extracted_data);
      
      // Initialize confirmed document with extracted data
      const initialConfirmedDoc = {
        filename: file.name,
        company: selectedCompany.name,
        doctype: selectedDoctype.name,
        is_invoice: response.data?.extracted_data?.is_invoice || false,
        confirmed_data: {
          invoice_number: response.data?.extracted_data?.invoice_number || '',
          date: response.data?.extracted_data?.date || '',
          vendor: response.data?.extracted_data?.vendor || '',
          client: response.data?.extracted_data?.client || '',
          total_ht: response.data?.extracted_data?.total_ht || '',
          tva: response.data?.extracted_data?.tva || '',
          total_ttc: response.data?.extracted_data?.total_ttc || '',
          is_invoice: response.data?.extracted_data?.is_invoice || false
        }
      };
      
      setConfirmedDocument(initialConfirmedDoc);
      setShowConfirmation(true);
      
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload failed:', error);
      setUploadStatus('error');
      alert('Erreur lors de l\'upload: ' + (error.response?.data?.msg || error.message));
    } finally {
      setIsUploading(false);
    }
  }, [file, selectedCompany, selectedDoctype]);

  const handleConfirmDocument = useCallback(async () => {
    if (!sessionId || !confirmedDocument) return;

    setIsUploading(true);
    setUploadStatus('confirming');

    try {
      const response = await API.documents.confirmDocuments(sessionId, [confirmedDocument]);
      
      setUploadStatus('completed');
      
      // Notify parent component about successful upload
      const savedDoc = response.data.saved_documents[0];
      if (savedDoc && !savedDoc.error) {
        onUpload({
          id: savedDoc.document_id,
          filename: savedDoc.filename,
          is_invoice: savedDoc.is_invoice,
          created_at: new Date().toISOString(),
          status: 'confirmed'
        });
      }

      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Confirmation failed:', error);
      setUploadStatus('error');
      alert('Erreur lors de la confirmation: ' + (error.response?.data?.msg || error.message));
    } finally {
      setIsUploading(false);
    }
  }, [sessionId, confirmedDocument, onUpload, onClose]);

  const updateConfirmedDocument = (field, value) => {
    setConfirmedDocument(prev => {
      const updated = { ...prev };
      if (field === 'is_invoice') {
        updated.is_invoice = value;
        updated.confirmed_data.is_invoice = value;
      } else {
        updated.confirmed_data[field] = value;
      }
      return updated;
    });
  };

  const removeFile = () => {
    setFile(null);
    setUploadStatus(null);
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'pending':
        return 'Processing file...';
      case 'processed':
        return 'File processed successfully. Please verify the information below.';
      case 'confirming':
        return 'Confirming...';
      case 'completed':
        return 'Document confirmed and saved successfully!';
      case 'error':
        return 'Error during processing.';
      case 'invalid':
        return 'Invalid file type.';
      case 'multiple_files_error':
        return 'Please select only one file at a time.';
      default:
        return '';
    }
};

  if (showConfirmation) {
    return (
      <div className="upload-modal-overlay">
        <div className="upload-modal confirmation-modal">
          <div className="upload-header">
            <h3>Document confirmation</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="confirmation-content">
            <p className="confirmation-info">
              Check and modify the extracted information if necessary:
            </p>
            
            <div className="document-form">
              <h4 className="document-title">{confirmedDocument?.filename}</h4>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Entity:</label>
                  <input 
                    type="text" 
                    value={confirmedDocument?.company || ''} 
                    disabled 
                    className="readonly-input"
                  />
                </div>
                <div className="form-group">
                  <label>Data Type:</label>
                  <input 
                    type="text" 
                    value={confirmedDocument?.doctype || ''} 
                    disabled 
                    className="readonly-input"
                  />
                </div>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={confirmedDocument?.is_invoice || false}
                    onChange={(e) => updateConfirmedDocument('is_invoice', e.target.checked)}
                  />
                  this file is an invoice
                </label>
              </div>
              
              {confirmedDocument?.is_invoice && (
                <div className="invoice-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Invoice number:</label>
                      <input
                        type="text"
                        value={confirmedDocument?.confirmed_data?.invoice_number || ''}
                        onChange={(e) => updateConfirmedDocument('invoice_number', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Date:</label>
                      <input
                        type="date"
                        value={confirmedDocument?.confirmed_data?.date || ''}
                        onChange={(e) => updateConfirmedDocument('date', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Fournisseur:</label>
                      <input
                        type="text"
                        value={confirmedDocument?.confirmed_data?.vendor || ''}
                        onChange={(e) => updateConfirmedDocument('vendor', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Client:</label>
                      <input
                        type="text"
                        value={confirmedDocument?.confirmed_data?.client || ''}
                        onChange={(e) => updateConfirmedDocument('client', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Total HT (€):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={confirmedDocument?.confirmed_data?.total_ht || ''}
                        onChange={(e) => updateConfirmedDocument('total_ht', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="form-group">
                      <label>TVA (€):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={confirmedDocument?.confirmed_data?.tva || ''}
                        onChange={(e) => updateConfirmedDocument('tva', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Total TTC (€):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={confirmedDocument?.confirmed_data?.total_ttc || ''}
                        onChange={(e) => updateConfirmedDocument('total_ttc', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {uploadStatus && (
              <div className={`status-message ${uploadStatus}`}>
                {getStatusMessage()}
              </div>
            )}
            
            <div className="confirmation-actions">
              <button 
                className="btn-secondary" 
                onClick={onClose}
                disabled={isUploading}
              >
                Annuler
              </button>
              <button 
                className="btn-primary" 
                onClick={handleConfirmDocument}
                disabled={isUploading}
              >
                {isUploading ? 'Confirmation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-modal-overlay">
      <div className="upload-modal">
        <div className="upload-header">
          <h3>Upload de document</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="upload-content">
          {selectedCompany && selectedDoctype && (
            <div className="selection-info">
              <p><strong>Entreprise:</strong> {selectedCompany.name}</p>
              <p><strong>Type de document:</strong> {selectedDoctype.name}</p>
            </div>
          )}
          
          <div 
            className={`drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              {!file ? (
                <>
                  <div className="upload-icon">📄</div>
                  <p>Glissez-déposez votre fichier ici ou</p>
                  <label className="file-input-label">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx"
                      onChange={handleFileChange}
                      className="file-input"
                    />
                    Parcourir les fichiers
                  </label>
                  <p className="file-types">
                    Formats acceptés: PDF, JPG, PNG, TIFF, DOC, DOCX
                  </p>
                  <p className="single-file-note">
                    ⚠️ Un seul fichier à la fois
                  </p>
                </>
              ) : (
                <div className="file-preview">
                  <div className="file-icon">📄</div>
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button 
                    className="remove-file-btn"
                    onClick={removeFile}
                    disabled={isUploading}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
          
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
              disabled={!file || isUploading || !selectedCompany || !selectedDoctype}
            >
              {isUploading ? 'Traitement...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragDropUpload;
