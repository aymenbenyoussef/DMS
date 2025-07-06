import React, { useState } from 'react';
import './WelcomePanel.css';

const WelcomePanel = ({ user }) => {
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDocTypeModal, setShowDocTypeModal] = useState(false);
  
  return (
    <div className="welcome-panel">
      <div className="welcome-header">
        <h1 className="welcome-title">Welcome to the DMS</h1>
        <p className="welcome-subtitle">Get started by managing your documents and settings</p>
      </div>

      {user?.role === 'admin' && (
        <div className="admin-actions">
          <h2 className="actions-title">Quick Setup</h2>
          <div className="action-cards">
            <div 
              className="action-card" 
              onClick={() => setShowCompanyModal(true)}
            >
              <div className="card-icon">🏢</div>
              <h3>Add Company</h3>
              <p>Create a new company profile</p>
            </div>
            
            <div 
              className="action-card"
              onClick={() => setShowUserModal(true)}
            >
              <div className="card-icon">👤</div>
              <h3>Add User</h3>
              <p>Invite new users to the system</p>
            </div>
            
            <div 
              className="action-card"
              onClick={() => setShowDocTypeModal(true)}
            >
              <div className="card-icon">📄</div>
              <h3>Add Document Type</h3>
              <p>Create new document categories</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {showCompanyModal && (
        <div className="modal-overlay">
          <div className="welcome-modal">
            <h2>Add New Company</h2>
            <div className="modal-content">
              <div className="form-group">
                <label>Company Name</label>
                <input type="text" placeholder="Enter company name" />
              </div>
              <div className="form-group">
                <label>Company Address</label>
                <input type="text" placeholder="Enter address" />
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowCompanyModal(false)}>Cancel</button>
                <button className="primary">Create Company</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="welcome-modal">
            <h2>Add New User</h2>
            <div className="modal-content">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Enter full name" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="Enter email" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowUserModal(false)}>Cancel</button>
                <button className="primary">Create User</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Type Modal */}
      {showDocTypeModal && (
        <div className="modal-overlay">
          <div className="welcome-modal">
            <h2>Add Document Type</h2>
            <div className="modal-content">
              <div className="form-group">
                <label>Document Type Name</label>
                <input type="text" placeholder="e.g., Invoice, Contract" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea placeholder="Enter description"></textarea>
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowDocTypeModal(false)}>Cancel</button>
                <button className="primary">Create Document Type</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomePanel;