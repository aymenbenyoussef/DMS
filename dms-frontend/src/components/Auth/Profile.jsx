// src/components/Profile/Profile.jsx
import React from 'react';
import './Profile.css';

const Profile = ({ user }) => {
  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">👤 User Profile</h1>
        <p className="profile-subtitle">Manage your personal information</p>
      </div>

      <div className="profile-card">
        {/* Profile Header */}
        <div className="profile-header-card">
          <div className="profile-avatar">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <h2 className="profile-username">{user?.username}</h2>
            <div className="profile-tags">
              <span className="profile-role">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="profile-grid">
          {/* Personal Information Card */}
          <div className="profile-section-card">
            <div className="section-header">
              <div className="section-icon">👤</div>
              <h3 className="section-title">Personal Information</h3>
            </div>
            
            <div className="section-content">
              <div className="info-item">
                <label className="info-label">Full Name</label>
                <div className="info-value">John Doe</div>
              </div>
              
              <div className="info-item">
                <label className="info-label">Email Address</label>
                <div className="info-value">john.doe@example.com</div>
              </div>
              
              <div className="info-item">
                <label className="info-label">Phone Number</label>
                <div className="info-value">+1 (555) 123-4567</div>
              </div>
              
              <button className="edit-button">
                Edit Information
              </button>
            </div>
          </div>

          {/* Account Settings Card */}
          <div className="profile-section-card">
            <div className="section-header">
              <div className="section-icon">⚙️</div>
              <h3 className="section-title">Account Settings</h3>
            </div>
            
            <div className="section-content">
              {[
                { label: 'Change Password', icon: '🔒' },
                { label: 'Notifications', icon: '🔔' },
                { label: 'Privacy', icon: '👁️' },
                { label: 'Security', icon: '🛡️' }
              ].map((item, index) => (
                <button 
                  key={index}
                  className="settings-button"
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
        
        {/* Security Section */}
        <div className="security-section">
          <div className="security-info">
            <h3 className="security-title">Last Login</h3>
            <p className="security-detail">Today at 14:30 from Chrome</p>
          </div>
          <button className="security-button">
            Sign Out Everywhere
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;