// React DOM entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App';


// Désactiver tous les logs natifs si REACT_APP_PRODUCTION_LOGS est à 'true'
/*if (process.env.REACT_APP_PRODUCTION_LOGS === 'true') {
  // eslint-disable-next-line no-empty-function
  console.log = () => {};
  // eslint-disable-next-line no-empty-function
  console.error = () => {};
  // eslint-disable-next-line no-empty-function
  console.warn = () => {};
  // eslint-disable-next-line no-empty-function
  console.info = () => {};
  // eslint-disable-next-line no-empty-function
  console.debug = () => {};
}*/

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);