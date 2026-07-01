import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Slider } from 'primereact/slider';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Toast } from 'primereact/toast';
import { Badge } from 'primereact/badge';
import { Checkbox } from 'primereact/checkbox';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Card } from 'primereact/card';
import { useTranslation } from '../i18n/hooks/useTranslation';
import ThemeSelector from './ThemeSelector';
import StatusBarSettingsTab from './StatusBarSettingsTab';
import TabThemeSelector from './TabThemeSelector';
import LayoutThemeSelector from './LayoutThemeSelector';
import SyncSettingsDialog from './SyncSettingsDialog';
import UpdatePanel from './UpdatePanel';
import ExportDialog from './ExportDialog';
import ImportExportDialog from './ImportExportDialog';
import ImportWizardDialog from './ImportWizardDialog';
import { themes } from '../themes';
import { getVersionInfo, getFullVersionInfo } from '../version-info';
import { iconThemes } from '../themes/icon-themes';
import { explorerFonts } from '../themes';
import { buildSidebarFontStack } from '../utils/sidebarFontStack';
import { uiThemes } from '../themes/ui-themes';
import SecureStorage from '../services/SecureStorage';
import localStorageSyncService from '../services/LocalStorageSyncService';
import FontPreview, { MonospaceFontPreview } from './FontPreview';
import {
  FaFolder, FaFile, FaFilePdf, FaFileWord, FaFileExcel
} from 'react-icons/fa';
import { STORAGE_KEYS } from '../utils/constants';
import {
  buildDefaultTerminalOptions,
  getPlatformDefaultTerminalType,
  sanitizeAndPersistDefaultTerminal
} from '../utils/defaultLocalTerminal';
import { persistSyncedSetting } from '../utils/persistSyncedSetting';
import {
  getConnectionSearchShortcut,
  setConnectionSearchShortcut,
  resetConnectionSearchShortcut,
  formatShortcutLabel,
  shortcutFromKeyboardEvent,
  isValidShortcut,
} from '../utils/keyboardShortcuts';
import { homeTabIcons, setHomeTabIcon, getHomeTabIconGroups } from '../themes/home-tab-icons';
import { groupTabIcons, setGroupTabIcon } from '../themes/group-tab-icons';
import AppsTab from './AppsTab';
import AppUpdateTab from './AppUpdateTab';
import SettingsSidebarNav from './SettingsSidebarNav';
import TerminalSettingsTab from './TerminalSettingsTab';
import PresetSelector from './PresetSelector';
import { useDialogResize } from '../hooks/useDialogResize';
import UsersSettingsTab from './UsersSettingsTab';
import { treeThemes, treeThemeOptions, getTreeTheme } from '../themes/tree-themes';
import { actionBarThemes } from '../themes/action-bar-themes';
import { sessionActionIconThemes, getDefaultSessionActionIconTheme } from '../themes/session-action-icons';
import { actionBarIconThemes, actionBarIconThemeList, getActionBarIcon, actionBarIconColors, actionBarIconNames } from '../themes/action-bar-icon-themes';
import '../styles/components/settings-sidebar.css';
import '../styles/components/tree-themes.css';

const LOCAL_FONT_FAMILY_STORAGE_KEY = 'basicapp_local_terminal_font_family';
const LOCAL_FONT_SIZE_STORAGE_KEY = 'basicapp_local_terminal_font_size';
const LOCAL_POWERSHELL_THEME_STORAGE_KEY = 'localPowerShellTheme';
const LOCAL_LINUX_TERMINAL_THEME_STORAGE_KEY = 'localLinuxTerminalTheme';
const INTERACTIVE_ICON_STORAGE_KEY = 'nodeterm_interactive_icon';

const SmoothIconSlider = ({ connectionIconSize, setConnectionIconSize }) => {
  const [localSize, setLocalSize] = useState(connectionIconSize || 20);
  const timeoutRef = useRef(null);
  const isChangingRef = useRef(false);

  // Sincronizar con el estado global solo cuando cambie externamente
  useEffect(() => {
    if (!isChangingRef.current) {
      setLocalSize(connectionIconSize || 20);
    }
  }, [connectionIconSize]);

  const updateGlobal = (val) => {
    if (setConnectionIconSize && val !== undefined && val !== null) {
      setConnectionIconSize(val);
    }
  };

  const handleChange = (e) => {
    const val = e.value;
    if (val === null || val === undefined) return;
    
    setLocalSize(val);
    isChangingRef.current = true;
    
    // Debounce para evitar lag en el renderizado global, pero manteniendo la UI local fluida
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateGlobal(val);
      // Damos un margen para que el estado global se propague antes de permitir resincronización
      setTimeout(() => {
        isChangingRef.current = false;
      }, 100);
    }, 50);
  };

  const handleSlideEnd = (e) => {
    const val = e.value;
    if (val === null || val === undefined) return;
    updateGlobal(val);
    isChangingRef.current = false;
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <Slider
        value={localSize}
        onChange={handleChange}
        onSlideEnd={handleSlideEnd}
        min={12}
        max={32}
        step={1}
        style={{ flex: 1, minWidth: '100px' }} // Aumentado para mejor precisión táctil/ratón
      />
      <div style={{
        background: 'rgba(var(--ui-button-primary-rgb), 0.1)',
        padding: '2px 8px',
        borderRadius: '6px',
        border: '1px solid rgba(var(--ui-button-primary-rgb), 0.2)',
        minWidth: '45px',
        textAlign: 'center'
      }}>
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--ui-button-primary)',
          fontWeight: 700
        }}>{localSize}</span>
      </div>
    </div>
  );
};

const SettingsContent = ({
  isEmbedded = false,
  propMainTab = null,
  propSubTab = null,
  visible = true,
  onHide,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  terminalTheme,
  setTerminalTheme,
  statusBarTheme,
  setStatusBarTheme,
  availableFonts,
  iconTheme,
  setIconTheme,
  explorerFont,
  setExplorerFont,
  explorerColorTheme,
  setExplorerColorTheme,
  iconThemeSidebar,
  setIconThemeSidebar,
  iconSize = 20,
  setIconSize,
  folderIconSize = 20,
  setFolderIconSize,
  connectionIconSize = 20,
  setConnectionIconSize,
  sidebarFont,
  setSidebarFont,
  sidebarFontSize,
  setSidebarFontSize,
  sidebarFontColor,
  setSidebarFontColor,
  explorerFontSize,
  setExplorerFontSize,
  statusBarPollingInterval,
  setStatusBarPollingInterval,
  statusBarLayout,
  setStatusBarLayout,
  statusBarIconTheme,
  setStatusBarIconTheme,
  localFontFamily,
  setLocalFontFamily,
  localFontSize,
  setLocalFontSize,
  localTerminalTheme,
  setLocalTerminalTheme,
  localPowerShellTheme,
  setLocalPowerShellTheme,
  localLinuxTerminalTheme,
  setLocalLinuxTerminalTheme,
  localDockerTerminalTheme,
  setLocalDockerTerminalTheme,
  dockerFontFamily,
  setDockerFontFamily,
  dockerFontSize,
  setDockerFontSize,
  exportTreeToJson,
  importTreeFromJson,
  sessionManager,
  onMasterPasswordConfigured,
  onMasterPasswordChanged,
  treeTheme = 'cursorCompact',
  setTreeTheme,
  sessionActionIconTheme = 'modern',
  setSessionActionIconTheme,
  nodes = [],
  onUpdateUserPassword,
  onEditConnection,
  masterKey,
  handleImportComplete,
  toast,
  setNodes
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [splashStyle, setSplashStyle] = useState('classic');
  const [showWizardInline, setShowWizardInline] = useState(false);

  useEffect(() => {
    if (window.electron && window.electron.theme && window.electron.theme.getSplashStyle) {
      window.electron.theme.getSplashStyle().then(style => {
        if (style) setSplashStyle(style);
      }).catch(err => console.warn('Error al cargar splash style:', err));
    }
  }, []);

  const handleSplashStyleChange = async (style) => {
    setSplashStyle(style);
    if (window.electron && window.electron.theme && window.electron.theme.saveSplashStyle) {
      const res = await window.electron.theme.saveSplashStyle(style);
      if (res && res.success && toastRef.current) {
        toastRef.current.show({
          severity: 'success',
          summary: 'Guardado',
          detail: 'El estilo de la pantalla de inicio se ha actualizado y se aplicará en el próximo arranque.',
          life: 3000
        });
      }
    }
  };

  // Hook para internacionalización
  const { t, locale, setLocale, availableLocales } = useTranslation('settings');

  // Estados para terminal por defecto
  const [defaultLocalTerminal, setDefaultLocalTerminal] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEFAULT_LOCAL_TERMINAL);
    if (saved) return saved;
    return getPlatformDefaultTerminalType();
  });

  // Estados para detectar terminales disponibles
  const [wslDistributions, setWslDistributions] = useState([]);
  const [wslDistributionsLoaded, setWslDistributionsLoaded] = useState(() => {
    const p = window.electron?.platform || 'unknown';
    return p !== 'win32';
  });
  const [cygwinDetectionDone, setCygwinDetectionDone] = useState(() => {
    const p = window.electron?.platform || 'unknown';
    return p !== 'win32';
  });
  const [dockerContainers, setDockerContainers] = useState([]);
  const [cygwinAvailable, setCygwinAvailable] = useState(false);
  const [platform, setPlatform] = useState(() => {
    return window.electron?.platform || 'unknown';
  });

  const [claudeClientEnabled, setClaudeClientEnabled] = useState(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
      return cfg.claude === true;
    } catch {
      return false;
    }
  });

  const [openCodeClientEnabled, setOpenCodeClientEnabled] = useState(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
      return cfg.opencode === true;
    } catch {
      return false;
    }
  });

  const [geminiCliClientEnabled, setGeminiCliClientEnabled] = useState(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
      return cfg.geminicli === true;
    } catch {
      return false;
    }
  });

  const [codexCliClientEnabled, setCodexCliClientEnabled] = useState(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
      return cfg.codexcli === true;
    } catch {
      return false;
    }
  });

  const [antigravityCliClientEnabled, setAntigravityCliClientEnabled] = useState(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
      return cfg.antigravitycli === true;
    } catch {
      return false;
    }
  });

  const [hermesCliClientEnabled, setHermesCliClientEnabled] = useState(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
      return cfg.hermescli === true;
    } catch {
      return false;
    }
  });

  // Hook para redimensionamiento del diálogo
  // storageKey: null para que siempre se abra con el tamaño por defecto
  const { dialogRef, size, startResize } = useDialogResize(
    null,
    { width: 1400, height: 900 },
    { minWidth: 1000, minHeight: 600, maxWidth: window.innerWidth * 0.98, maxHeight: window.innerHeight * 0.98 }
  );

  // Limpiar el tamaño guardado en localStorage al montar el componente
  useEffect(() => {
    try {
      localStorage.removeItem('settings-dialog-size');
    } catch (error) {
      console.warn('Error al limpiar settings-dialog-size del localStorage:', error);
    }
  }, []);

  // Estados para navegación con sidebar vertical
  const [activeMainTab, setActiveMainTab] = useState('general');
  const [activeSubTab, setActiveSubTab] = useState(null);

  // Sincronizar sección activa desde props si está embebido
  useEffect(() => {
    if (isEmbedded && propMainTab) {
      if (propMainTab === 'rdp') {
        setActiveMainTab('apps');
        setActiveSubTab('rdp');
      } else if (propMainTab === 'clientes-ia') {
        setActiveMainTab('apps');
        setActiveSubTab('ai');
      } else {
        setActiveMainTab(propMainTab);
        if (propSubTab) {
          setActiveSubTab(propSubTab);
        } else {
          setActiveSubTab(null);
        }
      }
    }
  }, [isEmbedded, propMainTab, propSubTab]);

  // Estados para TabViews ANIDADOS (dentro de Seguridad, Apariencia, etc.)
  const [securityActiveIndex, setSecurityActiveIndex] = useState(0);
  const [appearanceActiveIndex, setAppearanceActiveIndex] = useState(0);
  const [updatesActiveIndex, setUpdatesActiveIndex] = useState(0);

  // Función para convertir el tab seleccionado al índice del TabView PRINCIPAL
  // IMPORTANTE: Los TabPanels anidados (subitems) están dentro de sus padres,
  // así que necesitamos cambiar al padre y luego al subitem
  const getMainTabIndexFromTab = (mainTab) => {
    const mainTabMap = {
      'general': 0,
      'seguridad': 1,
      'usuarios': 2,
      'apariencia': 3,
      'apps': 4,
      'rdp': 4,
      'clientes-ia': 4,
      'actualizaciones': 5,
      'sincronizacion': 6,
      'importar-exportar': 7,
      'informacion': 8
    };
    return mainTabMap[mainTab] || 0;
  };

  // Función para obtener el índice del TabPanel anidado DENTRO de su padre
  const getSubTabIndexFromTab = (mainTab, subTab) => {
    if (!subTab) return null;

    // Map de subitems a sus índices dentro del TabView padre
    const subTabMap = {
      // Dentro de Seguridad (índice 1)
      'clave-maestra': { parent: 'seguridad', index: 0 },
      'auditoria': { parent: 'seguridad', index: 1 },
      'nueva-pestana': { parent: 'seguridad', index: 2 },
      // Dentro de Apariencia (índice 2)
      'interfaz': { parent: 'apariencia', index: 0 },
      'layouts': { parent: 'apariencia', index: 1 },
      'pestanas': { parent: 'apariencia', index: 2 },
      'pagina-inicio': { parent: 'apariencia', index: 3 },
      'terminal': { parent: 'apariencia', index: 4 },
      'status-bar': { parent: 'apariencia', index: 5 },
      'explorador-sesiones': { parent: 'apariencia', index: 6 },
      'explorador-archivos': { parent: 'apariencia', index: 7 },
      'presets': { parent: 'apariencia', index: 8 },
      // Dentro de Actualizaciones (índice 6)
      'nodeterm': { parent: 'actualizaciones', index: 0 },
      'servidores-docker': { parent: 'actualizaciones', index: 1 }
    };
    return subTabMap[subTab];
  };

  // Actualizar activeIndex cuando cambia el tab seleccionado
  React.useEffect(() => {
    const mainIndex = getMainTabIndexFromTab(activeMainTab);
    setActiveIndex(mainIndex);

    // Si hay un subTab, también actualizar el índice del TabView anidado
    if (activeSubTab) {
      const subInfo = getSubTabIndexFromTab(activeMainTab, activeSubTab);
      if (subInfo) {
        console.log(`[SettingsDialog] Actualizando TabView anidado para ${activeMainTab}: index=${subInfo.index}`);

        // Actualizar el índice del TabView anidado según el parent
        if (activeMainTab === 'seguridad') {
          setSecurityActiveIndex(subInfo.index);
        } else if (activeMainTab === 'apariencia') {
          setAppearanceActiveIndex(subInfo.index);
        } else if (activeMainTab === 'actualizaciones') {
          setUpdatesActiveIndex(subInfo.index);
        }
      }
    }

    // Log para debug (deshabilitado)
    // console.log(`[SettingsDialog] Tab seleccionado: mainTab=${activeMainTab}, subTab=${activeSubTab}, mainIndex=${mainIndex}`);
  }, [activeMainTab, activeSubTab]);

  // Escuchar evento para abrir pestañas específicas desde otros componentes
  useEffect(() => {
    const handleOpenSettingsTab = (e) => {
      const { tab, subTab } = e.detail || {};
      if (!tab) return;

      // Mapping de nombres cortos/ingles a las claves internas en español
      const tabMap = {
        'security': 'seguridad',
        'users': 'usuarios',
        'sync': 'sincronizacion',
        'appearance': 'apariencia',
        'updates': 'actualizaciones',
        'about': 'informacion',
        'ai': 'clientes-ia',
        'general': 'general',
        'rdp': 'rdp',
        'import-export': 'importar-exportar',
        'import': 'importar-exportar',
        'export': 'importar-exportar',
        'importar-exportar': 'importar-exportar'
      };

      const targetTab = tabMap[tab] || tab;
      setActiveMainTab(targetTab);

      if (targetTab === 'importar-exportar' && subTab === 'wizard') {
        setShowWizardInline(true);
      } else if (targetTab === 'importar-exportar') {
        setShowWizardInline(false);
      }

      if (subTab && targetTab !== 'importar-exportar') {
        setActiveSubTab(subTab);
      }
    };

    window.addEventListener('open-settings-dialog', handleOpenSettingsTab);
    return () => window.removeEventListener('open-settings-dialog', handleOpenSettingsTab);
  }, []);

  const [versionInfo, setVersionInfo] = useState({ appVersion: '' });
  const [syncDialogVisible, setSyncDialogVisible] = useState(false);

  // Configuración para bloquear el botón de inicio
  const [lockHomeButton, setLockHomeButton] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCK_HOME_BUTTON);
    if (saved === null) return true;
    try {
      return JSON.parse(saved);
    } catch {
      return saved === 'true';
    }
  });

  const [interactiveIcon, setInteractiveIcon] = useState(() => {
    const saved = localStorage.getItem(INTERACTIVE_ICON_STORAGE_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  // Configuración para sidebar colapsada por defecto
  const [sidebarStartCollapsed, setSidebarStartCollapsed] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED);
    return saved ? JSON.parse(saved) : true; // Por defecto true (colapsada)
  });

  // Configuración del icono de la pestaña de inicio
  const [selectedHomeIcon, setSelectedHomeIcon] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.HOME_TAB_ICON) || 'modernHouseWindowFilled';
  });

  const [selectedGroupIcon, setSelectedGroupIcon] = useState(() => {
    return localStorage.getItem('group_tab_icon') || 'groupGrid';
  });

  // Configuración de tipografía de HomeTab
  const [homeTabFont, setHomeTabFont] = useState(() => {
    try {
      return localStorage.getItem('homeTabFont') || explorerFonts[0];
    } catch {
      return explorerFonts[0];
    }
  });

  const [homeTabFontSize, setHomeTabFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem('homeTabFontSize');
      return saved ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });

  // Tema de iconos de la barra de acciones
  const [actionBarIconTheme, setActionBarIconTheme] = useState(() => {
    try {
      return localStorage.getItem('actionBarIconTheme') || 'original';
    } catch {
      return 'original';
    }
  });

  // Tema visual de la barra de acciones (Contenedor/Efectos)
  const [actionBarTheme, setActionBarTheme] = useState(() => {
    try {
      return localStorage.getItem('actionBarTheme') || 'default';
    } catch {
      return 'default';
    }
  });

  const activeActionBarVisualTheme = useMemo(() => {
    return actionBarThemes[actionBarTheme] || actionBarThemes.default;
  }, [actionBarTheme]);

  // Configuración para mostrar/ocultar terminal local al iniciar
  const [localTerminalVisible, setLocalTerminalVisible] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE);
      return saved !== null ? saved === 'true' : false; // Por defecto false (oculto)
    } catch {
      return false;
    }
  });

  // Configuración para mostrar/ocultar statusbar al iniciar
  const [statusBarVisible, setStatusBarVisible] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE);
      return saved !== null ? saved === 'true' : true; // Por defecto true (visible)
    } catch {
      return true;
    }
  });

  const [mainFrameHeaderCollapsed, setMainFrameHeaderCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [connectionSearchShortcut, setConnectionSearchShortcutState] = useState(() => getConnectionSearchShortcut());
  const [isCapturingConnectionSearchShortcut, setIsCapturingConnectionSearchShortcut] = useState(false);
  const connectionSearchShortcutInputRef = useRef(null);

  const persistConnectionSearchShortcut = useCallback((shortcut) => {
    const saved = setConnectionSearchShortcut(shortcut);
    setConnectionSearchShortcutState(saved);
    persistSyncedSetting(
      STORAGE_KEYS.CONNECTION_SEARCH_SHORTCUT,
      JSON.stringify(saved)
    );
    window.dispatchEvent(new Event('settings-updated'));
    return saved;
  }, []);

  const handleResetConnectionSearchShortcut = useCallback(() => {
    const saved = resetConnectionSearchShortcut();
    setConnectionSearchShortcutState(saved);
    setIsCapturingConnectionSearchShortcut(false);
    persistSyncedSetting(STORAGE_KEYS.CONNECTION_SEARCH_SHORTCUT, null);
    window.dispatchEvent(new Event('settings-updated'));
  }, []);

  const startConnectionSearchShortcutCapture = useCallback(() => {
    setIsCapturingConnectionSearchShortcut(true);
    requestAnimationFrame(() => {
      connectionSearchShortcutInputRef.current?.focus?.();
    });
  }, []);

  useEffect(() => {
    if (!isCapturingConnectionSearchShortcut) {
      delete document.body.dataset.capturingShortcut;
      return undefined;
    }

    document.body.dataset.capturingShortcut = 'true';

    const handleCapture = (event) => {
      event.preventDefault();
      event.stopPropagation();

      const shortcut = shortcutFromKeyboardEvent(event);
      if (!shortcut || !isValidShortcut(shortcut)) {
        return;
      }

      persistConnectionSearchShortcut(shortcut);
      setIsCapturingConnectionSearchShortcut(false);
    };

    window.addEventListener('keydown', handleCapture, true);
    return () => {
      window.removeEventListener('keydown', handleCapture, true);
      delete document.body.dataset.capturingShortcut;
    };
  }, [isCapturingConnectionSearchShortcut, persistConnectionSearchShortcut]);

  // Sincronizar mainFrameHeaderCollapsed con App y persistencia
  useEffect(() => {
    const value = mainFrameHeaderCollapsed.toString();
    persistSyncedSetting(STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED, value);
    window.dispatchEvent(new CustomEvent('main-frame-header-toggle', {
      detail: { collapsed: mainFrameHeaderCollapsed }
    }));
  }, [mainFrameHeaderCollapsed]);

  useEffect(() => {
    const handleSync = (e) => {
      if (e.detail?.collapsed !== undefined) {
        setMainFrameHeaderCollapsed(e.detail.collapsed);
      } else if (e.detail?.source === 'preset') {
        const saved = localStorage.getItem(STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED);
        setMainFrameHeaderCollapsed(saved === 'true');
      }
    };
    window.addEventListener('main-frame-header-visibility-changed', handleSync);
    window.addEventListener('settings-updated', handleSync);
    return () => {
      window.removeEventListener('main-frame-header-visibility-changed', handleSync);
      window.removeEventListener('settings-updated', handleSync);
    };
  }, []);

  // RDP settings (persisted in localStorage)
  // Ahora en MINUTOS para los umbrales de inactividad/actividad
  const [rdpIdleMinutes, setRdpIdleMinutes] = useState(() => {
    const v = parseInt(localStorage.getItem('rdp_idle_threshold_ms') || '60000', 10);
    return Math.max(1, Math.floor(v / 60000));
  });
  const [rdpSessionActivityMinutes, setRdpSessionActivityMinutes] = useState(() => {
    const v = parseInt(localStorage.getItem('rdp_freeze_timeout_ms') || '7200000', 10); // 2 horas por defecto
    return Math.max(1, Math.floor(v / 60000));
  });
  const [rdpResizeDebounceMs, setRdpResizeDebounceMs] = useState(() => {
    const v = parseInt(localStorage.getItem('rdp_resize_debounce_ms') || '300', 10);
    return Math.max(100, Math.min(2000, v));
  });
  const [rdpResizeAckTimeoutMs, setRdpResizeAckTimeoutMs] = useState(() => {
    const v = parseInt(localStorage.getItem('rdp_resize_ack_timeout_ms') || '1500', 10);
    return Math.max(600, Math.min(5000, v));
  });
  const [rdpGuacdInactivityMs, setRdpGuacdInactivityMs] = useState(3600000);

  // Estados para la gestión de seguridad
  const [secureStorage] = useState(() => new SecureStorage());
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [hasMasterKey, setHasMasterKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toastRef = useRef(null);

  // Estados para configuración de auditoría
  const [autoRecordingEnabled, setAutoRecordingEnabled] = useState(() => {
    return localStorage.getItem('audit_auto_recording') === 'true';
  });
  const [recordingQuality, setRecordingQuality] = useState(() => {
    return localStorage.getItem('audit_recording_quality') || 'medium';
  });
  const [encryptRecordings, setEncryptRecordings] = useState(() => {
    return localStorage.getItem('audit_encrypt_recordings') === 'true';
  });
  const [recordingPath, setRecordingPath] = useState(null);
  const [isDefaultPath, setIsDefaultPath] = useState(true);
  const [loadingPath, setLoadingPath] = useState(false);
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(() => {
    return localStorage.getItem('audit_auto_cleanup') === 'true';
  });
  const [retentionDays, setRetentionDays] = useState(() => {
    return parseInt(localStorage.getItem('audit_retention_days')) || 30;
  });
  const [maxStorageSize, setMaxStorageSize] = useState(() => {
    return parseFloat(localStorage.getItem('audit_max_storage_size')) || 5.0;
  });
  const [cleanupOnStartup, setCleanupOnStartup] = useState(() => {
    return localStorage.getItem('audit_cleanup_on_startup') === 'true';
  });
  const [cleanupFrequency, setCleanupFrequency] = useState(() => {
    return localStorage.getItem('audit_cleanup_frequency') || 'weekly';
  });
  const [auditStats, setAuditStats] = useState(null);

  // Estados para actualizaciones
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloaded
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(() => {
    const stored = localStorage.getItem('update_auto_check');
    return stored !== null ? stored === 'true' : true;
  });
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState(() => {
    const stored = localStorage.getItem('update_auto_download');
    return stored !== null ? stored === 'true' : true;
  });
  const [autoInstallEnabled, setAutoInstallEnabled] = useState(() => {
    const stored = localStorage.getItem('update_auto_install');
    return stored !== null ? stored === 'true' : false;
  });
  const [updateChannel, setUpdateChannel] = useState(() => {
    const stored = localStorage.getItem('update_channel');
    return stored || 'latest';
  });
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [currentAppVersion, setCurrentAppVersion] = useState(() => getVersionInfo().appVersion || '1.0.0');

  // Escuchar eventos del actualizador (update-available, update-downloaded, etc.) para actualizar la UI
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;
    const handleUpdaterEvent = (ev) => {
      const { event, data } = ev;
      switch (event) {
        case 'update-available':
          setUpdateStatus('available');
          setUpdateInfo(data);
          setIsCheckingUpdates(false);
          if (toastRef?.current) {
            toastRef.current.show({
              severity: 'info',
              summary: t('updateChannels.available'),
              detail: `${t('updateChannels.newVersion') || 'Nueva versión'}: ${data?.version || ''}`,
              life: 5000,
            });
          }
          break;
        case 'update-downloaded':
          setUpdateStatus('downloaded');
          setUpdateInfo(data);
          setDownloadProgress(100);
          setIsDownloading(false);
          if (toastRef?.current) {
            toastRef.current.show({
              severity: 'success',
              summary: t('updateChannels.downloadComplete'),
              detail: t('updateChannels.downloadCompleteDetail'),
              life: 5000,
            });
          }
          break;
        case 'update-not-available':
          setUpdateStatus('idle');
          setUpdateInfo(null);
          setIsCheckingUpdates(false);
          if (toastRef?.current) {
            toastRef.current.show({
              severity: 'success',
              summary: t('updateChannels.upToDate'),
              detail: t('updateChannels.upToDateDetail'),
              life: 3000,
            });
          }
          break;
        case 'download-progress':
          setUpdateStatus('downloading');
          setDownloadProgress(data?.percent ?? 0);
          break;
        case 'error':
          setUpdateStatus('error');
          setIsCheckingUpdates(false);
          setIsDownloading(false);
          break;
        default:
          break;
      }
    };
    const unsubscribe = window.electron.ipcRenderer.on('updater-event', handleUpdaterEvent);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [t]);

  // Al abrir la sección Actualizaciones, sincronizar estado con el main (p. ej. si ya hay actualización descargada)
  useEffect(() => {
    if (activeMainTab !== 'actualizaciones' || !window.electron?.updater) return;
    window.electron.updater.getUpdateInfo().then((result) => {
      if (!result) return;
      if (result.currentVersion) setCurrentAppVersion(result.currentVersion);
      if (result.isUpdateDownloaded && result.updateInfo) {
        setUpdateStatus('downloaded');
        setUpdateInfo(result.updateInfo);
        setDownloadProgress(100);
      } else if (result.updateAvailable && result.updateInfo) {
        setUpdateStatus('available');
        setUpdateInfo(result.updateInfo);
      } else {
        setUpdateStatus('idle');
        setUpdateInfo(null);
      }
    }).catch(() => { });
  }, [activeMainTab]);

  // Función para cambiar el canal de actualizaciones
  const handleChannelChange = (channel) => {
    setUpdateChannel(channel);
    localStorage.setItem('update_channel', channel);

    if (toastRef && toastRef.current) {
      const channelLabel = channel === 'latest' ? t('updateChannels.stable') : t('updateChannels.beta');
      toastRef.current.show({
        severity: 'success',
        summary: t('updateChannels.channelUpdated'),
        detail: t('updateChannels.message').replace('{channel}', channelLabel),
        life: 2000,
      });
    }
  };

  // Función para verificar actualizaciones
  const checkForUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateStatus('checking');

    try {
      if (window.electron?.updater) {
        console.log('🔍 Buscando actualizaciones en canal:', updateChannel);
        const result = await window.electron.updater.checkForUpdates();

        console.log('📦 Resultado de búsqueda:', result);

        // El main devuelve enseguida; update-available / update-not-available llegan por evento
        if (result?.updateAvailable && result?.updateInfo) {
          setUpdateStatus('available');
          setUpdateInfo(result.updateInfo);
          if (toastRef && toastRef.current) {
            toastRef.current.show({
              severity: 'info',
              summary: t('updateChannels.available'),
              detail: `Nueva versión: ${result.updateInfo?.version || ''}`,
              life: 5000,
            });
          }
        }
        // Si no hay updateAvailable, no poner 'idle' aquí; lo pondrá el evento update-not-available
      } else {
        throw new Error(t('updateChannels.notAvailable'));
      }
    } catch (error) {
      console.error('❌ Error al verificar actualizaciones:', error);
      setUpdateStatus('error');

      if (toastRef && toastRef.current) {
        toastRef.current.show({
          severity: 'error',
          summary: 'Error',
          detail: error.message || t('updateChannels.checkError'),
          life: 5000,
        });
      }
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Función para descargar la actualización
  const downloadUpdate = async () => {
    setIsDownloading(true);
    setUpdateStatus('downloading');
    setDownloadProgress(0);

    try {
      if (window.electron?.updater) {
        console.log('⬇️ Descargando actualización...');

        // Suscribirse a eventos de progreso
        const handleProgressEvent = (data) => {
          console.log('📊 Progreso de descarga:', data.percent);
          setDownloadProgress(data.percent || 0);
        };

        if (window.electron?.ipcRenderer) {
          const unsubscribe = window.electron.ipcRenderer.on('updater-event', (event) => {
            if (event.event === 'download-progress') {
              handleProgressEvent(event.data);
            }
          });

          await window.electron.updater.downloadUpdate();

          // Esperar un poco para asegurar que se completa la descarga
          setTimeout(() => {
            setUpdateStatus('downloaded');
            setDownloadProgress(100);
            setIsDownloading(false);

            if (toastRef && toastRef.current) {
              toastRef.current.show({
                severity: 'success',
                summary: t('updateChannels.downloadComplete'),
                detail: t('updateChannels.downloadCompleteDetail'),
                life: 3000,
              });
            }

            if (unsubscribe && typeof unsubscribe === 'function') {
              unsubscribe();
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ Error descargando actualización:', error);
      setUpdateStatus('error');
      setIsDownloading(false);

      if (toastRef && toastRef.current) {
        toastRef.current.show({
          severity: 'error',
          summary: 'Error',
          detail: t('updateChannels.downloadError'),
          life: 5000,
        });
      }
    }
  };

  // Función para instalar la actualización
  const installUpdate = async () => {
    setIsInstalling(true);

    try {
      if (window.electron?.updater) {
        console.log('📦 Instalando actualización e reiniciando...');

        if (toastRef && toastRef.current) {
          toastRef.current.show({
            severity: 'info',
            summary: 'Instalando',
            detail: t('updateChannels.installing'),
            life: 3000,
          });
        }

        await window.electron.updater.quitAndInstall();
      }
    } catch (error) {
      console.error('❌ Error instalando actualización:', error);
      setIsInstalling(false);

      if (toastRef && toastRef.current) {
        toastRef.current.show({
          severity: 'error',
          summary: 'Error',
          detail: t('updateChannels.installError'),
          life: 5000,
        });
      }
    }
  };

  // Guardar configuración de actualizaciones
  const handleAutoCheckChange = (enabled) => {
    setAutoCheckEnabled(enabled);
    localStorage.setItem('update_auto_check', enabled.toString());

    if (toastRef && toastRef.current) {
      toastRef.current.show({
        severity: 'success',
        summary: 'Guardado',
        detail: enabled ? t('updateChannels.autoCheckEnabled') : t('updateChannels.autoCheckDisabled'),
        life: 2000,
      });
    }
  };

  const handleAutoDownloadChange = (enabled) => {
    setAutoDownloadEnabled(enabled);
    localStorage.setItem('update_auto_download', enabled.toString());

    if (toastRef && toastRef.current) {
      toastRef.current.show({
        severity: 'success',
        summary: 'Guardado',
        detail: enabled ? t('updateChannels.autoDownloadEnabled') : t('updateChannels.autoDownloadDisabled'),
        life: 2000,
      });
    }
  };

  const handleAutoInstallChange = async (enabled) => {
    setAutoInstallEnabled(enabled);
    localStorage.setItem('update_auto_install', enabled.toString());
    try {
      if (window.electron?.updater?.updateConfig) {
        await window.electron.updater.updateConfig({ autoInstall: enabled });
      }
    } catch (e) {
      console.warn('[Settings] No se pudo sincronizar autoInstall con el proceso principal:', e);
    }
    if (toastRef && toastRef.current) {
      toastRef.current.show({
        severity: 'success',
        summary: 'Guardado',
        detail: enabled ? t('updateChannels.autoInstallEnabled') : t('updateChannels.autoInstallDisabled'),
        life: 2000,
      });
    }
  };

  const HomeIconSelectorGrid = useMemo(() => {
    return function HomeIconSelectorGrid({ selected, onSelect }) {
      const opRef = useRef(null);
      const groups = getHomeTabIconGroups();
      const [activeTab, setActiveTab] = useState(0);
      const openPanel = (e) => opRef.current?.toggle(e);
      const currentIcon = homeTabIcons[selected];
      return (
        <div className="home-icon-selector">
          <button
            type="button"
            onClick={openPanel}
            className="home-icon-expandable-badge"
          >
            <div className="home-icon-badge-content">
              {currentIcon?.icon(20)}
              <span className="home-icon-badge-name">{currentIcon?.name || t('common.selectIcon')}</span>
            </div>
            <i className="pi pi-chevron-down home-icon-badge-chevron"></i>
          </button>
          <OverlayPanel ref={opRef} showCloseIcon dismissable style={{ width: 420, maxWidth: '90vw' }} className="home-icon-overlay">
            <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--text-color-secondary)' }}>
              Selecciona una categoría
            </div>
            <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)} className="home-icon-tabs">
              {groups.map(group => (
                <TabPanel key={group.label} header={group.label}>
                  <div className="home-icon-grid" style={{ paddingTop: 4 }}>
                    {group.items.map(item => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => { onSelect(item.value); opRef.current?.hide(); }}
                        className={`home-icon-grid-btn ${selected === item.value ? 'is-selected' : ''}`}
                        style={{ height: 44 }}
                        title={item.label}
                      >
                        <div style={{ transform: 'scale(1.0)' }}>{item.icon}</div>
                      </button>
                    ))}
                  </div>
                </TabPanel>
              ))}
            </TabView>
          </OverlayPanel>
        </div>
      );
    };
  }, []);

  const GroupIconSelectorGrid = useMemo(() => {
    return function GroupIconSelectorGrid({ selected, onSelect }) {
      const opRef = useRef(null);
      const openPanel = (e) => opRef.current?.toggle(e);
      const iconOptions = Object.entries(groupTabIcons).map(([key, iconData]) => ({
        key,
        name: iconData.name,
        icon: iconData.icon(18)
      }));
      const currentIcon = groupTabIcons[selected];

      return (
        <div className="group-icon-selector">
          <button
            type="button"
            onClick={openPanel}
            className="group-icon-expandable-badge"
          >
            <div className="group-icon-badge-content">
              {currentIcon?.icon(20)}
              <span className="group-icon-badge-name">{currentIcon?.name || t('common.selectIcon')}</span>
            </div>
            <i className="pi pi-chevron-down group-icon-badge-chevron"></i>
          </button>
          <OverlayPanel ref={opRef} showCloseIcon dismissable
            className="group-icon-overlay"
            style={{ width: '300px' }}
          >
            <div className="group-icon-grid">
              {iconOptions.map((option) => (
                <button
                  key={option.key}
                  className={`group-icon-grid-btn ${selected === option.key ? 'is-selected' : ''}`}
                  onClick={() => {
                    onSelect(option.key);
                    opRef.current?.hide();
                  }}
                  title={option.name}
                >
                  {option.icon}
                </button>
              ))}
            </div>
          </OverlayPanel>
        </div>
      );
    };
  }, [groupTabIcons]);

  // Guacd preferred method (docker|wsl|mock)
  const GUACD_PREF_KEY = 'nodeterm_guacd_preferred_method';
  const isWindows = window?.electron?.platform === 'win32';
  const methodOptions = isWindows
    ? [
      { label: 'Docker Desktop', value: 'docker' },
      { label: 'WSL', value: 'wsl' }
    ]
    : [
      { label: 'Docker', value: 'docker' },
      { label: 'Nativo (local)', value: 'native' }
    ];

  const [guacdPreferredMethod, setGuacdPreferredMethod] = useState(() => {
    const saved = (localStorage.getItem(GUACD_PREF_KEY) || 'docker').toLowerCase();
    const allowed = methodOptions.map(o => o.value);
    return allowed.includes(saved) ? saved : allowed[0];
  });
  const [guacdStatus, setGuacdStatus] = useState({ isRunning: false, method: 'unknown', port: 4822, host: '127.0.0.1' });
  const [guacdRestarting, setGuacdRestarting] = useState(false);

  // Función para reiniciar guacd manualmente
  const handleRestartGuacd = async () => {
    if (guacdRestarting) return;
    setGuacdRestarting(true);
    try {
      if (window?.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('guacamole:restart-guacd');
        if (result?.success) {
          // Actualizar el estado inmediatamente si viene en la respuesta
          if (result.status) {
            setGuacdStatus(result.status);
          } else {
            // Si no, refrescar el estado
            const st = await window.electron.ipcRenderer.invoke('guacamole:get-status');
            if (st && st.guacd) setGuacdStatus(st.guacd);
          }
        }
      }
    } catch (err) {
      console.error('Error reiniciando guacd:', err);
    } finally {
      setGuacdRestarting(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(GUACD_PREF_KEY, guacdPreferredMethod);
      if (window?.electron?.ipcRenderer) {
        window.electron.ipcRenderer.invoke('guacamole:set-preferred-method', guacdPreferredMethod).catch(() => { });
      }
    } catch { }
  }, [guacdPreferredMethod]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        if (window?.electron?.ipcRenderer) {
          const st = await window.electron.ipcRenderer.invoke('guacamole:get-status');
          if (st && st.guacd) setGuacdStatus(st.guacd);
        }
      } catch { }
    };
    fetchStatus();
    const t = setInterval(fetchStatus, 5000); // Reducido de 2000ms a 5000ms para ahorrar CPU/RAM
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Obtener la versión real de la app con información completa
    const loadVersionInfo = async () => {
      try {
        const info = await getFullVersionInfo();
        setVersionInfo(info);
      } catch (error) {
        console.warn('Error loading version info:', error);
        // Fallback a información básica
        const basicInfo = getVersionInfo();
        setVersionInfo(basicInfo);
      }
    };

    loadVersionInfo();
  }, []);

  useEffect(() => {
    const checkMasterKey = async () => {
      // Verificar si hay clave maestra guardada (async para multi-instancia)
      const hasKey = await secureStorage.checkHasSavedMasterKey();
      setHasMasterKey(hasKey);
    };
    checkMasterKey();
  }, [secureStorage]);

  const lockHomeButtonPersistReady = useRef(false);

  // Persistir configuración del botón de inicio
  useEffect(() => {
    persistSyncedSetting(STORAGE_KEYS.LOCK_HOME_BUTTON, JSON.stringify(lockHomeButton));
    if (lockHomeButtonPersistReady.current) {
      window.dispatchEvent(new Event('settings-updated'));
    } else {
      lockHomeButtonPersistReady.current = true;
    }
  }, [lockHomeButton]);

  // Detectar plataforma
  useEffect(() => {
    if (window.electron?.platform) {
      setPlatform(window.electron.platform);
    }
  }, []);

  // Detectar distribuciones WSL
  useEffect(() => {
    setWslDistributionsLoaded(platform !== 'win32');
    const detectWSLDistributions = async () => {
      try {
        if (platform === 'win32' && window.electron && window.electron.ipcRenderer) {
          const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
          if (Array.isArray(distributions)) {
            setWslDistributions(distributions);
          } else {
            setWslDistributions([]);
          }
        } else {
          setWslDistributions([]);
        }
      } catch (error) {
        console.error('Error en detección de distribuciones WSL:', error);
        setWslDistributions([]);
      } finally {
        setWslDistributionsLoaded(true);
      }
    };

    detectWSLDistributions();
  }, [platform]);

  // Detectar disponibilidad de Cygwin
  useEffect(() => {
    setCygwinDetectionDone(platform !== 'win32');
    const detectCygwin = async () => {
      try {
        if (platform === 'win32' && window.electronAPI) {
          const result = await window.electronAPI.invoke('cygwin:detect');
          if (result && typeof result.available === 'boolean') {
            setCygwinAvailable(result.available);
          } else {
            setCygwinAvailable(false);
          }
        } else {
          setCygwinAvailable(false);
        }
      } catch (error) {
        console.error('Error detectando Cygwin:', error);
        setCygwinAvailable(false);
      } finally {
        setCygwinDetectionDone(true);
      }
    };

    if (platform === 'win32') {
      detectCygwin();
    }
  }, [platform]);

  // Detectar contenedores Docker disponibles
  useEffect(() => {
    let mounted = true;

    const detectDocker = async () => {
      try {
        if (window.electron && window.electronAPI && mounted) {
          const result = await window.electronAPI.invoke('docker:list');
          if (mounted && result && result.success && Array.isArray(result.containers)) {
            setDockerContainers(result.containers);
          } else {
            setDockerContainers([]);
          }
        }
      } catch (error) {
        console.error('Error detectando Docker:', error);
        setDockerContainers([]);
      }
    };

    detectDocker();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;


    return () => { mounted = false; };
  }, [visible]);

  useEffect(() => {
    const syncClaudeClientState = () => {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        setClaudeClientEnabled(cfg.claude === true);
      } catch {
        setClaudeClientEnabled(false);
      }
    };

    const syncOpenCodeClientState = () => {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        setOpenCodeClientEnabled(cfg.opencode === true);
      } catch {
        setOpenCodeClientEnabled(false);
      }
    };

    const syncGeminiCliClientState = () => {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        setGeminiCliClientEnabled(cfg.geminicli === true);
      } catch {
        setGeminiCliClientEnabled(false);
      }
    };

    const syncCodexCliClientState = () => {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        setCodexCliClientEnabled(cfg.codexcli === true);
      } catch {
        setCodexCliClientEnabled(false);
      }
    };

    const syncAntigravityCliClientState = () => {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        setAntigravityCliClientEnabled(cfg.antigravitycli === true);
      } catch {
        setAntigravityCliClientEnabled(false);
      }
    };

    const syncHermesCliClientState = () => {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        setHermesCliClientEnabled(cfg.hermescli === true);
      } catch {
        setHermesCliClientEnabled(false);
      }
    };

    const onAiClientsConfigChanged = () => {
      syncClaudeClientState();
      syncOpenCodeClientState();
      syncGeminiCliClientState();
      syncCodexCliClientState();
      syncAntigravityCliClientState();
      syncHermesCliClientState();
    };
    const onStorage = (e) => {
      if (e.key === 'ai_clients_enabled') {
        syncClaudeClientState();
        syncOpenCodeClientState();
        syncGeminiCliClientState();
        syncCodexCliClientState();
        syncAntigravityCliClientState();
        syncHermesCliClientState();
      }
    };

    window.addEventListener('ai-clients-config-changed', onAiClientsConfigChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('ai-clients-config-changed', onAiClientsConfigChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const aiClientsEnabledForDefault = useMemo(() => ({
    claude: claudeClientEnabled,
    opencode: openCodeClientEnabled,
    geminicli: geminiCliClientEnabled,
    codexcli: codexCliClientEnabled,
    antigravitycli: antigravityCliClientEnabled,
    hermescli: hermesCliClientEnabled
  }), [claudeClientEnabled, openCodeClientEnabled, geminiCliClientEnabled, codexCliClientEnabled, antigravityCliClientEnabled, hermesCliClientEnabled]);

  const defaultTerminalOptions = useMemo(() => buildDefaultTerminalOptions({
    platform,
    wslDistributions,
    cygwinAvailable,
    aiClientsEnabled: aiClientsEnabledForDefault
  }), [platform, wslDistributions, cygwinAvailable, aiClientsEnabledForDefault]);

  const terminalOptionsReady = platform !== 'win32' || (wslDistributionsLoaded && cygwinDetectionDone);

  useEffect(() => {
    if (!terminalOptionsReady || defaultTerminalOptions.length === 0) return;
    const saved = localStorage.getItem(STORAGE_KEYS.DEFAULT_LOCAL_TERMINAL);
    const { value, changed } = sanitizeAndPersistDefaultTerminal(saved, defaultTerminalOptions, platform, {
      terminalOptionsReady: true
    });
    if (changed) {
      setDefaultLocalTerminal(value);
      persistSyncedSetting(STORAGE_KEYS.DEFAULT_LOCAL_TERMINAL, value, { immediate: true });
      window.dispatchEvent(new CustomEvent('default-terminal-changed', {
        detail: { terminalType: value }
      }));
    } else if (saved && defaultLocalTerminal !== saved) {
      setDefaultLocalTerminal(saved);
    }
  }, [defaultTerminalOptions, platform, terminalOptionsReady]);

  useEffect(() => {
    const reloadBehaviorFromStorage = () => {
      try {
        const lock = localStorage.getItem(STORAGE_KEYS.LOCK_HOME_BUTTON);
        if (lock !== null) {
          try {
            setLockHomeButton(JSON.parse(lock));
          } catch {
            setLockHomeButton(lock === 'true');
          }
        }
        const icon = localStorage.getItem(INTERACTIVE_ICON_STORAGE_KEY);
        if (icon !== null) setInteractiveIcon(JSON.parse(icon));
        const sidebar = localStorage.getItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED);
        if (sidebar !== null) setSidebarStartCollapsed(JSON.parse(sidebar));
        const header = localStorage.getItem(STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED);
        if (header !== null) setMainFrameHeaderCollapsed(header === 'true');
        const terminal = localStorage.getItem(STORAGE_KEYS.DEFAULT_LOCAL_TERMINAL);
        if (terminal) setDefaultLocalTerminal(terminal);
        setConnectionSearchShortcutState(getConnectionSearchShortcut());
      } catch {
        /* noop */
      }
    };
    window.addEventListener('localstorage-sync-ready', reloadBehaviorFromStorage);
    window.addEventListener('settings-updated', reloadBehaviorFromStorage);
    return () => {
      window.removeEventListener('localstorage-sync-ready', reloadBehaviorFromStorage);
      window.removeEventListener('settings-updated', reloadBehaviorFromStorage);
    };
  }, []);

  const handleDefaultTerminalChange = useCallback((terminalType) => {
    if (!terminalType || typeof terminalType !== 'string') return;
    setDefaultLocalTerminal(terminalType);
    persistSyncedSetting(STORAGE_KEYS.DEFAULT_LOCAL_TERMINAL, terminalType, { immediate: true });
    window.dispatchEvent(new CustomEvent('default-terminal-changed', {
      detail: { terminalType }
    }));
  }, []);



  // Persistir configuración del icono interactivo
  useEffect(() => {
    persistSyncedSetting(INTERACTIVE_ICON_STORAGE_KEY, JSON.stringify(interactiveIcon));
    // Aplicar inmediatamente el cambio
    const titleBar = document.querySelector('.title-bar');
    if (titleBar) {
      if (interactiveIcon) {
        titleBar.setAttribute('data-interactive-icon', 'true');
      } else {
        titleBar.removeAttribute('data-interactive-icon');
      }
    }
  }, [interactiveIcon]);

  const sidebarStartCollapsedUserChangeRef = useRef(false);

  // Persistir configuración de sidebar colapsada (solo aplica al panel si el usuario cambia esta opción)
  useEffect(() => {
    persistSyncedSetting(STORAGE_KEYS.SIDEBAR_START_COLLAPSED, JSON.stringify(sidebarStartCollapsed));
    if (sidebarStartCollapsedUserChangeRef.current) {
      window.dispatchEvent(new CustomEvent('apply-sidebar-start-collapsed', {
        detail: { collapsed: sidebarStartCollapsed }
      }));
    }
    window.dispatchEvent(new Event('settings-updated'));
  }, [sidebarStartCollapsed]);

  // Persistir configuración del icono de inicio
  useEffect(() => {
    setHomeTabIcon(selectedHomeIcon);
  }, [selectedHomeIcon]);

  // Persistir configuración del icono de grupos
  useEffect(() => {
    setGroupTabIcon(selectedGroupIcon);
  }, [selectedGroupIcon]);

  // Persist RDP settings (guardar en milisegundos)
  useEffect(() => {
    const ms = Math.max(60000, (rdpIdleMinutes || 0) * 60000);
    localStorage.setItem('rdp_idle_threshold_ms', String(ms));
  }, [rdpIdleMinutes]);
  // Ref para rastrear el último valor enviado y evitar guardados duplicados
  const lastSentGuacdTimeout = useRef(null);

  useEffect(() => {
    const ms = Math.max(60000, (rdpSessionActivityMinutes || 0) * 60000);
    localStorage.setItem('rdp_freeze_timeout_ms', String(ms));

    // Sincronizar automáticamente el watchdog de guacd con el umbral de sesión
    // para evitar que guacd cierre la conexión antes de que el vigilante pueda reconectar
    // Solo enviar si el valor realmente cambió
    if (lastSentGuacdTimeout.current !== ms) {
      lastSentGuacdTimeout.current = ms;
      setRdpGuacdInactivityMs(ms);
      try {
        if (window?.electron?.ipcRenderer) {
          window.electron.ipcRenderer.invoke('guacamole:set-guacd-timeout-ms', ms).catch(() => {
            // Si falla, permitir reintento
            lastSentGuacdTimeout.current = null;
          });
        }
      } catch { }
    }
  }, [rdpSessionActivityMinutes]);
  useEffect(() => {
    localStorage.setItem('rdp_resize_debounce_ms', String(Math.max(100, Math.min(2000, rdpResizeDebounceMs || 300))));
  }, [rdpResizeDebounceMs]);
  useEffect(() => {
    localStorage.setItem('rdp_resize_ack_timeout_ms', String(Math.max(600, Math.min(5000, rdpResizeAckTimeoutMs || 1500))));
  }, [rdpResizeAckTimeoutMs]);

  // Sincronizar watchdog de guacd con el proceso principal vía IPC al montar
  // Envía el valor de localStorage al backend para asegurar sincronización
  // Solo se ejecuta una vez al montar el componente
  const hasSyncedGuacdTimeout = useRef(false);
  useEffect(() => {
    // Evitar múltiples sincronizaciones
    if (hasSyncedGuacdTimeout.current) return;

    try {
      if (window?.electron?.ipcRenderer) {
        // Leer valor actual de localStorage (Umbral de actividad de sesión)
        const localStorageMs = parseInt(localStorage.getItem('rdp_freeze_timeout_ms') || '7200000', 10);
        const validMs = Math.max(60000, localStorageMs);

        // Marcar como sincronizado antes de la llamada para evitar llamadas duplicadas
        hasSyncedGuacdTimeout.current = true;

        // Enviar al backend para sincronizar
        window.electron.ipcRenderer.invoke('guacamole:set-guacd-timeout-ms', validMs)
          .then((res) => {
            if (res && res.success) {
              setRdpGuacdInactivityMs(validMs);
            }
          })
          .catch(() => {
            // Si falla, permitir reintento
            hasSyncedGuacdTimeout.current = false;
          });
      }
    } catch { }
  }, []);

  const handleGuacdInactivityChange = async (value) => {
    const normalized = Math.max(0, Number(value || 0));
    setRdpGuacdInactivityMs(normalized);
    try {
      if (window?.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('guacamole:set-guacd-timeout-ms', normalized);
      }
    } catch { }
  };

  // Función para restaurar valores por defecto de RDP
  const handleResetRdpDefaults = async () => {
    // Valores por defecto
    const defaultIdleMinutes = 1; // 60000 ms = 1 minuto
    const defaultSessionActivityMinutes = 120; // 7200000 ms = 2 horas
    const defaultResizeDebounceMs = 300;
    const defaultResizeAckTimeoutMs = 1500;

    // Restaurar estados
    setRdpIdleMinutes(defaultIdleMinutes);
    setRdpSessionActivityMinutes(defaultSessionActivityMinutes);
    setRdpResizeDebounceMs(defaultResizeDebounceMs);
    setRdpResizeAckTimeoutMs(defaultResizeAckTimeoutMs);

    // Los useEffect se encargarán de guardar en localStorage y sincronizar guacd
  };

  // Funciones para gestión de clave maestra
  const validateMasterPassword = () => {
    return masterPassword.length >= 6 && masterPassword === confirmPassword;
  };

  const validatePasswordChange = () => {
    return currentPassword.length >= 6 &&
      newPassword.length >= 6 &&
      newPassword === confirmNewPassword &&
      newPassword !== currentPassword;
  };

  const showToast = (severity, summary, detail) => {
    if (toast) {
      toast.show({ severity, summary, detail, life: 3000 });
    }
  };

  const handleSaveMasterPassword = async () => {
    if (!validateMasterPassword()) {
      showToast('error', 'Error', 'Las contraseñas deben tener al menos 6 caracteres y coincidir');
      return;
    }

    setIsLoading(true);
    try {
      await secureStorage.saveMasterKey(masterPassword);
      setHasMasterKey(true);

      // Notificar a App.js que se configuró la master password
      if (onMasterPasswordConfigured) {
        onMasterPasswordConfigured(masterPassword);
      }

      setMasterPassword('');
      setConfirmPassword('');
      showToast('success', 'Éxito', 'Clave maestra configurada correctamente');
    } catch (error) {
      console.error('Error guardando clave maestra:', error);
      showToast('error', 'Error', 'Error al guardar la clave maestra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeMasterPassword = async () => {
    if (!validatePasswordChange()) {
      showToast('error', 'Error', 'Verifica que las contraseñas sean válidas y diferentes');
      return;
    }

    setIsLoading(true);
    try {
      await secureStorage.changeMasterKey(currentPassword, newPassword);

      // Actualizar el estado en App.js con la nueva clave
      if (onMasterPasswordChanged) {
        onMasterPasswordChanged(newPassword);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('success', 'Éxito', 'Clave maestra actualizada correctamente');
    } catch (error) {
      console.error('Error cambiando clave maestra:', error);
      showToast('error', 'Error', error.message || 'Error al cambiar la clave maestra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMasterKey = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar la clave maestra? Esto eliminará todas las sesiones guardadas de forma segura.')) {
      secureStorage.clearMasterKey();
      setHasMasterKey(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('info', 'Información', 'Clave maestra eliminada');
    }
  };

  // Persistir configuración de auditoría
  useEffect(() => {
    localStorage.setItem('audit_auto_recording', String(autoRecordingEnabled));
  }, [autoRecordingEnabled]);

  useEffect(() => {
    localStorage.setItem('audit_recording_quality', recordingQuality);
  }, [recordingQuality]);

  useEffect(() => {
    localStorage.setItem('audit_encrypt_recordings', String(encryptRecordings));
  }, [encryptRecordings]);

  useEffect(() => {
    localStorage.setItem('audit_auto_cleanup', String(autoCleanupEnabled));
  }, [autoCleanupEnabled]);

  useEffect(() => {
    localStorage.setItem('audit_retention_days', String(retentionDays));
  }, [retentionDays]);

  useEffect(() => {
    localStorage.setItem('audit_max_storage_size', String(maxStorageSize));
  }, [maxStorageSize]);

  useEffect(() => {
    localStorage.setItem('audit_cleanup_on_startup', String(cleanupOnStartup));
  }, [cleanupOnStartup]);

  useEffect(() => {
    localStorage.setItem('audit_cleanup_frequency', cleanupFrequency);
  }, [cleanupFrequency]);

  // Persistir configuración de tipografía de HomeTab
  useEffect(() => {
    try {
      localStorage.setItem('homeTabFont', homeTabFont);
      window.dispatchEvent(new CustomEvent('home-tab-font-changed'));
    } catch { }
  }, [homeTabFont]);

  useEffect(() => {
    try {
      localStorage.setItem('homeTabFontSize', String(homeTabFontSize));
      window.dispatchEvent(new CustomEvent('home-tab-font-changed'));
    } catch { }
  }, [homeTabFontSize]);

  // Persistir tema de iconos de la barra de acciones
  useEffect(() => {
    try {
      localStorage.setItem('actionBarIconTheme', actionBarIconTheme);
      window.dispatchEvent(new CustomEvent('action-bar-icon-theme-changed', {
        detail: { theme: actionBarIconTheme }
      }));
    } catch { }
  }, [actionBarIconTheme]);

  // Persistir configuración de visibilidad del terminal local
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE, String(localTerminalVisible));
      window.dispatchEvent(new CustomEvent('home-tab-local-terminal-visibility-changed'));
    } catch { }
  }, [localTerminalVisible]);

  // Persistir configuración de visibilidad de la statusbar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE, String(statusBarVisible));
      window.dispatchEvent(new CustomEvent('statusbar-visibility-changed', {
        detail: { visible: statusBarVisible }
      }));
    } catch { }
  }, [statusBarVisible]);

  // Cargar ruta de grabaciones
  useEffect(() => {
    const loadRecordingPath = async () => {
      try {
        if (window?.electron?.ipcRenderer) {
          setLoadingPath(true);
          const result = await window.electron.ipcRenderer.invoke('recording:get-path');
          if (result && result.success) {
            setRecordingPath(result.currentPath);
            setIsDefaultPath(result.isDefault);
          }
          setLoadingPath(false);
        }
      } catch (error) {
        console.error('Error cargando ruta de grabaciones:', error);
        setLoadingPath(false);
      }
    };

    if (visible && activeIndex === 3) { // Tab de Auditoría
      loadRecordingPath();
    }
  }, [visible, activeIndex]);

  // Cargar estadísticas de auditoría
  useEffect(() => {
    const loadAuditStats = async () => {
      try {
        if (window?.electron?.ipcRenderer) {
          // Usar el handler de estadísticas de grabaciones existente
          const result = await window.electron.ipcRenderer.invoke('recording:stats');
          if (result && result.success) {
            // Convertir las estadísticas de grabaciones al formato de auditoría
            setAuditStats({
              fileCount: result.stats.total || 0,
              totalSize: result.stats.totalSize || 0,
              oldestFile: null, // No disponible en recording:stats
              lastCleanup: null // No disponible en recording:stats
            });
          } else {
            // Valores por defecto si no hay datos
            setAuditStats({
              fileCount: 0,
              totalSize: 0,
              oldestFile: null,
              lastCleanup: null
            });
          }
        }
      } catch (error) {
        console.error('Error cargando estadísticas de auditoría:', error);
        // Valores por defecto en caso de error
        setAuditStats({
          fileCount: 0,
          totalSize: 0,
          oldestFile: null,
          lastCleanup: null
        });
      }
    };

    loadAuditStats();
  }, []);

  // Configuración de temas de terminal
  const availableTerminalThemes = themes ? Object.keys(themes) : [];
  const terminalThemeOptions = availableTerminalThemes.map(themeName => ({
    label: themeName,
    value: themeName
  }));

  const handleTerminalThemeChange = (e) => {
    const newThemeName = e.value;
    const newTheme = themes[newThemeName];
    if (newTheme) {
      setTerminalTheme(newTheme);
    }
  };

  const handleFontFamilyChange = (e) => {
    setFontFamily(e.value);
  };

  const handleFontSizeChange = (value) => {
    if (value && value >= 8 && value <= 32) {
      setFontSize(value);
    }
  };

  const handleLocalFontFamilyChange = (e) => {
    setLocalFontFamily(e.value);
    localStorage.setItem(LOCAL_FONT_FAMILY_STORAGE_KEY, e.value);
  };
  const handleLocalFontSizeChange = (value) => {
    if (value && value >= 8 && value <= 32) {
      setLocalFontSize(value);
      localStorage.setItem(LOCAL_FONT_SIZE_STORAGE_KEY, value);
    }
  };

  const handlePowerShellThemeChange = (e) => {
    setLocalPowerShellTheme(e.value);
    localStorage.setItem(LOCAL_POWERSHELL_THEME_STORAGE_KEY, e.value);
  };
  const handleLinuxTerminalThemeChange = (e) => {
    setLocalLinuxTerminalTheme(e.value);
    localStorage.setItem(LOCAL_LINUX_TERMINAL_THEME_STORAGE_KEY, e.value);
  };

  const handleSidebarFontSizeChange = (value) => {
    if (value && value >= 8 && value <= 32) {
      setSidebarFontSize(value);
    }
  };

  // Debounce para el color de fuente para evitar actualizaciones excesivas
  const colorTimeoutRef = useRef(null);

  // Cleanup del timeout al desmontar
  useEffect(() => {
    return () => {
      if (colorTimeoutRef.current) {
        clearTimeout(colorTimeoutRef.current);
      }
    };
  }, []);

  const handleSidebarFontColorChange = (newColor) => {
    if (colorTimeoutRef.current) {
      clearTimeout(colorTimeoutRef.current);
    }
    colorTimeoutRef.current = setTimeout(() => {
      if (setSidebarFontColor && typeof setSidebarFontColor === 'function') {
        try {
          if (newColor) {
            localStorage.setItem('sidebarFontColorSource', 'user');
          } else {
            localStorage.removeItem('sidebarFontColorSource');
          }
        } catch { }
        setSidebarFontColor(newColor);
      }
    }, 150); // Debounce de 150ms
  };


  // Handlers para configuración de auditoría
  const handleManualCleanup = async () => {
    if (!window.confirm('¿Estás seguro de que quieres ejecutar la limpieza manual de archivos de auditoría?')) {
      return;
    }

    try {
      setIsLoading(true);
      if (window?.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('audit:cleanup', {
          retentionDays,
          maxStorageSize: maxStorageSize * 1024 * 1024 * 1024, // Convertir GB a bytes
          force: true
        });

        if (result.success) {
          showToast('success', 'Limpieza completada', `Se eliminaron ${result.deletedFiles || 0} archivos. Espacio liberado: ${formatBytes(result.freedSpace || 0)}`);
          // Recargar estadísticas
          const statsResult = await window.electron.ipcRenderer.invoke('audit:get-stats');
          if (statsResult.success) {
            setAuditStats(statsResult.stats);
          }
        } else {
          showToast('error', 'Error en limpieza', result.error || 'Error desconocido');
        }
      }
    } catch (error) {
      console.error('Error ejecutando limpieza manual:', error);
      showToast('error', 'Error', 'Error ejecutando limpieza manual');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAuditFiles = async () => {
    try {
      if (window?.electron?.ipcRenderer) {
        // Obtener todas las grabaciones
        const result = await window.electron.ipcRenderer.invoke('recording:list', {});

        if (result && result.success && result.recordings && result.recordings.length > 0) {
          // Cerrar el diálogo de configuración
          onHide();

          // Crear una nueva pestaña de auditoría global
          const auditTabId = `audit_global_${Date.now()}`;

          // Disparar evento para crear pestaña de auditoría global
          window.dispatchEvent(new CustomEvent('create-audit-tab', {
            detail: {
              tabId: auditTabId,
              title: 'Auditoría Global',
              recordings: result.recordings
            }
          }));

          showToast('success', 'Auditoría abierta', 'Pestaña de auditoría global creada');
        } else {
          showToast('info', 'Sin grabaciones', 'No hay grabaciones disponibles para mostrar');
        }
      }
    } catch (error) {
      console.error('Error abriendo auditoría:', error);
      showToast('error', 'Error', 'Error al cargar las grabaciones');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const TerminalPreview = () => {
    if (!terminalTheme || !terminalTheme.theme) return null;

    const colors = terminalTheme.theme;

    return (
      <div style={{
        padding: '12px',
        border: '1px solid var(--surface-300)',
        borderRadius: '8px',
        marginTop: '10px',
        background: 'var(--surface-100)'
      }}>
        <div style={{
          background: colors.background || '#1e1e1e',
          color: colors.foreground || '#d4d4d4',
          padding: '12px',
          borderRadius: '6px',
          fontFamily: fontFamily,
          fontSize: `${fontSize}px`,
          lineHeight: '1.4',
          border: '1px solid var(--surface-200)'
        }}>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: colors.green || '#4ec9b0' }}>user@hostname</span>
            <span style={{ color: colors.foreground || '#d4d4d4' }}>:</span>
            <span style={{ color: colors.blue || '#569cd6' }}>~/project</span>
            <span style={{ color: colors.foreground || '#d4d4d4' }}>$ </span>
            <span style={{ color: colors.yellow || '#dcdcaa' }}>ls -la</span>
          </div>
          <div style={{ color: colors.cyan || '#4ec9b0', marginBottom: '2px' }}>
            total 24
          </div>
          <div style={{ color: colors.blue || '#569cd6', marginBottom: '2px' }}>
            drwxr-xr-x 3 user user 4096 Dec 25 10:30 .
          </div>
          <div style={{ color: colors.blue || '#569cd6', marginBottom: '2px' }}>
            drwxr-xr-x 5 user user 4096 Dec 25 10:25 ..
          </div>
          <div style={{ color: colors.green || '#4ec9b0', marginBottom: '2px' }}>
            -rw-r--r-- 1 user user  256 Dec 25 10:30 README.md
          </div>
          <div style={{ color: colors.red || '#f44747', marginBottom: '6px' }}>
            -rwxr-xr-x 1 user user 1024 Dec 25 10:28 script.sh
          </div>
          <div>
            <span style={{ color: colors.green || '#4ec9b0' }}>user@hostname</span>
            <span style={{ color: colors.foreground || '#d4d4d4' }}>:</span>
            <span style={{ color: colors.blue || '#569cd6' }}>~/project</span>
            <span style={{ color: colors.foreground || '#d4d4d4' }}>$ </span>
            <span style={{ color: '#6a9955', fontSize: '11px', opacity: 0.8 }}>
              // {fontFamily} • {fontSize}px
            </span>
            <span
              style={{
                background: colors.cursor || colors.foreground || '#ffffff',
                color: colors.background || '#000000',
                animation: 'blink 1s infinite',
                marginLeft: '4px'
              }}
            >
              ▋
            </span>
          </div>
        </div>
        <style>
          {`
            @keyframes blink {
              0%, 50% { opacity: 1; }
              51%, 100% { opacity: 0; }
            }
          `}
        </style>
      </div>
    );
  };

  // Calcular altura del contenido dinámicamente
  const [contentHeight, setContentHeight] = useState(() => size.height - 60);

  // Función helper para obtener el elemento del diálogo (similar a useDialogResize)
  const getDialogElement = useCallback(() => {
    // Primero intentar usar el ref si es un elemento DOM válido
    if (dialogRef.current) {
      if (dialogRef.current instanceof Element || dialogRef.current instanceof HTMLElement) {
        if (typeof dialogRef.current.closest === 'function') {
          try {
            const found = dialogRef.current.closest('.p-dialog');
            if (found) return found;
          } catch (e) {
            // Si closest falla, continuar con el fallback
          }
        }
      }
    }

    // Fallback: buscar en el DOM el diálogo más reciente
    try {
      const dialogs = document.querySelectorAll('.settings-dialog.p-dialog');
      if (dialogs.length > 0) {
        return dialogs[dialogs.length - 1];
      }
    } catch (e) {
      // Error al buscar, retornar null
    }

    return null;
  }, []);

  // Función para recalcular contentHeight
  const recalculateContentHeight = useCallback(() => {
    if (!visible) return;

    const dialogElement = getDialogElement();
    if (dialogElement) {
      const headerElement = dialogElement.querySelector('.p-dialog-header');
      const navElement = dialogElement.querySelector('.p-tabview-nav-container');
      const headerHeight = headerElement ? headerElement.offsetHeight : 60;
      const navHeight = navElement ? navElement.offsetHeight : 0;
      // Usar el tamaño real del diálogo, no el size del hook
      const dialogHeight = dialogElement.offsetHeight || size.height;
      const calculatedContentHeight = dialogHeight - headerHeight - navHeight;
      setContentHeight(calculatedContentHeight);
    } else {
      // Fallback si no se encuentra el elemento
      setContentHeight(size.height - 60);
    }
  }, [visible, getDialogElement, size.height]);

  // Actualizar contentHeight cuando cambie el tamaño, calculando dinámicamente el header
  useEffect(() => {
    if (!visible) return;

    // Usar setTimeout para asegurar que el DOM esté completamente renderizado
    const timeoutId = setTimeout(() => {
      recalculateContentHeight();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [size.height, size.width, visible, recalculateContentHeight]);

  // Detectar cuando la ventana se maximiza/restaura y recalcular
  useEffect(() => {
    if (!visible) return;

    let lastWindowWidth = window.innerWidth;
    let lastWindowHeight = window.innerHeight;
    let checkInterval = null;

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;

      // Detectar si fue una maximización (cambio grande de tamaño)
      const widthChange = Math.abs(currentWidth - lastWindowWidth);
      const heightChange = Math.abs(currentHeight - lastWindowHeight);
      const isMaximize = widthChange > 200 || heightChange > 200;

      if (isMaximize) {
        // Si fue una maximización, dar más tiempo para que el DOM se actualice
        setTimeout(() => {
          recalculateContentHeight();
        }, 200);
      } else {
        // Cambio normal, delay más corto
        setTimeout(() => {
          recalculateContentHeight();
        }, 50);
      }

      lastWindowWidth = currentWidth;
      lastWindowHeight = currentHeight;
    };

    // Escuchar cambios de tamaño de la ventana
    window.addEventListener('resize', handleResize);

    // También usar un intervalo para verificar cambios cuando se maximiza directamente
    // (porque a veces el evento resize no se dispara correctamente)
    checkInterval = setInterval(() => {
      const dialogElement = getDialogElement();
      if (dialogElement) {
        const currentDialogHeight = dialogElement.offsetHeight;
        const expectedHeight = size.height;
        // Si hay una diferencia significativa, recalcular
        if (Math.abs(currentDialogHeight - expectedHeight) > 50) {
          recalculateContentHeight();
        }
      }
    }, 500); // Verificar cada 500ms

    // También escuchar cuando el diálogo cambia de tamaño (usando ResizeObserver)
    const dialogElement = getDialogElement();
    let resizeObserver = null;

    if (dialogElement && window.ResizeObserver) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height;
          // Si el diálogo cambió de tamaño significativamente, recalcular
          if (Math.abs(newHeight - size.height) > 50) {
            setTimeout(() => {
              recalculateContentHeight();
            }, 100);
          }
        }
      });
      resizeObserver.observe(dialogElement);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [visible, getDialogElement, recalculateContentHeight, size.height]);

  // Actualizar variables CSS cuando cambie contentHeight (al maximizar/redimensionar)
  useEffect(() => {
    if (!visible) return;

    const timeoutId = setTimeout(() => {
      const dialogElement = getDialogElement();
      if (dialogElement) {
        dialogElement.style.setProperty('--content-height', `${contentHeight}px`);
      }
      // También actualizar en todos los TabPanels
      const tabPanels = document.querySelectorAll('.settings-dialog-tabview .p-tabview-panel');
      tabPanels.forEach(panel => {
        panel.style.setProperty('--content-height', `${contentHeight}px`);
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [contentHeight, visible, getDialogElement]);

  const content = (
    <>
      <Toast ref={toastRef} />

      {/* Handles de redimensionamiento - cobertura total */}
      {!isEmbedded && (
        <>
          {/* Borde Derecho */}
          <div
            className="resize-handle resize-handle-right"
            onMouseDown={(e) => startResize(e, 'right')}
            style={{
              position: 'absolute',
              right: '-5px',
              top: 0,
              bottom: 0,
              width: '10px',
              cursor: 'ew-resize',
              zIndex: 1002,
              backgroundColor: 'transparent'
            }}
          />
          {/* Borde Izquierdo - Nuevo */}
          <div
            className="resize-handle resize-handle-left"
            onMouseDown={(e) => startResize(e, 'left')}
            style={{
              position: 'absolute',
              left: '-5px',
              top: 0,
              bottom: 0,
              width: '10px',
              cursor: 'ew-resize',
              zIndex: 1002,
              backgroundColor: 'transparent'
            }}
          />
          {/* Borde Inferior */}
          <div
            className="resize-handle resize-handle-bottom"
            onMouseDown={(e) => startResize(e, 'bottom')}
            style={{
              position: 'absolute',
              bottom: '-5px',
              left: 0,
              right: 0,
              height: '10px',
              cursor: 'ns-resize',
              zIndex: 1002,
              backgroundColor: 'transparent'
            }}
          />
          {/* Borde Superior - Nuevo */}
          <div
            className="resize-handle resize-handle-top"
            onMouseDown={(e) => startResize(e, 'top')}
            style={{
              position: 'absolute',
              top: '-5px',
              left: 0,
              right: 0,
              height: '10px',
              cursor: 'ns-resize',
              zIndex: 1002,
              backgroundColor: 'transparent'
            }}
          />

          {/* Esquina Inferior Derecha */}
          <div
            className="resize-handle resize-handle-bottom-right"
            onMouseDown={(e) => startResize(e, 'bottom-right')}
            style={{
              position: 'absolute',
              bottom: '-5px',
              right: '-5px',
              width: '15px',
              height: '15px',
              cursor: 'se-resize',
              zIndex: 1003,
              backgroundColor: 'transparent'
            }}
          />
          {/* Esquina Inferior Izquierda - Nuevo */}
          <div
            className="resize-handle resize-handle-bottom-left"
            onMouseDown={(e) => startResize(e, 'bottom-left')}
            style={{
              position: 'absolute',
              bottom: '-5px',
              left: '-5px',
              width: '15px',
              height: '15px',
              cursor: 'sw-resize',
              zIndex: 1003,
              backgroundColor: 'transparent'
            }}
          />
          {/* Esquina Superior Derecha - Nuevo */}
          <div
            className="resize-handle resize-handle-top-right"
            onMouseDown={(e) => startResize(e, 'top-right')}
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              width: '15px',
              height: '15px',
              cursor: 'ne-resize',
              zIndex: 1003,
              backgroundColor: 'transparent'
            }}
          />
          {/* Esquina Superior Izquierda - Nuevo */}
          <div
            className="resize-handle resize-handle-top-left"
            onMouseDown={(e) => startResize(e, 'top-left')}
            style={{
              position: 'absolute',
              top: '-5px',
              left: '-5px',
              width: '15px',
              height: '15px',
              cursor: 'nw-resize',
              zIndex: 1003,
              backgroundColor: 'transparent'
            }}
          />
        </>
      )}

      {/* Layout con Sidebar Vertical */}
      <div className={`settings-dialog-vertical ${isEmbedded ? 'settings-embedded' : ''}`} style={isEmbedded ? { display: 'flex', flex: 1, height: '100%', overflow: 'hidden' } : undefined}>
        {/* Sidebar Navigation */}
        {!isEmbedded && (
          <SettingsSidebarNav
            activeMainTab={activeMainTab}
            activeSubTab={activeSubTab}
            onMainTabChange={setActiveMainTab}
            onSubTabChange={setActiveSubTab}
          />
        )}

        {/* Contenedor de Contenido */}
        <div className="settings-content-wrapper" style={isEmbedded ? { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' } : undefined}>
          {/* TabView renderizado dinámicamente */}
          <style>{`
            .settings-dialog-tabview .p-tabview-nav {
              display: none !important;
            }
            .settings-dialog-tabview .p-tabview-panels {
              height: 100% !important;
              padding: 0 !important;
              background: transparent !important;
            }
            .settings-dialog-tabview .p-tabview-panel {
              height: 100% !important;
              padding: 0 !important;
              background: transparent !important;
            }
            /* Override para TODAS las pestañas: escapar del límite de 700px de dialogs.css */
            /* Usar selector más específico para sobrescribir el !important */
            .settings-dialog .settings-dialog-tabview .p-tabview-panel,
            .p-dialog.settings-dialog .settings-dialog-tabview .p-tabview-panel {
              min-height: var(--content-height, 1000px) !important;
              height: var(--content-height, 1000px) !important;
              max-height: var(--content-height, 1000px) !important;
            }
            .settings-dialog .settings-dialog-tabview .p-tabview-panel > div:first-child,
            .p-dialog.settings-dialog .settings-dialog-tabview .p-tabview-panel > div:first-child {
              height: var(--content-height, 1000px) !important;
              max-height: var(--content-height, 1000px) !important;
              min-height: var(--content-height, 1000px) !important;
            }
            /* Apariencia tab container también necesita la altura correcta */
            .apariencia-tab-container {
              height: 100% !important;
              max-height: 100% !important;
              min-height: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              overflow: hidden !important;
            }
            .presets-tab-wrapper {
              flex: 1 !important;
              overflow-y: auto !important;
              padding-right: 4px;
            }
            /* Garantizar el scrollbar visible */
            .presets-tab-wrapper::-webkit-scrollbar {
              width: 8px !important;
              display: block !important;
            }
            .presets-tab-wrapper::-webkit-scrollbar-track {
              background: rgba(0,0,0,0.1) !important;
            }
            .presets-tab-wrapper::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.1) !important;
              border-radius: 4px !important;
            }
            .presets-tab-wrapper::-webkit-scrollbar-thumb:hover {
              background: rgba(255,255,255,0.2) !important;
            }
          `}</style>
          <TabView
            activeIndex={activeIndex}
            onTabChange={(e) => setActiveIndex(e.index)}
            className="settings-dialog-tabview"
          >
            <TabPanel header={t('tabs.general')} leftIcon="pi pi-sliders-h" style={{ '--content-height': `${contentHeight}px` }}>
              <div className="settings-tab-outer-wrapper" style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: '8px', bottom: 0, width: 'calc(100% - 8px)' }}>
                  {/* Header */}
                  <div className="general-settings-header-wrapper" style={{ flexShrink: 0 }}>
                    <div className="general-header-content">
                      <span className="general-header-icon protocol-dialog-header-icon">
                        <i className="pi pi-sliders-h"></i>
                      </span>
                      <div className="general-header-text">
                        <h3 className="general-header">{t('general.title')}</h3>
                        <p className="general-description">{t('description')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid de 2 columnas para las secciones */}
                  <div className="general-settings-content">
                    {/* Columna Izquierda: Comportamiento */}
                    <div className="general-settings-column">
                      {/* Sección de Comportamiento */}
                      <div className="general-settings-section">
                        <div className="general-section-header">
                          <div className="general-section-icon">
                            <i className="pi pi-sliders-h"></i>
                          </div>
                          <h4 className="general-section-title">{t('general.sections.behavior.title')}</h4>
                        </div>

                        <div className="general-settings-options">
                          <div className="general-setting-card" onClick={() => setLockHomeButton(!lockHomeButton)}>
                            <div className="general-setting-content">
                              <div className="general-setting-icon lock">
                                <i className="pi pi-lock"></i>
                              </div>
                              <div className="general-setting-info">
                                <label htmlFor="lock-home-button" className="general-setting-label">
                                  {t('general.sections.behavior.lockHomeButton.label')}
                                </label>
                                <p className="general-setting-description">
                                  {t('general.sections.behavior.lockHomeButton.description')}
                                </p>
                              </div>
                              <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  id="lock-home-button"
                                  checked={lockHomeButton}
                                  onChange={(e) => setLockHomeButton(e.checked)}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="general-setting-card" onClick={() => setInteractiveIcon(!interactiveIcon)}>
                            <div className="general-setting-content">
                              <div className="general-setting-icon bolt">
                                <i className="pi pi-bolt"></i>
                              </div>
                              <div className="general-setting-info">
                                <label htmlFor="interactive-icon" className="general-setting-label">
                                  {t('general.sections.behavior.interactiveIcon.label')}
                                </label>
                                <p className="general-setting-description">
                                  {t('general.sections.behavior.interactiveIcon.description')}
                                </p>
                              </div>
                              <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  id="interactive-icon"
                                  checked={interactiveIcon}
                                  onChange={(e) => setInteractiveIcon(e.checked)}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="general-setting-card" onClick={() => {
                            sidebarStartCollapsedUserChangeRef.current = true;
                            setSidebarStartCollapsed(!sidebarStartCollapsed);
                          }}>
                            <div className="general-setting-content">
                              <div className="general-setting-icon collapse">
                                <i className="pi pi-angle-left"></i>
                              </div>
                              <div className="general-setting-info">
                                <label htmlFor="sidebar-start-collapsed" className="general-setting-label">
                                  {t('general.sections.behavior.sidebarStartCollapsed.label')}
                                </label>
                                <p className="general-setting-description">
                                  {t('general.sections.behavior.sidebarStartCollapsed.description')}
                                </p>
                              </div>
                              <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  id="sidebar-start-collapsed"
                                  checked={sidebarStartCollapsed}
                                  onChange={(e) => {
                                    sidebarStartCollapsedUserChangeRef.current = true;
                                    setSidebarStartCollapsed(e.checked);
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="general-setting-card" onClick={() => setMainFrameHeaderCollapsed(!mainFrameHeaderCollapsed)}>
                            <div className="general-setting-content">
                              <div className="general-setting-icon">
                                <i className="pi pi-window-maximize"></i>
                              </div>
                              <div className="general-setting-info">
                                <label htmlFor="main-frame-header-start-collapsed" className="general-setting-label">
                                  {t('general.sections.behavior.mainFrameHeaderStartCollapsed.label')}
                                </label>
                                <p className="general-setting-description">
                                  {t('general.sections.behavior.mainFrameHeaderStartCollapsed.description')}
                                </p>
                              </div>
                              <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  id="main-frame-header-start-collapsed"
                                  checked={mainFrameHeaderCollapsed}
                                  onChange={(e) => setMainFrameHeaderCollapsed(e.checked)}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="general-setting-card general-setting-card--shortcut">
                            <div className="general-setting-content general-setting-content--shortcut">
                              <div className="general-setting-icon">
                                <i className="pi pi-search"></i>
                              </div>
                              <div className="general-setting-info">
                                <label htmlFor="connection-search-shortcut" className="general-setting-label">
                                  {t('general.sections.behavior.connectionSearchShortcut.label')}
                                </label>
                                <p className="general-setting-description">
                                  {t('general.sections.behavior.connectionSearchShortcut.description')}
                                </p>
                                <p className="general-setting-description general-setting-hint">
                                  {t('general.sections.behavior.connectionSearchShortcut.hint')}
                                </p>
                              </div>
                              <div
                                className="general-setting-control general-setting-control--shortcut"
                                data-capturing-shortcut={isCapturingConnectionSearchShortcut ? 'true' : 'false'}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <InputText
                                  id="connection-search-shortcut"
                                  ref={connectionSearchShortcutInputRef}
                                  readOnly
                                  value={isCapturingConnectionSearchShortcut
                                    ? t('general.sections.behavior.connectionSearchShortcut.capturePlaceholder')
                                    : formatShortcutLabel(connectionSearchShortcut, locale)}
                                  onBlur={() => setIsCapturingConnectionSearchShortcut(false)}
                                  className="general-setting-shortcut-input"
                                />
                                <Button
                                  type="button"
                                  label={t('general.sections.behavior.connectionSearchShortcut.change')}
                                  className="p-button-sm"
                                  onClick={startConnectionSearchShortcutCapture}
                                />
                                <Button
                                  type="button"
                                  label={t('general.sections.behavior.connectionSearchShortcut.reset')}
                                  className="p-button-sm p-button-text"
                                  onClick={handleResetConnectionSearchShortcut}
                                />
                              </div>
                            </div>
                          </div>

                          {defaultLocalTerminal !== undefined && handleDefaultTerminalChange && (
                            <div className="general-setting-card">
                              <div className="general-setting-content">
                                <div className="general-setting-icon">
                                  <i className="pi pi-terminal"></i>
                                </div>
                                <div className="general-setting-info">
                                  <label htmlFor="default-terminal" className="general-setting-label">
                                    Terminal por Defecto
                                  </label>
                                  <p className="general-setting-description">
                                    Selecciona el terminal que se abrirá por defecto al crear una nueva pestaña local
                                  </p>
                                </div>
                                <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                                  <Dropdown
                                    id="default-terminal"
                                    value={defaultLocalTerminal}
                                    options={defaultTerminalOptions.length > 0 ? defaultTerminalOptions : [{ label: 'PowerShell', value: 'powershell' }]}
                                    optionLabel="label"
                                    optionValue="value"
                                    onChange={(e) => handleDefaultTerminalChange(e.value)}
                                    placeholder="Seleccionar terminal"
                                    style={{ minWidth: '200px' }}
                                    disabled={!terminalOptionsReady || defaultTerminalOptions.length === 0}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha: Idioma & Personalización Visual */}
                    <div className="general-settings-column">
                      {/* Sección de Idioma */}
                      <div className="general-settings-section">
                        <div className="general-section-header">
                          <div className="general-section-icon">
                            <i className="pi pi-globe"></i>
                          </div>
                          <h4 className="general-section-title">{t('language.title')}</h4>
                        </div>

                        <div className="general-settings-options">
                          <div className="general-setting-card">
                            <div className="general-setting-content">
                              <div className="general-setting-icon" style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #2196F3 100%)' }}>
                                <i className="pi pi-language"></i>
                              </div>
                              <div className="general-setting-info">
                                <label htmlFor="language-select" className="general-setting-label">
                                  {t('language.select')}
                                </label>
                                <p className="general-setting-description">
                                  {t('language.description')}
                                </p>
                              </div>
                              <div className="general-setting-control" onClick={(e) => e.stopPropagation()} style={{ minWidth: '180px' }}>
                                <Dropdown
                                  id="language-select"
                                  value={locale}
                                  options={availableLocales.map(loc => ({
                                    label: `${loc.flag} ${loc.name}`,
                                    value: loc.code
                                  }))}
                                  onChange={(e) => setLocale(e.value)}
                                  style={{ width: '100%' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sección de Personalización Visual */}
                      <div className="general-settings-section">
                        <div className="general-section-header">
                          <div className="general-section-icon">
                            <i className="pi pi-palette"></i>
                          </div>
                          <h4 className="general-section-title">{t('general.sections.visual.title')}</h4>
                        </div>

                        {/* Selector de Icono de Pestaña de Inicio */}
                        <div className="general-icon-selector-section">
                          <div className="general-selector-row-expandable">
                            <div className="general-selector-info-group">
                              <div className="general-selector-icon-compact">
                                <i className="pi pi-home"></i>
                              </div>
                              <div className="general-selector-text-group">
                                <span className="general-selector-title-compact">{t('general.sections.visual.homeTabIcon.title')}</span>
                                <span className="general-selector-description-compact">{t('general.sections.visual.homeTabIcon.description')}</span>
                              </div>
                            </div>
                            <div className="general-selector-action-wrapper">
                              <HomeIconSelectorGrid
                                selected={selectedHomeIcon}
                                onSelect={setSelectedHomeIcon}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Selector de Icono de Grupos */}
                        <div className="general-icon-selector-section">
                          <div className="general-selector-row-expandable">
                            <div className="general-selector-info-group">
                              <div className="general-selector-icon-compact">
                                <i className="pi pi-th-large"></i>
                              </div>
                              <div className="general-selector-text-group">
                                <span className="general-selector-title-compact">{t('general.sections.visual.groupTabIcon.title')}</span>
                                <span className="general-selector-description-compact">{t('general.sections.visual.groupTabIcon.description')}</span>
                              </div>
                            </div>
                            <div className="general-selector-action-wrapper">
                              <GroupIconSelectorGrid
                                selected={selectedGroupIcon}
                                onSelect={setSelectedGroupIcon}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
            <TabPanel
              header={t('security.title')}
              leftIcon="pi pi-shield"
              style={{ '--content-height': `${contentHeight}px` }}
            >
              <div style={{
                height: `${contentHeight}px`,
                maxHeight: `${contentHeight}px`,
                minHeight: `${contentHeight}px`,
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: activeSubTab === 'nueva-pestana' ? 'hidden' : 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: '8px', bottom: 0, width: 'calc(100% - 8px)', padding: activeSubTab === 'nueva-pestana' ? '0' : '1rem 1.5rem 1.5rem 1.5rem' }}>
                  {/* Renderizado condicional basado en activeSubTab */}
                  {activeSubTab === 'clave-maestra' && (
                    <div className="security-settings-container">
                      <div className="security-settings-content">
                        {/* Header */}
                        <div className="security-settings-header-wrapper">
                          <div className="security-header-content">
                            <span className="security-header-icon protocol-dialog-header-icon">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                  <linearGradient id="masterKeyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#667eea" />
                                    <stop offset="50%" stopColor="#764ba2" />
                                    <stop offset="100%" stopColor="#f093fb" />
                                  </linearGradient>
                                  <linearGradient id="keyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ffffff" />
                                    <stop offset="100%" stopColor="#e8e8f0" />
                                  </linearGradient>
                                </defs>
                                {/* Escudo de fondo */}
                                <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                                  fill="url(#masterKeyGradient)"
                                  stroke="rgba(255,255,255,0.35)"
                                  strokeWidth="0.6" />
                                {/* Llave maestra estilizada */}
                                <g transform="translate(12, 11)">
                                  {/* Anillo de la llave */}
                                  <circle cx="0" cy="-1" r="2.2"
                                    fill="none"
                                    stroke="url(#keyGradient)"
                                    strokeWidth="1.4"
                                    opacity="0.98" />
                                  {/* Cuerpo de la llave */}
                                  <rect x="-1.8" y="0.5" width="3.6" height="5.5" rx="1.2"
                                    fill="url(#keyGradient)"
                                    opacity="0.98"
                                    stroke="rgba(102, 126, 234, 0.25)"
                                    strokeWidth="0.4" />
                                  {/* Dientes de la llave (patrón de seguridad) */}
                                  <rect x="-1" y="3.5" width="2" height="2.5" rx="0.5"
                                    fill="url(#keyGradient)"
                                    opacity="0.98" />
                                  <rect x="-0.4" y="5" width="0.8" height="1.2" rx="0.2"
                                    fill="rgba(102, 126, 234, 0.5)" />
                                </g>
                              </svg>
                            </span>
                            <div className="security-header-text">
                              <h3 className="security-header">Gestión de Clave Maestra</h3>
                              <p className="security-description">La clave maestra protege tus credenciales de sesión con cifrado AES-256. Se requiere para sincronizar sesiones de forma segura.</p>
                            </div>
                          </div>
                        </div>

                        {/* Layout de 2 columnas */}
                        <div className="security-layout-grid">
                          {/* Columna izquierda: Estado */}
                          <div className="security-status-card">
                            <div className="security-status-header">
                              <span className={`security-status-icon ${hasMasterKey ? 'success' : 'warning'}`}>
                                {hasMasterKey ? (
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                      <linearGradient id="statusSuccessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#11998e" />
                                        <stop offset="100%" stopColor="#38ef7d" />
                                      </linearGradient>
                                    </defs>
                                    {/* Escudo de seguridad */}
                                    <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                                      fill="url(#statusSuccessGradient)"
                                      stroke="rgba(255,255,255,0.3)"
                                      strokeWidth="0.5" />
                                    {/* Check de verificación */}
                                    <path d="M9 12l2 2 4-4"
                                      stroke="#ffffff"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      fill="none" />
                                  </svg>
                                ) : (
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                      <linearGradient id="statusWarningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#f093fb" />
                                        <stop offset="100%" stopColor="#f5576c" />
                                      </linearGradient>
                                    </defs>
                                    {/* Escudo de seguridad */}
                                    <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                                      fill="url(#statusWarningGradient)"
                                      stroke="rgba(255,255,255,0.3)"
                                      strokeWidth="0.5" />
                                    {/* Signo de exclamación */}
                                    <circle cx="12" cy="9" r="1.2" fill="#ffffff" />
                                    <rect x="11" y="11.5" width="2" height="4" rx="1" fill="#ffffff" />
                                  </svg>
                                )}
                              </span>
                              <span className="security-status-label">Estado:</span>
                              <div className="security-status-badge">
                                <Badge
                                  value={hasMasterKey ? 'Configurada' : 'No configurada'}
                                  severity={hasMasterKey ? 'success' : 'warning'}
                                />
                              </div>
                            </div>

                            {hasMasterKey && (
                              <>
                                <div className="security-status-info">
                                  <i className="pi pi-info-circle"></i>
                                  <span>Las sesiones se cifran automáticamente antes del almacenamiento</span>
                                </div>

                                {/* Opción de recordar contraseña */}
                                <div className="security-checkbox-container">
                                  <div className="security-checkbox-wrapper">
                                    <Checkbox
                                      inputId="remember-password-settings"
                                      checked={localStorage.getItem('nodeterm_remember_password') === 'true'}
                                      onChange={async (e) => {
                                        await secureStorage.setRememberPassword(!!e.checked);
                                        if (e.checked) {
                                          showToast('success', 'Configurado', 'La contraseña se recordará en este dispositivo');
                                        } else {
                                          showToast('info', 'Configurado', 'Se pedirá la contraseña al iniciar la app');
                                        }
                                      }}
                                    />
                                    <label htmlFor="remember-password-settings" className="security-checkbox-label">
                                      {t('security.masterPassword.rememberPassword')}
                                    </label>
                                  </div>
                                  <small className="security-checkbox-hint">
                                    {t('security.masterPassword.rememberPasswordHint')}
                                  </small>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Columna derecha: Formulario */}
                          {!hasMasterKey ? (
                            /* Configurar nueva clave maestra */
                            <div className="security-form-container">
                              <h4 className="security-form-title">
                                <span className="security-form-title-icon">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                      <linearGradient id="formKeyGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#667eea" />
                                        <stop offset="50%" stopColor="#764ba2" />
                                        <stop offset="100%" stopColor="#f093fb" />
                                      </linearGradient>
                                      <linearGradient id="formKeyGradientWhite2" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="100%" stopColor="#e8e8f0" />
                                      </linearGradient>
                                    </defs>
                                    {/* Escudo de fondo */}
                                    <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                                      fill="url(#formKeyGradient2)"
                                      stroke="rgba(255,255,255,0.35)"
                                      strokeWidth="0.6" />
                                    {/* Llave maestra estilizada */}
                                    <g transform="translate(12, 11)">
                                      {/* Anillo de la llave */}
                                      <circle cx="0" cy="-1" r="2.2"
                                        fill="none"
                                        stroke="url(#formKeyGradientWhite2)"
                                        strokeWidth="1.4"
                                        opacity="0.98" />
                                      {/* Cuerpo de la llave */}
                                      <rect x="-1.8" y="0.5" width="3.6" height="5.5" rx="1.2"
                                        fill="url(#formKeyGradientWhite2)"
                                        opacity="0.98"
                                        stroke="rgba(102, 126, 234, 0.25)"
                                        strokeWidth="0.4" />
                                      {/* Dientes de la llave (patrón de seguridad) */}
                                      <rect x="-1" y="3.5" width="2" height="2.5" rx="0.5"
                                        fill="url(#formKeyGradientWhite2)"
                                        opacity="0.98" />
                                      <rect x="-0.4" y="5" width="0.8" height="1.2" rx="0.2"
                                        fill="rgba(102, 126, 234, 0.5)" />
                                    </g>
                                  </svg>
                                </span>
                                {t('security.masterPassword.configureTitle')}
                              </h4>

                              <div className="security-field">
                                <label htmlFor="master-password" className="security-field-label">
                                  <i className="pi pi-key"></i>
                                  {t('security.masterPassword.newPassword')}
                                </label>
                                <div className="security-field-input">
                                  <Password
                                    id="master-password"
                                    value={masterPassword}
                                    onChange={(e) => setMasterPassword(e.target.value)}
                                    placeholder={t('security.masterPassword.placeholders.minChars')}
                                    feedback={false}
                                    toggleMask
                                    disabled={isLoading}
                                  />
                                </div>
                              </div>

                              <div className="security-field">
                                <label htmlFor="confirm-password" className="security-field-label">
                                  <i className="pi pi-shield"></i>
                                  {t('security.masterPassword.confirmPassword')}
                                </label>
                                <div className="security-field-input">
                                  <Password
                                    id="confirm-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder={t('security.masterPassword.placeholders.repeat')}
                                    feedback={false}
                                    toggleMask
                                    disabled={isLoading}
                                  />
                                </div>
                              </div>

                              <Button
                                label={isLoading ? t('security.masterPassword.buttons.saving') : t('security.masterPassword.buttons.save')}
                                icon={isLoading ? 'pi pi-spin pi-spinner' : 'pi pi-save'}
                                onClick={handleSaveMasterPassword}
                                disabled={!validateMasterPassword() || isLoading}
                                className="security-button security-button-primary"
                                style={{ width: '100%' }}
                              />
                            </div>
                          ) : (
                            /* Cambiar clave maestra existente */
                            <div className="security-form-container">
                              <h4 className="security-form-title">
                                <span className="security-form-title-icon">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                      <linearGradient id="formKeyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#667eea" />
                                        <stop offset="50%" stopColor="#764ba2" />
                                        <stop offset="100%" stopColor="#f093fb" />
                                      </linearGradient>
                                      <linearGradient id="formKeyGradientWhite" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="100%" stopColor="#e8e8f0" />
                                      </linearGradient>
                                    </defs>
                                    {/* Escudo de fondo */}
                                    <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                                      fill="url(#formKeyGradient)"
                                      stroke="rgba(255,255,255,0.35)"
                                      strokeWidth="0.6" />
                                    {/* Llave maestra estilizada */}
                                    <g transform="translate(12, 11)">
                                      {/* Anillo de la llave */}
                                      <circle cx="0" cy="-1" r="2.2"
                                        fill="none"
                                        stroke="url(#formKeyGradientWhite)"
                                        strokeWidth="1.4"
                                        opacity="0.98" />
                                      {/* Cuerpo de la llave */}
                                      <rect x="-1.8" y="0.5" width="3.6" height="5.5" rx="1.2"
                                        fill="url(#formKeyGradientWhite)"
                                        opacity="0.98"
                                        stroke="rgba(102, 126, 234, 0.25)"
                                        strokeWidth="0.4" />
                                      {/* Dientes de la llave (patrón de seguridad) */}
                                      <rect x="-1" y="3.5" width="2" height="2.5" rx="0.5"
                                        fill="url(#formKeyGradientWhite)"
                                        opacity="0.98" />
                                      <rect x="-0.4" y="5" width="0.8" height="1.2" rx="0.2"
                                        fill="rgba(102, 126, 234, 0.5)" />
                                    </g>
                                  </svg>
                                </span>
                                {t('security.masterPassword.changeTitle')}
                              </h4>

                              <div className="security-field">
                                <label htmlFor="current-password" className="security-field-label">
                                  <i className="pi pi-unlock"></i>
                                  {t('security.masterPassword.currentPassword')}
                                </label>
                                <div className="security-field-input">
                                  <Password
                                    id="current-password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder={t('security.masterPassword.placeholders.current')}
                                    feedback={false}
                                    toggleMask
                                    disabled={isLoading}
                                  />
                                </div>
                              </div>

                              <div className="security-field">
                                <label htmlFor="new-password" className="security-field-label">
                                  <i className="pi pi-key"></i>
                                  {t('security.masterPassword.newPassword')}
                                </label>
                                <div className="security-field-input">
                                  <Password
                                    id="new-password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder={t('security.masterPassword.placeholders.new')}
                                    feedback={false}
                                    toggleMask
                                    disabled={isLoading}
                                  />
                                </div>
                              </div>

                              <div className="security-field">
                                <label htmlFor="confirm-new-password" className="security-field-label">
                                  <i className="pi pi-shield"></i>
                                  {t('security.masterPassword.confirmNewPassword')}
                                </label>
                                <div className="security-field-input">
                                  <Password
                                    id="confirm-new-password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    placeholder={t('security.masterPassword.placeholders.repeatNew')}
                                    feedback={false}
                                    toggleMask
                                    disabled={isLoading}
                                  />
                                </div>
                              </div>

                              <div className="security-actions">
                                <Button
                                  label={isLoading ? t('security.masterPassword.buttons.changing') : t('security.masterPassword.buttons.change')}
                                  icon={isLoading ? 'pi pi-spin pi-spinner' : 'pi pi-sync'}
                                  onClick={handleChangeMasterPassword}
                                  disabled={!validatePasswordChange() || isLoading}
                                  className="security-button security-button-primary"
                                />

                                <Button
                                  label={t('security.masterPassword.buttons.delete')}
                                  icon="pi pi-times-circle"
                                  onClick={handleRemoveMasterKey}
                                  disabled={isLoading}
                                  className="security-button security-button-danger"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {activeSubTab === 'auditoria' && (
                    <div className="security-settings-container">
                      <div className="security-settings-content">
                        {/* Header */}
                        <div className="security-settings-header-wrapper">
                          <div className="security-header-content">
                            <span className="security-header-icon protocol-dialog-header-icon">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                  <linearGradient id="auditSettingsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#667eea" />
                                    <stop offset="50%" stopColor="#764ba2" />
                                    <stop offset="100%" stopColor="#f093fb" />
                                  </linearGradient>
                                  <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ffffff" />
                                    <stop offset="100%" stopColor="#e8e8f0" />
                                  </linearGradient>
                                </defs>
                                {/* Escudo principal */}
                                <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                                  fill="url(#auditSettingsGradient)"
                                  stroke="rgba(255,255,255,0.35)"
                                  strokeWidth="0.6" />
                                {/* Icono de video/cámara dentro del escudo */}
                                <g transform="translate(12, 12)">
                                  <circle cx="0" cy="0" r="3.5"
                                    fill="none"
                                    stroke="url(#shieldGradient)"
                                    strokeWidth="1.2"
                                    opacity="0.98" />
                                  <circle cx="0" cy="0" r="1.8"
                                    fill="url(#shieldGradient)"
                                    opacity="0.98" />
                                  <path d="M-2.5,-1.5 L2.5,-1.5 L2.5,1.5 L-2.5,1.5 Z"
                                    fill="url(#auditSettingsGradient)"
                                    opacity="0.6" />
                                </g>
                              </svg>
                            </span>
                            <div className="security-header-text">
                              <h3 className="security-header">{t('security.audit.title')}</h3>
                              <p className="security-description">{t('security.audit.description')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Grid de 2 columnas para las secciones */}
                        <div className="security-layout-grid">
                          {/* Contenedor izquierdo: Grabación + Estadísticas */}
                          <div style={{ gridColumn: '1', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0, width: '100%' }}>
                            {/* Sección de Grabación Automática */}
                            <div className="general-settings-section">
                              <div className="general-section-header">
                                <div className="general-section-icon">
                                  <i className="pi pi-video"></i>
                                </div>
                                <h4 className="general-section-title">{t('security.audit.autoRecording.title')}</h4>
                              </div>

                              <div className="general-settings-options">

                                {/* Activar grabación automática */}
                                <div className="general-setting-card" onClick={() => setAutoRecordingEnabled(!autoRecordingEnabled)}>
                                  <div className="general-setting-content">
                                    <div className="general-setting-icon lock">
                                      <i className="pi pi-video"></i>
                                    </div>
                                    <div className="general-setting-info">
                                      <label htmlFor="autoRecording" className="general-setting-label">
                                        {t('security.audit.autoRecording.enable')}
                                      </label>
                                      <p className="general-setting-description">
                                        {t('security.audit.autoRecording.enableDescription')}
                                      </p>
                                    </div>
                                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                                      <Checkbox
                                        inputId="autoRecording"
                                        checked={autoRecordingEnabled}
                                        onChange={(e) => setAutoRecordingEnabled(e.checked)}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {autoRecordingEnabled && (
                                  <>
                                    {/* Calidad de grabación */}
                                    <div className="general-icon-selector-section">
                                      <div className="general-selector-row-expandable">
                                        <div className="general-selector-info-group">
                                          <div className="general-selector-icon-compact">
                                            <i className="pi pi-sliders-h"></i>
                                          </div>
                                          <div className="general-selector-text-group">
                                            <span className="general-selector-title-compact">{t('security.audit.autoRecording.quality')}</span>
                                            <span className="general-selector-description-compact">{t('security.audit.autoRecording.qualityDescription')}</span>
                                          </div>
                                        </div>
                                        <div className="general-selector-action-wrapper">
                                          <Dropdown
                                            id="recordingQuality"
                                            value={recordingQuality}
                                            options={[
                                              { label: t('security.audit.autoRecording.qualityOptions.high'), value: 'high' },
                                              { label: t('security.audit.autoRecording.qualityOptions.medium'), value: 'medium' },
                                              { label: t('security.audit.autoRecording.qualityOptions.low'), value: 'low' }
                                            ]}
                                            onChange={(e) => setRecordingQuality(e.value)}
                                            style={{ minWidth: '200px' }}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Cifrar grabaciones */}
                                    <div className="general-setting-card" onClick={() => setEncryptRecordings(!encryptRecordings)}>
                                      <div className="general-setting-content">
                                        <div className="general-setting-icon lock">
                                          <i className="pi pi-lock"></i>
                                        </div>
                                        <div className="general-setting-info">
                                          <label htmlFor="encryptRecordings" className="general-setting-label">
                                            {t('security.audit.autoRecording.encrypt')}
                                          </label>
                                          <p className="general-setting-description">
                                            {t('security.audit.autoRecording.encryptDescription')}
                                          </p>
                                        </div>
                                        <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                                          <Checkbox
                                            inputId="encryptRecordings"
                                            checked={encryptRecordings}
                                            onChange={(e) => setEncryptRecordings(e.checked)}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Ubicación de grabaciones */}
                                    <div className="general-icon-selector-section">
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div className="general-selector-row-expandable">
                                          <div className="general-selector-info-group">
                                            <div className="general-selector-icon-compact">
                                              <i className="pi pi-folder-open"></i>
                                            </div>
                                            <div className="general-selector-text-group">
                                              <span className="general-selector-title-compact">{t('security.audit.autoRecording.location')}</span>
                                              <span className="general-selector-description-compact">
                                                {isDefaultPath
                                                  ? t('security.audit.autoRecording.locationDefault')
                                                  : t('security.audit.autoRecording.locationCustom').replace('{path}', recordingPath || t('security.audit.autoRecording.locationLoading'))
                                                }
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                          <InputText
                                            value={recordingPath || ''}
                                            readOnly
                                            style={{
                                              flex: 1,
                                              fontFamily: 'monospace',
                                              fontSize: '0.8125rem',
                                              padding: '0.5rem 0.75rem'
                                            }}
                                            placeholder={loadingPath ? t('security.audit.autoRecording.locationLoading') : t('security.audit.autoRecording.locationPlaceholder')}
                                          />
                                          <Button
                                            icon="pi pi-folder-open"
                                            label={t('security.audit.autoRecording.changeLocation')}
                                            onClick={async () => {
                                              try {
                                                if (!window?.electron?.dialog?.showOpenDialog) {
                                                  toast?.show({
                                                    severity: 'warn',
                                                    summary: t('security.audit.autoRecording.notAvailable'),
                                                    detail: t('security.audit.autoRecording.notAvailableDetail')
                                                  });
                                                  return;
                                                }

                                                const result = await window.electron.dialog.showOpenDialog({
                                                  properties: ['openDirectory'],
                                                  title: t('security.audit.autoRecording.selectFolder')
                                                });

                                                if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                                                  const selectedPath = result.filePaths[0];
                                                  setLoadingPath(true);

                                                  const setResult = await window.electron.ipcRenderer.invoke('recording:set-path', {
                                                    customPath: selectedPath
                                                  });

                                                  if (setResult && setResult.success) {
                                                    setRecordingPath(setResult.currentPath);
                                                    setIsDefaultPath(false);
                                                    toast?.show({
                                                      severity: 'success',
                                                      summary: t('security.audit.autoRecording.locationUpdated'),
                                                      detail: t('security.audit.autoRecording.locationUpdatedDetail').replace('{path}', setResult.currentPath)
                                                    });
                                                  } else {
                                                    toast?.show({
                                                      severity: 'error',
                                                      summary: t('security.audit.autoRecording.error'),
                                                      detail: setResult?.error || t('security.audit.autoRecording.errorDetail')
                                                    });
                                                  }
                                                  setLoadingPath(false);
                                                }
                                              } catch (error) {
                                                console.error('Error seleccionando carpeta:', error);
                                                toast?.show({
                                                  severity: 'error',
                                                  summary: t('security.audit.autoRecording.error'),
                                                  detail: t('security.audit.autoRecording.errorFolder')
                                                });
                                                setLoadingPath(false);
                                              }
                                            }}
                                            disabled={loadingPath}
                                            style={{ minWidth: '100px' }}
                                          />
                                          {!isDefaultPath && (
                                            <Button
                                              icon="pi pi-refresh"
                                              label={t('security.audit.autoRecording.restoreLocation')}
                                              onClick={async () => {
                                                try {
                                                  setLoadingPath(true);
                                                  const result = await window.electron.ipcRenderer.invoke('recording:set-path', {
                                                    customPath: null
                                                  });

                                                  if (result && result.success) {
                                                    setRecordingPath(result.currentPath);
                                                    setIsDefaultPath(true);
                                                    toast?.show({
                                                      severity: 'success',
                                                      summary: t('security.audit.autoRecording.locationRestored'),
                                                      detail: t('security.audit.autoRecording.locationRestoredDetail')
                                                    });
                                                  }
                                                  setLoadingPath(false);
                                                } catch (error) {
                                                  console.error('Error restaurando ruta:', error);
                                                  setLoadingPath(false);
                                                }
                                              }}
                                              disabled={loadingPath}
                                              style={{ minWidth: '100px' }}
                                            />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Sección de Estadísticas Actuales */}
                            <div className="general-settings-section">
                              <div className="general-section-header">
                                <div className="general-section-icon">
                                  <i className="pi pi-chart-bar"></i>
                                </div>
                                <h4 className="general-section-title">{t('security.audit.stats.title')}</h4>
                              </div>

                              <div className="general-settings-options">
                                <div style={{
                                  padding: '1rem',
                                  background: 'rgba(255, 255, 255, 0.02)',
                                  border: '1px solid rgba(255, 255, 255, 0.05)',
                                  borderRadius: '10px'
                                }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                                    <div>
                                      <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>{t('security.audit.stats.files')}</span>
                                      <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem' }}>
                                        {auditStats?.fileCount || 0}
                                      </span>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>{t('security.audit.stats.totalSize')}</span>
                                      <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem' }}>
                                        {formatBytes(auditStats?.totalSize || 0)}
                                      </span>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>{t('security.audit.stats.oldest')}</span>
                                      <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                        {auditStats?.oldestFile ? new Date(auditStats.oldestFile).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'N/A'}
                                      </span>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>{t('security.audit.stats.lastCleanup')}</span>
                                      <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                        {auditStats?.lastCleanup ? new Date(auditStats.lastCleanup).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : t('security.audit.stats.never')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Sección de Limpieza Automática */}
                          <div className="general-settings-section" style={{ gridColumn: '2', gridRow: '1', minWidth: 0, width: '100%' }}>
                            <div className="general-section-header">
                              <div className="general-section-icon">
                                <i className="pi pi-trash"></i>
                              </div>
                              <h4 className="general-section-title">{t('security.audit.cleanup.title')}</h4>
                            </div>

                            <div className="general-settings-options">
                              {/* Activar limpieza automática */}
                              <div className="general-setting-card" onClick={() => setAutoCleanupEnabled(!autoCleanupEnabled)}>
                                <div className="general-setting-content">
                                  <div className="general-setting-icon lock">
                                    <i className="pi pi-refresh"></i>
                                  </div>
                                  <div className="general-setting-info">
                                    <label htmlFor="autoCleanup" className="general-setting-label">
                                      {t('security.audit.cleanup.enable')}
                                    </label>
                                    <p className="general-setting-description">
                                      {t('security.audit.cleanup.enableDescription')}
                                    </p>
                                  </div>
                                  <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      inputId="autoCleanup"
                                      checked={autoCleanupEnabled}
                                      onChange={(e) => setAutoCleanupEnabled(e.checked)}
                                    />
                                  </div>
                                </div>
                              </div>

                              {autoCleanupEnabled && (
                                <>
                                  {/* Días de retención */}
                                  <div className="general-icon-selector-section">
                                    <div className="general-selector-row-expandable">
                                      <div className="general-selector-info-group">
                                        <div className="general-selector-icon-compact">
                                          <i className="pi pi-calendar"></i>
                                        </div>
                                        <div className="general-selector-text-group">
                                          <span className="general-selector-title-compact">{t('security.audit.cleanup.retentionDays').replace('{days}', retentionDays)}</span>
                                          <span className="general-selector-description-compact">{t('security.audit.cleanup.retentionDescription')}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ marginTop: '0.75rem', paddingLeft: '2.75rem' }}>
                                      <Slider
                                        id="retentionDays"
                                        value={retentionDays}
                                        onChange={(e) => setRetentionDays(e.value)}
                                        min={1}
                                        max={365}
                                        step={1}
                                        style={{ width: '100%' }}
                                      />
                                      <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.75rem',
                                        color: 'var(--text-color-secondary)',
                                        marginTop: '0.25rem',
                                        opacity: 0.7
                                      }}>
                                        <span>{t('security.audit.cleanup.retentionRange.min')}</span>
                                        <span>{t('security.audit.cleanup.retentionRange.max')}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Tamaño máximo de almacenamiento */}
                                  <div className="general-icon-selector-section">
                                    <div className="general-selector-row-expandable">
                                      <div className="general-selector-info-group">
                                        <div className="general-selector-icon-compact">
                                          <i className="pi pi-database"></i>
                                        </div>
                                        <div className="general-selector-text-group">
                                          <span className="general-selector-title-compact">{t('security.audit.cleanup.maxStorage').replace('{size}', maxStorageSize)}</span>
                                          <span className="general-selector-description-compact">{t('security.audit.cleanup.maxStorageDescription')}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ marginTop: '0.75rem', paddingLeft: '2.75rem' }}>
                                      <Slider
                                        id="maxStorageSize"
                                        value={maxStorageSize}
                                        onChange={(e) => setMaxStorageSize(e.value)}
                                        min={0.1}
                                        max={100}
                                        step={0.1}
                                        style={{ width: '100%' }}
                                      />
                                      <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.75rem',
                                        color: 'var(--text-color-secondary)',
                                        marginTop: '0.25rem',
                                        opacity: 0.7
                                      }}>
                                        <span>{t('security.audit.cleanup.maxStorageRange.min')}</span>
                                        <span>{t('security.audit.cleanup.maxStorageRange.max')}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Ejecutar limpieza al iniciar */}
                                  <div className="general-setting-card" onClick={() => setCleanupOnStartup(!cleanupOnStartup)}>
                                    <div className="general-setting-content">
                                      <div className="general-setting-icon bolt">
                                        <i className="pi pi-power-off"></i>
                                      </div>
                                      <div className="general-setting-info">
                                        <label htmlFor="cleanupOnStartup" className="general-setting-label">
                                          {t('security.audit.cleanup.onStartup')}
                                        </label>
                                        <p className="general-setting-description">
                                          {t('security.audit.cleanup.onStartupDescription')}
                                        </p>
                                      </div>
                                      <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          inputId="cleanupOnStartup"
                                          checked={cleanupOnStartup}
                                          onChange={(e) => setCleanupOnStartup(e.checked)}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Frecuencia de limpieza */}
                                  <div className="general-icon-selector-section">
                                    <div className="general-selector-row-expandable">
                                      <div className="general-selector-info-group">
                                        <div className="general-selector-icon-compact">
                                          <i className="pi pi-clock"></i>
                                        </div>
                                        <div className="general-selector-text-group">
                                          <span className="general-selector-title-compact">{t('security.audit.cleanup.frequency')}</span>
                                          <span className="general-selector-description-compact">{t('security.audit.cleanup.frequencyDescription')}</span>
                                        </div>
                                      </div>
                                      <div className="general-selector-action-wrapper">
                                        <Dropdown
                                          id="cleanupFrequency"
                                          value={cleanupFrequency}
                                          options={[
                                            { label: t('security.audit.cleanup.frequencyOptions.daily'), value: 'daily' },
                                            { label: t('security.audit.cleanup.frequencyOptions.weekly'), value: 'weekly' },
                                            { label: t('security.audit.cleanup.frequencyOptions.monthly'), value: 'monthly' },
                                            { label: t('security.audit.cleanup.frequencyOptions.manual'), value: 'manual' }
                                          ]}
                                          onChange={(e) => setCleanupFrequency(e.value)}
                                          style={{ minWidth: '180px' }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Botones de acción */}
                              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <Button
                                  label={t('security.audit.cleanup.runNow')}
                                  icon="pi pi-trash"
                                  onClick={handleManualCleanup}
                                  disabled={!autoCleanupEnabled}
                                  className="p-button-warning"
                                  style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}
                                />
                                <Button
                                  label={t('security.audit.cleanup.viewFiles')}
                                  icon="pi pi-folder-open"
                                  onClick={handleViewAuditFiles}
                                  className="p-button-secondary"
                                  style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabPanel>

            <TabPanel header="Usuarios" leftIcon="pi pi-users" style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <UsersSettingsTab
                  nodes={nodes}
                  onUpdateUserPassword={onUpdateUserPassword}
                  onEditConnection={onEditConnection}
                />
              </div>
            </TabPanel>

            <TabPanel header={t('tabs.appearance')} leftIcon="pi pi-palette" style={{ '--content-height': `${contentHeight}px` }}>
              <div className="apariencia-tab-container" style={{ right: '8px', width: 'calc(100% - 8px)' }}>
                {/* Renderizado condicional basado en activeSubTab */}
                {activeSubTab === 'interfaz' && (
                  <ThemeSelector showPreview={true} />
                )}
                {activeSubTab === 'layouts' && (
                  <LayoutThemeSelector />
                )}
                {activeSubTab === 'terminal' && (
                  <TerminalSettingsTab
                    fontFamily={fontFamily}
                    setFontFamily={setFontFamily}
                    fontSize={fontSize}
                    setFontSize={setFontSize}
                    terminalTheme={terminalTheme}
                    setTerminalTheme={setTerminalTheme}
                    availableFonts={availableFonts}
                    localFontFamily={localFontFamily}
                    setLocalFontFamily={setLocalFontFamily}
                    localFontSize={localFontSize}
                    setLocalFontSize={setLocalFontSize}
                    localPowerShellTheme={localPowerShellTheme}
                    setLocalPowerShellTheme={setLocalPowerShellTheme}
                    localLinuxTerminalTheme={localLinuxTerminalTheme}
                    setLocalLinuxTerminalTheme={setLocalLinuxTerminalTheme}
                    localDockerTerminalTheme={localDockerTerminalTheme}
                    setLocalDockerTerminalTheme={setLocalDockerTerminalTheme}
                    localDockerFontFamily={dockerFontFamily}
                    setLocalDockerFontFamily={setDockerFontFamily}
                    localDockerFontSize={dockerFontSize}
                    setLocalDockerFontSize={setDockerFontSize}
                    defaultLocalTerminal={defaultLocalTerminal}
                    defaultTerminalOptions={defaultTerminalOptions}
                    onDefaultTerminalChange={handleDefaultTerminalChange}
                  />
                )}
                {activeSubTab === 'status-bar' && (
                  <StatusBarSettingsTab
                    statusBarTheme={statusBarTheme}
                    setStatusBarTheme={setStatusBarTheme}
                    statusBarIconTheme={statusBarIconTheme}
                    setStatusBarIconTheme={setStatusBarIconTheme}
                    statusBarPollingInterval={statusBarPollingInterval}
                    setStatusBarPollingInterval={setStatusBarPollingInterval}
                    statusBarLayout={statusBarLayout}
                    setStatusBarLayout={setStatusBarLayout}
                  />
                )}
                {activeSubTab === 'explorador-sesiones' && (
                  <div className="general-settings-container" style={{ width: '100%', maxWidth: '100%' }}>
                    {/* Header */}
                    <div className="general-settings-header-wrapper">
                      <div className="general-header-content">
                        <span className="general-header-icon protocol-dialog-header-icon" style={{
                          background: 'linear-gradient(135deg, #00ACC1 0%, #0097A7 100%)',
                          boxShadow: '0 2px 8px rgba(0, 172, 193, 0.25)'
                        }}>
                          <i className="pi pi-sitemap"></i>
                        </span>
                        <div className="general-header-text">
                          <h3 className="general-header">{t('appearance.sessionExplorer.title')}</h3>
                          <p className="general-description">{t('appearance.sessionExplorer.description')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Unificada: Dashboard de Personalización */}
                    <div className="general-settings-section" style={{
                      marginBottom: 0,
                      maxWidth: '100%',
                      width: '100%'
                    }}>
                      <div className="general-section-header">
                        <div className="general-section-icon" style={{
                          background: 'linear-gradient(135deg, #00ACC1 0%, #0097A7 100%)',
                          boxShadow: '0 2px 8px rgba(0, 172, 193, 0.3)'
                        }}>
                          <i className="pi pi-eye"></i>
                        </div>
                        <h4 className="general-section-title">Personalización del Explorador</h4>
                      </div>

                      <div className="general-settings-options" style={{ padding: '1rem 1.25rem' }}>

                        {/* ═══════════════════════════════════════════════════════════════
                          VISTA PREVIA EN VIVO DEL EXPLORADOR
                          ═══════════════════════════════════════════════════════════════ */}
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.15) 100%)',
                          borderRadius: '12px',
                          padding: '1rem',
                          marginBottom: '1.25rem',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem',
                            opacity: 0.7,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: 'var(--text-color-secondary)'
                          }}>
                            <i className="pi pi-desktop" style={{ fontSize: '0.7rem' }}></i>
                            Vista Previa
                          </div>

                          {/* Árbol Simulado con tema dinámico */}
                          <div
                            className={`tree-preview-container tree-theme-${treeTheme}`}
                            style={{
                              fontFamily: buildSidebarFontStack(sidebarFont),
                              fontSize: `${sidebarFontSize}px`,
                              color: sidebarFontColor || 'var(--ui-dialog-text)'
                            }}
                          >
                            {/* Carpeta Principal - Raíz */}
                            <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {iconThemes[iconThemeSidebar]?.icons.folder &&
                                React.cloneElement(iconThemes[iconThemeSidebar].icons.folder, {
                                  width: folderIconSize || 20,
                                  height: folderIconSize || 20,
                                  style: {
                                    ...iconThemes[iconThemeSidebar].icons.folder.props.style,
                                    width: `${folderIconSize || 20}px`,
                                    height: `${folderIconSize || 20}px`,
                                    flexShrink: 0
                                  }
                                })
                              }
                              <span style={{ fontWeight: 600 }}>Producción</span>
                            </div>

                            {/* Nivel 1: Hijos de la carpeta raíz */}
                            <div className="tree-preview-children">
                              {/* Subcarpeta 1: Servidores Web */}
                              <div className="tree-preview-child">
                                <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                                  {iconThemes[iconThemeSidebar]?.icons.folder &&
                                    React.cloneElement(iconThemes[iconThemeSidebar].icons.folder, {
                                      width: folderIconSize || 20,
                                      height: folderIconSize || 20,
                                      style: {
                                        ...iconThemes[iconThemeSidebar].icons.folder.props.style,
                                        width: `${folderIconSize || 20}px`,
                                        height: `${folderIconSize || 20}px`,
                                        flexShrink: 0
                                      }
                                    })
                                  }
                                  <span>Servidores Web</span>
                                </div>

                                {/* Nivel 2: Conexiones dentro de Servidores Web */}
                                <div className="tree-preview-children">
                                  <div className="tree-preview-child">
                                    <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                                      {iconThemes[iconThemeSidebar]?.icons.ssh &&
                                        React.cloneElement(iconThemes[iconThemeSidebar].icons.ssh, {
                                          width: connectionIconSize || 20,
                                          height: connectionIconSize || 20,
                                          style: {
                                            ...iconThemes[iconThemeSidebar].icons.ssh.props.style,
                                            width: `${connectionIconSize || 20}px`,
                                            height: `${connectionIconSize || 20}px`,
                                            flexShrink: 0
                                          }
                                        })
                                      }
                                      <span>Apache-Server-01</span>
                                    </div>
                                  </div>
                                  <div className="tree-preview-child">
                                    <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                                      {iconThemes[iconThemeSidebar]?.icons.ssh &&
                                        React.cloneElement(iconThemes[iconThemeSidebar].icons.ssh, {
                                          width: connectionIconSize || 20,
                                          height: connectionIconSize || 20,
                                          style: {
                                            ...iconThemes[iconThemeSidebar].icons.ssh.props.style,
                                            width: `${connectionIconSize || 20}px`,
                                            height: `${connectionIconSize || 20}px`,
                                            flexShrink: 0
                                          }
                                        })
                                      }
                                      <span>Nginx-Proxy</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Subcarpeta 2: Bases de Datos */}
                              <div className="tree-preview-child">
                                <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                                  {iconThemes[iconThemeSidebar]?.icons.folder &&
                                    React.cloneElement(iconThemes[iconThemeSidebar].icons.folder, {
                                      width: folderIconSize || 20,
                                      height: folderIconSize || 20,
                                      style: {
                                        ...iconThemes[iconThemeSidebar].icons.folder.props.style,
                                        width: `${folderIconSize || 20}px`,
                                        height: `${folderIconSize || 20}px`,
                                        flexShrink: 0
                                      }
                                    })
                                  }
                                  <span>Bases de Datos</span>
                                </div>

                                {/* Nivel 2: Conexiones dentro de Bases de Datos */}
                                <div className="tree-preview-children">
                                  <div className="tree-preview-child">
                                    <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                                      {iconThemes[iconThemeSidebar]?.icons.rdp &&
                                        React.cloneElement(iconThemes[iconThemeSidebar].icons.rdp, {
                                          width: connectionIconSize || 20,
                                          height: connectionIconSize || 20,
                                          style: {
                                            ...iconThemes[iconThemeSidebar].icons.rdp.props.style,
                                            width: `${connectionIconSize || 20}px`,
                                            height: `${connectionIconSize || 20}px`,
                                            flexShrink: 0
                                          }
                                        })
                                      }
                                      <span>SQL-Server-Main</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ═══════════════════════════════════════════════════════════════
                          DIVIDER
                          ═══════════════════════════════════════════════════════════════ */}
                        <div style={{
                          height: '1px',
                          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 172, 193, 0.4) 50%, transparent 100%)',
                          margin: '0.5rem 0 1rem 0'
                        }}></div>

                        {/* ═══════════════════════════════════════════════════════════════
                          FILA 1: TEMA DE ICONOS + TEMA DEL ÁRBOL + TEMA DE ICONOS DE ACCIÓN
                          ═══════════════════════════════════════════════════════════════ */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          {/* Tema de Iconos */}
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.5rem'
                            }}>
                              <i className="pi pi-palette" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                              <label style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'var(--ui-dialog-text)'
                              }}>Tema de Iconos</label>
                            </div>
                            <Dropdown
                              id="icon-theme-sidebar"
                              value={iconThemeSidebar}
                              options={Object.entries(iconThemes).map(([key, theme]) => ({ label: theme.name, value: key }))}
                              onChange={e => setIconThemeSidebar(e.value)}
                              placeholder={t('appearance.sessionExplorer.selectTheme')}
                              style={{ width: '100%' }}
                              itemTemplate={option => (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {iconThemes[option.value]?.icons.folder}
                                  {iconThemes[option.value]?.name}
                                </span>
                              )}
                            />
                          </div>

                          {/* Tema del Árbol */}
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.5rem'
                            }}>
                              <i className="pi pi-share-alt" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                              <label style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'var(--ui-dialog-text)'
                              }}>Tema del Árbol</label>
                            </div>
                            <Dropdown
                              id="tree-theme"
                              value={treeTheme}
                              options={treeThemeOptions}
                              onChange={(e) => setTreeTheme && setTreeTheme(e.value)}
                              placeholder={t('appearance.sessionExplorer.selectTheme')}
                              style={{ width: '100%' }}
                              itemTemplate={(option) => (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 500 }}>{option.label}</span>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-color-secondary)',
                                    opacity: 0.7
                                  }}>{option.description}</span>
                                </div>
                              )}
                            />
                          </div>

                          {/* Tema de Iconos de Acción */}
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.5rem'
                            }}>
                              <i className="pi pi-palette" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                              <label style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'var(--ui-dialog-text)'
                              }}>Iconos de Acción</label>
                            </div>
                            <Dropdown
                              id="session-action-icon-theme"
                              value={sessionActionIconTheme || 'modern'}
                              options={Object.entries(sessionActionIconThemes).map(([key, theme]) => ({
                                label: theme.name,
                                value: key,
                                description: theme.description
                              }))}
                              onChange={(e) => {
                                if (setSessionActionIconTheme) {
                                  setSessionActionIconTheme(e.value);
                                }
                              }}
                              placeholder="Seleccionar tema"
                              style={{ width: '100%' }}
                              itemTemplate={(option) => (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 500 }}>{option.label}</span>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-color-secondary)',
                                    opacity: 0.7
                                  }}>{option.description}</span>
                                </div>
                              )}
                            />
                          </div>
                        </div>

                         {/* ═══════════════════════════════════════════════════════════════
                           FILA 2: TIPOGRAFÍA
                           ═══════════════════════════════════════════════════════════════ */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: '10px',
                          padding: '0.875rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          marginBottom: '1rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <i className="pi pi-pencil" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: 'var(--ui-dialog-text)'
                            }}>Tipografía</span>
                            {/* Badge con el tamaño de fuente calculado automáticamente */}
                            <span style={{
                              fontSize: '0.7rem',
                              color: 'var(--ui-button-primary)',
                              background: 'rgba(var(--ui-button-primary-rgb, 0,172,193), 0.12)',
                              border: '1px solid rgba(var(--ui-button-primary-rgb, 0,172,193), 0.25)',
                              borderRadius: '999px',
                              padding: '1px 8px',
                              fontWeight: 600,
                              letterSpacing: '0.02em',
                              marginLeft: '0.25rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <i className="pi pi-link" style={{ fontSize: '0.6rem', opacity: 0.8 }}></i>
                              {sidebarFontSize} px · auto
                            </span>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 1fr 1fr',
                            gap: '1rem'
                          }}>
                            {/* Fuente */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                minWidth: '60px'
                              }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>{t('appearance.homePage.font')}</span>
                              </div>
                              <Dropdown
                                id="sidebar-font"
                                value={sidebarFont}
                                options={explorerFonts.map(f => ({ label: f, value: f }))}
                                onChange={e => setSidebarFont(e.value)}
                                placeholder={t('appearance.sessionExplorer.selectFont')}
                                style={{ flex: 1 }}
                                itemTemplate={option => (
                                  <span style={{ fontFamily: buildSidebarFontStack(option.value) }}>{option.label}</span>
                                )}
                              />
                            </div>

                            {/* Color de Fuente */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                minWidth: '60px'
                              }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>Color</span>
                              </div>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <input
                                    type="color"
                                    id="sidebar-font-color-input"
                                    value={sidebarFontColor || '#ffffff'}
                                    onChange={(e) => {
                                      const newColor = e.target.value;
                                      handleSidebarFontColorChange(newColor);
                                    }}
                                    style={{
                                      flex: 1,
                                      height: '36px',
                                      minWidth: '80px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      cursor: 'pointer',
                                      backgroundColor: 'transparent'
                                    }}
                                  />
                                  <span style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--ui-button-primary)',
                                    fontWeight: 600,
                                    minWidth: '70px',
                                    textAlign: 'right',
                                    fontFamily: 'monospace'
                                  }}>{sidebarFontColor || 'Por defecto'}</span>
                                </div>
                                {sidebarFontColor && (
                                  <Button
                                    icon="pi pi-times"
                                    className="p-button-text p-button-rounded"
                                    onClick={() => {
                                      console.log('[SettingsDialog] Restaurando color por defecto');
                                      try {
                                        localStorage.removeItem('sidebarFontColorSource');
                                        localStorage.removeItem('sidebarFontColor');
                                        // Force immediate sync so the deletion is written to
                                        // app-data.json before a possible app restart
                                        localStorageSyncService.forceSync();
                                      } catch { }
                                      setSidebarFontColor('');
                                    }}
                                    tooltip={t('appearance.sessionExplorer.restoreColor')}
                                    tooltipOptions={{ position: 'top' }}
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      padding: 0,
                                      color: 'var(--text-color-secondary)'
                                    }}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Tamaño de Iconos */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                minWidth: '50px'
                              }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>Iconos / Carpetas</span>
                              </div>
                              <SmoothIconSlider 
                                connectionIconSize={connectionIconSize} 
                                setConnectionIconSize={setConnectionIconSize} 
                              />
                            </div>

                          </div>
                        </div>


                        {/* ═══════════════════════════════════════════════════════════════
                          VISTA PREVIA DE ICONOS DE ACCIÓN
                          ═══════════════════════════════════════════════════════════════ */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: '10px',
                          padding: '0.875rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          marginTop: '1rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <i className="pi pi-eye" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: 'var(--ui-dialog-text)'
                            }}>Vista Previa de Iconos de Acción</span>
                          </div>

                          {/* Vista previa de iconos */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            background: 'rgba(0, 0, 0, 0.15)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            {sessionActionIconThemes[sessionActionIconTheme || 'modern'] && (
                              <>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.03)'
                                }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--ui-sidebar-text)'
                                  }}>
                                    {sessionActionIconThemes[sessionActionIconTheme || 'modern'].icons.collapseLeft}
                                  </div>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>Colapsar</span>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.03)'
                                }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--ui-sidebar-text)'
                                  }}>
                                    {sessionActionIconThemes[sessionActionIconTheme || 'modern'].icons.newConnection}
                                  </div>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>Nueva Conexión</span>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.03)'
                                }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--ui-sidebar-text)'
                                  }}>
                                    {sessionActionIconThemes[sessionActionIconTheme || 'modern'].icons.newFolder}
                                  </div>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>Nueva Carpeta</span>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.03)'
                                }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--ui-sidebar-text)'
                                  }}>
                                    {sessionActionIconThemes[sessionActionIconTheme || 'modern'].icons.newGroup}
                                  </div>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>Nuevo Grupo</span>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.03)'
                                }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffc107'
                                  }}>
                                    {sessionActionIconThemes[sessionActionIconTheme || 'modern'].icons.passwordManager}
                                  </div>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>Contraseñas</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
                {activeSubTab === 'explorador-archivos' && (
                  <div className="general-settings-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
                    {/* Header */}
                    <div className="general-settings-header-wrapper">
                      <div className="general-header-content">
                        <span className="general-header-icon protocol-dialog-header-icon" style={{
                          background: 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)',
                          boxShadow: '0 2px 8px rgba(139, 195, 74, 0.25)'
                        }}>
                          <i className="pi pi-folder-open"></i>
                        </span>
                        <div className="general-header-text">
                          <h3 className="general-header">Explorador de Archivos</h3>
                          <p className="general-description">Personaliza iconos, tipografía y tema de colores</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Unificada: Dashboard de Personalización */}
                    <div className="general-settings-section" style={{
                      marginBottom: 0,
                      maxWidth: '100%',
                      width: '100%'
                    }}>
                      <div className="general-section-header">
                        <div className="general-section-icon" style={{
                          background: 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)',
                          boxShadow: '0 2px 8px rgba(139, 195, 74, 0.3)'
                        }}>
                          <i className="pi pi-eye"></i>
                        </div>
                        <h4 className="general-section-title">Personalización del Explorador</h4>
                      </div>

                      <div className="general-settings-options" style={{ padding: '1rem 1.25rem' }}>

                        {/* ═══════════════════════════════════════════════════════════════
                          VISTA PREVIA EN VIVO DEL EXPLORADOR
                          ═══════════════════════════════════════════════════════════════ */}
                        {(() => {
                          const themeColors = uiThemes[explorerColorTheme]?.colors || uiThemes['Light']?.colors || {};
                          const previewBg = themeColors.contentBackground || '#ffffff';
                          const previewText = themeColors.dialogText || '#1e293b';
                          const previewBorder = themeColors.contentBorder || '#e2e8f0';
                          const previewHover = themeColors.sidebarHover || '#f1f5f9';

                          return (
                            <div style={{
                              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.15) 100%)',
                              borderRadius: '12px',
                              padding: '1rem',
                              marginBottom: '1.25rem',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.75rem',
                                opacity: 0.7,
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: 'var(--text-color-secondary)'
                              }}>
                                <i className="pi pi-desktop" style={{ fontSize: '0.7rem' }}></i>
                                Vista Previa
                              </div>

                              {/* Vista Previa del Explorador de Archivos - Estilo Material Design Cards */}
                              <div
                                className="explorer-preview-container"
                                style={{
                                  fontFamily: buildSidebarFontStack(explorerFont),
                                  fontSize: `${explorerFontSize}px`,
                                  background: previewBg,
                                  borderRadius: '8px',
                                  padding: '0.5rem',
                                  border: `1px solid ${previewBorder}`,
                                  maxHeight: '200px',
                                  overflowY: 'auto'
                                }}
                              >
                                {/* Carpeta */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    marginBottom: '0.25rem',
                                    background: previewHover,
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = themeColors.sidebarSelected || '#e0e7ff'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = previewHover}
                                >
                                  <FaFolder style={{
                                    fontSize: '20px',
                                    color: themeColors.buttonPrimary || '#667eea',
                                    flexShrink: 0
                                  }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontWeight: 600,
                                      color: previewText,
                                      fontSize: `${explorerFontSize}px`,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>Notas</div>
                                    <div style={{
                                      fontSize: `${Math.max(explorerFontSize - 2, 10)}px`,
                                      color: previewText,
                                      opacity: 0.7,
                                      marginTop: '2px'
                                    }}>Carpeta • Modificado hoy</div>
                                  </div>
                                </div>

                                {/* Archivo PDF */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    marginBottom: '0.25rem',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = previewHover}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <FaFilePdf style={{
                                    fontSize: '18px',
                                    color: '#dc2626',
                                    flexShrink: 0
                                  }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontWeight: 500,
                                      color: previewText,
                                      fontSize: `${explorerFontSize}px`,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>reporte.pdf</div>
                                    <div style={{
                                      fontSize: `${Math.max(explorerFontSize - 2, 10)}px`,
                                      color: previewText,
                                      opacity: 0.7,
                                      marginTop: '2px'
                                    }}>PDF • 2.4 MB • Modificado ayer</div>
                                  </div>
                                </div>

                                {/* Archivo PowerPoint */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    marginBottom: '0.25rem',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = previewHover}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <FaFileWord style={{
                                    fontSize: '18px',
                                    color: '#ea580c',
                                    flexShrink: 0
                                  }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontWeight: 500,
                                      color: previewText,
                                      fontSize: `${explorerFontSize}px`,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>presentacion.pptx</div>
                                    <div style={{
                                      fontSize: `${Math.max(explorerFontSize - 2, 10)}px`,
                                      color: previewText,
                                      opacity: 0.7,
                                      marginTop: '2px'
                                    }}>Word • 1.8 MB • Modificado hace 2 días</div>
                                  </div>
                                </div>

                                {/* Archivo Excel */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = previewHover}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <FaFileExcel style={{
                                    fontSize: '18px',
                                    color: '#16a34a',
                                    flexShrink: 0
                                  }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontWeight: 500,
                                      color: previewText,
                                      fontSize: `${explorerFontSize}px`,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>datos.xlsx</div>
                                    <div style={{
                                      fontSize: `${Math.max(explorerFontSize - 2, 10)}px`,
                                      color: previewText,
                                      opacity: 0.7,
                                      marginTop: '2px'
                                    }}>Excel • 856 KB • Modificado hace 3 días</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* ═══════════════════════════════════════════════════════════════
                          DIVIDER
                          ═══════════════════════════════════════════════════════════════ */}
                        <div style={{
                          height: '1px',
                          background: 'linear-gradient(90deg, transparent 0%, rgba(139, 195, 74, 0.4) 50%, transparent 100%)',
                          margin: '0.5rem 0 1rem 0'
                        }}></div>

                        {/* ═══════════════════════════════════════════════════════════════
                          FILA 1: TEMA DE ICONOS + TEMA DE COLORES
                          ═══════════════════════════════════════════════════════════════ */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          {/* Tema de Iconos */}
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.5rem'
                            }}>
                              <i className="pi pi-palette" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                              <label style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'var(--ui-dialog-text)'
                              }}>Tema de Iconos</label>
                            </div>
                            <Dropdown
                              id="icon-theme"
                              value={iconTheme}
                              options={Object.entries(iconThemes).map(([key, theme]) => ({ label: theme.name, value: key }))}
                              onChange={e => setIconTheme(e.value)}
                              placeholder={t('appearance.sessionExplorer.selectTheme')}
                              style={{ width: '100%' }}
                              itemTemplate={option => (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {iconThemes[option.value]?.icons.folder}
                                  {iconThemes[option.value]?.name}
                                </span>
                              )}
                            />
                          </div>

                          {/* Tema de Colores */}
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.5rem'
                            }}>
                              <i className="pi pi-sun" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                              <label style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'var(--ui-dialog-text)'
                              }}>Tema de Colores</label>
                            </div>
                            <Dropdown
                              id="explorer-color-theme"
                              value={explorerColorTheme}
                              options={Object.entries(uiThemes).map(([key, theme]) => ({ label: theme.name, value: key }))}
                              onChange={e => setExplorerColorTheme(e.value)}
                              placeholder={t('appearance.sessionExplorer.selectTheme')}
                              style={{ width: '100%' }}
                              itemTemplate={option => (
                                <span style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '4px 0'
                                }}>
                                  <div style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: uiThemes[option.value]?.colors?.buttonPrimary || '#007ad9',
                                    border: '2px solid rgba(255,255,255,0.2)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                  }}></div>
                                  {option.label}
                                </span>
                              )}
                            />
                          </div>
                        </div>

                        {/* ═══════════════════════════════════════════════════════════════
                          FILA 2: TIPOGRAFÍA
                          ═══════════════════════════════════════════════════════════════ */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: '10px',
                          padding: '0.875rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          marginBottom: '1rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <i className="pi pi-pencil" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: 'var(--ui-dialog-text)'
                            }}>Tipografía</span>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem'
                          }}>
                            {/* Fuente */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                minWidth: '60px'
                              }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>{t('appearance.homePage.font')}</span>
                              </div>
                              <Dropdown
                                id="explorer-font"
                                value={explorerFont}
                                options={explorerFonts.map(f => ({ label: f, value: f }))}
                                onChange={e => setExplorerFont(e.value)}
                                placeholder={t('appearance.sessionExplorer.selectFont')}
                                style={{ flex: 1 }}
                                itemTemplate={option => (
                                  <span style={{ fontFamily: buildSidebarFontStack(option.value) }}>{option.label}</span>
                                )}
                              />
                            </div>

                            {/* Tamaño de Fuente con Slider */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                minWidth: '60px'
                              }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>{t('appearance.homePage.fontSize')}</span>
                              </div>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Slider
                                  value={explorerFontSize}
                                  onChange={(e) => setExplorerFontSize(e.value)}
                                  min={8}
                                  max={32}
                                  style={{ flex: 1 }}
                                />
                                <span style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--ui-button-primary)',
                                  fontWeight: 600,
                                  minWidth: '40px',
                                  textAlign: 'right'
                                }}>{explorerFontSize} px</span>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
                {activeSubTab === 'pestanas' && (
                  <TabThemeSelector />
                )}
                {activeSubTab === 'presets' && (
                  <div className="apariencia-tab-container presets-tab-wrapper">
                    <PresetSelector />
                  </div>
                )}
                {activeSubTab === 'splash-screen' && (
                  <div className="general-settings-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
                    {/* Header */}
                    <div className="general-settings-header-wrapper">
                      <div className="general-header-content">
                        <span className="general-header-icon protocol-dialog-header-icon" style={{
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          boxShadow: '0 2px 8px rgba(240, 147, 251, 0.25)'
                        }}>
                          <i className="pi pi-bolt"></i>
                        </span>
                        <div className="general-header-text">
                          <h3 className="general-header">Pantalla de Inicio (Splash Screen)</h3>
                          <p className="general-description">Personaliza el diseño y estilo visual de la pantalla de arranque de NodeTerm</p>
                        </div>
                      </div>
                    </div>

                    <div className="general-settings-section" style={{ marginBottom: 0, width: '100%' }}>
                      <div className="general-section-header">
                        <div className="general-section-icon" style={{
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                        }}>
                          <i className="pi pi-eye"></i>
                        </div>
                        <h4 className="general-section-title">Selección de Estilo</h4>
                      </div>

                      <div className="general-settings-options" style={{ padding: '1.25rem' }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '1.25rem',
                          marginBottom: '1.5rem'
                        }}>
                          {[
                            {
                              id: 'classic',
                              name: 'Classic (Original)',
                              desc: 'El tema clásico y minimalista original de NodeTerm con tonos azulados oscuros.',
                              bgColor: 'linear-gradient(180deg, #1a2332 0%, #0f1722 50%, #0a0f18 100%)',
                              accentColor: '#3b82f6',
                              borderColor: 'rgba(59, 130, 246, 0.2)'
                            },
                            {
                              id: 'hologram-hud',
                              name: 'Hologram HUD',
                              desc: 'Estilo cyberpunk futurista en color cian brillante y violeta neón con rejilla táctica.',
                              bgColor: '#06040d',
                              accentColor: '#00f2fe',
                              borderColor: '#00f2fe'
                            },
                            {
                              id: 'synthwave-outrun',
                              name: 'Synthwave Outrun',
                              desc: 'Aesthetic retro de los 80s con gradientes fucsia y amarillo neón y líneas de horizonte.',
                              bgColor: '#0f021a',
                              accentColor: '#ff007f',
                              borderColor: '#ff007f'
                            },
                            {
                              id: 'terminal-minimalist',
                              name: 'Terminal Minimalist',
                              desc: 'Modo purista de línea de comandos en verde Matrix con ticker de log del sistema.',
                              bgColor: '#000000',
                              accentColor: '#00ff66',
                              borderColor: '#00ff66'
                            }
                          ].map(opt => {
                            const isSelected = splashStyle === opt.id;
                            return (
                              <div
                                key={opt.id}
                                className={`general-setting-card ${isSelected ? 'active' : ''}`}
                                onClick={() => handleSplashStyleChange(opt.id)}
                                style={{
                                  border: isSelected ? `2px solid ${opt.accentColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                                  borderRadius: '12px',
                                  padding: '1.25rem',
                                  cursor: 'pointer',
                                  background: 'rgba(255, 255, 255, 0.02)',
                                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                  boxShadow: isSelected ? `0 0 16px ${opt.accentColor}30` : 'none',
                                  position: 'relative',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  height: '140px'
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: '700', fontSize: '1rem', color: isSelected ? opt.accentColor : 'var(--ui-dialog-text)' }}>
                                      {opt.name}
                                    </span>
                                    {isSelected && (
                                      <i className="pi pi-check-circle" style={{ color: opt.accentColor, fontSize: '1.2rem' }}></i>
                                    )}
                                  </div>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', margin: 0, opacity: 0.85, lineHeight: '1.4' }}>
                                    {opt.desc}
                                  </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: opt.bgColor, border: `1px solid ${opt.accentColor}` }}></div>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', opacity: 0.7 }}>Acento: {opt.accentColor}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Interactive Preview Button */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '10px'
                        }}>
                          <div>
                            <span style={{ fontWeight: '600', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem', color: 'var(--ui-dialog-text)' }}>
                              Previsualizar en Vivo
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                              Abre una ventana externa interactiva para ver cómo luce el tema seleccionado.
                            </span>
                          </div>
                          <Button
                            label="Ver Previsualización"
                            icon="pi pi-external-link"
                            className="p-button-outlined"
                            onClick={() => {
                              if (window.electron?.app?.openSplashPreview) {
                                window.electron.app.openSplashPreview(splashStyle);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activeSubTab === 'pagina-inicio' && (
                  <div className="general-settings-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
                    {/* Header */}
                    <div className="general-settings-header-wrapper">
                      <div className="general-header-content">
                        <span className="general-header-icon protocol-dialog-header-icon" style={{
                          background: 'linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%)',
                          boxShadow: '0 2px 8px rgba(79, 195, 247, 0.25)'
                        }}>
                          <i className="pi pi-home"></i>
                        </span>
                        <div className="general-header-text">
                          <h3 className="general-header">{t('sidebar.homePage')}</h3>
                          <p className="general-description">{t('appearance.homePage.description')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Sección de Tipografía */}
                    <div className="general-settings-section" style={{
                      marginBottom: 0,
                      maxWidth: '100%',
                      width: '100%'
                    }}>
                      <div className="general-section-header">
                        <div className="general-section-icon" style={{
                          background: 'linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%)',
                          boxShadow: '0 2px 8px rgba(79, 195, 247, 0.3)'
                        }}>
                          <i className="pi pi-pencil"></i>
                        </div>
                        <h4 className="general-section-title">{t('appearance.homePage.menuTypography')}</h4>
                      </div>

                      <div className="general-settings-options" style={{ padding: '1rem 1.25rem' }}>
                        {/* Tipografía */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: '10px',
                          padding: '0.875rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          marginBottom: '1rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <i className="pi pi-pencil" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: 'var(--ui-dialog-text)'
                            }}>{t('appearance.homePage.typography')}</span>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem'
                          }}>
                            {/* Fuente */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                minWidth: '60px'
                              }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>{t('appearance.homePage.font')}</span>
                              </div>
                              <Dropdown
                                id="homeTab-font"
                                value={homeTabFont}
                                options={explorerFonts.map(f => ({ label: f, value: f }))}
                                onChange={e => setHomeTabFont(e.value)}
                                placeholder={t('appearance.sessionExplorer.selectFont')}
                                style={{ flex: 1 }}
                                itemTemplate={option => (
                                  <span style={{ fontFamily: buildSidebarFontStack(option.value) }}>{option.label}</span>
                                )}
                              />
                            </div>

                            {/* Tamaño de Fuente con Slider */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                minWidth: '60px'
                              }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>{t('appearance.homePage.fontSize')}</span>
                              </div>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Slider
                                  value={homeTabFontSize}
                                  onChange={(e) => setHomeTabFontSize(e.value)}
                                  min={8}
                                  max={32}
                                  style={{ flex: 1 }}
                                />
                                <span style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--ui-button-primary)',
                                  fontWeight: 600,
                                  minWidth: '40px',
                                  textAlign: 'right'
                                }}>{homeTabFontSize} px</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Tema de Iconos */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: '10px',
                          padding: '0.875rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          marginTop: '1rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <i className="pi pi-palette" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: 'var(--ui-dialog-text)'
                            }}>{t('appearance.homePage.iconTheme')}</span>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              minWidth: '60px'
                            }}>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>{t('appearance.homePage.selectIconTheme')}</span>
                            </div>
                            <Dropdown
                              id="actionbar-icon-theme"
                              value={actionBarIconTheme}
                              options={actionBarIconThemeList}
                              onChange={e => setActionBarIconTheme(e.value)}
                              placeholder={t('appearance.homePage.selectIconTheme')}
                              style={{ flex: 1 }}
                              itemTemplate={option => (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {getActionBarIcon(option.value, 'nuevo', 18)}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 500 }}>{option.label}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>{option.description}</div>
                                  </div>
                                </div>
                              )}
                              valueTemplate={option => option ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {getActionBarIcon(option.value, 'nuevo', 16)}
                                  </div>
                                  <span>{option.label}</span>
                                </div>
                              ) : t('appearance.homePage.selectIconTheme')}
                            />
                          </div>
                        </div>

                        {/* Tema Visual de la Barra */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: '10px',
                          padding: '0.875rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          marginTop: '1rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <i className="pi pi-palette" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: 'var(--ui-dialog-text)'
                            }}>Tema de la Barra de Acciones</span>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              minWidth: '60px'
                            }}>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>Seleccionar tema</span>
                            </div>
                            <Dropdown
                              id="actionbar-visual-theme"
                              value={actionBarTheme}
                              options={Object.values(actionBarThemes).map(theme => ({ label: theme.name, value: theme.id }))}
                              onChange={e => {
                                setActionBarTheme(e.value);
                                localStorage.setItem('actionBarTheme', e.value);
                                window.dispatchEvent(new CustomEvent('action-bar-theme-changed'));
                              }}
                              placeholder="Seleccionar tema visual"
                              style={{ flex: 1 }}
                              itemTemplate={option => {
                                const theme = actionBarThemes[option.value];
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '4px',
                                      background: theme.container.background,
                                      border: theme.container.border !== 'none' ? theme.container.border : '1px solid rgba(255,255,255,0.1)',
                                      backdropFilter: theme.container.backdropFilter
                                    }}></div>
                                    <span>{theme.name}</span>
                                  </div>
                                );
                              }}
                            />
                          </div>
                        </div>

                        {/* Terminal Local */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: '10px',
                          padding: '0.875rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          marginTop: '1rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <i className="pi pi-terminal" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: 'var(--ui-dialog-text)'
                            }}>{t('appearance.homePage.localTerminal')}</span>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.25rem',
                              flex: 1
                            }}>
                              <span style={{
                                fontSize: '0.8125rem',
                                color: 'var(--ui-dialog-text)',
                                fontWeight: 500
                              }}>{t('appearance.homePage.showLocalTerminal')}</span>
                              <span style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-color-secondary)'
                              }}>{t('appearance.homePage.showLocalTerminalDescription')}</span>
                            </div>
                            <Checkbox
                              inputId="local-terminal-visible"
                              checked={localTerminalVisible}
                              onChange={(e) => setLocalTerminalVisible(e.checked)}
                            />
                          </div>
                        </div>

                        {/* Status Bar */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: '10px',
                          padding: '0.875rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          marginTop: '1rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <i className="pi pi-bars" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: 'var(--ui-dialog-text)'
                            }}>{t('appearance.homePage.statusBar')}</span>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.25rem',
                              flex: 1
                            }}>
                              <span style={{
                                fontSize: '0.8125rem',
                                color: 'var(--ui-dialog-text)',
                                fontWeight: 500
                              }}>{t('appearance.homePage.showStatusBar')}</span>
                              <span style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-color-secondary)'
                              }}>{t('appearance.homePage.showStatusBarDescription')}</span>
                            </div>
                            <Checkbox
                              inputId="status-bar-visible"
                              checked={statusBarVisible}
                              onChange={(e) => setStatusBarVisible(e.checked)}
                            />
                          </div>
                        </div>

                        {/* Vista Previa */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: '10px',
                          padding: '0.875rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          marginTop: '1rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <i className="pi pi-eye" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: 'var(--ui-dialog-text)'
                            }}>{t('appearance.homePage.preview')}</span>
                          </div>
                          <div style={{
                            background: 'rgba(0, 0, 0, 0.15)',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            <div style={{
                              width: '74px',
                              height: 'auto',
                              minHeight: '240px',
                              background: activeActionBarVisualTheme.container.background,
                              backdropFilter: activeActionBarVisualTheme.container.backdropFilter,
                              WebkitBackdropFilter: activeActionBarVisualTheme.container.backdropFilter,
                              border: activeActionBarVisualTheme.container.border,
                              borderRadius: '14px',
                              boxShadow: activeActionBarVisualTheme.container.boxShadow,
                              display: 'flex',
                              flexDirection: 'column',
                              padding: '0.6rem 0.4rem',
                              gap: '0.35rem',
                              boxSizing: 'border-box'
                            }}>
                              {[
                                { label: 'Nuevo', icon: 'nuevo' },
                                { label: 'Grupo', icon: 'grupo' },
                                { label: 'Sesiones', icon: 'conexiones' },
                                { label: 'Contraseñas', icon: 'contraseñas' },
                                { label: 'Audit', icon: 'audit' }
                              ].map((item, idx) => (
                                <div key={idx} style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.125rem',
                                  padding: '0.4rem 0',
                                  borderRadius: '12px',
                                  background: activeActionBarVisualTheme.button.background,
                                  border: activeActionBarVisualTheme.button.border,
                                  boxShadow: activeActionBarVisualTheme.button.boxShadow,
                                  backdropFilter: activeActionBarVisualTheme.button.backdropFilter || 'none',
                                  WebkitBackdropFilter: activeActionBarVisualTheme.button.backdropFilter || 'none',
                                  position: 'relative'
                                }}>
                                  <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: activeActionBarVisualTheme.iconBox.borderRadius,
                                    background: `linear-gradient(135deg, ${actionBarIconColors[item.icon] || '#4fc3f7'} 0%, ${(actionBarIconColors[item.icon] || '#4fc3f7')}dd 100%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 1px 4px ${(actionBarIconColors[item.icon] || '#4fc3f7')}40`
                                  }}>
                                    {getActionBarIcon(actionBarIconTheme, item.icon, 16)}
                                  </div>
                                  <span style={{
                                    fontSize: '8px',
                                    fontFamily: homeTabFont,
                                    color: 'var(--text-color-secondary)',
                                    textAlign: 'center',
                                    opacity: 0.8,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    width: '100%',
                                    padding: '0 2px'
                                  }}>{item.label}</span>
                                </div>
                              ))}
                            </div>

                            <div style={{
                              marginLeft: '1.5rem',
                              flex: 1,
                              height: '240px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              borderRadius: '12px',
                              border: '1px dashed rgba(255, 255, 255, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-color-secondary)',
                              fontSize: '0.8rem'
                            }}>
                              Contenido del HomeTab
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabPanel>

            <TabPanel header={<span><i className="pi pi-th-large" style={{ marginRight: 8 }}></i>{t('sidebar.apps') || 'Apps'}</span>} style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <AppsTab
                  themeColors={{ primary: 'var(--primary-color)' }}
                  activeSubTab={activeSubTab}
                  rdpIdleMinutes={rdpIdleMinutes}
                  setRdpIdleMinutes={setRdpIdleMinutes}
                  rdpSessionActivityMinutes={rdpSessionActivityMinutes}
                  setRdpSessionActivityMinutes={setRdpSessionActivityMinutes}
                  rdpResizeDebounceMs={rdpResizeDebounceMs}
                  setRdpResizeDebounceMs={setRdpResizeDebounceMs}
                  rdpResizeAckTimeoutMs={rdpResizeAckTimeoutMs}
                  setRdpResizeAckTimeoutMs={setRdpResizeAckTimeoutMs}
                  rdpGuacdInactivityMs={rdpGuacdInactivityMs}
                  setRdpGuacdInactivityMs={setRdpGuacdInactivityMs}
                  guacdPreferredMethod={guacdPreferredMethod}
                  setGuacdPreferredMethod={setGuacdPreferredMethod}
                  guacdStatus={guacdStatus}
                  guacdRestarting={guacdRestarting}
                  handleRestartGuacd={handleRestartGuacd}
                  handleResetRdpDefaults={handleResetRdpDefaults}
                  methodOptions={methodOptions}
                />
              </div>
            </TabPanel>

            <TabPanel header={t('updateChannels.updatesTitle')} leftIcon="pi pi-refresh" style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, overflow: 'hidden' }}>
                <AppUpdateTab 
                  contentHeight={contentHeight}
                  currentAppVersion={currentAppVersion}
                  updateStatus={updateStatus}
                  isCheckingUpdates={isCheckingUpdates}
                  checkForUpdates={checkForUpdates}
                  downloadProgress={downloadProgress}
                  updateInfo={updateInfo}
                  isDownloading={isDownloading}
                  downloadUpdate={downloadUpdate}
                  installUpdate={installUpdate}
                  isInstalling={isInstalling}
                  autoCheckEnabled={autoCheckEnabled}
                  handleAutoCheckChange={handleAutoCheckChange}
                  autoInstallEnabled={autoInstallEnabled}
                  handleAutoInstallChange={handleAutoInstallChange}
                  autoDownloadEnabled={autoDownloadEnabled}
                  handleAutoDownloadChange={handleAutoDownloadChange}
                  updateChannel={updateChannel}
                  handleChannelChange={handleChannelChange}
                />
              </div>
            </TabPanel>

            <TabPanel header={t('sync.title')} leftIcon="pi pi-cloud" style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: '8px', bottom: 0, width: 'calc(100% - 8px)' }}>
                  {/* Header */}
                  <div className="general-settings-header-wrapper">
                    <div className="general-header-content">
                      <span className="general-header-icon protocol-dialog-header-icon">
                        <i className="pi pi-cloud"></i>
                      </span>
                      <div className="general-header-text">
                        <h3 className="general-header">{t('sync.title')}</h3>
                        <p className="general-description">Sincroniza tu configuración personal entre todos tus dispositivos usando Nextcloud</p>
                      </div>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="general-settings-content sync-settings-content">
                    <div className="sync-main-content">
                      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        <i className="pi pi-cloud" style={{
                          fontSize: '4rem',
                          color: 'var(--primary-color)',
                          marginBottom: '1rem',
                          display: 'block'
                        }}></i>
                        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)', textAlign: 'center' }}>
                          {t('sync.cloudTitle')}
                        </h3>
                        <p style={{
                          margin: '0 0 2rem 0',
                          color: 'var(--text-color-secondary)',
                          fontSize: '1rem',
                          textAlign: 'center'
                        }}>
                          {t('sync.description')}
                        </p>
                      </div>

                      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <Button
                          label={t('sync.configure')}
                          icon="pi pi-cog"
                          onClick={() => setSyncDialogVisible(true)}
                          className="p-button-lg"
                          style={{
                            padding: '1rem 2rem',
                            fontSize: '1.1rem'
                          }}
                        />
                      </div>

                      <div style={{ marginTop: '2rem', width: '100%' }}>
                        <div className="sync-features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', textAlign: 'center' }}>
                          <div>
                            <i className="pi pi-shield" style={{ fontSize: '2rem', color: 'var(--green-500)', marginBottom: '1rem', display: 'block' }}></i>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>Seguro</h4>
                            <p style={{ margin: 0, color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>
                              Tus datos se cifran y almacenan de forma segura en tu instancia de Nextcloud
                            </p>
                          </div>
                          <div>
                            <i className="pi pi-sync" style={{ fontSize: '2rem', color: 'var(--blue-500)', marginBottom: '1rem', display: 'block' }}></i>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>Automático</h4>
                            <p style={{ margin: 0, color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>
                              Sincronización automática cada 5 minutos o manual cuando lo necesites
                            </p>
                          </div>
                          <div>
                            <i className="pi pi-mobile" style={{ fontSize: '2rem', color: 'var(--orange-500)', marginBottom: '1rem', display: 'block' }}></i>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>Multiplataforma</h4>
                            <p style={{ margin: 0, color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>
                              Funciona en Windows, macOS y Linux con la misma configuración
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>

            <TabPanel header={t('sidebar.importExport') || 'Importar / Exportar'} leftIcon="pi pi-exchange" style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: '8px', bottom: 0, width: 'calc(100% - 8px)' }}>
                  
                  {/* Header */}
                  <div className="general-settings-header-wrapper" style={{ flexShrink: 0 }}>
                    <div className="general-header-content">
                      <span className="general-header-icon protocol-dialog-header-icon">
                        <i className="pi pi-exchange"></i>
                      </span>
                      <div className="general-header-text">
                        <h3 className="general-header">{t('sidebar.importExport') || 'Importar / Exportar'}</h3>
                        <p className="general-description">Crea copias de seguridad de tus datos o restaura sesiones y contraseñas desde múltiples formatos.</p>
                      </div>
                    </div>
                  </div>

                  {showWizardInline ? (
                    <div className="import-wizard-inline-wrapper" style={{ padding: '10px 0' }}>
                      <Button
                        label="Volver a Importar / Exportar"
                        icon="pi pi-arrow-left"
                        className="p-button-text"
                        style={{ marginBottom: '1.5rem', paddingLeft: 0 }}
                        onClick={() => setShowWizardInline(false)}
                      />
                      <ImportWizardDialog
                        isEmbedded={true}
                        visible={true}
                        onHide={() => setShowWizardInline(false)}
                        onImportComplete={async (result) => {
                          if (handleImportComplete) {
                            return await handleImportComplete(result);
                          }
                        }}
                        onImportPasswordsComplete={(payload) => {
                          window.dispatchEvent(new CustomEvent('import-passwords-to-manager', { detail: payload }));
                        }}
                        showToast={(msg) => {
                          if (toast?.current?.show) {
                            toast.current.show(msg);
                          }
                        }}
                        targetFolderOptions={(() => {
                          const list = [];
                          const walk = (arr, prefix = '') => {
                            if (!Array.isArray(arr)) return;
                            for (const n of arr) {
                              if (n && n.droppable) {
                                list.push({ label: `${prefix}${n.label}`, value: n.key });
                                if (n.children && n.children.length) walk(n.children, `${prefix}${n.label} / `);
                              }
                            }
                          };
                          walk(nodes || []);
                          return list;
                        })()}
                        defaultTargetFolderKey={null}
                      />
                    </div>
                  ) : (
                    <div className="import-export-main-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                      {/* Grid de dos columnas para exportar e importar archivo */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        
                        {/* Columna Izquierda: Exportar */}
                        <Card title="Exportar Copia de Seguridad" style={{ background: 'var(--ui-dialog-bg, rgba(30,30,30,0.5))', border: '1px solid var(--ui-dialog-border, rgba(255,255,255,0.08))' }}>
                          <ExportDialog
                            isEmbedded={true}
                            visible={true}
                            showToast={(msg) => {
                              if (toast?.current?.show) {
                                toast.current.show(msg);
                              }
                            }}
                          />
                        </Card>

                        {/* Columna Derecha: Importar copia de seguridad */}
                        <Card title="Importar Copia de Seguridad" style={{ background: 'var(--ui-dialog-bg, rgba(30,30,30,0.5))', border: '1px solid var(--ui-dialog-border, rgba(255,255,255,0.08))' }}>
                          <ImportExportDialog
                            isEmbedded={true}
                            visible={true}
                            showToast={(msg) => {
                              if (toast?.current?.show) {
                                toast.current.show(msg);
                              }
                            }}
                            onImportComplete={(result) => {
                              console.log('[SettingsDialog] Importación local completada:', result);
                              if (setNodes) {
                                const treeData = localStorage.getItem('basicapp2_tree_data');
                                if (treeData) {
                                  try {
                                    const parsed = JSON.parse(treeData);
                                    setNodes(parsed);
                                  } catch (error) {
                                    console.error('Error al recargar nodos en ajustes:', error);
                                  }
                                }
                              }
                            }}
                          />
                        </Card>
                      </div>

                      {/* Fila Inferior: Asistente guiado */}
                      <Card style={{ marginTop: '10px', background: 'var(--ui-dialog-bg, rgba(30,30,30,0.5))', border: '1px solid var(--ui-dialog-border, rgba(255,255,255,0.08))' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <i className="pi pi-compass" style={{ fontSize: '2.5rem', color: 'var(--primary-color)' }}></i>
                            <div>
                              <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', fontWeight: '700' }}>Asistente de Importación Guiado</h4>
                              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-color-secondary)' }}>
                                Importa sesiones y contraseñas paso a paso desde <strong>mRemoteNG (.xml)</strong>, <strong>KeePass (.kdbx)</strong> o <strong>Navegadores Web</strong>.
                              </p>
                            </div>
                          </div>
                          <Button
                            label="Iniciar Asistente"
                            icon="pi pi-arrow-right"
                            iconPos="right"
                            className="p-button-outlined"
                            onClick={() => setShowWizardInline(true)}
                          />
                        </div>
                      </Card>
                    </div>
                  )}

                </div>
              </div>
            </TabPanel>

            <TabPanel header={t('info.title')} leftIcon="pi pi-info-circle" style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: '8px', bottom: 0, width: 'calc(100% - 8px)' }}>
                  {/* Header */}
                  <div className="general-settings-header-wrapper">
                    <div className="general-header-content">
                      <span className="general-header-icon protocol-dialog-header-icon">
                        <i className="pi pi-info-circle"></i>
                      </span>
                      <div className="general-header-text">
                        <h3 className="general-header">{t('info.title')}</h3>
                        <p className="general-description">{t('info.description')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid de 2 columnas para las secciones */}
                  <div className="general-settings-content">
                    {/* Sección: Versión de la App */}
                    <div className="general-settings-section">
                      <div className="general-section-header">
                        <div className="general-section-icon">
                          <i className="pi pi-tag"></i>
                        </div>
                        <h4 className="general-section-title">{t('info.appVersion')}</h4>
                      </div>

                      <div className="general-settings-options">
                        <div style={{ padding: '0.75rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.9375rem', margin: '0' }}>
                              {t('info.appName')}
                            </label>
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-color-secondary)', fontSize: '0.8125rem' }}>
                              {t('info.appDescription')}
                            </p>
                          </div>
                          <div style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '20px',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}>
                            {versionInfo.appVersion ? `v${versionInfo.appVersion}` : `v${getVersionInfo().appVersion}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sección: Información Técnica */}
                    <div className="general-settings-section">
                      <div className="general-section-header">
                        <div className="general-section-icon">
                          <i className="pi pi-cog"></i>
                        </div>
                        <h4 className="general-section-title">{t('info.technicalInfo')}</h4>
                      </div>

                      <div className="general-settings-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 1.25rem' }}>
                        <div>
                          <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                            {t('info.electron')}
                          </label>
                          <p style={{ margin: '0', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                            {versionInfo.electronVersion || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                            {t('info.node')}
                          </label>
                          <p style={{ margin: '0', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                            {versionInfo.nodeVersion || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                            {t('info.chrome')}
                          </label>
                          <p style={{ margin: '0', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                            {versionInfo.chromeVersion || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                            {t('info.build')}
                          </label>
                          <p style={{ margin: '0', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                            {versionInfo.buildDate || new Date().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sección: Características */}
                    <div className="general-settings-section">
                      <div className="general-section-header">
                        <div className="general-section-icon">
                          <i className="pi pi-star"></i>
                        </div>
                        <h4 className="general-section-title">Características Principales</h4>
                      </div>

                      <div className="general-settings-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
                          <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
                          <span style={{ color: 'var(--text-color-secondary)' }}>SSH múltiples</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
                          <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
                          <span style={{ color: 'var(--text-color-secondary)' }}>Explorador remoto</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
                          <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
                          <span style={{ color: 'var(--text-color-secondary)' }}>Drag & drop</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
                          <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
                          <span style={{ color: 'var(--text-color-secondary)' }}>Iconos Linux</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
                          <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
                          <span style={{ color: 'var(--text-color-secondary)' }}>Gestión inteligente</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
                          <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
                          <span style={{ color: 'var(--text-color-secondary)' }}>Sincronización</span>
                        </div>
                      </div>
                    </div>

                    {/* Sección: Acerca de */}
                    <div className="general-settings-section">
                      <div className="general-section-header">
                        <div className="general-section-icon">
                          <i className="pi pi-info"></i>
                        </div>
                        <h4 className="general-section-title">Acerca de NodeTerm</h4>
                      </div>

                      <div className="general-settings-options">
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)', lineHeight: '1.5' }}>
                          <p style={{ margin: '0' }}>
                            NodeTerm es una terminal SSH multiplataforma moderna desarrollada con Electron y React, diseñada para proporcionar una experiencia de conexión remota fluida y eficiente.
                          </p>
                          <p style={{ margin: '0.75rem 0 0 0' }}>
                            © 2025 NodeTerm - Desarrollado con ❤️
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
          </TabView>
        </div>
      </div>

      {/* Diálogo de Sincronización */}
      <SyncSettingsDialog
        visible={syncDialogVisible}
        onHide={() => setSyncDialogVisible(false)}
        exportTreeToJson={exportTreeToJson}
        importTreeFromJson={importTreeFromJson}
        sessionManager={sessionManager}
      />
    </>
  );

  if (isEmbedded) {
    return (
      <div className="settings-tab-container settings-embedded" style={{ height: '100%', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {content}
      </div>
    );
  }

  return (
    <Dialog
      ref={dialogRef}
      header={
        <div className="settings-dialog-header-custom" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="settings-dialog-header-icon">
            <i className="pi pi-cog"></i>
          </div>
          <span className="settings-dialog-header-title">{t('title')}</span>
        </div>
      }
      visible={visible}
      className="settings-dialog"
      style={{
        maxWidth: '98vw',
        maxHeight: '98vh',
        minWidth: '1000px',
        minHeight: '600px',
        height: `${size.height}px`,
        width: `${size.width}px`
      }}
      contentStyle={{
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)',
        display: 'flex',
        flexDirection: 'column',
        height: `${contentHeight}px`,
        maxHeight: `${contentHeight}px`,
        minHeight: `${contentHeight}px`,
        padding: '0',
        overflow: 'hidden',
        position: 'relative'
      }}
      headerStyle={{
        background: 'rgba(0, 0, 0, 0.3) !important',
        color: 'var(--ui-dialog-text)',
        borderBottom: '1px solid var(--ui-dialog-border)'
      }}
      onHide={onHide}
      modal
      maximizable
    >
      {content}
    </Dialog>
  );
};

const SettingsDialog = (props) => {
  return <SettingsContent {...props} isEmbedded={false} />;
};

export { SettingsContent };
export default SettingsDialog; 