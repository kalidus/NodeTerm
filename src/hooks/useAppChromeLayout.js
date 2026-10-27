import React, { useEffect } from 'react';
import { persistSyncedSetting } from '../utils/persistSyncedSetting';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Chrome UI layout: titlebar, tab bar, main-frame header, and minimal mode.
 * Owns localStorage persistence, body CSS classes, and window event listeners.
 */
export function useAppChromeLayout() {
  // Estado para mostrar/ocultar la titlebar superior
  const [titleBarCollapsed, setTitleBarCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('nodeterm_titlebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('nodeterm_titlebar_collapsed', titleBarCollapsed.toString());
    } catch {
      // ignorar errores de persistencia
    }
  }, [titleBarCollapsed]);

  const handleToggleTitleBar = React.useCallback(() => {
    setTitleBarCollapsed(prev => !prev);
  }, []);

  React.useEffect(() => {
    const toggleTitlebarEvent = () => handleToggleTitleBar();
    window.addEventListener('toggle-titlebar', toggleTitlebarEvent);
    return () => window.removeEventListener('toggle-titlebar', toggleTitlebarEvent);
  }, [handleToggleTitleBar]);

  // Estado para mostrar/ocultar la barra de pestañas del marco principal
  const [tabBarCollapsed, setTabBarCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('nodeterm_tabbar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('nodeterm_tabbar_collapsed', tabBarCollapsed.toString());
    } catch {
      // ignorar errores de persistencia
    }
    if (tabBarCollapsed) {
      document.body.classList.add('tab-bar-hidden');
    } else {
      document.body.classList.remove('tab-bar-hidden');
    }
    return () => document.body.classList.remove('tab-bar-hidden');
  }, [tabBarCollapsed]);

  const handleToggleTabBar = React.useCallback(() => {
    setTabBarCollapsed(prev => !prev);
  }, []);

  React.useEffect(() => {
    const toggleTabbarEvent = () => handleToggleTabBar();
    window.addEventListener('toggle-tabbar', toggleTabbarEvent);
    return () => window.removeEventListener('toggle-tabbar', toggleTabbarEvent);
  }, [handleToggleTabBar]);

  // Estado para mostrar/ocultar el marco superior del TerminalFrame principal
  const [mainFrameHeaderCollapsed, setMainFrameHeaderCollapsed] = React.useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    const toggleMainFrameHeader = () => setMainFrameHeaderCollapsed(prev => !prev);
    window.addEventListener('toggle-main-frame-header', toggleMainFrameHeader);
    return () => window.removeEventListener('toggle-main-frame-header', toggleMainFrameHeader);
  }, []);

  React.useEffect(() => {
    try {
      persistSyncedSetting(
        STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED,
        mainFrameHeaderCollapsed.toString()
      );
      window.dispatchEvent(new CustomEvent('main-frame-header-visibility-changed', {
        detail: { collapsed: mainFrameHeaderCollapsed }
      }));
    } catch {
      // Ignorar errores de persistencia
    }
  }, [mainFrameHeaderCollapsed]);

  // Sincronizar estado cuando cambia externamente (Settings o Storage o Presets)
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail?.collapsed !== undefined) {
        setMainFrameHeaderCollapsed(e.detail.collapsed);
      } else if (e.detail?.source === 'preset') {
        // Al aplicar un preset, leer el nuevo valor de localStorage
        const saved = localStorage.getItem(STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED);
        setMainFrameHeaderCollapsed(saved === 'true');
      }
    };

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED) {
        setMainFrameHeaderCollapsed(e.newValue === 'true');
      }
    };

    window.addEventListener('main-frame-header-toggle', handleUpdate);
    window.addEventListener('settings-updated', handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('main-frame-header-toggle', handleUpdate);
      window.removeEventListener('settings-updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // === MODO MINIMALISTA ABSOLUTO ===
  const [isMinimalMode, setIsMinimalMode] = React.useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.MINIMAL_MODE) === 'true';
    } catch {
      return false;
    }
  });

  // Persistir y sincronizar clase CSS global
  React.useEffect(() => {
    persistSyncedSetting(STORAGE_KEYS.MINIMAL_MODE, isMinimalMode.toString());
    // Añadir/quitar clase global para reglas CSS que lo necesiten
    if (isMinimalMode) {
      document.body.classList.add('minimalist-terminal-mode');
    } else {
      document.body.classList.remove('minimalist-terminal-mode');
    }
  }, [isMinimalMode]);

  React.useEffect(() => {
    const reloadMinimalMode = () => {
      try {
        setIsMinimalMode(localStorage.getItem(STORAGE_KEYS.MINIMAL_MODE) === 'true');
      } catch { /* noop */ }
    };
    window.addEventListener('localstorage-sync-ready', reloadMinimalMode);
    window.addEventListener('settings-updated', reloadMinimalMode);
    return () => {
      window.removeEventListener('localstorage-sync-ready', reloadMinimalMode);
      window.removeEventListener('settings-updated', reloadMinimalMode);
    };
  }, []);

  const isMinimalModeRef = React.useRef(isMinimalMode);
  isMinimalModeRef.current = isMinimalMode;

  // Escuchar evento de toggle desde cualquier componente
  React.useEffect(() => {
    const isShortcutCaptureActive = () => (
      document.body.dataset.capturingShortcut === 'true'
      || !!document.querySelector('[data-capturing-shortcut="true"]')
    );

    const hasBlockingOverlay = () => !!(
      document.querySelector('.p-dialog-mask:not([style*="display: none"])')
      || document.querySelector('.p-sidebar-mask')
      || document.querySelector('.p-confirm-dialog')
      || document.querySelector('.connection-search-palette')
      || document.querySelector('[role="dialog"][aria-modal="true"]')
    );

    const handleToggle = () => {
      if (isShortcutCaptureActive()) {
        return;
      }
      setIsMinimalMode(prev => !prev);
    };

    const handleKeyDown = (e) => {
      if (e.repeat || isShortcutCaptureActive()) {
        return;
      }

      // Ctrl/Cmd + Shift + M: toggle del modo minimalista (evita AltGr = Ctrl+Alt).
      const isToggleChord = (e.ctrlKey || e.metaKey)
        && e.shiftKey
        && !e.altKey
        && (e.code === 'KeyM' || String(e.key).toLowerCase() === 'm');

      if (isToggleChord) {
        e.preventDefault();
        e.stopPropagation();
        handleToggle();
        return;
      }

      // Escape sale del modo minimalista (no lo activa).
      // Si hay un modal abierto, dejar que Escape lo cierre primero.
      if (e.key === 'Escape' && isMinimalModeRef.current && !hasBlockingOverlay()) {
        e.preventDefault();
        e.stopPropagation();
        setIsMinimalMode(false);
      }
    };

    window.addEventListener('toggle-minimal-mode', handleToggle);
    // capture:true — xterm y otros capturan el foco; en bubble a menudo no llega
    window.addEventListener('keydown', handleKeyDown, true);
    const shortcutFromMain = window.electron?.onMinimalModeShortcut?.(handleToggle);
    return () => {
      window.removeEventListener('toggle-minimal-mode', handleToggle);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.electron?.offMinimalModeShortcut?.(shortcutFromMain);
    };
  }, []);

  return {
    titleBarCollapsed,
    setTitleBarCollapsed,
    handleToggleTitleBar,
    tabBarCollapsed,
    setTabBarCollapsed,
    handleToggleTabBar,
    mainFrameHeaderCollapsed,
    setMainFrameHeaderCollapsed,
    isMinimalMode,
    setIsMinimalMode,
  };
}
