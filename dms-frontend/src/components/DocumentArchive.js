import React from 'react';

const DocumentArchive = () => {
  return (
    <div className="document-archive">
      <div className="archive-header">
        <h1 className="archive-title">Document Archive</h1>
        <button className="new-folder-btn">
          + New Folder
        </button>
      </div>

      <div className="breadcrumb">DMS › DMS-M1 Documents</div>

      <div className="stats-container">
        <div className="stat-card">
          <h3>Total Documents</h3>
          <p>0 Active</p>
        </div>
        <div className="stat-card">
          <h3>Invoices</h3>
          <p>0 Active</p>
        </div>
        <div className="stat-card">
          <h3>Processed</h3>
          <p>0 Active</p>
        </div>
      </div>

      <div className="search-section">
        <h2>Search & Filter</h2>
        <div className="search-controls">
          <input 
            type="text" 
            placeholder="Search documents..." 
            className="search-input"
          />
          <button className="upload-btn">
            Search
          </button>
        </div>
      </div>

      <div className="documents-container">
        <div className="main-documents">
          <div className="section-header">
            <h2>Documents</h2>
            <span>0 items</span>
          </div>
          <div className="empty-state">
            No documents found
          </div>
        </div>

        <div className="recent-documents">
          <h2>Recent Documents</h2>
          <div className="empty-state">
            No recent documents
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentArchive;