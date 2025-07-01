// src/components/Dashboard/Dashboard.jsx
import React from 'react';

const Dashboard = ({ user }) => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Tableau de bord DMS</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Bienvenue, {user.username}!</h2>
        <p className="text-gray-600">Rôle: {user.role}</p>
        <p className="text-gray-600">ID: {user.id}</p>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Documents Totaux</h3>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Factures</h3>
            <p className="text-2xl font-bold text-green-600">0</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">Autres Documents</h3>
            <p className="text-2xl font-bold text-purple-600">0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;