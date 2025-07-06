import React, { useContext } from 'react';
import DocumentArchive from './DocumentArchive';
import WelcomePanel from './WelcomePanel';
import { AppContext } from '../context';

const Dashboard = ({ user }) => {
  const { selectedCompany, selectedFolder } = useContext(AppContext);

  if (!selectedCompany && !selectedFolder) {
    return <WelcomePanel user={user} />;
  }

  return (
    <DocumentArchive 
      user={user} 
      selectedCompany={selectedCompany} 
      selectedFolder={selectedFolder} 
    />
  );
};

export default Dashboard;