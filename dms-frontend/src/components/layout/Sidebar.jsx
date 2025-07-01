import React, { useState, useEffect } from 'react';
import API from '../../api';
import './Sidebar.css';

const Sidebar = ({ isAdmin, userId }) => {
  const [folders, setFolders] = useState([]);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await API.get('/folders');
        setFolders(response.data.folders);
      } catch (err) {
        console.error('Failed to load folders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFolders();
  }, [userId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Folder name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await API.post('/folders', {
        name: newFolderName,
        parent_id: parentFolderId,
        user_id: userId
      });
      
      // Update the folders list with the new folder
      setFolders([...folders, response.data.folder]);
      setShowCreateFolderModal(false);
      setNewFolderName('');
      setParentFolderId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFolderClick = (folder) => {
    if (isAdmin) {
      setParentFolderId(folder.id);
      setShowCreateFolderModal(true);
    }
  };

  if (loading) {
    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <svg className="folder-icon" viewBox="0 0 24 24">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
          </svg>
          <span>Folders</span>
        </div>
        <div className="empty-folders">
          <p>Loading folders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <svg className="folder-icon" viewBox="0 0 24 24">
          <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
        </svg>
        <span>Folders</span>
      </div>

      {folders.length === 0 ? (
        <div className="empty-folders">
          <p>No folders found</p>
          {isAdmin && (
            <button 
              className="new-folder-btn"
              onClick={() => setShowCreateFolderModal(true)}
            >
              + New Folder
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="folder-list">
            {folders.map(folder => (
              <li 
                key={folder.id} 
                className="folder-item"
                onClick={() => handleFolderClick(folder)}
              >
                <svg className="folder-icon" viewBox="0 0 24 24">
                  <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
                </svg>
                <span>{folder.name}</span>
                {folder.parent_id && (
                  <span className="folder-path">(Subfolder)</span>
                )}
              </li>
            ))}
          </ul>
          {isAdmin && (
            <button 
              className="new-folder-btn"
              onClick={() => {
                setParentFolderId(null);
                setShowCreateFolderModal(true);
              }}
            >
              + New Root Folder
            </button>
          )}
        </>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Folder</h3>
            {parentFolderId && (
              <p className="modal-subtitle">
                Creating subfolder in: {folders.find(f => f.id === parentFolderId)?.name}
              </p>
            )}
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="search-input"
            />
            {error && <p className="error-message">{error}</p>}
            <div className="modal-actions">
              <button
                className="modal-cancel"
                onClick={() => {
                  setShowCreateFolderModal(false);
                  setNewFolderName('');
                  setError('');
                }}
              >
                Cancel
              </button>
              <button
                className="modal-confirm"
                onClick={handleCreateFolder}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;