import React from 'react';
import '../App.css';

const DocViewer = ({ doc }) => {
  if (!doc) {
    return (
      <div className="document-viewer flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <p className="mt-2">Select a document to view details</p>
        </div>
      </div>
    );
  }

  const downloadText = () => {
    const blob = new Blob([doc.raw_text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${doc.filename || 'document'}_report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="document-viewer">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            {doc.fileType === 'pdf' ? (
              <svg className="w-8 h-8 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            {doc.filename || 'Document'}
          </h2>
          <div className="text-sm text-gray-500 mt-1">
            Uploaded: {new Date(doc.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={downloadText}
            className="btn-primary flex items-center px-3 py-1 text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          AI Summary
        </h3>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <p className="text-gray-700 whitespace-pre-wrap">
            {doc.summary || 'No summary available. This document has not been processed yet.'}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Extracted Text
        </h3>
        <pre className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-96 overflow-auto text-gray-700 text-sm">
          {doc.raw_text || 'No extracted text available. This document has not been processed yet.'}
        </pre>
      </div>
    </div>
  );
};

export default DocViewer;