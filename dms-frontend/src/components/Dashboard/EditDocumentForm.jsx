import React, { useState, useEffect } from 'react';
import API from '../../api';
import './EditDocumentForm.css';

const EditDocumentForm = ({ document, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    partner_id: '',
    partner_name: '',
    is_invoice: false,
    invoice_number: '',
    document_date: '',
    due_date: '',
    total_ht: null,
    tva: null,
    total_ttc: null,
    currency: '',
    filename: '',
  });
  
  const [partners, setPartners] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);

  // Initialize form data when document changes
  useEffect(() => {
    if (document) {
      console.log("Document data:", document);
      
      // Extract data from confirmed_data if it exists
      let confirmedData = {};
      if (document.confirmed_data) {
        try {
          confirmedData = typeof document.confirmed_data === 'string' 
            ? JSON.parse(document.confirmed_data) 
            : document.confirmed_data;
          console.log("Confirmed data:", confirmedData);
        } catch (e) {
          console.error("Error parsing confirmed_data:", e);
        }
      }
      
      // Extract data from extracted_data if it exists
      let extractedData = {};
      if (document.extracted_text) {
  try {
    const maybeJson = JSON.parse(document.extracted_text);
    if (typeof maybeJson === 'object') {
      extractedData = maybeJson;
    }
  } catch (e) {
    console.log("Extracted_text is not JSON, ignoring...");
  }
}

      // Helper function to get value from multiple sources
      const getValue = (confirmedKey, documentKey, extractedKey, defaultValue = '') => {
        if (confirmedData[confirmedKey] !== undefined && confirmedData[confirmedKey] !== null && confirmedData[confirmedKey] !== '') {
          console.log(`Using confirmedData.${confirmedKey}:`, confirmedData[confirmedKey]);
          return confirmedData[confirmedKey];
        }
        if (document[documentKey] !== undefined && document[documentKey] !== null && document[documentKey] !== '') {
          console.log(`Using document.${documentKey}:`, document[documentKey]);
          return document[documentKey];
        }
        if (extractedData[extractedKey] !== undefined && extractedData[extractedKey] !== null && extractedData[extractedKey] !== '') {
          console.log(`Using extractedData.${extractedKey}:`, extractedData[extractedKey]);
          return extractedData[extractedKey];
        }
        console.log(`No value found for ${confirmedKey}/${documentKey}/${extractedKey}, using default:`, defaultValue);
        return defaultValue;
      };

      // For date fields, we need to handle both string and Date objects
     const getDateValue = (confirmedKey, documentKey, extractedKey, defaultValue = '') => {
  let value = getValue(confirmedKey, documentKey, extractedKey, defaultValue);

  if (!value) return defaultValue;

  const date = new Date(value);
  if (isNaN(date)) return value;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${year}-${month}-${day}`; // 👈 input type="date" format
};




      setFormData({
  partner_id: String(getValue('partner_id', 'partner_id', 'partner_id') ?? ''),
  partner_name: getValue('partner', 'partner_name', 'partner'),
  is_invoice: getValue('is_invoice', 'is_invoice', 'is_invoice', false),
  invoice_number: getValue('invoice_number', 'invoice_number', 'invoice_number') ?? '',
  document_date: getDateValue('document_date', 'document_date', 'date'),
  due_date: getDateValue('due_date', 'due_date', 'due_date'),
  total_ht: getValue('total_ht', 'total_ht', 'total_ht'),
  tva: getValue('tva', 'tva', 'tva'),
  total_ttc: getValue('total_ttc', 'total_ttc', 'total_ttc'),
  currency: getValue('currency', 'currency', 'currency'),
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
      if (!formData.document_date) {
        newErrors.document_date = 'La date de facture est requise';
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
        invoice_number: formData.is_invoice ? (formData.invoice_number ? parseFloat(formData.invoice_number) : null) : '',
        
        due_date: formData.is_invoice ? formData.due_date : '',
        total_ht: formData.is_invoice ? (formData.total_ht ? parseFloat(formData.total_ht) : null) : '',
        tva: formData.is_invoice ? (formData.tva ? parseFloat(formData.tva) : null) : '',
        total_ttc: formData.is_invoice ? (formData.total_ttc ? parseFloat(formData.total_ttc) : null) : '',
        currency: formData.currency,
      },
      filename: formData.filename !== undefined ? formData.filename : document.filename,
      document_date: formData.document_date,
    };
    onSave(updateData);
  };

  if (!document) {
    return null;
  }

  // Determine if the document is an invoice for dynamic modal height
  const isInvoice = !!formData.is_invoice;

  return (
  <div className={`edit-document-form document-confirmation-form${isInvoice ? ' invoice' : ''}`}> 
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
          <div className="form-row two-cols">
          <div className="form-group">
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
          <div className="form-group">
            <label className="form-label" htmlFor="document_date">Date de document</label>
            <input
              type="date"
              id="document_date"
              name="document_date"
              className={`form-input${errors.document_date ? ' error' : ''}`}
              value={formData.document_date}
              onChange={handleInputChange}
            />
            {errors.document_date && <div className="error-message">{errors.document_date}</div>}
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
          {formData.is_invoice ? (
            // Your existing invoice fields code
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
            <label className="form-label" htmlFor="document_date">Date d'échéance</label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              className={`form-input${errors.due_date ? ' error' : ''}`}
              value={formData.due_date}
              onChange={handleInputChange}
            />
            {errors.due_date && <div className="error-message">{errors.due_date}</div>}
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
              
              <div className="form-group">
                <label className="form-label">Devise</label>
                <select   
                  name="currency" 
                  className="custom-select"
                  value={formData.currency}
                  onChange={handleInputChange}
                  style={{ Height: "40px !important", overflowY: "auto",maxWidth:"300px !important" }}
                >
                  <option value="">Sélectionner une devise</option>
                  {/* Common currency codes, you can add more if needed */}
                  <option value="TND">TND - Tunisian Dinar</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="CHF">CHF - Swiss Franc</option>
                  <option value="CNY">CNY - Chinese Yuan</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="BRL">BRL - Brazilian Real</option>
                  <option value="ZAR">ZAR - South African Rand</option>
                  <option value="RUB">RUB - Russian Ruble</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="TRY">TRY - Turkish Lira</option>
                  <option value="MXN">MXN - Mexican Peso</option>
                  <option value="KRW">KRW - South Korean Won</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                  <option value="NZD">NZD - New Zealand Dollar</option>
                  <option value="SEK">SEK - Swedish Krona</option>
                  <option value="NOK">NOK - Norwegian Krone</option>
                  <option value="DKK">DKK - Danish Krone</option>
                  <option value="PLN">PLN - Polish Zloty</option>
                  <option value="EGP">EGP - Egyptian Pound</option>
                  <option value="MAD">MAD - Moroccan Dirham</option>
                  <option value="UAH">UAH - Ukrainian Hryvnia</option>
                  <option value="THB">THB - Thai Baht</option>
                  <option value="IDR">IDR - Indonesian Rupiah</option>
                  <option value="MYR">MYR - Malaysian Ringgit</option>
                  <option value="PHP">PHP - Philippine Peso</option>
                  <option value="VND">VND - Vietnamese Dong</option>
                  <option value="COP">COP - Colombian Peso</option>
                  <option value="CLP">CLP - Chilean Peso</option>
                  <option value="ARS">ARS - Argentine Peso</option>
                  <option value="PKR">PKR - Pakistani Rupee</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="GHS">GHS - Ghanaian Cedi</option>
                  <option value="DZD">DZD - Algerian Dinar</option>
                  <option value="QAR">QAR - Qatari Riyal</option>
                  <option value="BHD">BHD - Bahraini Dinar</option>
                  <option value="OMR">OMR - Omani Rial</option>
                  <option value="JOD">JOD - Jordanian Dinar</option>
                  <option value="LBP">LBP - Lebanese Pound</option>
                  <option value="SYP">SYP - Syrian Pound</option>
                  <option value="IQD">IQD - Iraqi Dinar</option>
                  <option value="KWD">KWD - Kuwaiti Dinar</option>
                  <option value="BAM">BAM - Bosnian Convertible Mark</option>
                  <option value="HRK">HRK - Croatian Kuna</option>
                  <option value="CZK">CZK - Czech Koruna</option>
                  <option value="HUF">HUF - Hungarian Forint</option>
                  <option value="RON">RON - Romanian Leu</option>
                  <option value="BGN">BGN - Bulgarian Lev</option>
                  <option value="ISK">ISK - Icelandic Krona</option>
                  <option value="LKR">LKR - Sri Lankan Rupee</option>
                  <option value="BDT">BDT - Bangladeshi Taka</option>
                  <option value="MMK">MMK - Myanmar Kyat</option>
                  <option value="KZT">KZT - Kazakhstani Tenge</option>
                  <option value="UZS">UZS - Uzbekistani Som</option>
                  <option value="AZN">AZN - Azerbaijani Manat</option>
                  <option value="GEL">GEL - Georgian Lari</option>
                  <option value="AMD">AMD - Armenian Dram</option>
                  <option value="BYN">BYN - Belarusian Ruble</option>
                  <option value="MNT">MNT - Mongolian Tugrik</option>
                  <option value="KHR">KHR - Cambodian Riel</option>
                  <option value="LAK">LAK - Lao Kip</option>
                  <option value="BND">BND - Brunei Dollar</option>
                  <option value="FJD">FJD - Fijian Dollar</option>
                  <option value="PGK">PGK - Papua New Guinean Kina</option>
                  <option value="SBD">SBD - Solomon Islands Dollar</option>
                  <option value="TOP">TOP - Tongan Paʻanga</option>
                  <option value="WST">WST - Samoan Tala</option>
                  <option value="VUV">VUV - Vanuatu Vatu</option>
                  <option value="XOF">XOF - West African CFA franc</option>
                  <option value="XAF">XAF - Central African CFA franc</option>
                  <option value="XCD">XCD - East Caribbean Dollar</option>
                  <option value="MOP">MOP - Macanese Pataca</option>
                  <option value="HKD">HKD - Hong Kong Dollar</option>
                  <option value="TWD">TWD - New Taiwan Dollar</option>
                  <option value="MVR">MVR - Maldivian Rufiyaa</option>
                  <option value="SCR">SCR - Seychellois Rupee</option>
                  <option value="MGA">MGA - Malagasy Ariary</option>
                  <option value="ETB">ETB - Ethiopian Birr</option>
                  <option value="SDG">SDG - Sudanese Pound</option>
                  <option value="SOS">SOS - Somali Shilling</option>
                  <option value="TZS">TZS - Tanzanian Shilling</option>
                  <option value="UGX">UGX - Ugandan Shilling</option>
                  <option value="ZMW">ZMW - Zambian Kwacha</option>
                  <option value="BWP">BWP - Botswana Pula</option>
                  <option value="MWK">MWK - Malawian Kwacha</option>
                  <option value="MZN">MZN - Mozambican Metical</option>
                  <option value="LSL">LSL - Lesotho Loti</option>
                  <option value="SZL">SZL - Swazi Lilangeni</option>
                  <option value="NAD">NAD - Namibian Dollar</option>
                  <option value="SSP">SSP - South Sudanese Pound</option>
                  <option value="CDF">CDF - Congolese Franc</option>
                  <option value="RWF">RWF - Rwandan Franc</option>
                  <option value="DJF">DJF - Djiboutian Franc</option>
                  <option value="GNF">GNF - Guinean Franc</option>
                  <option value="SLL">SLL - Sierra Leonean Leone</option>
                  <option value="GMD">GMD - Gambian Dalasi</option>
                  <option value="MRO">MRO - Mauritanian Ouguiya</option>
                  <option value="XPF">XPF - CFP Franc</option>
                  <option value="KMF">KMF - Comorian Franc</option>
                  <option value="HTG">HTG - Haitian Gourde</option>
                  <option value="DOP">DOP - Dominican Peso</option>
                  <option value="JMD">JMD - Jamaican Dollar</option>
                  <option value="TTD">TTD - Trinidad and Tobago Dollar</option>
                  <option value="BBD">BBD - Barbadian Dollar</option>
                  <option value="BSD">BSD - Bahamian Dollar</option>
                  <option value="KYD">KYD - Cayman Islands Dollar</option>
                  <option value="BZD">BZD - Belize Dollar</option>
                  <option value="AWG">AWG - Aruban Florin</option>
                  <option value="ANG">ANG - Netherlands Antillean Guilder</option>
                  <option value="SRD">SRD - Surinamese Dollar</option>
                  <option value="GYD">GYD - Guyanese Dollar</option>
                  <option value="XAG">XAG - Silver (ounce)</option>
                  <option value="XAU">XAU - Gold (ounce)</option>
                  <option value="XDR">XDR - IMF Special Drawing Rights</option>
                  <option value="BTC">BTC - Bitcoin</option>
                  <option value="ETH">ETH - Ethereum</option>
                </select>
              </div>
              </div>
              {!isTTCValid() && (
                <div className="error-message">Le montant TTC doit être égal à HT + TVA</div>
              )}
            </div>
            
          ) : (
            <div></div> // <-- This will render nothing if not an invoice
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