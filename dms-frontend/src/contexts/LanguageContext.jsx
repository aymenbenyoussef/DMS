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
          'dashboard': 'DMS',
          'tools': 'Outils',
          'systemConfig': 'Configuration',
          'businessData': 'Données',
          'documentManagement': 'Gestion des documents',
          'users': 'Utilisateurs',
          'dataTypes': 'Types de documents',
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
          'searchPlaceholder': 'Recherche...',
          'searching': 'Recherche en cours...',
          'noResults': 'Aucun document trouvé pour',
          'searchPrompt': 'Rechercher à partir d’un nom de document',
          'company': 'Entité',
          'doctype': 'Type de document',
          'invoice': 'Facture',
          'nonInvoice': 'Non facturable',
          'invoiceYes': 'Facturable',
          'invoiceNo': 'Non Facturable',
          'systemName': 'Système avancé de gestion des données',
          'welcome': 'Bienvenue',
          'toVerify': 'Pré-classement ',
          'retry': 'Réessayer',
          'noCompaniesFound': 'Aucune entreprise trouvée',
          'noFoldersFound': 'Aucun dossier trouvé',
          'loadingFolders': 'Chargement des dossiers...',
          'loadingTimeout': 'Le chargement prend trop de temps.',
          'previewError': "Erreur lors de l'aperçu du document.",
          'deleteError': "Erreur lors de la suppression du document.",
          'processError': "Erreur lors du traitement du document : ",
          'moveSuccess': "Document déplacé avec succès !",
          'confirmError': "Erreur lors de la confirmation du document : ",
          'noData': "Aucune donnée à afficher.",
          'noResultsFound': "Aucun résultat trouvé pour les filtres appliqués.",
          'id': 'ID',
          'filename': 'Nom du document',
          'uploadDate': "Date d'importation",
          'tempDocuments': 'Pré-classement ',
          'showFilters': 'Afficher les filtres',
          'hideFilters': 'Masquer les filtres',
          'filters': 'Filtres',
          'export': 'Exporter',
          'exportCSV': 'Exporter en CSV',
          'exportExcel': 'Exporter en Excel',
          'exportJSON': 'Exporter en JSON',
          'exportTXT': 'Exporter en TXT',
          'upload': 'Charger un document',
          'loading': 'Chargement...',
          'sortById': 'Trier par ID',
          'sortByFilename': 'Trier par nom de document',
          'sortByOwner': 'Trier par propriétaire',
          'sortByDate': 'Trier par date',
          'idPlaceholder': 'Filtrer par ID',
          'filenamePlaceholder': 'Filtrer par nom de document',
          'ownerPlaceholder': 'Filtrer par propriétaire',
          'date': 'Date',
          'actions': 'Actions',
          'move': 'Déplacer',
          'moving': 'Déplacement...',
          'delete': 'Supprimer',
          'deleting': 'Suppression...',
          'search': 'Recherche',
          'dateRange': 'Plage de dates',
          'clearAllFilters': 'Réinitialiser les filtres',
          'previewNotSupported': 'Aperçu non supporté pour ce type de document.',
          'documentInfo': 'Informations du document',
          'documentId': 'ID du document',
          'confirmDelete': 'Confirmer la suppression',
          'deleteConfirmation': 'Cette action supprimera les fichiers sélectionnés.',
          'deleteWarning': 'Êtes-vous certain de vouloir continuer?',
          'cancel': 'Annuler',
          'close': 'Fermer',
          'documentConfirmation': 'Confirmation du document',
          'owner':'propriétaire',
        },
        en: {
          'dashboard': 'Dashboard',
          'tools': 'Tools',
          'systemConfig': 'Configuration',
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
          'toVerify': 'Pré-classement ',
          'retry': 'Retry',
          'noCompaniesFound': 'No companies found',
          'noFoldersFound': 'No folders found',
          'loadingFolders': 'Loading folders...',
          'loadingTimeout': 'Loading is taking too long.',
          'previewError': "Error previewing document.",
          'deleteError': "Error deleting document.",
          'processError': "Error processing document: ",
          'moveSuccess': "Document moved successfully!",
          'confirmError': "Error confirming document: ",
          'noData': "No data to display.",
          'noResultsFound': "No results found for the applied filters.",
          'id': 'ID',
          'filename': 'Filename',
          'uploadDate': 'Upload date',
          'tempDocuments': 'Pré-classement ',
          'showFilters': 'Show filters',
          'hideFilters': 'Hide filters',
          'filters': 'Filters',
          'export': 'Export',
          'exportCSV': 'Export as CSV',
          'exportExcel': 'Export as Excel',
          'exportJSON': 'Export as JSON',
          'exportTXT': 'Export as TXT',
          'upload': 'Upload',
          'loading': 'Loading...',
          'sortById': 'Sort by ID',
          'sortByFilename': 'Sort by filename',
          'sortByOwner': 'Sort by owner',
          'sortByDate': 'Sort by date',
          'idPlaceholder': 'Filter by ID',
          'filenamePlaceholder': 'Filter by filename',
          'ownerPlaceholder': 'Filter by owner',
          'date': 'Date',
          'propriétaire':'owner',
          'actions': 'Actions',
          'move': 'Move',
          'moving': 'Moving...',
          'delete': 'Delete',
          'deleting': 'Deleting...',
          'search': 'Search',
          'dateRange': 'Date range',
          'clearAllFilters': 'Clear all filters',
          'previewNotSupported': 'Preview not supported for this file type.',
          'documentInfo': 'Document information',
          'documentId': 'Document ID',
          'confirmDelete': 'Confirm deletion',
          'deleteConfirmation': 'Are you sure you want to delete this document?',
          'deleteWarning': 'This action is irreversible.',
          'cancel': 'Cancel',
          'close': 'Close',
          'documentConfirmation': 'Document confirmation',
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