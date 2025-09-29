// Temas animados de interfaz inspirados en temas de pestaña animados
// Categorías de temas de interfaz animados
const ANIMATED_UI_KEYS = [
  'Space Station Animated', 'Terminal Hacker Animated', 'Cyberpunk 2077 Animated',
  'Neon Matrix Animated', 'Quantum Flux Animated', 'Holographic Animated',
  'Cyber Grid Animated', 'Neon Aurora Animated', 'Plasma Animated'
];

export const animatedUiThemes = {
// === SECCIÓN ANIMADOS ===
  'Space Station Animated': {
    name: 'Space Station Animated',
    colors: {
      // Sidebar
      sidebarBackground: '#0a0f1f',
      sidebarBorder: '#00bcd4',
      sidebarText: '#9ee1ff',
      sidebarHover: '#0f1b33',
      sidebarSelected: '#00bcd4',
      sidebarGutter: '#00bcd4',
      
      // Menu Bar (top) - Con animación
      menuBarBackground: 'linear-gradient(90deg, #0f1b33 0%, #152540 50%, #0f1b33 100%)',
      menuBarText: '#00bcd4',
      menuBarBorder: '#00bcd4',
      menuBarHover: '#1a2a4a',
      
      // Status Bar (bottom)
      statusBarBackground: '#00bcd4',
      statusBarText: '#031018',
      statusBarBorder: '#00bcd4',
      
      // Tabs
      tabBackground: '#0a0f1f',
      tabActiveBackground: '#00bcd4',
      tabHoverBackground: '#0f1b33',
      tabText: '#9ee1ff',
      tabActiveText: '#031018',
      tabBorder: '#00bcd4',
      tabCloseHover: '#ff5722',
      
      // Tab Groups
      tabGroupBackground: '#0f1b33',
      tabGroupText: '#9ee1ff',
      tabGroupBorder: '#00bcd4',
      
      // Content Area
      contentBackground: '#0a0f1f',
      contentBorder: '#00bcd4',
      
      // Dialogs
      dialogBackground: '#0a0f1f',
      dialogText: '#9ee1ff',
      dialogBorder: '#00bcd4',
      dialogShadow: 'rgba(0, 188, 212, 0.35)',
      
      // Buttons
      buttonPrimary: '#00bcd4',
      buttonPrimaryText: '#031018',
      buttonSecondary: '#0f1b33',
      buttonSecondaryText: '#9ee1ff',
      buttonHover: '#26c6da',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a0f1f',
      linuxTerminalBackground: '#0f1b33',
      
      // Context Menus
      contextMenuBackground: '#0a0f1f',
      contextMenuText: '#9ee1ff',
      contextMenuBorder: '#00bcd4',
      contextMenuHover: '#0f1b33',
      
      // Scrollbars
      scrollbarTrack: '#0f1b33',
      scrollbarThumb: '#00bcd4',
      scrollbarThumbHover: '#26c6da',
      
      // Inputs
      inputBackground: '#0f1b33',
      inputText: '#9ee1ff',
      inputBorder: '#00bcd4',
      inputFocus: '#26c6da',
      
      // Animaciones específicas
      animationType: 'space-station',
      animationSpeed: 'normal'
    }
  },

  'Terminal Hacker Animated': {
    name: 'Terminal Hacker Animated',
    colors: {
      // Sidebar
      sidebarBackground: '#000000',
      sidebarBorder: '#00ff00',
      sidebarText: '#00ff00',
      sidebarHover: '#001100',
      sidebarSelected: '#00ff00',
      sidebarGutter: '#00ff00',
      
      // Menu Bar (top) - Con animación de terminal
      menuBarBackground: 'linear-gradient(90deg, #000000 0%, #001100 50%, #000000 100%)',
      menuBarText: '#00ff00',
      menuBarBorder: '#00ff00',
      menuBarHover: '#002200',
      
      // Status Bar (bottom)
      statusBarBackground: '#00ff00',
      statusBarText: '#000000',
      statusBarBorder: '#00ff00',
      
      // Tabs
      tabBackground: '#000000',
      tabActiveBackground: '#001100',
      tabHoverBackground: '#002200',
      tabText: '#00ff00',
      tabActiveText: '#00ff00',
      tabBorder: '#00ff00',
      tabCloseHover: '#ff0000',
      
      // Tab Groups
      tabGroupBackground: '#001100',
      tabGroupText: '#00ff00',
      tabGroupBorder: '#00ff00',
      
      // Content Area
      contentBackground: '#000000',
      contentBorder: '#00ff00',
      
      // Dialogs
      dialogBackground: '#000000',
      dialogText: '#00ff00',
      dialogBorder: '#00ff00',
      dialogShadow: 'rgba(0, 255, 0, 0.35)',
      
      // Buttons
      buttonPrimary: '#00ff00',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#001100',
      buttonSecondaryText: '#00ff00',
      buttonHover: '#33ff33',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#000000',
      linuxTerminalBackground: '#001100',
      
      // Context Menus
      contextMenuBackground: '#000000',
      contextMenuText: '#00ff00',
      contextMenuBorder: '#00ff00',
      contextMenuHover: '#001100',
      
      // Scrollbars
      scrollbarTrack: '#001100',
      scrollbarThumb: '#00ff00',
      scrollbarThumbHover: '#33ff33',
      
      // Inputs
      inputBackground: '#001100',
      inputText: '#00ff00',
      inputBorder: '#00ff00',
      inputFocus: '#33ff33',
      
      // Animaciones específicas
      animationType: 'terminal-hacker',
      animationSpeed: 'fast'
    }
  },

  'Cyberpunk 2077 Animated': {
    name: 'Cyberpunk 2077 Animated',
    colors: {
      // Sidebar
      sidebarBackground: '#0f0f0f',
      sidebarBorder: '#fcee21',
      sidebarText: '#fcee21',
      sidebarHover: '#1a1a1a',
      sidebarSelected: '#fcee21',
      sidebarGutter: '#fcee21',
      
      // Menu Bar (top) - Con animación cyberpunk
      menuBarBackground: 'linear-gradient(90deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)',
      menuBarText: '#fcee21',
      menuBarBorder: '#fcee21',
      menuBarHover: '#2a2a2a',
      
      // Status Bar (bottom)
      statusBarBackground: '#fcee21',
      statusBarText: '#000000',
      statusBarBorder: '#fcee21',
      
      // Tabs
      tabBackground: '#0f0f0f',
      tabActiveBackground: 'linear-gradient(135deg, #fcee21 0%, #ff0080 50%, #7928ca 100%)',
      tabHoverBackground: '#1a1a1a',
      tabText: '#fcee21',
      tabActiveText: '#000000',
      tabBorder: '#fcee21',
      tabCloseHover: '#ff0080',
      
      // Tab Groups
      tabGroupBackground: '#1a1a1a',
      tabGroupText: '#fcee21',
      tabGroupBorder: '#fcee21',
      
      // Content Area
      contentBackground: '#0f0f0f',
      contentBorder: '#fcee21',
      
      // Dialogs
      dialogBackground: '#0f0f0f',
      dialogText: '#fcee21',
      dialogBorder: '#fcee21',
      dialogShadow: 'rgba(252, 238, 33, 0.35)',
      
      // Buttons
      buttonPrimary: '#fcee21',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#1a1a1a',
      buttonSecondaryText: '#fcee21',
      buttonHover: '#ff0080',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0f0f0f',
      linuxTerminalBackground: '#1a1a1a',
      
      // Context Menus
      contextMenuBackground: '#0f0f0f',
      contextMenuText: '#fcee21',
      contextMenuBorder: '#fcee21',
      contextMenuHover: '#1a1a1a',
      
      // Scrollbars
      scrollbarTrack: '#1a1a1a',
      scrollbarThumb: '#fcee21',
      scrollbarThumbHover: '#ff0080',
      
      // Inputs
      inputBackground: '#1a1a1a',
      inputText: '#fcee21',
      inputBorder: '#fcee21',
      inputFocus: '#ff0080',
      
      // Animaciones específicas
      animationType: 'cyberpunk',
      animationSpeed: 'normal'
    }
  },

  'Neon Matrix Animated': {
    name: 'Neon Matrix Animated',
    colors: {
      // Sidebar
      sidebarBackground: '#000000',
      sidebarBorder: '#00ff41',
      sidebarText: '#00ff41',
      sidebarHover: '#001100',
      sidebarSelected: '#00ff41',
      sidebarGutter: '#00ff41',
      
      // Menu Bar (top) - Con animación matrix
      menuBarBackground: 'linear-gradient(90deg, #000000 0%, #001100 50%, #000000 100%)',
      menuBarText: '#00ff41',
      menuBarBorder: '#00ff41',
      menuBarHover: '#002200',
      
      // Status Bar (bottom)
      statusBarBackground: '#00ff41',
      statusBarText: '#000000',
      statusBarBorder: '#00ff41',
      
      // Tabs
      tabBackground: '#000000',
      tabActiveBackground: '#001100',
      tabHoverBackground: '#002200',
      tabText: '#00ff41',
      tabActiveText: '#00ff41',
      tabBorder: '#00ff41',
      tabCloseHover: '#ff0000',
      
      // Tab Groups
      tabGroupBackground: '#001100',
      tabGroupText: '#00ff41',
      tabGroupBorder: '#00ff41',
      
      // Content Area
      contentBackground: '#000000',
      contentBorder: '#00ff41',
      
      // Dialogs
      dialogBackground: '#000000',
      dialogText: '#00ff41',
      dialogBorder: '#00ff41',
      dialogShadow: 'rgba(0, 255, 65, 0.35)',
      
      // Buttons
      buttonPrimary: '#00ff41',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#001100',
      buttonSecondaryText: '#00ff41',
      buttonHover: '#33ff66',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#000000',
      linuxTerminalBackground: '#001100',
      
      // Context Menus
      contextMenuBackground: '#000000',
      contextMenuText: '#00ff41',
      contextMenuBorder: '#00ff41',
      contextMenuHover: '#001100',
      
      // Scrollbars
      scrollbarTrack: '#001100',
      scrollbarThumb: '#00ff41',
      scrollbarThumbHover: '#33ff66',
      
      // Inputs
      inputBackground: '#001100',
      inputText: '#00ff41',
      inputBorder: '#00ff41',
      inputFocus: '#33ff66',
      
      // Animaciones específicas
      animationType: 'matrix',
      animationSpeed: 'fast'
    }
  },

  'Quantum Flux Animated': {
    name: 'Quantum Flux Animated',
    colors: {
      // Sidebar
      sidebarBackground: '#0a0a0a',
      sidebarBorder: '#8b5cf6',
      sidebarText: '#a78bfa',
      sidebarHover: '#1a1a1a',
      sidebarSelected: '#8b5cf6',
      sidebarGutter: '#8b5cf6',
      
      // Menu Bar (top) - Con animación cuántica
      menuBarBackground: 'linear-gradient(90deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
      menuBarText: '#8b5cf6',
      menuBarBorder: '#8b5cf6',
      menuBarHover: '#2a2a2a',
      
      // Status Bar (bottom)
      statusBarBackground: '#8b5cf6',
      statusBarText: '#ffffff',
      statusBarBorder: '#8b5cf6',
      
      // Tabs
      tabBackground: '#0a0a0a',
      tabActiveBackground: '#8b5cf6',
      tabHoverBackground: '#1a1a1a',
      tabText: '#a78bfa',
      tabActiveText: '#ffffff',
      tabBorder: '#8b5cf6',
      tabCloseHover: '#f59e0b',
      
      // Tab Groups
      tabGroupBackground: '#1a1a1a',
      tabGroupText: '#a78bfa',
      tabGroupBorder: '#8b5cf6',
      
      // Content Area
      contentBackground: '#0a0a0a',
      contentBorder: '#8b5cf6',
      
      // Dialogs
      dialogBackground: '#0a0a0a',
      dialogText: '#a78bfa',
      dialogBorder: '#8b5cf6',
      dialogShadow: 'rgba(139, 92, 246, 0.35)',
      
      // Buttons
      buttonPrimary: '#8b5cf6',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#1a1a1a',
      buttonSecondaryText: '#a78bfa',
      buttonHover: '#a78bfa',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a0a0a',
      linuxTerminalBackground: '#1a1a1a',
      
      // Context Menus
      contextMenuBackground: '#0a0a0a',
      contextMenuText: '#a78bfa',
      contextMenuBorder: '#8b5cf6',
      contextMenuHover: '#1a1a1a',
      
      // Scrollbars
      scrollbarTrack: '#1a1a1a',
      scrollbarThumb: '#8b5cf6',
      scrollbarThumbHover: '#a78bfa',
      
      // Inputs
      inputBackground: '#1a1a1a',
      inputText: '#a78bfa',
      inputBorder: '#8b5cf6',
      inputFocus: '#a78bfa',
      
      // Animaciones específicas
      animationType: 'quantum-flux',
      animationSpeed: 'normal'
    }
  },

  'Holographic Animated': {
    name: 'Holographic Animated',
    colors: {
      // Sidebar
      sidebarBackground: '#0f0f23',
      sidebarBorder: '#00d4ff',
      sidebarText: '#9ee1ff',
      sidebarHover: '#1a1a3a',
      sidebarSelected: '#00d4ff',
      sidebarGutter: '#00d4ff',
      
      // Menu Bar (top) - Con animación holográfica
      menuBarBackground: 'linear-gradient(90deg, #0f0f23 0%, #1a1a3a 50%, #0f0f23 100%)',
      menuBarText: '#00d4ff',
      menuBarBorder: '#00d4ff',
      menuBarHover: '#2a2a4a',
      
      // Status Bar (bottom)
      statusBarBackground: '#00d4ff',
      statusBarText: '#0f0f23',
      statusBarBorder: '#00d4ff',
      
      // Tabs
      tabBackground: '#0f0f23',
      tabActiveBackground: '#00d4ff',
      tabHoverBackground: '#1a1a3a',
      tabText: '#9ee1ff',
      tabActiveText: '#0f0f23',
      tabBorder: '#00d4ff',
      tabCloseHover: '#ff6b6b',
      
      // Tab Groups
      tabGroupBackground: '#1a1a3a',
      tabGroupText: '#9ee1ff',
      tabGroupBorder: '#00d4ff',
      
      // Content Area
      contentBackground: '#0f0f23',
      contentBorder: '#00d4ff',
      
      // Dialogs
      dialogBackground: '#0f0f23',
      dialogText: '#9ee1ff',
      dialogBorder: '#00d4ff',
      dialogShadow: 'rgba(0, 212, 255, 0.35)',
      
      // Buttons
      buttonPrimary: '#00d4ff',
      buttonPrimaryText: '#0f0f23',
      buttonSecondary: '#1a1a3a',
      buttonSecondaryText: '#9ee1ff',
      buttonHover: '#33d9ff',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0f0f23',
      linuxTerminalBackground: '#1a1a3a',
      
      // Context Menus
      contextMenuBackground: '#0f0f23',
      contextMenuText: '#9ee1ff',
      contextMenuBorder: '#00d4ff',
      contextMenuHover: '#1a1a3a',
      
      // Scrollbars
      scrollbarTrack: '#1a1a3a',
      scrollbarThumb: '#00d4ff',
      scrollbarThumbHover: '#33d9ff',
      
      // Inputs
      inputBackground: '#1a1a3a',
      inputText: '#9ee1ff',
      inputBorder: '#00d4ff',
      inputFocus: '#33d9ff',
      
      // Animaciones específicas
      animationType: 'holographic',
      animationSpeed: 'slow'
    }
  },

  'Cyber Grid Animated': {
    name: 'Cyber Grid Animated',
    colors: {
      // Sidebar
      sidebarBackground: '#0a0a0a',
      sidebarBorder: '#00ff88',
      sidebarText: '#00ff88',
      sidebarHover: '#1a1a1a',
      sidebarSelected: '#00ff88',
      sidebarGutter: '#00ff88',
      
      // Menu Bar (top) - Con animación de grid
      menuBarBackground: 'linear-gradient(90deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
      menuBarText: '#00ff88',
      menuBarBorder: '#00ff88',
      menuBarHover: '#2a2a2a',
      
      // Status Bar (bottom)
      statusBarBackground: '#00ff88',
      statusBarText: '#000000',
      statusBarBorder: '#00ff88',
      
      // Tabs
      tabBackground: '#0a0a0a',
      tabActiveBackground: '#00ff88',
      tabHoverBackground: '#1a1a1a',
      tabText: '#00ff88',
      tabActiveText: '#000000',
      tabBorder: '#00ff88',
      tabCloseHover: '#ff4444',
      
      // Tab Groups
      tabGroupBackground: '#1a1a1a',
      tabGroupText: '#00ff88',
      tabGroupBorder: '#00ff88',
      
      // Content Area
      contentBackground: '#0a0a0a',
      contentBorder: '#00ff88',
      
      // Dialogs
      dialogBackground: '#0a0a0a',
      dialogText: '#00ff88',
      dialogBorder: '#00ff88',
      dialogShadow: 'rgba(0, 255, 136, 0.35)',
      
      // Buttons
      buttonPrimary: '#00ff88',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#1a1a1a',
      buttonSecondaryText: '#00ff88',
      buttonHover: '#33ffaa',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a0a0a',
      linuxTerminalBackground: '#1a1a1a',
      
      // Context Menus
      contextMenuBackground: '#0a0a0a',
      contextMenuText: '#00ff88',
      contextMenuBorder: '#00ff88',
      contextMenuHover: '#1a1a1a',
      
      // Scrollbars
      scrollbarTrack: '#1a1a1a',
      scrollbarThumb: '#00ff88',
      scrollbarThumbHover: '#33ffaa',
      
      // Inputs
      inputBackground: '#1a1a1a',
      inputText: '#00ff88',
      inputBorder: '#00ff88',
      inputFocus: '#33ffaa',
      
      // Animaciones específicas
      animationType: 'cyber-grid',
      animationSpeed: 'fast'
    }
  },

  'Neon Aurora Animated': {
    name: 'Neon Aurora Animated',
    colors: {
      // Sidebar
      sidebarBackground: '#0a0f1f',
      sidebarBorder: '#ff6b9d',
      sidebarText: '#ffb3d1',
      sidebarHover: '#1a1f3f',
      sidebarSelected: '#ff6b9d',
      sidebarGutter: '#ff6b9d',
      
      // Menu Bar (top) - Con animación aurora
      menuBarBackground: 'linear-gradient(90deg, #0a0f1f 0%, #1a1f3f 50%, #0a0f1f 100%)',
      menuBarText: '#ff6b9d',
      menuBarBorder: '#ff6b9d',
      menuBarHover: '#2a2f4f',
      
      // Status Bar (bottom)
      statusBarBackground: '#ff6b9d',
      statusBarText: '#0a0f1f',
      statusBarBorder: '#ff6b9d',
      
      // Tabs
      tabBackground: '#0a0f1f',
      tabActiveBackground: '#ff6b9d',
      tabHoverBackground: '#1a1f3f',
      tabText: '#ffb3d1',
      tabActiveText: '#0a0f1f',
      tabBorder: '#ff6b9d',
      tabCloseHover: '#ff4444',
      
      // Tab Groups
      tabGroupBackground: '#1a1f3f',
      tabGroupText: '#ffb3d1',
      tabGroupBorder: '#ff6b9d',
      
      // Content Area
      contentBackground: '#0a0f1f',
      contentBorder: '#ff6b9d',
      
      // Dialogs
      dialogBackground: '#0a0f1f',
      dialogText: '#ffb3d1',
      dialogBorder: '#ff6b9d',
      dialogShadow: 'rgba(255, 107, 157, 0.35)',
      
      // Buttons
      buttonPrimary: '#ff6b9d',
      buttonPrimaryText: '#0a0f1f',
      buttonSecondary: '#1a1f3f',
      buttonSecondaryText: '#ffb3d1',
      buttonHover: '#ff8bb3',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#0a0f1f',
      linuxTerminalBackground: '#1a1f3f',
      
      // Context Menus
      contextMenuBackground: '#0a0f1f',
      contextMenuText: '#ffb3d1',
      contextMenuBorder: '#ff6b9d',
      contextMenuHover: '#1a1f3f',
      
      // Scrollbars
      scrollbarTrack: '#1a1f3f',
      scrollbarThumb: '#ff6b9d',
      scrollbarThumbHover: '#ff8bb3',
      
      // Inputs
      inputBackground: '#1a1f3f',
      inputText: '#ffb3d1',
      inputBorder: '#ff6b9d',
      inputFocus: '#ff8bb3',
      
      // Animaciones específicas
      animationType: 'neon-aurora',
      animationSpeed: 'normal'
    }
  },

  'Plasma Animated': {
    name: 'Plasma Animated',
    colors: {
      // Sidebar
      sidebarBackground: '#1a0a2e',
      sidebarBorder: '#ff0080',
      sidebarText: '#ff80bf',
      sidebarHover: '#2a1a3e',
      sidebarSelected: '#ff0080',
      sidebarGutter: '#ff0080',
      
      // Menu Bar (top) - Con animación plasma
      menuBarBackground: 'linear-gradient(90deg, #1a0a2e 0%, #2a1a3e 50%, #1a0a2e 100%)',
      menuBarText: '#ff0080',
      menuBarBorder: '#ff0080',
      menuBarHover: '#3a2a4e',
      
      // Status Bar (bottom)
      statusBarBackground: '#ff0080',
      statusBarText: '#ffffff',
      statusBarBorder: '#ff0080',
      
      // Tabs
      tabBackground: '#1a0a2e',
      tabActiveBackground: '#ff0080',
      tabHoverBackground: '#2a1a3e',
      tabText: '#ff80bf',
      tabActiveText: '#ffffff',
      tabBorder: '#ff0080',
      tabCloseHover: '#ff4444',
      
      // Tab Groups
      tabGroupBackground: '#2a1a3e',
      tabGroupText: '#ff80bf',
      tabGroupBorder: '#ff0080',
      
      // Content Area
      contentBackground: '#1a0a2e',
      contentBorder: '#ff0080',
      
      // Dialogs
      dialogBackground: '#1a0a2e',
      dialogText: '#ff80bf',
      dialogBorder: '#ff0080',
      dialogShadow: 'rgba(255, 0, 128, 0.35)',
      
      // Buttons
      buttonPrimary: '#ff0080',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#2a1a3e',
      buttonSecondaryText: '#ff80bf',
      buttonHover: '#ff3399',
      
      // Terminal Backgrounds
      powershellTerminalBackground: '#1a0a2e',
      linuxTerminalBackground: '#2a1a3e',
      
      // Context Menus
      contextMenuBackground: '#1a0a2e',
      contextMenuText: '#ff80bf',
      contextMenuBorder: '#ff0080',
      contextMenuHover: '#2a1a3e',
      
      // Scrollbars
      scrollbarTrack: '#2a1a3e',
      scrollbarThumb: '#ff0080',
      scrollbarThumbHover: '#ff3399',
      
      // Inputs
      inputBackground: '#2a1a3e',
      inputText: '#ff80bf',
      inputBorder: '#ff0080',
      inputFocus: '#ff3399',
      
      // Animaciones específicas
      animationType: 'plasma',
      animationSpeed: 'normal'
    }
  }
};

export { ANIMATED_UI_KEYS };
