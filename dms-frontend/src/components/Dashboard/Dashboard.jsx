import React, { useContext } from 'react';
import DocumentArchive from './DocumentArchive';
import { AppContext } from '../context';

const Dashboard = ({ user }) => {
  const { selectedCompany, selectedFolder } = useContext(AppContext);

  return (
    <DocumentArchive 
      user={user} 
      selectedCompany={selectedCompany} 
      selectedFolder={selectedFolder} 
    />
  );
};

export default Dashboard;