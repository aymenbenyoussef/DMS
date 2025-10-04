// src/components/Settings/Settings.jsx
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import api from '../../api';
import { AppContext } from '../context';
import './Settings.css';

const Settings = () => {
  const { systemName, setSystemName } = useContext(AppContext);
  
  // System Settings
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [localSystemName, setLocalSystemName] = useState(systemName);

  // Database Settings
  const [dbHost, setDbHost] = useState('localhost');
  const [dbUsername, setDbUsername] = useState('root');
  const [dbPassword, setDbPassword] = useState('');

  // Limits & Quotas
  const [maxUsers, setMaxUsers] = useState(6);
  const [maxEntities, setMaxEntities] = useState(14);
  const [maxExternalEntities, setMaxExternalEntities] = useState(21);
  const [maxFileSize, setMaxFileSize] = useState(1024);

  // File & Log Paths
  const [logsPath, setLogsPath] = useState('../../logs');
  const [entitiesDataPath, setEntitiesDataPath] = useState('');

  // SMTP Settings
  const [smtpEmail, setSmtpEmail] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');

  // Currency
  const [currency, setCurrency] = useState('');

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Update local system name when context system name changes
useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.settings.getSettings();
        const data = res.data;
        setSystemEnabled(data.systemEnabled);
        setLocalSystemName(data.systemName);
        setSystemName(data.systemName); // Update context
        setDbHost(data.dbHost);
        setDbUsername(data.dbUsername);
        setDbPassword(data.dbPassword);
        setMaxUsers(data.maxUsers);
        setMaxEntities(data.maxEntities);
        setMaxExternalEntities(data.maxExternalEntities);
        setMaxFileSize(data.maxFileSize);
        setLogsPath(data.logsPath);
        setEntitiesDataPath(data.entitiesDataPath);
        setSmtpEmail(data.smtpEmail || '');
        setSmtpPassword(data.smtpPassword || '');
        setSmtpHost(data.smtpHost || '');
        setSmtpPort(data.smtpPort || '');
        setCurrency(data.currency || '');
      } catch (err) {
        // Optionally handle error
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [setSystemName]);

  // Update browser title when system name changes
  useEffect(() => {
    if (localSystemName) {
      document.title = localSystemName;
    }
  }, [localSystemName]);

  if (loading) {
    return <div className="settings-container"><div className="settings-header"><h1 className="settings-title">Paramètres du système</h1></div><div style={{textAlign: 'center', marginTop: '3rem'}}>Chargement...</div></div>;
  }

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      systemEnabled,
      systemName: localSystemName,
      dbHost,
      dbUsername,
      dbPassword,
      maxUsers,
      maxEntities,
      maxExternalEntities,
      maxFileSize,
      logsPath,
      entitiesDataPath,
      smtpEmail,
      smtpPassword,
      smtpHost,
      smtpPort,
      currency
    };
    try {
      await api.settings.updateSettings(payload);
      setSystemName(localSystemName);
      setSuccessMessage('Les paramètres ont été enregistrés avec succès.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      alert('Erreur lors de la sauvegarde des paramètres.');
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="settings-title">Paramètres du système</h1>
        <p className="settings-subtitle">Configurez les paramètres de votre application</p>
      </div>

      <div className="settings-grid">
        {/* System Settings Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">⚙️</div>
            <h2 className="settings-card-title">Paramètres du système</h2>
          </div>
          <div className="settings-card-content">
            <div className="settings-form-grid">
              <div className="setting-item full-width">
                <div className="setting-info">
                  <span className="setting-label">Système activé</span>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={systemEnabled} 
                      onChange={e => setSystemEnabled(e.target.checked)} 
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <p className="setting-description">Active ou désactive le système complet</p>
              </div>
              
              <div className="setting-item">
                <label className="setting-label">Nom du système</label>
                <input 
                  type="text" 
                  value={localSystemName} 
                  onChange={e => setLocalSystemName(e.target.value)} 
                  placeholder="Nom de votre système" 
                />
              </div>
              
              <div className="setting-item">
                <label className="setting-label">Hôte de la base de données</label>
                <input 
                  type="text" 
                  value={dbHost} 
                  onChange={e => setDbHost(e.target.value)} 
                  placeholder="Adresse de l'hôte" 
                />
              </div>
              
              <div className="setting-item">
                <label className="setting-label">Nom d'utilisateur</label>
                <input 
                  type="text" 
                  value={dbUsername} 
                  onChange={e => setDbUsername(e.target.value)} 
                  placeholder="Nom d'utilisateur" 
                />
              </div>
              
              <div className="setting-item">
                <label className="setting-label">Mot de passe</label>
                <input 
                  type="password" 
                  value={dbPassword} 
                  onChange={e => setDbPassword(e.target.value)} 
                  placeholder="Mot de passe" 
                />
              </div>
              
              <div className="setting-item">
                <label className="setting-label">SMTP Host</label>
                <input 
                  type="text" 
                  value={smtpHost} 
                  onChange={e => setSmtpHost(e.target.value)} 
                  placeholder="Hôte SMTP" 
                />
              </div>
              
              <div className="setting-item">
                <label className="setting-label">SMTP Port</label>
                <input 
                  type="text" 
                  value={smtpPort} 
                  onChange={e => setSmtpPort(e.target.value)} 
                  placeholder="Port SMTP" 
                />
              </div>
              
              <div className="setting-item">
                <label className="setting-label">Email SMTP</label>
                <input 
                  type="text" 
                  value={smtpEmail} 
                  onChange={e => setSmtpEmail(e.target.value)} 
                  placeholder="Email SMTP" 
                />
              </div>
              
              <div className="setting-item">
                <label className="setting-label">Mot de passe SMTP</label>
                <input 
                  type="password" 
                  value={smtpPassword} 
                  onChange={e => setSmtpPassword(e.target.value)} 
                  placeholder="Mot de passe SMTP" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Limits & Quotas Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">📊</div>
            <h2 className="settings-card-title">Limites & Quotas</h2>
          </div>
          <div className="settings-card-content">
            <div className="settings-form-grid">
              <div className="setting-item">
                <label className="setting-label">Utilisateurs max</label>
                <input 
                  type="number" 
                  value={maxUsers} 
                  onChange={e => setMaxUsers(e.target.value)} 
                  min={1} 
                  placeholder="Max utilisateurs" 
                />
              </div>
              
              <div className="setting-item">
                <label className="setting-label">Entités max</label>
                <input 
                  type="number" 
                  value={maxEntities} 
                  onChange={e => setMaxEntities(e.target.value)} 
                  min={1} 
                  placeholder="Max entités" 
                />
              </div>
              
              <div className="setting-item">
                <label className="setting-label">Entités externes max</label>
                <input 
                  type="number" 
                  value={maxExternalEntities} 
                  onChange={e => setMaxExternalEntities(e.target.value)} 
                  min={1} 
                  placeholder="Max entités externes" 
                />
              </div>
              
              <div className="setting-item">
                <label className="setting-label">Taille fichier max (Ko)</label>
                <input 
                  type="number" 
                  value={maxFileSize} 
                  onChange={e => setMaxFileSize(e.target.value)} 
                  min={1} 
                  placeholder="Taille max en Ko" 
                />
              </div>
              
              <div className="setting-item full-width">
                <label className="setting-label">Chemin des logs</label>
                <input 
                  type="text" 
                  value={logsPath} 
                  onChange={e => setLogsPath(e.target.value)} 
                  placeholder="Chemin des logs" 
                />
              </div>
              
              <div className="setting-item full-width">
                <label className="setting-label">Chemin des données</label>
                <input 
                  type="text" 
                  value={entitiesDataPath} 
                  onChange={e => setEntitiesDataPath(e.target.value)} 
                  placeholder="Chemin des données" 
                />
              </div>
              <div className="setting-item full-width">
                <label className="setting-label">Devise</label>
                <select
                  className="form-select"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  style={{ maxHeight: "160px", overflowY: "auto" }}
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
              {successMessage && (
                <div className="alert-success full-width">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                  {successMessage}
                </div>
              )}

              {!successMessage && (
                <div className="save-button-container full-width">
                  <button 
                    className="save-button" 
                    onClick={handleSubmit}
                  >
                    Enregistrer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;