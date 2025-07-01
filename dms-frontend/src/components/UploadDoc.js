import React, { useState, useCallback } from 'react';
import API from '../api';
import '../App.css';

const UploadDoc = ({ onUpload, onClose }) => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

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
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
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
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
        return validTypes.includes(file.type);
      });
    
    setFiles(selectedFiles);
  };

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus('pending');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const config = {
        onUploadProgress: progressEvent => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      };

      const res = await API.post('/upload', formData, config);
      
      setUploadStatus('completed');
      setUploadProgress(100);
      
      res.data.forEach(fileData => {
        const newDoc = {
          filename: fileData.originalName,
          summary: fileData.summary,
          raw_text: fileData.textContent,
          created_at: new Date().toISOString(),
          status: 'processed',
          fileType: fileData.type
        };
        onUpload(newDoc);
      });

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  }, [files, onUpload, onClose]);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Modal Header */}
        <div className="border-b p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Upload Documents</h2>
              <p className="text-sm text-gray-500">AI-powered document processing</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div 
          className={`drag-drop-area ${isDragging ? 'active' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-600">
              Drag and drop files here, or{' '}
              <label htmlFor="file-upload" className="text-blue-600 cursor-pointer">
                click to browse
              </label>
            </p>
            <p className="text-xs text-gray-500">Supports PDF, JPG, PNG, TIFF (max 10MB each)</p>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label 
              htmlFor="file-upload"
              className="btn-primary flex items-center px-4 py-2 text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Choose Files
            </label>
          </div>
        </div>

        {/* Selected Files Preview */}
        {files.length > 0 && (
          <div className="p-4 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Selected Files ({files.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm truncate max-w-xs">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)}MB • {file.type.split('/')[1].toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Info */}
        <div className="p-4 border-t">
          <h3 className="text-sm font-medium text-gray-700 mb-2">AI Processing</h3>
          <p className="text-xs text-gray-500">
            Documents will be automatically processed with OCR to extract text and identify invoices. 
            This may take a few moments depending on file size and complexity.
          </p>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="p-4 border-t">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Upload Status */}
        {uploadStatus === 'completed' && (
          <div className="p-4 bg-green-50 text-green-700 text-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Upload completed successfully! Documents are being processed.
            </div>
          </div>
        )}
        {uploadStatus === 'error' && (
          <div className="p-4 bg-red-50 text-red-700 text-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Upload failed. Please try again.
            </div>
          </div>
        )}
        {uploadStatus === 'invalid' && (
          <div className="p-4 bg-yellow-50 text-yellow-700 text-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Some files were invalid and weren't selected. Only PDF, JPG, PNG, and TIFF files are supported.
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end space-x-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className={`px-4 py-2 rounded text-white ${
              files.length === 0 || isUploading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isUploading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </span>
            ) : (
              'Upload Documents'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadDoc;