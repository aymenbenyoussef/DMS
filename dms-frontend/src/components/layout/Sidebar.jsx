// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import API from '../../api';
import './Sidebar.css';
import { Link } from 'react-router-dom';

const Sidebar = ({ user }) => {
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
  const fetchCompanies = async () => {
    try {
      const response = await API.companies.getAll();
      console.log("Companies data:", response.data);
      
      const data = response.data;

      // Si c'est un tableau direct
      if (Array.isArray(data)) {
        setCompanies(data);
      }
      // Si c'est un objet avec une clé
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

  if (user?.id) {
    fetchCompanies();
  }
}, [user]);


  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <svg xmlns="http://www.w3.org/2000/svg" className="company-icon" viewBox="0 0 24 24" fill="currentColor">
  <path d="M3 21v-2h18v2H3zm2-3V3h6v15H5zm8 0V7h6v11h-6z" />
</svg>
        <h2>Companies</h2>
      </header>

      {error && <div className="error-message">{error}</div>}

      {companies.length === 0 ? (
        <section className="empty-folders">
          {user && user.role === 'user' && (
            <Link to="/AddComp" className="btn-primary">
              <span className="nav-icon"></span>
              <span>Add new company</span>
            </Link>
          )}
        </section>
      ) : (
        <ul className="folder-list" role="list">
          {companies.map(company => (
            <li
              key={company.id}
              className="folder-item"
              tabIndex={0}
              role="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="company-icon" viewBox="0 0 24 24" fill="currentColor">
  <path d="M3 21v-2h18v2H3zm2-3V3h6v15H5zm8 0V7h6v11h-6z" />
</svg>
              <span className="company-name">{company.name}</span>
            </li>
          ))}
        </ul>
      )}

      
    </aside>
  );
};

export default Sidebar;