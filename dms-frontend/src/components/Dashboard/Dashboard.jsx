import React from 'react';
import Sidebar from '../layout/Sidebar';
import DocumentArchive from '../DocumentArchive';

const Dashboard = ({ 
  user, 
  selectedCompany, 
  setSelectedCompany, 
  selectedFolder, 
  setSelectedFolder 
}) => {
  return (
    <div className="dashboard-container">
      <Sidebar 
        onCompanySelect={(company) => {
          setSelectedCompany(company);
          setSelectedFolder(null);
        }}
        onFolderSelect={setSelectedFolder}
      />
      <div className="main-content">
        <DocumentArchive 
          selectedCompany={selectedCompany} 
          selectedFolder={selectedFolder}
          setSelectedFolder={setSelectedFolder}
        />
      </div>
    </div>
  );
};

export default Dashboard;