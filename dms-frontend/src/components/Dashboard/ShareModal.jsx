import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ModalStyles.css'; // Fichier CSS partagé pour les styles

function ShareModal(props) {
  const {
    isOpen,
    onClose,
    currentDocument,
    displayedEmailFilename,
    emailUsers = [],
    selectedEmailTypes = [],
    setSelectedEmailTypes,
    selectedRecipients = [],
    setSelectedRecipients,
    handleRecipientToggle,
    availableEmailTypes = [],
    emailSubject = '',
    setEmailSubject,
    emailMessage = '',
    setEmailMessage,
    emailError,
    emailSuccess,
    isEmailSending,
    handleConfirmSendEmail,
    handleCloseEmailModal,
    formatFileSize = (b) => (b ? `${b} B` : '0 B'),
    selectedDocuments = [] // New prop for multiple documents
  } = props;

  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Verrouillage du défilement du body
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        (onClose || handleCloseEmailModal)?.();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose, handleCloseEmailModal]);

  if (!isOpen) return null;

  const close = () => {
    (onClose || handleCloseEmailModal)?.();
  };

  const onBackdropClick = (e) => {
    if (e.target === overlayRef.current) close();
  };

  // S'assurer que les tableaux existent pour éviter les erreurs de rendu
  const types = Array.isArray(availableEmailTypes) ? availableEmailTypes : [];
  const users = Array.isArray(emailUsers) ? emailUsers : [];

  // Fonctions utilitaires pour la sélection
  const selectAllTypes = () => setSelectedEmailTypes(types.map(t => t.type));
  const selectNoTypes = () => setSelectedEmailTypes([]);
  const selectAllRecipients = () => setSelectedRecipients(users.map(u => u.email));
  const selectNoRecipients = () => setSelectedRecipients([]);

  const toggleEmailType = (type) => {
    if (selectedEmailTypes.includes(type)) {
      setSelectedEmailTypes(prev => prev.filter(t => t !== type));
    } else {
      setSelectedEmailTypes(prev => [...prev, type]);
    }
  };

  const content = (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onMouseDown={onBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div className="modal-container modal-container--medium" ref={dialogRef}>
        {/* En-tête de la modale */}
        <div className="modal-header">
          <div className="modal-header__content">
            <div className="modal-header__icon">✉️</div>
            <h2 className="modal-title">Envoyer le document par email</h2>
          </div>
          <button className="modal-close-btn" onClick={close} aria-label="Fermer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Corps de la modale avec défilement interne */}
        <div className="modal-body modal-body--scrollable">
          {currentDocument || (selectedDocuments && selectedDocuments.length > 0) ? (
            <div className="share-content">
              {/* Carte du document ou liste de documents */}
              <div className="document-card">
                <div className="document-card__icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                </div>
                <div className="document-card__content">
                  <h3 className="document-card__title">
                    {selectedDocuments && selectedDocuments.length > 1 ? (
                      <>
                        {selectedDocuments.map((doc, idx) => (
                          <span key={doc.id || doc.filename}>
                            {doc.filename} ({formatFileSize(doc.file_size || 0)}){idx < selectedDocuments.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </>
                    ) : (
                      displayedEmailFilename || (currentDocument && currentDocument.filename)
                    )}
                  </h3>
                  <div className="document-card__meta">
                    {selectedDocuments && selectedDocuments.length === 1 && (
                      <span className="document-meta__item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        {formatFileSize((selectedDocuments[0] && selectedDocuments[0].file_size) || 0)}
                      </span>
                    )}
                    {(!selectedDocuments || selectedDocuments.length <= 1) && (
                      <span className="document-meta__item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        {formatFileSize(currentDocument?.file_size || 0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section des types de fichiers */}
              <div className="form-section">
                <div className="form-section__header">
                  <h3 className="form-section__title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    Types de fichiers à envoyer
                  </h3>
                  <div className="form-section__actions">
                    <button 
                      type="button" 
                      className="selection-btn selection-btn--small"
                      onClick={selectAllTypes}
                    >
                      Tout sélectionner
                    </button>
                    <button 
                      type="button" 
                      className="selection-btn selection-btn--small"
                      onClick={selectNoTypes}
                    >
                      Tout désélectionner
                    </button>
                  </div>
                </div>

                <div className="scrollable-list scrollable-list--small">
                  {types.length === 0 ? (
                    <div className="empty-state empty-state--small">
                      <p className="empty-state__text">Aucun type de fichier disponible</p>
                    </div>
                  ) : (
                    <div className="checkbox-list">
                      {types.map((type) => {
                        let fileLabel = '';
                        if (type.type === 'rapport' && currentDocument.rapport) {
                          fileLabel = currentDocument.rapport.split(/[\\/]/).pop();
                        } else if (type.type === 'ocr_text' && currentDocument.ocr_text) {
                          fileLabel = currentDocument.ocr_text.split(/[\\/]/).pop();
                        } else {
                          fileLabel = currentDocument.filename;
                        }
                        const checked = selectedEmailTypes?.includes(type.type);
                        
                        return (
                          <label key={type.type} className="checkbox-item">
                            <input 
                              className="checkbox-item__input" 
                              type="checkbox" 
                              id={`type-${type.type}`}
                              checked={checked} 
                              onChange={() => toggleEmailType(type.type)}
                            />
                            <div className="checkbox-item__content">
                              <div className="checkbox-item__title">{type.label}</div>
                              <div className="checkbox-item__subtitle">Fichier: {fileLabel}</div>
                            </div>
                            <div className="checkbox-item__indicator">
                              {checked && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="20,6 9,17 4,12"/>
                                </svg>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Section des destinataires */}
              <div className="form-section">
                <div className="form-section__header">
                  <h3 className="form-section__title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Destinataires
                  </h3>
                  <div className="form-section__actions">
                    <button 
                      type="button" 
                      className="selection-btn selection-btn--small"
                      onClick={selectAllRecipients}
                    >
                      Tout sélectionner
                    </button>
                    <button 
                      type="button" 
                      className="selection-btn selection-btn--small"
                      onClick={selectNoRecipients}
                    >
                      Tout désélectionner
                    </button>
                  </div>
                </div>

                <div className="scrollable-list">
                  {users.length > 0 ? (
                    <div className="checkbox-list">
                      {users.map((user) => (
                        <label key={user.id} className="checkbox-item checkbox-item--user">
                          <input 
                            className="checkbox-item__input" 
                            type="checkbox" 
                            checked={selectedRecipients.includes(user.email)} 
                            onChange={() => handleRecipientToggle(user.email)}
                          />
                          <div className="user-avatar">
                            <span className="user-avatar__initials">
                              {(user.username?.[0] || '').toUpperCase()}{(user.surname?.[0] || '').toUpperCase()}
                            </span>
                          </div>
                          <div className="checkbox-item__content">
                            <div className="checkbox-item__title">{user.username} {user.surname}</div>
                            <div className="checkbox-item__subtitle">{user.email} • {user.role}</div>
                          </div>
                          <div className="checkbox-item__indicator">
                            {selectedRecipients.includes(user.email) && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20,6 9,17 4,12"/>
                              </svg>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state__icon">👥</div>
                      <p className="empty-state__text">Aucun utilisateur disponible</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Section objet et message */}
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label" htmlFor="email-subject">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Objet de l'email
                  </label>
                  <input 
                    id="email-subject"
                    type="text" 
                    className="form-input" 
                    value={emailSubject} 
                    onChange={(e) => setEmailSubject(e.target.value)} 
                    placeholder="Saisissez l'objet de votre email..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email-message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    Message personnalisé (optionnel)
                  </label>
                  <textarea 
                    id="email-message"
                    className="form-textarea" 
                    rows={4}
                    value={emailMessage} 
                    onChange={(e) => setEmailMessage(e.target.value)} 
                    placeholder="Ajoutez un message personnalisé à votre email..."
                  />
                </div>
              </div>

              {/* Messages d'état */}
              {emailError && (
                <div className="alert alert--error">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  {emailError}
                </div>
              )}
              {emailSuccess && (
                <div className="alert alert--success">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                  {emailSuccess}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">📄</div>
              <p className="empty-state__text">Aucun document sélectionné</p>
            </div>
          )}
        </div>

        {/* Pied de page de la modale */}
        <div className="modal-footer">
          <button 
            type="button" 
            className="action-btn action-btn--secondary" 
            onClick={close} 
            disabled={isEmailSending}
          >
            Annuler
          </button>
          <button 
            type="button" 
            className="action-btn action-btn--primary" 
            onClick={handleConfirmSendEmail} 
            disabled={isEmailSending || selectedRecipients.length === 0 || selectedEmailTypes.length === 0}
          >
            {isEmailSending ? (
              <>
                <div className="spinner spinner--small"></div>
                Envoi en cours...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                </svg>
                Envoyer l'email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Rendu via portal vers le body pour éviter les problèmes de z-index/overflow
  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

export default ShareModal;

