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
        user_limit: 0
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
        <h1>Gestion des Utilisateurs</h1>
        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Liste des Utilisateurs
          </button>
          <button 
            className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('form');
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
            {editingUser ? 'Modifier Utilisateur' : 'Ajouter Utilisateur'}
          </button>
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
                  <th>Nom d'utilisateur</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Limite d'utilisateurs</th>
                  <th>Date de création</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
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
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td>{user.user_limit}</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(user)}
                        >
                          Modifier
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(user.id)}
                        >
                          Supprimer
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
          <h2>{editingUser ? 'Modifier Utilisateur' : 'Ajouter Nouvel Utilisateur'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Nom d'utilisateur</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="Entrez le nom d'utilisateur"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                {editingUser ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!editingUser}
                placeholder="Entrez le mot de passe"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Rôle</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
              >
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="user_limit">Limite d'utilisateurs</label>
              <input
                type="number"
                id="user_limit"
                name="user_limit"
                value={formData.user_limit}
                onChange={handleInputChange}
                min="0"
                placeholder="0 = illimité"
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
                Utilisateur actif
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'En cours...' : (editingUser ? 'Mettre à jour' : 'Créer')}
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab('list')}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;

