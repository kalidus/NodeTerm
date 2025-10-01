// Temas animados de interfaz inspirados en temas de pestaña animados
// Categorías de temas de interfaz animados
const ANIMATED_UI_KEYS = [
  'Space Station Animated', 'Terminal Hacker Animated', 'Cyberpunk 2077 Animated',
  'Neon Matrix Animated', 'Neon Matrix Blue Animated', 'Meteor Shower Animated', 'Quantum Flux Animated', 'Holographic Animated',
  'Cyber Grid Animated', 'Neon Aurora Animated', 'Plasma Animated',
  // Nuevos temas basados en Meteor Shower
  'Fire Storm Animated', 'Emerald Rain Animated', 'Purple Nebula Animated', 'Golden Galaxy Animated',
  'Crimson Comet Animated', 'Arctic Aurora Animated', 'Cosmic Storm Animated', 'Solar Flare Animated',
  'Winter Snowfall Animated', 'Thunderstorm Animated'
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

  'Neon Matrix Blue Animated': {
    name: 'Neon Matrix Blue Animated',
    colors: {
      // Sidebar
      sidebarBackground: '#000000',
      sidebarBorder: '#0080ff',
      sidebarText: '#0080ff',
      sidebarHover: '#000011',
      sidebarSelected: '#0080ff',
      sidebarGutter: '#0080ff',
      
      // Menu Bar (top) - Con animación matrix azul
      menuBarBackground: 'linear-gradient(90deg, #000000 0%, #000022 25%, #000044 50%, #000022 75%, #000000 100%)',
      menuBarText: '#0080ff',
      menuBarBorder: '#0080ff',
      menuBarHover: '#000022',
      
      // Status Bar (bottom)
      statusBarBackground: '#0080ff',
      statusBarText: '#000000',
      statusBarBorder: '#0080ff',
      
      // Tabs
      tabBackground: '#000000',
      tabActiveBackground: '#000011',
      tabHoverBackground: '#000022',
      tabText: '#0080ff',
      tabActiveText: '#0080ff',
      tabBorder: '#0080ff',
      tabCloseHover: '#ff0000',
      
      // Tab Groups
      tabGroupBackground: '#000011',
      tabGroupText: '#0080ff',
      tabGroupBorder: '#0080ff',
      
      // Content Area
      contentBackground: '#000000',
      contentBorder: '#0080ff',
      
      // Dialogs
      dialogBackground: '#000000',
      dialogText: '#0080ff',
      dialogBorder: '#0080ff',
      dialogShadow: 'rgba(0, 128, 255, 0.35)',
      
      // Buttons
      buttonPrimary: '#0080ff',
      buttonPrimaryText: '#000000',
      buttonPrimaryHover: '#0099ff',
      buttonSecondary: '#000011',
      buttonSecondaryText: '#0080ff',
      buttonSecondaryHover: '#000022',
      buttonDanger: '#ff0000',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#ff3333',
      
      // Form Elements
      inputBackground: '#000000',
      inputText: '#0080ff',
      inputBorder: '#0080ff',
      inputFocus: '#33aaff',
      
      // Animaciones específicas
      animationType: 'matrix-blue',
      animationSpeed: 'fast'
    }
  },

  'Meteor Shower Animated': {
    name: 'Meteor Shower Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#79b8ff',
      sidebarText: '#cfe6ff',
      sidebarHover: 'rgba(121, 184, 255, 0.1)',
      sidebarSelected: 'rgba(121, 184, 255, 0.2)',
      sidebarGutter: '#79b8ff',
      
      // Menu Bar (top) - Con animación meteor shower
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #1a2333 0%, #0b1220 70%)',
      menuBarText: '#cfe6ff',
      menuBarBorder: '#79b8ff',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #1c2740 0%, #0d1526 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#79b8ff',
      statusBarText: '#08101d',
      statusBarBorder: '#79b8ff',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #1a2333 0%, #0b1220 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #79b8ff 0%, #4f9dff 60%, #7a6cff 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #1c2740 0%, #0d1526 70%)',
      tabText: '#cfe6ff',
      tabActiveText: '#08101d',
      tabBorder: '#79b8ff',
      tabCloseHover: '#7a6cff',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#cfe6ff',
      tabGroupBorder: '#79b8ff',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #1a2333 0%, #0b1220 70%)',
      contentBorder: '#79b8ff',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #1a2333 0%, #0b1220 70%)',
      dialogText: '#cfe6ff',
      dialogBorder: '#79b8ff',
      dialogShadow: 'rgba(121, 184, 255, 0.35)',
      
      // Buttons
      buttonPrimary: '#79b8ff',
      buttonPrimaryText: '#08101d',
      buttonPrimaryHover: '#4f9dff',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#cfe6ff',
      buttonSecondaryHover: 'rgba(121, 184, 255, 0.1)',
      buttonDanger: '#ff0000',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#ff3333',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #1a2333 0%, #0b1220 70%)',
      inputText: '#cfe6ff',
      inputBorder: '#79b8ff',
      inputFocus: '#4f9dff',
      
      // Animaciones específicas
      animationType: 'meteor-shower',
      animationSpeed: 'normal'
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
  },

  // ========================================
  // NUEVOS TEMAS BASADOS EN METEOR SHOWER
  // ========================================

  'Fire Storm Animated': {
    name: 'Fire Storm Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#ff5722',
      sidebarText: '#ffccbc',
      sidebarHover: 'rgba(255, 87, 34, 0.1)',
      sidebarSelected: 'rgba(255, 87, 34, 0.2)',
      sidebarGutter: '#ff5722',
      
      // Menu Bar (top) - Con animación fire storm
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #2d1410 0%, #0d0604 70%)',
      menuBarText: '#ffccbc',
      menuBarBorder: '#ff5722',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #3d1810 0%, #1d0a04 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#ff5722',
      statusBarText: '#0d0604',
      statusBarBorder: '#ff5722',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #2d1410 0%, #0d0604 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #ff5722 0%, #ff9800 60%, #ffc107 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #3d1810 0%, #1d0a04 70%)',
      tabText: '#ffccbc',
      tabActiveText: '#0d0604',
      tabBorder: '#ff5722',
      tabCloseHover: '#ffc107',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#ffccbc',
      tabGroupBorder: '#ff5722',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #2d1410 0%, #0d0604 70%)',
      contentBorder: '#ff5722',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #2d1410 0%, #0d0604 70%)',
      dialogText: '#ffccbc',
      dialogBorder: '#ff5722',
      dialogShadow: 'rgba(255, 87, 34, 0.4)',
      
      // Buttons
      buttonPrimary: '#ff5722',
      buttonPrimaryText: '#0d0604',
      buttonPrimaryHover: '#ff9800',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#ffccbc',
      buttonSecondaryHover: 'rgba(255, 87, 34, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #2d1410 0%, #0d0604 70%)',
      inputText: '#ffccbc',
      inputBorder: '#ff5722',
      inputFocus: '#ff9800',
      
      // Animaciones específicas
      animationType: 'fire-storm',
      animationSpeed: 'fast'
    }
  },

  'Emerald Rain Animated': {
    name: 'Emerald Rain Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#00e676',
      sidebarText: '#b9f6ca',
      sidebarHover: 'rgba(0, 230, 118, 0.1)',
      sidebarSelected: 'rgba(0, 230, 118, 0.2)',
      sidebarGutter: '#00e676',
      
      // Menu Bar (top) - Con animación emerald rain
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #0d2d1f 0%, #040d08 70%)',
      menuBarText: '#b9f6ca',
      menuBarBorder: '#00e676',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #1d3d2f 0%, #0d1d18 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#00e676',
      statusBarText: '#040d08',
      statusBarBorder: '#00e676',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #0d2d1f 0%, #040d08 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #00e676 0%, #1de9b6 60%, #00c853 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #1d3d2f 0%, #0d1d18 70%)',
      tabText: '#b9f6ca',
      tabActiveText: '#040d08',
      tabBorder: '#00e676',
      tabCloseHover: '#76ff03',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#b9f6ca',
      tabGroupBorder: '#00e676',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #0d2d1f 0%, #040d08 70%)',
      contentBorder: '#00e676',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #0d2d1f 0%, #040d08 70%)',
      dialogText: '#b9f6ca',
      dialogBorder: '#00e676',
      dialogShadow: 'rgba(0, 230, 118, 0.4)',
      
      // Buttons
      buttonPrimary: '#00e676',
      buttonPrimaryText: '#040d08',
      buttonPrimaryHover: '#1de9b6',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#b9f6ca',
      buttonSecondaryHover: 'rgba(0, 230, 118, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #0d2d1f 0%, #040d08 70%)',
      inputText: '#b9f6ca',
      inputBorder: '#00e676',
      inputFocus: '#1de9b6',
      
      // Animaciones específicas
      animationType: 'emerald-rain',
      animationSpeed: 'normal'
    }
  },

  'Purple Nebula Animated': {
    name: 'Purple Nebula Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#9c27b0',
      sidebarText: '#e1bee7',
      sidebarHover: 'rgba(156, 39, 176, 0.1)',
      sidebarSelected: 'rgba(156, 39, 176, 0.2)',
      sidebarGutter: '#9c27b0',
      
      // Menu Bar (top) - Con animación purple nebula
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #2d1a33 0%, #0d0612 70%)',
      menuBarText: '#e1bee7',
      menuBarBorder: '#9c27b0',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #3d2a43 0%, #1d1622 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#9c27b0',
      statusBarText: '#ffffff',
      statusBarBorder: '#9c27b0',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #2d1a33 0%, #0d0612 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 60%, #e91e63 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #3d2a43 0%, #1d1622 70%)',
      tabText: '#e1bee7',
      tabActiveText: '#ffffff',
      tabBorder: '#9c27b0',
      tabCloseHover: '#e91e63',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#e1bee7',
      tabGroupBorder: '#9c27b0',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #2d1a33 0%, #0d0612 70%)',
      contentBorder: '#9c27b0',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #2d1a33 0%, #0d0612 70%)',
      dialogText: '#e1bee7',
      dialogBorder: '#9c27b0',
      dialogShadow: 'rgba(156, 39, 176, 0.5)',
      
      // Buttons
      buttonPrimary: '#9c27b0',
      buttonPrimaryText: '#ffffff',
      buttonPrimaryHover: '#ba68c8',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#e1bee7',
      buttonSecondaryHover: 'rgba(156, 39, 176, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #2d1a33 0%, #0d0612 70%)',
      inputText: '#e1bee7',
      inputBorder: '#9c27b0',
      inputFocus: '#ba68c8',
      
      // Animaciones específicas
      animationType: 'purple-nebula',
      animationSpeed: 'normal'
    }
  },

  'Golden Galaxy Animated': {
    name: 'Golden Galaxy Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#ffd700',
      sidebarText: '#fff9c4',
      sidebarHover: 'rgba(255, 215, 0, 0.1)',
      sidebarSelected: 'rgba(255, 215, 0, 0.2)',
      sidebarGutter: '#ffd700',
      
      // Menu Bar (top) - Con animación golden galaxy
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #2d2410 0%, #0d0a04 70%)',
      menuBarText: '#fff9c4',
      menuBarBorder: '#ffd700',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #3d3420 0%, #1d1a14 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#ffd700',
      statusBarText: '#0d0a04',
      statusBarBorder: '#ffd700',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #2d2410 0%, #0d0a04 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #ffd700 0%, #ffc107 60%, #ffeb3b 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #3d3420 0%, #1d1a14 70%)',
      tabText: '#fff9c4',
      tabActiveText: '#0d0a04',
      tabBorder: '#ffd700',
      tabCloseHover: '#ffeb3b',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#fff9c4',
      tabGroupBorder: '#ffd700',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #2d2410 0%, #0d0a04 70%)',
      contentBorder: '#ffd700',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #2d2410 0%, #0d0a04 70%)',
      dialogText: '#fff9c4',
      dialogBorder: '#ffd700',
      dialogShadow: 'rgba(255, 215, 0, 0.5)',
      
      // Buttons
      buttonPrimary: '#ffd700',
      buttonPrimaryText: '#0d0a04',
      buttonPrimaryHover: '#ffc107',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#fff9c4',
      buttonSecondaryHover: 'rgba(255, 215, 0, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #2d2410 0%, #0d0a04 70%)',
      inputText: '#fff9c4',
      inputBorder: '#ffd700',
      inputFocus: '#ffc107',
      
      // Animaciones específicas
      animationType: 'golden-galaxy',
      animationSpeed: 'normal'
    }
  },

  'Crimson Comet Animated': {
    name: 'Crimson Comet Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#dc143c',
      sidebarText: '#ffcdd2',
      sidebarHover: 'rgba(220, 20, 60, 0.1)',
      sidebarSelected: 'rgba(220, 20, 60, 0.2)',
      sidebarGutter: '#dc143c',
      
      // Menu Bar (top) - Con animación crimson comet
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #330d1a 0%, #0d0406 70%)',
      menuBarText: '#ffcdd2',
      menuBarBorder: '#dc143c',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #431d2a 0%, #1d1416 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#dc143c',
      statusBarText: '#ffffff',
      statusBarBorder: '#dc143c',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #330d1a 0%, #0d0406 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #dc143c 0%, #ff69b4 60%, #c71585 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #431d2a 0%, #1d1416 70%)',
      tabText: '#ffcdd2',
      tabActiveText: '#ffffff',
      tabBorder: '#dc143c',
      tabCloseHover: '#ff69b4',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#ffcdd2',
      tabGroupBorder: '#dc143c',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #330d1a 0%, #0d0406 70%)',
      contentBorder: '#dc143c',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #330d1a 0%, #0d0406 70%)',
      dialogText: '#ffcdd2',
      dialogBorder: '#dc143c',
      dialogShadow: 'rgba(220, 20, 60, 0.5)',
      
      // Buttons
      buttonPrimary: '#dc143c',
      buttonPrimaryText: '#ffffff',
      buttonPrimaryHover: '#ff69b4',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#ffcdd2',
      buttonSecondaryHover: 'rgba(220, 20, 60, 0.1)',
      buttonDanger: '#b71c1c',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#d32f2f',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #330d1a 0%, #0d0406 70%)',
      inputText: '#ffcdd2',
      inputBorder: '#dc143c',
      inputFocus: '#ff69b4',
      
      // Animaciones específicas
      animationType: 'crimson-comet',
      animationSpeed: 'fast'
    }
  },

  'Arctic Aurora Animated': {
    name: 'Arctic Aurora Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#00ffff',
      sidebarText: '#e0f7fa',
      sidebarHover: 'rgba(0, 255, 255, 0.1)',
      sidebarSelected: 'rgba(0, 255, 255, 0.2)',
      sidebarGutter: '#00ffff',
      
      // Menu Bar (top) - Con animación arctic aurora
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #0d1f2d 0%, #040a0d 70%)',
      menuBarText: '#e0f7fa',
      menuBarBorder: '#00ffff',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #1d2f3d 0%, #0d1a1d 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#00ffff',
      statusBarText: '#040a0d',
      statusBarBorder: '#00ffff',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #0d1f2d 0%, #040a0d 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #00ffff 0%, #7fffd4 60%, #40e0d0 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #1d2f3d 0%, #0d1a1d 70%)',
      tabText: '#e0f7fa',
      tabActiveText: '#040a0d',
      tabBorder: '#00ffff',
      tabCloseHover: '#7fffd4',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#e0f7fa',
      tabGroupBorder: '#00ffff',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #0d1f2d 0%, #040a0d 70%)',
      contentBorder: '#00ffff',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #0d1f2d 0%, #040a0d 70%)',
      dialogText: '#e0f7fa',
      dialogBorder: '#00ffff',
      dialogShadow: 'rgba(0, 255, 255, 0.5)',
      
      // Buttons
      buttonPrimary: '#00ffff',
      buttonPrimaryText: '#040a0d',
      buttonPrimaryHover: '#7fffd4',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#e0f7fa',
      buttonSecondaryHover: 'rgba(0, 255, 255, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #0d1f2d 0%, #040a0d 70%)',
      inputText: '#e0f7fa',
      inputBorder: '#00ffff',
      inputFocus: '#7fffd4',
      
      // Animaciones específicas
      animationType: 'arctic-aurora',
      animationSpeed: 'normal'
    }
  },

  'Cosmic Storm Animated': {
    name: 'Cosmic Storm Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#8a2be2',
      sidebarText: '#e1d5e7',
      sidebarHover: 'rgba(138, 43, 226, 0.1)',
      sidebarSelected: 'rgba(138, 43, 226, 0.2)',
      sidebarGutter: '#8a2be2',
      
      // Menu Bar (top) - Con animación cosmic storm (multicolor)
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #1a1a2e 0%, #06060e 70%)',
      menuBarText: '#e1d5e7',
      menuBarBorder: '#8a2be2',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #2a2a3e 0%, #16161e 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: 'linear-gradient(90deg, #8a2be2 0%, #ff00ff 50%, #00ffff 100%)',
      statusBarText: '#ffffff',
      statusBarBorder: '#8a2be2',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #1a1a2e 0%, #06060e 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #8a2be2 0%, #ff00ff 33%, #00ffff 66%, #ffff00 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #2a2a3e 0%, #16161e 70%)',
      tabText: '#e1d5e7',
      tabActiveText: '#ffffff',
      tabBorder: '#8a2be2',
      tabCloseHover: '#ff00ff',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#e1d5e7',
      tabGroupBorder: '#8a2be2',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #1a1a2e 0%, #06060e 70%)',
      contentBorder: '#8a2be2',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #1a1a2e 0%, #06060e 70%)',
      dialogText: '#e1d5e7',
      dialogBorder: '#8a2be2',
      dialogShadow: 'rgba(138, 43, 226, 0.5)',
      
      // Buttons
      buttonPrimary: '#8a2be2',
      buttonPrimaryText: '#ffffff',
      buttonPrimaryHover: '#ff00ff',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#e1d5e7',
      buttonSecondaryHover: 'rgba(138, 43, 226, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #1a1a2e 0%, #06060e 70%)',
      inputText: '#e1d5e7',
      inputBorder: '#8a2be2',
      inputFocus: '#ff00ff',
      
      // Animaciones específicas
      animationType: 'cosmic-storm',
      animationSpeed: 'fast'
    }
  },

  'Solar Flare Animated': {
    name: 'Solar Flare Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#ff8c00',
      sidebarText: '#ffe0b2',
      sidebarHover: 'rgba(255, 140, 0, 0.1)',
      sidebarSelected: 'rgba(255, 140, 0, 0.2)',
      sidebarGutter: '#ff8c00',
      
      // Menu Bar (top) - Con animación solar flare
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #331a00 0%, #0d0600 70%)',
      menuBarText: '#ffe0b2',
      menuBarBorder: '#ff8c00',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #432a10 0%, #1d1610 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#ff8c00',
      statusBarText: '#0d0600',
      statusBarBorder: '#ff8c00',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #331a00 0%, #0d0600 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #ff8c00 0%, #ffa500 60%, #ff4500 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #432a10 0%, #1d1610 70%)',
      tabText: '#ffe0b2',
      tabActiveText: '#0d0600',
      tabBorder: '#ff8c00',
      tabCloseHover: '#ff4500',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#ffe0b2',
      tabGroupBorder: '#ff8c00',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #331a00 0%, #0d0600 70%)',
      contentBorder: '#ff8c00',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #331a00 0%, #0d0600 70%)',
      dialogText: '#ffe0b2',
      dialogBorder: '#ff8c00',
      dialogShadow: 'rgba(255, 140, 0, 0.6)',
      
      // Buttons
      buttonPrimary: '#ff8c00',
      buttonPrimaryText: '#0d0600',
      buttonPrimaryHover: '#ffa500',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#ffe0b2',
      buttonSecondaryHover: 'rgba(255, 140, 0, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #331a00 0%, #0d0600 70%)',
      inputText: '#ffe0b2',
      inputBorder: '#ff8c00',
      inputFocus: '#ffa500',
      
      // Animaciones específicas
      animationType: 'solar-flare',
      animationSpeed: 'fast'
    }
  },

  'Winter Snowfall Animated': {
    name: 'Winter Snowfall Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#bbdefb',
      sidebarText: '#e3f2fd',
      sidebarHover: 'rgba(187, 222, 251, 0.1)',
      sidebarSelected: 'rgba(187, 222, 251, 0.2)',
      sidebarGutter: '#bbdefb',
      
      // Menu Bar (top) - Con animación winter snowfall
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #1a2840 0%, #0a1420 70%)',
      menuBarText: '#e3f2fd',
      menuBarBorder: '#bbdefb',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #2a3850 0%, #1a2430 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#bbdefb',
      statusBarText: '#0a1420',
      statusBarBorder: '#bbdefb',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #1a2840 0%, #0a1420 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #bbdefb 0%, #90caf9 60%, #e3f2fd 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #2a3850 0%, #1a2430 70%)',
      tabText: '#e3f2fd',
      tabActiveText: '#0a1420',
      tabBorder: '#bbdefb',
      tabCloseHover: '#90caf9',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#e3f2fd',
      tabGroupBorder: '#bbdefb',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #1a2840 0%, #0a1420 70%)',
      contentBorder: '#bbdefb',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #1a2840 0%, #0a1420 70%)',
      dialogText: '#e3f2fd',
      dialogBorder: '#bbdefb',
      dialogShadow: 'rgba(187, 222, 251, 0.5)',
      
      // Buttons
      buttonPrimary: '#bbdefb',
      buttonPrimaryText: '#0a1420',
      buttonPrimaryHover: '#90caf9',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#e3f2fd',
      buttonSecondaryHover: 'rgba(187, 222, 251, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #1a2840 0%, #0a1420 70%)',
      inputText: '#e3f2fd',
      inputBorder: '#bbdefb',
      inputFocus: '#90caf9',
      
      // Terminal Backgrounds
      powershellTerminalBackground: 'radial-gradient(circle at 20% 20%, #1a2840 0%, #0a1420 70%)',
      linuxTerminalBackground: 'radial-gradient(circle at 20% 20%, #1a2840 0%, #0a1420 70%)',
      
      // Context Menus
      contextMenuBackground: 'radial-gradient(circle at 20% 20%, #1a2840 0%, #0a1420 70%)',
      contextMenuText: '#e3f2fd',
      contextMenuBorder: '#bbdefb',
      contextMenuHover: 'rgba(187, 222, 251, 0.1)',
      
      // Scrollbars
      scrollbarTrack: 'rgba(26, 40, 64, 0.5)',
      scrollbarThumb: '#bbdefb',
      scrollbarThumbHover: '#90caf9',
      
      // Inputs
      inputBackground: 'radial-gradient(circle at 20% 20%, #1a2840 0%, #0a1420 70%)',
      inputText: '#e3f2fd',
      inputBorder: '#bbdefb',
      inputFocus: '#90caf9',
      
      // Animaciones específicas
      animationType: 'winter-snowfall',
      animationSpeed: 'slow'
    }
  },

  'Thunderstorm Animated': {
    name: 'Thunderstorm Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#6495ed',
      sidebarText: '#b0c4de',
      sidebarHover: 'rgba(100, 149, 237, 0.1)',
      sidebarSelected: 'rgba(100, 149, 237, 0.2)',
      sidebarGutter: '#6495ed',
      
      // Menu Bar (top) - Con animación thunderstorm
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #1a1f2e 0%, #0a0d14 70%)',
      menuBarText: '#b0c4de',
      menuBarBorder: '#6495ed',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #2a2f3e 0%, #1a1d24 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#6495ed',
      statusBarText: '#0a0d14',
      statusBarBorder: '#6495ed',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #1a1f2e 0%, #0a0d14 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #6495ed 0%, #4682b4 60%, #87ceeb 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #2a2f3e 0%, #1a1d24 70%)',
      tabText: '#b0c4de',
      tabActiveText: '#0a0d14',
      tabBorder: '#6495ed',
      tabCloseHover: '#4682b4',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#b0c4de',
      tabGroupBorder: '#6495ed',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #1a1f2e 0%, #0a0d14 70%)',
      contentBorder: '#6495ed',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #1a1f2e 0%, #0a0d14 70%)',
      dialogText: '#b0c4de',
      dialogBorder: '#6495ed',
      dialogShadow: 'rgba(100, 149, 237, 0.4)',
      
      // Buttons
      buttonPrimary: '#6495ed',
      buttonPrimaryText: '#0a0d14',
      buttonPrimaryHover: '#4682b4',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#b0c4de',
      buttonSecondaryHover: 'rgba(100, 149, 237, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #1a1f2e 0%, #0a0d14 70%)',
      inputText: '#b0c4de',
      inputBorder: '#6495ed',
      inputFocus: '#4682b4',
      
      // Terminal Backgrounds
      powershellTerminalBackground: 'radial-gradient(circle at 20% 20%, #1a1f2e 0%, #0a0d14 70%)',
      linuxTerminalBackground: 'radial-gradient(circle at 20% 20%, #1a1f2e 0%, #0a0d14 70%)',
      
      // Context Menus
      contextMenuBackground: 'radial-gradient(circle at 20% 20%, #1a1f2e 0%, #0a0d14 70%)',
      contextMenuText: '#b0c4de',
      contextMenuBorder: '#6495ed',
      contextMenuHover: 'rgba(100, 149, 237, 0.1)',
      
      // Scrollbars
      scrollbarTrack: 'rgba(26, 31, 46, 0.5)',
      scrollbarThumb: '#6495ed',
      scrollbarThumbHover: '#4682b4',
      
      // Inputs
      inputBackground: 'radial-gradient(circle at 20% 20%, #1a1f2e 0%, #0a0d14 70%)',
      inputText: '#b0c4de',
      inputBorder: '#6495ed',
      inputFocus: '#4682b4',
      
      // Animaciones específicas
      animationType: 'thunderstorm',
      animationSpeed: 'fast'
    }
  }
};

export { ANIMATED_UI_KEYS };
