import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';

const AdminUsers = ({user}) => {
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [userCompanies, setUserCompanies] = useState({}); // Stores companies for each user
  const [showModifyTab, setShowModifyTab] = useState(false);
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await API.companies.getAll();
        console.log("Companies data:", response.data);
        
        const data = response.data;

        if (Array.isArray(data)) {
          setCompanies(data);
        }
        else if (data && Array.isArray(data.companies)) {
          setCompanies(data.companies);
        }
        else {
          throw new Error("Format inattendu des données reçues");
        }
      } catch (err) {
        console.error('Failed to load companies:', err.response?.data || err.message);
        setError(`Erreur de chargement: ${err.response?.data?.msg || err.message}`);
      }
    };

    fetchCompanies();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
  try {
    setLoading(true);
    const response = await API.admin.getUsers();
    const usersWithCompanies = response.data.map(user => ({
      ...user,
      companies: user.companies || [] // Ensure companies is always an array
    }));
    setUsers(usersWithCompanies);
    
    // Also update the userCompanies state for editing
    const companiesMap = {};
    usersWithCompanies.forEach(user => {
      companiesMap[user.id] = user.companies;
    });
    setUserCompanies(companiesMap);
  } catch (err) {
    setError('Erreur lors du chargement des utilisateurs');
    console.error('Error fetching users:', err);
  } finally {
    setLoading(false);
  }
};

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (editingUser) {
        // Update user
        await API.admin.updateUser(editingUser.id, formData);
        setSuccess('Utilisateur mis à jour avec succès');
      } else {
        // Create new user
        await API.admin.createUser(formData);
        setSuccess('Utilisateur créé avec succès');
      }
      setShowModifyTab(false);
      setFormData({
        id:'',
        username: '',
        surname:'',
        email:'',
        password: '',
        passwordConfirm: '',
        role: 'user',
        is_active: true,
        companies:[]
      });
      setEditingUser(null);
      setActiveTab('list');
      fetchUsers();
    } catch (err) {
      setError(editingUser ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
      console.error('Error saving user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      id: user.id,
      username: user.username,
      surname: user.surname,
      email: user.email,
      password: '',
      passwordConfirm: '',
      
      is_active: user.is_active,
      companies: userCompanies[user.id] ? userCompanies[user.id].map(c => c.id) : []
    });
    setShowModifyTab(true);
    setActiveTab('form');
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        await API.admin.deleteUser(userId);
        setSuccess('Utilisateur supprimé avec succès');
        fetchUsers();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting user:', err);
      }
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await API.admin.updateUser(userId, { is_active: !currentStatus });
      setSuccess('Statut utilisateur mis à jour');
      fetchUsers();
    } catch (err) {
      setError('Erreur lors de la mise à jour du statut');
      console.error('Error updating user status:', err);
    }
  };

  return (
    <div className="admin-users">
      <div className="admin-header">
        <h1>User Management</h1>
        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('list');
            setShowModifyTab(false);}}
          >
            Users List
          </button>
          {showModifyTab && (
          <button 
    className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
  onClick={() => {
    setActiveTab('form');
    setEditingUser(null);
    setFormData({
      id:'',
      username: '',
      surname: '',
      email: '',
      password: '',
      passwordConfirm: '',
      role: 'user',
      is_active: true,
      companies: []
    });
  }}
>
  Modify User 
</button>)}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {activeTab === 'list' && (
        <div className="users-list">
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User Name</th>
                  <th>User Surname</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Companies</th>
                  <th>Creation date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.surname}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`status-btn ${user.is_active ? 'active' : 'inactive'}`}
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
  {user.companies && user.companies.length > 0 ? (
    <ul className="company-list">
      {user.companies.map(company => (
        <li key={company.id}>{company.name}</li>
      ))}
    </ul>
  ) : (
    <span>No companies</span>
  )}
</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(user)}
                        >
                          Modify
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(user.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'form' && (
        <div className="user-form">
          <h2> Modify User </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">User Name</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="Enter User Name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="surname">User Surname</label>
              <input
                type="text"
                id="surname"
                name="surname"
                value={formData.surname}
                onChange={handleInputChange}
                placeholder="Enter User Surname"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter Email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                New password 
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!editingUser}
                placeholder="Enter Password"
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="passwordConfirm"
                placeholder="Confirm password"
                value={formData.passwordConfirm}
                onChange={handleInputChange}
                required={!editingUser}
              />
              {fieldErrors.passwordConfirm && <div className="field-error">{fieldErrors.passwordConfirm}</div>}
            </div>

            

            <div className="form-group">
              <label>Companies</label>
              <div className="checkbox-list">
                {companies.map((c) => (
                  <label key={c.id} className="checkbox-item">
                    <input
                      type="checkbox"
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
                    <span className="company-name">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                />
                Active user
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Loading...' : (editingUser ? 'Update' : 'Create')}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setActiveTab('list');
                  setShowModifyTab(false);}}
                className="btn-secondary"
                
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;