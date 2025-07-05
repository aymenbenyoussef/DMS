import React, { useState, useRef, useCallback } from 'react';
import './DragDropUpload.css';

const DragDropUpload = ({ onClose, onUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileValidation, setFileValidation] = useState(false);
  const fileInputRef = useRef(null);

  const acceptedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff'
  ];

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

    // Create document objects with minimal metadata
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

  const startUpload = () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          // Pass to parent component after upload simulation
          setTimeout(() => {
            onUpload(selectedFiles);
            setIsUploading(false);
            setUploadProgress(0);
            setSelectedFiles([]);
            setFileValidation(false);
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="drag-drop-upload-modal">
      <div className="modal-container">
        {/* Modal header */}
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
        
        {/* Modal body */}
        <div className="modal-body">
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

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
                className="choose-files-button"
              >
                Choose Files
              </button>

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

          {/* Processing Information */}
          <div className="processing-info">
            <div>
              <p className="info-title">All Processing</p>
              <p className="info-text">
                Documents will be automatically processed with OCR to extract text and identify invoices. 
                This may take a few moments depending on file size and complexity.
              </p>
            </div>
          </div>
        </div>
        
        {/* Modal footer */}
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
            disabled={isUploading}
          >
            {fileValidation ? 'Upload Documents' : 'Select Files'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DragDropUpload;  