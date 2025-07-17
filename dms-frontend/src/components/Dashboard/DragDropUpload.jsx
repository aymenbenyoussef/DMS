import React, { useState, useCallback, useContext } from 'react';
import API from '../../api';
import { AppContext } from '../context';
import DocumentConfirmationForm from './DocumentConfirmationForm';
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
        selectedCompany.id, 
        selectedDoctype.id
      );
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('processed');
      
      // Store session data for confirmation
      setSessionId(response.data?.session_id);
      setExtractedData(response.data?.extracted_data);
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

  const handleConfirmDocument = useCallback(async (confirmedDocument) => {
    if (!sessionId) return;

    setIsUploading(true);
    setUploadStatus('confirming');

    try {
      const documentToConfirm = {
        ...confirmedDocument,
        partner_id: confirmedDocument.confirmed_data.partner_id || null, // <-- FIX: set at top level
        confirmed_data: {
          ...confirmedDocument.confirmed_data
        }
      };
      const response = await API.documents.confirmDocuments(sessionId, [documentToConfirm]);
      
      setUploadStatus('completed');
      
      // Notify parent component about successful upload
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
  }, [sessionId, onUpload, onClose]);

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
          
          <DocumentConfirmationForm
            sessionId={sessionId}
            extractedData={extractedData}
            filename={file?.name}
            onConfirm={handleConfirmDocument}
            onCancel={onClose}
            initialCompany={selectedCompany}
            initialDoctype={selectedDoctype}
          />
          
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
          <h3>Document Upload</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="upload-content">
          {selectedCompany && selectedDoctype && (
            <div className="selection-info">
              <p><strong>Entity :</strong> {selectedCompany.name}</p>
              <p><strong>Document Type :</strong> {selectedDoctype.name}</p>
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
                  <p>Upload Your File Here</p>
                  <label className="file-input-label">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx"
                      onChange={handleFileChange}
                      className="file-input"
                    />
                    Browse Files
                  </label>
                  <p className="file-types">
                    Accepted Format : PDF, JPG, PNG, TIFF, DOC, DOCX
                  </p>
                  <p className="single-file-note">
                    ⚠️ Only one file at a time
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
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={handleUpload}
              disabled={!file || isUploading || !selectedCompany || !selectedDoctype}
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