import { useState, useEffect } from 'react';
import { themes } from '../themes';
import { explorerFonts } from '../themes';
import { themeManager } from '../utils/themeManager';
import { statusBarThemeManager } from '../utils/statusBarThemeManager';
import { STORAGE_KEYS } from '../utils/constants';
import { TREE_THEME_STORAGE_KEY } from '../themes/tree-themes';
import { getAvailableFonts } from '../utils/fontsList';
import { applyTabTheme } from '../utils/tabThemeLoader';
import { presetManager } from '../utils/presetManager';
import { ACTIVE_PRESET_STORAGE_KEY } from '../themes/presets/index';

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

  // Available fonts - Lista completa y unificada de todas las fuentes monoespaciadas
  // Generada desde la lista maestra para garantizar sincronización
  const availableFonts = getAvailableFonts();

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

  const [localDockerTerminalTheme, setLocalDockerTerminalTheme] = useState(() =>
    localStorage.getItem('localDockerTerminalTheme') || 'Default Dark'
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

  // Escuchar cambio de tema desde menú rápido (SSH = tema terminal SSH, sin terminalType = Linux/WSL)
  useEffect(() => {
    const handleTerminalThemeChanged = (e) => {
      const themeName = e.detail?.theme;
      const terminalType = e.detail?.terminalType;
      if (!themeName) return;
      if (terminalType === 'ssh') {
        const themeObj = themes && themes[themeName] ? themes[themeName] : { name: themeName, theme: {} };
        setTerminalTheme(themeObj);
      } else {
        setLocalLinuxTerminalTheme(themeName);
      }
    };
    window.addEventListener('terminal-theme-changed', handleTerminalThemeChanged);
    return () => window.removeEventListener('terminal-theme-changed', handleTerminalThemeChanged);
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

  // ─── TAMAÑO UNIFICADO DE LA SIDEBAR ────────────────────────────────────────
  // Un solo valor controla proporcionalemente iconos Y tipografía.
  // Ratio fijo: fontSize = max(10, round(iconSize × 0.75))
  //   iconSize 12 → fontSize 9 → clamp → 10
  //   iconSize 20 → fontSize 15  (por defecto)
  //   iconSize 32 → fontSize 24
  const SIDEBAR_FONT_RATIO = 0.75;
  const derivedFontSize = (iconSz) => Math.max(10, Math.round(iconSz * SIDEBAR_FONT_RATIO));

  // Lee folderIconSize o connectionIconSize existentes para retrocompatibilidad
  const [sidebarIconSize, setSidebarIconSize] = useState(() => {
    try {
      const savedFolder = localStorage.getItem('folderIconSize');
      const savedConn = localStorage.getItem('connectionIconSize');
      if (savedFolder) return parseInt(savedFolder, 10);
      if (savedConn) return parseInt(savedConn, 10);
      return 20;
    } catch {
      return 20;
    }
  });

  // Aliases derivados para compatibilidad con todos los consumidores existentes
  const folderIconSize = sidebarIconSize;
  const connectionIconSize = sidebarIconSize;

  // Setters unificados: cualquier setter actualiza el estado único
  const setFolderIconSize = setSidebarIconSize;
  const setConnectionIconSize = setSidebarIconSize;

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

  // sidebarFontSize: se deriva de sidebarIconSize automáticamente.
  // El estado se mantiene para que todos los consumidores sigan funcionando sin cambios.
  const [sidebarFontSize, setSidebarFontSize] = useState(() => {
    try {
      // Inicializar desde iconSize si ya hay uno guardado (garantiza coherencia)
      const savedIconSize = localStorage.getItem('folderIconSize');
      if (savedIconSize) return derivedFontSize(parseInt(savedIconSize, 10));
      const saved = localStorage.getItem('sidebarFontSize');
      return saved ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });

  const [sidebarFontColor, setSidebarFontColor] = useState(() => {
    try {
      return localStorage.getItem('sidebarFontColor') || '';
    } catch {
      return '';
    }
  });

  // Tree theme state
  const [treeTheme, setTreeTheme] = useState(() => {
    try {
      return localStorage.getItem(TREE_THEME_STORAGE_KEY) || 'default';
    } catch {
      return 'default';
    }
  });

  // Session action icons theme state
  const [sessionActionIconTheme, setSessionActionIconTheme] = useState(() => {
    try {
      return localStorage.getItem('sessionActionIconTheme') || 'modern';
    } catch {
      return 'modern';
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
    } catch { }
  }, [iconTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('iconThemeSidebar', iconThemeSidebar);
      // Notificar a los componentes que el tema de iconos cambió
      window.dispatchEvent(new Event('icon-theme-changed'));
    } catch { }
  }, [iconThemeSidebar]);

  useEffect(() => {
    try {
      localStorage.setItem('iconSize', iconSize.toString());
    } catch { }
  }, [iconSize]);

  // Persistir el tamaño unificado en ambas claves para retrocompatibilidad total
  // y derivar el fontSize proporcional automáticamente
  useEffect(() => {
    try {
      localStorage.setItem('folderIconSize', sidebarIconSize.toString());
      localStorage.setItem('connectionIconSize', sidebarIconSize.toString());
      // Sincronizar font size con el ratio fijo
      const derived = derivedFontSize(sidebarIconSize);
      setSidebarFontSize(derived);
      localStorage.setItem('sidebarFontSize', derived.toString());
    } catch { }
  }, [sidebarIconSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      localStorage.setItem('explorerFont', explorerFont);
    } catch { }
  }, [explorerFont]);

  useEffect(() => {
    try {
      localStorage.setItem('explorerFontSize', explorerFontSize.toString());
    } catch { }
  }, [explorerFontSize]);

  useEffect(() => {
    try {
      localStorage.setItem('explorerColorTheme', explorerColorTheme);
    } catch { }
  }, [explorerColorTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarFont', sidebarFont);
    } catch { }
  }, [sidebarFont]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarFontSize', sidebarFontSize.toString());
    } catch { }
  }, [sidebarFontSize]);

  useEffect(() => {
    try {
      if (sidebarFontColor) {
        localStorage.setItem('sidebarFontColor', sidebarFontColor);
      } else {
        localStorage.removeItem('sidebarFontColor');
      }
    } catch { }
  }, [sidebarFontColor]);

  useEffect(() => {
    try {
      localStorage.setItem('iconSize', iconSize.toString());
    } catch { }
  }, [iconSize]);

  // Tree theme auto-save
  useEffect(() => {
    try {
      localStorage.setItem(TREE_THEME_STORAGE_KEY, treeTheme);
    } catch { }
  }, [treeTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('sessionActionIconTheme', sessionActionIconTheme);
    } catch { }
  }, [sessionActionIconTheme]);

  // Initial theme loading effect
  useEffect(() => {
    // Función para inicializar temas de forma robusta
    const initializeThemes = () => {
      try {
        // Inicializando temas

        // Cargar tema UI guardado (Preferir compartido)
        if (themeManager.loadSharedTheme) {
          themeManager.loadSharedTheme();
        } else {
          themeManager.loadSavedTheme();
        }

        // Cargar tema de status bar guardado
        if (statusBarThemeManager.loadSharedTheme) {
          statusBarThemeManager.loadSharedTheme();
        } else {
          statusBarThemeManager.loadSavedTheme();
        }

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

  // Active preset state
  const [activePresetId, setActivePresetId] = useState(() =>
    localStorage.getItem(ACTIVE_PRESET_STORAGE_KEY) || null
  );

  // Función para actualizar temas desde sincronización
  const updateThemesFromSync = () => {
    const updatedStatusBarTheme = localStorage.getItem(STATUSBAR_THEME_STORAGE_KEY) || 'Default Dark';
    const updatedLocalFontFamily = localStorage.getItem(LOCAL_FONT_FAMILY_STORAGE_KEY) || '"FiraCode Nerd Font", monospace';
    const updatedLocalFontSize = localStorage.getItem(LOCAL_FONT_SIZE_STORAGE_KEY);
    const updatedLocalTerminalTheme = localStorage.getItem(LOCAL_TERMINAL_THEME_STORAGE_KEY) || 'Default Dark';
    const updatedLocalPowerShellTheme = localStorage.getItem(LOCAL_POWERSHELL_THEME_STORAGE_KEY) || 'Dark';
    const updatedLocalLinuxTerminalTheme = localStorage.getItem(LOCAL_LINUX_TERMINAL_THEME_STORAGE_KEY) || 'Dark';
    const updatedLocalDockerTerminalTheme = localStorage.getItem('localDockerTerminalTheme') || 'Default Dark';

    // UI Fonts
    const updatedFontFamily = localStorage.getItem(FONT_FAMILY_STORAGE_KEY) || availableFonts[0].value;
    const updatedFontSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY);

    const updatedExplorerFont = localStorage.getItem('explorerFont') || explorerFonts[0];
    const updatedExplorerFontSize = localStorage.getItem('explorerFontSize');
    const updatedExplorerColorTheme = localStorage.getItem('explorerColorTheme') || 'Light';
    const updatedSidebarFont = localStorage.getItem('sidebarFont') || explorerFonts[0];
    const updatedSidebarFontSize = localStorage.getItem('sidebarFontSize');
    const updatedSidebarFontColor = localStorage.getItem('sidebarFontColor') || '';
    const updatedIconSize = localStorage.getItem('iconSize');
    const updatedFolderIconSize = localStorage.getItem('folderIconSize');
    const updatedConnectionIconSize = localStorage.getItem('connectionIconSize');
    const updatedSidebarIconSize = updatedFolderIconSize || updatedConnectionIconSize;
    const updatedIconTheme = localStorage.getItem('iconTheme') || 'nord';
    const updatedIconThemeSidebar = localStorage.getItem('iconThemeSidebar') || 'nord';
    const updatedTreeTheme = localStorage.getItem(TREE_THEME_STORAGE_KEY) || 'default';
    const updatedSessionActionIconTheme = localStorage.getItem('sessionActionIconTheme') || 'modern';

    // Actualizar estados
    setStatusBarTheme(updatedStatusBarTheme);
    setLocalFontFamily(updatedLocalFontFamily);
    if (updatedLocalFontSize) setLocalFontSize(parseInt(updatedLocalFontSize, 10));
    setLocalPowerShellTheme(updatedLocalPowerShellTheme);
    setLocalLinuxTerminalTheme(updatedLocalLinuxTerminalTheme);
    setLocalDockerTerminalTheme(updatedLocalDockerTerminalTheme);

    // UI Fonts State Update
    setFontFamily(updatedFontFamily);
    if (updatedFontSize) setFontSize(parseInt(updatedFontSize, 10));

    setExplorerFont(updatedExplorerFont);
    if (updatedExplorerFontSize) setExplorerFontSize(parseInt(updatedExplorerFontSize, 10));
    setExplorerColorTheme(updatedExplorerColorTheme);
    setSidebarFont(updatedSidebarFont);
    if (updatedSidebarFontSize) setSidebarFontSize(parseInt(updatedSidebarFontSize, 10));
    setSidebarFontColor(updatedSidebarFontColor);
    if (updatedIconSize) setIconSize(parseInt(updatedIconSize, 10));
    if (updatedSidebarIconSize) setSidebarIconSize(parseInt(updatedSidebarIconSize, 10));
    setIconTheme(updatedIconTheme);
    setIconThemeSidebar(updatedIconThemeSidebar);
    setTreeTheme(updatedTreeTheme);
    setSessionActionIconTheme(updatedSessionActionIconTheme);

    // Actualizar tema de terminal SSH
    // FIX: Usar THEME_STORAGE_KEY para SSH, no LOCAL_TERMINAL_THEME_STORAGE_KEY
    const updatedTerminalThemeName = localStorage.getItem(THEME_STORAGE_KEY) || 'Default Dark';
    const updatedTerminalThemeObj = themes && themes[updatedTerminalThemeName] ? themes[updatedTerminalThemeName] : {};
    setTerminalTheme(updatedTerminalThemeObj);

    // 🚀 FORZAR APLICACIÓN VISUAL
    // Actualizar variables CSS inmediatamente
    try {
      const root = document.documentElement;
      // Fuentes
      root.style.setProperty('--ui-font-family', updatedFontFamily);
      if (updatedFontSize) root.style.setProperty('--ui-font-size', `${updatedFontSize}px`);

      root.style.setProperty('--explorer-font-family', updatedExplorerFont);
      if (updatedExplorerFontSize) root.style.setProperty('--explorer-font-size', `${updatedExplorerFontSize}px`);

      root.style.setProperty('--sidebar-font-family', updatedSidebarFont);
      if (updatedSidebarFontSize) root.style.setProperty('--sidebar-font-size', `${updatedSidebarFontSize}px`);
      if (updatedSidebarFontColor) {
        root.style.setProperty('--ui-sidebar-text', updatedSidebarFontColor);
      } else {
        root.style.removeProperty('--ui-sidebar-text');
      }

      // Temas
      statusBarThemeManager.applyTheme(updatedStatusBarTheme);
      // Aplicar tema de iconos si cambió
      window.dispatchEvent(new Event('icon-theme-changed'));

      // Aplicar tema de pestañas
      const updatedTabTheme = localStorage.getItem('nodeterm_tab_theme');
      if (updatedTabTheme) {
        applyTabTheme(updatedTabTheme);
        window.dispatchEvent(new CustomEvent('tab-theme-changed', { detail: updatedTabTheme }));
      }
    } catch (e) {
      console.error('[THEME] Error aplicando estilos forzados:', e);
    }
  };

  /**
   * Apply a preset object and update all React states immediately.
   */
  const applyPreset = (preset) => {
    presetManager.applyPreset(preset);
    setActivePresetId(preset.id);
    updateThemesFromSync();
  };

  /**
   * Snapshot all current appearance settings into a named user preset.
   */
  const saveCurrentAsPreset = (name, icon = '⭐') =>
    presetManager.saveCurrentAsPreset(name, icon);

  // Listener para actualizaciones de configuración desde sincronización
  useEffect(() => {
    const handleSettingsUpdate = (event) => {
      if (event.detail?.source === 'sync' || event.detail?.source === 'preset' || event.key) {
        updateThemesFromSync();
        const newPresetId = localStorage.getItem(ACTIVE_PRESET_STORAGE_KEY) || null;
        setActivePresetId(newPresetId);
      }
    };

    window.addEventListener('settings-updated', handleSettingsUpdate);
    // Escuchar cambios directos en storage para mayor reactividad
    window.addEventListener('storage', handleSettingsUpdate);

    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleSettingsUpdate);
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
    localLinuxTerminalTheme,
    setLocalLinuxTerminalTheme,
    localDockerTerminalTheme,
    setLocalDockerTerminalTheme,
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
    // Estado unificado
    sidebarIconSize,
    setSidebarIconSize,
    // Aliases de compatibilidad (apuntan al mismo valor unificado)
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
    sidebarFontColor,
    setSidebarFontColor,

    // Tree theme
    treeTheme,
    setTreeTheme,

    // Session action icons theme
    sessionActionIconTheme,
    setSessionActionIconTheme,

    // Utility functions
    reloadThemes: updateThemesFromSync,
    updateThemesFromSync,

    // Preset management
    activePresetId,
    applyPreset,
    saveCurrentAsPreset
  };
};
