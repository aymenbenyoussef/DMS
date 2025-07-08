import { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedDoctype, setSelectedDoctype] = useState(null);
  
  // Add reset function
  const resetSelection = () => {
    setSelectedCompany(null);
    setSelectedDoctype(null);
  };

  return (
    <AppContext.Provider value={{
      selectedCompany,
      selectedDoctype,
      setSelectedCompany,
      setSelectedDoctype,
      resetSelection
    }}>
      {children}
    </AppContext.Provider>
  );
};