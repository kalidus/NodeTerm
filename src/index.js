import React from 'react';
import { createRoot } from 'react-dom/client';
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

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <App />
); 