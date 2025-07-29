// src/components/Settings/Settings.jsx
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from '../context';
import './Settings.css';

const Settings = () => {
  const { systemName, setSystemName } = useContext(AppContext);
  
  // System Settings
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [localSystemName, setLocalSystemName] = useState(systemName);

  // Database Settings
  const [dbHost, setDbHost] = useState('localhost');
  const [dbUsername, setDbUsername] = useState('rp');
  const [dbPassword, setDbPassword] = useState('123456');

  // Limits & Quotas
  const [maxUsers, setMaxUsers] = useState(2);
  const [maxEntities, setMaxEntities] = useState(1);
  const [maxExternalEntities, setMaxExternalEntities] = useState(1);
  const [maxFileSize, setMaxFileSize] = useState(1000);

  // File & Log Paths
  const [logsPath, setLogsPath] = useState('/test1/logs');
  const [entitiesDataPath, setEntitiesDataPath] = useState('/test1/edata');

  // SMTP Settings
  const [smtpEmail, setSmtpEmail] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  // Update local system name when context system name changes
  useEffect(() => {
    setLocalSystemName(systemName);
  }, [systemName]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/settings');
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
      smtpPassword
    };
    try {
      await axios.post('http://localhost:5000/api/settings', payload);
      setSystemName(localSystemName); // Update context with new system name
      setSuccessMessage('Les paramètres ont été enregistrés avec succès.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      alert('Failed to save settings.');
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-grid">
        {/* System Settings Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">⚙️</div>
            <h2 className="settings-card-title">Paramètres du système</h2>
          </div>
          <div className="settings-card-content">
            <form>
              <div className="setting-item">
                <div className="setting-info" style={{display: 'flex', alignItems: 'center', width: '100%'}}>
                  <span className="setting-label" style={{flex: 1, textAlign: 'left'}}>Système activé</span>
                  <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
                    <input type="checkbox" checked={systemEnabled} onChange={e => setSystemEnabled(e.target.checked)} style={{transform: 'scale(1.3)'}} />
                  </div>
                </div>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Nom du système</div>
                </div>
                <input type="text" value={localSystemName} onChange={e => setLocalSystemName(e.target.value)} />
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Hôte de la base de données</div>
                </div>
                <input type="text" value={dbHost} onChange={e => setDbHost(e.target.value)} />
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Nom d'utilisateur de la base de données</div>
                </div>
                <input type="text" value={dbUsername} onChange={e => setDbUsername(e.target.value)} />
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Mot de passe de la base de données</div>
                </div>
                <input type="password" value={dbPassword} onChange={e => setDbPassword(e.target.value)} />
            </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Email SMTP</div>
                </div>
                <input type="text" value={smtpEmail} onChange={e => setSmtpEmail(e.target.value)} />
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Mot de passe SMTP</div>
                </div>
                <input type="password" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} />
              </div>
            </form>
          </div>
        </div>
        {/* Limits & Quotas Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">📊</div>
            <h2 className="settings-card-title">Limites & Quotas</h2>
          </div>
          <div className="settings-card-content">
            <form>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Nombre maximal d'utilisateurs</div>
                </div>
                <input type="number" value={maxUsers} onChange={e => setMaxUsers(e.target.value)} min={1} />
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Nombre maximal d'entités</div>
                </div>
                <input type="number" value={maxEntities} onChange={e => setMaxEntities(e.target.value)} min={1} />
              </div>
              <div className="setting-item">
                  <div className="setting-info">
                  <div className="setting-label">Nombre maximal d'entités externes</div>
                </div>
                <input type="number" value={maxExternalEntities} onChange={e => setMaxExternalEntities(e.target.value)} min={1} />
                  </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Taille maximale de fichier (Ko)</div>
                </div>
                <input type="number" value={maxFileSize} onChange={e => setMaxFileSize(e.target.value)} min={1} />
            </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Chemin des logs du système</div>
                </div>
                <input type="text" value={logsPath} onChange={e => setLogsPath(e.target.value)} />
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Chemin des données des entités</div>
                </div>
                <input type="text" value={entitiesDataPath} onChange={e => setEntitiesDataPath(e.target.value)} />
              </div>
              <div style={{textAlign: 'center', marginTop: '1.7rem'}}>
                {successMessage && (
                  <div className="alert alert-success" style={{marginBottom: '1rem', fontWeight: 600}}>{successMessage}</div>
                )}
                <button 
                  className="btn btn-primary" 
                  onClick={handleSubmit}
                  style={{
                    backgroundColor: 'orangered',
                    borderColor: 'orangered',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    height: '50px'
                  }}
                >
                  Enregistrer
                </button>
            </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;