import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

// PrimeReact
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

// Custom styles
import './assets/styles.css';
import './assets/sidebar-theme-fixes.css';
import './assets/DashboardStyles.css';
import './assets/Dashboard.css';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
); 