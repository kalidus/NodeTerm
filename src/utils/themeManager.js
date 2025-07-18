import { uiThemes } from '../themes/ui-themes';

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
      console.warn(`Theme "${themeName}" not found`);
      return;
    }

    this.currentTheme = theme;
    this.generateCSS(theme.colors);
    
    // Guardar el tema seleccionado
    localStorage.setItem('ui_theme', themeName);
  }

  generateCSS(colors) {
    const css = `
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
        
        --ui-context-bg: ${colors.contextMenuBackground};
        --ui-context-text: ${colors.contextMenuText};
        --ui-context-hover: ${colors.contextMenuHover};
        --ui-context-border: ${colors.contextMenuBorder};
        --ui-context-shadow: ${colors.contextMenuShadow};
<<<<<<< HEAD
=======
        
        /* File Explorer Button Colors */
        --ui-file-button-text: ${colors.sidebarText};
        --ui-file-button-hover: ${colors.buttonHover};
        --ui-file-button-bg: transparent;
>>>>>>> v1.3.1
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
        background: var(--ui-tab-bg) !important;
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
      }

      .p-menu .p-menuitem-link {
        color: var(--ui-context-text) !important;
      }

      .p-menu .p-menuitem-link:hover {
        background: var(--ui-context-hover) !important;
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

    this.styleElement.textContent = css;
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
}

// Instancia singleton
export const themeManager = new ThemeManager(); 