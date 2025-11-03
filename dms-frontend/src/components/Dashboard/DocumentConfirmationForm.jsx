import React, { useState, useEffect, useContext, useRef } from 'react';
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
  // Preview state (right pane)
  const [previewType, setPreviewType] = useState(''); // 'pdf' | 'image' | 'text' | ''
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  // Currency
  const [defaultCurrency, setDefaultCurrency] = useState('');   
  // Loading
  const [loading, setLoading] = useState(false);
  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const objectUrlRef = useRef(null);

  const handleViewDocument = async (file) => {
    // Revoke previous object URL
    if (objectUrlRef.current) {
      try { window.URL.revokeObjectURL(objectUrlRef.current); } catch(e){}
      objectUrlRef.current = null;
    }

    if (!file || !file.filename) {
      setPreviewType('');
      setPreviewUrl('');
      setPreviewText('');
      setPreviewTitle('');
      return;
    }

    const filename = file.filename;
    const lower = filename.toLowerCase();
    let type = '';
    if (lower.endsWith('.pdf')) type = 'pdf';
    else if (lower.match(/\.(png|jpe?g|gif|bmp|webp)$/)) type = 'image';
    else if (lower.match(/\.(txt|csv|json|xml|md)$/)) type = 'text';
    else type = 'unknown';

    setPreviewType(type);
    setPreviewTitle(filename);
    setPreviewText('');

    // Prefer the API download using the temp id (same as TempDocumentArchive)
    const tempId = file.temp_id || file.tempId || file.id || file.sessionId;
    if (tempId) {
      try {
        const response = await API.tempDocuments.download(tempId);
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setPreviewUrl(url);
        if (type === 'text') {
          try {
            const txt = await blob.text();
            setPreviewText(txt);
          } catch (e) {
            setPreviewText('Aucun texte disponible');
          }
        }
        return;
      } catch (err) {
        console.error('Error downloading temp document for preview:', err);
        // fall through to static fallback
      }
    }
    
    // Fallback to static URL
    const staticUrl = `/uploads/temp_documents/${encodeURIComponent(filename)}`;
    setPreviewUrl(staticUrl);
    if (type === 'text') {
      fetch(staticUrl)
        .then(r => r.text())
        .then(t => setPreviewText(t))
        .catch(() => setPreviewText('Aucun texte disponible'));
    }
  };
  
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
      currency: f.extractedData?.currency || '',
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
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await API.settings.getSettings();
        const data = res.data;
        const currencyFromSettings = data.currency || '';
        setDefaultCurrency(currencyFromSettings);
        
        // Update confirmed documents with the default currency
        setConfirmedDocuments(prev => prev.map(doc => ({
          ...doc,
          confirmed_data: {
            ...doc.confirmed_data,
            currency: doc.confirmed_data.currency || currencyFromSettings
          }
        })));
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);
  // Check for changes in any file
  useEffect(() => {
    const hasAnyChanges = confirmedDocuments.some((doc, idx) => {
      const companyChanged = doc.company_id !== (initialCompany || selectedCompany)?.id;
      const doctypeChanged = doc.doctype_id !== (initialDoctype || selectedDoctype)?.id;
      return companyChanged || doctypeChanged;
    });
    setHasChanges(hasAnyChanges);
  }, [confirmedDocuments, initialCompany, initialDoctype, selectedCompany, selectedDoctype]);

  // Update preview when active file changes: use handleViewDocument
  useEffect(() => {
    handleViewDocument(files[activeFileIndex]);
    return () => {
      if (objectUrlRef.current) {
        try { window.URL.revokeObjectURL(objectUrlRef.current); } catch(e){}
        objectUrlRef.current = null;
      }
    };
  }, [activeFileIndex, files]);

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
      }else if (field === 'currency') {
          updated[idx].confirmed_data.currency = value;
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
  <div className="form-content-row">
          {/* Left: form */}
          <div style={{ flex: 1, minWidth: 0 }}>
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
                    <label className="form-label">Entité *</label>
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
                    <label className="form-label">Type de document *</label>
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
                    <label className="form-label">Partenaire externe *</label>
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
                        <label className="form-label">Numéro de facture *</label>
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
                        <label className="form-label">Date *</label>
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
                        <label className="form-label">Total HT *</label>
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
                        <label className="form-label">TVA *</label>
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
                        <label className="form-label">Total TTC *</label>
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
                    
                    <div className="form-group">
                <label className="form-label">Devise</label>
                <select
                  className="form-select"
                  value={doc.confirmed_data.currency || defaultCurrency}
                  onChange={e => updateConfirmedDocument(0, 'currency', e.target.value)}
                  style={{ maxHeight: "160px", overflowY: "auto",maxWidth:"300px" }}
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: preview pane */}
          <div style={{ width: 520, maxWidth: '45%', borderLeft: '1px solid var(--neutral-200)', paddingLeft: 12 }}>
            <div className="document-title" style={{ marginBottom: 8 }}>{previewTitle || doc.filename}</div>
            <div className="preview-container">
              <div className="preview-content">
                {previewType === 'pdf' && previewUrl && (
                  <iframe src={previewUrl} title={previewTitle} />
                )}
                {previewType === 'image' && previewUrl && (
                  <img src={previewUrl} alt={previewTitle} />
                )}
                {previewType === 'text' && (
                  <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left', width: '100%', overflow: 'auto' }}>{previewText || 'Aucun texte disponible'}</pre>
                )}
                {(!previewType || previewType === 'unknown') && (
                  <div style={{ color: '#666', alignSelf: 'center' }}>Aucun aperçu disponible</div>
                )}
              </div>
            </div>
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
  <div className="form-content-row">
          {/* Left: navigation + active form */}
          <div style={{ flex: 1, minWidth: 0 }}>
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
                              <label className="form-label">Numéro de facture *</label>
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
                              <label className="form-label">Date *</label>
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
                              <label className="form-label">Total HT *</label>
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
                              <label className="form-label">TVA *</label>
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
                              <label className="form-label">Total TTC *</label>
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
          </div>

          {/* Right: preview pane */}
          <div style={{ width: 520, maxWidth: '45%', borderLeft: '1px solid var(--neutral-200)', paddingLeft: 12 }}>
            <div className="document-title" style={{ marginBottom: 8 }}>{previewTitle || (files[activeFileIndex] && files[activeFileIndex].filename)}</div>
            <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, padding: 8, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewType === 'pdf' && previewUrl && (
                <iframe src={previewUrl} title={previewTitle} style={{ width: '100%', height: '70vh', border: 'none' }} />
              )}
              {previewType === 'image' && previewUrl && (
                <img src={previewUrl} alt={previewTitle} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
              )}
              {previewType === 'text' && (
                <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left', width: '100%', maxHeight: '70vh', overflow: 'auto' }}>{previewText || 'Aucun texte disponible'}</pre>
              )}
              {(!previewType || previewType === 'unknown') && (
                <div style={{ color: '#666' }}>Aucun aperçu disponible</div>
              )}
            </div>
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