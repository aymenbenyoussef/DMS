import React from 'react';
import NavBar from './NavBar';

const Settings = ({ user, onLogout }) => {
  return (
    <div className="app-container">
      <NavBar user={user} onLogout={onLogout} />
      
      <div className="main-content">
        <div className="document-archive">
          <div className="archive-header">
            <h1 className="archive-title">Settings</h1>
          </div>

          <div className="settings-container">
            <div className="settings-section">
              <h2 className="section-header">Account Settings</h2>
              <div className="setting-item">
                <label>Username</label>
                <div className="setting-value">{user.username}</div>
              </div>
              <div className="setting-item">
                <label>Email</label>
                <div className="setting-value">{user.email || 'Not provided'}</div>
              </div>
              <div className="setting-item">
                <label>Role</label>
                <div className="setting-value">{user.role}</div>
              </div>
            </div>

            <div className="settings-section">
              <h2 className="section-header">Preferences</h2>
              <div className="setting-item">
                <label>Theme</label>
                <select className="setting-input">
                  <option>Light</option>
                  <option>Dark</option>
                  <option>System</option>
                </select>
              </div>
              <div className="setting-item">
                <label>Language</label>
                <select className="setting-input">
                  <option>English</option>
                  <option>French</option>
                  <option>Spanish</option>
                </select>
              </div>
            </div>

            <div className="settings-section">
              <h2 className="section-header">Security</h2>
              <div className="setting-item">
                <label>Change Password</label>
                <button className="setting-action-btn">Change Password</button>
              </div>
              <div className="setting-item">
                <label>Two-Factor Authentication</label>
                <button className="setting-action-btn">Enable 2FA</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;