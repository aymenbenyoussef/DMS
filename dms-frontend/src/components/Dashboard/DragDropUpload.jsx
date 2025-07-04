import React, { useState, useRef, useCallback } from 'react';

const DragDropUpload = ({ isOpen, onClose, onUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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

  const handleFiles = async (files) => {
    const validFiles = files.filter(file => 
      acceptedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024
    );

    if (validFiles.length === 0) {
      alert('Please select valid files (PDF, JPG, PNG, TIFF) under 10MB each.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const documents = [];

    // Create document objects
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const document = {
        id: `doc_${Date.now()}_${i}`,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadDate: new Date(),
        category: determineCategory(file.name),
        status: 'pending',
        file: file,
        tags: []
      };
      documents.push(document);
      setUploadProgress(((i + 1) / validFiles.length) * 50);
    }

    // Simulate OCR processing
    for (let i = 0; i < documents.length; i++) {
      try {
        documents[i].status = 'processing';
        
        // Simulate OCR progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          documents[i].ocrProgress = progress;
          setUploadProgress(50 + ((i + progress/100) / documents.length) * 50);
        }
        
        documents[i].status = 'processed';
        documents[i].extractedText = "Extracted text from OCR processing...";
        
        // If it's likely an invoice, extract structured data
        if (documents[i].category === 'invoice' || isInvoiceContent(documents[i].extractedText || "")) {
          documents[i].invoiceData = { total: 100.00, date: new Date() };
        }
        
      } catch (error) {
        console.error('OCR processing failed:', error);
        documents[i].status = 'error';
      }
    }

    onUpload(documents);
    setUploading(false);
    setUploadProgress(0);
    onClose();
  };

  const determineCategory = (fileName) => {
    const name = fileName.toLowerCase();
    if (name.includes('invoice') || name.includes('bill')) return 'invoice';
    if (name.includes('receipt')) return 'receipt';
    if (name.includes('contract')) return 'contract';
    return 'other';
  };

  const isInvoiceContent = (text) => {
    const invoiceKeywords = ['invoice', 'bill', 'amount due', 'total', 'subtotal', 'tax'];
    return invoiceKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Modal header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Upload Documents</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {/* Modal body */}
        <div className="p-6">
          {/* Drag & Drop Area */}
          <div 
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className={`p-4 rounded-full ${dragActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <svg 
                  className={`w-8 h-8 ${dragActive ? 'text-blue-600' : 'text-gray-600'}`}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Upload Documents
                </h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop files here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, JPG, PNG, TIFF (max 10MB each)
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={uploading}
                className="mt-4 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
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
              />
            </div>
          </div>
          
          {/* Upload progress */}
          {uploading && (
            <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium">Processing documents...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600">
                  Uploading files and extracting text using OCR
                </p>
              </div>
            </div>
          )}

          {/* Processing Information */}
          <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p className="font-medium text-blue-800">All Processing</p>
                <p className="text-blue-600 text-sm mt-1">
                  Documents will be automatically processed with OCR to extract text and identify invoices. 
                  This may take a few moments depending on file size and complexity.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Modal footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 text-white font-medium rounded-lg bg-blue-600 hover:bg-blue-700"
            disabled={uploading}
          >
            Select Files
          </button>
        </div>
      </div>
    </div>
  );
};

export default DragDropUpload;