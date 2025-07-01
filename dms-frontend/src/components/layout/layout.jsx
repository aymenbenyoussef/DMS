// src/components/Layout/Layout.jsx
import React from 'react';
import NavBar from './NavBar';
import SideBar from './Sidebar';

const Layout = ({ children, user, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar user={user} onLogout={onLogout} />
      <div className="flex">
        <SideBar user={user} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;