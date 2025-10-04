import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

export const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedDoctype, setSelectedDoctype] = useState(null);
  const [systemName, setSystemName] = useState(''); // Always read from settings

  // Fetch system name on app load
  useEffect(() => {
    const fetchSystemName = async () => {
      try {
        const response = await api.settings.getSettings();
        const settings = await response.json();
        if (settings.systemName) {
          setSystemName(settings.systemName);
          document.title = settings.systemName;
        }
      } catch (error) {
        console.log('Could not fetch system settings:', error);
      }
    };
    fetchSystemName();
  }, []);

  const resetSelection = () => {
    setSelectedCompany(null);
    setSelectedDoctype(null);
  };

  const value = {
    selectedCompany,
    setSelectedCompany,
    selectedDoctype,
    setSelectedDoctype,
    resetSelection,
    systemName,
    setSystemName
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};