// Temas modernos de interfaz extraídos de ui-themes.js
// Categorías de temas de interfaz
const MODERN_UI_KEYS = [
  'Pro Slate', 'Pro Ocean', 'Pro Forest', 'Pro Indigo', 'Graphite', 
  'Modern Steel', 'Modern Copper', 'Modern Sage', 'Sandstone', 'Midnight Blue',
  'Elegant Taupe', 'Muted Teal', 'Arctic Frost', 'Purple Haze',
  'Soft Lavender', 'Warm Beige', 'Muted Sage', 'Dusty Rose', 'Soft Mint', 'Warm Gray',
  'Pro Cyberpunk', 'Pro Aurora', 'Pro Cosmic', 'Pro Emerald', 'Pro Sakura', 'Pro Autumn',
  'Pro Cobalt', 'Pro Moonlight', 'Pro Oceanic', 'Pro Everforest',
  'Pro Minty', 'Pro Mirage', 'Pro Solar Amber', 'Pro Magma', 'Pro Catppuccin', 'Pro Rosé Pine'
];

export const modernUiThemes = {
// === SECCIÓN MODERNOS ===
  'Pro Slate': {
    name: 'Pro Slate',
    colors: {
      // Sidebar
      sidebarBackground: '#2d3138',
      sidebarBorder: '#434a54',
      sidebarText: '#d6d8db',
      sidebarHover: '#343a42',
      sidebarSelected: '#1f2329',
      sidebarGutter: '#434a54',
      
      // Menu Bar (top)
      menuBarBackground: '#1f2329',
      menuBarText: '#d6d8db',
      menuBarBorder: '#434a54',
      menuBarHover: '#343a42',
      
      // Status Bar (bottom)
      statusBarBackground: '#434a54',
      statusBarText: '#ffffff',
      statusBarBorder: '#5a6268',
      
      // Tabs
      tabBackground: '#2d3138',
      tabActiveBackground: '#1f2329',
      tabHoverBackground: '#343a42',
      tabText: '#d6d8db',
      tabActiveText: '#ffffff',
      tabBorder: '#434a54',
      tabCloseHover: '#e74c3c',
      
      // Tab Groups
      tabGroupBackground: '#343a42',
      tabGroupText: '#d6d8db',
      tabGroupBorder: '#434a54',
      
      // Content Area
      contentBackground: '#1f2329',
      contentBorder: '#434a54',
      
      // Dialogs
      dialogBackground: '#2d3138',
      dialogText: '#e8e8e8',
      dialogBorder: '#434a54',
      dialogShadow: 'rgba(0, 0, 0, 0.3)',
      
      // Buttons
      buttonPrimary: '#6c757d',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#495057',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#5a6268',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#1f2329',
      linuxTerminalBackground: '#2d3138',
      
      // Context Menus
      contextMenuBackground: '#2d3138',
      contextMenuText: '#d6d8db',
      contextMenuHover: '#343a42',
      contextMenuBorder: '#434a54',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#6c757d',
      '--ui-titlebar-text': '#d6d8db'
    },
    statusBarPalette: {
      fondo: '#434a54',
      texto: '#ffffff',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#6c757d',
      cpu: '#6c757d',
      memoria: '#28a745',
      iconos: '#6c757d'
    }
  },

  'Pro Ocean': {
    name: 'Pro Ocean',
    colors: {
      // Sidebar
      sidebarBackground: '#0f3354',
      sidebarBorder: '#2a72b5',
      sidebarText: '#b7cde3',
      sidebarHover: '#0e2b46',
      sidebarSelected: '#114a7a',
      sidebarGutter: '#2a72b5',
      
      // Menu Bar (top)
      menuBarBackground: '#0b2236',
      menuBarText: '#b7cde3',
      menuBarBorder: '#2a72b5',
      menuBarHover: '#0e2b46',
      
      // Status Bar (bottom)
      statusBarBackground: '#2a72b5',
      statusBarText: '#ffffff',
      statusBarBorder: '#1e5a8a',
      
      // Tabs
      tabBackground: '#0f3354',
      tabActiveBackground: '#114a7a',
      tabHoverBackground: '#0e2b46',
      tabText: '#b7cde3',
      tabActiveText: '#ffffff',
      tabBorder: '#2a72b5',
      tabCloseHover: '#ff6b6b',
      
      // Tab Groups
      tabGroupBackground: '#0e2b46',
      tabGroupText: '#b7cde3',
      tabGroupBorder: '#2a72b5',
      
      // Content Area
      contentBackground: '#0b2236',
      contentBorder: '#2a72b5',
      
      // Dialogs
      dialogBackground: '#0f3354',
      dialogText: '#d0e0f0',
      dialogBorder: '#2a72b5',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#2a72b5',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#1e5a8a',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#1e5a8a',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0b2236',
      linuxTerminalBackground: '#0f3354',
      
      // Context Menus
      contextMenuBackground: '#0f3354',
      contextMenuText: '#b7cde3',
      contextMenuHover: '#0e2b46',
      contextMenuBorder: '#2a72b5',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#2a72b5',
      '--ui-titlebar-text': '#b7cde3'
    },
    statusBarPalette: {
      fondo: '#2a72b5',
      texto: '#ffffff',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#2a72b5',
      cpu: '#2a72b5',
      memoria: '#28a745',
      iconos: '#2a72b5'
    }
  },

  'Pro Forest': {
    name: 'Pro Forest',
    colors: {
      // Sidebar
      sidebarBackground: '#11301f',
      sidebarBorder: '#2e7d32',
      sidebarText: '#c9e7d3',
      sidebarHover: '#153321',
      sidebarSelected: '#1b5e20',
      sidebarGutter: '#2e7d32',
      
      // Menu Bar (top)
      menuBarBackground: '#10271a',
      menuBarText: '#c9e7d3',
      menuBarBorder: '#2e7d32',
      menuBarHover: '#153321',
      
      // Status Bar (bottom)
      statusBarBackground: '#2e7d32',
      statusBarText: '#ffffff',
      statusBarBorder: '#1b5e20',
      
      // Tabs
      tabBackground: '#11301f',
      tabActiveBackground: '#1b5e20',
      tabHoverBackground: '#153321',
      tabText: '#c9e7d3',
      tabActiveText: '#ffffff',
      tabBorder: '#2e7d32',
      tabCloseHover: '#ff7043',
      
      // Tab Groups
      tabGroupBackground: '#153321',
      tabGroupText: '#c9e7d3',
      tabGroupBorder: '#2e7d32',
      
      // Content Area
      contentBackground: '#10271a',
      contentBorder: '#2e7d32',
      
      // Dialogs
      dialogBackground: '#11301f',
      dialogText: '#e0f0e8',
      dialogBorder: '#2e7d32',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#2e7d32',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#1b5e20',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#1b5e20',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#10271a',
      linuxTerminalBackground: '#11301f',
      
      // Context Menus
      contextMenuBackground: '#11301f',
      contextMenuText: '#c9e7d3',
      contextMenuHover: '#153321',
      contextMenuBorder: '#2e7d32',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#2e7d32',
      '--ui-titlebar-text': '#c9e7d3'
    },
    statusBarPalette: {
      fondo: '#2e7d32',
      texto: '#ffffff',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#2e7d32',
      cpu: '#2e7d32',
      memoria: '#28a745',
      iconos: '#2e7d32'
    }
  },

  'Pro Indigo': {
    name: 'Pro Indigo',
    colors: {
      // Sidebar
      sidebarBackground: '#263266',
      sidebarBorder: '#3f51b5',
      sidebarText: '#e3e6ff',
      sidebarHover: '#2b3a73',
      sidebarSelected: '#3f51b5',
      sidebarGutter: '#3f51b5',
      
      // Menu Bar (top)
      menuBarBackground: '#1a1f4a',
      menuBarText: '#e3e6ff',
      menuBarBorder: '#3f51b5',
      menuBarHover: '#2b3a73',
      
      // Status Bar (bottom)
      statusBarBackground: '#3f51b5',
      statusBarText: '#ffffff',
      statusBarBorder: '#2b3a73',
      
      // Tabs
      tabBackground: '#263266',
      tabActiveBackground: '#3f51b5',
      tabHoverBackground: '#2b3a73',
      tabText: '#e3e6ff',
      tabActiveText: '#ffffff',
      tabBorder: '#3f51b5',
      tabCloseHover: '#f44336',
      
      // Tab Groups
      tabGroupBackground: '#2b3a73',
      tabGroupText: '#e3e6ff',
      tabGroupBorder: '#3f51b5',
      
      // Content Area
      contentBackground: '#1a1f4a',
      contentBorder: '#3f51b5',
      
      // Dialogs
      dialogBackground: '#263266',
      dialogText: '#e3e6ff',
      dialogBorder: '#3f51b5',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#3f51b5',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#2b3a73',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#2b3a73',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#1a1f4a',
      linuxTerminalBackground: '#263266',
      
      // Context Menus
      contextMenuBackground: '#263266',
      contextMenuText: '#e3e6ff',
      contextMenuHover: '#2b3a73',
      contextMenuBorder: '#3f51b5',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#3f51b5',
      '--ui-titlebar-text': '#e3e6ff'
    },
    statusBarPalette: {
      fondo: '#3f51b5',
      texto: '#ffffff',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#3f51b5',
      cpu: '#3f51b5',
      memoria: '#28a745',
      iconos: '#3f51b5'
    }
  },

  'Graphite': {
    name: 'Graphite',
    colors: {
      // Sidebar
      sidebarBackground: '#2a2a2a',
      sidebarBorder: '#444',
      sidebarText: '#ddd',
      sidebarHover: '#333',
      sidebarSelected: '#1e1e1e',
      sidebarGutter: '#444',
      
      // Menu Bar (top)
      menuBarBackground: '#1e1e1e',
      menuBarText: '#ddd',
      menuBarBorder: '#444',
      menuBarHover: '#333',
      
      // Status Bar (bottom)
      statusBarBackground: '#444',
      statusBarText: '#fff',
      statusBarBorder: '#333',
      
      // Tabs
      tabBackground: '#2a2a2a',
      tabActiveBackground: '#1e1e1e',
      tabHoverBackground: '#333',
      tabText: '#ddd',
      tabActiveText: '#fff',
      tabBorder: '#444',
      tabCloseHover: '#ff6b6b',
      
      // Tab Groups
      tabGroupBackground: '#333',
      tabGroupText: '#ddd',
      tabGroupBorder: '#444',
      
      // Content Area
      contentBackground: '#1e1e1e',
      contentBorder: '#444',
      
      // Dialogs
      dialogBackground: '#2a2a2a',
      dialogText: '#e8e8e8',
      dialogBorder: '#444',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#6c757d',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#495057',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#5a6268',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#1e1e1e',
      linuxTerminalBackground: '#2a2a2a',
      
      // Context Menus
      contextMenuBackground: '#2a2a2a',
      contextMenuText: '#ddd',
      contextMenuHover: '#333',
      contextMenuBorder: '#444',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#6c757d',
      '--ui-titlebar-text': '#ddd'
    },
    statusBarPalette: {
      fondo: '#444',
      texto: '#fff',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#6c757d',
      cpu: '#6c757d',
      memoria: '#28a745',
      iconos: '#6c757d'
    }
  },

  'Modern Steel': {
    name: 'Modern Steel',
    colors: {
      // Sidebar
      sidebarBackground: '#3a3a3a',
      sidebarBorder: '#4a4a4a',
      sidebarText: '#e0e0e0',
      sidebarHover: '#4a4a4a',
      sidebarSelected: '#2a2a2a',
      sidebarGutter: '#4a4a4a',
      
      // Menu Bar (top)
      menuBarBackground: '#2a2a2a',
      menuBarText: '#e0e0e0',
      menuBarBorder: '#4a4a4a',
      menuBarHover: '#4a4a4a',
      
      // Status Bar (bottom)
      statusBarBackground: '#4a4a4a',
      statusBarText: '#ffffff',
      statusBarBorder: '#2a2a2a',
      
      // Tabs
      tabBackground: '#3a3a3a',
      tabActiveBackground: '#2a2a2a',
      tabHoverBackground: '#4a4a4a',
      tabText: '#e0e0e0',
      tabActiveText: '#ffffff',
      tabBorder: '#4a4a4a',
      tabCloseHover: '#e53e3e',
      
      // Tab Groups
      tabGroupBackground: '#4a4a4a',
      tabGroupText: '#e0e0e0',
      tabGroupBorder: '#2a2a2a',
      
      // Content Area
      contentBackground: '#2a2a2a',
      contentBorder: '#4a4a4a',
      
      // Dialogs
      dialogBackground: '#3a3a3a',
      dialogText: '#e0e0e0',
      dialogBorder: '#4a4a4a',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#6c757d',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#495057',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#5a6268',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#2a2a2a',
      linuxTerminalBackground: '#3a3a3a',
      
      // Context Menus
      contextMenuBackground: '#3a3a3a',
      contextMenuText: '#e0e0e0',
      contextMenuHover: '#4a4a4a',
      contextMenuBorder: '#2a2a2a',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#6c757d',
      '--ui-titlebar-text': '#e0e0e0'
    },
    statusBarPalette: {
      fondo: '#4a4a4a',
      texto: '#ffffff',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#6c757d',
      cpu: '#6c757d',
      memoria: '#28a745',
      iconos: '#6c757d'
    }
  },

  'Modern Copper': {
    name: 'Modern Copper',
    colors: {
      // Sidebar
      sidebarBackground: '#8b4513',
      sidebarBorder: '#a0522d',
      sidebarText: '#f4e4bc',
      sidebarHover: '#a0522d',
      sidebarSelected: '#6b3410',
      sidebarGutter: '#a0522d',
      
      // Menu Bar (top)
      menuBarBackground: '#6b3410',
      menuBarText: '#f4e4bc',
      menuBarBorder: '#a0522d',
      menuBarHover: '#a0522d',
      
      // Status Bar (bottom)
      statusBarBackground: '#a0522d',
      statusBarText: '#ffffff',
      statusBarBorder: '#6b3410',
      
      // Tabs
      tabBackground: '#8b4513',
      tabActiveBackground: '#6b3410',
      tabHoverBackground: '#a0522d',
      tabText: '#f4e4bc',
      tabActiveText: '#ffffff',
      tabBorder: '#a0522d',
      tabCloseHover: '#e53e3e',
      
      // Tab Groups
      tabGroupBackground: '#a0522d',
      tabGroupText: '#f4e4bc',
      tabGroupBorder: '#6b3410',
      
      // Content Area
      contentBackground: '#6b3410',
      contentBorder: '#a0522d',
      
      // Dialogs
      dialogBackground: '#8b4513',
      dialogText: '#f4e4bc',
      dialogBorder: '#a0522d',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#cd853f',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#8b7355',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#b8860b',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#6b3410',
      linuxTerminalBackground: '#8b4513',
      
      // Context Menus
      contextMenuBackground: '#8b4513',
      contextMenuText: '#f4e4bc',
      contextMenuHover: '#a0522d',
      contextMenuBorder: '#6b3410',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#cd853f',
      '--ui-titlebar-text': '#f4e4bc'
    },
    statusBarPalette: {
      fondo: '#a0522d',
      texto: '#ffffff',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#cd853f',
      cpu: '#cd853f',
      memoria: '#28a745',
      iconos: '#cd853f'
    }
  },

  'Modern Sage': {
    name: 'Modern Sage',
    colors: {
      // Sidebar
      sidebarBackground: '#6b8e6b',
      sidebarBorder: '#7ba07b',
      sidebarText: '#f0f8f0',
      sidebarHover: '#7ba07b',
      sidebarSelected: '#5a7a5a',
      sidebarGutter: '#7ba07b',
      
      // Menu Bar (top)
      menuBarBackground: '#5a7a5a',
      menuBarText: '#f0f8f0',
      menuBarBorder: '#7ba07b',
      menuBarHover: '#7ba07b',
      
      // Status Bar (bottom)
      statusBarBackground: '#7ba07b',
      statusBarText: '#ffffff',
      statusBarBorder: '#5a7a5a',
      
      // Tabs
      tabBackground: '#6b8e6b',
      tabActiveBackground: '#5a7a5a',
      tabHoverBackground: '#7ba07b',
      tabText: '#f0f8f0',
      tabActiveText: '#ffffff',
      tabBorder: '#7ba07b',
      tabCloseHover: '#e53e3e',
      
      // Tab Groups
      tabGroupBackground: '#7ba07b',
      tabGroupText: '#f0f8f0',
      tabGroupBorder: '#5a7a5a',
      
      // Content Area
      contentBackground: '#5a7a5a',
      contentBorder: '#7ba07b',
      
      // Dialogs
      dialogBackground: '#6b8e6b',
      dialogText: '#f0f8f0',
      dialogBorder: '#7ba07b',
      dialogShadow: 'rgba(0, 0, 0, 0.3)',
      
      // Buttons
      buttonPrimary: '#8fbc8f',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#6b8e6b',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#7ba07b',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#5a7a5a',
      linuxTerminalBackground: '#6b8e6b',
      
      // Context Menus
      contextMenuBackground: '#6b8e6b',
      contextMenuText: '#f0f8f0',
      contextMenuHover: '#7ba07b',
      contextMenuBorder: '#5a7a5a',
      contextMenuShadow: 'rgba(0, 0, 0, 0.3)',
      '--ui-titlebar-accent': '#8fbc8f',
      '--ui-titlebar-text': '#f0f8f0'
    },
    statusBarPalette: {
      fondo: '#7ba07b',
      texto: '#ffffff',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#8fbc8f',
      cpu: '#8fbc8f',
      memoria: '#28a745',
      iconos: '#8fbc8f'
    }
  },

  'Sandstone': {
    name: 'Sandstone',
    colors: {
      // Sidebar
      sidebarBackground: 'linear-gradient(135deg, #e9d5b7 0%, #dcc4a3 100%)',
      sidebarBorder: '#c6a98d',
      sidebarText: '#6b4f3a',
      sidebarHover: 'linear-gradient(135deg, #eadcc2 0%, #dfcaae 100%)',
      sidebarSelected: 'linear-gradient(135deg, #fff1db 0%, #ead7bc 100%)',
      sidebarGutter: '#c6a98d',
      
      // Menu Bar (top)
      menuBarBackground: 'linear-gradient(135deg, #e9d5b7 0%, #dcc4a3 100%)',
      menuBarText: '#6b4f3a',
      menuBarBorder: '#c6a98d',
      menuBarHover: 'linear-gradient(135deg, #eadcc2 0%, #dfcaae 100%)',
      
      // Status Bar (bottom)
      statusBarBackground: 'linear-gradient(135deg, #fff1db 0%, #ead7bc 100%)',
      statusBarText: '#4a382b',
      statusBarBorder: '#c6a98d',
      
      // Tabs
      tabBackground: 'linear-gradient(135deg, #e9d5b7 0%, #dcc4a3 100%)',
      tabActiveBackground: 'linear-gradient(135deg, #fff1db 0%, #ead7bc 100%)',
      tabHoverBackground: 'linear-gradient(135deg, #eadcc2 0%, #dfcaae 100%)',
      tabText: '#6b4f3a',
      tabActiveText: '#4a382b',
      tabBorder: '#c6a98d',
      tabCloseHover: '#a0522d',
      
      // Tab Groups
      tabGroupBackground: 'linear-gradient(135deg, #eadcc2 0%, #dfcaae 100%)',
      tabGroupText: '#6b4f3a',
      tabGroupBorder: '#c6a98d',
      
      // Content Area
      contentBackground: 'linear-gradient(135deg, #e9d5b7 0%, #dcc4a3 100%)',
      contentBorder: '#c6a98d',
      
      // Dialogs
      dialogBackground: 'linear-gradient(135deg, #e9d5b7 0%, #dcc4a3 100%)',
      dialogText: '#4a2a1a',
      dialogBorder: '#c6a98d',
      dialogShadow: 'rgba(106, 74, 52, 0.2)',
      
      // Buttons
      buttonPrimary: '#a0522d',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#8b7355',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#8b4513',
      
      // Terminal Backgrounds
      powershellTerminalBackground: 'linear-gradient(135deg, #e9d5b7 0%, #dcc4a3 100%)',
      linuxTerminalBackground: 'linear-gradient(135deg, #eadcc2 0%, #dfcaae 100%)',
      
      // Context Menus
      contextMenuBackground: 'linear-gradient(135deg, #e9d5b7 0%, #dcc4a3 100%)',
      contextMenuText: '#6b4f3a',
      contextMenuHover: 'linear-gradient(135deg, #eadcc2 0%, #dfcaae 100%)',
      contextMenuBorder: '#c6a98d',
      contextMenuShadow: 'rgba(106, 74, 52, 0.2)',
      '--ui-titlebar-accent': '#a0522d',
      '--ui-titlebar-text': '#6b4f3a'
    },
    statusBarPalette: {
      fondo: 'linear-gradient(135deg, #fff1db 0%, #ead7bc 100%)',
      texto: '#4a382b',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#a0522d',
      cpu: '#a0522d',
      memoria: '#28a745',
      iconos: '#a0522d'
    }
  },

  'Midnight Blue': {
    name: 'Midnight Blue',
    colors: {
      // Sidebar
      sidebarBackground: '#0f1730',
      sidebarBorder: '#1f2e5f',
      sidebarText: '#c9d4ff',
      sidebarHover: '#172244',
      sidebarSelected: '#1f2e5f',
      sidebarGutter: '#1f2e5f',
      
      // Menu Bar (top)
      menuBarBackground: '#0a0f1a',
      menuBarText: '#c9d4ff',
      menuBarBorder: '#1f2e5f',
      menuBarHover: '#172244',
      
      // Status Bar (bottom)
      statusBarBackground: '#1f2e5f',
      statusBarText: '#ffffff',
      statusBarBorder: '#172244',
      
      // Tabs
      tabBackground: '#0f1730',
      tabActiveBackground: '#1f2e5f',
      tabHoverBackground: '#172244',
      tabText: '#c9d4ff',
      tabActiveText: '#ffffff',
      tabBorder: '#1f2e5f',
      tabCloseHover: '#ff6b6b',
      
      // Tab Groups
      tabGroupBackground: '#172244',
      tabGroupText: '#c9d4ff',
      tabGroupBorder: '#1f2e5f',
      
      // Content Area
      contentBackground: '#0a0f1a',
      contentBorder: '#1f2e5f',
      
      // Dialogs
      dialogBackground: '#0f1730',
      dialogText: '#d8e0ff',
      dialogBorder: '#1f2e5f',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#1f2e5f',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#172244',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#172244',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a0f1a',
      linuxTerminalBackground: '#0f1730',
      
      // Context Menus
      contextMenuBackground: '#0f1730',
      contextMenuText: '#c9d4ff',
      contextMenuHover: '#172244',
      contextMenuBorder: '#1f2e5f',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#1f2e5f',
      '--ui-titlebar-text': '#c9d4ff'
    },
    statusBarPalette: {
      fondo: '#1f2e5f',
      texto: '#ffffff',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#1f2e5f',
      cpu: '#1f2e5f',
      memoria: '#28a745',
      iconos: '#1f2e5f'
    }
  },

  'Elegant Taupe': {
    name: 'Elegant Taupe',
    colors: {
      // Sidebar
      sidebarBackground: '#d4c4a8',
      sidebarBorder: '#b8a082',
      sidebarText: '#5d4e37',
      sidebarHover: '#c7b896',
      sidebarSelected: '#b8a082',
      sidebarGutter: '#b8a082',
      
      // Menu Bar (top)
      menuBarBackground: '#c7b896',
      menuBarText: '#5d4e37',
      menuBarBorder: '#b8a082',
      menuBarHover: '#c7b896',
      
      // Status Bar (bottom)
      statusBarBackground: '#b8a082',
      statusBarText: '#ffffff',
      statusBarBorder: '#a68b6b',
      
      // Tabs
      tabBackground: '#d4c4a8',
      tabActiveBackground: '#b8a082',
      tabHoverBackground: '#c7b896',
      tabText: '#5d4e37',
      tabActiveText: '#ffffff',
      tabBorder: '#b8a082',
      tabCloseHover: '#e53e3e',
      
      // Tab Groups
      tabGroupBackground: '#c7b896',
      tabGroupText: '#5d4e37',
      tabGroupBorder: '#b8a082',
      
      // Content Area
      contentBackground: '#c7b896',
      contentBorder: '#b8a082',
      
      // Dialogs
      dialogBackground: '#d4c4a8',
      dialogText: '#5d4e37',
      dialogBorder: '#b8a082',
      dialogShadow: 'rgba(93, 78, 55, 0.2)',
      
      // Buttons
      buttonPrimary: '#8b7355',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#a68b6b',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#6b5d47',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#c7b896',
      linuxTerminalBackground: '#d4c4a8',
      
      // Context Menus
      contextMenuBackground: '#d4c4a8',
      contextMenuText: '#5d4e37',
      contextMenuHover: '#c7b896',
      contextMenuBorder: '#b8a082',
      contextMenuShadow: 'rgba(93, 78, 55, 0.2)',
      '--ui-titlebar-accent': '#8b7355',
      '--ui-titlebar-text': '#5d4e37'
    },
    statusBarPalette: {
      fondo: '#b8a082',
      texto: '#ffffff',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#8b7355',
      cpu: '#8b7355',
      memoria: '#28a745',
      iconos: '#8b7355'
    }
  },

  'Muted Teal': {
    name: 'Muted Teal',
    colors: {
      // Sidebar
      sidebarBackground: '#4a7c7e',
      sidebarBorder: '#5a8a8c',
      sidebarText: '#e8f4f4',
      sidebarHover: '#5a8a8c',
      sidebarSelected: '#3a6b6d',
      sidebarGutter: '#5a8a8c',
      
      // Menu Bar (top)
      menuBarBackground: '#3a6b6d',
      menuBarText: '#e8f4f4',
      menuBarBorder: '#5a8a8c',
      menuBarHover: '#5a8a8c',
      
      // Status Bar (bottom)
      statusBarBackground: '#5a8a8c',
      statusBarText: '#ffffff',
      statusBarBorder: '#3a6b6d',
      
      // Tabs
      tabBackground: '#4a7c7e',
      tabActiveBackground: '#3a6b6d',
      tabHoverBackground: '#5a8a8c',
      tabText: '#e8f4f4',
      tabActiveText: '#ffffff',
      tabBorder: '#5a8a8c',
      tabCloseHover: '#e53e3e',
      
      // Tab Groups
      tabGroupBackground: '#5a8a8c',
      tabGroupText: '#e8f4f4',
      tabGroupBorder: '#3a6b6d',
      
      // Content Area
      contentBackground: '#3a6b6d',
      contentBorder: '#5a8a8c',
      
      // Dialogs
      dialogBackground: '#4a7c7e',
      dialogText: '#e8f4f4',
      dialogBorder: '#5a8a8c',
      dialogShadow: 'rgba(0, 0, 0, 0.3)',
      
      // Buttons
      buttonPrimary: '#5a8a8c',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#3a6b6d',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#3a6b6d',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#3a6b6d',
      linuxTerminalBackground: '#4a7c7e',
      
      // Context Menus
      contextMenuBackground: '#4a7c7e',
      contextMenuText: '#e8f4f4',
      contextMenuHover: '#5a8a8c',
      contextMenuBorder: '#3a6b6d',
      contextMenuShadow: 'rgba(0, 0, 0, 0.3)',
      '--ui-titlebar-accent': '#5a8a8c',
      '--ui-titlebar-text': '#e8f4f4'
    },
    statusBarPalette: {
      fondo: '#5a8a8c',
      texto: '#ffffff',
      disco: '#f6ad55',
      redUp: '#28a745',
      redDown: '#5a8a8c',
      cpu: '#5a8a8c',
      memoria: '#28a745',
      iconos: '#5a8a8c'
    }
  },



  'Arctic Frost': {
    name: 'Arctic Frost',
    colors: {
      // Sidebar
      sidebarBackground: '#e8f4fd',
      sidebarBorder: '#b3d9ff',
      sidebarText: '#1a365d',
      sidebarHover: '#d1ecf1',
      sidebarSelected: '#b3d9ff',
      sidebarGutter: '#b3d9ff',
      
      // Menu Bar (top)
      menuBarBackground: '#ffffff',
      menuBarText: '#1a365d',
      menuBarBorder: '#b3d9ff',
      menuBarHover: '#d1ecf1',
      
      // Status Bar (bottom)
      statusBarBackground: '#b3d9ff',
      statusBarText: '#1a365d',
      statusBarBorder: '#87ceeb',
      
      // Tabs
      tabBackground: '#e8f4fd',
      tabActiveBackground: '#b3d9ff',
      tabHoverBackground: '#d1ecf1',
      tabText: '#1a365d',
      tabActiveText: '#1a365d',
      tabBorder: '#b3d9ff',
      tabCloseHover: '#ff6b6b',
      
      // Tab Groups
      tabGroupBackground: '#d1ecf1',
      tabGroupText: '#1a365d',
      tabGroupBorder: '#b3d9ff',
      
      // Content Area
      contentBackground: '#ffffff',
      contentBorder: '#b3d9ff',
      
      // Dialogs
      dialogBackground: '#e8f4fd',
      dialogText: '#1a365d',
      dialogBorder: '#b3d9ff',
      dialogShadow: '0 4px 20px rgba(179, 217, 255, 0.3)',
      
      // Buttons
      buttonPrimary: '#4a90e2',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#87ceeb',
      buttonSecondaryText: '#1a365d',
      buttonHover: '#357abd',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#ffffff',
      linuxTerminalBackground: '#e8f4fd',
      
      // Context Menus
      contextMenuBackground: '#e8f4fd',
      contextMenuText: '#1a365d',
      contextMenuHover: '#d1ecf1',
      contextMenuBorder: '#b3d9ff',
      contextMenuShadow: '0 4px 20px rgba(179, 217, 255, 0.3)',
      '--ui-titlebar-accent': '#4a90e2',
      '--ui-titlebar-text': '#1a365d'
    },
    statusBarPalette: {
      fondo: '#b3d9ff',
      texto: '#1a365d',
      disco: '#ffaa00',
      redUp: '#00ff88',
      redDown: '#4a90e2',
      cpu: '#4a90e2',
      memoria: '#00ff88',
      iconos: '#4a90e2'
    }
  },

  'Purple Haze': {
    name: 'Purple Haze',
    colors: {
      // Sidebar
      sidebarBackground: '#2d1b69',
      sidebarBorder: '#8b5cf6',
      sidebarText: '#e0e7ff',
      sidebarHover: '#4c1d95',
      sidebarSelected: '#8b5cf6',
      sidebarGutter: '#8b5cf6',
      
      // Menu Bar (top)
      menuBarBackground: '#1e1b4b',
      menuBarText: '#e0e7ff',
      menuBarBorder: '#8b5cf6',
      menuBarHover: '#4c1d95',
      
      // Status Bar (bottom)
      statusBarBackground: '#8b5cf6',
      statusBarText: '#ffffff',
      statusBarBorder: '#6d28d9',
      
      // Tabs
      tabBackground: '#2d1b69',
      tabActiveBackground: '#8b5cf6',
      tabHoverBackground: '#4c1d95',
      tabText: '#e0e7ff',
      tabActiveText: '#ffffff',
      tabBorder: '#8b5cf6',
      tabCloseHover: '#ef4444',
      
      // Tab Groups
      tabGroupBackground: '#4c1d95',
      tabGroupText: '#e0e7ff',
      tabGroupBorder: '#8b5cf6',
      
      // Content Area
      contentBackground: '#1e1b4b',
      contentBorder: '#8b5cf6',
      
      // Dialogs
      dialogBackground: '#2d1b69',
      dialogText: '#e0e7ff',
      dialogBorder: '#8b5cf6',
      dialogShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
      
      // Buttons
      buttonPrimary: '#8b5cf6',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#6d28d9',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#7c3aed',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#1e1b4b',
      linuxTerminalBackground: '#2d1b69',
      
      // Context Menus
      contextMenuBackground: '#2d1b69',
      contextMenuText: '#e0e7ff',
      contextMenuHover: '#4c1d95',
      contextMenuBorder: '#8b5cf6',
      contextMenuShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
      '--ui-titlebar-accent': '#8b5cf6',
      '--ui-titlebar-text': '#e0e7ff'
    },
    statusBarPalette: {
      fondo: '#8b5cf6',
      texto: '#ffffff',
      disco: '#ffaa00',
      redUp: '#00ff88',
      redDown: '#8b5cf6',
      cpu: '#8b5cf6',
      memoria: '#00ff88',
      iconos: '#8b5cf6'
    }
  },

  'Soft Lavender': {
    name: 'Soft Lavender',
    colors: {
      // Sidebar
      sidebarBackground: '#f8f6ff',
      sidebarBorder: '#e6e0f7',
      sidebarText: '#5a4a6a',
      sidebarHover: '#f0ecff',
      sidebarSelected: '#e6e0f7',
      sidebarGutter: '#e6e0f7',
      
      // Menu Bar (top)
      menuBarBackground: '#f0ecff',
      menuBarText: '#5a4a6a',
      menuBarBorder: '#e6e0f7',
      menuBarHover: '#f8f6ff',
      
      // Status Bar (bottom)
      statusBarBackground: '#e6e0f7',
      statusBarText: '#5a4a6a',
      statusBarBorder: '#d4c7e8',
      
      // Tabs
      tabBackground: '#f8f6ff',
      tabActiveBackground: '#e6e0f7',
      tabHoverBackground: '#f0ecff',
      tabText: '#5a4a6a',
      tabActiveText: '#5a4a6a',
      tabBorder: '#e6e0f7',
      tabCloseHover: '#d4a5a5',
      
      // Tab Groups
      tabGroupBackground: '#f0ecff',
      tabGroupText: '#5a4a6a',
      tabGroupBorder: '#e6e0f7',
      
      // Content Area
      contentBackground: '#ffffff',
      contentBorder: '#e6e0f7',
      
      // Dialogs
      dialogBackground: '#f8f6ff',
      dialogText: '#3a2a4a',
      dialogBorder: '#e6e0f7',
      dialogShadow: '0 4px 20px rgba(230, 224, 247, 0.3)',
      
      // Buttons
      buttonPrimary: '#9c88b8',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#d4c7e8',
      buttonSecondaryText: '#5a4a6a',
      buttonHover: '#8a7ba5',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#ffffff',
      linuxTerminalBackground: '#f8f6ff',
      
      // Context Menus
      contextMenuBackground: '#f8f6ff',
      contextMenuText: '#5a4a6a',
      contextMenuHover: '#f0ecff',
      contextMenuBorder: '#e6e0f7',
      contextMenuShadow: '0 4px 20px rgba(230, 224, 247, 0.3)',
      '--ui-titlebar-accent': '#9c88b8',
      '--ui-titlebar-text': '#5a4a6a'
    },
    statusBarPalette: {
      fondo: '#e6e0f7',
      texto: '#5a4a6a',
      disco: '#ffaa00',
      redUp: '#00ff88',
      redDown: '#9c88b8',
      cpu: '#9c88b8',
      memoria: '#00ff88',
      iconos: '#9c88b8'
    }
  },

  'Warm Beige': {
    name: 'Warm Beige',
    colors: {
      // Sidebar
      sidebarBackground: '#f7f5f3',
      sidebarBorder: '#e8e2dc',
      sidebarText: '#6b5b47',
      sidebarHover: '#f0ebe5',
      sidebarSelected: '#e8e2dc',
      sidebarGutter: '#e8e2dc',
      
      // Menu Bar (top)
      menuBarBackground: '#f0ebe5',
      menuBarText: '#6b5b47',
      menuBarBorder: '#e8e2dc',
      menuBarHover: '#f7f5f3',
      
      // Status Bar (bottom)
      statusBarBackground: '#e8e2dc',
      statusBarText: '#6b5b47',
      statusBarBorder: '#ddd4cc',
      
      // Tabs
      tabBackground: '#f7f5f3',
      tabActiveBackground: '#e8e2dc',
      tabHoverBackground: '#f0ebe5',
      tabText: '#6b5b47',
      tabActiveText: '#6b5b47',
      tabBorder: '#e8e2dc',
      tabCloseHover: '#c4a484',
      
      // Tab Groups
      tabGroupBackground: '#f0ebe5',
      tabGroupText: '#6b5b47',
      tabGroupBorder: '#e8e2dc',
      
      // Content Area
      contentBackground: '#ffffff',
      contentBorder: '#e8e2dc',
      
      // Dialogs
      dialogBackground: '#f7f5f3',
      dialogText: '#4a3a27',
      dialogBorder: '#e8e2dc',
      dialogShadow: '0 4px 20px rgba(232, 226, 220, 0.3)',
      
      // Buttons
      buttonPrimary: '#b8a082',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#ddd4cc',
      buttonSecondaryText: '#6b5b47',
      buttonHover: '#a68f6f',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#ffffff',
      linuxTerminalBackground: '#f7f5f3',
      
      // Context Menus
      contextMenuBackground: '#f7f5f3',
      contextMenuText: '#6b5b47',
      contextMenuHover: '#f0ebe5',
      contextMenuBorder: '#e8e2dc',
      contextMenuShadow: '0 4px 20px rgba(232, 226, 220, 0.3)',
      '--ui-titlebar-accent': '#b8a082',
      '--ui-titlebar-text': '#6b5b47'
    },
    statusBarPalette: {
      fondo: '#e8e2dc',
      texto: '#6b5b47',
      disco: '#ffaa00',
      redUp: '#00ff88',
      redDown: '#b8a082',
      cpu: '#b8a082',
      memoria: '#00ff88',
      iconos: '#b8a082'
    }
  },

  'Muted Sage': {
    name: 'Muted Sage',
    colors: {
      // Sidebar
      sidebarBackground: '#f2f5f0',
      sidebarBorder: '#dde5d8',
      sidebarText: '#5a6b4a',
      sidebarHover: '#e8f0e3',
      sidebarSelected: '#dde5d8',
      sidebarGutter: '#dde5d8',
      
      // Menu Bar (top)
      menuBarBackground: '#e8f0e3',
      menuBarText: '#5a6b4a',
      menuBarBorder: '#dde5d8',
      menuBarHover: '#f2f5f0',
      
      // Status Bar (bottom)
      statusBarBackground: '#dde5d8',
      statusBarText: '#5a6b4a',
      statusBarBorder: '#d1dcc7',
      
      // Tabs
      tabBackground: '#f2f5f0',
      tabActiveBackground: '#dde5d8',
      tabHoverBackground: '#e8f0e3',
      tabText: '#5a6b4a',
      tabActiveText: '#5a6b4a',
      tabBorder: '#dde5d8',
      tabCloseHover: '#a8b896',
      
      // Tab Groups
      tabGroupBackground: '#e8f0e3',
      tabGroupText: '#5a6b4a',
      tabGroupBorder: '#dde5d8',
      
      // Content Area
      contentBackground: '#ffffff',
      contentBorder: '#dde5d8',
      
      // Dialogs
      dialogBackground: '#f2f5f0',
      dialogText: '#3a4a2a',
      dialogBorder: '#dde5d8',
      dialogShadow: '0 4px 20px rgba(221, 229, 216, 0.3)',
      
      // Buttons
      buttonPrimary: '#8fa67f',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#d1dcc7',
      buttonSecondaryText: '#5a6b4a',
      buttonHover: '#7d8f6c',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#ffffff',
      linuxTerminalBackground: '#f2f5f0',
      
      // Context Menus
      contextMenuBackground: '#f2f5f0',
      contextMenuText: '#5a6b4a',
      contextMenuHover: '#e8f0e3',
      contextMenuBorder: '#dde5d8',
      contextMenuShadow: '0 4px 20px rgba(221, 229, 216, 0.3)',
      '--ui-titlebar-accent': '#8fa67f',
      '--ui-titlebar-text': '#5a6b4a'
    },
    statusBarPalette: {
      fondo: '#dde5d8',
      texto: '#5a6b4a',
      disco: '#ffaa00',
      redUp: '#00ff88',
      redDown: '#8fa67f',
      cpu: '#8fa67f',
      memoria: '#00ff88',
      iconos: '#8fa67f'
    }
  },

  'Dusty Rose': {
    name: 'Dusty Rose',
    colors: {
      // Sidebar
      sidebarBackground: '#faf7f7',
      sidebarBorder: '#f0e6e6',
      sidebarText: '#6b4a4a',
      sidebarHover: '#f5ecec',
      sidebarSelected: '#f0e6e6',
      sidebarGutter: '#f0e6e6',
      
      // Menu Bar (top)
      menuBarBackground: '#f5ecec',
      menuBarText: '#6b4a4a',
      menuBarBorder: '#f0e6e6',
      menuBarHover: '#faf7f7',
      
      // Status Bar (bottom)
      statusBarBackground: '#f0e6e6',
      statusBarText: '#6b4a4a',
      statusBarBorder: '#e6d6d6',
      
      // Tabs
      tabBackground: '#faf7f7',
      tabActiveBackground: '#f0e6e6',
      tabHoverBackground: '#f5ecec',
      tabText: '#6b4a4a',
      tabActiveText: '#6b4a4a',
      tabBorder: '#f0e6e6',
      tabCloseHover: '#c4a4a4',
      
      // Tab Groups
      tabGroupBackground: '#f5ecec',
      tabGroupText: '#6b4a4a',
      tabGroupBorder: '#f0e6e6',
      
      // Content Area
      contentBackground: '#ffffff',
      contentBorder: '#f0e6e6',
      
      // Dialogs
      dialogBackground: '#faf7f7',
      dialogText: '#4a2a2a',
      dialogBorder: '#f0e6e6',
      dialogShadow: '0 4px 20px rgba(240, 230, 230, 0.3)',
      
      // Buttons
      buttonPrimary: '#b8a0a0',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#e6d6d6',
      buttonSecondaryText: '#6b4a4a',
      buttonHover: '#a68f8f',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#ffffff',
      linuxTerminalBackground: '#faf7f7',
      
      // Context Menus
      contextMenuBackground: '#faf7f7',
      contextMenuText: '#6b4a4a',
      contextMenuHover: '#f5ecec',
      contextMenuBorder: '#f0e6e6',
      contextMenuShadow: '0 4px 20px rgba(240, 230, 230, 0.3)',
      '--ui-titlebar-accent': '#b8a0a0',
      '--ui-titlebar-text': '#6b4a4a'
    },
    statusBarPalette: {
      fondo: '#f0e6e6',
      texto: '#6b4a4a',
      disco: '#ffaa00',
      redUp: '#00ff88',
      redDown: '#b8a0a0',
      cpu: '#b8a0a0',
      memoria: '#00ff88',
      iconos: '#b8a0a0'
    }
  },

  'Soft Mint': {
    name: 'Soft Mint',
    colors: {
      // Sidebar
      sidebarBackground: '#f0f8f5',
      sidebarBorder: '#ddeee6',
      sidebarText: '#4a6b5a',
      sidebarHover: '#e8f3ed',
      sidebarSelected: '#ddeee6',
      sidebarGutter: '#ddeee6',
      
      // Menu Bar (top)
      menuBarBackground: '#e8f3ed',
      menuBarText: '#4a6b5a',
      menuBarBorder: '#ddeee6',
      menuBarHover: '#f0f8f5',
      
      // Status Bar (bottom)
      statusBarBackground: '#ddeee6',
      statusBarText: '#4a6b5a',
      statusBarBorder: '#d1e6d8',
      
      // Tabs
      tabBackground: '#f0f8f5',
      tabActiveBackground: '#ddeee6',
      tabHoverBackground: '#e8f3ed',
      tabText: '#4a6b5a',
      tabActiveText: '#4a6b5a',
      tabBorder: '#ddeee6',
      tabCloseHover: '#a8c4a8',
      
      // Tab Groups
      tabGroupBackground: '#e8f3ed',
      tabGroupText: '#4a6b5a',
      tabGroupBorder: '#ddeee6',
      
      // Content Area
      contentBackground: '#ffffff',
      contentBorder: '#ddeee6',
      
      // Dialogs
      dialogBackground: '#f0f8f5',
      dialogText: '#2a4a3a',
      dialogBorder: '#ddeee6',
      dialogShadow: '0 4px 20px rgba(221, 238, 230, 0.3)',
      
      // Buttons
      buttonPrimary: '#8fb8a0',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#d1e6d8',
      buttonSecondaryText: '#4a6b5a',
      buttonHover: '#7da68f',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#ffffff',
      linuxTerminalBackground: '#f0f8f5',
      
      // Context Menus
      contextMenuBackground: '#f0f8f5',
      contextMenuText: '#4a6b5a',
      contextMenuHover: '#e8f3ed',
      contextMenuBorder: '#ddeee6',
      contextMenuShadow: '0 4px 20px rgba(221, 238, 230, 0.3)',
      '--ui-titlebar-accent': '#8fb8a0',
      '--ui-titlebar-text': '#4a6b5a'
    },
    statusBarPalette: {
      fondo: '#ddeee6',
      texto: '#4a6b5a',
      disco: '#ffaa00',
      redUp: '#00ff88',
      redDown: '#8fb8a0',
      cpu: '#8fb8a0',
      memoria: '#00ff88',
      iconos: '#8fb8a0'
    }
  },

  'Warm Gray': {
    name: 'Warm Gray',
    colors: {
      // Sidebar
      sidebarBackground: '#f5f4f2',
      sidebarBorder: '#e8e6e3',
      sidebarText: '#5a5752',
      sidebarHover: '#f0ede8',
      sidebarSelected: '#e8e6e3',
      sidebarGutter: '#e8e6e3',
      
      // Menu Bar (top)
      menuBarBackground: '#f0ede8',
      menuBarText: '#5a5752',
      menuBarBorder: '#e8e6e3',
      menuBarHover: '#f5f4f2',
      
      // Status Bar (bottom)
      statusBarBackground: '#e8e6e3',
      statusBarText: '#5a5752',
      statusBarBorder: '#ddd9d4',
      
      // Tabs
      tabBackground: '#f5f4f2',
      tabActiveBackground: '#e8e6e3',
      tabHoverBackground: '#f0ede8',
      tabText: '#5a5752',
      tabActiveText: '#5a5752',
      tabBorder: '#e8e6e3',
      tabCloseHover: '#b8b4a8',
      
      // Tab Groups
      tabGroupBackground: '#f0ede8',
      tabGroupText: '#5a5752',
      tabGroupBorder: '#e8e6e3',
      
      // Content Area
      contentBackground: '#ffffff',
      contentBorder: '#e8e6e3',
      
      // Dialogs
      dialogBackground: '#f5f4f2',
      dialogText: '#3a3732',
      dialogBorder: '#e8e6e3',
      dialogShadow: '0 4px 20px rgba(232, 230, 227, 0.3)',
      
      // Buttons
      buttonPrimary: '#a8a49c',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#ddd9d4',
      buttonSecondaryText: '#5a5752',
      buttonHover: '#96928a',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#ffffff',
      linuxTerminalBackground: '#f5f4f2',
      
      // Context Menus
      contextMenuBackground: '#f5f4f2',
      contextMenuText: '#5a5752',
      contextMenuHover: '#f0ede8',
      contextMenuBorder: '#e8e6e3',
      contextMenuShadow: '0 4px 20px rgba(232, 230, 227, 0.3)',
      '--ui-titlebar-accent': '#a8a49c',
      '--ui-titlebar-text': '#5a5752'
    },
    statusBarPalette: {
      fondo: '#e8e6e3',
      texto: '#5a5752',
      disco: '#ffaa00',
      redUp: '#00ff88',
      redDown: '#a8a49c',
      cpu: '#a8a49c',
      memoria: '#00ff88',
      iconos: '#a8a49c'
    }
  },

  'Pro Cyberpunk': {
    name: 'Pro Cyberpunk',
    colors: {
      sidebarBackground: '#050505',
      sidebarBorder: '#fcee21',
      sidebarText: '#fcee21',
      sidebarHover: '#151515',
      sidebarSelected: '#252525',
      sidebarGutter: '#fcee21',
      menuBarBackground: '#000000',
      menuBarText: '#fcee21',
      menuBarBorder: '#fcee21',
      menuBarHover: '#151515',
      statusBarBackground: '#fcee21',
      statusBarText: '#000000',
      statusBarBorder: '#fcee21',
      tabBackground: '#050505',
      tabActiveBackground: '#fcee21',
      tabHoverBackground: '#151515',
      tabText: '#fcee21',
      tabActiveText: '#000000',
      tabBorder: '#fcee21',
      tabCloseHover: '#ff0080',
      tabGroupBackground: '#151515',
      tabGroupText: '#fcee21',
      tabGroupBorder: '#fcee21',
      contentBackground: '#000000',
      contentBorder: '#fcee21',
      dialogBackground: '#050505',
      dialogText: '#fcee21',
      dialogBorder: '#fcee21',
      dialogShadow: 'rgba(252, 238, 33, 0.4)',
      buttonPrimary: '#fcee21',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#ff0080',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#ff0080',
      powershellTerminalBackground: '#000000',
      linuxTerminalBackground: '#050505',
      contextMenuBackground: '#050505',
      contextMenuText: '#fcee21',
      contextMenuHover: '#151515',
      contextMenuBorder: '#fcee21',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      '--ui-titlebar-accent': '#fcee21',
      '--ui-titlebar-text': '#000000'
    },
    statusBarPalette: {
      fondo: '#fcee21',
      texto: '#000000',
      disco: '#ff0080',
      redUp: '#00ff00',
      redDown: '#000000',
      cpu: '#000000',
      memoria: '#00ff00',
      iconos: '#000000'
    }
  },

  'Pro Aurora': {
    name: 'Pro Aurora',
    colors: {
      sidebarBackground: '#010b17',
      sidebarBorder: '#ff6b9d',
      sidebarText: '#ffb3d1',
      sidebarHover: '#0a172a',
      sidebarSelected: '#152b4a',
      sidebarGutter: '#ff6b9d',
      menuBarBackground: '#00050a',
      menuBarText: '#ff6b9d',
      menuBarBorder: '#ff6b9d',
      menuBarHover: '#0a172a',
      statusBarBackground: '#ff6b9d',
      statusBarText: '#010b17',
      statusBarBorder: '#ff6b9d',
      tabBackground: '#010b17',
      tabActiveBackground: '#ff6b9d',
      tabHoverBackground: '#0a172a',
      tabText: '#ffb3d1',
      tabActiveText: '#010b17',
      tabBorder: '#ff6b9d',
      tabCloseHover: '#00d4ff',
      tabGroupBackground: '#0a172a',
      tabGroupText: '#ffb3d1',
      tabGroupBorder: '#ff6b9d',
      contentBackground: '#00050a',
      contentBorder: '#ff6b9d',
      dialogBackground: '#010b17',
      dialogText: '#ffb3d1',
      dialogBorder: '#ff6b9d',
      dialogShadow: 'rgba(255, 107, 157, 0.4)',
      buttonPrimary: '#ff6b9d',
      buttonPrimaryText: '#010b17',
      buttonSecondary: '#00d4ff',
      buttonSecondaryText: '#010b17',
      buttonHover: '#00d4ff',
      powershellTerminalBackground: '#00050a',
      linuxTerminalBackground: '#010b17',
      contextMenuBackground: '#010b17',
      contextMenuText: '#ffb3d1',
      contextMenuHover: '#0a172a',
      contextMenuBorder: '#ff6b9d',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      '--ui-titlebar-accent': '#ff6b9d',
      '--ui-titlebar-text': '#010b17'
    },
    statusBarPalette: {
      fondo: '#ff6b9d',
      texto: '#010b17',
      disco: '#00d4ff',
      redUp: '#00ff88',
      redDown: '#010b17',
      cpu: '#010b17',
      memoria: '#00ff88',
      iconos: '#010b17'
    }
  },

  'Pro Cosmic': {
    name: 'Pro Cosmic',
    colors: {
      sidebarBackground: '#050a14',
      sidebarBorder: '#79b8ff',
      sidebarText: '#cfe6ff',
      sidebarHover: '#0e1628',
      sidebarSelected: '#1a2438',
      sidebarGutter: '#79b8ff',
      menuBarBackground: '#02050a',
      menuBarText: '#79b8ff',
      menuBarBorder: '#79b8ff',
      menuBarHover: '#0e1628',
      statusBarBackground: '#79b8ff',
      statusBarText: '#050a14',
      statusBarBorder: '#79b8ff',
      tabBackground: '#050a14',
      tabActiveBackground: '#79b8ff',
      tabHoverBackground: '#0e1628',
      tabText: '#cfe6ff',
      tabActiveText: '#050a14',
      tabBorder: '#79b8ff',
      tabCloseHover: '#8b5cf6',
      tabGroupBackground: '#0e1628',
      tabGroupText: '#cfe6ff',
      tabGroupBorder: '#79b8ff',
      contentBackground: '#02050a',
      contentBorder: '#79b8ff',
      dialogBackground: '#050a14',
      dialogText: '#cfe6ff',
      dialogBorder: '#79b8ff',
      dialogShadow: 'rgba(121, 184, 255, 0.4)',
      buttonPrimary: '#79b8ff',
      buttonPrimaryText: '#050a14',
      buttonSecondary: '#8b5cf6',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#a78bfa',
      powershellTerminalBackground: '#02050a',
      linuxTerminalBackground: '#050a14',
      contextMenuBackground: '#050a14',
      contextMenuText: '#cfe6ff',
      contextMenuHover: '#0e1628',
      contextMenuBorder: '#79b8ff',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      '--ui-titlebar-accent': '#79b8ff',
      '--ui-titlebar-text': '#050a14'
    },
    statusBarPalette: {
      fondo: '#79b8ff',
      texto: '#050a14',
      disco: '#8b5cf6',
      redUp: '#00ffcc',
      redDown: '#050a14',
      cpu: '#050a14',
      memoria: '#00ffcc',
      iconos: '#050a14'
    }
  },

  'Pro Emerald': {
    name: 'Pro Emerald',
    colors: {
      sidebarBackground: '#061006',
      sidebarBorder: '#00ff88',
      sidebarText: '#80ff00',
      sidebarHover: '#0c200c',
      sidebarSelected: '#123012',
      sidebarGutter: '#00ff88',
      menuBarBackground: '#030803',
      menuBarText: '#00ff88',
      menuBarBorder: '#00ff88',
      menuBarHover: '#0c200c',
      statusBarBackground: '#00ff88',
      statusBarText: '#061006',
      statusBarBorder: '#00ff88',
      tabBackground: '#061006',
      tabActiveBackground: '#00ff88',
      tabHoverBackground: '#0c200c',
      tabText: '#80ff00',
      tabActiveText: '#061006',
      tabBorder: '#00ff88',
      tabCloseHover: '#ccf2ff',
      tabGroupBackground: '#0c200c',
      tabGroupText: '#80ff00',
      tabGroupBorder: '#00ff88',
      contentBackground: '#030803',
      contentBorder: '#00ff88',
      dialogBackground: '#061006',
      dialogText: '#80ff00',
      dialogBorder: '#00ff88',
      dialogShadow: 'rgba(0, 255, 136, 0.4)',
      buttonPrimary: '#00ff88',
      buttonPrimaryText: '#061006',
      buttonSecondary: '#004d40',
      buttonSecondaryText: '#00ff88',
      buttonHover: '#80ff00',
      powershellTerminalBackground: '#030803',
      linuxTerminalBackground: '#061006',
      contextMenuBackground: '#061006',
      contextMenuText: '#80ff00',
      contextMenuHover: '#0c200c',
      contextMenuBorder: '#00ff88',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      '--ui-titlebar-accent': '#00ff88',
      '--ui-titlebar-text': '#061006'
    },
    statusBarPalette: {
      fondo: '#00ff88',
      texto: '#061006',
      disco: '#e6ff00',
      redUp: '#00ff88',
      redDown: '#061006',
      cpu: '#061006',
      memoria: '#00ff88',
      iconos: '#061006'
    }
  },

  'Pro Sakura': {
    name: 'Pro Sakura',
    colors: {
      sidebarBackground: '#1a0f12',
      sidebarBorder: '#ffb3d9',
      sidebarText: '#ffe6f2',
      sidebarHover: '#2a1a1f',
      sidebarSelected: '#3a252b',
      sidebarGutter: '#ffb3d9',
      menuBarBackground: '#100a0c',
      menuBarText: '#ffb3d9',
      menuBarBorder: '#ffb3d9',
      menuBarHover: '#2a1a1f',
      statusBarBackground: '#ffb3d9',
      statusBarText: '#1a0f12',
      statusBarBorder: '#ffb3d9',
      tabBackground: '#1a0f12',
      tabActiveBackground: '#ffb3d9',
      tabHoverBackground: '#2a1a1f',
      tabText: '#ffe6f2',
      tabActiveText: '#1a0f12',
      tabBorder: '#ffb3d9',
      tabCloseHover: '#ffffff',
      tabGroupBackground: '#2a1a1f',
      tabGroupText: '#ffe6f2',
      tabGroupBorder: '#ffb3d9',
      contentBackground: '#100a0c',
      contentBorder: '#ffb3d9',
      dialogBackground: '#1a0f12',
      dialogText: '#ffe6f2',
      dialogBorder: '#ffb3d9',
      dialogShadow: 'rgba(255, 179, 217, 0.4)',
      buttonPrimary: '#ffb3d9',
      buttonPrimaryText: '#1a0f12',
      buttonSecondary: '#3a252b',
      buttonSecondaryText: '#ffb3d9',
      buttonHover: '#ffffff',
      powershellTerminalBackground: '#100a0c',
      linuxTerminalBackground: '#1a0f12',
      contextMenuBackground: '#1a0f12',
      contextMenuText: '#ffe6f2',
      contextMenuHover: '#2a1a1f',
      contextMenuBorder: '#ffb3d9',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      '--ui-titlebar-accent': '#ffb3d9',
      '--ui-titlebar-text': '#1a0f12'
    },
    statusBarPalette: {
      fondo: '#ffb3d9',
      texto: '#1a0f12',
      disco: '#ffffff',
      redUp: '#ff80bf',
      redDown: '#1a0f12',
      cpu: '#1a0f12',
      memoria: '#ff80bf',
      iconos: '#1a0f12'
    }
  },

  'Pro Autumn': {
    name: 'Pro Autumn',
    colors: {
      sidebarBackground: '#140d0a',
      sidebarBorder: '#ff8c00',
      sidebarText: '#ffe0b2',
      sidebarHover: '#231812',
      sidebarSelected: '#32231a',
      sidebarGutter: '#ff8c00',
      menuBarBackground: '#0a0705',
      menuBarText: '#ff8c00',
      menuBarBorder: '#ff8c00',
      menuBarHover: '#231812',
      statusBarBackground: '#ff8c00',
      statusBarText: '#140d0a',
      statusBarBorder: '#ff8c00',
      tabBackground: '#140d0a',
      tabActiveBackground: '#ff8c00',
      tabHoverBackground: '#231812',
      tabText: '#ffe0b2',
      tabActiveText: '#140d0a',
      tabBorder: '#ff8c00',
      tabCloseHover: '#ffd700',
      tabGroupBackground: '#231812',
      tabGroupText: '#ffe0b2',
      tabGroupBorder: '#ff8c00',
      contentBackground: '#0a0705',
      contentBorder: '#ff8c00',
      dialogBackground: '#140d0a',
      dialogText: '#ffe0b2',
      dialogBorder: '#ff8c00',
      dialogShadow: 'rgba(255, 140, 0, 0.4)',
      buttonPrimary: '#ff8c00',
      buttonPrimaryText: '#140d0a',
      buttonSecondary: '#32231a',
      buttonSecondaryText: '#ff8c00',
      buttonHover: '#ffd700',
      powershellTerminalBackground: '#0a0705',
      linuxTerminalBackground: '#140d0a',
      contextMenuBackground: '#140d0a',
      contextMenuText: '#ffe0b2',
      contextMenuHover: '#231812',
      contextMenuBorder: '#ff8c00',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      '--ui-titlebar-accent': '#ff8c00',
      '--ui-titlebar-text': '#140d0a'
    },
    statusBarPalette: {
      fondo: '#ff8c00',
      texto: '#140d0a',
      disco: '#ffd700',
      redUp: '#ff4500',
      redDown: '#140d0a',
      cpu: '#140d0a',
      memoria: '#ff4500',
      iconos: '#140d0a'
    }
  },

  'Pro Cobalt': {
    name: 'Pro Cobalt',
    colors: {
      sidebarBackground: '#002240',
      sidebarBorder: '#193549',
      sidebarText: '#ffffff',
      sidebarHover: '#193549',
      sidebarSelected: '#0050a4',
      sidebarGutter: '#ffc600',
      menuBarBackground: '#001933',
      menuBarText: '#ffc600',
      menuBarBorder: '#193549',
      menuBarHover: '#193549',
      statusBarBackground: '#193549',
      statusBarText: '#ffffff',
      statusBarBorder: '#001933',
      tabBackground: '#002240',
      tabActiveBackground: '#193549',
      tabHoverBackground: '#0050a4',
      tabText: '#ffffff',
      tabActiveText: '#ffc600',
      tabBorder: '#193549',
      tabCloseHover: '#ffc600',
      tabGroupBackground: '#193549',
      tabGroupText: '#ffffff',
      tabGroupBorder: '#193549',
      contentBackground: '#002240',
      contentBorder: '#193549',
      dialogBackground: '#002240',
      dialogText: '#ffffff',
      dialogBorder: '#193549',
      dialogShadow: 'rgba(0, 0, 0, 0.5)',
      buttonPrimary: '#ffc600',
      buttonPrimaryText: '#002240',
      buttonSecondary: '#0088ff',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#0088ff',
      powershellTerminalBackground: '#001933',
      linuxTerminalBackground: '#002240',
      contextMenuBackground: '#002240',
      contextMenuText: '#ffffff',
      contextMenuHover: '#193549',
      contextMenuBorder: '#193549',
      '--ui-titlebar-accent': '#ffc600',
      '--ui-titlebar-text': '#002240'
    },
    statusBarPalette: {
      fondo: '#193549',
      texto: '#ffffff',
      disco: '#ffc600',
      redUp: '#00ff88',
      redDown: '#193549',
      cpu: '#193549',
      memoria: '#00ff88',
      iconos: '#193549'
    }
  },

  'Pro Moonlight': {
    name: 'Pro Moonlight',
    colors: {
      sidebarBackground: '#212333',
      sidebarBorder: '#444a73',
      sidebarText: '#a4a9cc',
      sidebarHover: '#2f334d',
      sidebarSelected: '#444a73',
      sidebarGutter: '#ff75b5',
      menuBarBackground: '#191a2a',
      menuBarText: '#a4a9cc',
      menuBarBorder: '#444a73',
      menuBarHover: '#2f334d',
      statusBarBackground: '#444a73',
      statusBarText: '#ffffff',
      statusBarBorder: '#2f334d',
      tabBackground: '#212333',
      tabActiveBackground: '#444a73',
      tabHoverBackground: '#2f334d',
      tabText: '#a4a9cc',
      tabActiveText: '#ffffff',
      tabBorder: '#444a73',
      tabCloseHover: '#ff75b5',
      tabGroupBackground: '#2f334d',
      tabGroupText: '#a4a9cc',
      tabGroupBorder: '#444a73',
      contentBackground: '#191a2a',
      contentBorder: '#444a73',
      dialogBackground: '#212333',
      dialogText: '#a4a9cc',
      dialogBorder: '#444a73',
      dialogShadow: 'rgba(0, 0, 0, 0.5)',
      buttonPrimary: '#ff75b5',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#b362ff',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#b362ff',
      powershellTerminalBackground: '#191a2a',
      linuxTerminalBackground: '#212333',
      contextMenuBackground: '#212333',
      contextMenuText: '#a4a9cc',
      contextMenuHover: '#2f334d',
      contextMenuBorder: '#444a73',
      '--ui-titlebar-accent': '#ff75b5',
      '--ui-titlebar-text': '#ffffff'
    },
    statusBarPalette: {
      fondo: '#444a73',
      texto: '#ffffff',
      disco: '#ff75b5',
      redUp: '#2cf2b5',
      redDown: '#444a73',
      cpu: '#444a73',
      memoria: '#2cf2b5',
      iconos: '#444a73'
    }
  },

  'Pro Oceanic': {
    name: 'Pro Oceanic',
    colors: {
      sidebarBackground: '#1b2b34',
      sidebarBorder: '#343d46',
      sidebarText: '#c0c5ce',
      sidebarHover: '#343d46',
      sidebarSelected: '#4f5b66',
      sidebarGutter: '#fac863',
      menuBarBackground: '#16232a',
      menuBarText: '#c0c5ce',
      menuBarBorder: '#343d46',
      menuBarHover: '#343d46',
      statusBarBackground: '#343d46',
      statusBarText: '#ffffff',
      statusBarBorder: '#16232a',
      tabBackground: '#1b2b34',
      tabActiveBackground: '#343d46',
      tabHoverBackground: '#4f5b66',
      tabText: '#c0c5ce',
      tabActiveText: '#ffffff',
      tabBorder: '#343d46',
      tabCloseHover: '#ec5f67',
      tabGroupBackground: '#343d46',
      tabGroupText: '#c0c5ce',
      tabGroupBorder: '#343d46',
      contentBackground: '#1b2b34',
      contentBorder: '#343d46',
      dialogBackground: '#1b2b34',
      dialogText: '#c0c5ce',
      dialogBorder: '#343d46',
      dialogShadow: 'rgba(0, 0, 0, 0.5)',
      buttonPrimary: '#fac863',
      buttonPrimaryText: '#1b2b34',
      buttonSecondary: '#6699cc',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#5fb3b3',
      powershellTerminalBackground: '#16232a',
      linuxTerminalBackground: '#1b2b34',
      contextMenuBackground: '#1b2b34',
      contextMenuText: '#c0c5ce',
      contextMenuHover: '#343d46',
      contextMenuBorder: '#343d46',
      '--ui-titlebar-accent': '#fac863',
      '--ui-titlebar-text': '#1b2b34'
    },
    statusBarPalette: {
      fondo: '#343d46',
      texto: '#ffffff',
      disco: '#fac863',
      redUp: '#99c794',
      redDown: '#343d46',
      cpu: '#343d46',
      memoria: '#99c794',
      iconos: '#343d46'
    }
  },

  'Pro Everforest': {
    name: 'Pro Everforest',
    colors: {
      sidebarBackground: '#2d353b',
      sidebarBorder: '#3d484d',
      sidebarText: '#d3c6aa',
      sidebarHover: '#3d484d',
      sidebarSelected: '#475258',
      sidebarGutter: '#a7c080',
      menuBarBackground: '#232a2e',
      menuBarText: '#d3c6aa',
      menuBarBorder: '#3d484d',
      menuBarHover: '#3d484d',
      statusBarBackground: '#3d484d',
      statusBarText: '#d3c6aa',
      statusBarBorder: '#232a2e',
      tabBackground: '#2d353b',
      tabActiveBackground: '#3d484d',
      tabHoverBackground: '#475258',
      tabText: '#d3c6aa',
      tabActiveText: '#a7c080',
      tabBorder: '#3d484d',
      tabCloseHover: '#e67e80',
      tabGroupBackground: '#3d484d',
      tabGroupText: '#d3c6aa',
      tabGroupBorder: '#3d484d',
      contentBackground: '#2d353b',
      contentBorder: '#3d484d',
      dialogBackground: '#2d353b',
      dialogText: '#d3c6aa',
      dialogBorder: '#3d484d',
      dialogShadow: 'rgba(0, 0, 0, 0.5)',
      buttonPrimary: '#a7c080',
      buttonPrimaryText: '#2d353b',
      buttonSecondary: '#83c092',
      buttonSecondaryText: '#2d353b',
      buttonHover: '#dbbc7f',
      powershellTerminalBackground: '#232a2e',
      linuxTerminalBackground: '#2d353b',
      contextMenuBackground: '#2d353b',
      contextMenuText: '#d3c6aa',
      contextMenuHover: '#475258',
      contextMenuBorder: '#3d484d',
      '--ui-titlebar-accent': '#a7c080',
      '--ui-titlebar-text': '#2d353b'
    },
    statusBarPalette: {
      fondo: '#3d484d',
      texto: '#d3c6aa',
      disco: '#dbbc7f',
      redUp: '#a7c080',
      redDown: '#3d484d',
      cpu: '#3d484d',
      memoria: '#a7c080',
      iconos: '#3d484d'
    }
  },

  'Pro Minty': {
    name: 'Pro Minty',
    colors: {
      sidebarBackground: '#1a202c',
      sidebarBorder: '#2d3748',
      sidebarText: '#a0aec0',
      sidebarHover: '#2d3748',
      sidebarSelected: '#4a5568',
      sidebarGutter: '#48bb78',
      menuBarBackground: '#171923',
      menuBarText: '#a0aec0',
      menuBarBorder: '#2d3748',
      menuBarHover: '#2d3748',
      statusBarBackground: '#48bb78',
      statusBarText: '#ffffff',
      statusBarBorder: '#2d3748',
      tabBackground: '#1a202c',
      tabActiveBackground: '#2d3748',
      tabHoverBackground: '#4a5568',
      tabText: '#a0aec0',
      tabActiveText: '#81e6d9',
      tabBorder: '#2d3748',
      tabCloseHover: '#f56565',
      tabGroupBackground: '#2d3748',
      tabGroupText: '#a0aec0',
      tabGroupBorder: '#2d3748',
      contentBackground: '#1a202c',
      contentBorder: '#2d3748',
      dialogBackground: '#1a202c',
      dialogText: '#a0aec0',
      dialogBorder: '#2d3748',
      dialogShadow: 'rgba(0, 0, 0, 0.5)',
      buttonPrimary: '#48bb78',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#81e6d9',
      buttonSecondaryText: '#1a202c',
      buttonHover: '#38a169',
      powershellTerminalBackground: '#171923',
      linuxTerminalBackground: '#1a202c',
      contextMenuBackground: '#1a202c',
      contextMenuText: '#a0aec0',
      contextMenuHover: '#2d3748',
      contextMenuBorder: '#2d3748',
      '--ui-titlebar-accent': '#48bb78',
      '--ui-titlebar-text': '#ffffff'
    },
    statusBarPalette: {
      fondo: '#48bb78',
      texto: '#ffffff',
      disco: '#81e6d9',
      redUp: '#38a169',
      redDown: '#48bb78',
      cpu: '#48bb78',
      memoria: '#38a169',
      iconos: '#48bb78'
    }
  },

  'Pro Mirage': {
    name: 'Pro Mirage',
    colors: {
      sidebarBackground: '#1f2430',
      sidebarBorder: '#232834',
      sidebarText: '#cbccc6',
      sidebarHover: '#232834',
      sidebarSelected: '#343f4c',
      sidebarGutter: '#ffcc66',
      menuBarBackground: '#191e2a',
      menuBarText: '#cbccc6',
      menuBarBorder: '#232834',
      menuBarHover: '#232834',
      statusBarBackground: '#ffcc66',
      statusBarText: '#1f2430',
      statusBarBorder: '#232834',
      tabBackground: '#1f2430',
      tabActiveBackground: '#343f4c',
      tabHoverBackground: '#232834',
      tabText: '#cbccc6',
      tabActiveText: '#ffffff',
      tabBorder: '#232834',
      tabCloseHover: '#f28779',
      tabGroupBackground: '#343f4c',
      tabGroupText: '#cbccc6',
      tabGroupBorder: '#232834',
      contentBackground: '#1f2430',
      contentBorder: '#232834',
      dialogBackground: '#1f2430',
      dialogText: '#cbccc6',
      dialogBorder: '#232834',
      dialogShadow: 'rgba(0, 0, 0, 0.5)',
      buttonPrimary: '#ffcc66',
      buttonPrimaryText: '#1f2430',
      buttonSecondary: '#ffa759',
      buttonSecondaryText: '#1f2430',
      buttonHover: '#ffa759',
      powershellTerminalBackground: '#191e2a',
      linuxTerminalBackground: '#1f2430',
      contextMenuBackground: '#1f2430',
      contextMenuText: '#cbccc6',
      contextMenuHover: '#343f4c',
      contextMenuBorder: '#232834',
      '--ui-titlebar-accent': '#ffcc66',
      '--ui-titlebar-text': '#1f2430'
    },
    statusBarPalette: {
      fondo: '#ffcc66',
      texto: '#1f2430',
      disco: '#ffa759',
      redUp: '#91b362',
      redDown: '#ffcc66',
      cpu: '#ffcc66',
      memoria: '#91b362',
      iconos: '#ffcc66'
    }
  },

  'Pro Solar Amber': {
    name: 'Pro Solar Amber',
    colors: {
      sidebarBackground: '#002b36',
      sidebarBorder: '#073642',
      sidebarText: '#839496',
      sidebarHover: '#073642',
      sidebarSelected: '#586e75',
      sidebarGutter: '#b58900',
      menuBarBackground: '#00212b',
      menuBarText: '#839496',
      menuBarBorder: '#073642',
      menuBarHover: '#073642',
      statusBarBackground: '#b58900',
      statusBarText: '#002b36',
      statusBarBorder: '#073642',
      tabBackground: '#002b36',
      tabActiveBackground: '#073642',
      tabHoverBackground: '#586e75',
      tabText: '#839496',
      tabActiveText: '#ffffff',
      tabBorder: '#073642',
      tabCloseHover: '#dc322f',
      tabGroupBackground: '#073642',
      tabGroupText: '#839496',
      tabGroupBorder: '#073642',
      contentBackground: '#002b36',
      contentBorder: '#073642',
      dialogBackground: '#002b36',
      dialogText: '#839496',
      dialogBorder: '#073642',
      dialogShadow: 'rgba(0, 0, 0, 0.5)',
      buttonPrimary: '#b58900',
      buttonPrimaryText: '#002b36',
      buttonSecondary: '#cb4b16',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#cb4b16',
      powershellTerminalBackground: '#00212b',
      linuxTerminalBackground: '#002b36',
      contextMenuBackground: '#002b36',
      contextMenuText: '#839496',
      contextMenuHover: '#073642',
      contextMenuBorder: '#073642',
      '--ui-titlebar-accent': '#b58900',
      '--ui-titlebar-text': '#002b36'
    },
    statusBarPalette: {
      fondo: '#b58900',
      texto: '#002b36',
      disco: '#cb4b16',
      redUp: '#859900',
      redDown: '#b58900',
      cpu: '#b58900',
      memoria: '#859900',
      iconos: '#b58900'
    }
  },

  'Pro Magma': {
    name: 'Pro Magma',
    colors: {
      sidebarBackground: '#110000',
      sidebarBorder: '#330000',
      sidebarText: '#ffccaa',
      sidebarHover: '#220000',
      sidebarSelected: '#440000',
      sidebarGutter: '#ff4500',
      menuBarBackground: '#000000',
      menuBarText: '#ff4500',
      menuBarBorder: '#330000',
      menuBarHover: '#220000',
      statusBarBackground: '#ff4500',
      statusBarText: '#110000',
      statusBarBorder: '#330000',
      tabBackground: '#110000',
      tabActiveBackground: '#440000',
      tabHoverBackground: '#220000',
      tabText: '#ffccaa',
      tabActiveText: '#ffffff',
      tabBorder: '#330000',
      tabCloseHover: '#8b0000',
      tabGroupBackground: '#220000',
      tabGroupText: '#ffccaa',
      tabGroupBorder: '#330000',
      contentBackground: '#000000',
      contentBorder: '#330000',
      dialogBackground: '#110000',
      dialogText: '#ffccaa',
      dialogBorder: '#330000',
      dialogShadow: 'rgba(255, 69, 0, 0.4)',
      buttonPrimary: '#ff4500',
      buttonPrimaryText: '#110000',
      buttonSecondary: '#8b0000',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#ff4500',
      powershellTerminalBackground: '#000000',
      linuxTerminalBackground: '#110000',
      contextMenuBackground: '#110000',
      contextMenuText: '#ffccaa',
      contextMenuHover: '#220000',
      contextMenuBorder: '#330000',
      '--ui-titlebar-accent': '#ff4500',
      '--ui-titlebar-text': '#110000'
    },
    statusBarPalette: {
      fondo: '#ff4500',
      texto: '#110000',
      disco: '#8b0000',
      redUp: '#ff8c00',
      redDown: '#ff4500',
      cpu: '#ff4500',
      memoria: '#ff8c00',
      iconos: '#ff4500'
    }
  },

  'Pro Catppuccin': {
    name: 'Pro Catppuccin',
    colors: {
      sidebarBackground: '#1e1e2e',
      sidebarBorder: '#313244',
      sidebarText: '#cdd6f4',
      sidebarHover: '#313244',
      sidebarSelected: '#45475a',
      sidebarGutter: '#cba6f7',
      menuBarBackground: '#181825',
      menuBarText: '#cdd6f4',
      menuBarBorder: '#313244',
      menuBarHover: '#313244',
      statusBarBackground: '#cba6f7',
      statusBarText: '#1e1e2e',
      statusBarBorder: '#313244',
      tabBackground: '#1e1e2e',
      tabActiveBackground: '#313244',
      tabHoverBackground: '#45475a',
      tabText: '#cdd6f4',
      tabActiveText: '#cba6f7',
      tabBorder: '#313244',
      tabCloseHover: '#f38ba8',
      tabGroupBackground: '#313244',
      tabGroupText: '#cdd6f4',
      tabGroupBorder: '#313244',
      contentBackground: '#1e1e2e',
      contentBorder: '#313244',
      dialogBackground: '#1e1e2e',
      dialogText: '#cdd6f4',
      dialogBorder: '#313244',
      dialogShadow: 'rgba(0, 0, 0, 0.5)',
      buttonPrimary: '#cba6f7',
      buttonPrimaryText: '#1e1e2e',
      buttonSecondary: '#89b4fa',
      buttonSecondaryText: '#1e1e2e',
      buttonHover: '#b4befe',
      powershellTerminalBackground: '#181825',
      linuxTerminalBackground: '#1e1e2e',
      contextMenuBackground: '#1e1e2e',
      contextMenuText: '#cdd6f4',
      contextMenuHover: '#313244',
      contextMenuBorder: '#313244',
      '--ui-titlebar-accent': '#cba6f7',
      '--ui-titlebar-text': '#1e1e2e'
    },
    statusBarPalette: {
      fondo: '#cba6f7',
      texto: '#1e1e2e',
      disco: '#f5e0dc',
      redUp: '#a6e3a1',
      redDown: '#cba6f7',
      cpu: '#cba6f7',
      memoria: '#a6e3a1',
      iconos: '#cba6f7'
    }
  },

  'Pro Rosé Pine': {
    name: 'Pro Rosé Pine',
    colors: {
      sidebarBackground: '#191724',
      sidebarBorder: '#26233a',
      sidebarText: '#e0def4',
      sidebarHover: '#26233a',
      sidebarSelected: '#403d52',
      sidebarGutter: '#ebbcba',
      menuBarBackground: '#1f1d2e',
      menuBarText: '#e0def4',
      menuBarBorder: '#26233a',
      menuBarHover: '#26233a',
      statusBarBackground: '#ebbcba',
      statusBarText: '#111111',
      statusBarBorder: '#26233a',
      tabBackground: '#191724',
      tabActiveBackground: '#26233a',
      tabHoverBackground: '#403d52',
      tabText: '#e0def4',
      tabActiveText: '#ebbcba',
      tabBorder: '#26233a',
      tabCloseHover: '#eb6f92',
      tabGroupBackground: '#26233a',
      tabGroupText: '#e0def4',
      tabGroupBorder: '#26233a',
      contentBackground: '#191724',
      contentBorder: '#26233a',
      dialogBackground: '#191724',
      dialogText: '#e0def4',
      dialogBorder: '#26233a',
      dialogShadow: 'rgba(0, 0, 0, 0.5)',
      buttonPrimary: '#ebbcba',
      buttonPrimaryText: '#191724',
      buttonSecondary: '#31748f',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#9ccfd8',
      powershellTerminalBackground: '#1f1d2e',
      linuxTerminalBackground: '#191724',
      contextMenuBackground: '#191724',
      contextMenuText: '#e0def4',
      contextMenuHover: '#26233a',
      contextMenuBorder: '#26233a',
      '--ui-titlebar-accent': '#ebbcba',
      '--ui-titlebar-text': '#191724'
    },
    statusBarPalette: {
      fondo: '#ebbcba',
      texto: '#111111',
      disco: '#f6c177',
      redUp: '#9ccfd8',
      redDown: '#ebbcba',
      cpu: '#ebbcba',
      memoria: '#9ccfd8',
      iconos: '#ebbcba'
    }
  }
};

export { MODERN_UI_KEYS };
