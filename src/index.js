import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';

// PrimeReact
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import './styles/base/base.css'; // Importamos la nueva base de estilos
import PrimeReact from 'primereact/api';

// Configuración global de PrimeReact para evitar errores de overlays
if (typeof window !== 'undefined') {
  // Asegurar que PrimeReact esté definido
  if (!window.PrimeReact) {
    window.PrimeReact = {};
  }
  
  // Configuración para evitar errores de overlays
  window.PrimeReact = {
    ...window.PrimeReact,
    hideOverlaysOnDocumentScrolling: true,
    autoZIndex: true,
    zIndex: {
      modal: 1100,
      overlay: 1000,
      menu: 1000,
      tooltip: 1100
    },
    // Configuraciones adicionales para evitar errores
    ripple: false,
    inputStyle: 'outlined',
    locale: 'es'
  };
  
  // Configuración adicional para overlays
  window.PrimeReact.overlayOptions = {
    hideOverlaysOnDocumentScrolling: true,
    autoZIndex: true
  };
}

// Custom styles
import './styles/main.css';
// import './assets/DashboardStyles.css';
// import './assets/Dashboard.css';
// import './assets/form-fixes.css';
// import './assets/sidebar-theme-fixes.css';

// Habilitar el modo "ripple" para los componentes de PrimeReact
PrimeReact.ripple = true;

// Función para inicializar temas globalmente antes de renderizar la app
const initializeGlobalThemes = () => {
  try {
    console.log('[THEME] Inicialización global de temas...');
    
    // Asegurar que las variables CSS básicas estén definidas
    const root = document.documentElement;
    
    // Aplicar tema por defecto si no hay ninguno guardado
    const hasUITheme = localStorage.getItem('ui_theme');
    const hasStatusBarTheme = localStorage.getItem('basicapp_statusbar_theme');
    const hasTabTheme = localStorage.getItem('nodeterm_tab_theme');
    
    if (!hasUITheme) {
      console.log('[THEME] Aplicando tema UI por defecto...');
      localStorage.setItem('ui_theme', 'Light');
    }
    
    if (!hasStatusBarTheme) {
      console.log('[THEME] Aplicando tema status bar por defecto...');
      localStorage.setItem('basicapp_statusbar_theme', 'Default Dark');
    }
    
    if (!hasTabTheme) {
      console.log('[THEME] Aplicando tema tabs por defecto...');
      localStorage.setItem('nodeterm_tab_theme', 'default');
    }
    
  } catch (error) {
    console.error('[THEME] Error en inicialización global:', error);
  }
};

// Ejecutar inicialización global
initializeGlobalThemes();

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <App />
); 