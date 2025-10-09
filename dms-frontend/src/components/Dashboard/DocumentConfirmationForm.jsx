import React, { useState, useEffect, useContext } from 'react';
import API from '../../api';
import { AppContext } from '../context';
import './DocumentConfirmationForm.css';

const DocumentConfirmationForm = ({ 
  files = [],
  onConfirm,
  onCancel,
  initialCompany,
  initialDoctype,
  hideConfirmButton = false
}) => {
  const { selectedCompany, selectedDoctype, setSelectedCompany, setSelectedDoctype } = useContext(AppContext);
  const [companies, setCompanies] = useState([]);
  const [doctypes, setDoctypes] = useState({});
  const [partners, setPartners] = useState({});
  const [groups, setGroups] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  
  const [confirmedDocuments, setConfirmedDocuments] = useState(() => files.map(f => ({
    filename: f.filename,
    company_id: (initialCompany || selectedCompany)?.id,
    doctype_id: (initialDoctype || selectedDoctype)?.id,
    is_invoice: f.extractedData?.is_invoice || false,
    confirmed_data: {
      invoice_number: f.extractedData?.invoice_number || '',
      date: f.extractedData?.date || '',
      partner: f.extractedData?.partner || '',
      partner_id: f.extractedData?.partner_id || '',
      group_id: f.extractedData?.group_id || '',
      total_ht: f.extractedData?.total_ht || '',
      tva: f.extractedData?.tva || '',
      total_ttc: f.extractedData?.total_ttc || '',
      is_invoice: f.extractedData?.is_invoice || false
    }
  })));
  
  const [errors, setErrors] = useState(() => files.map(() => ({})));

  // Icônes SVG
  const CompanyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17,21 17,13 7,13 7,21"/>
      <polyline points="7,3 7,8 15,8"/>
    </svg>
  );

  const DocumentIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
    </svg>
  );

  const PartnerIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );

  const InvoiceIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10,9 9,9 8,9"/>
    </svg>
  );

  const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );

  const MoneyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );

  // Load companies on component mount
  useEffect(() => {
    loadCompanies();
  }, []);

  // Load doctypes, partners, and groups for the initial company when the modal opens
  useEffect(() => {
    const companyId = (initialCompany || selectedCompany)?.id;
    if (companyId) {
      loadDoctypesByCompany(companyId);
      loadPartners(companyId);
      loadGroups(companyId);
    }
  }, [initialCompany, selectedCompany]);

  // Check for changes in any file
  useEffect(() => {
    const hasAnyChanges = confirmedDocuments.some((doc, idx) => {
      const companyChanged = doc.company_id !== (initialCompany || selectedCompany)?.id;
      const doctypeChanged = doc.doctype_id !== (initialDoctype || selectedDoctype)?.id;
      return companyChanged || doctypeChanged;
    });
    setHasChanges(hasAnyChanges);
  }, [confirmedDocuments, initialCompany, initialDoctype, selectedCompany, selectedDoctype]);

  // If hideConfirmButton, call onConfirm on every change
  useEffect(() => {
    if (hideConfirmButton) {
      onConfirm(confirmedDocuments, errors);
    }
  }, [confirmedDocuments, errors, hideConfirmButton, onConfirm]);

  const loadCompanies = async () => {
    try {
      const response = await API.companies.getAll();
      setCompanies(response.data);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadDoctypesByCompany = async (companyId) => {
    try {
      const response = await API.doctype.getByCompany(companyId);
      setDoctypes(prev => ({ ...prev, [companyId]: response.data }));
    } catch (error) {
      console.error('Error loading doctypes:', error);
      setDoctypes(prev => ({ ...prev, [companyId]: [] }));
    }
  };

  const loadPartners = async (companyId) => {
    try {
      const response = await API.partner.getByCompany(companyId);
      setPartners(prev => ({ ...prev, [companyId]: response.data }));
    } catch (error) {
      console.error('Error loading partners:', error);
      setPartners(prev => ({ ...prev, [companyId]: [] }));
    }
  };

  const loadGroups = async (companyId) => {
    if (!companyId) {
      setGroups(prev => ({ ...prev, [companyId]: [] }));
      return;
    }
    try {
      const response = await API.groups.getAll(companyId);
      setGroups(prev => ({ ...prev, [companyId]: response.data || [] }));
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups(prev => ({ ...prev, [companyId]: [] }));
    }
  };

  // Update confirmed document data
  const updateConfirmedDocument = (idx, field, value) => {
    setConfirmedDocuments(prev => {
      const updated = [...prev];
      if (field === 'is_invoice') {
        updated[idx].is_invoice = value;
        updated[idx].confirmed_data.is_invoice = value;
      } else if (field === 'company_id') {
        updated[idx].company_id = value;
        if (value) {
          loadDoctypesByCompany(value);
          loadPartners(value);
          loadGroups(value);
        }
        updated[idx].doctype_id = null;
        updated[idx].confirmed_data.partner_id = '';
        updated[idx].confirmed_data.partner = '';
      } else if (field === 'doctype_id') {
        updated[idx].doctype_id = value;
      } else if (field === 'partner_id') {
        updated[idx].confirmed_data.partner_id = value;
      } else if (field === 'group_id') {
        updated[idx].confirmed_data.group_id = value;
      } else {
        updated[idx].confirmed_data[field] = value;
      }
      return updated;
    });
    setErrors(prev => {
      const newErrors = [...prev];
      if (newErrors[idx] && newErrors[idx][field]) {
        newErrors[idx] = { ...newErrors[idx] };
        delete newErrors[idx][field];
      }
      return newErrors;
    });
  };

  // Validate all forms
  const validateAll = () => {
    const newErrors = files.map((f, idx) => {
      const doc = confirmedDocuments[idx];
      const errs = {};
      
      if (!doc.company_id) {
        errs.company_id = 'Veuillez sélectionner une entité';
      }
      if (!doc.doctype_id) {
        errs.doctype_id = 'Veuillez sélectionner un type de document';
      }
      if (!doc.confirmed_data.partner_id) {
        errs.partner_id = 'Veuillez sélectionner un partenaire';
      }
      
      if (doc.is_invoice) {
        const invData = doc.confirmed_data;
        if (!invData.invoice_number) {
          errs.invoice_number = 'Le numéro de facture est requis';
        }
        if (!invData.date) {
          errs.date = 'La date est requise';
        }
        if (invData.total_ht === '' || isNaN(invData.total_ht) || invData.total_ht <= 0) {
          errs.total_ht = 'Total HT doit être un nombre supérieur à 0';
        }
        if (invData.tva === '' || isNaN(invData.tva) || invData.tva < 0) {
          errs.tva = 'TVA doit être un nombre positif ou nul';
        }
        if (invData.total_ttc === '' || isNaN(invData.total_ttc) || invData.total_ttc <= 0) {
          errs.total_ttc = 'Total TTC doit être un nombre supérieur à 0';
        }
        
        // New validation: Check if TTC equals HT + TVA
        const ht = parseFloat(invData.total_ht);
        const tva = parseFloat(invData.tva);
        const ttc = parseFloat(invData.total_ttc);
        const expectedTtc = ht + tva;
        
        if (!isNaN(ht) && !isNaN(tva) && !isNaN(ttc) && Math.abs(ttc - expectedTtc) > 0.01) {
          errs.total_ttc = `Le Total TTC devrait être ${expectedTtc.toFixed(2)} (HT + TVA = ${ht.toFixed(2)} + ${tva.toFixed(2)})`;
        }
      }
      
      return errs;
    });
    setErrors(newErrors);
    return newErrors.every(err => Object.keys(err).length === 0);
  };

  const handleConfirm = async () => {
    const isValid = validateAll();
    if (!isValid) {
      return;
    }
    setIsLoading(true);
    try {
      await onConfirm(confirmedDocuments, errors);
    } catch (error) {
      console.error('Error confirming documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSingleFileForm = () => {
    const doc = confirmedDocuments[0];
    const err = errors[0];
    const currentFileDoctypes = doctypes[doc.company_id] || [];
    const currentFilePartners = partners[doc.company_id] || [];
    const currentFileGroups = groups[doc.company_id] || [];
    
    return (

      <div className="document-confirmation-form">
        {/* ...existing code... */}
        <div className="confirmation-form-scroll-area">
          <div className="document-form">
            {/* Editable file name (without extension) */}
            <div className="form-row">
              <div className="form-group full-width-field">
                <label className="form-label">Nom du fichier *</label>
                {(() => {
                  const fullName = doc.filename || '';
                  const dotIdx = fullName.lastIndexOf('.')
                  const base = dotIdx > 0 ? fullName.slice(0, dotIdx) : fullName;
                  const ext = dotIdx > 0 ? fullName.slice(dotIdx) : '';
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={base}
                        onChange={e => {
                          const newBase = e.target.value.replace(/\s+/g, '_');
                          const newName = newBase + ext;
                          setConfirmedDocuments(prev => {
                            const updated = [...prev];
                            updated[0] = { ...updated[0], filename: newName };
                            return updated;
                          });
                        }}
                        className="form-input"
                        style={{ flex: 1 }}
                        required
                      />
                      <span style={{ fontWeight: 600, color: '#888' }}>{ext}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* Première ligne : Entité, Type de document et Partenaire externe */}
            <div className="form-row three-cols">
              <div className="form-group">
                <label className="form-label">
                  
                  Entité *
                </label>
                <select 
                  value={doc.company_id || ''} 
                  onChange={e => { 
                    const companyId = parseInt(e.target.value);
                    updateConfirmedDocument(0, 'company_id', companyId);
                  }}
                  className={`form-input ${doc.company_id !== (initialCompany || selectedCompany)?.id ? 'changed' : ''} ${err.company_id ? 'error' : ''}`}
                >
                  <option value="">Sélectionner une entité</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
                {err.company_id && <div className="error-message">{err.company_id}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  
                  Type de document *
                </label>
                <select 
                  value={doc.doctype_id || ''} 
                  onChange={e => { 
                    const doctypeId = parseInt(e.target.value);
                    updateConfirmedDocument(0, 'doctype_id', doctypeId);
                  }}
                  disabled={!doc.company_id}
                  className={`form-input ${doc.doctype_id !== (initialDoctype || selectedDoctype)?.id ? 'changed' : ''} ${err.doctype_id ? 'error' : ''}`}
                >
                  <option value="">Sélectionner un type</option>
                  {currentFileDoctypes.map(doctype => (
                    <option key={doctype.id} value={doctype.id}>{doctype.name}</option>
                  ))}
                </select>
                {err.doctype_id && <div className="error-message">{err.doctype_id}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  
                  Partenaire externe *
                </label>
                <select
                  value={doc.confirmed_data.partner_id || ''}
                  onChange={e => { 
                    const partnerId = parseInt(e.target.value);
                    const partner = currentFilePartners.find(p => p.id === partnerId);
                    updateConfirmedDocument(0, 'partner_id', partnerId);
                    if (partner) {
                      updateConfirmedDocument(0, 'partner', partner.company_name);
                    } else {
                      updateConfirmedDocument(0, 'partner', '');
                    }
                  }}
                  className={`form-input ${err.partner_id ? 'error' : ''}`}
                  required
                >
                  <option value="">Sélectionner un partenaire</option>
                  {currentFilePartners.map(partner => (
                    <option key={partner.id} value={partner.id}>
                      {partner.company_name} - {partner.contact_name}
                    </option>
                  ))}
                </select>
                {err.partner_id && <div className="error-message">{err.partner_id}</div>}
              </div>
            </div>

            {/* Case à cocher pour facture */}
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={doc.is_invoice}
                  onChange={e => updateConfirmedDocument(0, 'is_invoice', e.target.checked)}
                />
                Ce document est une facture
              </label>
            </div>

            {/* Champs spécifiques aux factures */}
            {doc.is_invoice && (
              <div className="invoice-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      
                      Numéro de facture *
                    </label>
                    <input
                      type="text"
                      value={doc.confirmed_data.invoice_number}
                      onChange={e => updateConfirmedDocument(0, 'invoice_number', e.target.value)}
                      className={`form-input ${err.invoice_number ? 'error' : ''}`}
                      placeholder="Numéro de facture"
                    />
                    {err.invoice_number && <div className="error-message">{err.invoice_number}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">
                      
                      Date *
                    </label>
                    <input
                      type="date"
                      value={doc.confirmed_data.date}
                      onChange={e => updateConfirmedDocument(0, 'date', e.target.value)}
                      className={`form-input ${err.date ? 'error' : ''}`}
                    />
                    {err.date && <div className="error-message">{err.date}</div>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      
                      Total HT *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={doc.confirmed_data.total_ht}
                      onChange={e => updateConfirmedDocument(0, 'total_ht', e.target.value)}
                      className={`form-input ${err.total_ht ? 'error' : ''}`}
                      placeholder="0.00"
                    />
                    {err.total_ht && <div className="error-message">{err.total_ht}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">
                      
                      TVA *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={doc.confirmed_data.tva}
                      onChange={e => updateConfirmedDocument(0, 'tva', e.target.value)}
                      className={`form-input ${err.tva ? 'error' : ''}`}
                      placeholder="0.00"
                    />
                    {err.tva && <div className="error-message">{err.tva}</div>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                     
                      Total TTC *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={doc.confirmed_data.total_ttc}
                      onChange={e => updateConfirmedDocument(0, 'total_ttc', e.target.value)}
                      className={`form-input ${err.total_ttc ? 'error' : ''}`}
                      placeholder="0.00"
                    />
                    {err.total_ttc && <div className="error-message">{err.total_ttc}</div>}
                  </div>
                  
                  
                </div>
              </div>
            )}
          </div>
        </div>

        {!hideConfirmButton && (
          <div className="confirmation-actions">
            <button 
              type="button" 
              className="action-btn action-btn--secondary" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Annuler
            </button>
            <button 
              type="button" 
              className="action-btn action-btn--primary" 
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner spinner--small"></div>
                  Confirmation...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                  Confirmer
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMultiFileForm = () => {
    return (
      <div className="document-confirmation-form">
        {/*<div className="form-header">
          <h3>Confirmation des documents ({files.length})</h3>
          <p>Vérifiez et modifiez les informations extraites pour chaque fichier</p>
          {hasChanges && (
            <div className="changes-notice">
              Des modifications ont été apportées à la configuration initiale
            </div>
          )}
        </div>*/}

        {/* Navigation des fichiers */}
        <div className="file-navigation" style={{ gap: '0.15rem', marginBottom: '0.5rem', padding: '0.1rem' }}>
          {files.map((file, idx) => (
            <button
              key={idx}
              className={`file-tab ${idx === activeFileIndex ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', minHeight: '1.5rem', gap: '0.2rem' }}
              onClick={() => setActiveFileIndex(idx)}
            >
              {file.filename}
              {Object.keys(errors[idx] || {}).length > 0 && (
                <span style={{ color: 'var(--error)', marginLeft: '0.15rem' }}>⚠️</span>
              )}
            </button>
          ))}
        </div>

        <div className="confirmation-form-scroll-area" style={{ padding: '0.25rem 0.25rem 0 0.25rem' }}>
          {files.map((file, idx) => {
            if (idx !== activeFileIndex) return null;
            const doc = confirmedDocuments[idx];
            const err = errors[idx];
            const currentFileDoctypes = doctypes[doc.company_id] || [];
            const currentFilePartners = partners[doc.company_id] || [];
            const currentFileGroups = groups[doc.company_id] || [];
            return (
              <div key={idx} className="multi-file-section">
                <div className="document-form" style={{ padding: '0.5rem 0.75rem', marginBottom: '0.25rem' }}>
                  {/* Editable file name (without extension) */}
                  <div className="form-row">
                    <div className="form-group full-width-field">
                      <label className="form-label">Nom du fichier *</label>
                      {(() => {
                        const fullName = doc.filename || '';
                        const dotIdx = fullName.lastIndexOf('.')
                        const base = dotIdx > 0 ? fullName.slice(0, dotIdx) : fullName;
                        const ext = dotIdx > 0 ? fullName.slice(dotIdx) : '';
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={base}
                              onChange={e => {
                                const newBase = e.target.value;
                                const newFilename = newBase + ext;
                                const updated = [...confirmedDocuments];
                                updated[idx] = { ...updated[idx], filename: newFilename };
                                setConfirmedDocuments(updated);
                              }}
                              className="form-input"
                              style={{ flex: 1 }}
                              required
                            />
                            <span style={{ fontWeight: 600, color: '#888' }}>{ext}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Première ligne : Entité, Type de document et Partenaire externe alignés et encadrés */}
                  <div className="form-row three-cols">
                    <div className="form-group">
                      <label className="form-label">Entité *</label>
                      <select 
                        value={doc.company_id || ''} 
                        onChange={e => { 
                          const companyId = parseInt(e.target.value);
                          updateConfirmedDocument(idx, 'company_id', companyId);
                        }}
                        className={`form-input ${err.company_id ? 'error' : ''}`}
                      >
                        <option value="">Sélectionner une entité</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                      {err.company_id && <div className="error-message">{err.company_id}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Type de document *</label>
                      <select 
                        value={doc.doctype_id || ''} 
                        onChange={e => { 
                          const doctypeId = parseInt(e.target.value);
                          updateConfirmedDocument(idx, 'doctype_id', doctypeId);
                        }}
                        disabled={!doc.company_id}
                        className={`form-input ${err.doctype_id ? 'error' : ''}`}
                      >
                        <option value="">Sélectionner un type</option>
                        {currentFileDoctypes.map(doctype => (
                          <option key={doctype.id} value={doctype.id}>{doctype.name}</option>
                        ))}
                      </select>
                      {err.doctype_id && <div className="error-message">{err.doctype_id}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Partenaire externe *</label>
                      <select
                        value={doc.confirmed_data.partner_id || ''}
                        onChange={e => { 
                          const partnerId = parseInt(e.target.value);
                          const partner = currentFilePartners.find(p => p.id === partnerId);
                          updateConfirmedDocument(idx, 'partner_id', partnerId);
                          if (partner) {
                            updateConfirmedDocument(idx, 'partner', partner.company_name);
                          } else {
                            updateConfirmedDocument(idx, 'partner', '');
                          }
                        }}
                        className={`form-input ${err.partner_id ? 'error' : ''}`}
                        required
                      >
                        <option value="">Sélectionner un partenaire</option>
                        {currentFilePartners.map(partner => (
                          <option key={partner.id} value={partner.id}>
                            {partner.company_name} - {partner.contact_name}
                          </option>
                        ))}
                      </select>
                      {err.partner_id && <div className="error-message">{err.partner_id}</div>}
                    </div>
                  </div>
                  {/* Case à cocher pour facture */}
                  <div className="checkbox-group" style={{ margin: '0.25rem 0 0.1rem 0' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={doc.is_invoice}
                        onChange={e => updateConfirmedDocument(idx, 'is_invoice', e.target.checked)}
                      />
                      Ce document est une facture
                    </label>
                  </div>
                  {/* Champs spécifiques aux factures */}
                  {doc.is_invoice && (
                    <div className="invoice-fields" style={{ padding: '0.5rem 0.75rem', marginTop: '0.25rem' }}>
                      <div className="form-row" style={{ gap: '0.25rem', marginBottom: '0.1rem' }}>
                        <div className="form-group">
                          <label className="form-label">
                            
                            Numéro de facture *
                          </label>
                          <input
                            type="text"
                            value={doc.confirmed_data.invoice_number}
                            onChange={e => updateConfirmedDocument(idx, 'invoice_number', e.target.value)}
                            className={`form-input ${err.invoice_number ? 'error' : ''}`}
                            placeholder="Numéro de facture"
                          />
                          {err.invoice_number && <div className="error-message">{err.invoice_number}</div>}
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            
                            Date *
                          </label>
                          <input
                            type="date"
                            value={doc.confirmed_data.date}
                            onChange={e => updateConfirmedDocument(idx, 'date', e.target.value)}
                            className={`form-input ${err.date ? 'error' : ''}`}
                          />
                          {err.date && <div className="error-message">{err.date}</div>}
                        </div>
                      </div>
                      <div className="form-row" style={{ gap: '0.25rem', marginBottom: '0.1rem' }}>
                        <div className="form-group">
                          <label className="form-label">
                           
                            Total HT *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={doc.confirmed_data.total_ht}
                            onChange={e => updateConfirmedDocument(idx, 'total_ht', e.target.value)}
                            className={`form-input ${err.total_ht ? 'error' : ''}`}
                            placeholder="0.00"
                          />
                          {err.total_ht && <div className="error-message">{err.total_ht}</div>}
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            
                            TVA *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={doc.confirmed_data.tva}
                            onChange={e => updateConfirmedDocument(idx, 'tva', e.target.value)}
                            className={`form-input ${err.tva ? 'error' : ''}`}
                            placeholder="0.00"
                          />
                          {err.tva && <div className="error-message">{err.tva}</div>}
                        </div>
                      </div>
                      <div className="form-row" style={{ gap: '0.25rem', marginBottom: '0.1rem' }}>
                        <div className="form-group">
                          <label className="form-label">
                            
                            Total TTC *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={doc.confirmed_data.total_ttc}
                            onChange={e => updateConfirmedDocument(idx, 'total_ttc', e.target.value)}
                            className={`form-input ${err.total_ttc ? 'error' : ''}`}
                            placeholder="0.00"
                          />
                          {err.total_ttc && <div className="error-message">{err.total_ttc}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!hideConfirmButton && (
          <div className="confirmation-actions">
            <button 
              type="button" 
              className="action-btn action-btn--secondary" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Annuler
            </button>
            <button 
              type="button" 
              className="action-btn action-btn--primary" 
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner spinner--small"></div>
                  Confirmation...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                  Confirmer tous ({files.length})
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render based on number of files
  if (files.length === 1) {
    return renderSingleFileForm();
  } else {
    return renderMultiFileForm();
  }
};

export default DocumentConfirmationForm;