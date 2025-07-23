// src/components/Settings/Settings.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Settings.css';

const Settings = () => {
  // System Settings
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [systemName, setSystemName] = useState('test1');

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
  const [entityLogPath, setEntityLogPath] = useState('1');
  const [externalEntitiesDataPath, setExternalEntitiesDataPath] = useState('test1/eedata');
  const [externalEntitiesLogPath, setExternalEntitiesLogPath] = useState('');

  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/settings');
        const data = res.data;
        setSystemEnabled(data.systemEnabled);
        setSystemName(data.systemName);
        setDbHost(data.dbHost);
        setDbUsername(data.dbUsername);
        setDbPassword(data.dbPassword);
        setMaxUsers(data.maxUsers);
        setMaxEntities(data.maxEntities);
        setMaxExternalEntities(data.maxExternalEntities);
        setMaxFileSize(data.maxFileSize);
        setLogsPath(data.logsPath);
        setEntitiesDataPath(data.entitiesDataPath);
        setEntityLogPath(data.entityLogPath);
        setExternalEntitiesDataPath(data.externalEntitiesDataPath);
        setExternalEntitiesLogPath(data.externalEntitiesLogPath);
      } catch (err) {
        // Optionally handle error
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (loading) {
    return <div className="settings-container"><div className="settings-header"><h1 className="settings-title">Paramètres du système</h1></div><div style={{textAlign: 'center', marginTop: '3rem'}}>Chargement...</div></div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      systemEnabled,
      systemName,
      dbHost,
      dbUsername,
      dbPassword,
      maxUsers,
      maxEntities,
      maxExternalEntities,
      maxFileSize,
      logsPath,
      entitiesDataPath,
      entityLogPath,
      externalEntitiesDataPath,
      externalEntitiesLogPath
    };
    try {
      await axios.post('http://localhost:5000/api/settings', payload);
      setSuccessMessage('Les paramètres ont été enregistrés avec succès.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      alert('Failed to save settings.');
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="settings-title">Paramètres du système</h1>
        <p className="settings-subtitle">Configurez les paramètres de votre système</p>
      </div>
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
                <input type="text" value={systemName} onChange={e => setSystemName(e.target.value)} />
              </div>
            </form>
          </div>
        </div>
        {/* Database Settings Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">🗄️</div>
            <h2 className="settings-card-title">Paramètres de la base de données</h2>
          </div>
          <div className="settings-card-content">
            <form>
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
                  <div className="setting-label">Taille maximale de fichier (Mo)</div>
                </div>
                <input type="number" value={maxFileSize} onChange={e => setMaxFileSize(e.target.value)} min={1} />
            </div>
            </form>
          </div>
        </div>
        {/* File & Log Paths Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">📁</div>
            <h2 className="settings-card-title">Chemins des fichiers & logs</h2>
          </div>
          <div className="settings-card-content">
            <form>
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
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Chemin des logs de l'entité</div>
                </div>
                <input type="text" value={entityLogPath} onChange={e => setEntityLogPath(e.target.value)} />
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Chemin des données des entités externes</div>
                </div>
                <input type="text" value={externalEntitiesDataPath} onChange={e => setExternalEntitiesDataPath(e.target.value)} />
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Chemin des logs des entités externes</div>
                  </div>
                <input type="text" value={externalEntitiesLogPath} onChange={e => setExternalEntitiesLogPath(e.target.value)} />
            </div>
            </form>
          </div>
        </div>
      </div>
      <div style={{textAlign: 'center', marginTop: '2rem'}}>
        {successMessage && (
          <div className="alert alert-success" style={{marginBottom: '1rem', fontWeight: 600}}>{successMessage}</div>
        )}
        <button className="btn btn-primary" onClick={handleSubmit}>Enregistrer</button>
      </div>
    </div>
  );
};

export default Settings;