import React, { useState, useEffect } from 'react';
import API from '../../api';
import './EditDocumentForm.css';

const EditDocumentForm = ({ document, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    partner_id: '',
    partner_name: '',
    is_invoice: false,
    invoice_number: '',
    invoice_date: '',
    total_ht: '',
    tva: '',
    total_ttc: '',
    filename: '',
  });
  
  const [partners, setPartners] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);

  // Initialize form data when document changes
  useEffect(() => {
    if (document) {
      // Extract data from confirmed_data if it exists, otherwise use direct document properties
      const confirmedData = document.confirmed_data ? 
        (typeof document.confirmed_data === 'string' ? 
          JSON.parse(document.confirmed_data) : 
          document.confirmed_data) : {};
      // Extract data from extracted_data if it exists
      const extractedData = document.extracted_data ? 
        (typeof document.extracted_data === 'string' ? 
          JSON.parse(document.extracted_data) : 
          document.extracted_data) : {};

      setFormData({
        partner_id: confirmedData.partner_id !== undefined ? confirmedData.partner_id : (document.partner_id !== undefined ? document.partner_id : (extractedData.partner_id !== undefined ? extractedData.partner_id : '')),
        partner_name: confirmedData.partner !== undefined ? confirmedData.partner : (document.partner_name !== undefined ? document.partner_name : (extractedData.partner !== undefined ? extractedData.partner : '')),
        is_invoice: confirmedData.is_invoice !== undefined ? confirmedData.is_invoice : (document.is_invoice !== undefined ? document.is_invoice : (extractedData.is_invoice !== undefined ? extractedData.is_invoice : false)),
        invoice_number: confirmedData.invoice_number !== undefined ? confirmedData.invoice_number : (document.invoice_number !== undefined ? document.invoice_number : (extractedData.invoice_number !== undefined ? extractedData.invoice_number : (confirmedData.invoice_number !== undefined ? confirmedData.invoice_number : ''))),
        invoice_date: confirmedData.date !== undefined ? confirmedData.date : (document.invoice_date !== undefined ? document.invoice_date : (extractedData.date !== undefined ? extractedData.date : (confirmedData.invoice_date !== undefined ? confirmedData.invoice_date : (extractedData.invoice_date !== undefined ? extractedData.invoice_date : '')))),
        total_ht: confirmedData.total_ht !== undefined ? confirmedData.total_ht : (document.total_ht !== undefined ? document.total_ht : (extractedData.total_ht !== undefined ? extractedData.total_ht : '')),
        tva: confirmedData.tva !== undefined ? confirmedData.tva : (document.tva !== undefined ? document.tva : (extractedData.tva !== undefined ? extractedData.tva : '')),
        total_ttc: confirmedData.total_ttc !== undefined ? confirmedData.total_ttc : (document.total_ttc !== undefined ? document.total_ttc : (extractedData.total_ttc !== undefined ? extractedData.total_ttc : '')),
        filename: document.filename || '',
      });
    }
  }, [document]);

  // Load partners when component mounts
  useEffect(() => {
    const loadPartners = async () => {
      if (!document?.company_id) return;
      
      setIsLoadingPartners(true);
      try {
        const response = await API.partner.getByCompany(document.company_id);
        setPartners(response.data || []);
      } catch (error) {
        console.error('Error loading partners:', error);
        setPartners([]);
      } finally {
        setIsLoadingPartners(false);
      }
    };

    loadPartners();
  }, [document?.company_id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePartnerChange = (e) => {
    const partnerId = e.target.value;
    const selectedPartner = partners.find(p => p.id === parseInt(partnerId));
    
    setFormData(prev => ({
      ...prev,
      partner_id: partnerId,
      partner_name: selectedPartner ? selectedPartner.company_name : ''
    }));
    
    if (errors.partner_id) {
      setErrors(prev => ({
        ...prev,
        partner_id: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.partner_id) {
      newErrors.partner_id = 'Veuillez sélectionner un partenaire';
    }
    
    if (formData.is_invoice) {
      if (!formData.invoice_number.trim()) {
        newErrors.invoice_number = 'Le numéro de facture est requis';
      }
      if (!formData.invoice_date) {
        newErrors.invoice_date = 'La date de facture est requise';
      }
      if (!formData.total_ht || isNaN(formData.total_ht) || parseFloat(formData.total_ht) <= 0) {
        newErrors.total_ht = 'Le montant HT doit être un nombre positif';
      }
      if (formData.tva === '' || isNaN(formData.tva) || parseFloat(formData.tva) < 0) {
        newErrors.tva = 'La TVA doit être un nombre positif ou nul';
      }
      if (!formData.total_ttc || isNaN(formData.total_ttc) || parseFloat(formData.total_ttc) <= 0) {
        newErrors.total_ttc = 'Le montant TTC doit être un nombre positif';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // TTC verification function
  const isTTCValid = () => {
    if (!formData.is_invoice) return true;
    const ht = parseFloat(formData.total_ht);
    const tva = parseFloat(formData.tva);
    const ttc = parseFloat(formData.total_ttc);
    if (isNaN(ht) || isNaN(tva) || isNaN(ttc)) return true;
    return Math.abs((ht + tva) - ttc) < 0.02;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    // Prepare data for API
    const updateData = {
      confirmed_data: {
        partner_id: formData.partner_id,
        partner: formData.partner_name,
        is_invoice: formData.is_invoice,
        invoice_number: formData.is_invoice ? formData.invoice_number : '',
        date: formData.is_invoice ? formData.invoice_date : '',
        total_ht: formData.is_invoice ? (formData.total_ht ? parseFloat(formData.total_ht) : null) : '',
        tva: formData.is_invoice ? (formData.tva ? parseFloat(formData.tva) : null) : '',
        total_ttc: formData.is_invoice ? (formData.total_ttc ? parseFloat(formData.total_ttc) : null) : '',
      },
      filename: formData.filename !== undefined ? formData.filename : document.filename,
    };
    onSave(updateData);
  };

  if (!document) {
    return null;
  }

  // Determine if the document is an invoice for dynamic modal height
  const isInvoice = !!formData.is_invoice;

  return (
    <div className={`edit-document-form document-confirmation-form${isInvoice ? ' invoice' : ''}`} style={{ maxHeight: '80vh', minHeight: '540px', display: 'flex', flexDirection: 'column' }}>
      <div className="form-header" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
        <h3>Modifier le document</h3>
        <p>Modifiez les informations du document et validez les champs obligatoires.</p>
      </div>
      <form onSubmit={handleSubmit} className="document-form" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="scrollable-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: 0 }}>
          <div className="form-row">
            <div className="form-group full-width-field">
              <label className="form-label" htmlFor="filename">Nom du fichier</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  name="filename"
                  id="filename"
                  value={(() => {
                    const filename = formData.filename !== undefined ? formData.filename : document.filename;
                    const dotIdx = filename.lastIndexOf('.');
                    return dotIdx > 0 ? filename.substring(0, dotIdx) : filename;
                  })()}
                  onChange={e => {
                    const ext = (() => {
                      const filename = formData.filename !== undefined ? formData.filename : document.filename;
                      const dotIdx = filename.lastIndexOf('.');
                      return dotIdx > 0 ? filename.substring(dotIdx) : '';
                    })();
                    setFormData(prev => ({ ...prev, filename: e.target.value + ext }));
                  }}
                  autoComplete="off"
                  style={{ flex: 1 }}
                />
                <span style={{ minWidth: 0, whiteSpace: 'nowrap', color: '#888', fontWeight: 500, fontSize: '1rem' }}>
                  {(() => {
                    const filename = formData.filename !== undefined ? formData.filename : document.filename;
                    const dotIdx = filename.lastIndexOf('.');
                    return dotIdx > 0 ? filename.substring(dotIdx) : '';
                  })()}
                </span>
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group full-width-field">
              <label className="form-label" htmlFor="partner_id">Partenaire externe *</label>
              <select
                name="partner_id"
                id="partner_id"
                className={`form-input${errors.partner_id ? ' error' : ''}`}
                value={formData.partner_id}
                onChange={handlePartnerChange}
                disabled={isLoadingPartners}
              >
                <option value="">Sélectionner un partenaire</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>
                    {partner.company_name}
                    {partner.partnertypes && partner.partnertypes.length > 0 &&
                      ` (${partner.partnertypes.map(pt => pt.name).join(', ')})`
                    }
                  </option>
                ))}
              </select>
              {errors.partner_id && (
                <div className="error-message">{errors.partner_id}</div>
              )}
            </div>
          </div>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_invoice"
                checked={formData.is_invoice}
                onChange={handleInputChange}
              />
              Ce document est une facture
            </label>
          </div>
          {formData.is_invoice && (
            <div className="invoice-fields">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="invoice_number">Numéro de facture *</label>
                  <input
                    type="text"
                    id="invoice_number"
                    name="invoice_number"
                    className={`form-input${errors.invoice_number ? ' error' : ''}`}
                    value={formData.invoice_number}
                    onChange={handleInputChange}
                    placeholder="Ex: FAC-2024-001"
                  />
                  {errors.invoice_number && <div className="error-message">{errors.invoice_number}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="invoice_date">Date de facture *</label>
                  <input
                    type="date"
                    id="invoice_date"
                    name="invoice_date"
                    className={`form-input${errors.invoice_date ? ' error' : ''}`}
                    value={formData.invoice_date}
                    onChange={handleInputChange}
                  />
                  {errors.invoice_date && <div className="error-message">{errors.invoice_date}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="total_ht">Montant HT *</label>
                  <input
                    type="number"
                    id="total_ht"
                    name="total_ht"
                    className={`form-input${errors.total_ht ? ' error' : ''}`}
                    value={formData.total_ht}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  {errors.total_ht && <div className="error-message">{errors.total_ht}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="tva">TVA *</label>
                  <input
                    type="number"
                    id="tva"
                    name="tva"
                    className={`form-input${errors.tva ? ' error' : ''}`}
                    value={formData.tva}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  {errors.tva && <div className="error-message">{errors.tva}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="total_ttc">Montant TTC *</label>
                  <input
                    type="number"
                    id="total_ttc"
                    name="total_ttc"
                    className={`form-input${errors.total_ttc ? ' error' : ''}`}
                    value={formData.total_ttc}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  {errors.total_ttc && <div className="error-message">{errors.total_ttc}</div>}
                </div>
              </div>
              {!isTTCValid() && (
                <div className="error-message">Le montant TTC doit être égal à HT + TVA</div>
              )}
            </div>
          )}
        </div>
        <div className="confirmation-actions" style={{ position: 'sticky', bottom: 0, zIndex: 2, background: '#fff' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner spinner--small" /> : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditDocumentForm;

