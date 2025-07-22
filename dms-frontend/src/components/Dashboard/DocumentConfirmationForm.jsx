import React, { useState, useEffect, useContext } from 'react';
import API from '../../api';
import { AppContext } from '../context';
import './DocumentConfirmationForm.css';

const DocumentConfirmationForm = ({ 
  files = [], // Array of { sessionId, extractedData, filename }
  onConfirm, // (confirmedDocuments, errors) => void
  onCancel,
  initialCompany,
  initialDoctype,
  hideConfirmButton = false
}) => {
  const { selectedCompany, selectedDoctype, setSelectedCompany, setSelectedDoctype } = useContext(AppContext);
  const [companies, setCompanies] = useState([]);
  const [doctypes, setDoctypes] = useState([]);
  const [partners, setPartners] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(initialCompany || selectedCompany);
  const [currentDoctype, setCurrentDoctype] = useState(initialDoctype || selectedDoctype);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  // Array of confirmedDocuments and errors, one per file
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
      total_ht: f.extractedData?.total_ht || '',
      tva: f.extractedData?.tva || '',
      total_ttc: f.extractedData?.total_ttc || '',
      is_invoice: f.extractedData?.is_invoice || false
    }
  })));
  const [errors, setErrors] = useState(() => files.map(() => ({})));

  // Load companies on component mount
  useEffect(() => {
    loadCompanies();
    if (currentCompany?.id) {
      loadPartners(currentCompany.id);
    }
  }, []);

  // Load doctypes and partners when company changes
  useEffect(() => {
    if (currentCompany?.id) {
      loadDoctypesByCompany(currentCompany.id);
      loadPartners(currentCompany.id);
    } else {
      setPartners([]);
    }
  }, [currentCompany]);

  useEffect(() => {
    const companyChanged = currentCompany?.id !== (initialCompany || selectedCompany)?.id;
    const doctypeChanged = currentDoctype?.id !== (initialDoctype || selectedDoctype)?.id;
    setHasChanges(companyChanged || doctypeChanged);
  }, [currentCompany, currentDoctype, initialCompany, initialDoctype, selectedCompany, selectedDoctype]);

  // If hideConfirmButton, call onConfirm on every change
  useEffect(() => {
    if (hideConfirmButton) {
      onConfirm(confirmedDocuments, errors);
    }
    // eslint-disable-next-line
  }, [confirmedDocuments, errors]);

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
      setDoctypes(response.data);
    } catch (error) {
      console.error('Error loading doctypes:', error);
      setDoctypes([]);
    }
  };

  const loadPartners = async (companyId) => {
    try {
      const response = await API.partner.getByCompany(companyId);
      setPartners(response.data);
    } catch (error) {
      console.error('Error loading partners:', error);
      setPartners([]);
    }
  };

  // Update a field for a specific file index
  const updateConfirmedDocument = (idx, field, value) => {
    setConfirmedDocuments(prev => {
      const updated = [...prev];
      if (field === 'is_invoice') {
        updated[idx].is_invoice = value;
        updated[idx].confirmed_data.is_invoice = value;
      } else {
        updated[idx].confirmed_data[field] = value;
      }
      return updated;
    });
    // Always clear only the error for this field and this file
    setErrors(prev => {
      const newErrors = [...prev];
      if (newErrors[idx] && newErrors[idx][field]) {
        newErrors[idx] = { ...newErrors[idx] };
        delete newErrors[idx][field];
      }
      return newErrors;
    });
  };

  const handlePartnerChange = (idx, e) => {
    const partnerId = e.target.value;
    const partner = partners.find(p => p.id === parseInt(partnerId));
    updateConfirmedDocument(idx, 'partner_id', partnerId);
    if (partner) {
      updateConfirmedDocument(idx, 'partner', partner.company_name);
    } else {
      updateConfirmedDocument(idx, 'partner', '');
    }
    // No need to clear error here, handled in updateConfirmedDocument
  };

  // Validate all forms
  const validateAll = () => {
    const newErrors = files.map((f, idx) => {
      const doc = confirmedDocuments[idx];
      const errs = {};
      if (!currentCompany) {
        errs.company_id = 'Veuillez sélectionner une entité';
      }
      if (!currentDoctype) {
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
      }
      return errs;
    });
    setErrors(newErrors);
    // Return true if all error objects are empty
    return newErrors.every(err => Object.keys(err).length === 0);
  };

  const handleConfirm = async () => {
    const isValid = validateAll();
    if (!isValid) return;
    setIsLoading(true);
    try {
      await onConfirm(confirmedDocuments, errors);
    } catch (error) {
      console.error('Error confirming documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // If only one file, keep backward compatibility (single form)
  if (files.length === 1) {
    const doc = confirmedDocuments[0];
    const err = errors[0];
    return (
      <div className="document-confirmation-form">
        <div className="form-header">
          {hasChanges && (
            <div className="changes-notice">
              ⚠️ Vous avez modifié la société ou le type de document. Le fichier sera stocké dans le nouveau répertoire sélectionné.
            </div>
          )}
        </div>
        <div className="document-form">
          <h4 className="document-title">{files[0].filename}</h4>
          {/* First row: Entity and Document Type */}
          <div className="form-row">
            <div className="form-group">
              <label>Entité *:</label>
              <select 
                value={currentCompany?.id || ''} 
                onChange={e => { setCurrentCompany(companies.find(c => c.id === parseInt(e.target.value))); setSelectedCompany(companies.find(c => c.id === parseInt(e.target.value))); }}
                className={`${currentCompany?.id !== (initialCompany || selectedCompany)?.id ? 'changed' : ''} ${err.company_id ? 'error' : ''}`}
              >
                <option value="">Sélectionner une entité</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
              {currentCompany?.id !== (initialCompany || selectedCompany)?.id && (
                <small className="change-indicator">Modifié depuis la sélection initiale</small>
              )}
              {err.company_id && <div className="error-message">{err.company_id}</div>}
            </div>
            <div className="form-group">
              <label>Type de document *:</label>
              <select 
                value={currentDoctype?.id || ''} 
                onChange={e => { setCurrentDoctype(doctypes.find(d => d.id === parseInt(e.target.value))); setSelectedDoctype(doctypes.find(d => d.id === parseInt(e.target.value))); }}
                disabled={!currentCompany}
                className={`${currentDoctype?.id !== (initialDoctype || selectedDoctype)?.id ? 'changed' : ''} ${err.doctype_id ? 'error' : ''}`}
              >
                <option value="">Sélectionner un type</option>
                {doctypes.map(doctype => (
                  <option key={doctype.id} value={doctype.id}>{doctype.name}</option>
                ))}
              </select>
              {currentDoctype?.id !== (initialDoctype || selectedDoctype)?.id && (
                <small className="change-indicator">Modifié depuis la sélection initiale</small>
              )}
              {err.doctype_id && <div className="error-message">{err.doctype_id}</div>}
            </div>
          </div>
          {/* Second row: Partner Selection (full width) */}
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
              <label>Partenaire externe *:</label>
              <select
                value={doc.confirmed_data.partner_id || ''}
                onChange={e => handlePartnerChange(0, e)}
                className={err.partner_id ? 'error' : ''}
              >
                <option value="">Sélectionner un partenaire externe</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>{partner.company_name} ({partner.partnertypes.map(pt => pt.name).join(', ')})</option>
                ))}
              </select>
              {err.partner_id && <div className="error-message">{err.partner_id}</div>}
            </div>
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={doc.is_invoice || false}
                onChange={e => updateConfirmedDocument(0, 'is_invoice', e.target.checked)}
              />
              Ce fichier est une facture
            </label>
          </div>
          {doc.is_invoice && (
            <div className="invoice-fields">
              <div className="form-row">
                <div className="form-group">
                  <label>Numéro de facture *:</label>
                  <input
                    type="text"
                    value={doc.confirmed_data.invoice_number || ''}
                    onChange={e => updateConfirmedDocument(0, 'invoice_number', e.target.value)}
                    className={err.invoice_number ? 'error' : ''}
                  />
                  {err.invoice_number && <div className="error-message">{err.invoice_number}</div>}
                </div>
                <div className="form-group">
                  <label>Date *:</label>
                  <input
                    type="date"
                    value={doc.confirmed_data.date || ''}
                    onChange={e => updateConfirmedDocument(0, 'date', e.target.value)}
                    className={err.date ? 'error' : ''}
                  />
                  {err.date && <div className="error-message">{err.date}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total HT (€) *:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={doc.confirmed_data.total_ht || ''}
                    onChange={e => updateConfirmedDocument(0, 'total_ht', parseFloat(e.target.value) || '')}
                    className={err.total_ht ? 'error' : ''}
                  />
                  {err.total_ht && <div className="error-message">{err.total_ht}</div>}
                </div>
                <div className="form-group">
                  <label>TVA (€) *:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={doc.confirmed_data.tva || ''}
                    onChange={e => updateConfirmedDocument(0, 'tva', parseFloat(e.target.value) || '')}
                    className={err.tva ? 'error' : ''}
                  />
                  {err.tva && <div className="error-message">{err.tva}</div>}
                </div>
                <div className="form-group">
                  <label>Total TTC (€) *:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={doc.confirmed_data.total_ttc || ''}
                    onChange={e => updateConfirmedDocument(0, 'total_ttc', parseFloat(e.target.value) || '')}
                    className={err.total_ttc ? 'error' : ''}
                  />
                  {err.total_ttc && <div className="error-message">{err.total_ttc}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="confirmation-actions">
          <button className="btn-secondary" onClick={onCancel} disabled={isLoading}>Annuler</button>
          {!hideConfirmButton && (
            <button className="btn-primary" onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? 'Confirmation...' : hasChanges ? 'Confirmer avec modifications' : 'Confirmer'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Multi-file form
  return (
    <div className="document-confirmation-form">
      <div className="form-header">
        {hasChanges && (
          <div className="changes-notice">
            ⚠️ Vous avez modifié la société ou le type de document. Les fichiers seront stockés dans le nouveau répertoire sélectionné.
          </div>
        )}
      </div>
      <div className="document-form">
        {files.map((file, idx) => (
          <div key={file.sessionId || file.filename} className="multi-file-section">
            <h4 className="document-title">{file.filename}</h4>
            {/* First row: Entity and Document Type */}
            <div className="form-row">
              <div className="form-group">
                <label>Entité *:</label>
                <select 
                  value={currentCompany?.id || ''} 
                  onChange={e => { setCurrentCompany(companies.find(c => c.id === parseInt(e.target.value))); setSelectedCompany(companies.find(c => c.id === parseInt(e.target.value))); }}
                  className={`${currentCompany?.id !== (initialCompany || selectedCompany)?.id ? 'changed' : ''} ${errors[idx].company_id ? 'error' : ''}`}
                >
                  <option value="">Sélectionner une entité</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
                {currentCompany?.id !== (initialCompany || selectedCompany)?.id && (
                  <small className="change-indicator">Modifié depuis la sélection initiale</small>
                )}
                {errors[idx].company_id && <div className="error-message">{errors[idx].company_id}</div>}
              </div>
              <div className="form-group">
                <label>Type de document *:</label>
                <select 
                  value={currentDoctype?.id || ''} 
                  onChange={e => { setCurrentDoctype(doctypes.find(d => d.id === parseInt(e.target.value))); setSelectedDoctype(doctypes.find(d => d.id === parseInt(e.target.value))); }}
                  disabled={!currentCompany}
                  className={`${currentDoctype?.id !== (initialDoctype || selectedDoctype)?.id ? 'changed' : ''} ${errors[idx].doctype_id ? 'error' : ''}`}
                >
                  <option value="">Sélectionner un type</option>
                  {doctypes.map(doctype => (
                    <option key={doctype.id} value={doctype.id}>{doctype.name}</option>
                  ))}
                </select>
                {currentDoctype?.id !== (initialDoctype || selectedDoctype)?.id && (
                  <small className="change-indicator">Modifié depuis la sélection initiale</small>
                )}
                {errors[idx].doctype_id && <div className="error-message">{errors[idx].doctype_id}</div>}
              </div>
            </div>
            {/* Second row: Partner Selection (full width) */}
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                <label>Partenaire externe *:</label>
                <select
                  value={confirmedDocuments[idx].confirmed_data.partner_id || ''}
                  onChange={e => handlePartnerChange(idx, e)}
                  className={errors[idx].partner_id ? 'error' : ''}
                >
                  <option value="">Sélectionner un partenaire externe</option>
                  {partners.map(partner => (
                    <option key={partner.id} value={partner.id}>{partner.company_name} ({partner.partnertypes.map(pt => pt.name).join(', ')})</option>
                  ))}
                </select>
                {errors[idx].partner_id && <div className="error-message">{errors[idx].partner_id}</div>}
              </div>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={confirmedDocuments[idx].is_invoice || false}
                  onChange={e => updateConfirmedDocument(idx, 'is_invoice', e.target.checked)}
                />
                Ce fichier est une facture
              </label>
            </div>
            {confirmedDocuments[idx].is_invoice && (
              <div className="invoice-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label>Numéro de facture *:</label>
                    <input
                      type="text"
                      value={confirmedDocuments[idx].confirmed_data.invoice_number || ''}
                      onChange={e => updateConfirmedDocument(idx, 'invoice_number', e.target.value)}
                      className={errors[idx].invoice_number ? 'error' : ''}
                    />
                    {errors[idx].invoice_number && <div className="error-message">{errors[idx].invoice_number}</div>}
                  </div>
                  <div className="form-group">
                    <label>Date *:</label>
                    <input
                      type="date"
                      value={confirmedDocuments[idx].confirmed_data.date || ''}
                      onChange={e => updateConfirmedDocument(idx, 'date', e.target.value)}
                      className={errors[idx].date ? 'error' : ''}
                    />
                    {errors[idx].date && <div className="error-message">{errors[idx].date}</div>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Total HT (€) *:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={confirmedDocuments[idx].confirmed_data.total_ht || ''}
                      onChange={e => updateConfirmedDocument(idx, 'total_ht', parseFloat(e.target.value) || '')}
                      className={errors[idx].total_ht ? 'error' : ''}
                    />
                    {errors[idx].total_ht && <div className="error-message">{errors[idx].total_ht}</div>}
                  </div>
                  <div className="form-group">
                    <label>TVA (€) *:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={confirmedDocuments[idx].confirmed_data.tva || ''}
                      onChange={e => updateConfirmedDocument(idx, 'tva', parseFloat(e.target.value) || '')}
                      className={errors[idx].tva ? 'error' : ''}
                    />
                    {errors[idx].tva && <div className="error-message">{errors[idx].tva}</div>}
                  </div>
                  <div className="form-group">
                    <label>Total TTC (€) *:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={confirmedDocuments[idx].confirmed_data.total_ttc || ''}
                      onChange={e => updateConfirmedDocument(idx, 'total_ttc', parseFloat(e.target.value) || '')}
                      className={errors[idx].total_ttc ? 'error' : ''}
                    />
                    {errors[idx].total_ttc && <div className="error-message">{errors[idx].total_ttc}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="confirmation-actions">
        <button className="btn-secondary" onClick={onCancel} disabled={isLoading}>Annuler</button>
        {!hideConfirmButton && (
          <button className="btn-primary" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Confirmation...' : hasChanges ? 'Confirmer avec modifications' : 'Confirmer'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentConfirmationForm;