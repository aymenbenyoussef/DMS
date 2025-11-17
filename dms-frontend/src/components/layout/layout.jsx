// src/components/Layout/Layout.jsx
import React, { useState, useEffect } from 'react';
import NavBar from './NavBar';
import SideBar from './Sidebar';
import { useNotification } from '../context';
import './layout.css';
import './Notification.css';

const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`notification notification-${type}`}>
      {message}
      <button onClick={onClose} className="notification-close">&times;</button>
    </div>
  );
};

const Layout = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem('sidebarOpen');
    return savedState !== null ? JSON.parse(savedState) : true;
  });

  const { notification, hideNotification } = useNotification();

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

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
      
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}

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