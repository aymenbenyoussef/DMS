import React, { useState, useEffect, useContext } from 'react';
import API from '../../api';
import { AppContext } from '../context';
import PartnerSelector from './PartnerSelector';
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
  const [currentCompany, setCurrentCompany] = useState(initialCompany || selectedCompany);
  const [currentDoctype, setCurrentDoctype] = useState(initialDoctype || selectedDoctype);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
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
  }, []);

  // Load doctypes when company changes
  useEffect(() => {
    if (currentCompany?.id) {
      loadDoctypesByCompany(currentCompany.id);
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
      doctype_id: null
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
  };

  const handlePartnerChange = (partnerId, partner) => {
    updateConfirmedDocument('partner_id', partnerId);
    if (partner) {
      updateConfirmedDocument('partner', partner.company_name);
    }
  };

  const handleConfirm = async () => {
    if (!currentCompany || !currentDoctype) {
      alert('Veuillez sélectionner une entreprise et un type de document.');
      return;
    }

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
              required
              className={currentCompany?.id !== (initialCompany || selectedCompany)?.id ? 'changed' : ''}
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
          </div>
          <div className="form-group">
            <label>Type de document *:</label>
            <select 
              value={currentDoctype?.id || ''} 
              onChange={handleDoctypeChange}
              disabled={!currentCompany}
              required
              className={currentDoctype?.id !== (initialDoctype || selectedDoctype)?.id ? 'changed' : ''}
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
                <label>Numéro de facture :</label>
                <input
                  type="text"
                  value={confirmedDocument?.confirmed_data?.invoice_number || ''}
                  onChange={(e) => updateConfirmedDocument('invoice_number', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Date :</label>
                <input
                  type="date"
                  value={confirmedDocument?.confirmed_data?.date || ''}
                  onChange={(e) => updateConfirmedDocument('date', e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Partenaire :</label>
                <input
                  type="text"
                  value={confirmedDocument?.confirmed_data?.partner || ''}
                  onChange={(e) => updateConfirmedDocument('partner', e.target.value)}
                  placeholder="Nom du partenaire"
                />
              </div>
              <div className="form-group">
                <label>Partenaire externe :</label>
                <PartnerSelector
                  selectedPartnerId={confirmedDocument?.confirmed_data?.partner_id}
                  onPartnerChange={handlePartnerChange}
                  placeholder="Sélectionner un partenaire externe"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Total HT (€) :</label>
                <input
                  type="number"
                  step="0.01"
                  value={confirmedDocument?.confirmed_data?.total_ht || ''}
                  onChange={(e) => updateConfirmedDocument('total_ht', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label>TVA (€) :</label>
                <input
                  type="number"
                  step="0.01"
                  value={confirmedDocument?.confirmed_data?.tva || ''}
                  onChange={(e) => updateConfirmedDocument('tva', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label>Total TTC (€) :</label>
                <input
                  type="number"
                  step="0.01"
                  value={confirmedDocument?.confirmed_data?.total_ttc || ''}
                  onChange={(e) => updateConfirmedDocument('total_ttc', parseFloat(e.target.value) || 0)}
                />
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
          disabled={isLoading || !currentCompany || !currentDoctype}
        >
          {isLoading ? 'Confirmation...' : hasChanges ? 'Confirmer avec modifications' : 'Confirmer'}
        </button>
      </div>
    </div>
  );
};

export default DocumentConfirmationForm;

