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
        partner_id: confirmedData.partner_id || document.partner_id || extractedData.partner_id || '',
        partner_name: confirmedData.partner || document.partner_name || extractedData.partner || '',
        is_invoice: confirmedData.is_invoice || document.is_invoice || extractedData.is_invoice || false,
        invoice_number: confirmedData.invoice_number || document.invoice_number || extractedData.invoice_number || '',
        invoice_date: confirmedData.date || document.invoice_date || extractedData.date || '',
        total_ht: confirmedData.total_ht || document.total_ht || extractedData.total_ht || '',
        tva: confirmedData.tva || document.tva || extractedData.tva || '',
        total_ttc: confirmedData.total_ttc || document.total_ttc || extractedData.total_ttc || '',
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
        invoice_number: formData.invoice_number,
        date: formData.invoice_date,
        total_ht: formData.total_ht ? parseFloat(formData.total_ht) : null,
        tva: formData.tva ? parseFloat(formData.tva) : null,
        total_ttc: formData.total_ttc ? parseFloat(formData.total_ttc) : null,
      }
    };
    
    onSave(updateData);
  };

  if (!document) {
    return null;
  }

  return (
    <div className="edit-document-form">
      <form onSubmit={handleSubmit}>
        {/* Document Information */}
        <div className="form-section">
          <h6 className="section-title">Informations du document</h6>
          
          <div className="form-group">
            <label className="form-label">Nom du fichier</label>
            <input
              type="text"
              className="form-control"
              value={document.filename}
              disabled
            />
          </div>
        </div>

        {/* Partner Selection */}
        <div className="form-section">
          <h6 className="section-title">Partenaire</h6>
          
          <div className="form-group">
            <label className="form-label">Partenaire externe *</label>
            <select
              name="partner_id"
              className={`form-control ${errors.partner_id ? 'is-invalid' : ''}`}
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
              <div className="invalid-feedback">{errors.partner_id}</div>
            )}
          </div>
        </div>

        {/* Invoice Information */}
        <div className="form-section">
          <div className="form-group">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="is_invoice"
                name="is_invoice"
                checked={formData.is_invoice}
                onChange={handleInputChange}
              />
              <label className="form-check-label" htmlFor="is_invoice">
                Ce document est une facture
              </label>
            </div>
          </div>

          {formData.is_invoice && (
            <>
              <h6 className="section-title">Détails de la facture</h6>
              
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Numéro de facture *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.invoice_number ? 'is-invalid' : ''}`}
                      name="invoice_number"
                      value={formData.invoice_number}
                      onChange={handleInputChange}
                      placeholder="Ex: FAC-2024-001"
                    />
                    {errors.invoice_number && (
                      <div className="invalid-feedback">{errors.invoice_number}</div>
                    )}
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Date de facture *</label>
                    <input
                      type="date"
                      className={`form-control ${errors.invoice_date ? 'is-invalid' : ''}`}
                      name="invoice_date"
                      value={formData.invoice_date}
                      onChange={handleInputChange}
                    />
                    {errors.invoice_date && (
                      <div className="invalid-feedback">{errors.invoice_date}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label className="form-label">Montant HT (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-control ${errors.total_ht ? 'is-invalid' : ''}`}
                      name="total_ht"
                      value={formData.total_ht}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                    {errors.total_ht && (
                      <div className="invalid-feedback">{errors.total_ht}</div>
                    )}
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="form-group">
                    <label className="form-label">TVA (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-control ${errors.tva ? 'is-invalid' : ''}`}
                      name="tva"
                      value={formData.tva}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                    {errors.tva && (
                      <div className="invalid-feedback">{errors.tva}</div>
                    )}
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="form-group">
                    <label className="form-label">Montant TTC (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-control ${errors.total_ttc ? 'is-invalid' : ''}`}
                      name="total_ttc"
                      value={formData.total_ttc}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                    {errors.total_ttc && (
                      <div className="invalid-feedback">{errors.total_ttc}</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Enregistrement...
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditDocumentForm;

