import { useState, useEffect } from 'react';
import { themes } from '../themes';
import { explorerFonts } from '../themes';
import { themeManager } from '../utils/themeManager';
import { statusBarThemeManager } from '../utils/statusBarThemeManager';
import { STORAGE_KEYS } from '../utils/constants';

export const useThemeManagement = () => {
  // Storage keys
  const FONT_FAMILY_STORAGE_KEY = 'basicapp_font_family';
  const FONT_SIZE_STORAGE_KEY = 'basicapp_font_size';
  const THEME_STORAGE_KEY = 'basicapp_terminal_theme';
  const STATUSBAR_THEME_STORAGE_KEY = 'basicapp_statusbar_theme';
  const LOCAL_FONT_FAMILY_STORAGE_KEY = 'basicapp_local_terminal_font_family';
  const LOCAL_FONT_SIZE_STORAGE_KEY = 'basicapp_local_terminal_font_size';
  const LOCAL_TERMINAL_THEME_STORAGE_KEY = 'basicapp_local_terminal_theme';
  const LOCAL_POWERSHELL_THEME_STORAGE_KEY = 'localPowerShellTheme';
  const LOCAL_LINUX_TERMINAL_THEME_STORAGE_KEY = 'localLinuxTerminalTheme';

  // Available fonts
  const availableFonts = [
    // Fuentes monoespaciadas modernas y populares
    { label: 'FiraCode Nerd Font', value: '"FiraCode Nerd Font", monospace' },
    { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
    { label: 'Cascadia Code', value: '"Cascadia Code", monospace' },
    { label: 'SF Mono', value: '"SF Mono", monospace' },
    { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
    { label: 'Roboto Mono', value: '"Roboto Mono", monospace' },
    { label: 'Fira Code', value: '"Fira Code", monospace' },
    { label: 'Victor Mono', value: '"Victor Mono", monospace' },
    { label: 'Operator Mono', value: '"Operator Mono", monospace' },
    { label: 'Dank Mono', value: '"Dank Mono", monospace' },
    { label: 'Recursive', value: '"Recursive", monospace' },
    { label: 'IBM Plex Mono', value: '"IBM Plex Mono", monospace' },
    { label: 'Space Mono', value: '"Space Mono", monospace' },
    { label: 'Overpass Mono', value: '"Overpass Mono", monospace' },
    { label: 'Inconsolata', value: 'Inconsolata, monospace' },
    { label: 'Hack', value: 'Hack, monospace' },
    { label: 'Monoid', value: 'Monoid, monospace' },
    { label: 'Anonymous Pro', value: '"Anonymous Pro", monospace' },
    { label: 'DejaVu Sans Mono', value: '"DejaVu Sans Mono", monospace' },
    { label: 'Liberation Mono', value: '"Liberation Mono", monospace' },
    { label: 'Ubuntu Mono', value: '"Ubuntu Mono", monospace' },
    { label: 'Monaco', value: 'Monaco, monospace' },
    { label: 'Consolas', value: 'Consolas, monospace' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Lucida Console', value: '"Lucida Console", monospace' },
    { label: 'Menlo', value: 'Menlo, monospace' },
    { label: 'Andale Mono', value: '"Andale Mono", monospace' },
    { label: 'PT Mono', value: '"PT Mono", monospace' }
  ];

  // Terminal themes
  const availableThemes = themes ? Object.keys(themes) : [];

  // Font states
  const [fontFamily, setFontFamily] = useState(() => 
    localStorage.getItem(FONT_FAMILY_STORAGE_KEY) || availableFonts[0].value
  );
  
  const [fontSize, setFontSize] = useState(() => {
    const savedSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    return savedSize ? parseInt(savedSize, 10) : 14;
  });

  const [localFontFamily, setLocalFontFamily] = useState(() => 
    localStorage.getItem(LOCAL_FONT_FAMILY_STORAGE_KEY) || '"FiraCode Nerd Font", monospace'
  );
  
  const [localFontSize, setLocalFontSize] = useState(() => {
    const saved = localStorage.getItem(LOCAL_FONT_SIZE_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 14;
  });

  // Terminal theme states
  const [terminalTheme, setTerminalTheme] = useState(() => {
    const savedThemeName = localStorage.getItem(THEME_STORAGE_KEY) || 'Default Dark';
    return themes && themes[savedThemeName] ? themes[savedThemeName] : {};
  });

  const [statusBarTheme, setStatusBarTheme] = useState(() => 
    localStorage.getItem(STATUSBAR_THEME_STORAGE_KEY) || 'Default Dark'
  );

  const [localPowerShellTheme, setLocalPowerShellTheme] = useState(() => 
    localStorage.getItem(LOCAL_POWERSHELL_THEME_STORAGE_KEY) || 'Dark'
  );
  
  const [localLinuxTerminalTheme, setLocalLinuxTerminalTheme] = useState(() => 
    localStorage.getItem(LOCAL_LINUX_TERMINAL_THEME_STORAGE_KEY) || 'Dark'
  );

  const [uiTheme, setUiTheme] = useState(() => 
    localStorage.getItem('ui_theme') || 'Light'
  );

  // Escuchar cambios en el tema de interfaz
  useEffect(() => {
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('ui_theme') || 'Light';
      setUiTheme(currentTheme);
    };

    // Escuchar el evento global de cambio de tema
    window.addEventListener('theme-changed', handleThemeChange);
    
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  // Icon and explorer theme states
  const [iconTheme, setIconTheme] = useState(() => {
    try {
      return localStorage.getItem('iconTheme') || 'nord';
    } catch {
      return 'nord';
    }
  });

  const [iconThemeSidebar, setIconThemeSidebar] = useState(() => {
    try {
      return localStorage.getItem('iconThemeSidebar') || 'nord';
    } catch {
      return 'nord';
    }
  });

  // Forzar actualización de temas de iconos después de la inicialización global
  useEffect(() => {
    const checkAndUpdateIconThemes = () => {
      const storedIconTheme = localStorage.getItem('iconTheme');
      const storedIconThemeSidebar = localStorage.getItem('iconThemeSidebar');
      
      if (storedIconTheme && storedIconTheme !== iconTheme) {
        console.log('[THEME] Actualizando iconTheme desde localStorage:', storedIconTheme);
        setIconTheme(storedIconTheme);
      }
      
      if (storedIconThemeSidebar && storedIconThemeSidebar !== iconThemeSidebar) {
        console.log('[THEME] Actualizando iconThemeSidebar desde localStorage:', storedIconThemeSidebar);
        setIconThemeSidebar(storedIconThemeSidebar);
      }
    };

    // Verificar inmediatamente
    checkAndUpdateIconThemes();
    
    // Verificar después de un pequeño delay para asegurar que initializeGlobalThemes se haya ejecutado
    const timeoutId = setTimeout(checkAndUpdateIconThemes, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const [explorerFont, setExplorerFont] = useState(() => {
    try {
      return localStorage.getItem('explorerFont') || explorerFonts[0];
    } catch {
      return explorerFonts[0];
    }
  });

  const [explorerFontSize, setExplorerFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem('explorerFontSize');
      return saved ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });

  const [iconSize, setIconSize] = useState(() => {
    try {
      const saved = localStorage.getItem('iconSize');
      return saved ? parseInt(saved, 10) : 20;
    } catch {
      return 20;
    }
  });

  const [folderIconSize, setFolderIconSize] = useState(() => {
    try {
      const saved = localStorage.getItem('folderIconSize');
      return saved ? parseInt(saved, 10) : 20;
    } catch {
      return 20;
    }
  });

  const [connectionIconSize, setConnectionIconSize] = useState(() => {
    try {
      const saved = localStorage.getItem('connectionIconSize');
      return saved ? parseInt(saved, 10) : 20;
    } catch {
      return 20;
    }
  });

  const [explorerColorTheme, setExplorerColorTheme] = useState(() => {
    try {
      return localStorage.getItem('explorerColorTheme') || 'Light';
    } catch {
      return 'Light';
    }
  });

  const [sidebarFont, setSidebarFont] = useState(() => {
    try {
      return localStorage.getItem('sidebarFont') || explorerFonts[0];
    } catch {
      return explorerFonts[0];
    }
  });

  const [sidebarFontSize, setSidebarFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebarFontSize');
      return saved ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });

  // Auto-save effects
  useEffect(() => {
    localStorage.setItem(FONT_FAMILY_STORAGE_KEY, fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, terminalTheme.name);
  }, [terminalTheme]);

  useEffect(() => {
    localStorage.setItem(STATUSBAR_THEME_STORAGE_KEY, statusBarTheme);
    statusBarThemeManager.applyTheme(statusBarTheme);
  }, [statusBarTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('iconTheme', iconTheme);
    } catch {}
  }, [iconTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('iconThemeSidebar', iconThemeSidebar);
    } catch {}
  }, [iconThemeSidebar]);

  useEffect(() => {
    try {
      localStorage.setItem('iconSize', iconSize.toString());
    } catch {}
  }, [iconSize]);

  useEffect(() => {
    try {
      localStorage.setItem('folderIconSize', folderIconSize.toString());
    } catch {}
  }, [folderIconSize]);

  useEffect(() => {
    try {
      localStorage.setItem('connectionIconSize', connectionIconSize.toString());
    } catch {}
  }, [connectionIconSize]);

  useEffect(() => {
    try {
      localStorage.setItem('explorerFont', explorerFont);
    } catch {}
  }, [explorerFont]);

  useEffect(() => {
    try {
      localStorage.setItem('explorerFontSize', explorerFontSize.toString());
    } catch {}
  }, [explorerFontSize]);

  useEffect(() => {
    try {
      localStorage.setItem('explorerColorTheme', explorerColorTheme);
    } catch {}
  }, [explorerColorTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarFont', sidebarFont);
    } catch {}
  }, [sidebarFont]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarFontSize', sidebarFontSize.toString());
    } catch {}
  }, [sidebarFontSize]);

  useEffect(() => {
    try {
      localStorage.setItem('iconSize', iconSize.toString());
    } catch {}
  }, [iconSize]);

  // Initial theme loading effect
  useEffect(() => {
    // Función para inicializar temas de forma robusta
    const initializeThemes = () => {
      try {
        // Inicializando temas
        
        // Cargar tema UI guardado
        themeManager.loadSavedTheme();
        
        // Cargar tema de status bar guardado
        statusBarThemeManager.loadSavedTheme();
        
        // Verificar que los temas se aplicaron correctamente
        setTimeout(() => {
          const rootStyles = getComputedStyle(document.documentElement);
          const dialogBg = rootStyles.getPropertyValue('--ui-dialog-bg');
          const sidebarBg = rootStyles.getPropertyValue('--ui-sidebar-bg');
          
          // Si los temas no se aplicaron, forzar aplicación
          if (!dialogBg || dialogBg === 'initial' || dialogBg === '' || 
              !sidebarBg || sidebarBg === 'initial' || sidebarBg === '') {
            themeManager.applyTheme('Nord');
            statusBarThemeManager.applyTheme('Night Owl');
          }
        }, 100);
        
      } catch (error) {
        console.error('[THEME] Error en useThemeManagement:', error);
      }
    };
    
    // Ejecutar inicialización
    initializeThemes();
  }, []);

  // Función para actualizar temas desde sincronización
  const updateThemesFromSync = () => {
    const updatedStatusBarTheme = localStorage.getItem(STATUSBAR_THEME_STORAGE_KEY) || 'Default Dark';
    const updatedLocalFontFamily = localStorage.getItem(LOCAL_FONT_FAMILY_STORAGE_KEY) || '"FiraCode Nerd Font", monospace';
    const updatedLocalFontSize = localStorage.getItem(LOCAL_FONT_SIZE_STORAGE_KEY);
    const updatedLocalTerminalTheme = localStorage.getItem(LOCAL_TERMINAL_THEME_STORAGE_KEY) || 'Default Dark';
    const updatedLocalPowerShellTheme = localStorage.getItem(LOCAL_POWERSHELL_THEME_STORAGE_KEY) || 'Dark';
    const updatedLocalLinuxTerminalTheme = localStorage.getItem(LOCAL_LINUX_TERMINAL_THEME_STORAGE_KEY) || 'Dark';
    
    const updatedExplorerFont = localStorage.getItem('explorerFont') || explorerFonts[0];
    const updatedExplorerFontSize = localStorage.getItem('explorerFontSize');
    const updatedExplorerColorTheme = localStorage.getItem('explorerColorTheme') || 'Light';
    const updatedSidebarFont = localStorage.getItem('sidebarFont') || explorerFonts[0];
    const updatedSidebarFontSize = localStorage.getItem('sidebarFontSize');
    const updatedIconSize = localStorage.getItem('iconSize');
    const updatedIconTheme = localStorage.getItem('iconTheme') || 'nord';
    const updatedIconThemeSidebar = localStorage.getItem('iconThemeSidebar') || 'nord';

    // Actualizar estados
    setStatusBarTheme(updatedStatusBarTheme);
    setLocalFontFamily(updatedLocalFontFamily);
    if (updatedLocalFontSize) setLocalFontSize(parseInt(updatedLocalFontSize, 10));
    setLocalPowerShellTheme(updatedLocalPowerShellTheme);
    setLocalLinuxTerminalTheme(updatedLocalLinuxTerminalTheme);
    setExplorerFont(updatedExplorerFont);
    if (updatedExplorerFontSize) setExplorerFontSize(parseInt(updatedExplorerFontSize, 10));
    setExplorerColorTheme(updatedExplorerColorTheme);
    setSidebarFont(updatedSidebarFont);
    if (updatedSidebarFontSize) setSidebarFontSize(parseInt(updatedSidebarFontSize, 10));
    if (updatedIconSize) setIconSize(parseInt(updatedIconSize, 10));
    setIconTheme(updatedIconTheme);
    setIconThemeSidebar(updatedIconThemeSidebar);

    // Actualizar tema de terminal
    const updatedTerminalThemeObj = themes && themes[updatedLocalTerminalTheme] ? themes[updatedLocalTerminalTheme] : {};
    setTerminalTheme(updatedTerminalThemeObj);
  };

  // Listener para actualizaciones de configuración desde sincronización
  useEffect(() => {
    const handleSettingsUpdate = (event) => {
      if (event.detail?.source === 'sync') {
        // Actualizando estados React tras sincronización
        
        // Actualizar temas desde sincronización usando el hook
        updateThemesFromSync();
        
        // Estados React actualizados
      }
    };

    window.addEventListener('settings-updated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, []);

  return {
    // Font states and setters
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    localFontFamily,
    setLocalFontFamily,
    localFontSize,
    setLocalFontSize,
    availableFonts,

    // Terminal theme states and setters
    terminalTheme,
    setTerminalTheme,
    statusBarTheme,
    setStatusBarTheme,
    localPowerShellTheme,
    setLocalPowerShellTheme,
    localLinuxTerminalTheme,
    setLocalLinuxTerminalTheme,
    uiTheme,
    setUiTheme,
    availableThemes,

    // Icon and explorer theme states and setters
    iconTheme,
    setIconTheme,
    iconThemeSidebar,
    setIconThemeSidebar,
    iconSize,
    setIconSize,
    folderIconSize,
    setFolderIconSize,
    connectionIconSize,
    setConnectionIconSize,
    explorerFont,
    setExplorerFont,
    explorerFontSize,
    setExplorerFontSize,
    explorerColorTheme,
    setExplorerColorTheme,
    sidebarFont,
    setSidebarFont,
    sidebarFontSize,
    setSidebarFontSize,

    // Utility functions
    updateThemesFromSync
  };
};
