import React from 'react';

const RecentDocuments = ({ documents }) => {
  const recentDocs = documents.slice(0, 4);

  return (
    <div className="document-card lg:w-80">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Documents</h2>
      
      {recentDocs.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No recent documents
        </div>
      ) : (
        <div className="space-y-3">
          {recentDocs.map((doc, index) => (
            <div key={index} className="document-item">
              <div className="mr-3">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium truncate">{doc.filename}</div>
                <div className="text-xs text-gray-500">
                  {new Date(doc.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className="text-xs text-red-500">error</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentDocuments;