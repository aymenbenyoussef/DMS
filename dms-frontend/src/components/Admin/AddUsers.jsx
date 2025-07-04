import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    is_active: true,
    user_limit: 0
  });
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await API.admin.getUsers();
      setUsers(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };
//Get All Companies
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
      
      setFormData({
        username: '',
        password: '',
        role: 'user',
        is_active: true,
        user_limit: 1
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
      username: user.username,
      password: '',
      role: user.role,
      is_active: user.is_active,
      user_limit: user.user_limit
    });
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
        <h1>Add new user</h1>
        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'form1' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('form1');
              setEditingUser(null);
              setFormData({
                username: '',
                password: '',
                role: 'user',
                is_active: true,
                user_limit: 0
              });
            }}
          >
            {editingUser ? 'Modify User' : 'Add User'}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'form2' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('form2');
              setEditingUser(null);
              setFormData({
                username: '',
                password: '',
                role: 'user',
                is_active: true,
                user_limit: 0
              });
            }}
          >
            {editingUser ? 'Modify User' : 'Add User'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {activeTab === 'form1' && (
        <div className="user-form">
          <h2>{editingUser ? 'Modify User' : 'Add New User'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">User name</label>
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
              <label htmlFor="username">User surname</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="Enter user surname"
              />
            </div>
            <div className="form-group">
              <label htmlFor="username">Email</label>
              <input
                type="text"
                id=""
                name=""
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="Enter email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">
                {editingUser ? 'New password (leave blank to avoid changing)' : 'Password'}
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
              <label htmlFor="password"> Password validation</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!editingUser}
                placeholder="Retype the password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="user_limit">User limit</label>
              <input
                type="number"
                id="user_limit"
                name="user_limit"
                value={formData.user_limit}
                onChange={handleInputChange}
                min="1"
                placeholder="1 = illimité"
              />
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
                onClick={() => setActiveTab('list')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'form2' && (
        <div className="user-form">
          <h2>{editingUser ? 'Modify User' : 'Add New User'}</h2>
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
              <label htmlFor="password">
                {editingUser ? 'New password (leave blank to avoid changing)' : 'Password'}
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
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="user_limit">User limit</label>
              <input
                type="number"
                id="user_limit"
                name="user_limit"
                value={formData.user_limit}
                onChange={handleInputChange}
                min="1"
                placeholder="1 = illimité"
              />
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
                onClick={() => setActiveTab('list')}
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

