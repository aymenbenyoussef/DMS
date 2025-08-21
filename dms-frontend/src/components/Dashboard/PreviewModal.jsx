import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

function PreviewModal({
  isOpen,
  onClose,
  previewType,
  previewUrl,
  previewText,
  previewTitle,
  currentDocument,
  relatedDocuments = [],
  activeTab,
  setActiveTab,
  handlePreview,
  onOpenFullscreen
}) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = orig;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onBackdrop = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  const content = (
    <div
      ref={overlayRef}
      onMouseDown={onBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        style={{
          width: 'min(1100px, 100%)',
          maxHeight: '92vh',
          background: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <strong>{previewTitle || (currentDocument && currentDocument.filename) || 'Aperçu'}</strong>
            {currentDocument && (<small style={{ color: '#666' }}>{currentDocument.created_at ? new Date(currentDocument.created_at).toLocaleDateString('fr-FR') : ''}</small>)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onOpenFullscreen} title="Ouvrir en plein écran">
              <i className="fas fa-expand"></i>
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose} aria-label="Fermer">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 0, height: '100%', minHeight: 200 }}>
          <div style={{ flex: 1, padding: 12, overflow: 'auto' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button className={`btn btn-sm ${activeTab === 'report' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setActiveTab && setActiveTab('report')}>Rapport</button>
              <button className={`btn btn-sm ${activeTab === 'ocr' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setActiveTab && setActiveTab('ocr')}>OCR</button>
              <button className={`btn btn-sm ${activeTab === 'actions' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setActiveTab && setActiveTab('actions')}>Actions</button>
            </div>

            <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 12, minHeight: 360, display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}>
              {previewType === 'pdf' && previewUrl && (
                <iframe src={previewUrl} title="Aperçu PDF" style={{ width: '100%', height: '70vh', border: 'none' }} />
              )}

              {previewType === 'image' && previewUrl && (
                <img src={previewUrl} alt={previewTitle} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
              )}

              {previewType === 'text' && (
                <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left', width: '100%', maxHeight: '70vh', overflow: 'auto' }}>{previewText || 'Aucun texte disponible'}</pre>
              )}

              {!previewType && (
                <div style={{ color: '#666' }}>Aucun aperçu disponible</div>
              )}
            </div>
          </div>

          <div style={{ width: 320, borderLeft: '1px solid #f0f0f0', padding: 12, overflow: 'auto' }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Documents liés</strong>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {Array.isArray(relatedDocuments) && relatedDocuments.length > 0 ? (
                relatedDocuments.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 6, border: '1px solid #eee', borderRadius: 4 }}>
                    <div style={{ flex: 1, marginRight: 8, cursor: 'pointer' }} onClick={() => handlePreview && handlePreview(doc)}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.filename}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{doc.partner_name || ''}</div>
                    </div>
                    <div>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => handlePreview && handlePreview(doc)} title="Ouvrir">Ouvrir</button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#666' }}>Aucun document lié</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

export default PreviewModal;
