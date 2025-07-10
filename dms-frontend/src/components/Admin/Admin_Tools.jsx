import React from 'react';
import './AdminDashboard.css';
import { Link } from 'react-router-dom';
import {
  BiUserPlus,
  BiGroup,
  BiBuilding,
  BiBuildings,
  BiFile,
  BiFileBlank,
  BiFolder,
  BiBarChart,
  BiCheckSquare,
  BiTrendingUp,
  BiCog,
  BiPlug,
  BiAlarm,
  BiCollection
} from 'react-icons/bi';

const AdminDashboard = () => {
  const tiles = [
    
    { icon: <BiGroup size={20} />, label: 'Users ', link: '/admin/users' },
    
    { icon: <BiBuildings size={20} />, label: 'Entities ', link: '/companies' },
    { icon: <BiCollection size={20} />, label: 'Data types ', link: '/doctypes' },
    { icon: <BiFolder size={20} />, label: 'Partners' , link: '/partnertypes'},
    { icon: <BiFile size={20} />, label: 'Log files', link: '/admin/activity_logs' },
    { icon: <BiBarChart size={20} />, label: 'Charts' },
    { icon: <BiCheckSquare size={20} />, label: 'Folder/Document check' },
    { icon: <BiTrendingUp size={20} />, label: 'Timeline' },
    { icon: <BiCog size={20} />, label: 'Settings' },
    { icon: <BiPlug size={20} />, label: 'Manage extensions' },
    { icon: <BiAlarm size={20} />, label: 'Scheduler' },
  ];

  // Group tiles into 3 rows
  const rows = [];
  for (let i = 0; i < tiles.length; i += 5) {
    rows.push(tiles.slice(i, i + 5));
  }


  return (
    <div className="container-fluid py-4 admin-dashboard">
      <div className="dashboard-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <h1 className="dashboard-title mb-0">Admin Dashboard</h1>
        </div>
      </div>

      <div className="admin-grid">
        {tiles.map((tile, index) => (
          <div key={index} className="admin-card">
            {tile.link ? (
              <Link to={tile.link} className="card h-100 tile-link">
                <div className="card-body text-center d-flex flex-column justify-content-center align-items-center">
                  <div className="tile-icon mb-2">{tile.icon}</div>
                  <div className="tile-label">{tile.label}</div>
                </div>
              </Link>
            ) : (
              <div className="card h-100 tile">
                <div className="card-body text-center d-flex flex-column justify-content-center align-items-center">
                  <div className="tile-icon mb-2">{tile.icon}</div>
                  <div className="tile-label">{tile.label}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;