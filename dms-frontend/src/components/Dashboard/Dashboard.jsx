import React, { useContext } from 'react';
import DocumentArchive from './DocumentArchive';
import WelcomePanel from './WelcomePanel';
import { AppContext } from '../context';

const Dashboard = ({ user }) => {
  const { selectedCompany, selectedDoctype } = useContext(AppContext);

  if (!selectedCompany && !selectedDoctype) {
    return <WelcomePanel user={user} />;
  }

  return (
    <DocumentArchive 
      user={user} 
      selectedCompany={selectedCompany} 
      selectedDoctype={selectedDoctype} 
    />
  );
};

export default Dashboard;