// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import API from '../../api';
import './Sidebar.css';

const Sidebar = ({ isAdmin, userId }) => {
  const [folders, setFolders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await API.folders.getAll();
        setFolders(response.data);
      } catch (err) {
        setError('Erreur lors du chargement des dossiers');
        console.error(err);
      }
    };

    fetchFolders();

    const onFolderCreated = () => {
      fetchFolders();}
    window.addEventListener("folderCreated", onFolderCreated);

    return () => {
      window.removeEventListener("folderCreated", onFolderCreated);
    };
  }, []);

  const openCreateModal = (parentId = null) => {
    setParentFolderId(parentId);
    setNewFolderName('');
    setError('');
    setShowModal(true);
  };

  const closeCreateModal = () => {
    setShowModal(false);
    setNewFolderName('');
    setParentFolderId(null);
    setError('');
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Le nom du dossier est requis.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await API.post('/folders', {
        name: newFolderName.trim(),
        parent_id: parentFolderId,
        user_id: userId
      });

      setFolders(prev => [...prev, response.data.folder]);
      closeCreateModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la création du dossier');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) return <div className="sidebar-error">{error}</div>;

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <svg className="folder-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
        </svg>
        <h2>Folders</h2>
      </header>

      {folders.length === 0 ? (
        <section className="empty-folders">
          <p>Aucun dossier trouvé</p>
          {isAdmin && (
            <button
              className="btn-new-folder"
              onClick={() => openCreateModal()}
              aria-label="Créer un nouveau dossier"
            >
              + Nouveau dossier
            </button>
          )}
        </section>
      ) : (
        <>
          <ul className="folder-list" role="list">
            {folders.map(folder => (
              <li
                key={folder.id}
                className="folder-item"
                tabIndex={0}
                role="button"
                onClick={() => isAdmin && openCreateModal(folder.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && isAdmin) openCreateModal(folder.id);
                }}
                aria-label={`Dossier: ${folder.name}${folder.parent_id ? ', sous-dossier' : ''}`}
              >
                <svg className="folder-icon small" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
                </svg>
                <span className="folder-name">{folder.name}</span>
                {folder.parent_id && (
                  <span className="folder-sub">(Sous-dossier)</span>
                )}
              </li>
            ))}
          </ul>

          {isAdmin && (
            <button
              className="btn-new-folder btn-root"
              onClick={() => openCreateModal()}
              aria-label="Créer un dossier racine"
            >
              + Nouveau dossier racine
            </button>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal">
            <h3 id="modal-title">Créer un nouveau dossier</h3>
            {parentFolderId && (
              <p className="modal-subtitle">
                Création d'un sous-dossier dans : <strong>{folders.find(f => f.id === parentFolderId)?.name}</strong>
              </p>
            )}
            <input
              type="text"
              className="input-folder-name"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier"
              aria-describedby="error-message"
              autoFocus
            />
            {error && <p id="error-message" className="error-message">{error}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={closeCreateModal}
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-confirm"
                onClick={handleCreateFolder}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;