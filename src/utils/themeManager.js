import { uiThemes } from '../themes/ui-themes';
import { initSimpleMatrixAnimation, initSimpleMatrixBlueAnimation, cleanupMatrixAnimation } from './simpleMatrixAnimation';

// Convierte un color hex a rgba con opacidad
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return 'rgba(0,0,0,0)';
  if (!hex.startsWith('#')) return hex;
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Función para ajustar el brillo de un color hex
function adjustColorBrightness(hex, percent) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
  
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  
  // Determinar si el color es claro u oscuro
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
  const isDark = brightness < 128;
  
  // Ajustar el brillo: si es oscuro, hacerlo más claro; si es claro, hacerlo más oscuro
  const adjustment = isDark ? percent : -percent;
  
  r = Math.min(255, Math.max(0, Math.round(r + (adjustment / 100) * 255)));
  g = Math.min(255, Math.max(0, Math.round(g + (adjustment / 100) * 255)));
  b = Math.min(255, Math.max(0, Math.round(b + (adjustment / 100) * 255)));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.styleElement = null;
    this.createStyleElement();
  }

  createStyleElement() {
    // Crear elemento style para CSS dinámico
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'dynamic-theme-styles';
    document.head.appendChild(this.styleElement);
  }

  applyTheme(themeName) {
    const theme = uiThemes[themeName];
    if (!theme) {
      console.warn(`[THEME] Theme "${themeName}" not found. Available themes:`, Object.keys(uiThemes));
      return;
    }

    this.currentTheme = theme;
    this.generateCSS(theme);
    
    // Aplicar animaciones si es un tema animado
    this.applyAnimations(theme);
    
    // Aplicar configuración del icono interactivo
    this.applyInteractiveIcon();
    
    // Guardar el tema seleccionado
    localStorage.setItem('ui_theme', themeName);
    
    // Emitir evento global para notificar cambio de tema
    if (typeof window !== 'undefined') {
      // Usar setTimeout para asegurar que el tema se haya aplicado completamente
      setTimeout(() => {
        window.dispatchEvent(new Event('theme-changed'));
      }, 10);
    }
  }

  generateCSS(theme) {
    const colors = theme.colors;
    // Determinar si el fondo de la sidebar es claro u oscuro
    function isColorLight(hex) {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      // Percepción de luminosidad
      return (0.299 * r + 0.587 * g + 0.114 * b) > 186;
    }
    const sidebarBgIsLight = isColorLight(colors.sidebarBackground);
    const sidebarButtonText = colors.sidebarText;
    const palette = theme.statusBarPalette || {};
    
    // Verificar si se debe usar colores primarios para titlebar
    const usePrimaryColorsForTitlebar = localStorage.getItem('use_primary_colors_titlebar') === 'true';
    const css = `
      :root {
        --statusbar-bg: ${palette.fondo || colors.statusBarBackground};
        --statusbar-text: ${palette.texto || colors.statusBarText};
        --statusbar-disk: ${palette.disco || '#ffb300'};
        --statusbar-red-up: ${palette.redUp || '#00e676'};
        --statusbar-red-down: ${palette.redDown || '#2196f3'};
        --statusbar-cpu: ${palette.cpu || '#2196f3'};
        --statusbar-mem: ${palette.memoria || '#00e676'};
        --statusbar-icons: ${palette.iconos || '#2196f3'};
      }
      /* === ROOT VARIABLES === */
      :root {
        --ui-sidebar-bg: ${colors.sidebarBackground};
        --ui-sidebar-border: ${colors.sidebarBorder};
        --ui-sidebar-text: ${colors.sidebarText};
        --ui-sidebar-hover: ${colors.sidebarHover};
        --ui-sidebar-selected: ${colors.sidebarSelected};
        --ui-sidebar-gutter-bg: ${colors.sidebarGutter};
        
        --ui-menubar-bg: ${colors.menuBarBackground};
        --ui-menubar-text: ${colors.menuBarText};
        --ui-menubar-border: ${colors.menuBarBorder};
        --ui-menubar-hover: ${colors.menuBarHover};
        
        --ui-statusbar-bg: ${colors.statusBarBackground};
        --ui-statusbar-text: ${colors.statusBarText};
        --ui-statusbar-border: ${colors.statusBarBorder};
        
        --ui-tab-bg: ${colors.tabBackground};
        --ui-tab-active-bg: ${colors.tabActiveBackground};
        --ui-tab-hover-bg: ${colors.tabHoverBackground};
        --ui-tab-text: ${colors.tabText};
        --ui-tab-active-text: ${colors.tabActiveText};
        --ui-tab-border: ${colors.tabBorder};
        --ui-tab-close-hover: ${colors.tabCloseHover};
        
        --ui-tabgroup-bg: ${colors.tabGroupBackground};
        --ui-tabgroup-text: ${colors.tabGroupText};
        --ui-tabgroup-border: ${colors.tabGroupBorder};
        
        --ui-content-bg: ${colors.contentBackground};
        --ui-content-border: ${colors.contentBorder};
        
        --ui-dialog-bg: ${colors.dialogBackground};
        --ui-dialog-text: ${colors.dialogText};
        --ui-dialog-border: ${colors.dialogBorder};
        --ui-dialog-shadow: ${colors.dialogShadow};
        
        --ui-button-primary: ${colors.buttonPrimary};
        --ui-button-primary-text: ${colors.buttonPrimaryText};
        --ui-button-secondary: ${colors.buttonSecondary};
        --ui-button-secondary-text: ${colors.buttonSecondaryText};
        --ui-button-hover: ${colors.buttonHover};
        
        --ui-sidebar-button-bg: ${hexToRgba(colors.buttonPrimary, 0.12)};
        --ui-sidebar-button-text: ${sidebarButtonText};
        --ui-context-bg: ${colors.contextMenuBackground};
        --ui-context-text: ${colors.contextMenuText};
        --ui-context-hover: ${colors.contextMenuHover};
        --ui-context-border: ${colors.contextMenuBorder};
        --ui-context-shadow: ${colors.contextMenuShadow};
        
        /* Scrollbar Colors */
        --scrollbar-track: ${colors.scrollbarTrack || 'rgba(0, 0, 0, 0.1)'};
        --scrollbar-thumb: ${colors.scrollbarThumb || '#888'};
        --scrollbar-thumb-hover: ${colors.scrollbarThumbHover || '#555'};
        
        /* File Explorer Button Colors */
        --ui-file-button-text: ${colors.sidebarText};
        --ui-file-button-hover: ${colors.buttonHover};
        --ui-file-button-bg: transparent;
        --ui-titlebar-accent: ${usePrimaryColorsForTitlebar ? (colors['--ui-titlebar-accent'] || colors.buttonPrimary || '#1976d2') : (adjustColorBrightness(colors.sidebarBackground, 8) || colors.buttonPrimary || '#1976d2')};
        --ui-titlebar-text: ${usePrimaryColorsForTitlebar ? (colors['--ui-titlebar-text'] || '#fff') : (colors.buttonPrimary || '#fff')};
      }

      /* === SIDEBAR STYLES === */
      .sidebar-container {
        background: var(--ui-sidebar-bg) !important;
        border-right: 1px solid var(--ui-sidebar-border) !important;
        color: var(--ui-sidebar-text) !important;
      }

      .sidebar-tree {
        background: var(--ui-sidebar-bg) !important;
        color: var(--ui-sidebar-text) !important;
      }

      .sidebar-tree .p-treenode-content:hover {
        background: var(--ui-sidebar-hover) !important;
      }

      .sidebar-tree .p-treenode-content.p-highlight {
        background: var(--ui-sidebar-selected) !important;
      }

      .sidebar-tree .p-treenode-label {
        color: var(--ui-sidebar-text) !important;
      }

      .sidebar-action-button {
        color: var(--ui-sidebar-text) !important;
      }

      .sidebar-action-button:hover {
        background: var(--ui-sidebar-hover) !important;
      }

      /* === SIDEBAR FOOTER === */
      .sidebar-footer {
        background: var(--ui-sidebar-bg) !important;
        border-top: 1px solid var(--ui-sidebar-border) !important;
        color: var(--ui-sidebar-text) !important;
      }

      /* === MENU BAR STYLES === */
      .p-menubar {
        background: var(--ui-menubar-bg) !important;
        border-bottom: 1px solid var(--ui-menubar-border) !important;
        color: var(--ui-menubar-text) !important;
      }

      .p-menubar .p-menuitem-link {
        color: var(--ui-menubar-text) !important;
      }

      .p-menubar .p-menuitem-link:hover {
        background: var(--ui-menubar-hover) !important;
      }

      /* === STATUS BAR STYLES === */
      .status-bar {
        background: var(--ui-statusbar-bg) !important;
        color: var(--ui-statusbar-text) !important;
        border-top: 1px solid var(--ui-statusbar-border) !important;
      }

      /* === TAB STYLES === */
      .p-tabview .p-tabview-nav {
        background: var(--ui-content-bg) !important;
        border-bottom: 1px solid var(--ui-tab-border) !important;
      }

      .p-tabview .p-tabview-nav li .p-tabview-nav-link {
        background: var(--ui-tab-bg) !important;
        color: var(--ui-tab-text) !important;
        border: 1px solid var(--ui-tab-border) !important;
      }

      .p-tabview .p-tabview-nav li .p-tabview-nav-link:hover {
        background: var(--ui-tab-hover-bg) !important;
      }

      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        background: var(--ui-tab-active-bg) !important;
        color: var(--ui-tab-active-text) !important;
      }

      .p-tabview .p-tabview-nav .p-tabview-ink-bar {
        background: var(--ui-tab-active-text) !important;
      }

      /* Tab close button hover */
      .p-tabview .p-tabview-nav li .p-button:hover {
        background: var(--ui-tab-close-hover) !important;
        color: white !important;
      }

      /* === TAB GROUP STYLES === */
      .tabview-groups-bar {
        background: var(--ui-tabgroup-bg) !important;
        border-bottom: 1px solid var(--ui-tabgroup-border) !important;
      }

      .tabview-groups-bar .p-tabview-nav li .p-tabview-nav-link {
        background: var(--ui-tabgroup-bg) !important;
        color: var(--ui-tabgroup-text) !important;
        border: 1px solid var(--ui-tabgroup-border) !important;
      }

      .tabview-groups-bar .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        background: var(--ui-tab-active-bg) !important;
        color: var(--ui-tab-active-text) !important;
      }

      /* === CONTENT AREA === */
      .content-main {
        background: var(--ui-content-bg) !important;
        border: 1px solid var(--ui-content-border) !important;
      }

      /* === DIALOG STYLES === */
      .p-dialog {
        background: var(--ui-dialog-bg) !important;
        color: var(--ui-dialog-text) !important;
        border: 1px solid var(--ui-dialog-border) !important;
        box-shadow: 0 4px 12px var(--ui-dialog-shadow) !important;
      }

      .p-dialog .p-dialog-header {
        background: var(--ui-dialog-bg) !important;
        color: var(--ui-dialog-text) !important;
        border-bottom: 1px solid var(--ui-dialog-border) !important;
      }

      .p-dialog .p-dialog-content {
        background: var(--ui-dialog-bg) !important;
        color: var(--ui-dialog-text) !important;
      }

      .p-dialog .p-dialog-footer {
        background: var(--ui-dialog-bg) !important;
        border-top: 1px solid var(--ui-dialog-border) !important;
      }

      /* === TOAST STYLES === */
      .p-toast {
        z-index: 1100;
      }

      .p-toast .p-toast-message {
        background: var(--ui-dialog-bg) !important;
        color: var(--ui-dialog-text) !important;
        border: 1px solid var(--ui-dialog-border) !important;
        box-shadow: 0 4px 12px var(--ui-dialog-shadow) !important;
      }

      .p-toast .p-toast-message .p-toast-message-content {
        background: var(--ui-dialog-bg) !important;
        color: var(--ui-dialog-text) !important;
      }

      .p-toast .p-toast-message .p-toast-message-text {
        color: var(--ui-dialog-text) !important;
      }

      .p-toast .p-toast-message .p-toast-message-summary {
        color: var(--ui-dialog-text) !important;
        font-weight: 600;
      }

      .p-toast .p-toast-message .p-toast-message-detail {
        color: var(--ui-dialog-text) !important;
        opacity: 0.9;
      }

      .p-toast .p-toast-message .p-toast-icon-close {
        color: var(--ui-dialog-text) !important;
        opacity: 0.7;
      }

      .p-toast .p-toast-message .p-toast-icon-close:hover {
        opacity: 1;
        background: var(--ui-sidebar-hover) !important;
      }

      /* Toast severity colors - usando colores semánticos que se adaptan al tema */
      .p-toast .p-toast-message.p-toast-message-success {
        border-left: 4px solid #4caf50 !important;
      }

      .p-toast .p-toast-message.p-toast-message-success .p-toast-icon {
        color: #4caf50 !important;
      }

      .p-toast .p-toast-message.p-toast-message-info {
        border-left: 4px solid ${colors.buttonPrimary || '#2196f3'} !important;
      }

      .p-toast .p-toast-message.p-toast-message-info .p-toast-icon {
        color: ${colors.buttonPrimary || '#2196f3'} !important;
      }

      .p-toast .p-toast-message.p-toast-message-warn {
        border-left: 4px solid #ff9800 !important;
      }

      .p-toast .p-toast-message.p-toast-message-warn .p-toast-icon {
        color: #ff9800 !important;
      }

      .p-toast .p-toast-message.p-toast-message-error {
        border-left: 4px solid #f44336 !important;
      }

      .p-toast .p-toast-message.p-toast-message-error .p-toast-icon {
        color: #f44336 !important;
      }

      /* === BUTTON STYLES === */
      .p-button {
        background: var(--ui-button-secondary) !important;
        color: var(--ui-button-secondary-text) !important;
        border: 1px solid var(--ui-button-secondary) !important;
      }

      .p-button:not(.p-button-text):not(.p-button-outlined) {
        background: var(--ui-button-primary) !important;
        color: var(--ui-button-primary-text) !important;
        border: 1px solid var(--ui-button-primary) !important;
      }

      .p-button:hover {
        background: var(--ui-button-hover) !important;
        border: 1px solid var(--ui-button-hover) !important;
      }

      /* === CONTEXT MENU STYLES === */
      .p-menu.p-menu-overlay {
        background: var(--ui-context-bg) !important;
        border: 1px solid var(--ui-context-border) !important;
        box-shadow: 0 4px 12px var(--ui-context-shadow) !important;
        border-radius: 6px !important;
        padding: 4px 0 !important;
      }

      .p-menu .p-menuitem {
        margin: 2px 4px !important;
      }

      .p-menu .p-menuitem-link {
        color: var(--ui-context-text) !important;
        border-radius: 4px !important;
        padding: 0.75rem 1rem !important;
      }

      .p-menu .p-menuitem-link:hover {
        background: var(--ui-context-hover) !important;
      }

      .p-menu .p-menuitem-icon {
        color: var(--ui-context-text) !important;
        opacity: 0.8;
      }

      .p-menu .p-menuitem-link:hover .p-menuitem-icon {
        opacity: 1;
      }

      .p-menu .p-menuitem-text {
        color: var(--ui-context-text) !important;
      }

      .p-menu .p-separator {
        border-top: 1px solid var(--ui-context-border) !important;
        margin: 4px 8px !important;
        opacity: 0.5;
      }

      /* Custom context menus */
      .context-menu-custom {
        background: var(--ui-context-bg) !important;
        border: 1px solid var(--ui-context-border) !important;
        box-shadow: 0 4px 12px var(--ui-context-shadow) !important;
        color: var(--ui-context-text) !important;
      }

      .context-menu-custom .context-menu-item:hover {
        background: var(--ui-context-hover) !important;
      }

      /* Menús contextuales personalizados de la aplicación */
      .app-context-menu,
      .app-context-menu-titlebar,
      .app-context-menu-unified,
      .app-context-menu-sidebar {
        background: var(--ui-context-bg) !important;
        border: 1px solid var(--ui-context-border) !important;
        box-shadow: 0 4px 12px var(--ui-context-shadow) !important;
        color: var(--ui-context-text) !important;
      }

      .app-context-menu .menu-item,
      .app-context-menu-titlebar .menu-item-titlebar,
      .app-context-menu-unified .menu-item-unified,
      .app-context-menu-sidebar .menu-item {
        color: var(--ui-context-text) !important;
      }

      .app-context-menu .menu-item:hover,
      .app-context-menu-titlebar .menu-item-titlebar:hover,
      .app-context-menu-unified .menu-item-unified:hover,
      .app-context-menu-sidebar .menu-item:hover {
        background: var(--ui-context-hover) !important;
      }

      .app-context-menu .menu-separator,
      .app-context-menu-titlebar .menu-separator,
      .app-context-menu-unified .menu-separator,
      .app-context-menu-sidebar .menu-separator {
        background: var(--ui-context-border) !important;
        opacity: 0.5;
      }

      /* Menús contextuales de terminal y tabs (estilos para componentes con clases) */
      .terminal-context-menu,
      .tab-context-menu {
        background: var(--ui-context-bg) !important;
        border: 1px solid var(--ui-context-border) !important;
        box-shadow: 0 4px 12px var(--ui-context-shadow) !important;
        color: var(--ui-context-text) !important;
        border-radius: 6px !important;
      }

      .terminal-context-menu .menu-item,
      .tab-context-menu .menu-item {
        color: var(--ui-context-text) !important;
        transition: background-color 0.15s ease;
      }

      .terminal-context-menu .menu-item:hover,
      .tab-context-menu .menu-item:hover {
        background: var(--ui-context-hover) !important;
      }

      .terminal-context-menu .menu-separator,
      .tab-context-menu .menu-separator {
        background: var(--ui-context-border) !important;
        opacity: 0.5;
      }

      .terminal-context-menu .menu-item i,
      .tab-context-menu .menu-item i {
        color: var(--ui-context-text) !important;
        opacity: 0.8;
      }

      .terminal-context-menu .menu-item:hover i,
      .tab-context-menu .menu-item:hover i {
        opacity: 1;
      }

      .tab-context-menu .menu-header {
        color: var(--ui-context-text) !important;
        border-bottom: 1px solid var(--ui-context-border) !important;
      }

      /* === CARD STYLES === */
      .p-card {
        background: var(--ui-content-bg) !important;
        color: var(--ui-dialog-text) !important;
        border: 1px solid var(--ui-content-border) !important;
      }

      .p-card .p-card-header {
        background: var(--ui-content-bg) !important;
        color: var(--ui-dialog-text) !important;
        border-bottom: 1px solid var(--ui-content-border) !important;
      }

      /* === INPUT STYLES === */
      .p-inputtext {
        background: var(--ui-content-bg) !important;
        color: var(--ui-dialog-text) !important;
        border: 1px solid var(--ui-content-border) !important;
      }

      .p-dropdown {
        background: var(--ui-content-bg) !important;
        color: var(--ui-dialog-text) !important;
        border: 1px solid var(--ui-content-border) !important;
      }

      /* === SPLITTER STYLES === */
      .p-splitter-panel {
        background: var(--ui-content-bg) !important;
      }

      /* File Explorer específico */
      .file-explorer-table .p-datatable {
        background: var(--ui-content-bg) !important;
        color: var(--ui-dialog-text) !important;
      }

      .file-explorer-table .p-datatable .p-datatable-header {
        background: var(--ui-content-bg) !important;
        color: var(--ui-dialog-text) !important;
        border-bottom: 1px solid var(--ui-content-border) !important;
      }

      .file-explorer-table .p-datatable tbody tr {
        background: var(--ui-content-bg) !important;
        color: var(--ui-dialog-text) !important;
      }

      .file-explorer-table .p-datatable tbody tr:hover {
        background: var(--ui-sidebar-hover) !important;
      }

      /* === GUTTER SPLITTER === */
      .p-splitter-gutter {
        background: var(--ui-sidebar-gutter-bg) !important;
        border: none !important;
        transition: background 0.2s;
      }
      .p-splitter-gutter:hover {
        background: var(--ui-sidebar-hover) !important;
      }

      /* === DIVIDER STYLES === */
      .p-divider {
        border-color: var(--ui-sidebar-border) !important;
      }
      
      .p-divider.p-divider-horizontal:before {
        border-top-color: var(--ui-sidebar-border) !important;
      }
      
      /* === TREE CONTAINER === */
      .tree-container {
        background: var(--ui-sidebar-bg) !important;
      }
      
      /* === TREE FILTER === */
      .sidebar-tree .p-tree-filter-container {
        background: var(--ui-sidebar-bg) !important;
      }
      
      .sidebar-tree .p-tree-filter-container .p-inputtext {
        background: var(--ui-content-bg) !important;
        color: var(--ui-dialog-text) !important;
        border: 1px solid var(--ui-sidebar-border) !important;
      }
    `;

    // Logs de debug removidos para limpiar la consola
    this.styleElement.textContent = css;
    // Log de debug removido para limpiar la consola
    
    // Verificar que las variables CSS se aplicaron (sin logging)
    setTimeout(() => {
      const rootStyles = getComputedStyle(document.documentElement);
      // Log de debug removido para limpiar la consola
    }, 100);
  }

  applyAnimations(theme) {
    // Siempre limpiar todas las animaciones existentes primero
    this.cleanupAutumnLeaves();
    this.cleanupForestMist();
    cleanupMatrixAnimation();
    
    // Verificar si el tema tiene animaciones
    if (theme.colors && theme.colors.animationType) {
      const animationType = theme.colors.animationType;
      
      // Aplicar animación a la barra del menú superior
      const titleBar = document.querySelector('.title-bar');
      if (titleBar) {
        titleBar.setAttribute('data-animation', animationType);
        
        // Para Space Station Animated, agregar estrellas adicionales
        if (animationType === 'space-station') {
          this.addSpaceStationStars(titleBar);
        } else {
          this.removeSpaceStationStars(titleBar);
        }
        
        // Para Matrix Animated, agregar animación JavaScript simple
        if (animationType === 'matrix') {
          initSimpleMatrixAnimation();
        } else if (animationType === 'matrix-blue') {
          initSimpleMatrixBlueAnimation();
        } else if (animationType === 'meteor-shower') {
          // La animación meteor-shower se maneja solo con CSS
          cleanupMatrixAnimation();
        } else if (animationType === 'autumn-leaves') {
          // Inicializar hojas de otoño con posiciones aleatorias
          this.initAutumnLeaves();
        } else if (animationType === 'forest-mist') {
          // Inicializar hojas verdes del bosque
          this.initForestMist();
        } else {
          cleanupMatrixAnimation();
        }
      }
      
      // Aplicar animación al buscador - múltiples selectores para mayor compatibilidad
      const searchSelectors = [
        '.search-input',
        '.p-inputtext.search-input',
        'input.search-input',
        '.title-bar input[type="text"]',
        '.title-bar .p-inputtext'
      ];
      
      let searchInput = null;
      for (const selector of searchSelectors) {
        searchInput = document.querySelector(selector);
        if (searchInput) {
          searchInput.setAttribute('data-animation', animationType);
          break;
        }
      }
      
      // Aplicar animación a la sidebar
      const sidebar = document.querySelector('.sidebar-container');
      if (sidebar) {
        sidebar.setAttribute('data-animation', animationType);
      }
      
      // Aplicar animación a la status bar
      const statusBar = document.querySelector('.status-bar');
      if (statusBar) {
        statusBar.setAttribute('data-animation', animationType);
      }
      
      // Escuchar cambios en la velocidad de animación para actualizar las estrellas
      this.setupAnimationSpeedListener();
    } else {
      // Remover animaciones si no es un tema animado
      this.removeAnimations();
    }
  }

  addSpaceStationStars(titleBar) {
    // Remover estrellas existentes primero
    this.removeSpaceStationStars(titleBar);
    
    // Obtener la velocidad de animación actual
    const animSpeed = document.documentElement.getAttribute('data-tab-anim-speed') || 'normal';
    
    // Multiplicadores de velocidad basados en el selector
    const speedMultipliers = {
      'slow': 3.0,    // 3x más lento
      'normal': 2.0,  // 2x más lento
      'fast': 1.5,    // 1.5x más lento
      'turbo': 1.0    // Velocidad base
    };
    
    const speedMultiplier = speedMultipliers[animSpeed] || 2.0;
    
    // Crear muchas más estrellas para mayor densidad con velocidad MUY reducida
    const starPositions = [
      // Primera fila de estrellas (velocidad MUY lenta)
      { left: '5%', size: '6px', delay: '0.5s', duration: `${Math.round(80 * speedMultiplier)}s` },
      { left: '12%', size: '8px', delay: '1s', duration: `${Math.round(90 * speedMultiplier)}s` },
      { left: '20%', size: '7px', delay: '1.5s', duration: `${Math.round(100 * speedMultiplier)}s` },
      { left: '28%', size: '9px', delay: '2s', duration: `${Math.round(110 * speedMultiplier)}s` },
      { left: '35%', size: '6px', delay: '2.5s', duration: `${Math.round(85 * speedMultiplier)}s` },
      { left: '42%', size: '10px', delay: '3s', duration: `${Math.round(120 * speedMultiplier)}s` },
      { left: '50%', size: '8px', delay: '3.5s', duration: `${Math.round(95 * speedMultiplier)}s` },
      { left: '58%', size: '7px', delay: '4s', duration: `${Math.round(105 * speedMultiplier)}s` },
      { left: '65%', size: '9px', delay: '4.5s', duration: `${Math.round(115 * speedMultiplier)}s` },
      { left: '72%', size: '11px', delay: '5s', duration: `${Math.round(125 * speedMultiplier)}s` },
      { left: '80%', size: '8px', delay: '5.5s', duration: `${Math.round(90 * speedMultiplier)}s` },
      { left: '88%', size: '6px', delay: '6s', duration: `${Math.round(80 * speedMultiplier)}s` },
      { left: '95%', size: '9px', delay: '6.5s', duration: `${Math.round(110 * speedMultiplier)}s` },
      
      // Segunda fila de estrellas (más pequeñas pero también MUY lentas)
      { left: '8%', size: '4px', delay: '7s', duration: `${Math.round(70 * speedMultiplier)}s` },
      { left: '18%', size: '5px', delay: '7.5s', duration: `${Math.round(75 * speedMultiplier)}s` },
      { left: '30%', size: '4px', delay: '8s', duration: `${Math.round(65 * speedMultiplier)}s` },
      { left: '45%', size: '6px', delay: '8.5s', duration: `${Math.round(80 * speedMultiplier)}s` },
      { left: '55%', size: '5px', delay: '9s', duration: `${Math.round(70 * speedMultiplier)}s` },
      { left: '68%', size: '4px', delay: '9.5s', duration: `${Math.round(60 * speedMultiplier)}s` },
      { left: '78%', size: '6px', delay: '10s', duration: `${Math.round(85 * speedMultiplier)}s` },
      { left: '90%', size: '5px', delay: '10.5s', duration: `${Math.round(75 * speedMultiplier)}s` },
      
      // Tercera fila de estrellas (variedad de tamaños, velocidad MUY lenta)
      { left: '3%', size: '12px', delay: '11s', duration: `${Math.round(140 * speedMultiplier)}s` },
      { left: '15%', size: '9px', delay: '11.5s', duration: `${Math.round(115 * speedMultiplier)}s` },
      { left: '25%', size: '11px', delay: '12s', duration: `${Math.round(130 * speedMultiplier)}s` },
      { left: '38%', size: '8px', delay: '12.5s', duration: `${Math.round(100 * speedMultiplier)}s` },
      { left: '48%', size: '13px', delay: '13s', duration: `${Math.round(150 * speedMultiplier)}s` },
      { left: '62%', size: '10px', delay: '13.5s', duration: `${Math.round(120 * speedMultiplier)}s` },
      { left: '75%', size: '7px', delay: '14s', duration: `${Math.round(85 * speedMultiplier)}s` },
      { left: '85%', size: '12px', delay: '14.5s', duration: `${Math.round(135 * speedMultiplier)}s` },
      { left: '92%', size: '9px', delay: '15s', duration: `${Math.round(110 * speedMultiplier)}s` }
    ];
    
    starPositions.forEach((star, index) => {
      const starElement = document.createElement('div');
      starElement.className = `star-${index + 1}`;
      starElement.textContent = '✦';
      starElement.style.cssText = `
        position: absolute;
        top: -20px;
        left: ${star.left};
        color: #00bcd4;
        font-size: ${star.size};
        animation: fallingStars ${star.duration} linear infinite ${star.delay};
        pointer-events: none;
        z-index: 1000;
      `;
      titleBar.appendChild(starElement);
    });
  }

  removeSpaceStationStars(titleBar) {
    // Remover todas las estrellas adicionales
    const existingStars = titleBar.querySelectorAll('[class^="star-"]');
    existingStars.forEach(star => star.remove());
  }

  setupAnimationSpeedListener() {
    // Remover listener anterior si existe
    if (this.animationSpeedObserver) {
      this.animationSpeedObserver.disconnect();
    }
    
    // Crear un observer para detectar cambios en el atributo data-tab-anim-speed
    this.animationSpeedObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-tab-anim-speed') {
          // Si el tema actual es space-station, actualizar las estrellas
          const titleBar = document.querySelector('.title-bar');
          if (titleBar && titleBar.getAttribute('data-animation') === 'space-station') {
            this.addSpaceStationStars(titleBar);
          }
        }
      });
    });
    
    // Observar cambios en el documentElement
    this.animationSpeedObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-tab-anim-speed']
    });
  }

  removeAnimations() {
    // Remover observer si existe
    if (this.animationSpeedObserver) {
      this.animationSpeedObserver.disconnect();
      this.animationSpeedObserver = null;
    }
    
    // Remover animación Matrix si existe
    cleanupMatrixAnimation();
    
    // Limpiar todas las animaciones específicas
    this.cleanupAutumnLeaves();
    this.cleanupForestMist();
    
    // Remover atributos de animación de todos los elementos
    const elements = document.querySelectorAll('[data-animation]');
    elements.forEach(element => {
      element.removeAttribute('data-animation');
      // También remover estrellas si existen
      this.removeSpaceStationStars(element);
    });
  }

  cleanupAutumnLeaves() {
    // Limpiar hojas de otoño existentes
    const existingLeaves = document.querySelectorAll('.autumn-leaf');
    existingLeaves.forEach(leaf => leaf.remove());
    
    // Limpiar contenedor de hojas de otoño
    const leafContainer = document.querySelector('.autumn-leaf-container');
    if (leafContainer) {
      leafContainer.remove();
    }
    
    // Limpiar estilos CSS dinámicos de hojas de otoño
    const existingStyles = document.querySelectorAll('style');
    existingStyles.forEach(style => {
      if (style.textContent && style.textContent.includes('autumn-leaf-random-fall')) {
        style.remove();
      }
    });
  }

  cleanupForestMist() {
    // Limpiar hojas de bosque existentes
    const existingLeaves = document.querySelectorAll('.forest-leaf');
    existingLeaves.forEach(leaf => leaf.remove());
    
    // Limpiar contenedor de hojas de bosque
    const leafContainer = document.querySelector('.forest-leaf-container');
    if (leafContainer) {
      leafContainer.remove();
    }
    
    // Limpiar estilos CSS dinámicos de hojas de bosque
    const existingStyles = document.querySelectorAll('style');
    existingStyles.forEach(style => {
      if (style.textContent && style.textContent.includes('forest-mist-animation')) {
        style.remove();
      }
    });
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  getAvailableThemes() {
    return Object.keys(uiThemes);
  }

  loadSavedTheme() {
    const savedTheme = localStorage.getItem('ui_theme') || 'Light';
    this.applyTheme(savedTheme);
    return savedTheme;
  }

  initAutumnLeaves() {
    // Limpiar todas las animaciones existentes antes de crear nuevas
    this.cleanupAutumnLeaves();
    this.cleanupForestMist();
    
    // Crear contenedor para las hojas si no existe
    let leafContainer = document.querySelector('.autumn-leaf-container');
    if (!leafContainer) {
      leafContainer = document.createElement('div');
      leafContainer.className = 'autumn-leaf-container';
      leafContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
        overflow: hidden;
      `;
      
      const titleBar = document.querySelector('.title-bar[data-animation="autumn-leaves"]');
      if (titleBar) {
        titleBar.appendChild(leafContainer);
      }
    }
    
    // Crear 25 hojas con posiciones aleatorias (más hojas)
    for (let i = 0; i < 25; i++) {
      const leaf = document.createElement('div');
      leaf.className = 'autumn-leaf';
      
      // Posición horizontal aleatoria (5% a 95%)
      const randomLeft = Math.random() * 90 + 5;
      
      // Tipo de hoja aleatorio solo otoñales
      const leafTypes = ['🍂', '🍁', '🍂', '🍁', '🍂', '🍁', '🍂', '🍁', '🍂', '🍁'];
      const randomLeaf = leafTypes[Math.floor(Math.random() * leafTypes.length)];
      
      // Tamaño aleatorio
      const randomSize = Math.random() * 8 + 10; // 10px a 18px (más grandes)
      
      // Velocidad aleatoria MUY LENTA
      const randomDuration = Math.random() * 12 + 18; // 18s a 30s (muy lento)
      
      // Delay aleatorio
      const randomDelay = Math.random() * 40; // 0s a 40s
      
      // Desplazamiento lateral aleatorio
      const randomDrift = (Math.random() - 0.5) * 120; // -60px a +60px
      
      // Rotación aleatoria
      const randomRotation = Math.random() * 360; // 0° a 360°
      
      leaf.textContent = randomLeaf;
      leaf.style.cssText = `
        position: absolute;
        top: -20px;
        left: ${randomLeft}%;
        font-size: ${randomSize}px;
        animation: autumn-leaf-random-fall ${randomDuration}s ease-in-out infinite ${randomDelay}s;
        pointer-events: none;
        z-index: 1000;
        transform: rotate(${randomRotation}deg);
        filter: hue-rotate(${Math.random() * 60 - 30}deg) saturate(1.2) brightness(1.1);
      `;
      
      // Agregar animación CSS dinámica
      const style = document.createElement('style');
      style.textContent = `
        @keyframes autumn-leaf-random-fall {
          0% { 
            transform: translateY(-20px) translateX(0px) rotate(${randomRotation}deg); 
            opacity: 0; 
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { 
            transform: translateY(100vh) translateX(${randomDrift}px) rotate(${randomRotation + 360}deg); 
            opacity: 0; 
          }
        }
      `;
      document.head.appendChild(style);
      
      leafContainer.appendChild(leaf);
    }
    
    // Renovar las hojas cada 45 segundos para mantener variedad
    setTimeout(() => {
      this.initAutumnLeaves();
    }, 45000);
  }

  initForestMist() {
    // Limpiar todas las animaciones existentes antes de crear nuevas
    this.cleanupAutumnLeaves();
    this.cleanupForestMist();
    
    // Crear contenedor para las hojas si no existe
    let leafContainer = document.querySelector('.forest-leaf-container');
    if (!leafContainer) {
      leafContainer = document.createElement('div');
      leafContainer.className = 'forest-leaf-container';
      leafContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
        overflow: hidden;
      `;
      
      const titleBar = document.querySelector('.title-bar[data-animation="forest-mist"]');
      if (titleBar) {
        titleBar.appendChild(leafContainer);
      }
    }
    
    // Crear 20 hojas verdes del bosque con posiciones aleatorias
    for (let i = 0; i < 20; i++) {
      const leaf = document.createElement('div');
      leaf.className = 'forest-leaf';
      
      // Posición horizontal aleatoria (5% a 95%)
      const randomLeft = Math.random() * 90 + 5;
      
      // Tipo de hoja verde del bosque
      const leafTypes = ['🌿', '🍃', '🌱', '🌾', '🌿', '🍃', '🌱', '🌾', '🌿', '🍃'];
      const randomLeaf = leafTypes[Math.floor(Math.random() * leafTypes.length)];
      
      // Tamaño aleatorio
      const randomSize = Math.random() * 6 + 8; // 8px a 14px
      
      // Velocidad aleatoria
      const randomDuration = Math.random() * 8 + 10; // 10s a 18s
      
      // Delay aleatorio
      const randomDelay = Math.random() * 25; // 0s a 25s
      
      // Desplazamiento lateral aleatorio
      const randomDrift = (Math.random() - 0.5) * 80; // -40px a +40px
      
      // Rotación aleatoria
      const randomRotation = Math.random() * 360; // 0° a 360°
      
      leaf.textContent = randomLeaf;
      leaf.style.cssText = `
        position: absolute;
        top: -20px;
        left: ${randomLeft}%;
        font-size: ${randomSize}px;
        animation: forest-leaf-random-fall ${randomDuration}s ease-in-out infinite ${randomDelay}s;
        pointer-events: none;
        z-index: 1000;
        transform: rotate(${randomRotation}deg);
        filter: hue-rotate(${Math.random() * 40 - 20}deg) saturate(1.3) brightness(1.2);
      `;
      
      // Agregar animación CSS dinámica
      const style = document.createElement('style');
      style.textContent = `
        @keyframes forest-leaf-random-fall {
          0% { 
            transform: translateY(-20px) translateX(0px) rotate(${randomRotation}deg); 
            opacity: 0; 
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { 
            transform: translateY(100vh) translateX(${randomDrift}px) rotate(${randomRotation + 360}deg); 
            opacity: 0; 
          }
        }
      `;
      document.head.appendChild(style);
      
      leafContainer.appendChild(leaf);
    }
    
    // Renovar las hojas cada 40 segundos para mantener variedad
    setTimeout(() => {
      this.initForestMist();
    }, 40000);
  }

  applyInteractiveIcon() {
    // Verificar si el icono interactivo está habilitado
    const interactiveIconEnabled = localStorage.getItem('nodeterm_interactive_icon');
    const titleBar = document.querySelector('.title-bar');
    
    if (titleBar) {
      if (interactiveIconEnabled === 'true') {
        titleBar.setAttribute('data-interactive-icon', 'true');
      } else {
        titleBar.removeAttribute('data-interactive-icon');
      }
    }
  }
}

// Instancia singleton
export const themeManager = new ThemeManager(); 