import React from 'react';
//import './AdminDashboard.css';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const tiles = [
    { icon: '👥', label: 'Groups management' },
    
    { icon: '💾', label: 'Backup tools' },
    
    
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">User Dashboard</h1>
        
      </div>
      <link to="/admin/users" className='Users management'></link>
      <div className="tiles-container">
        {tiles.map((tile, index) =>  tile.link ? (
            <Link to={tile.link} key={index} className="tile tile-link">
              <div className="tile-icon">{tile.icon}</div>
              <div className="tile-label">{tile.label}</div>
            </Link>
          ) :(
          <div key={index} className="tile">
            <div className="tile-icon">{tile.icon}</div>
            <div className="tile-label">{tile.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
