// src/components/Layout/Layout.jsx
import React, { useState } from 'react';
import NavBar from './NavBar';
import SideBar from './Sidebar';
import './layout.css';

const Layout = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="layout">
      <NavBar 
        user={user} 
        onLogout={onLogout} 
        toggleSidebar={toggleSidebar}
      />
      
      <div className="layout-content">
        <SideBar 
          user={user} 
          isOpen={sidebarOpen} 
          toggleSidebar={toggleSidebar}
        />
        
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="content-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;