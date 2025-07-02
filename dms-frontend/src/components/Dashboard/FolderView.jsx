// src/components/Dashboard/FolderView.jsx
import React, { useState } from 'react';

const FolderView = () => {
  const [folders] = useState([
    { id: 1, name: 'Documents Financiers', count: 24, color: 'bg-blue-100' },
    { id: 2, name: 'Contrats', count: 18, color: 'bg-green-100' },
    { id: 3, name: 'Ressources Humaines', count: 32, color: 'bg-yellow-100' },
    { id: 4, name: 'Factures', count: 42, color: 'bg-purple-100' },
    { id: 5, name: 'Projets', count: 15, color: 'bg-pink-100' },
    { id: 6, name: 'Archives', count: 67, color: 'bg-indigo-100' },
  ]);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Dossiers</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders.map((folder) => (
          <div 
            key={folder.id} 
            className={`${folder.color} rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow duration-200`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">{folder.name}</h3>
              <span className="text-2xl">📁</span>
            </div>
            <div className="mt-3 flex items-center">
              <span className="text-gray-600 text-sm">{folder.count} documents</span>
              <button className="ml-auto text-blue-600 hover:text-blue-800 text-sm font-medium">
                Ouvrir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FolderView;