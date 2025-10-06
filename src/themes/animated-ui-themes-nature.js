// Temas animados de naturaleza para interfaz
// Temas inspirados en elementos naturales con animaciones suaves
const NATURE_UI_KEYS = [
  'Autumn Leaves Animated', 'Cherry Blossoms Animated', 'Ocean Waves Animated',
  'Forest Mist Animated', 'Sunset Clouds Animated', 'Winter Snowfall Animated',
  'Thunderstorm Animated', 'Fireflies Animated'
];

export const natureUiThemes = {
  // === TEMAS DE NATURALEZA ===

  'Autumn Leaves Animated': {
    name: 'Autumn Leaves Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#ff8c00',
      sidebarText: '#ffe0b2',
      sidebarHover: 'rgba(255, 140, 0, 0.15)',
      sidebarSelected: 'rgba(255, 140, 0, 0.3)',
      sidebarGutter: '#ff8c00',
      
      // Menu Bar (top) - Con animación de hojas de otoño
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      menuBarText: '#ffe0b2',
      menuBarBorder: '#ff8c00',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #3d2a1a 0%, #1d1a14 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#ff8c00',
      statusBarText: '#0d0a04',
      statusBarBorder: '#ff8c00',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #ff8c00 0%, #ff4500 40%, #ffd700 80%, #8b4513 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #3d2a1a 0%, #1d1a14 70%)',
      tabText: '#ffe0b2',
      tabActiveText: '#0d0a04',
      tabBorder: '#ff8c00',
      tabCloseHover: '#ff4500',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#ffe0b2',
      tabGroupBorder: '#ff8c00',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      contentBorder: '#ff8c00',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      dialogText: '#ffe0b2',
      dialogBorder: '#ff8c00',
      dialogShadow: 'rgba(255, 140, 0, 0.5)',
      
      // Buttons
      buttonPrimary: '#ff8c00',
      buttonPrimaryText: '#0d0a04',
      buttonPrimaryHover: '#ff4500',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#ffe0b2',
      buttonSecondaryHover: 'rgba(255, 140, 0, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      inputText: '#ffe0b2',
      inputBorder: '#ff8c00',
      inputFocus: '#ff4500',
      
      // Terminal Backgrounds
      powershellTerminalBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      linuxTerminalBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      
      // Context Menus
      contextMenuBackground: '#2d1a0a',
      contextMenuText: '#ffe0b2',
      contextMenuBorder: '#ff8c00',
      contextMenuHover: 'rgba(255, 140, 0, 0.2)',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      
      // Scrollbars
      scrollbarTrack: 'rgba(45, 26, 10, 0.5)',
      scrollbarThumb: '#ff8c00',
      scrollbarThumbHover: '#ff4500',
      
      // Inputs
      inputBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      inputText: '#ffe0b2',
      inputBorder: '#ff8c00',
      inputFocus: '#ff4500',
      
      // Animaciones específicas
      animationType: 'autumn-leaves',
      animationSpeed: 'slow',
      
      // Elementos adicionales para más animaciones
      additionalElements: [
        { class: 'leaf-1', content: '🍂' },
        { class: 'leaf-2', content: '🍁' },
        { class: 'leaf-3', content: '🍂' },
        { class: 'leaf-4', content: '🍂' },
        { class: 'leaf-5', content: '🍁' },
        { class: 'leaf-6', content: '🍂' },
        { class: 'leaf-7', content: '🍁' },
        { class: 'leaf-8', content: '🍂' },
        { class: 'leaf-9', content: '🍁' },
        { class: 'leaf-10', content: '🍂' },
        { class: 'leaf-11', content: '🍁' },
        { class: 'leaf-12', content: '🍂' },
        { class: 'leaf-13', content: '🍁' },
        { class: 'leaf-14', content: '🍂' },
        { class: 'leaf-15', content: '🍁' },
        { class: 'leaf-16', content: '🍂' },
        { class: 'leaf-17', content: '🍁' },
        { class: 'leaf-18', content: '🍂' }
      ]
    }
  },

  'Cherry Blossoms Animated': {
    name: 'Cherry Blossoms Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#ffb3d9',
      sidebarText: '#ffe6f2',
      sidebarHover: 'rgba(255, 179, 217, 0.15)',
      sidebarSelected: 'rgba(255, 179, 217, 0.3)',
      sidebarGutter: '#ffb3d9',
      
      // Menu Bar (top) - Con animación de pétalos de cerezo
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #2d1a2a 0%, #0d0a0d 70%)',
      menuBarText: '#ffe6f2',
      menuBarBorder: '#ffb3d9',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #3d2a3a 0%, #1d1a1d 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#ffb3d9',
      statusBarText: '#0d0a0d',
      statusBarBorder: '#ffb3d9',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #2d1a2a 0%, #0d0a0d 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #ffb3d9 0%, #ffc0cb 50%, #f0f8ff 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #3d2a3a 0%, #1d1a1d 70%)',
      tabText: '#ffe6f2',
      tabActiveText: '#0d0a0d',
      tabBorder: '#ffb3d9',
      tabCloseHover: '#ffc0cb',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#ffe6f2',
      tabGroupBorder: '#ffb3d9',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #2d1a2a 0%, #0d0a0d 70%)',
      contentBorder: '#ffb3d9',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #2d1a2a 0%, #0d0a0d 70%)',
      dialogText: '#ffe6f2',
      dialogBorder: '#ffb3d9',
      dialogShadow: 'rgba(255, 179, 217, 0.4)',
      
      // Buttons
      buttonPrimary: '#ffb3d9',
      buttonPrimaryText: '#0d0a0d',
      buttonPrimaryHover: '#ffc0cb',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#ffe6f2',
      buttonSecondaryHover: 'rgba(255, 179, 217, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #2d1a2a 0%, #0d0a0d 70%)',
      inputText: '#ffe6f2',
      inputBorder: '#ffb3d9',
      inputFocus: '#ffc0cb',
      
      // Terminal Backgrounds
      powershellTerminalBackground: 'radial-gradient(circle at 20% 20%, #2d1a2a 0%, #0d0a0d 70%)',
      linuxTerminalBackground: 'radial-gradient(circle at 20% 20%, #2d1a2a 0%, #0d0a0d 70%)',
      
      // Context Menus
      contextMenuBackground: '#2d1a2a',
      contextMenuText: '#ffe6f2',
      contextMenuBorder: '#ffb3d9',
      contextMenuHover: 'rgba(255, 179, 217, 0.2)',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      
      // Scrollbars
      scrollbarTrack: 'rgba(45, 26, 42, 0.5)',
      scrollbarThumb: '#ffb3d9',
      scrollbarThumbHover: '#ffc0cb',
      
      // Inputs
      inputBackground: 'radial-gradient(circle at 20% 20%, #2d1a2a 0%, #0d0a0d 70%)',
      inputText: '#ffe6f2',
      inputBorder: '#ffb3d9',
      inputFocus: '#ffc0cb',
      
      // Animaciones específicas
      animationType: 'cherry-blossoms',
      animationSpeed: 'slow',
      
      // Elementos adicionales para más animaciones
      additionalElements: [
        { class: 'petal-1', content: '🌸' },
        { class: 'petal-2', content: '🌺' },
        { class: 'petal-3', content: '🌸' },
        { class: 'petal-4', content: '🌺' },
        { class: 'petal-5', content: '🌸' },
        { class: 'petal-6', content: '🌺' },
        { class: 'petal-7', content: '🌸' }
      ]
    }
  },

  'Ocean Waves Animated': {
    name: 'Ocean Waves Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#4682b4',
      sidebarText: '#e0f6ff',
      sidebarHover: 'rgba(70, 130, 180, 0.15)',
      sidebarSelected: 'rgba(70, 130, 180, 0.3)',
      sidebarGutter: '#4682b4',
      
      // Menu Bar (top) - Con animación de ondas oceánicas
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #0a1a2a 0%, #040a0d 70%)',
      menuBarText: '#e0f6ff',
      menuBarBorder: '#4682b4',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #1a2a3a 0%, #0d1a1d 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#4682b4',
      statusBarText: '#040a0d',
      statusBarBorder: '#4682b4',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #0a1a2a 0%, #040a0d 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #4682b4 0%, #87ceeb 50%, #f0f8ff 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #1a2a3a 0%, #0d1a1d 70%)',
      tabText: '#e0f6ff',
      tabActiveText: '#040a0d',
      tabBorder: '#4682b4',
      tabCloseHover: '#87ceeb',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#e0f6ff',
      tabGroupBorder: '#4682b4',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #0a1a2a 0%, #040a0d 70%)',
      contentBorder: '#4682b4',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #0a1a2a 0%, #040a0d 70%)',
      dialogText: '#e0f6ff',
      dialogBorder: '#4682b4',
      dialogShadow: 'rgba(70, 130, 180, 0.4)',
      
      // Buttons
      buttonPrimary: '#4682b4',
      buttonPrimaryText: '#040a0d',
      buttonPrimaryHover: '#87ceeb',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#e0f6ff',
      buttonSecondaryHover: 'rgba(70, 130, 180, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #0a1a2a 0%, #040a0d 70%)',
      inputText: '#e0f6ff',
      inputBorder: '#4682b4',
      inputFocus: '#87ceeb',
      
      // Terminal Backgrounds
      powershellTerminalBackground: 'radial-gradient(circle at 20% 20%, #0a1a2a 0%, #040a0d 70%)',
      linuxTerminalBackground: 'radial-gradient(circle at 20% 20%, #0a1a2a 0%, #040a0d 70%)',
      
      // Context Menus
      contextMenuBackground: '#0a1a2a',
      contextMenuText: '#e0f6ff',
      contextMenuBorder: '#4682b4',
      contextMenuHover: 'rgba(70, 130, 180, 0.2)',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      
      // Scrollbars
      scrollbarTrack: 'rgba(10, 26, 42, 0.5)',
      scrollbarThumb: '#4682b4',
      scrollbarThumbHover: '#87ceeb',
      
      // Inputs
      inputBackground: 'radial-gradient(circle at 20% 20%, #0a1a2a 0%, #040a0d 70%)',
      inputText: '#e0f6ff',
      inputBorder: '#4682b4',
      inputFocus: '#87ceeb',
      
      // Animaciones específicas
      animationType: 'ocean-waves',
      animationSpeed: 'normal',
      
      // Elementos adicionales para más animaciones
      additionalElements: [
        { class: 'wave-1', content: '🌊' },
        { class: 'wave-2', content: '🌊' },
        { class: 'wave-3', content: '🌊' },
        { class: 'wave-4', content: '🌊' },
        { class: 'wave-5', content: '🌊' }
      ]
    }
  },

  'Forest Mist Animated': {
    name: 'Forest Mist Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#4caf50',
      sidebarText: '#e8f5e8',
      sidebarHover: 'rgba(76, 175, 80, 0.15)',
      sidebarSelected: 'rgba(76, 175, 80, 0.3)',
      sidebarGutter: '#4caf50',
      
      // Menu Bar (top) - Con animación de niebla forestal
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      menuBarText: '#e8f5e8',
      menuBarBorder: '#4caf50',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #1d2f1d 0%, #0d1a0d 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#4caf50',
      statusBarText: '#040a04',
      statusBarBorder: '#4caf50',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 40%, #c8e6c9 80%, #f1f8e9 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #1d2f1d 0%, #0d1a0d 70%)',
      tabText: '#e8f5e8',
      tabActiveText: '#040a04',
      tabBorder: '#4caf50',
      tabCloseHover: '#8bc34a',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#e8f5e8',
      tabGroupBorder: '#4caf50',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      contentBorder: '#4caf50',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      dialogText: '#e8f5e8',
      dialogBorder: '#4caf50',
      dialogShadow: 'rgba(76, 175, 80, 0.4)',
      
      // Buttons
      buttonPrimary: '#4caf50',
      buttonPrimaryText: '#040a04',
      buttonPrimaryHover: '#8bc34a',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#e8f5e8',
      buttonSecondaryHover: 'rgba(76, 175, 80, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      inputText: '#e8f5e8',
      inputBorder: '#4caf50',
      inputFocus: '#8bc34a',
      
      // Terminal Backgrounds
      powershellTerminalBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      linuxTerminalBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      
      // Context Menus
      contextMenuBackground: '#0d1f0d',
      contextMenuText: '#e8f5e8',
      contextMenuBorder: '#4caf50',
      contextMenuHover: 'rgba(76, 175, 80, 0.2)',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      
      // Scrollbars
      scrollbarTrack: 'rgba(13, 31, 13, 0.5)',
      scrollbarThumb: '#4caf50',
      scrollbarThumbHover: '#8bc34a',
      
      // Inputs
      inputBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      inputText: '#e8f5e8',
      inputBorder: '#4caf50',
      inputFocus: '#8bc34a',
      
      // Animaciones específicas
      animationType: 'forest-mist',
      animationSpeed: 'slow',
      
      // Elementos adicionales para más animaciones
      additionalElements: [
        { class: 'mist-1', content: '' },
        { class: 'mist-2', content: '' },
        { class: 'mist-3', content: '' },
        { class: 'mist-4', content: '' },
        { class: 'mist-5', content: '' }
      ]
    }
  },

  'Sunset Clouds Animated': {
    name: 'Sunset Clouds Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#ff8c00',
      sidebarText: '#ffe0b2',
      sidebarHover: 'rgba(255, 140, 0, 0.15)',
      sidebarSelected: 'rgba(255, 140, 0, 0.3)',
      sidebarGutter: '#ff8c00',
      
      // Menu Bar (top) - Con animación de nubes al atardecer
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      menuBarText: '#ffe0b2',
      menuBarBorder: '#ff8c00',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #3d2a1a 0%, #1d1a14 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: 'linear-gradient(90deg, #ff8c00 0%, #ff4500 50%, #ff69b4 100%)',
      statusBarText: '#0d0a04',
      statusBarBorder: '#ff8c00',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #ff8c00 0%, #ff4500 25%, #ff69b4 50%, #ffd700 75%, #ffa500 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #3d2a1a 0%, #1d1a14 70%)',
      tabText: '#ffe0b2',
      tabActiveText: '#0d0a04',
      tabBorder: '#ff8c00',
      tabCloseHover: '#ff4500',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#ffe0b2',
      tabGroupBorder: '#ff8c00',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      contentBorder: '#ff8c00',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      dialogText: '#ffe0b2',
      dialogBorder: '#ff8c00',
      dialogShadow: 'rgba(255, 140, 0, 0.5)',
      
      // Buttons
      buttonPrimary: '#ff8c00',
      buttonPrimaryText: '#0d0a04',
      buttonPrimaryHover: '#ff4500',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#ffe0b2',
      buttonSecondaryHover: 'rgba(255, 140, 0, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      inputText: '#ffe0b2',
      inputBorder: '#ff8c00',
      inputFocus: '#ff4500',
      
      // Terminal Backgrounds
      powershellTerminalBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      linuxTerminalBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      
      // Context Menus
      contextMenuBackground: '#2d1a0a',
      contextMenuText: '#ffe0b2',
      contextMenuBorder: '#ff8c00',
      contextMenuHover: 'rgba(255, 140, 0, 0.2)',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      
      // Scrollbars
      scrollbarTrack: 'rgba(45, 26, 10, 0.5)',
      scrollbarThumb: '#ff8c00',
      scrollbarThumbHover: '#ff4500',
      
      // Inputs
      inputBackground: 'radial-gradient(circle at 20% 20%, #2d1a0a 0%, #0d0a04 70%)',
      inputText: '#ffe0b2',
      inputBorder: '#ff8c00',
      inputFocus: '#ff4500',
      
      // Animaciones específicas
      animationType: 'sunset-clouds',
      animationSpeed: 'normal',
      
      // Elementos adicionales para más animaciones
      additionalElements: [
        { class: 'cloud-1', content: '☁️' },
        { class: 'cloud-2', content: '☁️' },
        { class: 'cloud-3', content: '☁️' },
        { class: 'cloud-4', content: '☁️' },
        { class: 'cloud-5', content: '☁️' }
      ]
    }
  },

  'Winter Snowfall Animated': {
    name: 'Winter Snowfall Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#bbdefb',
      sidebarText: '#e3f2fd',
      sidebarHover: 'rgba(187, 222, 251, 0.15)',
      sidebarSelected: 'rgba(187, 222, 251, 0.3)',
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
      contextMenuBackground: '#1a2840',
      contextMenuText: '#e3f2fd',
      contextMenuBorder: '#bbdefb',
      contextMenuHover: 'rgba(187, 222, 251, 0.2)',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      
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
      sidebarHover: 'rgba(100, 149, 237, 0.15)',
      sidebarSelected: 'rgba(100, 149, 237, 0.3)',
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
      contextMenuBackground: '#1a1f2e',
      contextMenuText: '#b0c4de',
      contextMenuBorder: '#6495ed',
      contextMenuHover: 'rgba(100, 149, 237, 0.2)',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      
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
  },

  'Fireflies Animated': {
    name: 'Fireflies Animated',
    colors: {
      // Sidebar
      sidebarBackground: 'transparent',
      sidebarBorder: '#4caf50',
      sidebarText: '#c8e6c9',
      sidebarHover: 'rgba(76, 175, 80, 0.15)',
      sidebarSelected: 'rgba(76, 175, 80, 0.3)',
      sidebarGutter: '#4caf50',
      
      // Menu Bar (top) - Con animación fireflies
      menuBarBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      menuBarText: '#c8e6c9',
      menuBarBorder: '#4caf50',
      menuBarHover: 'radial-gradient(circle at 20% 20%, #1d2f1d 0%, #0d1a0d 70%)',
      
      // Status Bar (bottom)
      statusBarBackground: '#4caf50',
      statusBarText: '#040a04',
      statusBarBorder: '#4caf50',
      
      // Tabs
      tabBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      tabActiveBackground: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 60%, #ffeb3b 100%)',
      tabHoverBackground: 'radial-gradient(circle at 20% 20%, #1d2f1d 0%, #0d1a0d 70%)',
      tabText: '#c8e6c9',
      tabActiveText: '#040a04',
      tabBorder: '#4caf50',
      tabCloseHover: '#ffeb3b',
      
      // Tab Groups
      tabGroupBackground: 'transparent',
      tabGroupText: '#c8e6c9',
      tabGroupBorder: '#4caf50',
      
      // Content Area
      contentBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      contentBorder: '#4caf50',
      
      // Dialogs
      dialogBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      dialogText: '#c8e6c9',
      dialogBorder: '#4caf50',
      dialogShadow: 'rgba(76, 175, 80, 0.4)',
      
      // Buttons
      buttonPrimary: '#4caf50',
      buttonPrimaryText: '#040a04',
      buttonPrimaryHover: '#8bc34a',
      buttonSecondary: 'transparent',
      buttonSecondaryText: '#c8e6c9',
      buttonSecondaryHover: 'rgba(76, 175, 80, 0.1)',
      buttonDanger: '#d32f2f',
      buttonDangerText: '#ffffff',
      buttonDangerHover: '#f44336',
      
      // Form Elements
      inputBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      inputText: '#c8e6c9',
      inputBorder: '#4caf50',
      inputFocus: '#8bc34a',
      
      // Terminal Backgrounds
      powershellTerminalBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      linuxTerminalBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      
      // Context Menus
      contextMenuBackground: '#0d1f0d',
      contextMenuText: '#c8e6c9',
      contextMenuBorder: '#4caf50',
      contextMenuHover: 'rgba(76, 175, 80, 0.2)',
      contextMenuShadow: 'rgba(0, 0, 0, 0.5)',
      
      // Scrollbars
      scrollbarTrack: 'rgba(13, 31, 13, 0.5)',
      scrollbarThumb: '#4caf50',
      scrollbarThumbHover: '#8bc34a',
      
      // Inputs
      inputBackground: 'radial-gradient(circle at 20% 20%, #0d1f0d 0%, #040a04 70%)',
      inputText: '#c8e6c9',
      inputBorder: '#4caf50',
      inputFocus: '#8bc34a',
      
      // Animaciones específicas
      animationType: 'fireflies',
      animationSpeed: 'normal'
    }
  }
};

export { NATURE_UI_KEYS };
