import React, { useState } from 'react';
import './DocumentConfirmationForm.css';

const DocumentConfirmationForm = ({ 
  document, 
  onUpdate, 
  onConfirm, 
  onCancel, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    is_invoice: document?.is_invoice || false,
    invoice_number: document?.confirmed_data?.invoice_number || '',
    date: document?.confirmed_data?.date || '',
    vendor: document?.confirmed_data?.vendor || '',
    client: document?.confirmed_data?.client || '',
    total_ht: document?.confirmed_data?.total_ht || '',
    tva: document?.confirmed_data?.tva || '',
    total_ttc: document?.confirmed_data?.total_ttc || ''
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }

    // Update parent component
    onUpdate(field, value);
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.is_invoice) {
      if (!formData.invoice_number.trim()) {
        newErrors.invoice_number = 'Le numéro de facture est requis';
      }
      if (!formData.date) {
        newErrors.date = 'La date est requise';
      }
      if (!formData.vendor.trim()) {
        newErrors.vendor = 'Le fournisseur est requis';
      }
      if (!formData.total_ttc || formData.total_ttc <= 0) {
        newErrors.total_ttc = 'Le total TTC doit être supérieur à 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onConfirm();
    }
  };

  const calculateTotalTTC = () => {
    const totalHT = parseFloat(formData.total_ht) || 0;
    const tva = parseFloat(formData.tva) || 0;
    return (totalHT + tva).toFixed(2);
  };

  const handleTotalHTChange = (value) => {
    const totalHT = parseFloat(value) || 0;
    const tva = parseFloat(formData.tva) || 0;
    const calculatedTTC = totalHT + tva;
    
    handleInputChange('total_ht', totalHT);
    handleInputChange('total_ttc', calculatedTTC);
  };

  const handleTVAChange = (value) => {
    const tva = parseFloat(value) || 0;
    const totalHT = parseFloat(formData.total_ht) || 0;
    const calculatedTTC = totalHT + tva;
    
    handleInputChange('tva', tva);
    handleInputChange('total_ttc', calculatedTTC);
  };

  return (
    <div className="document-confirmation-form">
      <div className="form-header">
        <h4 className="document-title">
          <span className="file-icon">📄</span>
          {document?.filename}
        </h4>
        <div className="document-meta">
          <span className="meta-item">
            <strong>Entity:</strong> {document?.company}
          </span>
          <span className="meta-item">
            <strong>Document Type:</strong> {document?.doctype}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="confirmation-form">
        {/* Document Type Selection */}
        <div className="form-section">
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_invoice}
                onChange={(e) => handleInputChange('is_invoice', e.target.checked)}
                disabled={isLoading}
              />
              <span className="checkbox-text">
                <span className="checkbox-icon">📋</span>
                This Document Is invoice
              </span>
            </label>
          </div>
        </div>

        {/* Invoice Fields */}
        {formData.is_invoice && (
          <div className="form-section invoice-section">
            <h5 className="section-title">
              <span className="section-icon">💰</span>
              Billing information
            </h5>
            
            {/* Basic Invoice Info */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="invoice_number">
                  Invoice number <span className="required">*</span>
                </label>
                <input
                  id="invoice_number"
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                  className={errors.invoice_number ? 'error' : ''}
                  placeholder="Ex: FAC-2024-001"
                  disabled={isLoading}
                />
                {errors.invoice_number && (
                  <span className="error-message">{errors.invoice_number}</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="date">
                  Invoice date  <span className="required">*</span>
                </label>
                <input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={errors.date ? 'error' : ''}
                  disabled={isLoading}
                />
                {errors.date && (
                  <span className="error-message">{errors.date}</span>
                )}
              </div>
            </div>

            {/* Parties */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vendor">
                  Partner <span className="required">*</span>
                </label>
                <input
                  id="vendor"
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => handleInputChange('vendor', e.target.value)}
                  className={errors.vendor ? 'error' : ''}
                  placeholder="Nom du fournisseur"
                  disabled={isLoading}
                />
                {errors.vendor && (
                  <span className="error-message">{errors.vendor}</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="client">Partner ID</label>
                <input
                  id="client"
                  type="text"
                  value={formData.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  placeholder="Nom du client"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Financial Information */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="total_ht">Total HT (€)</label>
                <input
                  id="total_ht"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_ht}
                  onChange={(e) => handleTotalHTChange(e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="tva">TVA (€)</label>
                <input
                  id="tva"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.tva}
                  onChange={(e) => handleTVAChange(e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="total_ttc">
                  Total TTC (€) <span className="required">*</span>
                </label>
                <input
                  id="total_ttc"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_ttc}
                  onChange={(e) => handleInputChange('total_ttc', parseFloat(e.target.value) || 0)}
                  className={errors.total_ttc ? 'error' : ''}
                  placeholder="0.00"
                  disabled={isLoading}
                />
                {errors.total_ttc && (
                  <span className="error-message">{errors.total_ttc}</span>
                )}
              </div>
            </div>

            {/* Calculation Helper */}
            {(formData.total_ht || formData.tva) && (
              <div className="calculation-helper">
                <span className="calculation-text">
                  Automatic calculation : {formData.total_ht || 0} + {formData.tva || 0} = {calculateTotalTTC()} €
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onCancel}
            disabled={isLoading}
          >
            <span className="btn-icon">❌</span>
            Cancel
          </button>
          
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="btn-icon loading">⏳</span>
                Confirmation...
              </>
            ) : (
              <>
                <span className="btn-icon">✅</span>
                Confirm
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentConfirmationForm;
