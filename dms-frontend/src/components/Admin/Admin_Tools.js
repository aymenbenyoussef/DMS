import React from 'react';
//import '../AdminDashboard.css';

const AdminDashboard = () => {
  const tiles = [
    { icon: '👤', label: 'Users management' },
    { icon: '👥', label: 'Groups management' },
    
    { icon: '💾', label: 'Backup tools' },
    { icon: '📄', label: 'Log files management' },
    { icon: '🗂️', label: 'Categories' },
    { icon: '🔖', label: 'Attributes' },
    { icon: '🗃️', label: 'Contents overview' },
    { icon: '📊', label: 'Charts' },
    { icon: '✅', label: 'Folder/Document check' },
    { icon: '📈', label: 'Timeline' },
    { icon: '⚙️', label: 'Settings' },
    { icon: '🔌', label: 'Manage extensions' },
    { icon: '⏰', label: 'Scheduler' },
    
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <div className="breadcrumb">Home › Administration</div>
      </div>

      <div className="tiles-container">
        {tiles.map((tile, index) => (
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
