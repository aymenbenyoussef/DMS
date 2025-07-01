// src/components/Layout/NavBar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
const NavBar = ({ user, onLogout }) => {
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">DMS Dashboard</h1>
          <a href="/" className="hover:text-blue-200">Dashboard</a>
          {user && user.role === 'admin' && (
    <Link to="/admin/tools" className="nav-btn" style={{ textDecoration: 'none', color: 'inherit' }}>
      Admin Tools
    </Link>)}
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <>
              <span>{user.username} ({user.role})</span>
              <button
                onClick={onLogout}
                className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
              >
                Déconnexion
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;