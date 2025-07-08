import React, { useState } from 'react';
import './WelcomePanel.css';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Card, Button, Container, Row, Col } from 'react-bootstrap';

const WelcomePanel = ({ user }) => {
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDocTypeModal, setShowDocTypeModal] = useState(false);
  
  return (
    <div className="welcome-panel">
      <div className="welcome-header text-center mb-5">
        <h1 className="welcome-title display-4 fw-bold">Welcome to the DMS</h1>
        <p className="welcome-subtitle lead text-muted">
          Get started by managing your documents and settings
        </p>
      </div>

      {user?.role === 'admin' && (
        <Container className="admin-actions">
          <h2 className="actions-title text-center mb-4 fs-3 fw-semibold">Quick Setup</h2>
          <Row className="justify-content-center g-4">
            <Col md={4} sm={6} xs={12}>
              <Card as={Link} to="/AddComp" className="action-card h-100 text-decoration-none">
                <Card.Body className="text-center py-4">
                  <div className="card-icon fs-1 mb-3">🏢</div>
                  <Card.Title className="fs-5 fw-bold">Add Entity</Card.Title>
                  <Card.Text className="text-muted">
                    Create a new company profile
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4} sm={6} xs={12}>
              <Card as={Link} to="/AddUsers" className="action-card h-100 text-decoration-none">
                <Card.Body className="text-center py-4">
                  <div className="card-icon fs-1 mb-3">👤</div>
                  <Card.Title className="fs-5 fw-bold">Add User</Card.Title>
                  <Card.Text className="text-muted">
                    Invite new users to the system
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4} sm={6} xs={12}>
              <Card as={Link} to="/AddDoctype" className="action-card h-100 text-decoration-none">
                <Card.Body className="text-center py-4">
                  <div className="card-icon fs-1 mb-3">📄</div>
                  <Card.Title className="fs-5 fw-bold">Add Document Type</Card.Title>
                  <Card.Text className="text-muted">
                    Create new document categories
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      )}

      {/* Modals (unchanged) */}
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
                <Button variant="secondary" onClick={() => setShowCompanyModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="ms-2">
                  Create Company
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <select className="form-select">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setShowUserModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="ms-2">
                  Create User
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <textarea className="form-control" placeholder="Enter description"></textarea>
              </div>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setShowDocTypeModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="ms-2">
                  Create Document Type
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomePanel;