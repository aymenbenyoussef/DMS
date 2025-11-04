import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api';
import './ModalStyles.css'; // Fichier CSS partagé pour les styles

function RapportModal(props) {
  const {
    isOpen,
    onClose,
    previewTitle,
    previewType,
    previewUrl,
    documentFileUrl,
    documentFileType,
    activeTab,
    setActiveTab,
    ocrText,
    currentDocument,
    relatedDocuments,
    
    handleSendEmail,
    formatFileSize,
    getDoctypeName
  } = props;

  // État local pour la gestion des URLs et du contenu
  const [localPreviewUrl, setLocalPreviewUrl] = useState(previewUrl || documentFileUrl || null);
  const [localPreviewMime, setLocalPreviewMime] = useState(null);
  const [localRapportUrl, setLocalRapportUrl] = useState(null);
  const [localRapportMime, setLocalRapportMime] = useState(null);
  const [localDocumentFileUrl, setLocalDocumentFileUrl] = useState(documentFileUrl || null);
  const [localDocumentMime, setLocalDocumentMime] = useState(null);
  const [localOcrText, setLocalOcrText] = useState(ocrText || '');
  const [loadingRapport, setLoadingRapport] = useState(false);
  const [loadingOcr, setLoadingOcr] = useState(false);

  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  const getUploaderName = (doc) => {
    const name = doc.owner_name || '';
    const surname = doc.owner_surname || '';
    const fullName = `${name} ${surname}`.trim();
    return fullName || 'Utilisateur inconnu';
  };
  const getDocumentGroup = (doc) => {
    return doc.group_name || 'Aucun groupe';
  };
  const handleRapportDownload = async (doc) => {
    try {
      const response = await api.documents.getRapport(doc.id);
      if (response.status !== 200) {
        if (response.status === 404) {
          alert('Rapport non disponible pour ce document.');
          return;
        }
        throw new Error('Network response was not ok');
      }
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename.replace(/\.[^/.]+$/, "") + "_rapport.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Échec du téléchargement. Veuillez réessayer.');
    }
  };
  const handleOcrTextDownload = async (doc) => {
    try {
      const response = await api.documents.getOcrText(doc.id);
      if (response.status !== 200) {
        if (response.status === 404) {
          alert('Texte OCR non disponible pour ce document.');
          return;
        }
        throw new Error('Network response was not ok');
      }
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename.replace(/\.[^/.]+$/, "") + "_ocr.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Échec du téléchargement. Veuillez réessayer.');
    }
  };
  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/documents/${doc.id}/file`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.filename || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error.response?.data?.error || error.message}`);
    }
  };
  const handleContextDownload = async () => {
    if (!currentDocument) return;

    switch (activeTab) {
      case 'rapport':
        await handleRapportDownload(currentDocument);
        break;
      case 'ocr':
        await handleOcrTextDownload(currentDocument);
        break;
      case 'report':
      default:
        await handleDownload(currentDocument);
        break;
    }
  };
  useEffect(() => {
    setLocalPreviewUrl(previewUrl || documentFileUrl || null);
    // Dérivation du type MIME
    if (previewType) setLocalPreviewMime(previewType === 'pdf' ? 'application/pdf' : (previewType === 'image' ? 'image/*' : null));
    else if (documentFileType) setLocalPreviewMime(documentFileType === 'pdf' ? 'application/pdf' : (documentFileType === 'image' ? 'image/*' : null));
    else {
      const name = (previewTitle || currentDocument?.filename || '').toLowerCase();
      if (name.endsWith('.pdf')) setLocalPreviewMime('application/pdf');
      else if (name.match(/\.(jpg|jpeg|png|gif)$/)) setLocalPreviewMime('image/*');
      else setLocalPreviewMime(null);
    }
  }, [previewUrl, documentFileUrl, previewType, documentFileType, previewTitle, currentDocument]);

  useEffect(() => {
    setLocalDocumentFileUrl(documentFileUrl || null);
    if (documentFileType) setLocalDocumentMime(documentFileType === 'pdf' ? 'application/pdf' : (documentFileType === 'image' ? 'image/*' : null));
  }, [documentFileUrl, documentFileType]);

  useEffect(() => {
    setLocalOcrText(ocrText || '');
  }, [ocrText]);

  // Déterminer si le document est une facture
  const doctypeName = getDoctypeName ? (getDoctypeName(currentDocument?.doctype_id) || '') : (currentDocument?.doctype_name || '');
  const isFacture = (doctypeName || '').toString().toLowerCase().includes('fact');

  // Fonctions utilitaires pour déterminer le type de fichier
  function isPdf({ url, mime } = {}) {
    if (mime) return mime === 'application/pdf' || mime.startsWith('application/pdf');
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
  }

  function isImage({ url, mime } = {}) {
    if (mime) return mime.startsWith('image/');
    if (!url) return false;
    return !!url.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/);
  }

  // Récupération du rapport à la demande
  useEffect(() => {
    let cancelled = false;
    async function fetchRapport() {
      if (!currentDocument ) return;
      try {
        setLoadingRapport(true);
        const res = await api.documents.getRapport(currentDocument.id);
        if (cancelled) return;
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
        const url = window.URL.createObjectURL(blob);
        if (localRapportUrl) {
          try { window.URL.revokeObjectURL(localRapportUrl); } catch (e) { }
        }
        setLocalRapportUrl(url);
        setLocalRapportMime(blob.type || (res.headers && res.headers['content-type']) || null);
      } catch (e) {
        console.error('Erreur lors du chargement du rapport:', e);
      } finally {
        setLoadingRapport(false);
      }
    }

    if (activeTab === 'rapport'  && !localRapportUrl) {
      fetchRapport();
    }

    return () => { cancelled = true; };
  }, [activeTab, currentDocument, localRapportUrl]);

  // Récupération de l'OCR à la demande
  useEffect(() => {
    let cancelled = false;
    async function fetchOcr() {
      if (!currentDocument) return;
      try {
        setLoadingOcr(true);
        const res = await api.documents.getOcrText(currentDocument.id);
        if (cancelled) return;
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
        const text = await blob.text();
        setLocalOcrText(text || '');
      } catch (e) {
        console.error('Erreur lors du chargement de l\'OCR:', e);
      } finally {
        setLoadingOcr(false);
      }
    }

    if (activeTab === 'ocr' && !localOcrText) {
      fetchOcr();
    }

    return () => { cancelled = true; };
  }, [activeTab, currentDocument, localOcrText]);

  // Récupération du document blob
  useEffect(() => {
    let cancelled = false;
    async function fetchDocumentBlob() {
      if (!currentDocument) return;
      try {
        const res = await api.documents.download(currentDocument.id);
        if (cancelled) return;
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
        const url = window.URL.createObjectURL(blob);
        if (localPreviewUrl) {
          try { window.URL.revokeObjectURL(localPreviewUrl); } catch (e) { }
        }
        setLocalPreviewUrl(url);
        setLocalPreviewMime(blob.type || (res.headers && res.headers['content-type']) || null);
      } catch (e) {
        console.error('Erreur lors du chargement du document:', e);
      }
    }

    if (activeTab === 'report' && !localPreviewUrl && currentDocument) {
      fetchDocumentBlob();
    }

    return () => { cancelled = true; };
  }, [activeTab, currentDocument, localPreviewUrl]);

  useEffect(() => {
    if (!isOpen) return;

    // Verrouillage du défilement du body
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => {
    if (onClose) onClose();
    // Nettoyage des URLs blob
    try { if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) window.URL.revokeObjectURL(localPreviewUrl); } catch { }
    try { if (localDocumentFileUrl && localDocumentFileUrl.startsWith('blob:')) window.URL.revokeObjectURL(localDocumentFileUrl); } catch { }
    try { if (localRapportUrl && localRapportUrl.startsWith('blob:')) window.URL.revokeObjectURL(localRapportUrl); } catch { }
  };

  const onBackdropClick = (e) => {
    if (e.target === overlayRef.current) close();
  };

  // Gestion des onglets avec indicateurs de statut
  const tabs = [
    {
      id: 'report',
      label: 'Document original',
      icon: '📄',
      hasContent: !!(localPreviewUrl || previewUrl || localDocumentFileUrl)
    },
    {
      id: 'ocr',
      label: 'Extrait OCR',
      icon: '🔍',
      hasContent: !!localOcrText,
      isLoading: loadingOcr
    },
  

  {
   
      id: 'rapport',
      label: 'Rapport DMS',
      icon: '📊',
      hasContent: !!localRapportUrl,
      isLoading: loadingRapport
    
  }
];
  const content = (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onMouseDown={onBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div className="modal-container modal-container--large" ref={dialogRef}>
        {/* En-tête de la modale */}
        <div className="modal-header">
          <div className="modal-header__content">
            <div className="modal-header__icon">📄</div>
            <h2 className="modal-title">{previewTitle || 'Aperçu du document'}</h2>
          </div>
          <button className="modal-close-btn" onClick={close} aria-label="Fermer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Corps de la modale */}
        <div className="modal-body modal-body--split">
          {/* Zone principale de contenu */}
          <div className="modal-main-content">
            {/* Onglets améliorés */}
            <div className="tabs-container">
              <div className="tabs-list" role="tablist">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
                    onClick={() => setActiveTab && setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                  >
                    <span className="tab-button__icon">{tab.icon}</span>
                    <span className="tab-button__label">{tab.label}</span>
                    {tab.isLoading && (
                      <div className="tab-button__spinner">
                        <div className="spinner"></div>
                      </div>
                    )}
                    {tab.hasContent && !tab.isLoading && (
                      <div className="tab-button__indicator"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu des onglets avec hauteur dynamique */}
            <div className="tab-content">
              {activeTab === 'report' && (
                <div className="tab-panel tab-panel--document">
                  {isPdf({ url: localPreviewUrl || previewUrl || localDocumentFileUrl, mime: localPreviewMime || localDocumentMime }) && (localPreviewUrl || previewUrl || localDocumentFileUrl) && (
                    <div className="pdf-viewer-container">
                      <iframe
                        src={localPreviewUrl || previewUrl || localDocumentFileUrl}
                        title="Aperçu PDF"
                        className="pdf-viewer"
                        allow="fullscreen"
                      />
                      <div className="pdf-viewer-overlay">
                        <button 
                          className="pdf-fullscreen-btn"
                          onClick={() => window.open(localPreviewUrl || previewUrl || localDocumentFileUrl, '_blank')}
                          title="Ouvrir en plein écran"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {isImage({ url: localPreviewUrl || previewUrl || localDocumentFileUrl, mime: localPreviewMime || localDocumentMime }) && (localPreviewUrl || previewUrl || localDocumentFileUrl) && (
                    <div className="image-viewer-container">
                      <img 
                        src={localPreviewUrl || previewUrl || localDocumentFileUrl} 
                        alt={previewTitle} 
                        className="image-viewer"
                      />
                    </div>
                  )}
                  {(!isPdf({ url: localPreviewUrl, mime: localPreviewMime }) && !isImage({ url: localPreviewUrl, mime: localPreviewMime })) && (
                    <div className="text-content">
                      <pre className="text-content__pre">{localOcrText || 'Aucun contenu disponible'}</pre>
                    </div>
                  )}
                  {!((localPreviewUrl || previewUrl || localDocumentFileUrl)) && (
                    <div className="empty-state">
                      <div className="empty-state__icon">📄</div>
                      <p className="empty-state__text">Aperçu non disponible</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ocr' && (
                <div className="tab-panel tab-panel--ocr">
                  {loadingOcr ? (
                    <div className="loading-state">
                      <div className="spinner spinner--large"></div>
                      <p>Chargement du texte OCR...</p>
                    </div>
                  ) : localOcrText ? (
                    <div className="ocr-content">
                      <textarea 
                        className="ocr-textarea" 
                        readOnly 
                        value={localOcrText}
                        placeholder="Texte extrait par OCR..."
                      />
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state__icon">🔍</div>
                      <p className="empty-state__text">Aucun texte OCR disponible pour ce document</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'rapport' && (
                <div className="tab-panel tab-panel--rapport">
                  {loadingRapport ? (
                    <div className="loading-state">
                      <div className="spinner spinner--large"></div>
                      <p>Chargement du rapport...</p>
                    </div>
                  ) : localRapportUrl ? (
                    isPdf({ url: localRapportUrl, mime: localRapportMime }) ? (
                      <div className="pdf-viewer-container">
                        <iframe
                          src={localRapportUrl}
                          title="Rapport PDF"
                          className="pdf-viewer"
                          allow="fullscreen"
                        />
                        <div className="pdf-viewer-overlay">
                          <button 
                            className="pdf-fullscreen-btn"
                            onClick={() => window.open(localRapportUrl, '_blank')}
                            title="Ouvrir en plein écran"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="image-viewer-container">
                        <img 
                          src={localRapportUrl} 
                          alt={currentDocument?.filename} 
                          className="image-viewer"
                        />
                      </div>
                    )
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state__icon">📊</div>
                      <p className="empty-state__text">Rapport non disponible</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Panneau latéral d'informations */}
          <div className="modal-sidebar">
            <div className="sidebar-content">
              {currentDocument ? (
                <>
                  <div className="sidebar-section">
                    <h3 className="sidebar-title">Informations sur le document</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label" style={{ textTransform: 'none' }}>Utilisateur : <span className="info-value" style={{ textTransform: 'none' }}>
                          {getUploaderName(currentDocument)}
                        </span></span>
                        
                      </div>
                      <div className="info-item">
                        <span className="info-label" style={{ textTransform: 'none' }}>Type : <span className="info-value" style={{ textTransform: 'none' }}>{doctypeName || '-'}</span></span>
                        
                      </div>
                      <div className="info-item">
                        <span className="info-label" style={{ textTransform: 'none' }}>Partenaire : <span className="info-value" style={{ textTransform: 'none' }}>{currentDocument.partner_name || '-'}</span></span>
                        
                      </div>
                      <div className="info-item">
                        <span className="info-label" style={{ textTransform: 'none' }}>Type de partenaire : <span className="info-value" style={{ textTransform: 'none' }}>{currentDocument.partner_types || '-'}</span></span>
                        
                      </div>
                      
                      
                      <div className="info-item">
                        <span className="info-label" style={{ textTransform: 'none' }}>Date d'import : <span className="info-value">
                          {currentDocument.created_at ? new Date(currentDocument.created_at).toLocaleDateString('fr-FR') : '-'}
                        </span></span>
                        
                      </div>
                      <div className="info-item">
                        <span className="info-label" style={{ textTransform: 'none' }}>Date de document : <span className="info-value">{currentDocument.document_date  ? new Date(currentDocument.document_date || currentDocument.date).toLocaleDateString('fr-FR') : '-'}</span>
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label" style={{ textTransform: 'none' }}>Date d'echeance' : <span className="info-value">{currentDocument.due_date  ? new Date(currentDocument.due_date || currentDocument.due_date).toLocaleDateString('fr-FR') : '-'}</span>
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label" style={{ textTransform: 'none' }}>Taille : <span className="info-value" style={{ textTransform: 'none' }}>{formatFileSize ? formatFileSize(currentDocument.file_size || currentDocument.size || 0) : '-'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sidebar-actions">
                  <button 
  className="action-btn action-btn--gray" 
  onClick={handleContextDownload}
  style={{
    backgroundColor: '#6c757d',
    border: '1px solid #6c757d',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  }}
  
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
  Télécharger
</button>

<button 
  className="action-btn action-btn--gray" 
  onClick={() => {
    onClose && onClose();
    handleSendEmail && handleSendEmail(currentDocument);
  }}
  style={{
    backgroundColor: '#6c757d',
    border: '1px solid #6c757d',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  }}
  
  
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
  Envoyer
</button>



                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <p className="empty-state__text">Aucune information disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Rendu via portal vers le body pour éviter les problèmes de z-index/overflow
  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

export default RapportModal;