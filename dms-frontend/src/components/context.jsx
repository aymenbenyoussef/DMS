import { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);

  return (
    <AppContext.Provider value={{
      selectedCompany,
      selectedFolder,
      setSelectedCompany,
      setSelectedFolder
    }}>
      {children}
    </AppContext.Provider>
  );
};