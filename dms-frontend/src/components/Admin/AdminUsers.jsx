import React, { useState, useEffect } from 'react';
import API from '../../api';
import { Tab, Nav, Button, Form, Alert, Badge, Card, Row, Col } from 'react-bootstrap';
import BootstrapTable from 'react-bootstrap-table-next';
import filterFactory, { textFilter } from 'react-bootstrap-table2-filter';
import './AdminUsersBootstrap.css';

const AdminUsers = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [formData, setFormData] = useState({
    username: '',
    surname: '',
    email: '',
    password: '',
    passwordConfirm: '',
    role: 'user',
    is_active: true,
    companies: []
  });
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [companies, setCompanies] = useState([]);
  const [userCompanies, setUserCompanies] = useState({});
  const [showModifyTab, setShowModifyTab] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalErrors, setGlobalErrors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, companiesRes] = await Promise.all([
          API.admin.getUsers(),
          API.companies.getAll()
        ]);
        
        // Process users
        const usersWithCompanies = usersRes.data.map(user => ({
          ...user,
          companies: user.companies || []
        }));
        setUsers(usersWithCompanies);
        
        // Create companies map
        const companiesMap = {};
        usersWithCompanies.forEach(user => {
          companiesMap[user.id] = user.companies;
        });
        setUserCompanies(companiesMap);
        
        // Process companies
        const companiesData = Array.isArray(companiesRes.data) ? 
          companiesRes.data : 
          (companiesRes.data.companies || []);
        setCompanies(companiesData);
      } catch (err) {
        setError(`Error loading data: ${err.response?.data?.msg || err.message}`);
        console.error('Data loading error:', err);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    const errorMessages = [];

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
      errorMessages.push('Username is required');
    }
    
    if (!formData.surname.trim()) {
      errors.surname = 'Surname is required';
      errorMessages.push('Surname is required');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      errorMessages.push('Email is required');
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Valid email is required';
      errorMessages.push('Valid email is required');
    }
    
    if (!editingUser) {
      if (!formData.password) {
        errors.password = 'Password is required';
        errorMessages.push('Password is required');
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
        errorMessages.push('Password must be at least 6 characters');
      }
      
      if (!formData.passwordConfirm) {
        errors.passwordConfirm = 'Please confirm password';
        errorMessages.push('Please confirm password');
      } else if (formData.password !== formData.passwordConfirm) {
        errors.passwordConfirm = 'Passwords do not match';
        errorMessages.push('Passwords do not match');
      }
    }

    setFieldErrors(errors);
    setGlobalErrors(errorMessages);
    return errorMessages.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGlobalErrors([]);
    setFieldErrors({});
    
    if (!validate()) return;
    
    setLoading(true);

    try {
      const payload = {
        username: formData.username,
        surname: formData.surname,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
        companies: formData.companies
      };
      
      // Only include password if editing and changed
      if (formData.password && formData.password.length >= 6) {
        payload.password = formData.password;
      }

      if (editingUser) {
        await API.admin.updateUser(editingUser.id, payload);
        setSuccess('User updated successfully');
      } else {
        await API.admin.createUser(payload);
        setSuccess('User created successfully');
      }

      // Reset form and fetch updated data
      setShowModifyTab(false);
      setFormData({
        username: '',
        surname: '',
        email: '',
        password: '',
        passwordConfirm: '',
        role: 'user',
        is_active: true,
        companies: []
      });
      setEditingUser(null);
      setActiveTab('list');
      fetchUsers();
    } catch (err) {
      const apiError = err.response?.data;
      let errorMsg = 'Error processing request';
      const errors = {};
      
      if (apiError?.errors) {
        apiError.errors.forEach(err => {
          errors[err.path] = err.msg;
          errorMsg = 'Please correct the highlighted fields';
        });
      } else if (apiError?.message) {
        errorMsg = apiError.message;
      }
      
      setFieldErrors(errors);
      setGlobalErrors([errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      surname: user.surname,
      email: user.email,
      password: '',
      passwordConfirm: '',
      role: user.role,
      is_active: user.is_active,
      companies: userCompanies[user.id] ? userCompanies[user.id].map(c => c.id) : []
    });
    setShowModifyTab(true);
    setActiveTab('form');
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      surname: '',
      email: '',
      password: '',
      passwordConfirm: '',
      role: 'user',
      is_active: true,
      companies: []
    });
    setShowModifyTab(true);
    setActiveTab('form');
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await API.admin.deleteUser(userId);
        setSuccess('User deleted successfully');
        fetchUsers();
      } catch (err) {
        setError('Error deleting user');
        console.error('Delete error:', err);
      }
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await API.admin.updateUser(userId, { is_active: !currentStatus });
      setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err) {
      setError('Error updating status');
      console.error('Status update error:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await API.admin.getUsers();
      const usersWithCompanies = response.data.map(user => ({
        ...user,
        companies: user.companies || []
      }));
      setUsers(usersWithCompanies);
      
      const companiesMap = {};
      usersWithCompanies.forEach(user => {
        companiesMap[user.id] = user.companies;
      });
      setUserCompanies(companiesMap);
    } catch (err) {
      setError('Error loading users');
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Table columns configuration
  const columns = [
    {
      dataField: 'id',
      text: 'ID',
      sort: true,
      filter: textFilter({ placeholder: 'Filter ID' }),
      headerStyle: { width: '70px' }
    },
    {
      dataField: 'username',
      text: 'Username',
      sort: true,
      filter: textFilter({ placeholder: 'Filter Username' })
    },
    {
      dataField: 'surname',
      text: 'Surname',
      sort: true,
      filter: textFilter({ placeholder: 'Filter Surname' })
    },
    {
      dataField: 'email',
      text: 'Email',
      sort: true,
      filter: textFilter({ placeholder: 'Filter Email' })
    },
    {
      dataField: 'role',
      text: 'Role',
      formatter: (cell) => (
        <Badge bg={cell === 'admin' ? 'danger' : 'success'} className="text-uppercase">
          {cell}
        </Badge>
      ),
      sort: true,
      filter: textFilter({ placeholder: 'Filter Role' })
    },
    {
      dataField: 'is_active',
      text: 'Status',
      formatter: (cell, row) => (
        <Button 
          size="sm"
          variant={cell ? 'outline-success' : 'outline-danger'}
          onClick={() => toggleUserStatus(row.id, cell)}
          className="fw-bold"
        >
          {cell ? 'Active' : 'Inactive'}
        </Button>
      ),
      sort: true,
      headerStyle: { width: '120px' }
    },
    {
      dataField: 'companies',
      text: 'Companies',
      formatter: (companies) => (
        <div className="d-flex flex-wrap gap-1">
          {companies && companies.length > 0 ? 
            companies.map(company => (
              <Badge key={company.id} bg="light" text="dark" className="border">
                {company.name}
              </Badge>
            )) : 
            <span className="text-muted">None</span>
          }
        </div>
      )
    },
    {
      dataField: 'created_at',
      text: 'Created',
      formatter: (cell) => new Date(cell).toLocaleDateString(),
      sort: true,
      headerStyle: { width: '120px' }
    },
    {
      dataField: 'actions',
      text: 'Actions',
      formatter: (_, row) => (
        <div className="d-flex gap-2">
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={() => handleEdit(row)}
            className="action-btn"
          >
            <i className="bi bi-pencil"></i> Edit
          </Button>
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={() => handleDelete(row.id)}
            className="action-btn"
          >
            <i className="bi bi-trash"></i>Delete
          </Button>
        </div>
      ),
      headerStyle: { width: '140px' }
    }
  ];

  return (
    <div className="admin-users-container">
      <Card className="admin-users-card">
        <Card.Body className="admin-users-card-body">
          <Card.Title className="admin-users-title">User Management</Card.Title>
          
          <Tab.Container activeKey={activeTab} className="admin-users-tab-container">
            <Nav variant="tabs" className="admin-users-nav-tabs">
              <Nav.Item>
                <Nav.Link 
                  eventKey="list" 
                  onClick={() => {
                    setActiveTab('list');
                    setShowModifyTab(false);
                  }}
                >
                  <i className="bi bi-people me-2"></i>
                  Users List
                </Nav.Link>
              </Nav.Item>
              
              {showModifyTab && (
                <Nav.Item>
                  <Nav.Link eventKey="form">
                    <i className="bi bi-person-gear me-2"></i>
                    {editingUser ? 'Edit User' : 'Create User'}
                  </Nav.Link>
                </Nav.Item>
              )}
            </Nav>

            <div className="d-flex justify-content-end mb-3">
              <Button 
                variant="primary" 
                onClick={handleCreateUser}
                className="d-flex align-items-center"
              >
                <i className="bi bi-plus-lg me-2"></i> Create User
              </Button>
            </div>
                
            <Tab.Content className="admin-users-tab-content">
              <Tab.Pane eventKey="list" className="admin-users-list-pane">
                {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
                {success && <Alert variant="success" className="mb-3">{success}</Alert>}
                

                
                <div className="admin-users-table-container">
                  <BootstrapTable
                    keyField="id"
                    data={users}
                    columns={columns}
                    bootstrap4
                    striped
                    hover
                    condensed
                    filter={filterFactory()}
                    classes="admin-users-table"
                    headerClasses="bg-light"
                    wrapperClasses="table-responsive"
                  />
                </div>
              </Tab.Pane>
              
              <Tab.Pane eventKey="form" className="admin-users-form-pane">
                <Card>
                  <Card.Body>
                    <Card.Title className="form-section-title">
                      {editingUser ? 'Edit User' : 'Create New User'}
                    </Card.Title>
                    
                    {globalErrors.length > 0 && (
                      <Alert variant="danger" className="mb-4">
                        <ul className="mb-0">
                          {globalErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </Alert>
                    )}
                    
                    <Form onSubmit={handleSubmit}>
                      <Row className="g-3 mb-4">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>First Name</Form.Label>
                            <Form.Control
                              type="text"
                              name="username"
                              value={formData.username}
                              onChange={handleInputChange}
                              isInvalid={!!fieldErrors.username}
                              placeholder="Enter first name"
                            />
                            <Form.Control.Feedback type="invalid">
                              {fieldErrors.username}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Last Name</Form.Label>
                            <Form.Control
                              type="text"
                              name="surname"
                              value={formData.surname}
                              onChange={handleInputChange}
                              isInvalid={!!fieldErrors.surname}
                              placeholder="Enter last name"
                            />
                            <Form.Control.Feedback type="invalid">
                              {fieldErrors.surname}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Form.Group className="mb-4">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          isInvalid={!!fieldErrors.email}
                          placeholder="Enter email"
                        />
                        <Form.Control.Feedback type="invalid">
                          {fieldErrors.email}
                        </Form.Control.Feedback>
                      </Form.Group>
                      
                      {!editingUser && (
                        <Row className="g-3 mb-4">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Password</Form.Label>
                              <Form.Control
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                isInvalid={!!fieldErrors.password}
                                placeholder="Create password"
                              />
                              <Form.Control.Feedback type="invalid">
                                {fieldErrors.password}
                              </Form.Control.Feedback>
                              <Form.Text className="text-muted">
                                Minimum 6 characters
                              </Form.Text>
                            </Form.Group>
                          </Col>
                          
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Confirm Password</Form.Label>
                              <Form.Control
                                type="password"
                                name="passwordConfirm"
                                value={formData.passwordConfirm}
                                onChange={handleInputChange}
                                isInvalid={!!fieldErrors.passwordConfirm}
                                placeholder="Confirm password"
                              />
                              <Form.Control.Feedback type="invalid">
                                {fieldErrors.passwordConfirm}
                              </Form.Control.Feedback>
                            </Form.Group>
                          </Col>
                        </Row>
                      )}
                      
                      <Form.Group className="mb-4">
                        <Form.Label>Role</Form.Label>
                        <div className="d-flex gap-4">
                          <Form.Check 
                            type="radio"
                            id="role-user"
                            label="User"
                            name="role"
                            value="user"
                            checked={formData.role === 'user'}
                            onChange={handleInputChange}
                          />
                          <Form.Check 
                            type="radio"
                            id="role-admin"
                            label="Administrator"
                            name="role"
                            value="admin"
                            checked={formData.role === 'admin'}
                            onChange={handleInputChange}
                          />
                        </div>
                      </Form.Group>
                      
                      <Form.Group className="mb-4">
                        <Form.Label>Company Access</Form.Label>
                        <div className="company-checkbox-container">
                          {companies.length > 0 ? (
                            companies.map(c => (
                              <Form.Check 
                                key={c.id}
                                type="checkbox"
                                id={`company-${c.id}`}
                                label={c.name}
                                name="companies"
                                value={c.id}
                                checked={formData.companies.includes(c.id)}
                                onChange={(e) => {
                                  const { value, checked } = e.target;
                                  const companyId = parseInt(value, 10);
                                  setFormData(prev => ({
                                    ...prev,
                                    companies: checked
                                      ? [...prev.companies, companyId]
                                      : prev.companies.filter(id => id !== companyId)
                                  }));
                                }}
                              />
                            ))
                          ) : (
                            <div className="text-center text-muted py-3">
                              No companies available
                            </div>
                          )}
                        </div>
                      </Form.Group>
                      
                      <Form.Group className="mb-4">
                        <Form.Check 
                          type="switch"
                          id="status-switch"
                          label="Active Account"
                          name="is_active"
                          checked={formData.is_active}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                      
                      <div className="d-flex gap-3 pt-2">
                        <Button 
                          variant="primary" 
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2"
                        >
                          {loading ? (
                            <span>
                              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                              {editingUser ? 'Updating...' : 'Creating...'}
                            </span>
                          ) : editingUser ? (
                            'Update User'
                          ) : (
                            'Create User'
                          )}
                        </Button>
                        
                        <Button 
                          variant="outline-secondary"
                          onClick={() => setActiveTab('list')}
                          className="px-4 py-2"
                        >
                          Cancel
                        </Button>
                      </div>
                    </Form>
                  </Card.Body>
                </Card>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminUsers;