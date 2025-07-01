import React from 'react';

const DocumentSection = ({ documents, searchQuery }) => {
  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="document-card flex-1">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Documents</h2>
        <span className="text-sm text-gray-500">{filteredDocs.length} items</span>
      </div>
      
      {filteredDocs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No documents found
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc, index) => (
            <div key={index} className="document-item">
              <div className="mr-3">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium">{doc.filename}</div>
                <div className="text-xs text-gray-500">
                  {new Date(doc.created_at).toLocaleDateString()} • 
                  <span className="ml-2 status-badge status-pending">
                    {doc.status || 'pending'}
                  </span>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-800 text-sm">
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentSection;