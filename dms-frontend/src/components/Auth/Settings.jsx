// src/components/Settings/Settings.jsx
import React, { useState } from 'react';
import './Settings.css';

const Settings = ({ user }) => {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weeklyDigest: true
  });
  
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    searchIndexed: false
  });

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotifications(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handlePrivacyChange = (e) => {
    const { name, checked } = e.target;
    setPrivacy(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="settings-title">⚙️ Account Settings</h1>
        <p className="settings-subtitle">Customize your preferences</p>
      </div>

      <div className="settings-grid">
        {/* Notification Settings Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">🔔</div>
            <h2 className="settings-card-title">Notifications</h2>
          </div>
          
          <div className="settings-card-content">
            <div className="settings-options">
              {[
                { 
                  name: 'email', 
                  label: 'Email notifications', 
                  description: 'Receive notifications via email'
                },
                { 
                  name: 'push', 
                  label: 'Push notifications', 
                  description: 'Get real-time updates'
                },
                { 
                  name: 'weeklyDigest', 
                  label: 'Weekly digest', 
                  description: 'Weekly activity summary'
                }
              ].map((item, index) => (
                <div key={index} className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">{item.label}</div>
                    <div className="setting-description">{item.description}</div>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      name={item.name}
                      checked={notifications[item.name]}
                      onChange={handleNotificationChange}
                      className="toggle-input"
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Privacy Settings Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">👁️</div>
            <h2 className="settings-card-title">Privacy</h2>
          </div>
          
          <div className="settings-card-content">
            <div className="settings-options">
              {[
                { 
                  name: 'profileVisible', 
                  label: 'Profile visibility', 
                  description: 'Show your profile to others'
                },
                { 
                  name: 'searchIndexed', 
                  label: 'Search indexing', 
                  description: 'Include in search results'
                }
              ].map((item, index) => (
                <div key={index} className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">{item.label}</div>
                    <div className="setting-description">{item.description}</div>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      name={item.name}
                      checked={privacy[item.name]}
                      onChange={handlePrivacyChange}
                      className="toggle-input"
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Account Management Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">🔑</div>
            <h2 className="settings-card-title">Account</h2>
          </div>
          
          <div className="settings-card-content">
            <div className="account-options">
              {[
                { label: 'Change Password', icon: '🔒' },
                { label: 'Update Email', icon: '✉️' },
                { label: 'Security', icon: '🛡️' },
                { label: 'Download Data', icon: '💾' },
                { label: 'Deactivate', icon: '⏸️', type: 'warning' },
                { label: 'Delete Account', icon: '🗑️', type: 'danger' }
              ].map((item, index) => (
                <button
                  key={index}
                  className={`account-button ${item.type || ''}`}
                >
                  <div className="button-content">
                    <span className="button-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className="chevron-icon">›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;