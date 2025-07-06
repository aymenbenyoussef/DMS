import { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  
  // Add reset function
  const resetSelection = () => {
    setSelectedCompany(null);
    setSelectedFolder(null);
  };

  return (
    <AppContext.Provider value={{
      selectedCompany,
      selectedFolder,
      setSelectedCompany,
      setSelectedFolder,
      resetSelection // Export reset function
    }}>
      {children}
    </AppContext.Provider>
  );
};