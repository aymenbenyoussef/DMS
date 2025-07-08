import React, { useState, useCallback, useContext } from 'react';
import API from '../../api';
import { AppContext } from '../context';
import './DragDropUpload.css';

const DragDropUpload = ({ onUpload, onClose }) => {
  const { selectedCompany, selectedFolder } = useContext(AppContext);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [formsData, setFormsData] = useState([]);
  const [confirmedDocuments, setConfirmedDocuments] = useState([]);

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
    
    const droppedFiles = Array.from(e.dataTransfer.files)
      .filter(file => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        return validTypes.includes(file.type);
      });
    
    if (droppedFiles.length !== e.dataTransfer.files.length) {
      setUploadStatus('invalid');
    }
    
    setFiles(droppedFiles);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
      .filter(file => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        return validTypes.includes(file.type);
      });
    
    setFiles(selectedFiles);
  };

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;
    if (!selectedCompany || !selectedFolder) {
      setUploadStatus('error');
      alert('Veuillez sélectionner une entreprise et un type de document.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('pending');
    setUploadProgress(0);

    try {
      // Use the new uploadMultipleFiles function
      const response = await API.documents.uploadMultipleFiles(
        files, 
        selectedCompany.name, 
        selectedFolder.name
      );
      
      setUploadStatus('processed');
      setUploadProgress(100);
      
      // Store session data for confirmation
      setSessionId(response.data.session_id);
      setFormsData(response.data.forms_data);
      
      // Initialize confirmed documents with extracted data
      const initialConfirmedDocs = response.data.forms_data.map(formData => ({
        filename: formData.filename,
        company: formData.company,
        doctype: formData.doctype,
        is_invoice: formData.extracted_data.is_invoice || false,
        confirmed_data: {
          invoice_number: formData.extracted_data.invoice_number || '',
          date: formData.extracted_data.date || '',
          vendor: formData.extracted_data.vendor || '',
          client: formData.extracted_data.client || '',
          total_ht: formData.extracted_data.total_ht || '',
          tva: formData.extracted_data.tva || '',
          total_ttc: formData.extracted_data.total_ttc || '',
          is_invoice: formData.extracted_data.is_invoice || false
        }
      }));
      
      setConfirmedDocuments(initialConfirmedDocs);
      setShowConfirmation(true);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
      alert('Erreur lors de l\'upload: ' + (error.response?.data?.msg || error.message));
    } finally {
      setIsUploading(false);
    }
  }, [files, selectedCompany, selectedFolder]);

  const handleConfirmDocuments = useCallback(async () => {
    if (!sessionId || confirmedDocuments.length === 0) return;

    setIsUploading(true);
    setUploadStatus('confirming');

    try {
      const response = await API.documents.confirmDocuments(sessionId, confirmedDocuments);
      
      setUploadStatus('completed');
      
      // Notify parent component about successful upload
      response.data.saved_documents.forEach(doc => {
        if (!doc.error) {
          onUpload({
            id: doc.document_id,
            filename: doc.filename,
            is_invoice: doc.is_invoice,
            created_at: new Date().toISOString(),
            status: 'confirmed'
          });
        }
      });

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
  }, [sessionId, confirmedDocuments, onUpload, onClose]);

  const updateConfirmedDocument = (index, field, value) => {
    setConfirmedDocuments(prev => {
      const updated = [...prev];
      if (field === 'is_invoice') {
        updated[index].is_invoice = value;
        updated[index].confirmed_data.is_invoice = value;
      } else {
        updated[index].confirmed_data[field] = value;
      }
      return updated;
    });
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'pending':
        return 'Traitement des fichiers en cours...';
      case 'processed':
        return 'Fichiers traités avec succès. Vérifiez les informations ci-dessous.';
      case 'confirming':
        return 'Confirmation en cours...';
      case 'completed':
        return 'Documents confirmés et sauvegardés avec succès!';
      case 'error':
        return 'Erreur lors du traitement.';
      case 'invalid':
        return 'Certains fichiers ne sont pas valides.';
      default:
        return '';
    }
  };

  if (showConfirmation) {
    return (
      <div className="upload-modal-overlay">
        <div className="upload-modal confirmation-modal">
          <div className="upload-header">
            <h3>Confirmation des documents</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="confirmation-content">
            <p className="confirmation-info">
              Vérifiez et modifiez les informations extraites si nécessaire :
            </p>
            
            {formsData.map((formData, index) => (
              <div key={index} className="document-form">
                <h4 className="document-title">{formData.filename}</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Entreprise:</label>
                    <input 
                      type="text" 
                      value={formData.company} 
                      disabled 
                      className="readonly-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Type de document:</label>
                    <input 
                      type="text" 
                      value={formData.doctype} 
                      disabled 
                      className="readonly-input"
                    />
                  </div>
                </div>
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={confirmedDocuments[index]?.is_invoice || false}
                      onChange={(e) => updateConfirmedDocument(index, 'is_invoice', e.target.checked)}
                    />
                    Ce document est une facture
                  </label>
                </div>
                
                {confirmedDocuments[index]?.is_invoice && (
                  <div className="invoice-fields">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Numéro de facture:</label>
                        <input
                          type="text"
                          value={confirmedDocuments[index]?.confirmed_data?.invoice_number || ''}
                          onChange={(e) => updateConfirmedDocument(index, 'invoice_number', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Date:</label>
                        <input
                          type="date"
                          value={confirmedDocuments[index]?.confirmed_data?.date || ''}
                          onChange={(e) => updateConfirmedDocument(index, 'date', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Fournisseur:</label>
                        <input
                          type="text"
                          value={confirmedDocuments[index]?.confirmed_data?.vendor || ''}
                          onChange={(e) => updateConfirmedDocument(index, 'vendor', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Client:</label>
                        <input
                          type="text"
                          value={confirmedDocuments[index]?.confirmed_data?.client || ''}
                          onChange={(e) => updateConfirmedDocument(index, 'client', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Total HT (€):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={confirmedDocuments[index]?.confirmed_data?.total_ht || ''}
                          onChange={(e) => updateConfirmedDocument(index, 'total_ht', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="form-group">
                        <label>TVA (€):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={confirmedDocuments[index]?.confirmed_data?.tva || ''}
                          onChange={(e) => updateConfirmedDocument(index, 'tva', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Total TTC (€):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={confirmedDocuments[index]?.confirmed_data?.total_ttc || ''}
                          onChange={(e) => updateConfirmedDocument(index, 'total_ttc', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
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
                onClick={handleConfirmDocuments}
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
          <h3>Upload de documents</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="upload-content">
          {selectedCompany && selectedFolder && (
            <div className="selection-info">
              <p><strong>Entreprise:</strong> {selectedCompany.name}</p>
              <p><strong>Type de document:</strong> {selectedFolder.name}</p>
            </div>
          )}
          
          <div 
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <div className="upload-icon">📁</div>
              <p>Glissez-déposez vos fichiers ici ou</p>
              <label className="file-input-label">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx"
                  onChange={handleFileChange}
                  className="file-input"
                />
                Parcourir les fichiers
              </label>
              <p className="file-types">
                Formats acceptés: PDF, JPG, PNG, TIFF, DOC, DOCX
              </p>
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="file-list">
              <h4>Fichiers sélectionnés ({files.length}):</h4>
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  <button 
                    className="remove-file-btn"
                    onClick={() => removeFile(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
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
              disabled={files.length === 0 || isUploading || !selectedCompany || !selectedFolder}
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