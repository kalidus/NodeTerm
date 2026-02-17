import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { fontLoader } from './utils/fontLoader';

// PrimeReact - Los CSS se cargan normalmente (webpack los optimiza)
// 🚀 OPTIMIZACIÓN: Estos imports son necesarios pero webpack los procesa eficientemente
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
// Fuentes locales integradas (generadas con npm run download-fonts)
import './styles/fonts.css';
// import './assets/DashboardStyles.css';
// import './assets/Dashboard.css';
// import './assets/form-fixes.css';
// import './assets/sidebar-theme-fixes.css';

// Aplicar tema mínimo lo antes posible: evita destello blanco
const applyEarlyBootTheme = () => {
  try {
    const saved = localStorage.getItem('ui_theme');
    // Detectar preferencia oscura del sistema
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Lista de temas claros conocidos (sincronizada con ThemeManager)
    const lightThemes = ['Light', 'Solarized Light', 'Atom One Light', 'Paper', 'Silver', 'Soft Gray', 'Minimal Gray'];

    // Determinar si es tema claro
    let isLight = false;
    if (saved) {
      isLight = lightThemes.includes(saved);
    } else {
      isLight = !prefersDark;
    }

    const root = document.documentElement;
    // Asignar atributos de velocidad para animaciones antes del render
    const ANIM_SPEED_KEY = 'nodeterm_ui_anim_speed';
    const animSpeed = localStorage.getItem(ANIM_SPEED_KEY) || 'normal';
    root.setAttribute('data-ui-anim-speed', animSpeed);
    root.setAttribute('data-tab-anim-speed', animSpeed);

    // Fondo base acorde para evitar flash (blanco o oscuro)
    // Esto debe coincidir con el color de fondo del tema para ser imperceptible
    document.body.style.backgroundColor = isLight ? '#ffffff' : '#0e1116';
  } catch { }
};
applyEarlyBootTheme();

// Habilitar el modo "ripple" para los componentes de PrimeReact
PrimeReact.ripple = true;

// 🚀 OPTIMIZACIÓN: Función para inicializar temas globalmente DIFERIDA después del render
// Esto evita bloquear el render inicial con múltiples accesos a localStorage
const initializeGlobalThemes = () => {
  try {
    // Inicialización global de temas

    // Asegurar que las variables CSS básicas estén definidas
    const root = document.documentElement;

    // Aplicar tema por defecto si no hay ninguno guardado
    const hasUITheme = localStorage.getItem('ui_theme');
    const hasStatusBarTheme = localStorage.getItem('basicapp_statusbar_theme');
    const hasTabTheme = localStorage.getItem('nodeterm_tab_theme');
    const hasTerminalTheme = localStorage.getItem('basicapp_terminal_theme');
    const hasIconTheme = localStorage.getItem('iconTheme');
    const hasIconThemeSidebar = localStorage.getItem('iconThemeSidebar');
    const hasPowerShellTheme = localStorage.getItem('localPowerShellTheme');
    const hasPowerShellStatusBarTheme = localStorage.getItem('localPowerShellStatusBarTheme');
    const hasLinuxTerminalTheme = localStorage.getItem('localLinuxTerminalTheme');

    if (!hasUITheme) {
      console.log('[THEME] Aplicando tema UI por defecto...');
      localStorage.setItem('ui_theme', 'Nord');
    }

    if (!hasStatusBarTheme) {
      console.log('[THEME] Aplicando tema status bar por defecto...');
      localStorage.setItem('basicapp_statusbar_theme', 'Night Owl');
    }

    if (!hasTabTheme) {
      console.log('[THEME] Aplicando tema tabs por defecto...');
      localStorage.setItem('nodeterm_tab_theme', 'nord');
    }

    if (!hasTerminalTheme) {
      console.log('[THEME] Aplicando tema terminal por defecto...');
      localStorage.setItem('basicapp_terminal_theme', 'Night Owl');
    }

    if (!hasIconTheme) {
      console.log('[THEME] Aplicando tema iconos por defecto...');
      localStorage.setItem('iconTheme', 'nord');
    }

    if (!hasIconThemeSidebar) {
      console.log('[THEME] Aplicando tema iconos sidebar por defecto...');
      localStorage.setItem('iconThemeSidebar', 'nord');
    }

    if (!hasPowerShellTheme) {
      console.log('[THEME] Aplicando tema PowerShell por defecto...');
      localStorage.setItem('localPowerShellTheme', 'Night Owl');
    }

    if (!hasPowerShellStatusBarTheme) {
      console.log('[THEME] Aplicando tema PowerShell Status Bar por defecto...');
      localStorage.setItem('localPowerShellStatusBarTheme', 'Night Owl');
    }

    if (!hasLinuxTerminalTheme) {
      console.log('[THEME] Aplicando tema Linux Terminal por defecto...');
      localStorage.setItem('localLinuxTerminalTheme', 'Night Owl');
    }

    // Inicializar velocidad de animaciones globalmente
    const ANIM_SPEED_KEY = 'nodeterm_ui_anim_speed';
    const hasAnimSpeed = localStorage.getItem(ANIM_SPEED_KEY);
    if (!hasAnimSpeed) {
      console.log('[THEME] Aplicando velocidad de animaciones por defecto...');
      localStorage.setItem(ANIM_SPEED_KEY, 'normal');
    }

    // Establecer velocidad de animaciones en el DOM inmediatamente
    const animSpeed = localStorage.getItem(ANIM_SPEED_KEY) || 'normal';
    document.documentElement.setAttribute('data-ui-anim-speed', animSpeed);
    document.documentElement.setAttribute('data-tab-anim-speed', animSpeed);

  } catch (error) {
    console.error('[THEME] Error en inicialización global:', error);
  }
};

import localStorageSyncService from './services/LocalStorageSyncService';

const container = document.getElementById('root');
const root = createRoot(container);

// 🚀 MULTI-INSTANCIA: Sincronización de localStorage en SEGUNDO PLANO
// Esto permite que React renderice inmediatamente con los datos locales existentes
// Si hay cambios en el archivo compartido, se aplicarán asíncronamente (trigger de settings-updated)
const initAndRender = () => {
  // 1. Iniciar sincronización en background (sin await)
  localStorageSyncService.initialize().catch(err => {
    console.warn('[Index] Error en sincronización inicial (background):', err);
  });

  // 2. Inicializar temas globales inmediatamente (usando datos locales)
  initializeGlobalThemes();

  // 3. Renderizar React inmediatamente
  root.render(<App />);

  // 4. Marcar que React está renderizado
  requestAnimationFrame(() => {
    document.documentElement.classList.add('app-ready');
  });
};

// Ejecutar inicialización y render
initAndRender();