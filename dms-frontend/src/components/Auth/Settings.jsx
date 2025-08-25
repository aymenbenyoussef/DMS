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
                <label className="setting-label">devise</label>
                <input 
                  type="text" 
                  value={currency} 
                  onChange={e => setCurrency(e.target.value)} 
                  placeholder="Devise" 
                />
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