import React from 'react';
import '../App.css';


const DocGrid = ({ documents, onSelect }) => {
  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <p className="mt-2 text-gray-500">No documents found</p>
      </div>
    );
  }

  return (
    <div className="document-grid">
      {documents.map((doc, index) => (
        <div
          key={index}
          onClick={() => onSelect(doc)}
          className="document-item group"
        >
          <div className="flex items-center justify-center text-4xl mb-3 text-blue-600">
            {doc.fileType === 'pdf' ? (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="text-sm font-medium truncate">{doc.filename || 'Untitled'}</div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">
              {new Date(doc.created_at).toLocaleDateString()}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              doc.status === 'processed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {doc.status || 'pending'}
            </span>
          </div>
          <div className="absolute inset-0 group-hover:bg-blue-50 opacity-10 rounded-lg transition-colors"></div>
        </div>
      ))}
    </div>
  );
};

export default DocGrid;