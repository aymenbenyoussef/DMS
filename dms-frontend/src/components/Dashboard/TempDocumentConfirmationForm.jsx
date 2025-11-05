import React, { useState, useEffect, useContext } from 'react';
import API from '../../api';
import { AppContext } from '../context';
import './TempDocumentConfirmationForm.css';

const DocumentConfirmationForm = ({ 
  files = [], // Array of { sessionId, extractedData, filename }
  onConfirm, // (confirmedDocuments, errors) => void
  onCancel,
  initialCompany,
  initialDoctype,
  hideConfirmButton = false,
  tempDocumentId = null, // ID of the temp document to delete after confirmation
  onRefresh = null // Function to refresh documents list
}) => {
  const { selectedCompany, selectedDoctype, setSelectedCompany, setSelectedDoctype } = useContext(AppContext);
  const [companies, setCompanies] = useState([]);
  const [doctypes, setDoctypes] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(initialCompany);
  const [currentDoctype, setCurrentDoctype] = useState(initialDoctype);
  const [currentPartner, setCurrentPartner] = useState(null); // Added this
  const [partners, setPartners] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  // Array of confirmedDocuments and errors, one per file
  const [confirmedDocuments, setConfirmedDocuments] = useState(() => files.map(f => ({
    filename: f.filename,
    original_filename: f.filename,
    company_id: null,
    doctype_id: null,
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
  const [errors, setErrors] = useState(files.map(() => ({})));

  // Load companies on component mount
  useEffect(() => {
    loadCompanies();
    loadGroups();
    if (currentCompany?.id) {
      loadPartners(currentCompany.id);
    }
  }, []);

  // Load doctypes and partners when company changes
  useEffect(() => {
    if (currentCompany?.id) {
      loadDoctypesByCompany(currentCompany.id);
      loadPartners(currentCompany.id);
      loadGroups(currentCompany.id); // <-- updated
    } else {
      setPartners([]);
      setGroups([]); // <-- updated
    }
  }, [currentCompany]);

  useEffect(() => {
    const companyChanged = currentCompany?.id !== null;
    const doctypeChanged = currentDoctype?.id !== null;
    setHasChanges(companyChanged || doctypeChanged);
  }, [currentCompany, currentDoctype]);

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

  // Replace loadGroups with company-specific version
  const loadGroups = async (companyId) => {
    if (!companyId) {
      setGroups([]);
      return;
    }
    try {
      const response = await API.groups.getAll(companyId);
      setGroups(response.data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
    }
  };

  // Update confirmed document data
  const updateConfirmedDocument = (idx, field, value) => {
    console.log(`updateConfirmedDocument: idx=${idx}, field="${field}", value="${value}"`);
    setConfirmedDocuments(prev => {
      const updated = [...prev];
      if (field === 'is_invoice') {
        updated[idx].is_invoice = value;
        updated[idx].confirmed_data.is_invoice = value;
      } else if (field === 'company_id') {
        updated[idx].company_id = value;
      } else if (field === 'doctype_id') {
        updated[idx].doctype_id = value;
      } else if (field === 'partner_id') {
        updated[idx].confirmed_data.partner_id = value;
        console.log(`Stored partner_id for file ${idx}: "${value}"`);
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
    console.log('=== Starting validation ===');
    const newErrors = files.map((f, idx) => {
      const doc = confirmedDocuments[idx];
      console.log(`Validating file ${idx}:`, doc);
      const errs = {};
      
    if (!currentCompany) {
        errs.company_id = 'Veuillez sélectionner une entité';
    }
    if (!currentDoctype) {
        errs.doctype_id = 'Veuillez sélectionner un type de document';
      }
      if (!currentPartner) {
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
      
      console.log(`File ${idx} errors:`, errs);
      return errs;
    });
    console.log('=== Validation complete ===');
    setErrors(newErrors);
    // Return true if all error objects are empty
    return newErrors.every(err => Object.keys(err).length === 0);
  };

  const handleConfirm = async () => {
    console.log('=== handleConfirm called ===');
    console.log('Current confirmedDocuments:', confirmedDocuments);
    const isValid = validateAll();
    console.log('Validation result:', isValid);
    if (!isValid) {
      console.log('Validation failed, not proceeding with submission');
      return;
    }
    console.log('Validation passed, proceeding with submission');
    setIsLoading(true);
    try {
      await onConfirm(confirmedDocuments, errors);
      
      // Add documents to selected groups
      for (let i = 0; i < confirmedDocuments.length; i++) {
        const doc = confirmedDocuments[i];
        if (doc.confirmed_data.group_id) {
          try {
            // Get the document ID from the response (assuming onConfirm returns document IDs)
            // For now, we'll need to handle this in the parent component
            console.log(`Document should be added to group ${doc.confirmed_data.group_id}`);
          } catch (groupError) {
            console.error('Error adding document to group:', groupError);
          }
        }
      }
      
      // Delete temp document if ID is provided
      if (tempDocumentId) {
      try {
        console.log('Deleting temp document with ID:', tempDocumentId);
        await API.tempDocuments.delete(tempDocumentId);
        console.log('Temp document deleted successfully');
      } catch (deleteError) {
        console.error('Error deleting temp document:', deleteError);
      }
    }
      
      // Refresh documents list if refresh function is provided
      if (onRefresh) {
        try {
          await onRefresh();
          console.log('Documents list refreshed successfully');
        } catch (refreshError) {
          console.error('Error refreshing documents list:', refreshError);
        }
      }
      
      // Show success message
      setSuccessMessage('Document envoyé avec succès!');
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
        onCancel(); // Close the modal
      }, 3000);
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
      
      
        <div className="confirmation-form-scroll-area document-form">
          <h4 className="document-title">{files[0].filename}</h4>
        {/* First row: Entity and Document Type */}
        <div className="form-row">
          <div className="form-group">
            <label>Entité *:</label>
            <select 
              value={currentCompany?.id || ''} 
                onChange={e => { 
                  const companyId = parseInt(e.target.value);
                  setCurrentCompany(companies.find(c => c.id === companyId));
                  updateConfirmedDocument(0, 'company_id', companyId);
                }}
                className={`${err.company_id ? 'error' : ''}`}
            >
              <option value="">Sélectionner une entité</option>
              {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>

              {err.company_id && <div className="error-message">{err.company_id}</div>}
          </div>
          <div className="form-group">
            <label>Type de document *:</label>
            <select 
              value={currentDoctype?.id || ''} 
                onChange={e => { 
                  const doctypeId = parseInt(e.target.value);
                  setCurrentDoctype(doctypes.find(d => d.id === doctypeId));
                  updateConfirmedDocument(0, 'doctype_id', doctypeId);
                }}
              disabled={!currentCompany}
                className={`${err.doctype_id ? 'error' : ''}`}
            >
              <option value="">Sélectionner un type</option>
              {doctypes.map(doctype => (
                  <option key={doctype.id} value={doctype.id}>{doctype.name}</option>
              ))}
            </select>

              {err.doctype_id && <div className="error-message">{err.doctype_id}</div>}
            </div>
          </div>
        {/* Second row: Partner Selection (full width) */}
        <div className="form-row">
          <div className="form-group">
            <label>Partenaire externe *:</label>
            <select
                value={currentPartner?.id || ''}
                onChange={e => { 
                  const partnerId = parseInt(e.target.value);
                  const partner = partners.find(p => p.id === partnerId);
                  setCurrentPartner(partner);
                  updateConfirmedDocument(0, 'partner_id', partnerId);
                  if (partner) {
                    updateConfirmedDocument(0, 'partner', partner.company_name);
                  } else {
                    updateConfirmedDocument(0, 'partner', '');
                  }
                }}
                className={err.partner_id ? 'error' : ''}
                required
            >
              <option value="">Sélectionner un partenaire externe</option>
              {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>{partner.company_name} ({partner.partnertypes.map(pt => pt.name).join(', ')})</option>
              ))}
            </select>
              {err.partner_id && <div className="error-message">{err.partner_id}</div>}
            </div>
          <div className="form-group">
            <label>Groupe:</label>
            <select
                value={doc.confirmed_data.group_id || ''}
                onChange={e => updateConfirmedDocument(0, 'group_id', e.target.value)}
                className={err.group_id ? 'error' : ''}
            >
              <option value="">Sélectionner un groupe (optionnel)</option>
              {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
              {err.group_id && <div className="error-message">{err.group_id}</div>}
            </div>
          </div>
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
                checked={doc.is_invoice || false}
                onChange={e => {
                  const isInvoice = e.target.checked;
                  console.log(`Invoice checkbox toggled: ${isInvoice}`);
                  updateConfirmedDocument(0, 'is_invoice', isInvoice);
                  // Trigger validation immediately after toggling invoice status
                  setTimeout(() => {
                    console.log('Running validation after invoice toggle...');
                    const newErrors = validateAll();
                    console.log('Validation after invoice toggle:', newErrors);
                  }, 50);
                }}
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
                <label>Total HT  *:</label>
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
                <label>TVA  *:</label>
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
                <label>Total TTC  *:</label>
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
        {successMessage && (
          <div className="alert alert-success mb-3" style={{
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            color: '#155724',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <i className="bi bi-check-circle me-2"></i>
            {successMessage}
          </div>
        )}
        <div className="confirmation-actions">
          <button className="btn-secondary" onClick={onCancel} disabled={isLoading}>Annuler</button>
          {!hideConfirmButton && (
            <button className="btn-primary" onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? 'Confirmation...' : 'Confirm'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Multi-file form
  return (
    <div className="document-confirmation-form">
      
      <div className="confirmation-form-scroll-area document-form">
        {files.map((file, idx) => (
          <div key={file.sessionId || file.filename} className="multi-file-section">
            <h4 className="document-title">{file.filename}</h4>
            {/* First row: Entity and Document Type */}
            <div className="form-row">
              <div className="form-group">
                <label>Entité *:</label>
                <select 
                  value={currentCompany?.id || ''} 
                  onChange={e => { 
                    const companyId = parseInt(e.target.value);
                    setCurrentCompany(companies.find(c => c.id === companyId));
                    updateConfirmedDocument(idx, 'company_id', companyId);
                  }}
                  className={`${errors[idx].company_id ? 'error' : ''}`}
                >
                  <option value="">Sélectionner une entité</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>

                {errors[idx].company_id && <div className="error-message">{errors[idx].company_id}</div>}
              </div>
              <div className="form-group">
                <label>Type de document *:</label>
                <select 
                  value={currentDoctype?.id || ''} 
                  onChange={e => { 
                    const doctypeId = parseInt(e.target.value);
                    setCurrentDoctype(doctypes.find(d => d.id === doctypeId));
                    updateConfirmedDocument(idx, 'doctype_id', doctypeId);
                  }}
                  disabled={!currentCompany}
                  className={`${errors[idx].doctype_id ? 'error' : ''}`}
                >
                  <option value="">Sélectionner un type</option>
                  {doctypes.map(doctype => (
                    <option key={doctype.id} value={doctype.id}>{doctype.name}</option>
                  ))}
                </select>

                {errors[idx].doctype_id && <div className="error-message">{errors[idx].doctype_id}</div>}
              </div>
            </div>
            {/* Second row: Partner Selection (full width) */}
            <div className="form-row">
              <div className="form-group">
                <label>Partenaire externe *:</label>
                <select
                  value={currentPartner?.id || ''}
                  onChange={e => { 
                    const partnerId = parseInt(e.target.value);
                    const partner = partners.find(p => p.id === partnerId);
                    setCurrentPartner(partner);
                    updateConfirmedDocument(idx, 'partner_id', partnerId);
                    if (partner) {
                      updateConfirmedDocument(idx, 'partner', partner.company_name);
                    } else {
                      updateConfirmedDocument(idx, 'partner', '');
                    }
                  }}
                  className={errors[idx].partner_id ? 'error' : ''}
                  required
                >
                  <option value="">Sélectionner un partenaire externe</option>
                  {partners.map(partner => (
                    <option key={partner.id} value={partner.id}>{partner.company_name} ({partner.partnertypes.map(pt => pt.name).join(', ')})</option>
                  ))}
                </select>
                {errors[idx].partner_id && <div className="error-message">{errors[idx].partner_id}</div>}
              </div>
              <div className="form-group">
                <label>Groupe:</label>
                <select
                  value={confirmedDocuments[idx].confirmed_data.group_id || ''}
                  onChange={e => updateConfirmedDocument(idx, 'group_id', e.target.value)}
                  className={errors[idx].group_id ? 'error' : ''}
                >
                  <option value="">Sélectionner un groupe (optionnel)</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
                {errors[idx].group_id && <div className="error-message">{errors[idx].group_id}</div>}
              </div>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={confirmedDocuments[idx].is_invoice || false}
                  onChange={e => {
                    const isInvoice = e.target.checked;
                    console.log(`Invoice checkbox toggled for file ${idx}: ${isInvoice}`);
                    updateConfirmedDocument(idx, 'is_invoice', isInvoice);
                    // Trigger validation immediately after toggling invoice status
                    setTimeout(() => {
                      console.log('Running validation after invoice toggle...');
                      const newErrors = validateAll();
                      console.log('Validation after invoice toggle:', newErrors);
                    }, 50);
                  }}
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
                    <label>Total HT  *:</label>
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
                    <label>TVA  *:</label>
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
                    <label>Total TTC  *:</label>
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
              {isLoading ? 'Confirmation...' : 'Confirm'}
            </button>
        )}
      </div>
    </div>
  );
};

export default DocumentConfirmationForm;