// Importar temas clásicos
import { classicUiThemes, CLASSIC_UI_KEYS } from './classic-ui-themes.js';

// Categorías de temas de interfaz

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
  ...classicUiThemes,

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