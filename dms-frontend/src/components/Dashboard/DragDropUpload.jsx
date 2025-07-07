import React, { useState, useRef, useCallback, useEffect } from 'react';
import api from '../../api'; 
import './DragDropUpload.css';

const DragDropUpload = ({  
  onClose, 
  onUpload, 
  companies = [], 
  doctypes = [],
  selectedCompany: propSelectedCompany, 
  selectedFolder: propSelectedFolder    
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileValidation, setFileValidation] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedDoctype, setSelectedDoctype] = useState(null);
  const [extractedData, setExtractedData] = useState([]);
  const [confirmedData, setConfirmedData] = useState({});
  const fileInputRef = useRef(null);

  const acceptedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff'
  ];

  // Initialize selections from props
  useEffect(() => {
    setSelectedCompany(propSelectedCompany);
  }, [propSelectedCompany]);

  useEffect(() => {
    setSelectedDoctype(propSelectedFolder);
  }, [propSelectedFolder]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    const validFiles = files.filter(file => 
      acceptedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024
    );

    if (validFiles.length === 0) {
      alert('Please select valid files (PDF, JPG, PNG, TIFF) under 10MB each.');
      return;
    }

    const newFiles = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      size: file.size,
      file: file
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    setFileValidation(true);
  };

  const removeFile = (id) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
    if (selectedFiles.length <= 1) {
      setFileValidation(false);
    }
  };

  const startUpload = async () => {
    if (selectedFiles.length === 0 || !selectedCompany || !selectedDoctype) {
      alert('Please select files, company, and document type');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    
    // Actual API call
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file.file);
    });
    formData.append('company_id', selectedCompany.id);
    formData.append('doctype_id', selectedDoctype.id);

    try {
      const response = await api.documents.uploadFiles(formData);
      setExtractedData(response.data);
      setIsUploading(false);
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error.response?.data?.msg || error.message));
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFieldChange = (docId, field, value) => {
    setConfirmedData(prev => ({
      ...prev,
      [docId]: {
        ...(prev[docId] || {}),
        [field]: value
      }
    }));
  };

  const handleConfirm = async (docId) => {
    const dataToConfirm = confirmedData[docId];
    if (!dataToConfirm) {
      alert('No changes to confirm');
      return;
    }
    
    try {
      await api.documents.confirmDocument(docId, dataToConfirm);
      setExtractedData(prev => prev.filter(doc => doc.document_id !== docId));
      alert('Document confirmed successfully');
      
      // Close modal if all documents are confirmed
      if (extractedData.length <= 1) {
        onClose();
      }
    } catch (error) {
      console.error('Confirmation failed:', error);
      alert('Confirmation failed: ' + (error.response?.data?.msg || error.message));
    }
  };

  return (
    <div className="drag-drop-upload-modal">
     
      <div className="modal-container">
        <div className="modal-header">
          <h3 className="modal-title">Upload Documents</h3>
          <button 
            onClick={onClose}
            className="close-button"
            disabled={isUploading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          {/* Company and Document Type Selection */}
          <div className="selection-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Company
              </label>
              <select 
                value={selectedCompany ? selectedCompany.id : ''}
                onChange={(e) => {
                  const company = companies.find(c => c.id === e.target.value);
                  setSelectedCompany(company);
                }}
                disabled={isUploading}
                className="selection-dropdown"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff'
                }}
              >
                <option value="">Select Company</option>
                {companies.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Document Type
              </label>
              <select 
                value={selectedDoctype ? selectedDoctype.id : ''}
                onChange={(e) => {
                  const doctype = doctypes.find(d => d.id === e.target.value);
                  setSelectedDoctype(doctype);
                }}
                disabled={isUploading}
                className="selection-dropdown"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff'
                }}
              >
                <option value="">Select Document Type</option>
                {doctypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Drag & Drop Area */}
          <div 
            className={`drag-drop-area ${dragActive ? 'active' : ''} ${isUploading ? 'disabled' : ''}`}
            onDragEnter={isUploading ? undefined : handleDrag}
            onDragLeave={isUploading ? undefined : handleDrag}
            onDragOver={isUploading ? undefined : handleDrag}
            onDrop={isUploading ? undefined : handleDrop}
            onClick={isUploading ? undefined : () => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="drag-icon-container">
                <svg 
                  className="drag-icon"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="1.5" 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
              </div>
              
              <div>
                <h3 className="upload-title">
                  Upload Documents
                </h3>
                <p className="upload-instructions">
                  Drag and drop files here, or click to browse
                </p>
                <p className="file-types">
                  Supports PDF, JPG, PNG, TIFF (max 10MB each)
                </p>
              </div>  

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.tiff"
                onChange={handleFileInput}
                className="hidden"
                disabled={isUploading}
              />
            </div>
          </div>
          
          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="selected-files-container">
              <h4 className="selected-files-title">Selected Files</h4>
              <ul className="file-list">
                {selectedFiles.map(file => (
                  <li key={file.id} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <button 
                      className="remove-file-btn"
                      onClick={() => removeFile(file.id)}
                      disabled={isUploading}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Upload progress */}
          {isUploading && (
            <div className="upload-progress-container">
              <div className="progress-indicator">
                <div className="spinner rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">Uploading documents...</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Extracted Data Forms */}
          {extractedData.length > 0 && (
            <div className="extracted-data-container">
              <h4 className="extracted-data-title">Confirm Document Information</h4>
              {extractedData.map((doc) => {
                const docData = doc.extracted_data || {};
                const isInvoice = docData.is_invoice;
                
                return (
                  <div key={doc.document_id} className="document-form">
                    <h5 className="document-title">{doc.filename}</h5>
                    
                    <div className="form-fields">
                      <div className="form-group">
                        <label>Document Type</label>
                        <select
                          defaultValue={isInvoice ? 'invoice' : 'other'}
                          onChange={(e) => handleFieldChange(
                            doc.document_id, 
                            'is_invoice', 
                            e.target.value === 'invoice'
                          )}
                        >
                          <option value="other">Other Document</option>
                          <option value="invoice">Invoice</option>
                        </select>
                      </div>
                      
                      {isInvoice && (
                        <>
                          <div className="form-group">
                            <label>Invoice Number</label>
                            <input 
                              type="text"
                              defaultValue={docData.invoice_number || ''}
                              onChange={(e) => handleFieldChange(
                                doc.document_id, 
                                'invoice_number', 
                                e.target.value
                              )}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Date</label>
                            <input 
                              type="date"
                              defaultValue={docData.date || ''}
                              onChange={(e) => handleFieldChange(
                                doc.document_id, 
                                'date', 
                                e.target.value
                              )}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Total Value</label>
                            <input 
                              type="number"
                              step="0.01"
                              defaultValue={docData.total || ''}
                              onChange={(e) => handleFieldChange(
                                doc.document_id, 
                                'total', 
                                parseFloat(e.target.value)
                              )}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Vendor</label>
                            <input 
                              type="text"
                              defaultValue={docData.vendor || ''}
                              onChange={(e) => handleFieldChange(
                                doc.document_id, 
                                'vendor', 
                                e.target.value
                              )}
                            />
                          </div>
                        </>
                      )}
                      
                      <div className="form-group">
                        <label>Document Title</label>
                        <input 
                          type="text"
                          defaultValue={docData.title || doc.filename}
                          onChange={(e) => handleFieldChange(
                            doc.document_id, 
                            'title', 
                            e.target.value
                          )}
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleConfirm(doc.document_id)}
                      className="confirm-button"
                    >
                      Confirm
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Processing Information - Only show when not showing extracted data */}
          {extractedData.length === 0 && (
            <div className="processing-info">
              <div>
                <p className="info-title">All Processing</p>
                <p className="info-text">
                  Documents will be automatically processed with OCR to extract text and identify invoices. 
                  This may take a few moments depending on file size and complexity.
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button
            onClick={onClose}
            className="cancel-button"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={startUpload}
            className={`select-files-button ${fileValidation ? 'validation-active' : ''}`}
            disabled={isUploading || !fileValidation || !selectedCompany || !selectedDoctype}
          >
            {fileValidation ? 'Upload Documents' : 'Select Files'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DragDropUpload;