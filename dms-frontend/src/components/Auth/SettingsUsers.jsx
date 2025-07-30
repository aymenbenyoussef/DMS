import React, { useState } from 'react';
import './Profile.css'; // Reuse profile styles for consistency
import { BiLock, BiCheckCircle, BiErrorCircle } from 'react-icons/bi';
import API from '../../api';

const SettingsUsers = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasTemporaryPassword, setHasTemporaryPassword] = useState(false);

  // Check if user has temporary password on component mount
  React.useEffect(() => {
    const tempPasswordFlag = localStorage.getItem('has_temporary_password');
    if (tempPasswordFlag === 'true') {
      setHasTemporaryPassword(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newPassword || !confirmPassword) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    try {
      await API.users.changePassword(newPassword);
      setSuccess('Votre mot de passe a été réinitialisé avec succès.');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear temporary password flag and redirect to dashboard
      if (hasTemporaryPassword) {
        localStorage.removeItem('has_temporary_password');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation du mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title"><BiLock style={{verticalAlign: 'middle'}} /> Réinitialiser le mot de passe</h1>
        <p className="profile-subtitle">
          {hasTemporaryPassword 
            ? "Vous devez changer votre mot de passe temporaire avant de continuer" 
            : "Changez votre mot de passe en toute sécurité"
          }
        </p>
      </div>
              <div className="profile-card" style={{maxWidth: 800, margin: '0 auto', padding: '2.5rem 2rem'}}>
          {hasTemporaryPassword && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              color: '#92400e'
            }}>
              <strong>⚠️ Attention :</strong> Vous utilisez actuellement un mot de passe temporaire. 
              Vous devez le changer.
            </div>
          )}
          <form className="settings-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nouveau mot de passe</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Entrez le nouveau mot de passe"
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirmez le nouveau mot de passe"
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="field-error" style={{display: 'flex', alignItems: 'center', color: '#b91c1c'}}>
              <BiErrorCircle style={{marginRight: 6}} /> {error}
            </div>
          )}
          {success && (
            <div className="field-success" style={{display: 'flex', alignItems: 'center', color: 'green', fontWeight: 500}}>
              <BiCheckCircle style={{marginRight: 6}} /> {success}
            </div>
          )}
          <button className="edit-button" type="submit" disabled={loading} style={{marginTop: 24, width: '100%'}}>
            {loading ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsUsers; 