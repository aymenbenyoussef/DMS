import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  return useContext(LanguageContext);
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get saved language preference from localStorage or default to French
    return localStorage.getItem('language') || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  const value = {
    language,
    changeLanguage,
    t: (key) => {
      // Simple translation function
      const translations = {
        fr: {
          'dashboard': 'Tableau de bord',
          'tools': 'Outils',
          'systemConfig': 'Système de configuration',
          'businessData': 'Données commerciales',
          'documentManagement': 'Gestion des documents',
          'users': 'Utilisateurs',
          'dataTypes': 'Types de données',
          'partnerTypes': 'Types de partenaires',
          'logs': 'Logs',
          'settings': 'Paramètres',
          'entities': 'Entités',
          'partners': 'Partenaires',
          'uploadFile': 'Upload File',
          'dms': 'DMS',
          'security': 'Sécurité',
          'resetPassword': 'Réinitialiser le mot de passe',
          'logout': 'Déconnexion',
          'searchPlaceholder': 'Recherche par nom de fichier...',
          'searching': 'Recherche en cours...',
          'noResults': 'Aucun document trouvé pour',
          'searchPrompt': 'Entrez un terme de recherche pour commencer',
          'company': 'Entité',
          'doctype': 'Type de document',
          'invoice': 'Facture',
          'nonInvoice': 'Non facturable',
          'invoiceYes': 'Facturable',
          'invoiceNo': 'Non Facturable',
          'systemName': 'Système avancé de gestion des données',
          'welcome': 'Bienvenue',
        },
        en: {
          'dashboard': 'Dashboard',
          'tools': 'Tools',
          'systemConfig': 'System Configuration',
          'businessData': 'Business Data',
          'documentManagement': 'Document Management',
          'users': 'Users',
          'dataTypes': 'Data Types',
          'partnerTypes': 'Partner Types',
          'logs': 'Logs',
          'settings': 'Settings',
          'entities': 'Entities',
          'partners': 'Partners',
          'uploadFile': 'Upload File',
          'dms': 'DMS',
          'security': 'Security',
          'resetPassword': 'Reset Password',
          'logout': 'Logout',
          'searchPlaceholder': 'Search by filename...',
          'searching': 'Searching...',
          'noResults': 'No documents found for',
          'searchPrompt': 'Enter a search term to begin',
          'company': 'Company',
          'doctype': 'Document Type',
          'invoice': 'Invoice',
          'nonInvoice': 'Non-Invoice',
          'invoiceYes': 'Billable',
          'invoiceNo': 'Non-Billable',
          'systemName': 'Advanced Data Management System',
          'welcome': 'Welcome',
        }
      };
      
      return translations[language][key] || key;
    }
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};