import React, { useState, useEffect } from 'react';
import './WelcomePanel.css';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Card, Button, Container, Row, Col } from 'react-bootstrap';
import API from '../../api';

const WelcomePanel = ({ user }) => {
  const [stats, setStats] = useState({
    users: 0,
    companies: 0,
    partners: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, companiesRes, partnersRes] = await Promise.all([
          API.admin.getUsers(),
          API.companies.getAll(),
          API.partner.getAll()
        ]);
        
        setStats({
          users: usersRes.data.length,
          companies: companiesRes.data.length,
          partners: partnersRes.data.length
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user]);

  return (
    <div className="welcome-panel">
      <div className="welcome-header text-center mb-5">
        <h1 className="welcome-title display-4 fw-bold">Bienvenue au DMS</h1>
        <p className="welcome-subtitle lead text-muted">
          Commencez par gérer vos documents et paramètres
        </p>
      </div>

      {user?.role === 'admin' && (
        <div className="row g-3 mb-4">
          {/* Users Card */}
          <div className="col-md-4">
            <div className="card h-100 action-card">
              <div className="card-body text-center">
                <h3 className="card-title fs-6 text-muted">Nombre total d'utilisateurs</h3>
                {loading ? (
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                ) : (
                  <p className="card-text fs-4 fw-bold">{stats.users}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Companies Card */}
          <div className="col-md-4">
            <div className="card h-100 action-card">
              <div className="card-body text-center">
                <h3 className="card-title fs-6 text-muted">Nombre total d'entités</h3>
                {loading ? (
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                ) : (
                  <p className="card-text fs-4 fw-bold">{stats.companies}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Partners Card */}
          <div className="col-md-4">
            <div className="card h-100 action-card">
              <div className="card-body text-center">
                <h3 className="card-title fs-6 text-muted">Nombre total de partenaires</h3>
                {loading ? (
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                ) : (
                  <p className="card-text fs-4 fw-bold">{stats.partners}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomePanel;