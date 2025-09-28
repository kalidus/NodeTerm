// Categorías de temas de interfaz
const CLASSIC_UI_KEYS = [
  'Light', 'Dark', 'Solarized Light', 'Solarized Dark', 'Dracula', 'Nord', 
  'Tokyo Night', 'Synthwave 84', 'Palenight', 'Ayu Dark', 'Zenburn', 
  'Tomorrow Night', 'Oceanic Next', 'Atom One Light', 'Breeze', 'Spacemacs', 
  'Night Owl', 'Silver', 'Minimal Gray', 'Paper', 'Soft Gray', 'Arctic', 
  'Neon Blue', 'Cyberpunk', 'Matrix', 'Hologram', 'Plasma'
];

const FUTURISTIC_UI_KEYS = [
  'Scanline Blue UI', 'Tron Blue UI', 'Ion Storm UI', 'Terminal Static UI', 
  'Terminal Blue Static UI', 'Terminal Orange Static UI', 'Neon Aurora UI', 
  'Quantum Flux UI', 'Laser Wave UI', 'Prism Trail UI', 'Hyperdrive UI', 
  'Neon Orbit UI', 'Cyber Grid UI', 'Pulse Magenta UI', 'Neon Lime UI', 
  'Steam UI', 'Steam Blue UI', 'Steam Green UI', 'Futuristic UI', 'Hologram UI', 
  'Particle System UI', 'Sound Wave UI', 'DNA Helix UI', 'Matrix Green', 'Neon Cyber'
];

export const uiThemes = {
  // === SECCIÓN CLÁSICOS ===
  'Light': {
    name: 'Light',
    colors: {
      // Sidebar
      sidebarBackground: '#ffffff',
      sidebarBorder: '#e0e0e0',
      sidebarText: '#495057',
      sidebarHover: '#f6f9fa',
      sidebarSelected: '#e3f2fd',
      sidebarGutter: '#e0e0e0',
      
      // Menu Bar (top)
      menuBarBackground: '#ffffff',
      menuBarText: '#495057',
      menuBarBorder: '#e0e0e0',
      menuBarHover: '#f5f5f5',
      
      // Status Bar (bottom)
      statusBarBackground: '#f8f9fa',
      statusBarText: '#495057',
      statusBarBorder: '#e0e0e0',
      
      // Tabs
      tabBackground: '#ffffff',
      tabActiveBackground: '#e3f2fd',
      tabHoverBackground: '#f5f5f5',
      tabText: '#495057',
      tabActiveText: '#1976d2',
      tabBorder: '#e0e0e0',
      tabCloseHover: '#f44336',
      
      // Tab Groups
      tabGroupBackground: '#f5f5f5',
      tabGroupText: '#495057',
      tabGroupBorder: '#e0e0e0',
      
      // Content Area
      contentBackground: '#ffffff',
      contentBorder: '#e0e0e0',
      
      // Dialogs
      dialogBackground: '#ffffff',
      dialogText: '#495057',
      dialogBorder: '#e0e0e0',
      dialogShadow: 'rgba(0, 0, 0, 0.1)',
      
      // Buttons
      buttonPrimary: '#1976d2',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#6c757d',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#1565c0',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#ffffff',  // Blanco para PowerShell en tema claro
      linuxTerminalBackground: '#f5f5f5',       // Gris claro para Ubuntu/WSL en tema claro
      
      // Context Menus
      contextMenuBackground: '#ffffff',
      contextMenuText: '#495057',
      contextMenuHover: '#f5f5f5',
      contextMenuBorder: '#e0e0e0',
      contextMenuShadow: 'rgba(0, 0, 0, 0.15)',
      '--ui-titlebar-accent': '#1976d2',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#f8f9fa',
      texto: '#495057',
      disco: '#ffb300',
      redUp: '#00c853',
      redDown: '#1976d2',
      cpu: '#1976d2',
      memoria: '#00c853',
      iconos: '#1976d2'
    }
  },
  
  'Dark': {
    name: 'Dark',
    colors: {
      // Sidebar
      sidebarBackground: '#252526',
      sidebarBorder: '#3e3e42',
      sidebarText: '#cccccc',
      sidebarHover: '#2a2d2e',
      sidebarSelected: '#094771',
      sidebarGutter: '#323236',
      
      // Menu Bar (top)
      menuBarBackground: '#2d2d30',
      menuBarText: '#cccccc',
      menuBarBorder: '#3e3e42',
      menuBarHover: '#3e3e42',
      
      // Status Bar (bottom)
      statusBarBackground: '#007acc',
      statusBarText: '#ffffff',
      statusBarBorder: '#3e3e42',
      
      // Tabs
      tabBackground: '#2d2d30',
      tabActiveBackground: '#1e1e1e',
      tabHoverBackground: '#3e3e42',
      tabText: '#cccccc',
      tabActiveText: '#ffffff',
      tabBorder: '#3e3e42',
      tabCloseHover: '#f48771',
      
      // Tab Groups
      tabGroupBackground: '#383838',
      tabGroupText: '#cccccc',
      tabGroupBorder: '#3e3e42',
      
      // Content Area
      contentBackground: '#1e1e1e',
      contentBorder: '#3e3e42',
      
      // Dialogs
      dialogBackground: '#2d2d30',
      dialogText: '#cccccc',
      dialogBorder: '#3e3e42',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#0e639c',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#3c3c3c',
      buttonSecondaryText: '#cccccc',
      buttonHover: '#1177bb',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#1e1e1e',  // Gris oscuro para PowerShell
      linuxTerminalBackground: '#2d112b',       // Púrpura oscuro típico de Ubuntu
      
      // Context Menus
      contextMenuBackground: '#2d2d30',
      contextMenuText: '#cccccc',
      contextMenuHover: '#3e3e42',
      contextMenuBorder: '#3e3e42',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#073642',
      '--ui-titlebar-text': '#fff'
    },
    statusBarPalette: {
      fondo: '#007acc',
      texto: '#ffffff',
      disco: '#ffb300',
      redUp: '#00e676',
      redDown: '#2196f3',
      cpu: '#2196f3',
      memoria: '#00e676',
      iconos: '#2196f3'
    }
  },
  
  'Solarized Light': {
    name: 'Solarized Light',
    colors: {
      // Sidebar
      sidebarBackground: '#fdf6e3',
      sidebarBorder: '#eee8d5',
      sidebarText: '#657b83',
      sidebarHover: '#eee8d5',
      sidebarSelected: '#d3c0a1',
      sidebarGutter: '#eee8d5',
      
      // Menu Bar (top)
      menuBarBackground: '#eee8d5',
      menuBarText: '#657b83',
      menuBarBorder: '#d9d2c4',
      menuBarHover: '#e8dfc7',
      
      // Status Bar (bottom)
      statusBarBackground: '#93a1a1',
      statusBarText: '#fdf6e3',
      statusBarBorder: '#839496',
      
      // Tabs
      tabBackground: '#eee8d5',
      tabActiveBackground: '#fdf6e3',
      tabHoverBackground: '#e8dfc7',
      tabText: '#657b83',
      tabActiveText: '#268bd2',
      tabBorder: '#d9d2c4',
      tabCloseHover: '#dc322f',
      
      // Tab Groups
      tabGroupBackground: '#e8dfc7',
      tabGroupText: '#657b83',
      tabGroupBorder: '#d9d2c4',
      
      // Content Area
      contentBackground: '#fdf6e3',
      contentBorder: '#eee8d5',
      
      // Dialogs
      dialogBackground: '#fdf6e3',
      dialogText: '#657b83',
      dialogBorder: '#eee8d5',
      dialogShadow: 'rgba(0, 0, 0, 0.1)',
      
      // Buttons
      buttonPrimary: '#268bd2',
      buttonPrimaryText: '#fdf6e3',
      buttonSecondary: '#93a1a1',
      buttonSecondaryText: '#fdf6e3',
      buttonHover: '#2aa198',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#fdf6e3',  // Base3 de Solarized
      linuxTerminalBackground: '#eee8d5',       // Base2 de Solarized (más oscuro)
      
      // Context Menus
      contextMenuBackground: '#fdf6e3',
      contextMenuText: '#657b83',
      contextMenuHover: '#eee8d5',
      contextMenuBorder: '#d9d2c4',
      contextMenuShadow: 'rgba(0, 0, 0, 0.15)',
      '--ui-titlebar-accent': '#eee8d5',
      '--ui-titlebar-text': '#fff'
    },
    statusBarPalette: {
      fondo: '#93a1a1',
      texto: '#fdf6e3',
      disco: '#b58900',
      redUp: '#859900',
      redDown: '#268bd2',
      cpu: '#268bd2',
      memoria: '#859900',
      iconos: '#268bd2'
    }
  },
  
  'Solarized Dark': {
    name: 'Solarized Dark',
    colors: {
      // Sidebar
      sidebarBackground: '#002b36',
      sidebarBorder: '#073642',
      sidebarText: '#839496',
      sidebarHover: '#073642',
      sidebarSelected: '#268bd2',
      sidebarGutter: '#073642',
      
      // Menu Bar (top)
      menuBarBackground: '#073642',
      menuBarText: '#839496',
      menuBarBorder: '#586e75',
      menuBarHover: '#0f4757',
      
      // Status Bar (bottom)
      statusBarBackground: '#268bd2',
      statusBarText: '#002b36',
      statusBarBorder: '#073642',
      
      // Tabs
      tabBackground: '#073642',
      tabActiveBackground: '#002b36',
      tabHoverBackground: '#0f4757',
      tabText: '#839496',
      tabActiveText: '#2aa198',
      tabBorder: '#586e75',
      tabCloseHover: '#dc322f',
      
      // Tab Groups
      tabGroupBackground: '#0f4757',
      tabGroupText: '#839496',
      tabGroupBorder: '#586e75',
      
      // Content Area
      contentBackground: '#002b36',
      contentBorder: '#073642',
      
      // Dialogs
      dialogBackground: '#002b36',
      dialogText: '#839496',
      dialogBorder: '#073642',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#268bd2',
      buttonPrimaryText: '#002b36',
      buttonSecondary: '#586e75',
      buttonSecondaryText: '#839496',
      buttonHover: '#2aa198',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#002b36',  // Base03 de Solarized
      linuxTerminalBackground: '#073642',       // Base02 de Solarized (más claro)
      
      // Context Menus
      contextMenuBackground: '#002b36',
      contextMenuText: '#839496',
      contextMenuHover: '#073642',
      contextMenuBorder: '#586e75',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#bd93f9',
      '--ui-titlebar-text': '#fff'
    },
    statusBarPalette: {
      fondo: '#268bd2',
      texto: '#002b36',
      disco: '#b58900',
      redUp: '#859900',
      redDown: '#268bd2',
      cpu: '#268bd2',
      memoria: '#859900',
      iconos: '#268bd2'
    }
  },
  
  'Dracula': {
    name: 'Dracula',
    colors: {
      // Sidebar
      sidebarBackground: '#282a36',
      sidebarBorder: '#44475a',
      sidebarText: '#f8f8f2',
      sidebarHover: '#44475a',
      sidebarSelected: '#6272a4',
      sidebarGutter: '#44475a',
      
      // Menu Bar (top)
      menuBarBackground: '#44475a',
      menuBarText: '#f8f8f2',
      menuBarBorder: '#6272a4',
      menuBarHover: '#6272a4',
      
      // Status Bar (bottom)
      statusBarBackground: '#bd93f9',
      statusBarText: '#282a36',
      statusBarBorder: '#44475a',
      
      // Tabs
      tabBackground: '#44475a',
      tabActiveBackground: '#282a36',
      tabHoverBackground: '#6272a4',
      tabText: '#f8f8f2',
      tabActiveText: '#8be9fd',
      tabBorder: '#6272a4',
      tabCloseHover: '#ff5555',
      
      // Tab Groups
      tabGroupBackground: '#6272a4',
      tabGroupText: '#f8f8f2',
      tabGroupBorder: '#44475a',
      
      // Content Area
      contentBackground: '#282a36',
      contentBorder: '#44475a',
      
      // Dialogs
      dialogBackground: '#282a36',
      dialogText: '#f8f8f2',
      dialogBorder: '#44475a',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#8be9fd',
      buttonPrimaryText: '#282a36',
      buttonSecondary: '#6272a4',
      buttonSecondaryText: '#f8f8f2',
      buttonHover: '#50fa7b',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#282a36',  // Background principal de Dracula
      linuxTerminalBackground: '#44475a',       // Current line de Dracula
      
      // Context Menus
      contextMenuBackground: '#282a36',
      contextMenuText: '#f8f8f2',
      contextMenuHover: '#44475a',
      contextMenuBorder: '#6272a4',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#bd93f9',
      '--ui-titlebar-text': '#fff'
    },
    statusBarPalette: {
      fondo: '#282a36',
      texto: '#f8f8f2',
      disco: '#ffb86c',
      redUp: '#50fa7b',
      redDown: '#8be9fd',
      cpu: '#8be9fd',
      memoria: '#50fa7b',
      iconos: '#8be9fd'
    }
  },
  
  'Nord': {
    name: 'Nord',
    colors: {
      // Sidebar
      sidebarBackground: '#2e3440',
      sidebarBorder: '#3b4252',
      sidebarText: '#d8dee9',
      sidebarHover: '#3b4252',
      sidebarSelected: '#5e81ac',
      sidebarGutter: '#3b4252',
      
      // Menu Bar (top)
      menuBarBackground: '#3b4252',
      menuBarText: '#d8dee9',
      menuBarBorder: '#434c5e',
      menuBarHover: '#434c5e',
      
      // Status Bar (bottom)
      statusBarBackground: '#5e81ac',
      statusBarText: '#eceff4',
      statusBarBorder: '#3b4252',
      
      // Tabs
      tabBackground: '#3b4252',
      tabActiveBackground: '#2e3440',
      tabHoverBackground: '#434c5e',
      tabText: '#d8dee9',
      tabActiveText: '#88c0d0',
      tabBorder: '#434c5e',
      tabCloseHover: '#bf616a',
      
      // Tab Groups
      tabGroupBackground: '#434c5e',
      tabGroupText: '#d8dee9',
      tabGroupBorder: '#3b4252',
      
      // Content Area
      contentBackground: '#2e3440',
      contentBorder: '#3b4252',
      
      // Dialogs
      dialogBackground: '#2e3440',
      dialogText: '#d8dee9',
      dialogBorder: '#3b4252',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#5e81ac',
      buttonPrimaryText: '#eceff4',
      buttonSecondary: '#4c566a',
      buttonSecondaryText: '#d8dee9',
      buttonHover: '#81a1c1',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#2e3440',  // Polar Night 0
      linuxTerminalBackground: '#3b4252',       // Polar Night 1
      
      // Context Menus
      contextMenuBackground: '#2e3440',
      contextMenuText: '#d8dee9',
      contextMenuHover: '#3b4252',
      contextMenuBorder: '#434c5e',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#5e81ac',
      '--ui-titlebar-text': '#fff'
    },
    statusBarPalette: {
      fondo: '#2e3440',
      texto: '#eceff4',
      disco: '#ebcb8b',
      redUp: '#a3be8c',
      redDown: '#5e81ac',
      cpu: '#5e81ac',
      memoria: '#a3be8c',
      iconos: '#5e81ac'
    }
  },
  
  'Tokyo Night': {
    name: 'Tokyo Night',
    colors: {
      sidebarBackground: '#1a1b26',
      sidebarBorder: '#414868',
      sidebarText: '#c0caf5',
      sidebarHover: '#283457',
      sidebarSelected: '#7aa2f7',
      sidebarGutter: '#414868',
      
      menuBarBackground: '#283457',
      menuBarText: '#c0caf5',
      menuBarBorder: '#414868',
      menuBarHover: '#414868',
      
      statusBarBackground: '#7aa2f7',
      statusBarText: '#1a1b26',
      statusBarBorder: '#414868',
      
      tabBackground: '#283457',
      tabActiveBackground: '#1a1b26',
      tabHoverBackground: '#414868',
      tabText: '#c0caf5',
      tabActiveText: '#7dcfff',
      tabBorder: '#414868',
      tabCloseHover: '#f7768e',
      
      tabGroupBackground: '#414868',
      tabGroupText: '#c0caf5',
      tabGroupBorder: '#283457',
      
      contentBackground: '#1a1b26',
      contentBorder: '#414868',
      
      dialogBackground: '#1a1b26',
      dialogText: '#c0caf5',
      dialogBorder: '#414868',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#7aa2f7',
      buttonPrimaryText: '#1a1b26',
      buttonSecondary: '#414868',
      buttonSecondaryText: '#c0caf5',
      buttonHover: '#bb9af7',
      
      contextMenuBackground: '#1a1b26',
      contextMenuText: '#c0caf5',
      contextMenuHover: '#283457',
      contextMenuBorder: '#414868',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#7aa2f7',
      '--ui-titlebar-text': '#fff'
    },
    statusBarPalette: {
      fondo: '#1a1b26',
      texto: '#d6deeb',
      disco: '#ecc48d',
      redUp: '#addb67',
      redDown: '#82aaff',
      cpu: '#82aaff',
      memoria: '#addb67',
      iconos: '#82aaff'
    }
  },
  
  
  'Synthwave 84': {
    name: 'Synthwave 84',
    colors: {
      sidebarBackground: '#2a2139',
      sidebarBorder: '#6b5b95',
      sidebarText: '#f92aad',
      sidebarHover: '#495495',
      sidebarSelected: '#03edf9',
      sidebarGutter: '#6b5b95',
      
      menuBarBackground: '#495495',
      menuBarText: '#f92aad',
      menuBarBorder: '#6b5b95',
      menuBarHover: '#6b5b95',
      
      statusBarBackground: '#03edf9',
      statusBarText: '#2a2139',
      statusBarBorder: '#6b5b95',
      
      tabBackground: '#495495',
      tabActiveBackground: '#2a2139',
      tabHoverBackground: '#6b5b95',
      tabText: '#f92aad',
      tabActiveText: '#72f1b8',
      tabBorder: '#6b5b95',
      tabCloseHover: '#fe4450',
      
      tabGroupBackground: '#6b5b95',
      tabGroupText: '#f92aad',
      tabGroupBorder: '#495495',
      
      contentBackground: '#2a2139',
      contentBorder: '#6b5b95',
      
      dialogBackground: '#2a2139',
      dialogText: '#f92aad',
      dialogBorder: '#6b5b95',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#03edf9',
      buttonPrimaryText: '#2a2139',
      buttonSecondary: '#6b5b95',
      buttonSecondaryText: '#f92aad',
      buttonHover: '#72f1b8',
      
      contextMenuBackground: '#2a2139',
      contextMenuText: '#f92aad',
      contextMenuHover: '#495495',
      contextMenuBorder: '#6b5b95',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#03edf9',
      '--ui-titlebar-text': '#fff'
    },
    statusBarPalette: {
      fondo: '#2a2139',
      texto: '#f92aad',
      disco: '#ffb86c',
      redUp: '#72f1b8',
      redDown: '#03edf9',
      cpu: '#03edf9',
      memoria: '#72f1b8',
      iconos: '#03edf9'
    }
  },
  
  'Palenight': {
    name: 'Palenight',
    colors: {
      sidebarBackground: '#292d3e',
      sidebarBorder: '#676e95',
      sidebarText: '#a6accd',
      sidebarHover: '#717cb4',
      sidebarSelected: '#82aaff',
      sidebarGutter: '#676e95',
      
      menuBarBackground: '#717cb4',
      menuBarText: '#a6accd',
      menuBarBorder: '#676e95',
      menuBarHover: '#676e95',
      
      statusBarBackground: '#82aaff',
      statusBarText: '#292d3e',
      statusBarBorder: '#676e95',
      
      tabBackground: '#717cb4',
      tabActiveBackground: '#292d3e',
      tabHoverBackground: '#676e95',
      tabText: '#a6accd',
      tabActiveText: '#89ddff',
      tabBorder: '#676e95',
      tabCloseHover: '#f07178',
      
      tabGroupBackground: '#676e95',
      tabGroupText: '#a6accd',
      tabGroupBorder: '#717cb4',
      
      contentBackground: '#292d3e',
      contentBorder: '#676e95',
      
      dialogBackground: '#292d3e',
      dialogText: '#a6accd',
      dialogBorder: '#676e95',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#82aaff',
      buttonPrimaryText: '#292d3e',
      buttonSecondary: '#676e95',
      buttonSecondaryText: '#a6accd',
      buttonHover: '#c792ea',
      
      contextMenuBackground: '#292d3e',
      contextMenuText: '#a6accd',
      contextMenuHover: '#717cb4',
      contextMenuBorder: '#676e95',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#c792ea',
      '--ui-titlebar-text': '#fff'
    },
    statusBarPalette: {
      fondo: '#292d3e',
      texto: '#a6accd',
      disco: '#ebcb8b',
      redUp: '#89ddff',
      redDown: '#82aaff',
      cpu: '#82aaff',
      memoria: '#89ddff',
      iconos: '#82aaff'
    }
  },
  
  
  'Ayu Dark': {
    name: 'Ayu Dark',
    colors: {
      sidebarBackground: '#0f1419',
      sidebarBorder: '#323232',
      sidebarText: '#e6e1cf',
      sidebarHover: '#253340',
      sidebarSelected: '#59c2ff',
      sidebarGutter: '#323232',
      
      menuBarBackground: '#253340',
      menuBarText: '#e6e1cf',
      menuBarBorder: '#323232',
      menuBarHover: '#323232',
      
      statusBarBackground: '#59c2ff',
      statusBarText: '#0f1419',
      statusBarBorder: '#323232',
      
      tabBackground: '#253340',
      tabActiveBackground: '#0f1419',
      tabHoverBackground: '#323232',
      tabText: '#e6e1cf',
      tabActiveText: '#95e6cb',
      tabBorder: '#323232',
      tabCloseHover: '#f07178',
      
      tabGroupBackground: '#323232',
      tabGroupText: '#e6e1cf',
      tabGroupBorder: '#253340',
      
      contentBackground: '#0f1419',
      contentBorder: '#323232',
      
      dialogBackground: '#0f1419',
      dialogText: '#e6e1cf',
      dialogBorder: '#323232',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#59c2ff',
      buttonPrimaryText: '#0f1419',
      buttonSecondary: '#323232',
      buttonSecondaryText: '#e6e1cf',
      buttonHover: '#d2a6ff',
      
      contextMenuBackground: '#0f1419',
      contextMenuText: '#e6e1cf',
      contextMenuHover: '#253340',
      contextMenuBorder: '#323232',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#59c2ff',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0f1419',
      texto: '#e6e1cf',
      disco: '#ebcb8b',
      redUp: '#95e6cb',
      redDown: '#59c2ff',
      cpu: '#59c2ff',
      memoria: '#95e6cb',
      iconos: '#59c2ff'
    }
  },
  
  'Zenburn': {
    name: 'Zenburn',
    colors: {
      sidebarBackground: '#3f3f3f',
      sidebarBorder: '#709080',
      sidebarText: '#dcdccc',
      sidebarHover: '#2f2f2f',
      sidebarSelected: '#94bff3',
      sidebarGutter: '#709080',
      
      menuBarBackground: '#2f2f2f',
      menuBarText: '#dcdccc',
      menuBarBorder: '#709080',
      menuBarHover: '#709080',
      
      statusBarBackground: '#94bff3',
      statusBarText: '#3f3f3f',
      statusBarBorder: '#709080',
      
      tabBackground: '#2f2f2f',
      tabActiveBackground: '#3f3f3f',
      tabHoverBackground: '#709080',
      tabText: '#dcdccc',
      tabActiveText: '#93e0e3',
      tabBorder: '#709080',
      tabCloseHover: '#dca3a3',
      
      tabGroupBackground: '#709080',
      tabGroupText: '#dcdccc',
      tabGroupBorder: '#2f2f2f',
      
      contentBackground: '#3f3f3f',
      contentBorder: '#709080',
      
      dialogBackground: '#3f3f3f',
      dialogText: '#dcdccc',
      dialogBorder: '#709080',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#94bff3',
      buttonPrimaryText: '#3f3f3f',
      buttonSecondary: '#709080',
      buttonSecondaryText: '#dcdccc',
      buttonHover: '#c3bf9f',
      
      contextMenuBackground: '#3f3f3f',
      contextMenuText: '#dcdccc',
      contextMenuHover: '#2f2f2f',
      contextMenuBorder: '#709080',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#94bff3',
      '--ui-titlebar-text': '#fff'
    },
    statusBarPalette: {
      fondo: '#3f3f3f',
      texto: '#dcdccc',
      disco: '#fabd2f',
      redUp: '#93e0e3',
      redDown: '#709080',
      cpu: '#709080',
      memoria: '#93e0e3',
      iconos: '#709080'
    }
  },
  
  'Tomorrow Night': {
    name: 'Tomorrow Night',
    colors: {
      sidebarBackground: '#1d1f21',
      sidebarBorder: '#969896',
      sidebarText: '#c5c8c6',
      sidebarHover: '#373b41',
      sidebarSelected: '#81a2be',
      sidebarGutter: '#969896',
      
      menuBarBackground: '#373b41',
      menuBarText: '#c5c8c6',
      menuBarBorder: '#969896',
      menuBarHover: '#969896',
      
      statusBarBackground: '#81a2be',
      statusBarText: '#1d1f21',
      statusBarBorder: '#969896',
      
      tabBackground: '#373b41',
      tabActiveBackground: '#1d1f21',
      tabHoverBackground: '#969896',
      tabText: '#c5c8c6',
      tabActiveText: '#8abeb7',
      tabBorder: '#969896',
      tabCloseHover: '#cc6666',
      
      tabGroupBackground: '#969896',
      tabGroupText: '#c5c8c6',
      tabGroupBorder: '#373b41',
      
      contentBackground: '#1d1f21',
      contentBorder: '#969896',
      
      dialogBackground: '#1d1f21',
      dialogText: '#c5c8c6',
      dialogBorder: '#969896',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#81a2be',
      buttonPrimaryText: '#1d1f21',
      buttonSecondary: '#969896',
      buttonSecondaryText: '#c5c8c6',
      buttonHover: '#b294bb',
      
      contextMenuBackground: '#1d1f21',
      contextMenuText: '#c5c8c6',
      contextMenuHover: '#373b41',
      contextMenuBorder: '#969896',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#81a2be',
      '--ui-titlebar-text': '#fff'
    },
    statusBarPalette: {
      fondo: '#1d1f21',
      texto: '#c5c8c6',
      disco: '#ebcb8b',
      redUp: '#8abeb7',
      redDown: '#81a2be',
      cpu: '#81a2be',
      memoria: '#8abeb7',
      iconos: '#81a2be'
    }
  },
  
  'Oceanic Next': {
    name: 'Oceanic Next',
    colors: {
      sidebarBackground: '#1b2b34',
      sidebarBorder: '#65737e',
      sidebarText: '#d8dee9',
      sidebarHover: '#4f5b66',
      sidebarSelected: '#6699cc',
      sidebarGutter: '#65737e',
      
      menuBarBackground: '#4f5b66',
      menuBarText: '#d8dee9',
      menuBarBorder: '#65737e',
      menuBarHover: '#65737e',
      
      statusBarBackground: '#6699cc',
      statusBarText: '#1b2b34',
      statusBarBorder: '#65737e',
      
      tabBackground: '#4f5b66',
      tabActiveBackground: '#1b2b34',
      tabHoverBackground: '#65737e',
      tabText: '#d8dee9',
      tabActiveText: '#5fb3b3',
      tabBorder: '#65737e',
      tabCloseHover: '#ec5f67',
      
      tabGroupBackground: '#65737e',
      tabGroupText: '#d8dee9',
      tabGroupBorder: '#4f5b66',
      
      contentBackground: '#1b2b34',
      contentBorder: '#65737e',
      
      dialogBackground: '#1b2b34',
      dialogText: '#d8dee9',
      dialogBorder: '#65737e',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#6699cc',
      buttonPrimaryText: '#1b2b34',
      buttonSecondary: '#65737e',
      buttonSecondaryText: '#d8dee9',
      buttonHover: '#c594c5',
      
      contextMenuBackground: '#1b2b34',
      contextMenuText: '#d8dee9',
      contextMenuHover: '#4f5b66',
      contextMenuBorder: '#65737e',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#5fb3b3',
      '--ui-titlebar-text': '#fff'
    },
    statusBarPalette: {
      fondo: '#1b2b34',
      texto: '#d8dee9',
      disco: '#ebcb8b',
      redUp: '#5fb3b3',
      redDown: '#6699cc',
      cpu: '#6699cc',
      memoria: '#5fb3b3',
      iconos: '#6699cc'
    }
  },
  
  'Atom One Light': {
    name: 'Atom One Light',
    colors: {
      sidebarBackground: '#fafafa',
      sidebarBorder: '#4f525d',
      sidebarText: '#383a42',
      sidebarHover: '#e5e5e6',
      sidebarSelected: '#4078f2',
      sidebarGutter: '#4f525d',
      
      menuBarBackground: '#e5e5e6',
      menuBarText: '#383a42',
      menuBarBorder: '#4f525d',
      menuBarHover: '#4f525d',
      
      statusBarBackground: '#4078f2',
      statusBarText: '#fafafa',
      statusBarBorder: '#4f525d',
      
      tabBackground: '#e5e5e6',
      tabActiveBackground: '#fafafa',
      tabHoverBackground: '#4f525d',
      tabText: '#383a42',
      tabActiveText: '#0184bc',
      tabBorder: '#4f525d',
      tabCloseHover: '#e45649',
      
      tabGroupBackground: '#4f525d',
      tabGroupText: '#383a42',
      tabGroupBorder: '#e5e5e6',
      
      contentBackground: '#fafafa',
      contentBorder: '#4f525d',
      
      dialogBackground: '#fafafa',
      dialogText: '#383a42',
      dialogBorder: '#4f525d',
      dialogShadow: 'rgba(0, 0, 0, 0.1)',
      
      buttonPrimary: '#4078f2',
      buttonPrimaryText: '#fafafa',
      buttonSecondary: '#f1f1f1',
      buttonSecondaryText: '#383a42',
      buttonHover: '#a626a4',
      
      contextMenuBackground: '#fafafa',
      contextMenuText: '#383a42',
      contextMenuHover: '#e5e5e6',
      contextMenuBorder: '#4f525d',
      contextMenuShadow: 'rgba(0, 0, 0, 0.1)',
      '--ui-titlebar-accent': '#4078f2',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#fafafa',
      texto: '#383a42',
      disco: '#fabd2f',
      redUp: '#a626a4',
      redDown: '#4078f2',
      cpu: '#4078f2',
      memoria: '#a626a4',
      iconos: '#4078f2'
    }
  },
  
  'Breeze': {
    name: 'Breeze',
    colors: {
      sidebarBackground: '#232629',
      sidebarBorder: '#7f8c8d',
      sidebarText: '#fcfcfc',
      sidebarHover: '#414649',
      sidebarSelected: '#3daee9',
      sidebarGutter: '#7f8c8d',
      
      menuBarBackground: '#414649',
      menuBarText: '#fcfcfc',
      menuBarBorder: '#7f8c8d',
      menuBarHover: '#7f8c8d',
      
      statusBarBackground: '#3daee9',
      statusBarText: '#232629',
      statusBarBorder: '#7f8c8d',
      
      tabBackground: '#414649',
      tabActiveBackground: '#232629',
      tabHoverBackground: '#7f8c8d',
      tabText: '#fcfcfc',
      tabActiveText: '#16a085',
      tabBorder: '#7f8c8d',
      tabCloseHover: '#c0392b',
      
      tabGroupBackground: '#7f8c8d',
      tabGroupText: '#fcfcfc',
      tabGroupBorder: '#414649',
      
      contentBackground: '#232629',
      contentBorder: '#7f8c8d',
      
      dialogBackground: '#232629',
      dialogText: '#fcfcfc',
      dialogBorder: '#7f8c8d',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#3daee9',
      buttonPrimaryText: '#232629',
      buttonSecondary: '#7f8c8d',
      buttonSecondaryText: '#fcfcfc',
      buttonHover: '#1cdc9a',
      
      contextMenuBackground: '#232629',
      contextMenuText: '#fcfcfc',
      contextMenuHover: '#414649',
      contextMenuBorder: '#7f8c8d',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#3daee9',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#232629',
      texto: '#fcfcfc',
      disco: '#fabd2f',
      redUp: '#1cdc9a',
      redDown: '#3daee9',
      cpu: '#3daee9',
      memoria: '#1cdc9a',
      iconos: '#3daee9'
    }
  },
  
  'Spacemacs': {
    name: 'Spacemacs',
    colors: {
      sidebarBackground: '#292b2e',
      sidebarBorder: '#5d4d7a',
      sidebarText: '#b2b2b2',
      sidebarHover: '#444155',
      sidebarSelected: '#4f97d7',
      sidebarGutter: '#5d4d7a',
      
      menuBarBackground: '#444155',
      menuBarText: '#b2b2b2',
      menuBarBorder: '#5d4d7a',
      menuBarHover: '#5d4d7a',
      
      statusBarBackground: '#4f97d7',
      statusBarText: '#292b2e',
      statusBarBorder: '#5d4d7a',
      
      tabBackground: '#444155',
      tabActiveBackground: '#292b2e',
      tabHoverBackground: '#5d4d7a',
      tabText: '#b2b2b2',
      tabActiveText: '#2d9574',
      tabBorder: '#5d4d7a',
      tabCloseHover: '#f2241f',
      
      tabGroupBackground: '#5d4d7a',
      tabGroupText: '#b2b2b2',
      tabGroupBorder: '#444155',
      
      contentBackground: '#292b2e',
      contentBorder: '#5d4d7a',
      
      dialogBackground: '#292b2e',
      dialogText: '#b2b2b2',
      dialogBorder: '#5d4d7a',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#4f97d7',
      buttonPrimaryText: '#292b2e',
      buttonSecondary: '#5d4d7a',
      buttonSecondaryText: '#b2b2b2',
      buttonHover: '#a31db1',
      
      contextMenuBackground: '#292b2e',
      contextMenuText: '#b2b2b2',
      contextMenuHover: '#444155',
      contextMenuBorder: '#5d4d7a',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#a31db1',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#292b2e',
      texto: '#b2b2b2',
      disco: '#ebcb8b',
      redUp: '#2d9574',
      redDown: '#4f97d7',
      cpu: '#4f97d7',
      memoria: '#2d9574',
      iconos: '#4f97d7'
    }
  },
  'Night Owl': {
    name: 'Night Owl',
    colors: {
      sidebarBackground: '#011627',
      sidebarBorder: '#1d3b53',
      sidebarText: '#d6deeb',
      sidebarHover: '#1d3b53',
      sidebarSelected: '#82aaff',
      sidebarGutter: '#1d3b53',
      
      menuBarBackground: '#1d3b53',
      menuBarText: '#d6deeb',
      menuBarBorder: '#575656',
      menuBarHover: '#575656',
      
      statusBarBackground: '#82aaff',
      statusBarText: '#011627',
      statusBarBorder: '#1d3b53',
      
      tabBackground: '#1d3b53',
      tabActiveBackground: '#011627',
      tabHoverBackground: '#575656',
      tabText: '#d6deeb',
      tabActiveText: '#21c7a8',
      tabBorder: '#575656',
      tabCloseHover: '#ef5350',
      
      tabGroupBackground: '#575656',
      tabGroupText: '#d6deeb',
      tabGroupBorder: '#1d3b53',
      
      contentBackground: '#011627',
      contentBorder: '#1d3b53',
      
      dialogBackground: '#011627',
      dialogText: '#d6deeb',
      dialogBorder: '#1d3b53',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#82aaff',
      buttonPrimaryText: '#011627',
      buttonSecondary: '#1d3b53',
      buttonSecondaryText: '#d6deeb',
      buttonHover: '#21c7a8',
      
      contextMenuBackground: '#011627',
      contextMenuText: '#d6deeb',
      contextMenuHover: '#1d3b53',
      contextMenuBorder: '#575656',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#21c7a8',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#011627',
      texto: '#d6deeb',
      disco: '#ebcb8b',
      redUp: '#21c7a8',
      redDown: '#82aaff',
      cpu: '#82aaff',
      memoria: '#21c7a8',
      iconos: '#82aaff'
    }
  },
  'Silver': {
    name: 'Silver',
    colors: {
      sidebarBackground: '#f5f5f5',
      sidebarBorder: '#d0d0d0',
      sidebarText: '#404040',
      sidebarHover: '#e6e6e6',
      sidebarSelected: '#729fcf',
      sidebarGutter: '#d0d0d0',
      
      menuBarBackground: '#e6e6e6',
      menuBarText: '#404040',
      menuBarBorder: '#d0d0d0',
      menuBarHover: '#d0d0d0',
      
      statusBarBackground: '#729fcf',
      statusBarText: '#f5f5f5',
      statusBarBorder: '#d0d0d0',
      
      tabBackground: '#e6e6e6',
      tabActiveBackground: '#f5f5f5',
      tabHoverBackground: '#d0d0d0',
      tabText: '#404040',
      tabActiveText: '#3465a4',
      tabBorder: '#d0d0d0',
      tabCloseHover: '#cc0000',
      
      tabGroupBackground: '#d0d0d0',
      tabGroupText: '#404040',
      tabGroupBorder: '#e6e6e6',
      
      contentBackground: '#f5f5f5',
      contentBorder: '#d0d0d0',
      
      dialogBackground: '#f5f5f5',
      dialogText: '#404040',
      dialogBorder: '#d0d0d0',
      dialogShadow: 'rgba(0, 0, 0, 0.1)',
      
      buttonPrimary: '#3465a4',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#e0e0e0',
      buttonSecondaryText: '#404040',
      buttonHover: '#729fcf',
      
      contextMenuBackground: '#f5f5f5',
      contextMenuText: '#404040',
      contextMenuHover: '#e6e6e6',
      contextMenuBorder: '#d0d0d0',
      contextMenuShadow: 'rgba(0, 0, 0, 0.1)',
      '--ui-titlebar-accent': '#729fcf',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#f5f5f5',
      texto: '#404040',
      disco: '#fabd2f',
      redUp: '#729fcf',
      redDown: '#3465a4',
      cpu: '#3465a4',
      memoria: '#729fcf',
      iconos: '#3465a4'
    }
  },
  'Minimal Gray': {
    name: 'Minimal Gray',
    colors: {
      sidebarBackground: '#fafafa',
      sidebarBorder: '#e0e0e0',
      sidebarText: '#505050',
      sidebarHover: '#f0f0f0',
      sidebarSelected: '#2196f3',
      sidebarGutter: '#e0e0e0',
      
      menuBarBackground: '#f0f0f0',
      menuBarText: '#505050',
      menuBarBorder: '#e0e0e0',
      menuBarHover: '#e0e0e0',
      
      statusBarBackground: '#2196f3',
      statusBarText: '#ffffff',
      statusBarBorder: '#e0e0e0',
      
      tabBackground: '#f0f0f0',
      tabActiveBackground: '#fafafa',
      tabHoverBackground: '#e0e0e0',
      tabText: '#505050',
      tabActiveText: '#1976d2',
      tabBorder: '#e0e0e0',
      tabCloseHover: '#f44336',
      
      tabGroupBackground: '#e0e0e0',
      tabGroupText: '#505050',
      tabGroupBorder: '#f0f0f0',
      
      contentBackground: '#fafafa',
      contentBorder: '#e0e0e0',
      
      dialogBackground: '#fafafa',
      dialogText: '#505050',
      dialogBorder: '#e0e0e0',
      dialogShadow: 'rgba(0, 0, 0, 0.1)',
      
      buttonPrimary: '#1976d2',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#f0f0f0',
      buttonSecondaryText: '#505050',
      buttonHover: '#2196f3',
      
      contextMenuBackground: '#fafafa',
      contextMenuText: '#505050',
      contextMenuHover: '#f0f0f0',
      contextMenuBorder: '#e0e0e0',
      contextMenuShadow: 'rgba(0, 0, 0, 0.1)',
      '--ui-titlebar-accent': '#2196f3',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#fafafa',
      texto: '#505050',
      disco: '#fabd2f',
      redUp: '#2196f3',
      redDown: '#1976d2',
      cpu: '#1976d2',
      memoria: '#2196f3',
      iconos: '#1976d2'
    }
  },
  'Paper': {
    name: 'Paper',
    colors: {
      sidebarBackground: '#fefefe',
      sidebarBorder: '#e1e4e8',
      sidebarText: '#2b2b2b',
      sidebarHover: '#f0f8ff',
      sidebarSelected: '#0366d6',
      sidebarGutter: '#e1e4e8',
      
      menuBarBackground: '#f0f8ff',
      menuBarText: '#2b2b2b',
      menuBarBorder: '#e1e4e8',
      menuBarHover: '#e1e4e8',
      
      statusBarBackground: '#0366d6',
      statusBarText: '#ffffff',
      statusBarBorder: '#e1e4e8',
      
      tabBackground: '#f0f8ff',
      tabActiveBackground: '#fefefe',
      tabHoverBackground: '#e1e4e8',
      tabText: '#2b2b2b',
      tabActiveText: '#0366d6',
      tabBorder: '#e1e4e8',
      tabCloseHover: '#d73a49',
      
      tabGroupBackground: '#e1e4e8',
      tabGroupText: '#2b2b2b',
      tabGroupBorder: '#f0f8ff',
      
      contentBackground: '#fefefe',
      contentBorder: '#e1e4e8',
      
      dialogBackground: '#fefefe',
      dialogText: '#2b2b2b',
      dialogBorder: '#e1e4e8',
      dialogShadow: 'rgba(0, 0, 0, 0.1)',
      
      buttonPrimary: '#0366d6',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#f6f8fa',
      buttonSecondaryText: '#2b2b2b',
      buttonHover: '#0598bc',
      
      contextMenuBackground: '#fefefe',
      contextMenuText: '#2b2b2b',
      contextMenuHover: '#f0f8ff',
      contextMenuBorder: '#e1e4e8',
      contextMenuShadow: 'rgba(0, 0, 0, 0.1)',
      '--ui-titlebar-accent': '#0366d6',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#fefefe',
      texto: '#2b2b2b',
      disco: '#fabd2f',
      redUp: '#0598bc',
      redDown: '#0366d6',
      cpu: '#0366d6',
      memoria: '#0598bc',
      iconos: '#0366d6'
    }
  },
  'Soft Gray': {
    name: 'Soft Gray',
    colors: {
      sidebarBackground: '#f7f7f7',
      sidebarBorder: '#e8e8e8',
      sidebarText: '#4a4a4a',
      sidebarHover: '#eeeeee',
      sidebarSelected: '#64b5f6',
      sidebarGutter: '#e8e8e8',
      
      menuBarBackground: '#eeeeee',
      menuBarText: '#4a4a4a',
      menuBarBorder: '#e8e8e8',
      menuBarHover: '#e8e8e8',
      
      statusBarBackground: '#64b5f6',
      statusBarText: '#ffffff',
      statusBarBorder: '#e8e8e8',
      
      tabBackground: '#eeeeee',
      tabActiveBackground: '#f7f7f7',
      tabHoverBackground: '#e8e8e8',
      tabText: '#4a4a4a',
      tabActiveText: '#1565c0',
      tabBorder: '#e8e8e8',
      tabCloseHover: '#c62828',
      
      tabGroupBackground: '#e8e8e8',
      tabGroupText: '#4a4a4a',
      tabGroupBorder: '#eeeeee',
      
      contentBackground: '#f7f7f7',
      contentBorder: '#e8e8e8',
      
      dialogBackground: '#f7f7f7',
      dialogText: '#4a4a4a',
      dialogBorder: '#e8e8e8',
      dialogShadow: 'rgba(0, 0, 0, 0.1)',
      
      buttonPrimary: '#1565c0',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#f0f0f0',
      buttonSecondaryText: '#4a4a4a',
      buttonHover: '#64b5f6',
      
      contextMenuBackground: '#f7f7f7',
      contextMenuText: '#4a4a4a',
      contextMenuHover: '#eeeeee',
      contextMenuBorder: '#e8e8e8',
      contextMenuShadow: 'rgba(0, 0, 0, 0.1)',
      '--ui-titlebar-accent': '#64b5f6',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#f7f7f7',
      texto: '#4a4a4a',
      disco: '#fabd2f',
      redUp: '#1565c0',
      redDown: '#64b5f6',
      cpu: '#64b5f6',
      memoria: '#1565c0',
      iconos: '#64b5f6'
    }
  },
  'Arctic': {
    name: 'Arctic',
    colors: {
      sidebarBackground: '#fcfcfc',
      sidebarBorder: '#ecf0f1',
      sidebarText: '#2c3e50',
      sidebarHover: '#e8f4f8',
      sidebarSelected: '#3498db',
      sidebarGutter: '#ecf0f1',
      
      menuBarBackground: '#e8f4f8',
      menuBarText: '#2c3e50',
      menuBarBorder: '#ecf0f1',
      menuBarHover: '#ecf0f1',
      
      statusBarBackground: '#3498db',
      statusBarText: '#ffffff',
      statusBarBorder: '#ecf0f1',
      
      tabBackground: '#e8f4f8',
      tabActiveBackground: '#fcfcfc',
      tabHoverBackground: '#ecf0f1',
      tabText: '#2c3e50',
      tabActiveText: '#3498db',
      tabBorder: '#ecf0f1',
      tabCloseHover: '#e74c3c',
      
      tabGroupBackground: '#ecf0f1',
      tabGroupText: '#2c3e50',
      tabGroupBorder: '#e8f4f8',
      
      contentBackground: '#fcfcfc',
      contentBorder: '#ecf0f1',
      
      dialogBackground: '#fcfcfc',
      dialogText: '#2c3e50',
      dialogBorder: '#ecf0f1',
      dialogShadow: 'rgba(0, 0, 0, 0.1)',
      
      buttonPrimary: '#3498db',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#f8f9fa',
      buttonSecondaryText: '#2c3e50',
      buttonHover: '#74b9ff',
      
      contextMenuBackground: '#fcfcfc',
      contextMenuText: '#2c3e50',
      contextMenuHover: '#e8f4f8',
      contextMenuBorder: '#ecf0f1',
      contextMenuShadow: 'rgba(0, 0, 0, 0.1)',
      '--ui-titlebar-accent': '#3498db',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#fcfcfc',
      texto: '#2c3e50',
      disco: '#fabd2f',
      redUp: '#74b9ff',
      redDown: '#3498db',
      cpu: '#3498db',
      memoria: '#74b9ff',
      iconos: '#3498db'
    }
  },
  'Neon Blue': {
    name: 'Neon Blue',
    colors: {
      sidebarBackground: '#0a0a0f',
      sidebarBorder: '#1a1a3a',
      sidebarText: '#00d4ff',
      sidebarHover: '#1a1a3a',
      sidebarSelected: '#0080ff',
      sidebarGutter: '#1a1a3a',
      
      menuBarBackground: '#1a1a3a',
      menuBarText: '#00d4ff',
      menuBarBorder: '#444444',
      menuBarHover: '#444444',
      
      statusBarBackground: '#0080ff',
      statusBarText: '#0a0a0f',
      statusBarBorder: '#1a1a3a',
      
      tabBackground: '#1a1a3a',
      tabActiveBackground: '#0a0a0f',
      tabHoverBackground: '#444444',
      tabText: '#00d4ff',
      tabActiveText: '#18ffff',
      tabBorder: '#444444',
      tabCloseHover: '#ff0040',
      
      tabGroupBackground: '#444444',
      tabGroupText: '#00d4ff',
      tabGroupBorder: '#1a1a3a',
      
      contentBackground: '#0a0a0f',
      contentBorder: '#1a1a3a',
      
      dialogBackground: '#0a0a0f',
      dialogText: '#00d4ff',
      dialogBorder: '#1a1a3a',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#0080ff',
      buttonPrimaryText: '#0a0a0f',
      buttonSecondary: '#1a1a3a',
      buttonSecondaryText: '#00d4ff',
      buttonHover: '#40c4ff',
      
      contextMenuBackground: '#0a0a0f',
      contextMenuText: '#00d4ff',
      contextMenuHover: '#1a1a3a',
      contextMenuBorder: '#444444',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#00d4ff',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0a0a0f',
      texto: '#00d4ff',
      disco: '#fabd2f',
      redUp: '#40c4ff',
      redDown: '#0080ff',
      cpu: '#0080ff',
      memoria: '#40c4ff',
      iconos: '#0080ff'
    }
  },
  'Cyberpunk': {
    name: 'Cyberpunk',
    colors: {
      sidebarBackground: '#0d1117',
      sidebarBorder: '#1a2332',
      sidebarText: '#00ff41',
      sidebarHover: '#1a2332',
      sidebarSelected: '#0099ff',
      sidebarGutter: '#1a2332',
      
      menuBarBackground: '#1a2332',
      menuBarText: '#00ff41',
      menuBarBorder: '#555555',
      menuBarHover: '#555555',
      
      statusBarBackground: '#0099ff',
      statusBarText: '#0d1117',
      statusBarBorder: '#1a2332',
      
      tabBackground: '#1a2332',
      tabActiveBackground: '#0d1117',
      tabHoverBackground: '#555555',
      tabText: '#00ff41',
      tabActiveText: '#00ffff',
      tabBorder: '#555555',
      tabCloseHover: '#ff073a',
      
      tabGroupBackground: '#555555',
      tabGroupText: '#00ff41',
      tabGroupBorder: '#1a2332',
      
      contentBackground: '#0d1117',
      contentBorder: '#1a2332',
      
      dialogBackground: '#0d1117',
      dialogText: '#00ff41',
      dialogBorder: '#1a2332',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#0099ff',
      buttonPrimaryText: '#0d1117',
      buttonSecondary: '#1a2332',
      buttonSecondaryText: '#00ff41',
      buttonHover: '#00d4ff',
      
      contextMenuBackground: '#0d1117',
      contextMenuText: '#00ff41',
      contextMenuHover: '#1a2332',
      contextMenuBorder: '#555555',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#00ff41',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0d1117',
      texto: '#00ff41',
      disco: '#fabd2f',
      redUp: '#00d4ff',
      redDown: '#0099ff',
      cpu: '#0099ff',
      memoria: '#00d4ff',
      iconos: '#0099ff'
    }
  },
  'Matrix': {
    name: 'Matrix',
    colors: {
      sidebarBackground: '#000000',
      sidebarBorder: '#002200',
      sidebarText: '#00ff00',
      sidebarHover: '#002200',
      sidebarSelected: '#00cc00',
      sidebarGutter: '#002200',
      
      menuBarBackground: '#002200',
      menuBarText: '#00ff00',
      menuBarBorder: '#003300',
      menuBarHover: '#003300',
      
      statusBarBackground: '#00cc00',
      statusBarText: '#000000',
      statusBarBorder: '#002200',
      
      tabBackground: '#002200',
      tabActiveBackground: '#000000',
      tabHoverBackground: '#003300',
      tabText: '#00ff00',
      tabActiveText: '#55ff55',
      tabBorder: '#003300',
      tabCloseHover: '#00aa00',
      
      tabGroupBackground: '#003300',
      tabGroupText: '#00ff00',
      tabGroupBorder: '#002200',
      
      contentBackground: '#000000',
      contentBorder: '#002200',
      
      dialogBackground: '#000000',
      dialogText: '#00ff00',
      dialogBorder: '#002200',
      dialogShadow: 'rgba(0, 0, 0, 0.6)',
      
      buttonPrimary: '#00cc00',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#002200',
      buttonSecondaryText: '#00ff00',
      buttonHover: '#00ee00',
      
      contextMenuBackground: '#000000',
      contextMenuText: '#00ff00',
      contextMenuHover: '#002200',
      contextMenuBorder: '#003300',
      contextMenuShadow: 'rgba(0, 0, 0, 0.6)',
      '--ui-titlebar-accent': '#00ff00',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#000000',
      texto: '#00ff00',
      disco: '#fabd2f',
      redUp: '#00ee00',
      redDown: '#00cc00',
      cpu: '#00cc00',
      memoria: '#00ee00',
      iconos: '#00cc00'
    }
  },
  'Hologram': {
    name: 'Hologram',
    colors: {
      sidebarBackground: '#05050a',
      sidebarBorder: '#1a1a3a',
      sidebarText: '#88ccff',
      sidebarHover: '#1a1a3a',
      sidebarSelected: '#4499ff',
      sidebarGutter: '#1a1a3a',
      
      menuBarBackground: '#1a1a3a',
      menuBarText: '#88ccff',
      menuBarBorder: '#4a4a6a',
      menuBarHover: '#4a4a6a',
      
      statusBarBackground: '#4499ff',
      statusBarText: '#05050a',
      statusBarBorder: '#1a1a3a',
      
      tabBackground: '#1a1a3a',
      tabActiveBackground: '#05050a',
      tabHoverBackground: '#4a4a6a',
      tabText: '#88ccff',
      tabActiveText: '#44ffcc',
      tabBorder: '#4a4a6a',
      tabCloseHover: '#ff4499',
      
      tabGroupBackground: '#4a4a6a',
      tabGroupText: '#88ccff',
      tabGroupBorder: '#1a1a3a',
      
      contentBackground: '#05050a',
      contentBorder: '#1a1a3a',
      
      dialogBackground: '#05050a',
      dialogText: '#88ccff',
      dialogBorder: '#1a1a3a',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#4499ff',
      buttonPrimaryText: '#05050a',
      buttonSecondary: '#1a1a3a',
      buttonSecondaryText: '#88ccff',
      buttonHover: '#cc44ff',
      
      contextMenuBackground: '#05050a',
      contextMenuText: '#88ccff',
      contextMenuHover: '#1a1a3a',
      contextMenuBorder: '#4a4a6a',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#44ffcc',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#05050a',
      texto: '#88ccff',
      disco: '#fabd2f',
      redUp: '#44ffcc',
      redDown: '#4499ff',
      cpu: '#4499ff',
      memoria: '#44ffcc',
      iconos: '#4499ff'
    }
  },
  'Plasma': {
    name: 'Plasma',
    colors: {
      sidebarBackground: '#0f0f23',
      sidebarBorder: '#2a1b3d',
      sidebarText: '#ff69b4',
      sidebarHover: '#2a1b3d',
      sidebarSelected: '#2196f3',
      sidebarGutter: '#2a1b3d',
      
      menuBarBackground: '#2a1b3d',
      menuBarText: '#ff69b4',
      menuBarBorder: '#555555',
      menuBarHover: '#555555',
      
      statusBarBackground: '#2196f3',
      statusBarText: '#0f0f23',
      statusBarBorder: '#2a1b3d',
      
      tabBackground: '#2a1b3d',
      tabActiveBackground: '#0f0f23',
      tabHoverBackground: '#555555',
      tabText: '#ff69b4',
      tabActiveText: '#4dd0e1',
      tabBorder: '#555555',
      tabCloseHover: '#ff1744',
      
      tabGroupBackground: '#555555',
      tabGroupText: '#ff69b4',
      tabGroupBorder: '#2a1b3d',
      
      contentBackground: '#0f0f23',
      contentBorder: '#2a1b3d',
      
      dialogBackground: '#0f0f23',
      dialogText: '#ff69b4',
      dialogBorder: '#2a1b3d',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      buttonPrimary: '#2196f3',
      buttonPrimaryText: '#0f0f23',
      buttonSecondary: '#2a1b3d',
      buttonSecondaryText: '#ff69b4',
      buttonHover: '#e91e63',
      
      contextMenuBackground: '#0f0f23',
      contextMenuText: '#ff69b4',
      contextMenuHover: '#2a1b3d',
      contextMenuBorder: '#555555',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#e91e63',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0f0f23',
      texto: '#ff69b4',
      disco: '#fabd2f',
      redUp: '#e91e63',
      redDown: '#2196f3',
      cpu: '#2196f3',
      memoria: '#e91e63',
      iconos: '#2196f3'
    }
  },

  // === SECCIÓN FUTURISTAS ===
  'Scanline Blue UI': {
    name: 'Scanline Blue UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0a0f1f',
      sidebarBorder: '#00bfff',
      sidebarText: '#9ee1ff',
      sidebarHover: '#0f1b33',
      sidebarSelected: '#00bfff',
      sidebarGutter: '#00bfff',
      
      // Menu Bar (top)
      menuBarBackground: '#0f1b33',
      menuBarText: '#9ee1ff',
      menuBarBorder: '#00bfff',
      menuBarHover: '#152540',
      
      // Status Bar (bottom)
      statusBarBackground: '#00bfff',
      statusBarText: '#031018',
      statusBarBorder: '#00bfff',
      
      // Tabs
      tabBackground: '#0a0f1f',
      tabActiveBackground: '#00bfff',
      tabHoverBackground: '#0f1b33',
      tabText: '#9ee1ff',
      tabActiveText: '#031018',
      tabBorder: '#00bfff',
      tabCloseHover: '#3cc8ff',
      
      // Tab Groups
      tabGroupBackground: '#0f1b33',
      tabGroupText: '#9ee1ff',
      tabGroupBorder: '#00bfff',
      
      // Content Area
      contentBackground: '#0a0f1f',
      contentBorder: '#00bfff',
      
      // Dialogs
      dialogBackground: '#0a0f1f',
      dialogText: '#9ee1ff',
      dialogBorder: '#00bfff',
      dialogShadow: 'rgba(0, 191, 255, 0.35)',
      
      // Buttons
      buttonPrimary: '#00bfff',
      buttonPrimaryText: '#031018',
      buttonSecondary: '#0f1b33',
      buttonSecondaryText: '#9ee1ff',
      buttonHover: '#3cc8ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a0f1f',
      linuxTerminalBackground: '#0f1b33',
      
      // Context Menus
      contextMenuBackground: '#0a0f1f',
      contextMenuText: '#9ee1ff',
      contextMenuHover: '#0f1b33',
      contextMenuBorder: '#00bfff',
      contextMenuShadow: 'rgba(0, 191, 255, 0.35)',
      '--ui-titlebar-accent': '#00bfff',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0a0f1f',
      texto: '#9ee1ff',
      disco: '#ffb300',
      redUp: '#3cc8ff',
      redDown: '#00bfff',
      cpu: '#00bfff',
      memoria: '#3cc8ff',
      iconos: '#00bfff'
    }
  },

  'Tron Blue UI': {
    name: 'Tron Blue UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0a0e14',
      sidebarBorder: '#15f3ff',
      sidebarText: '#8deaff',
      sidebarHover: '#0e141c',
      sidebarSelected: '#15f3ff',
      sidebarGutter: '#15f3ff',
      
      // Menu Bar (top)
      menuBarBackground: '#0e141c',
      menuBarText: '#8deaff',
      menuBarBorder: '#15f3ff',
      menuBarHover: '#15f3ff',
      
      // Status Bar (bottom)
      statusBarBackground: '#15f3ff',
      statusBarText: '#071115',
      statusBarBorder: '#15f3ff',
      
      // Tabs
      tabBackground: '#0a0e14',
      tabActiveBackground: '#15f3ff',
      tabHoverBackground: '#0e141c',
      tabText: '#8deaff',
      tabActiveText: '#071115',
      tabBorder: '#15f3ff',
      tabCloseHover: '#00bcd4',
      
      // Tab Groups
      tabGroupBackground: '#0e141c',
      tabGroupText: '#8deaff',
      tabGroupBorder: '#15f3ff',
      
      // Content Area
      contentBackground: '#0a0e14',
      contentBorder: '#15f3ff',
      
      // Dialogs
      dialogBackground: '#0a0e14',
      dialogText: '#8deaff',
      dialogBorder: '#15f3ff',
      dialogShadow: 'rgba(21, 243, 255, 0.45)',
      
      // Buttons
      buttonPrimary: '#15f3ff',
      buttonPrimaryText: '#071115',
      buttonSecondary: '#0e141c',
      buttonSecondaryText: '#8deaff',
      buttonHover: '#00bcd4',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a0e14',
      linuxTerminalBackground: '#0e141c',
      
      // Context Menus
      contextMenuBackground: '#0a0e14',
      contextMenuText: '#8deaff',
      contextMenuHover: '#0e141c',
      contextMenuBorder: '#15f3ff',
      contextMenuShadow: 'rgba(21, 243, 255, 0.45)',
      '--ui-titlebar-accent': '#15f3ff',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0a0e14',
      texto: '#8deaff',
      disco: '#ffb300',
      redUp: '#00bcd4',
      redDown: '#15f3ff',
      cpu: '#15f3ff',
      memoria: '#00bcd4',
      iconos: '#15f3ff'
    }
  },

  'Neon Aurora UI': {
    name: 'Neon Aurora UI',
    colors: {
      // Sidebar
      sidebarBackground: '#091b2a',
      sidebarBorder: '#4ef0ff',
      sidebarText: '#4ef0ff',
      sidebarHover: '#0c2436',
      sidebarSelected: '#00ffd5',
      sidebarGutter: '#4ef0ff',
      
      // Menu Bar (top)
      menuBarBackground: '#0a2a43',
      menuBarText: '#4ef0ff',
      menuBarBorder: '#4ef0ff',
      menuBarHover: '#0c2436',
      
      // Status Bar (bottom)
      statusBarBackground: '#00ffd5',
      statusBarText: '#0b1220',
      statusBarBorder: '#4ef0ff',
      
      // Tabs
      tabBackground: '#091b2a',
      tabActiveBackground: '#00ffd5',
      tabHoverBackground: '#0c2436',
      tabText: '#4ef0ff',
      tabActiveText: '#0b1220',
      tabBorder: '#4ef0ff',
      tabCloseHover: '#ff579a',
      
      // Tab Groups
      tabGroupBackground: '#0a2a43',
      tabGroupText: '#4ef0ff',
      tabGroupBorder: '#4ef0ff',
      
      // Content Area
      contentBackground: '#091b2a',
      contentBorder: '#4ef0ff',
      
      // Dialogs
      dialogBackground: '#091b2a',
      dialogText: '#4ef0ff',
      dialogBorder: '#4ef0ff',
      dialogShadow: 'rgba(78, 240, 255, 0.35)',
      
      // Buttons
      buttonPrimary: '#00ffd5',
      buttonPrimaryText: '#0b1220',
      buttonSecondary: '#0a2a43',
      buttonSecondaryText: '#4ef0ff',
      buttonHover: '#00aaff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#091b2a',
      linuxTerminalBackground: '#0a2a43',
      
      // Context Menus
      contextMenuBackground: '#091b2a',
      contextMenuText: '#4ef0ff',
      contextMenuHover: '#0c2436',
      contextMenuBorder: '#4ef0ff',
      contextMenuShadow: 'rgba(78, 240, 255, 0.35)',
      '--ui-titlebar-accent': '#00ffd5',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#091b2a',
      texto: '#4ef0ff',
      disco: '#ffb300',
      redUp: '#00aaff',
      redDown: '#00ffd5',
      cpu: '#00ffd5',
      memoria: '#00aaff',
      iconos: '#00ffd5'
    }
  },

  'Quantum Flux UI': {
    name: 'Quantum Flux UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0b0f2b',
      sidebarBorder: '#7b61ff',
      sidebarText: '#99aaff',
      sidebarHover: '#0f1436',
      sidebarSelected: '#00e5ff',
      sidebarGutter: '#7b61ff',
      
      // Menu Bar (top)
      menuBarBackground: '#121242',
      menuBarText: '#99aaff',
      menuBarBorder: '#7b61ff',
      menuBarHover: '#181a55',
      
      // Status Bar (bottom)
      statusBarBackground: '#00e5ff',
      statusBarText: '#000000',
      statusBarBorder: '#7b61ff',
      
      // Tabs
      tabBackground: '#0b0f2b',
      tabActiveBackground: '#00e5ff',
      tabHoverBackground: '#0f1436',
      tabText: '#99aaff',
      tabActiveText: '#000000',
      tabBorder: '#7b61ff',
      tabCloseHover: '#ff5ec4',
      
      // Tab Groups
      tabGroupBackground: '#121242',
      tabGroupText: '#99aaff',
      tabGroupBorder: '#7b61ff',
      
      // Content Area
      contentBackground: '#0b0f2b',
      contentBorder: '#7b61ff',
      
      // Dialogs
      dialogBackground: '#0b0f2b',
      dialogText: '#99aaff',
      dialogBorder: '#7b61ff',
      dialogShadow: 'rgba(123, 97, 255, 0.35)',
      
      // Buttons
      buttonPrimary: '#00e5ff',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#121242',
      buttonSecondaryText: '#99aaff',
      buttonHover: '#7b61ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0b0f2b',
      linuxTerminalBackground: '#121242',
      
      // Context Menus
      contextMenuBackground: '#0b0f2b',
      contextMenuText: '#99aaff',
      contextMenuHover: '#0f1436',
      contextMenuBorder: '#7b61ff',
      contextMenuShadow: 'rgba(123, 97, 255, 0.35)',
      '--ui-titlebar-accent': '#00e5ff',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0b0f2b',
      texto: '#99aaff',
      disco: '#ffb300',
      redUp: '#7b61ff',
      redDown: '#00e5ff',
      cpu: '#00e5ff',
      memoria: '#7b61ff',
      iconos: '#00e5ff'
    }
  },

  'Cyber Grid UI': {
    name: 'Cyber Grid UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0a0a0f',
      sidebarBorder: '#00ff41',
      sidebarText: '#00ff41',
      sidebarHover: '#1a1a3a',
      sidebarSelected: '#00ff41',
      sidebarGutter: '#00ff41',
      
      // Menu Bar (top)
      menuBarBackground: '#1a1a3a',
      menuBarText: '#00ff41',
      menuBarBorder: '#00ff41',
      menuBarHover: '#444444',
      
      // Status Bar (bottom)
      statusBarBackground: '#00ff41',
      statusBarText: '#0a0a0f',
      statusBarBorder: '#00ff41',
      
      // Tabs
      tabBackground: '#0a0a0f',
      tabActiveBackground: '#00ff41',
      tabHoverBackground: '#1a1a3a',
      tabText: '#00ff41',
      tabActiveText: '#0a0a0f',
      tabBorder: '#00ff41',
      tabCloseHover: '#ff0040',
      
      // Tab Groups
      tabGroupBackground: '#1a1a3a',
      tabGroupText: '#00ff41',
      tabGroupBorder: '#00ff41',
      
      // Content Area
      contentBackground: '#0a0a0f',
      contentBorder: '#00ff41',
      
      // Dialogs
      dialogBackground: '#0a0a0f',
      dialogText: '#00ff41',
      dialogBorder: '#00ff41',
      dialogShadow: 'rgba(0, 255, 65, 0.4)',
      
      // Buttons
      buttonPrimary: '#00ff41',
      buttonPrimaryText: '#0a0a0f',
      buttonSecondary: '#1a1a3a',
      buttonSecondaryText: '#00ff41',
      buttonHover: '#00d4ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a0a0f',
      linuxTerminalBackground: '#1a1a3a',
      
      // Context Menus
      contextMenuBackground: '#0a0a0f',
      contextMenuText: '#00ff41',
      contextMenuHover: '#1a1a3a',
      contextMenuBorder: '#00ff41',
      contextMenuShadow: 'rgba(0, 255, 65, 0.4)',
      '--ui-titlebar-accent': '#00ff41',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0a0a0f',
      texto: '#00ff41',
      disco: '#ffb300',
      redUp: '#00d4ff',
      redDown: '#00ff41',
      cpu: '#00ff41',
      memoria: '#00d4ff',
      iconos: '#00ff41'
    }
  },

  'Ion Storm UI': {
    name: 'Ion Storm UI',
    colors: {
      // Sidebar
      sidebarBackground: '#071a1a',
      sidebarBorder: '#29ffc6',
      sidebarText: '#86fff0',
      sidebarHover: '#0b2424',
      sidebarSelected: '#29ffc6',
      sidebarGutter: '#29ffc6',
      
      // Menu Bar (top)
      menuBarBackground: '#0f2a2a',
      menuBarText: '#86fff0',
      menuBarBorder: '#29ffc6',
      menuBarHover: '#123333',
      
      // Status Bar (bottom)
      statusBarBackground: '#29ffc6',
      statusBarText: '#002221',
      statusBarBorder: '#29ffc6',
      
      // Tabs
      tabBackground: '#071a1a',
      tabActiveBackground: '#29ffc6',
      tabHoverBackground: '#0b2424',
      tabText: '#86fff0',
      tabActiveText: '#002221',
      tabBorder: '#29ffc6',
      tabCloseHover: '#ff6b6b',
      
      // Tab Groups
      tabGroupBackground: '#0f2a2a',
      tabGroupText: '#86fff0',
      tabGroupBorder: '#29ffc6',
      
      // Content Area
      contentBackground: '#071a1a',
      contentBorder: '#29ffc6',
      
      // Dialogs
      dialogBackground: '#071a1a',
      dialogText: '#86fff0',
      dialogBorder: '#29ffc6',
      dialogShadow: 'rgba(41, 255, 198, 0.35)',
      
      // Buttons
      buttonPrimary: '#29ffc6',
      buttonPrimaryText: '#002221',
      buttonSecondary: '#0f2a2a',
      buttonSecondaryText: '#86fff0',
      buttonHover: '#20e3b2',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#071a1a',
      linuxTerminalBackground: '#0f2a2a',
      
      // Context Menus
      contextMenuBackground: '#071a1a',
      contextMenuText: '#86fff0',
      contextMenuHover: '#0b2424',
      contextMenuBorder: '#29ffc6',
      contextMenuShadow: 'rgba(41, 255, 198, 0.35)',
      '--ui-titlebar-accent': '#29ffc6',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#071a1a',
      texto: '#86fff0',
      disco: '#ffb300',
      redUp: '#20e3b2',
      redDown: '#29ffc6',
      cpu: '#29ffc6',
      memoria: '#20e3b2',
      iconos: '#29ffc6'
    }
  },

  'Terminal Static UI': {
    name: 'Terminal Static UI',
    colors: {
      // Sidebar
      sidebarBackground: '#000000',
      sidebarBorder: '#00ff00',
      sidebarText: '#00ff00',
      sidebarHover: '#002200',
      sidebarSelected: '#00ff00',
      sidebarGutter: '#00ff00',
      
      // Menu Bar (top)
      menuBarBackground: '#002200',
      menuBarText: '#00ff00',
      menuBarBorder: '#00ff00',
      menuBarHover: '#003300',
      
      // Status Bar (bottom)
      statusBarBackground: '#00ff00',
      statusBarText: '#000000',
      statusBarBorder: '#00ff00',
      
      // Tabs
      tabBackground: '#000000',
      tabActiveBackground: '#00ff00',
      tabHoverBackground: '#002200',
      tabText: '#00ff00',
      tabActiveText: '#000000',
      tabBorder: '#00ff00',
      tabCloseHover: '#ff0000',
      
      // Tab Groups
      tabGroupBackground: '#002200',
      tabGroupText: '#00ff00',
      tabGroupBorder: '#00ff00',
      
      // Content Area
      contentBackground: '#000000',
      contentBorder: '#00ff00',
      
      // Dialogs
      dialogBackground: '#000000',
      dialogText: '#00ff00',
      dialogBorder: '#00ff00',
      dialogShadow: 'rgba(0, 255, 0, 0.2)',
      
      // Buttons
      buttonPrimary: '#00ff00',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#002200',
      buttonSecondaryText: '#00ff00',
      buttonHover: '#00cc00',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#000000',
      linuxTerminalBackground: '#002200',
      
      // Context Menus
      contextMenuBackground: '#000000',
      contextMenuText: '#00ff00',
      contextMenuHover: '#002200',
      contextMenuBorder: '#00ff00',
      contextMenuShadow: 'rgba(0, 255, 0, 0.2)',
      '--ui-titlebar-accent': '#00ff00',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#000000',
      texto: '#00ff00',
      disco: '#ffb300',
      redUp: '#00cc00',
      redDown: '#00ff00',
      cpu: '#00ff00',
      memoria: '#00cc00',
      iconos: '#00ff00'
    }
  },

  'Terminal Blue Static UI': {
    name: 'Terminal Blue Static UI',
    colors: {
      // Sidebar
      sidebarBackground: '#000000',
      sidebarBorder: '#00bfff',
      sidebarText: '#00bfff',
      sidebarHover: '#000f1a',
      sidebarSelected: '#00bfff',
      sidebarGutter: '#00bfff',
      
      // Menu Bar (top)
      menuBarBackground: '#000f1a',
      menuBarText: '#00bfff',
      menuBarBorder: '#00bfff',
      menuBarHover: '#001a2e',
      
      // Status Bar (bottom)
      statusBarBackground: '#00bfff',
      statusBarText: '#000000',
      statusBarBorder: '#00bfff',
      
      // Tabs
      tabBackground: '#000000',
      tabActiveBackground: '#00bfff',
      tabHoverBackground: '#000f1a',
      tabText: '#00bfff',
      tabActiveText: '#000000',
      tabBorder: '#00bfff',
      tabCloseHover: '#ff0000',
      
      // Tab Groups
      tabGroupBackground: '#000f1a',
      tabGroupText: '#00bfff',
      tabGroupBorder: '#00bfff',
      
      // Content Area
      contentBackground: '#000000',
      contentBorder: '#00bfff',
      
      // Dialogs
      dialogBackground: '#000000',
      dialogText: '#00bfff',
      dialogBorder: '#00bfff',
      dialogShadow: 'rgba(0, 191, 255, 0.1)',
      
      // Buttons
      buttonPrimary: '#00bfff',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#000f1a',
      buttonSecondaryText: '#00bfff',
      buttonHover: '#3cc8ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#000000',
      linuxTerminalBackground: '#000f1a',
      
      // Context Menus
      contextMenuBackground: '#000000',
      contextMenuText: '#00bfff',
      contextMenuHover: '#000f1a',
      contextMenuBorder: '#00bfff',
      contextMenuShadow: 'rgba(0, 191, 255, 0.1)',
      '--ui-titlebar-accent': '#00bfff',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#000000',
      texto: '#00bfff',
      disco: '#ffb300',
      redUp: '#3cc8ff',
      redDown: '#00bfff',
      cpu: '#00bfff',
      memoria: '#3cc8ff',
      iconos: '#00bfff'
    }
  },

  'Terminal Orange Static UI': {
    name: 'Terminal Orange Static UI',
    colors: {
      // Sidebar
      sidebarBackground: '#000000',
      sidebarBorder: '#ff8c00',
      sidebarText: '#ff8c00',
      sidebarHover: '#1a0f00',
      sidebarSelected: '#ff8c00',
      sidebarGutter: '#ff8c00',
      
      // Menu Bar (top)
      menuBarBackground: '#1a0f00',
      menuBarText: '#ff8c00',
      menuBarBorder: '#ff8c00',
      menuBarHover: '#2e1a00',
      
      // Status Bar (bottom)
      statusBarBackground: '#ff8c00',
      statusBarText: '#000000',
      statusBarBorder: '#ff8c00',
      
      // Tabs
      tabBackground: '#000000',
      tabActiveBackground: '#ff8c00',
      tabHoverBackground: '#1a0f00',
      tabText: '#ff8c00',
      tabActiveText: '#000000',
      tabBorder: '#ff8c00',
      tabCloseHover: '#ff0000',
      
      // Tab Groups
      tabGroupBackground: '#1a0f00',
      tabGroupText: '#ff8c00',
      tabGroupBorder: '#ff8c00',
      
      // Content Area
      contentBackground: '#000000',
      contentBorder: '#ff8c00',
      
      // Dialogs
      dialogBackground: '#000000',
      dialogText: '#ff8c00',
      dialogBorder: '#ff8c00',
      dialogShadow: 'rgba(255, 140, 0, 0.1)',
      
      // Buttons
      buttonPrimary: '#ff8c00',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#1a0f00',
      buttonSecondaryText: '#ff8c00',
      buttonHover: '#ffa500',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#000000',
      linuxTerminalBackground: '#1a0f00',
      
      // Context Menus
      contextMenuBackground: '#000000',
      contextMenuText: '#ff8c00',
      contextMenuHover: '#1a0f00',
      contextMenuBorder: '#ff8c00',
      contextMenuShadow: 'rgba(255, 140, 0, 0.1)',
      '--ui-titlebar-accent': '#ff8c00',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#000000',
      texto: '#ff8c00',
      disco: '#ffb300',
      redUp: '#ffa500',
      redDown: '#ff8c00',
      cpu: '#ff8c00',
      memoria: '#ffa500',
      iconos: '#ff8c00'
    }
  },

  'Laser Wave UI': {
    name: 'Laser Wave UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0a0f1f',
      sidebarBorder: '#ff0080',
      sidebarText: '#ff80bf',
      sidebarHover: '#1a1f2f',
      sidebarSelected: '#ff0080',
      sidebarGutter: '#ff0080',
      
      // Menu Bar (top)
      menuBarBackground: '#1a1f2f',
      menuBarText: '#ff80bf',
      menuBarBorder: '#ff0080',
      menuBarHover: '#2a2f3f',
      
      // Status Bar (bottom)
      statusBarBackground: '#ff0080',
      statusBarText: '#0a0f1f',
      statusBarBorder: '#ff0080',
      
      // Tabs
      tabBackground: '#0a0f1f',
      tabActiveBackground: '#ff0080',
      tabHoverBackground: '#1a1f2f',
      tabText: '#ff80bf',
      tabActiveText: '#0a0f1f',
      tabBorder: '#ff0080',
      tabCloseHover: '#ff40a0',
      
      // Tab Groups
      tabGroupBackground: '#1a1f2f',
      tabGroupText: '#ff80bf',
      tabGroupBorder: '#ff0080',
      
      // Content Area
      contentBackground: '#0a0f1f',
      contentBorder: '#ff0080',
      
      // Dialogs
      dialogBackground: '#0a0f1f',
      dialogText: '#ff80bf',
      dialogBorder: '#ff0080',
      dialogShadow: 'rgba(255, 0, 128, 0.35)',
      
      // Buttons
      buttonPrimary: '#ff0080',
      buttonPrimaryText: '#0a0f1f',
      buttonSecondary: '#1a1f2f',
      buttonSecondaryText: '#ff80bf',
      buttonHover: '#ff40a0',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a0f1f',
      linuxTerminalBackground: '#1a1f2f',
      
      // Context Menus
      contextMenuBackground: '#0a0f1f',
      contextMenuText: '#ff80bf',
      contextMenuHover: '#1a1f2f',
      contextMenuBorder: '#ff0080',
      contextMenuShadow: 'rgba(255, 0, 128, 0.35)',
      '--ui-titlebar-accent': '#ff0080',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0a0f1f',
      texto: '#ff80bf',
      disco: '#ffb300',
      redUp: '#ff40a0',
      redDown: '#ff0080',
      cpu: '#ff0080',
      memoria: '#ff40a0',
      iconos: '#ff0080'
    }
  },

  'Prism Trail UI': {
    name: 'Prism Trail UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0f0a1f',
      sidebarBorder: '#8b5cf6',
      sidebarText: '#c4b5fd',
      sidebarHover: '#1f1a2f',
      sidebarSelected: '#8b5cf6',
      sidebarGutter: '#8b5cf6',
      
      // Menu Bar (top)
      menuBarBackground: '#1f1a2f',
      menuBarText: '#c4b5fd',
      menuBarBorder: '#8b5cf6',
      menuBarHover: '#2f2a3f',
      
      // Status Bar (bottom)
      statusBarBackground: '#8b5cf6',
      statusBarText: '#0f0a1f',
      statusBarBorder: '#8b5cf6',
      
      // Tabs
      tabBackground: '#0f0a1f',
      tabActiveBackground: '#8b5cf6',
      tabHoverBackground: '#1f1a2f',
      tabText: '#c4b5fd',
      tabActiveText: '#0f0a1f',
      tabBorder: '#8b5cf6',
      tabCloseHover: '#f59e0b',
      
      // Tab Groups
      tabGroupBackground: '#1f1a2f',
      tabGroupText: '#c4b5fd',
      tabGroupBorder: '#8b5cf6',
      
      // Content Area
      contentBackground: '#0f0a1f',
      contentBorder: '#8b5cf6',
      
      // Dialogs
      dialogBackground: '#0f0a1f',
      dialogText: '#c4b5fd',
      dialogBorder: '#8b5cf6',
      dialogShadow: 'rgba(139, 92, 246, 0.35)',
      
      // Buttons
      buttonPrimary: '#8b5cf6',
      buttonPrimaryText: '#0f0a1f',
      buttonSecondary: '#1f1a2f',
      buttonSecondaryText: '#c4b5fd',
      buttonHover: '#a78bfa',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0f0a1f',
      linuxTerminalBackground: '#1f1a2f',
      
      // Context Menus
      contextMenuBackground: '#0f0a1f',
      contextMenuText: '#c4b5fd',
      contextMenuHover: '#1f1a2f',
      contextMenuBorder: '#8b5cf6',
      contextMenuShadow: 'rgba(139, 92, 246, 0.35)',
      '--ui-titlebar-accent': '#8b5cf6',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0f0a1f',
      texto: '#c4b5fd',
      disco: '#ffb300',
      redUp: '#a78bfa',
      redDown: '#8b5cf6',
      cpu: '#8b5cf6',
      memoria: '#a78bfa',
      iconos: '#8b5cf6'
    }
  },

  'Hyperdrive UI': {
    name: 'Hyperdrive UI',
    colors: {
      // Sidebar
      sidebarBackground: '#07131f',
      sidebarBorder: '#2de2e6',
      sidebarText: '#9beef3',
      sidebarHover: '#0b1f33',
      sidebarSelected: '#2de2e6',
      sidebarGutter: '#2de2e6',
      
      // Menu Bar (top)
      menuBarBackground: '#0a1b2b',
      menuBarText: '#9beef3',
      menuBarBorder: '#2de2e6',
      menuBarHover: '#0f2842',
      
      // Status Bar (bottom)
      statusBarBackground: '#2de2e6',
      statusBarText: '#00141d',
      statusBarBorder: '#2de2e6',
      
      // Tabs
      tabBackground: '#07131f',
      tabActiveBackground: '#2de2e6',
      tabHoverBackground: '#0b1f33',
      tabText: '#9beef3',
      tabActiveText: '#00141d',
      tabBorder: '#2de2e6',
      tabCloseHover: '#ff2079',
      
      // Tab Groups
      tabGroupBackground: '#0a1b2b',
      tabGroupText: '#9beef3',
      tabGroupBorder: '#2de2e6',
      
      // Content Area
      contentBackground: '#07131f',
      contentBorder: '#2de2e6',
      
      // Dialogs
      dialogBackground: '#07131f',
      dialogText: '#9beef3',
      dialogBorder: '#2de2e6',
      dialogShadow: 'rgba(45, 226, 230, 0.35)',
      
      // Buttons
      buttonPrimary: '#2de2e6',
      buttonPrimaryText: '#00141d',
      buttonSecondary: '#0a1b2b',
      buttonSecondaryText: '#9beef3',
      buttonHover: '#00a3ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#07131f',
      linuxTerminalBackground: '#0a1b2b',
      
      // Context Menus
      contextMenuBackground: '#07131f',
      contextMenuText: '#9beef3',
      contextMenuHover: '#0b1f33',
      contextMenuBorder: '#2de2e6',
      contextMenuShadow: 'rgba(45, 226, 230, 0.35)',
      '--ui-titlebar-accent': '#2de2e6',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#07131f',
      texto: '#9beef3',
      disco: '#ffb300',
      redUp: '#00a3ff',
      redDown: '#2de2e6',
      cpu: '#2de2e6',
      memoria: '#00a3ff',
      iconos: '#2de2e6'
    }
  },

  'Neon Orbit UI': {
    name: 'Neon Orbit UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0a0f1f',
      sidebarBorder: '#00d4ff',
      sidebarText: '#80d4ff',
      sidebarHover: '#1a1f2f',
      sidebarSelected: '#00d4ff',
      sidebarGutter: '#00d4ff',
      
      // Menu Bar (top)
      menuBarBackground: '#1a1f2f',
      menuBarText: '#80d4ff',
      menuBarBorder: '#00d4ff',
      menuBarHover: '#2a2f3f',
      
      // Status Bar (bottom)
      statusBarBackground: '#00d4ff',
      statusBarText: '#0a0f1f',
      statusBarBorder: '#00d4ff',
      
      // Tabs
      tabBackground: '#0a0f1f',
      tabActiveBackground: '#00d4ff',
      tabHoverBackground: '#1a1f2f',
      tabText: '#80d4ff',
      tabActiveText: '#0a0f1f',
      tabBorder: '#00d4ff',
      tabCloseHover: '#ff6b6b',
      
      // Tab Groups
      tabGroupBackground: '#1a1f2f',
      tabGroupText: '#80d4ff',
      tabGroupBorder: '#00d4ff',
      
      // Content Area
      contentBackground: '#0a0f1f',
      contentBorder: '#00d4ff',
      
      // Dialogs
      dialogBackground: '#0a0f1f',
      dialogText: '#80d4ff',
      dialogBorder: '#00d4ff',
      dialogShadow: 'rgba(0, 212, 255, 0.35)',
      
      // Buttons
      buttonPrimary: '#00d4ff',
      buttonPrimaryText: '#0a0f1f',
      buttonSecondary: '#1a1f2f',
      buttonSecondaryText: '#80d4ff',
      buttonHover: '#40c4ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a0f1f',
      linuxTerminalBackground: '#1a1f2f',
      
      // Context Menus
      contextMenuBackground: '#0a0f1f',
      contextMenuText: '#80d4ff',
      contextMenuHover: '#1a1f2f',
      contextMenuBorder: '#00d4ff',
      contextMenuShadow: 'rgba(0, 212, 255, 0.35)',
      '--ui-titlebar-accent': '#00d4ff',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0a0f1f',
      texto: '#80d4ff',
      disco: '#ffb300',
      redUp: '#40c4ff',
      redDown: '#00d4ff',
      cpu: '#00d4ff',
      memoria: '#40c4ff',
      iconos: '#00d4ff'
    }
  },

  'Pulse Magenta UI': {
    name: 'Pulse Magenta UI',
    colors: {
      // Sidebar
      sidebarBackground: '#1a0f1a',
      sidebarBorder: '#ff00ff',
      sidebarText: '#ff80ff',
      sidebarHover: '#2a1f2a',
      sidebarSelected: '#ff00ff',
      sidebarGutter: '#ff00ff',
      
      // Menu Bar (top)
      menuBarBackground: '#2a1f2a',
      menuBarText: '#ff80ff',
      menuBarBorder: '#ff00ff',
      menuBarHover: '#3a2f3a',
      
      // Status Bar (bottom)
      statusBarBackground: '#ff00ff',
      statusBarText: '#1a0f1a',
      statusBarBorder: '#ff00ff',
      
      // Tabs
      tabBackground: '#1a0f1a',
      tabActiveBackground: '#ff00ff',
      tabHoverBackground: '#2a1f2a',
      tabText: '#ff80ff',
      tabActiveText: '#1a0f1a',
      tabBorder: '#ff00ff',
      tabCloseHover: '#ff4040',
      
      // Tab Groups
      tabGroupBackground: '#2a1f2a',
      tabGroupText: '#ff80ff',
      tabGroupBorder: '#ff00ff',
      
      // Content Area
      contentBackground: '#1a0f1a',
      contentBorder: '#ff00ff',
      
      // Dialogs
      dialogBackground: '#1a0f1a',
      dialogText: '#ff80ff',
      dialogBorder: '#ff00ff',
      dialogShadow: 'rgba(255, 0, 255, 0.35)',
      
      // Buttons
      buttonPrimary: '#ff00ff',
      buttonPrimaryText: '#1a0f1a',
      buttonSecondary: '#2a1f2a',
      buttonSecondaryText: '#ff80ff',
      buttonHover: '#ff40ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#1a0f1a',
      linuxTerminalBackground: '#2a1f2a',
      
      // Context Menus
      contextMenuBackground: '#1a0f1a',
      contextMenuText: '#ff80ff',
      contextMenuHover: '#2a1f2a',
      contextMenuBorder: '#ff00ff',
      contextMenuShadow: 'rgba(255, 0, 255, 0.35)',
      '--ui-titlebar-accent': '#ff00ff',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#1a0f1a',
      texto: '#ff80ff',
      disco: '#ffb300',
      redUp: '#ff40ff',
      redDown: '#ff00ff',
      cpu: '#ff00ff',
      memoria: '#ff40ff',
      iconos: '#ff00ff'
    }
  },

  'Neon Lime UI': {
    name: 'Neon Lime UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0f1a0f',
      sidebarBorder: '#00ff00',
      sidebarText: '#80ff80',
      sidebarHover: '#1f2a1f',
      sidebarSelected: '#00ff00',
      sidebarGutter: '#00ff00',
      
      // Menu Bar (top)
      menuBarBackground: '#1f2a1f',
      menuBarText: '#80ff80',
      menuBarBorder: '#00ff00',
      menuBarHover: '#2f3a2f',
      
      // Status Bar (bottom)
      statusBarBackground: '#00ff00',
      statusBarText: '#0f1a0f',
      statusBarBorder: '#00ff00',
      
      // Tabs
      tabBackground: '#0f1a0f',
      tabActiveBackground: '#00ff00',
      tabHoverBackground: '#1f2a1f',
      tabText: '#80ff80',
      tabActiveText: '#0f1a0f',
      tabBorder: '#00ff00',
      tabCloseHover: '#ff4040',
      
      // Tab Groups
      tabGroupBackground: '#1f2a1f',
      tabGroupText: '#80ff80',
      tabGroupBorder: '#00ff00',
      
      // Content Area
      contentBackground: '#0f1a0f',
      contentBorder: '#00ff00',
      
      // Dialogs
      dialogBackground: '#0f1a0f',
      dialogText: '#80ff80',
      dialogBorder: '#00ff00',
      dialogShadow: 'rgba(0, 255, 0, 0.35)',
      
      // Buttons
      buttonPrimary: '#00ff00',
      buttonPrimaryText: '#0f1a0f',
      buttonSecondary: '#1f2a1f',
      buttonSecondaryText: '#80ff80',
      buttonHover: '#40ff40',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0f1a0f',
      linuxTerminalBackground: '#1f2a1f',
      
      // Context Menus
      contextMenuBackground: '#0f1a0f',
      contextMenuText: '#80ff80',
      contextMenuHover: '#1f2a1f',
      contextMenuBorder: '#00ff00',
      contextMenuShadow: 'rgba(0, 255, 0, 0.35)',
      '--ui-titlebar-accent': '#00ff00',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0f1a0f',
      texto: '#80ff80',
      disco: '#ffb300',
      redUp: '#40ff40',
      redDown: '#00ff00',
      cpu: '#00ff00',
      memoria: '#40ff40',
      iconos: '#00ff00'
    }
  },

  'Steam UI': {
    name: 'Steam UI',
    colors: {
      // Sidebar
      sidebarBackground: '#1a1a1a',
      sidebarBorder: '#66b3ff',
      sidebarText: '#b3d9ff',
      sidebarHover: '#2a2a2a',
      sidebarSelected: '#66b3ff',
      sidebarGutter: '#66b3ff',
      
      // Menu Bar (top)
      menuBarBackground: '#2a2a2a',
      menuBarText: '#b3d9ff',
      menuBarBorder: '#66b3ff',
      menuBarHover: '#3a3a3a',
      
      // Status Bar (bottom)
      statusBarBackground: '#66b3ff',
      statusBarText: '#1a1a1a',
      statusBarBorder: '#66b3ff',
      
      // Tabs
      tabBackground: '#1a1a1a',
      tabActiveBackground: '#66b3ff',
      tabHoverBackground: '#2a2a2a',
      tabText: '#b3d9ff',
      tabActiveText: '#1a1a1a',
      tabBorder: '#66b3ff',
      tabCloseHover: '#ff6666',
      
      // Tab Groups
      tabGroupBackground: '#2a2a2a',
      tabGroupText: '#b3d9ff',
      tabGroupBorder: '#66b3ff',
      
      // Content Area
      contentBackground: '#1a1a1a',
      contentBorder: '#66b3ff',
      
      // Dialogs
      dialogBackground: '#1a1a1a',
      dialogText: '#b3d9ff',
      dialogBorder: '#66b3ff',
      dialogShadow: 'rgba(102, 179, 255, 0.35)',
      
      // Buttons
      buttonPrimary: '#66b3ff',
      buttonPrimaryText: '#1a1a1a',
      buttonSecondary: '#2a2a2a',
      buttonSecondaryText: '#b3d9ff',
      buttonHover: '#80c4ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#1a1a1a',
      linuxTerminalBackground: '#2a2a2a',
      
      // Context Menus
      contextMenuBackground: '#1a1a1a',
      contextMenuText: '#b3d9ff',
      contextMenuHover: '#2a2a2a',
      contextMenuBorder: '#66b3ff',
      contextMenuShadow: 'rgba(102, 179, 255, 0.35)',
      '--ui-titlebar-accent': '#66b3ff',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#1a1a1a',
      texto: '#b3d9ff',
      disco: '#ffb300',
      redUp: '#80c4ff',
      redDown: '#66b3ff',
      cpu: '#66b3ff',
      memoria: '#80c4ff',
      iconos: '#66b3ff'
    }
  },

  'Steam Blue UI': {
    name: 'Steam Blue UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0a1a2a',
      sidebarBorder: '#4da6ff',
      sidebarText: '#99ccff',
      sidebarHover: '#1a2a3a',
      sidebarSelected: '#4da6ff',
      sidebarGutter: '#4da6ff',
      
      // Menu Bar (top)
      menuBarBackground: '#1a2a3a',
      menuBarText: '#99ccff',
      menuBarBorder: '#4da6ff',
      menuBarHover: '#2a3a4a',
      
      // Status Bar (bottom)
      statusBarBackground: '#4da6ff',
      statusBarText: '#0a1a2a',
      statusBarBorder: '#4da6ff',
      
      // Tabs
      tabBackground: '#0a1a2a',
      tabActiveBackground: '#4da6ff',
      tabHoverBackground: '#1a2a3a',
      tabText: '#99ccff',
      tabActiveText: '#0a1a2a',
      tabBorder: '#4da6ff',
      tabCloseHover: '#ff6666',
      
      // Tab Groups
      tabGroupBackground: '#1a2a3a',
      tabGroupText: '#99ccff',
      tabGroupBorder: '#4da6ff',
      
      // Content Area
      contentBackground: '#0a1a2a',
      contentBorder: '#4da6ff',
      
      // Dialogs
      dialogBackground: '#0a1a2a',
      dialogText: '#99ccff',
      dialogBorder: '#4da6ff',
      dialogShadow: 'rgba(77, 166, 255, 0.35)',
      
      // Buttons
      buttonPrimary: '#4da6ff',
      buttonPrimaryText: '#0a1a2a',
      buttonSecondary: '#1a2a3a',
      buttonSecondaryText: '#99ccff',
      buttonHover: '#66b3ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a1a2a',
      linuxTerminalBackground: '#1a2a3a',
      
      // Context Menus
      contextMenuBackground: '#0a1a2a',
      contextMenuText: '#99ccff',
      contextMenuHover: '#1a2a3a',
      contextMenuBorder: '#4da6ff',
      contextMenuShadow: 'rgba(77, 166, 255, 0.35)',
      '--ui-titlebar-accent': '#4da6ff',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0a1a2a',
      texto: '#99ccff',
      disco: '#ffb300',
      redUp: '#66b3ff',
      redDown: '#4da6ff',
      cpu: '#4da6ff',
      memoria: '#66b3ff',
      iconos: '#4da6ff'
    }
  },

  'Steam Green UI': {
    name: 'Steam Green UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0a2a1a',
      sidebarBorder: '#4dff4d',
      sidebarText: '#99ff99',
      sidebarHover: '#1a3a2a',
      sidebarSelected: '#4dff4d',
      sidebarGutter: '#4dff4d',
      
      // Menu Bar (top)
      menuBarBackground: '#1a3a2a',
      menuBarText: '#99ff99',
      menuBarBorder: '#4dff4d',
      menuBarHover: '#2a4a3a',
      
      // Status Bar (bottom)
      statusBarBackground: '#4dff4d',
      statusBarText: '#0a2a1a',
      statusBarBorder: '#4dff4d',
      
      // Tabs
      tabBackground: '#0a2a1a',
      tabActiveBackground: '#4dff4d',
      tabHoverBackground: '#1a3a2a',
      tabText: '#99ff99',
      tabActiveText: '#0a2a1a',
      tabBorder: '#4dff4d',
      tabCloseHover: '#ff6666',
      
      // Tab Groups
      tabGroupBackground: '#1a3a2a',
      tabGroupText: '#99ff99',
      tabGroupBorder: '#4dff4d',
      
      // Content Area
      contentBackground: '#0a2a1a',
      contentBorder: '#4dff4d',
      
      // Dialogs
      dialogBackground: '#0a2a1a',
      dialogText: '#99ff99',
      dialogBorder: '#4dff4d',
      dialogShadow: 'rgba(77, 255, 77, 0.35)',
      
      // Buttons
      buttonPrimary: '#4dff4d',
      buttonPrimaryText: '#0a2a1a',
      buttonSecondary: '#1a3a2a',
      buttonSecondaryText: '#99ff99',
      buttonHover: '#66ff66',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a2a1a',
      linuxTerminalBackground: '#1a3a2a',
      
      // Context Menus
      contextMenuBackground: '#0a2a1a',
      contextMenuText: '#99ff99',
      contextMenuHover: '#1a3a2a',
      contextMenuBorder: '#4dff4d',
      contextMenuShadow: 'rgba(77, 255, 77, 0.35)',
      '--ui-titlebar-accent': '#4dff4d',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0a2a1a',
      texto: '#99ff99',
      disco: '#ffb300',
      redUp: '#66ff66',
      redDown: '#4dff4d',
      cpu: '#4dff4d',
      memoria: '#66ff66',
      iconos: '#4dff4d'
    }
  },

  'Futuristic UI': {
    name: 'Futuristic UI',
    colors: {
      // Sidebar
      sidebarBackground: '#1a1a2e',
      sidebarBorder: '#00d4ff',
      sidebarText: '#00d4ff',
      sidebarHover: '#16213e',
      sidebarSelected: '#00d4ff',
      sidebarGutter: '#00d4ff',
      
      // Menu Bar (top)
      menuBarBackground: '#16213e',
      menuBarText: '#00d4ff',
      menuBarBorder: '#00d4ff',
      menuBarHover: '#0f3460',
      
      // Status Bar (bottom)
      statusBarBackground: '#00d4ff',
      statusBarText: '#1a1a2e',
      statusBarBorder: '#00d4ff',
      
      // Tabs
      tabBackground: '#1a1a2e',
      tabActiveBackground: '#00d4ff',
      tabHoverBackground: '#16213e',
      tabText: '#00d4ff',
      tabActiveText: '#1a1a2e',
      tabBorder: '#00d4ff',
      tabCloseHover: '#ff4757',
      
      // Tab Groups
      tabGroupBackground: '#16213e',
      tabGroupText: '#00d4ff',
      tabGroupBorder: '#00d4ff',
      
      // Content Area
      contentBackground: '#1a1a2e',
      contentBorder: '#00d4ff',
      
      // Dialogs
      dialogBackground: '#1a1a2e',
      dialogText: '#00d4ff',
      dialogBorder: '#00d4ff',
      dialogShadow: 'rgba(0, 212, 255, 0.3)',
      
      // Buttons
      buttonPrimary: '#00d4ff',
      buttonPrimaryText: '#1a1a2e',
      buttonSecondary: '#16213e',
      buttonSecondaryText: '#00d4ff',
      buttonHover: '#72f1b8',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#1a1a2e',
      linuxTerminalBackground: '#16213e',
      
      // Context Menus
      contextMenuBackground: '#1a1a2e',
      contextMenuText: '#00d4ff',
      contextMenuHover: '#16213e',
      contextMenuBorder: '#00d4ff',
      contextMenuShadow: 'rgba(0, 212, 255, 0.3)',
      '--ui-titlebar-accent': '#00d4ff',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#1a1a2e',
      texto: '#00d4ff',
      disco: '#ffb300',
      redUp: '#72f1b8',
      redDown: '#00d4ff',
      cpu: '#00d4ff',
      memoria: '#72f1b8',
      iconos: '#00d4ff'
    }
  },

  'Hologram UI': {
    name: 'Hologram UI',
    colors: {
      // Sidebar
      sidebarBackground: '#05050a',
      sidebarBorder: '#88ccff',
      sidebarText: '#88ccff',
      sidebarHover: '#1a1a3a',
      sidebarSelected: '#4499ff',
      sidebarGutter: '#88ccff',
      
      // Menu Bar (top)
      menuBarBackground: '#1a1a3a',
      menuBarText: '#88ccff',
      menuBarBorder: '#88ccff',
      menuBarHover: '#4a4a6a',
      
      // Status Bar (bottom)
      statusBarBackground: '#4499ff',
      statusBarText: '#05050a',
      statusBarBorder: '#88ccff',
      
      // Tabs
      tabBackground: '#05050a',
      tabActiveBackground: '#4499ff',
      tabHoverBackground: '#1a1a3a',
      tabText: '#88ccff',
      tabActiveText: '#05050a',
      tabBorder: '#88ccff',
      tabCloseHover: '#ff4499',
      
      // Tab Groups
      tabGroupBackground: '#1a1a3a',
      tabGroupText: '#88ccff',
      tabGroupBorder: '#88ccff',
      
      // Content Area
      contentBackground: '#05050a',
      contentBorder: '#88ccff',
      
      // Dialogs
      dialogBackground: '#05050a',
      dialogText: '#88ccff',
      dialogBorder: '#88ccff',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#4499ff',
      buttonPrimaryText: '#05050a',
      buttonSecondary: '#1a1a3a',
      buttonSecondaryText: '#88ccff',
      buttonHover: '#cc44ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#05050a',
      linuxTerminalBackground: '#1a1a3a',
      
      // Context Menus
      contextMenuBackground: '#05050a',
      contextMenuText: '#88ccff',
      contextMenuHover: '#1a1a3a',
      contextMenuBorder: '#88ccff',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#44ffcc',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#05050a',
      texto: '#88ccff',
      disco: '#ffb300',
      redUp: '#44ffcc',
      redDown: '#4499ff',
      cpu: '#4499ff',
      memoria: '#44ffcc',
      iconos: '#4499ff'
    }
  },

  'Particle System UI': {
    name: 'Particle System UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0f0f23',
      sidebarBorder: '#ff69b4',
      sidebarText: '#ffb3d9',
      sidebarHover: '#2a1b3d',
      sidebarSelected: '#2196f3',
      sidebarGutter: '#ff69b4',
      
      // Menu Bar (top)
      menuBarBackground: '#2a1b3d',
      menuBarText: '#ffb3d9',
      menuBarBorder: '#ff69b4',
      menuBarHover: '#555555',
      
      // Status Bar (bottom)
      statusBarBackground: '#2196f3',
      statusBarText: '#0f0f23',
      statusBarBorder: '#ff69b4',
      
      // Tabs
      tabBackground: '#0f0f23',
      tabActiveBackground: '#2196f3',
      tabHoverBackground: '#2a1b3d',
      tabText: '#ffb3d9',
      tabActiveText: '#0f0f23',
      tabBorder: '#ff69b4',
      tabCloseHover: '#ff1744',
      
      // Tab Groups
      tabGroupBackground: '#2a1b3d',
      tabGroupText: '#ffb3d9',
      tabGroupBorder: '#ff69b4',
      
      // Content Area
      contentBackground: '#0f0f23',
      contentBorder: '#ff69b4',
      
      // Dialogs
      dialogBackground: '#0f0f23',
      dialogText: '#ffb3d9',
      dialogBorder: '#ff69b4',
      dialogShadow: 'rgba(0, 0, 0, 0.4)',
      
      // Buttons
      buttonPrimary: '#2196f3',
      buttonPrimaryText: '#0f0f23',
      buttonSecondary: '#2a1b3d',
      buttonSecondaryText: '#ffb3d9',
      buttonHover: '#e91e63',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0f0f23',
      linuxTerminalBackground: '#2a1b3d',
      
      // Context Menus
      contextMenuBackground: '#0f0f23',
      contextMenuText: '#ffb3d9',
      contextMenuHover: '#2a1b3d',
      contextMenuBorder: '#ff69b4',
      contextMenuShadow: 'rgba(0, 0, 0, 0.4)',
      '--ui-titlebar-accent': '#e91e63',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0f0f23',
      texto: '#ffb3d9',
      disco: '#ffb300',
      redUp: '#e91e63',
      redDown: '#2196f3',
      cpu: '#2196f3',
      memoria: '#e91e63',
      iconos: '#2196f3'
    }
  },

  'Sound Wave UI': {
    name: 'Sound Wave UI',
    colors: {
      // Sidebar
      sidebarBackground: '#0a0f1a',
      sidebarBorder: '#00ff80',
      sidebarText: '#80ffc0',
      sidebarHover: '#1a2a1a',
      sidebarSelected: '#00ff80',
      sidebarGutter: '#00ff80',
      
      // Menu Bar (top)
      menuBarBackground: '#1a2a1a',
      menuBarText: '#80ffc0',
      menuBarBorder: '#00ff80',
      menuBarHover: '#2a3a2a',
      
      // Status Bar (bottom)
      statusBarBackground: '#00ff80',
      statusBarText: '#0a0f1a',
      statusBarBorder: '#00ff80',
      
      // Tabs
      tabBackground: '#0a0f1a',
      tabActiveBackground: '#00ff80',
      tabHoverBackground: '#1a2a1a',
      tabText: '#80ffc0',
      tabActiveText: '#0a0f1a',
      tabBorder: '#00ff80',
      tabCloseHover: '#ff4040',
      
      // Tab Groups
      tabGroupBackground: '#1a2a1a',
      tabGroupText: '#80ffc0',
      tabGroupBorder: '#00ff80',
      
      // Content Area
      contentBackground: '#0a0f1a',
      contentBorder: '#00ff80',
      
      // Dialogs
      dialogBackground: '#0a0f1a',
      dialogText: '#80ffc0',
      dialogBorder: '#00ff80',
      dialogShadow: 'rgba(0, 255, 128, 0.35)',
      
      // Buttons
      buttonPrimary: '#00ff80',
      buttonPrimaryText: '#0a0f1a',
      buttonSecondary: '#1a2a1a',
      buttonSecondaryText: '#80ffc0',
      buttonHover: '#40ffa0',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a0f1a',
      linuxTerminalBackground: '#1a2a1a',
      
      // Context Menus
      contextMenuBackground: '#0a0f1a',
      contextMenuText: '#80ffc0',
      contextMenuHover: '#1a2a1a',
      contextMenuBorder: '#00ff80',
      contextMenuShadow: 'rgba(0, 255, 128, 0.35)',
      '--ui-titlebar-accent': '#00ff80',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#0a0f1a',
      texto: '#80ffc0',
      disco: '#ffb300',
      redUp: '#40ffa0',
      redDown: '#00ff80',
      cpu: '#00ff80',
      memoria: '#40ffa0',
      iconos: '#00ff80'
    }
  },

  'DNA Helix UI': {
    name: 'DNA Helix UI',
    colors: {
      // Sidebar
      sidebarBackground: '#001122',
      sidebarBorder: '#0066cc',
      sidebarText: '#00ccff',
      sidebarHover: '#002244',
      sidebarSelected: '#0066cc',
      sidebarGutter: '#0066cc',
      
      // Menu Bar (top)
      menuBarBackground: '#003366',
      menuBarText: '#00ccff',
      menuBarBorder: '#0066cc',
      menuBarHover: '#004488',
      
      // Status Bar (bottom)
      statusBarBackground: '#0066cc',
      statusBarText: '#001122',
      statusBarBorder: '#0066cc',
      
      // Tabs
      tabBackground: '#001122',
      tabActiveBackground: '#0066cc',
      tabHoverBackground: '#002244',
      tabText: '#00ccff',
      tabActiveText: '#001122',
      tabBorder: '#0066cc',
      tabCloseHover: '#ff4757',
      
      // Tab Groups
      tabGroupBackground: '#003366',
      tabGroupText: '#00ccff',
      tabGroupBorder: '#0066cc',
      
      // Content Area
      contentBackground: '#001122',
      contentBorder: '#0066cc',
      
      // Dialogs
      dialogBackground: '#001122',
      dialogText: '#00ccff',
      dialogBorder: '#0066cc',
      dialogShadow: 'rgba(0, 204, 255, 0.4)',
      
      // Buttons
      buttonPrimary: '#0066cc',
      buttonPrimaryText: '#001122',
      buttonSecondary: '#003366',
      buttonSecondaryText: '#00ccff',
      buttonHover: '#0088ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#001122',
      linuxTerminalBackground: '#003366',
      
      // Context Menus
      contextMenuBackground: '#001122',
      contextMenuText: '#00ccff',
      contextMenuHover: '#002244',
      contextMenuBorder: '#0066cc',
      contextMenuShadow: 'rgba(0, 204, 255, 0.4)',
      '--ui-titlebar-accent': '#0066cc',
      '--ui-titlebar-text': '#222'
    },
    statusBarPalette: {
      fondo: '#001122',
      texto: '#00ccff',
      disco: '#ffb300',
      redUp: '#0088ff',
      redDown: '#0066cc',
      cpu: '#0066cc',
      memoria: '#0088ff',
      iconos: '#0066cc'
    }
  },

  'Matrix Green': {
    name: 'Matrix Green',
    colors: {
      // Sidebar
      sidebarBackground: '#001100',
      sidebarBorder: '#00ff00',
      sidebarText: '#00ff00',
      sidebarHover: '#002200',
      sidebarSelected: '#00ff00',
      sidebarGutter: '#00ff00',
      
      // Menu Bar (top)
      menuBarBackground: '#000000',
      menuBarText: '#00ff00',
      menuBarBorder: '#00ff00',
      menuBarHover: '#002200',
      
      // Status Bar (bottom)
      statusBarBackground: '#00ff00',
      statusBarText: '#000000',
      statusBarBorder: '#00ff00',
      
      // Tabs
      tabBackground: '#001100',
      tabActiveBackground: '#00ff00',
      tabHoverBackground: '#002200',
      tabText: '#00ff00',
      tabActiveText: '#000000',
      tabBorder: '#00ff00',
      tabCloseHover: '#ff0000',
      
      // Tab Groups
      tabGroupBackground: '#002200',
      tabGroupText: '#00ff00',
      tabGroupBorder: '#00ff00',
      
      // Content Area
      contentBackground: '#000000',
      contentBorder: '#00ff00',
      
      // Dialogs
      dialogBackground: '#001100',
      dialogText: '#00ff00',
      dialogBorder: '#00ff00',
      dialogShadow: '0 0 20px rgba(0, 255, 0, 0.5)',
      
      // Buttons
      buttonPrimary: '#00ff00',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#00cc00',
      buttonSecondaryText: '#000000',
      buttonHover: '#00cc00',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#000000',
      linuxTerminalBackground: '#001100',
      
      // Context Menus
      contextMenuBackground: '#001100',
      contextMenuText: '#00ff00',
      contextMenuHover: '#002200',
      contextMenuBorder: '#00ff00',
      contextMenuShadow: '0 0 20px rgba(0, 255, 0, 0.5)',
      '--ui-titlebar-accent': '#00ff00',
      '--ui-titlebar-text': '#00ff00'
    },
    statusBarPalette: {
      fondo: '#00ff00',
      texto: '#000000',
      disco: '#ffaa00',
      redUp: '#00ff00',
      redDown: '#00ff00',
      cpu: '#00ff00',
      memoria: '#00ff00',
      iconos: '#00ff00'
    }
  },

  'Neon Cyber': {
    name: 'Neon Cyber',
    colors: {
      // Sidebar
      sidebarBackground: '#0a0a0a',
      sidebarBorder: '#00ff88',
      sidebarText: '#00ff88',
      sidebarHover: '#001a0d',
      sidebarSelected: '#00ff88',
      sidebarGutter: '#00ff88',
      
      // Menu Bar (top)
      menuBarBackground: '#000000',
      menuBarText: '#00ff88',
      menuBarBorder: '#00ff88',
      menuBarHover: '#001a0d',
      
      // Status Bar (bottom)
      statusBarBackground: '#00ff88',
      statusBarText: '#000000',
      statusBarBorder: '#00ff88',
      
      // Tabs
      tabBackground: '#0a0a0a',
      tabActiveBackground: '#00ff88',
      tabHoverBackground: '#001a0d',
      tabText: '#00ff88',
      tabActiveText: '#000000',
      tabBorder: '#00ff88',
      tabCloseHover: '#ff0044',
      
      // Tab Groups
      tabGroupBackground: '#001a0d',
      tabGroupText: '#00ff88',
      tabGroupBorder: '#00ff88',
      
      // Content Area
      contentBackground: '#000000',
      contentBorder: '#00ff88',
      
      // Dialogs
      dialogBackground: '#0a0a0a',
      dialogText: '#00ff88',
      dialogBorder: '#00ff88',
      dialogShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
      
      // Buttons
      buttonPrimary: '#00ff88',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#ff0044',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#00cc6a',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#000000',
      linuxTerminalBackground: '#0a0a0a',
      
      // Context Menus
      contextMenuBackground: '#0a0a0a',
      contextMenuText: '#00ff88',
      contextMenuHover: '#001a0d',
      contextMenuBorder: '#00ff88',
      contextMenuShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
      '--ui-titlebar-accent': '#00ff88',
      '--ui-titlebar-text': '#00ff88'
    },
    statusBarPalette: {
      fondo: '#00ff88',
      texto: '#000000',
      disco: '#ffaa00',
      redUp: '#00ff88',
      redDown: '#00ff88',
      cpu: '#00ff88',
      memoria: '#00ff88',
      iconos: '#00ff88'
    }
  },

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
      dialogText: '#d6d8db',
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
      dialogText: '#b7cde3',
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
      dialogText: '#c9e7d3',
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
      dialogText: '#ddd',
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
      dialogText: '#6b4f3a',
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
      dialogText: '#c9d4ff',
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
      dialogText: '#5a4a6a',
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
      dialogText: '#6b5b47',
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
      dialogText: '#5a6b4a',
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
      dialogText: '#6b4a4a',
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
      dialogText: '#4a6b5a',
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
      dialogText: '#5a5752',
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
  }

};

// Categoría de temas modernos (correlacionados con los temas de pestañas Modernos)
const MODERN_UI_KEYS = [
  'Pro Slate', 'Pro Ocean', 'Pro Forest', 'Pro Indigo', 'Graphite', 
  'Modern Steel', 'Modern Copper', 'Modern Sage', 'Sandstone', 'Midnight Blue',
  'Elegant Taupe', 'Muted Teal', 'Arctic Frost', 'Purple Haze',
  'Soft Lavender', 'Warm Beige', 'Muted Sage', 'Dusty Rose', 'Soft Mint', 'Warm Gray'
];

// Exportar las categorías para uso en el ThemeSelector
export { CLASSIC_UI_KEYS, FUTURISTIC_UI_KEYS, MODERN_UI_KEYS }; 