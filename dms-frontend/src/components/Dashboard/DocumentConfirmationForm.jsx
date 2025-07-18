import React, { useState, useEffect, useContext } from 'react';
import API from '../../api';
import { AppContext } from '../context';
import './DocumentConfirmationForm.css';

const DocumentConfirmationForm = ({ 
  sessionId, 
  extractedData, 
  filename, 
  onConfirm, 
  onCancel,
  initialCompany,
  initialDoctype
}) => {
  const { selectedCompany, selectedDoctype, setSelectedCompany, setSelectedDoctype } = useContext(AppContext);
  const [companies, setCompanies] = useState([]);
  const [doctypes, setDoctypes] = useState([]);
  const [partners, setPartners] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(initialCompany || selectedCompany);
  const [currentDoctype, setCurrentDoctype] = useState(initialDoctype || selectedDoctype);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmedDocument, setConfirmedDocument] = useState({
    filename: filename,
    company_id: (initialCompany || selectedCompany)?.id,
    doctype_id: (initialDoctype || selectedDoctype)?.id,
    is_invoice: extractedData?.is_invoice || false,
    confirmed_data: {
      invoice_number: extractedData?.invoice_number || '',
      date: extractedData?.date || '',
      partner: extractedData?.partner || '',
      partner_id: extractedData?.partner_id || '',
      total_ht: extractedData?.total_ht || '',
      tva: extractedData?.tva || '',
      total_ttc: extractedData?.total_ttc || '',
      is_invoice: extractedData?.is_invoice || false
    }
  });

  // Load companies on component mount
  useEffect(() => {
    loadCompanies();
    // Load partners only if we have an initial company
    if (currentCompany?.id) {
      loadPartners(currentCompany.id);
    }
  }, []);

  // Load doctypes and partners when company changes
  useEffect(() => {
    if (currentCompany?.id) {
      loadDoctypesByCompany(currentCompany.id);
      loadPartners(currentCompany.id); // Reload partners for the selected company
    } else {
      // Clear partners if no company is selected
      setPartners([]);
    }
  }, [currentCompany]);

  // Check for changes from initial selection
  useEffect(() => {
    const companyChanged = currentCompany?.id !== (initialCompany || selectedCompany)?.id;
    const doctypeChanged = currentDoctype?.id !== (initialDoctype || selectedDoctype)?.id;
    setHasChanges(companyChanged || doctypeChanged);
  }, [currentCompany, currentDoctype, initialCompany, initialDoctype, selectedCompany, selectedDoctype]);

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

  const handleCompanyChange = (e) => {
    const companyId = parseInt(e.target.value);
    const company = companies.find(c => c.id === companyId);
    setCurrentCompany(company);
    setSelectedCompany(company);
    setConfirmedDocument(prev => ({
      ...prev,
      company_id: companyId
    }));
    // Reset doctype when company changes
    setCurrentDoctype(null);
    setSelectedDoctype(null);
    setConfirmedDocument(prev => ({
      ...prev,
      doctype_id: null,
      // Also reset partner selection when company changes
      confirmed_data: {
        ...prev.confirmed_data,
        partner_id: '',
        partner: ''
      }
    }));
  };

  const handleDoctypeChange = (e) => {
    const doctypeId = parseInt(e.target.value);
    const doctype = doctypes.find(d => d.id === doctypeId);
    setCurrentDoctype(doctype);
    setSelectedDoctype(doctype);
    setConfirmedDocument(prev => ({
      ...prev,
      doctype_id: doctypeId
    }));
  };

  const updateConfirmedDocument = (field, value) => {
    setConfirmedDocument(prev => {
      const updated = { ...prev };
      if (field === 'is_invoice') {
        updated.is_invoice = value;
        updated.confirmed_data.is_invoice = value;
      } else {
        updated.confirmed_data[field] = value;
      }
      return updated;
    });
    
    // Clear error when field is changed
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePartnerChange = (e) => {
    const partnerId = e.target.value;
    const partner = partners.find(p => p.id === parseInt(partnerId));
    
    updateConfirmedDocument('partner_id', partnerId);
    if (partner) {
      updateConfirmedDocument('partner', partner.company_name);
    } else {
      updateConfirmedDocument('partner', '');
    }

    // Clear partner error
    if (errors.partner_id) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.partner_id;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!currentCompany) {
      newErrors.company_id = 'Veuillez sélectionner une entité';
    }
    
    if (!currentDoctype) {
      newErrors.doctype_id = 'Veuillez sélectionner un type de document';
    }
    
    if (confirmedDocument.is_invoice) {
      const invData = confirmedDocument.confirmed_data;
      
      if (!invData.invoice_number) {
        newErrors.invoice_number = 'Le numéro de facture est requis';
      }
      
      if (!invData.date) {
        newErrors.date = 'La date est requise';
      }
      
      if (!invData.partner_id) {
        newErrors.partner_id = 'Veuillez sélectionner un partenaire';
      }
      
      if (invData.total_ht === '' || isNaN(invData.total_ht) || invData.total_ht <= 0) {
        newErrors.total_ht = 'Total HT doit être un nombre supérieur à 0';
      }
      
      if (invData.tva === '' || isNaN(invData.tva) || invData.tva < 0) {
        newErrors.tva = 'TVA doit être un nombre positif ou nul';
      }
      
      if (invData.total_ttc === '' || isNaN(invData.total_ttc) || invData.total_ttc <= 0) {
        newErrors.total_ttc = 'Total TTC doit être un nombre supérieur à 0';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    const isValid = validateForm();
    if (!isValid) return;

    setIsLoading(true);
    try {
      await onConfirm(confirmedDocument);
    } catch (error) {
      console.error('Error confirming document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="document-confirmation-form">
      <div className="form-header">
        <h3>Confirmation du document</h3>
        <p>Vérifiez et modifiez les informations extraites si nécessaire :</p>
        {hasChanges && (
          <div className="changes-notice">
            ⚠️ Vous avez modifié la société ou le type de document. Le fichier sera stocké dans le nouveau répertoire sélectionné.
          </div>
        )}
      </div>
      
      <div className="document-form">
        <h4 className="document-title">{filename}</h4>
        
        <div className="form-row">
          <div className="form-group">
            <label>Entité *:</label>
            <select 
              value={currentCompany?.id || ''} 
              onChange={handleCompanyChange}
              className={`${currentCompany?.id !== (initialCompany || selectedCompany)?.id ? 'changed' : ''} ${errors.company_id ? 'error' : ''}`}
            >
              <option value="">Sélectionner une entité</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {currentCompany?.id !== (initialCompany || selectedCompany)?.id && (
              <small className="change-indicator">Modifié depuis la sélection initiale</small>
            )}
            {errors.company_id && <div className="error-message">{errors.company_id}</div>}
          </div>
          <div className="form-group">
            <label>Type de document *:</label>
            <select 
              value={currentDoctype?.id || ''} 
              onChange={handleDoctypeChange}
              disabled={!currentCompany}
              className={`${currentDoctype?.id !== (initialDoctype || selectedDoctype)?.id ? 'changed' : ''} ${errors.doctype_id ? 'error' : ''}`}
            >
              <option value="">Sélectionner un type</option>
              {doctypes.map(doctype => (
                <option key={doctype.id} value={doctype.id}>
                  {doctype.name}
                </option>
              ))}
            </select>
            {currentDoctype?.id !== (initialDoctype || selectedDoctype)?.id && (
              <small className="change-indicator">Modifié depuis la sélection initiale</small>
            )}
            {errors.doctype_id && <div className="error-message">{errors.doctype_id}</div>}
          </div>
        </div>
        
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={confirmedDocument?.is_invoice || false}
              onChange={(e) => updateConfirmedDocument('is_invoice', e.target.checked)}
            />
            Ce fichier est une facture
          </label>
        </div>
        
        {confirmedDocument?.is_invoice && (
          <div className="invoice-fields">
            <div className="form-row">
              <div className="form-group">
                <label>Numéro de facture *:</label>
                <input
                  type="text"
                  value={confirmedDocument?.confirmed_data?.invoice_number || ''}
                  onChange={(e) => updateConfirmedDocument('invoice_number', e.target.value)}
                  className={errors.invoice_number ? 'error' : ''}
                />
                {errors.invoice_number && <div className="error-message">{errors.invoice_number}</div>}
              </div>
              <div className="form-group">
                <label>Date *:</label>
                <input
                  type="date"
                  value={confirmedDocument?.confirmed_data?.date || ''}
                  onChange={(e) => updateConfirmedDocument('date', e.target.value)}
                  className={errors.date ? 'error' : ''}
                />
                {errors.date && <div className="error-message">{errors.date}</div>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Partenaire externe *:</label>
                <select
                  value={confirmedDocument?.confirmed_data?.partner_id || ''}
                  onChange={handlePartnerChange}
                  className={errors.partner_id ? 'error' : ''}
                >
                  <option value="">Sélectionner un partenaire externe</option>
                  {partners.map(partner => (
                    <option key={partner.id} value={partner.id}>
                      {partner.company_name} ({partner.email})
                    </option>
                  ))}
                </select>
                {errors.partner_id && <div className="error-message">{errors.partner_id}</div>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Total HT (€) *:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={confirmedDocument?.confirmed_data?.total_ht || ''}
                  onChange={(e) => updateConfirmedDocument('total_ht', parseFloat(e.target.value) || '')}
                  className={errors.total_ht ? 'error' : ''}
                />
                {errors.total_ht && <div className="error-message">{errors.total_ht}</div>}
              </div>
              <div className="form-group">
                <label>TVA (€) *:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={confirmedDocument?.confirmed_data?.tva || ''}
                  onChange={(e) => updateConfirmedDocument('tva', parseFloat(e.target.value) || '')}
                  className={errors.tva ? 'error' : ''}
                />
                {errors.tva && <div className="error-message">{errors.tva}</div>}
              </div>
              <div className="form-group">
                <label>Total TTC (€) *:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={confirmedDocument?.confirmed_data?.total_ttc || ''}
                  onChange={(e) => updateConfirmedDocument('total_ttc', parseFloat(e.target.value) || '')}
                  className={errors.total_ttc ? 'error' : ''}
                />
                {errors.total_ttc && <div className="error-message">{errors.total_ttc}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="confirmation-actions">
        <button 
          className="btn-secondary" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Annuler
        </button>
        <button 
          className="btn-primary" 
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Confirmation...' : hasChanges ? 'Confirmer avec modifications' : 'Confirmer'}
        </button>
      </div>
    </div>
  );
};

export default DocumentConfirmationForm;