import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import ThemeSelector from './ThemeSelector';
import StatusBarThemeSelector from './StatusBarThemeSelector';
import StatusBarIconThemeSelector from './StatusBarIconThemeSelector';
import TabThemeSelector from './TabThemeSelector';
import SyncSettingsDialog from './SyncSettingsDialog';
import UpdatePanel from './UpdatePanel';
import { themes } from '../themes';
import { getVersionInfo, getFullVersionInfo } from '../version-info';
import { iconThemes } from '../themes/icon-themes';
import { explorerFonts } from '../themes';
import { uiThemes } from '../themes/ui-themes';
import SecureStorage from '../services/SecureStorage';
import { statusBarThemes } from '../themes/status-bar-themes';
import FontPreview, { MonospaceFontPreview } from './FontPreview';
import { STORAGE_KEYS } from '../utils/constants';
import { homeTabIcons, setHomeTabIcon, getHomeTabIconGroups } from '../themes/home-tab-icons';
import { groupTabIcons, setGroupTabIcon } from '../themes/group-tab-icons';
import AIClientsTab from './AIClientsTab';
import SettingsSidebarNav from './SettingsSidebarNav';
import { useDialogResize } from '../hooks/useDialogResize';
import '../styles/components/settings-sidebar.css';

const STATUSBAR_HEIGHT_STORAGE_KEY = 'basicapp_statusbar_height';
const LOCAL_FONT_FAMILY_STORAGE_KEY = 'basicapp_local_terminal_font_family';
const LOCAL_FONT_SIZE_STORAGE_KEY = 'basicapp_local_terminal_font_size';
const LOCAL_POWERSHELL_THEME_STORAGE_KEY = 'localPowerShellTheme';
const LOCAL_LINUX_TERMINAL_THEME_STORAGE_KEY = 'localLinuxTerminalTheme';
  const LOCAL_POWERSHELL_STATUSBAR_THEME_STORAGE_KEY = 'localPowerShellStatusBarTheme';
  const LOCAL_LINUX_STATUSBAR_THEME_STORAGE_KEY = 'localLinuxStatusBarTheme';
  const LOCAL_SHOW_NETWORK_DISKS_STORAGE_KEY = 'localShowNetworkDisks';
  const INTERACTIVE_ICON_STORAGE_KEY = 'nodeterm_interactive_icon';

const SettingsDialog = ({
  visible,
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
  explorerFontSize,
  setExplorerFontSize,
  statusBarPollingInterval,
  setStatusBarPollingInterval,
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
  exportTreeToJson,
  importTreeFromJson,
  sessionManager,
  onMasterPasswordConfigured,
  onMasterPasswordChanged
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Hook para redimensionamiento del diálogo
  const { dialogRef, size, startResize } = useDialogResize(
    'settings-dialog-size',
    { width: 1200, height: 800 },
    { minWidth: 1000, minHeight: 600, maxWidth: window.innerWidth * 0.98, maxHeight: window.innerHeight * 0.98 }
  );
  
  // Estados para navegación con sidebar vertical
  const [activeMainTab, setActiveMainTab] = useState('general');
  const [activeSubTab, setActiveSubTab] = useState(null);
  
  // Estados para TabViews ANIDADOS (dentro de Seguridad, Apariencia, etc.)
  const [securityActiveIndex, setSecurityActiveIndex] = useState(0);
  const [appearanceActiveIndex, setAppearanceActiveIndex] = useState(0);
  
  // Función para convertir el tab seleccionado al índice del TabView PRINCIPAL
  // IMPORTANTE: Los TabPanels anidados (subitems) están dentro de sus padres,
  // así que necesitamos cambiar al padre y luego al subitem
  const getMainTabIndexFromTab = (mainTab) => {
    const mainTabMap = {
      'general': 0,
      'seguridad': 1,
      'apariencia': 2,
      'rdp': 3,
      'clientes-ia': 4,
      'actualizaciones': 5,
      'sincronizacion': 6,
      'informacion': 7
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
      // Dentro de Apariencia (índice 2)
      'interfaz': { parent: 'apariencia', index: 0 },
      'terminal': { parent: 'apariencia', index: 1 },
      'status-bar': { parent: 'apariencia', index: 2 },
      'explorador-sesiones': { parent: 'apariencia', index: 3 },
      'explorador-archivos': { parent: 'apariencia', index: 4 },
      'pestanas': { parent: 'apariencia', index: 5 }
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
        }
      }
    }
    
    // Log para debug
    console.log(`[SettingsDialog] Tab seleccionado: mainTab=${activeMainTab}, subTab=${activeSubTab}, mainIndex=${mainIndex}`);
  }, [activeMainTab, activeSubTab]);
  
  const [versionInfo, setVersionInfo] = useState({ appVersion: '' });
  const [syncDialogVisible, setSyncDialogVisible] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(() => {
    const saved = localStorage.getItem(STATUSBAR_HEIGHT_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 40;
  });

  // Configuración para bloquear el botón de inicio
  const [lockHomeButton, setLockHomeButton] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCK_HOME_BUTTON);
    return saved ? JSON.parse(saved) : false;
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
    return localStorage.getItem(STORAGE_KEYS.HOME_TAB_ICON) || 'wifiHeartHome';
  });

  const [selectedGroupIcon, setSelectedGroupIcon] = useState(() => {
    return localStorage.getItem('group_tab_icon') || 'groupGrid';
  });

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
  const [updateChannel, setUpdateChannel] = useState(() => {
    const stored = localStorage.getItem('update_channel');
    return stored || 'latest';
  });
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Función para cambiar el canal de actualizaciones
  const handleChannelChange = (channel) => {
    setUpdateChannel(channel);
    localStorage.setItem('update_channel', channel);
    
    if (toastRef && toastRef.current) {
      const channelLabel = channel === 'latest' ? 'Estable' : 'Beta';
      toastRef.current.show({
        severity: 'success',
        summary: 'Canal actualizado',
        detail: `Ahora recibirás actualizaciones del canal ${channelLabel}`,
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
        
        if (result?.updateAvailable) {
          setUpdateStatus('available');
          setUpdateInfo(result.updateInfo);
          
          if (toastRef && toastRef.current) {
            toastRef.current.show({
              severity: 'success',
              summary: 'Actualización Disponible',
              detail: `Nueva versión disponible: ${result.updateInfo?.version || 'desconocida'}`,
              life: 5000,
            });
          }
        } else {
          setUpdateStatus('idle');
          setUpdateInfo(null);
          
          if (toastRef && toastRef.current) {
            toastRef.current.show({
              severity: 'success',
              summary: 'Sistema Actualizado',
              detail: 'Ya tienes la última versión disponible',
              life: 3000,
            });
          }
        }
      } else {
        throw new Error('Sistema de actualización no disponible');
      }
    } catch (error) {
      console.error('❌ Error al verificar actualizaciones:', error);
      setUpdateStatus('error');
      
      if (toastRef && toastRef.current) {
        toastRef.current.show({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudo comprobar actualizaciones',
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
                summary: 'Descarga Completa',
                detail: 'La actualización está lista para instalar',
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
          detail: 'No se pudo descargar la actualización',
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
            detail: 'La aplicación se reiniciará para aplicar la actualización...',
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
          detail: 'No se pudo instalar la actualización',
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
        detail: enabled ? 'Búsqueda automática activada' : 'Búsqueda automática desactivada',
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
        detail: enabled ? 'Descarga automática activada' : 'Descarga automática desactivada',
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
              <span className="home-icon-badge-name">{currentIcon?.name || 'Seleccionar'}</span>
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
              <span className="group-icon-badge-name">{currentIcon?.name || 'Seleccionar'}</span>
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

  useEffect(() => {
    try {
      localStorage.setItem(GUACD_PREF_KEY, guacdPreferredMethod);
      if (window?.electron?.ipcRenderer) {
        window.electron.ipcRenderer.invoke('guacamole:set-preferred-method', guacdPreferredMethod).catch(() => {});
      }
    } catch {}
  }, [guacdPreferredMethod]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        if (window?.electron?.ipcRenderer) {
          const st = await window.electron.ipcRenderer.invoke('guacamole:get-status');
          if (st && st.guacd) setGuacdStatus(st.guacd);
        }
      } catch {}
    };
    fetchStatus();
    const t = setInterval(fetchStatus, 2000);
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
    // Verificar si hay clave maestra guardada
    setHasMasterKey(secureStorage.hasSavedMasterKey());
  }, [secureStorage]);

  // Persistir configuración del botón de inicio
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOCK_HOME_BUTTON, JSON.stringify(lockHomeButton));
  }, [lockHomeButton]);

  // Persistir configuración del icono interactivo
  useEffect(() => {
    localStorage.setItem(INTERACTIVE_ICON_STORAGE_KEY, JSON.stringify(interactiveIcon));
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

  // Persistir configuración de sidebar colapsada
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED, JSON.stringify(sidebarStartCollapsed));
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
  useEffect(() => {
    const ms = Math.max(60000, (rdpSessionActivityMinutes || 0) * 60000);
    localStorage.setItem('rdp_freeze_timeout_ms', String(ms));
  }, [rdpSessionActivityMinutes]);
  useEffect(() => {
    localStorage.setItem('rdp_resize_debounce_ms', String(Math.max(100, Math.min(2000, rdpResizeDebounceMs || 300))));
  }, [rdpResizeDebounceMs]);
  useEffect(() => {
    localStorage.setItem('rdp_resize_ack_timeout_ms', String(Math.max(600, Math.min(5000, rdpResizeAckTimeoutMs || 1500))));
  }, [rdpResizeAckTimeoutMs]);

  // Sincronizar watchdog de guacd con el proceso principal vía IPC
  useEffect(() => {
    try {
      if (window?.electron?.ipcRenderer) {
        window.electron.ipcRenderer.invoke('guacamole:get-guacd-timeout-ms').then((res) => {
          if (res && res.success && typeof res.value === 'number') {
            setRdpGuacdInactivityMs(res.value);
          }
        }).catch(() => {});
      }
    } catch {}
  }, []);

  const handleGuacdInactivityChange = async (value) => {
    const normalized = Math.max(0, Number(value || 0));
    setRdpGuacdInactivityMs(normalized);
    try {
      if (window?.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('guacamole:set-guacd-timeout-ms', normalized);
      }
    } catch {}
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

  useEffect(() => {
    localStorage.setItem(STATUSBAR_HEIGHT_STORAGE_KEY, statusBarHeight);
    document.documentElement.style.setProperty('--statusbar-height', `${statusBarHeight}px`);
  }, [statusBarHeight]);

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
  const handlePowerShellStatusBarThemeChange = (e) => {
    try {
      localStorage.setItem(LOCAL_POWERSHELL_STATUSBAR_THEME_STORAGE_KEY, e.value);
      // Disparar evento de storage local (para misma pestaña)
      window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_POWERSHELL_STATUSBAR_THEME_STORAGE_KEY, newValue: e.value }));
    } catch {}
  };
  const handleLinuxStatusBarThemeChange = (e) => {
    try {
      localStorage.setItem(LOCAL_LINUX_STATUSBAR_THEME_STORAGE_KEY, e.value);
      window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_LINUX_STATUSBAR_THEME_STORAGE_KEY, newValue: e.value }));
    } catch {}
  };
  const handleLocalShowNetworkDisksChange = (value) => {
    try {
      const normalized = !!value;
      localStorage.setItem(LOCAL_SHOW_NETWORK_DISKS_STORAGE_KEY, String(normalized));
      window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_SHOW_NETWORK_DISKS_STORAGE_KEY, newValue: String(normalized) }));
      // No state React necesario: los terminales leen desde localStorage al renderizar
    } catch {}
  };

  const handleSidebarFontSizeChange = (value) => {
    if (value && value >= 8 && value <= 32) {
      setSidebarFontSize(value);
    }
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

  // Calcular altura del contenido (altura total - header)
  const contentHeight = size.height - 60; // Aproximadamente 60px header

  return (
    <Dialog
      ref={dialogRef}
      header={
        <div className="settings-dialog-header-custom" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="settings-dialog-header-icon">
            <i className="pi pi-cog"></i>
          </div>
          <span className="settings-dialog-header-title">Configuración</span>
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
      <Toast ref={toastRef} />
      
      {/* Handles de redimensionamiento - posicionados relativos al contenido */}
      <div
        className="resize-handle resize-handle-right"
        onMouseDown={(e) => startResize(e, 'right')}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          cursor: 'ew-resize',
          zIndex: 1000,
          backgroundColor: 'transparent',
          pointerEvents: 'auto'
        }}
      />
      <div
        className="resize-handle resize-handle-bottom"
        onMouseDown={(e) => startResize(e, 'bottom')}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          cursor: 'ns-resize',
          zIndex: 1000,
          backgroundColor: 'transparent',
          pointerEvents: 'auto'
        }}
      />
      <div
        className="resize-handle resize-handle-bottom-right"
        onMouseDown={(e) => startResize(e, 'bottom-right')}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '12px',
          height: '12px',
          cursor: 'se-resize',
          zIndex: 1001,
          backgroundColor: 'transparent',
          pointerEvents: 'auto'
        }}
      />
      
      {/* Layout con Sidebar Vertical */}
      <div className="settings-dialog-vertical">
        {/* Sidebar Navigation */}
        <SettingsSidebarNav
          activeMainTab={activeMainTab}
          activeSubTab={activeSubTab}
          onMainTabChange={setActiveMainTab}
          onSubTabChange={setActiveSubTab}
        />
        
        {/* Contenedor de Contenido */}
        <div className="settings-content-wrapper">
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
          `}</style>
          <TabView
            activeIndex={activeIndex}
            onTabChange={(e) => setActiveIndex(e.index)}
            className="settings-dialog-tabview"
          >
        <TabPanel header="General" leftIcon="pi pi-sliders-h">
          <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
            <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {/* Header */}
            <div className="general-settings-header-wrapper" style={{ flexShrink: 0 }}>
              <div className="general-header-content">
                <span className="general-header-icon protocol-dialog-header-icon">
                  <i className="pi pi-sliders-h"></i>
                </span>
                <div className="general-header-text">
                  <h3 className="general-header">Configuración General</h3>
                  <p className="general-description">Personaliza el comportamiento y la apariencia básica de NodeTerm</p>
                </div>
              </div>
            </div>
            
            {/* Grid de 2 columnas para las secciones */}
            <div className="general-settings-content">
              {/* Sección de Comportamiento */}
              <div className="general-settings-section">
                <div className="general-section-header">
                  <div className="general-section-icon">
                    <i className="pi pi-sliders-h"></i>
                  </div>
                  <h4 className="general-section-title">Comportamiento de la Aplicación</h4>
                </div>
                
                <div className="general-settings-options">
                  <div className="general-setting-card" onClick={() => setLockHomeButton(!lockHomeButton)}>
                    <div className="general-setting-content">
                      <div className="general-setting-icon lock">
                        <i className="pi pi-lock"></i>
                      </div>
                      <div className="general-setting-info">
                        <label htmlFor="lock-home-button" className="general-setting-label">
                          Bloquear Botón de Inicio
                        </label>
                        <p className="general-setting-description">
                          Previene que el botón de inicio se pueda cerrar o mover accidentalmente
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
                          Icono NodeTerm Interactivo
                        </label>
                        <p className="general-setting-description">
                          Hace que el cursor "_" en el título parpadee como un terminal real
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

                  <div className="general-setting-card" onClick={() => setSidebarStartCollapsed(!sidebarStartCollapsed)}>
                    <div className="general-setting-content">
                      <div className="general-setting-icon collapse">
                        <i className="pi pi-angle-left"></i>
                      </div>
                      <div className="general-setting-info">
                        <label htmlFor="sidebar-start-collapsed" className="general-setting-label">
                          Iniciar con Sidebar Colapsada
                        </label>
                        <p className="general-setting-description">
                          La barra lateral se iniciará colapsada por defecto al abrir la aplicación
                        </p>
                      </div>
                      <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          id="sidebar-start-collapsed"
                          checked={sidebarStartCollapsed}
                          onChange={(e) => setSidebarStartCollapsed(e.checked)}
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
                  <h4 className="general-section-title">Personalización Visual</h4>
                </div>
                
                {/* Selector de Icono de Pestaña de Inicio */}
                <div className="general-icon-selector-section">
                  <div className="general-selector-row-expandable">
                    <div className="general-selector-info-group">
                      <div className="general-selector-icon-compact">
                        <i className="pi pi-home"></i>
                      </div>
                      <div className="general-selector-text-group">
                        <span className="general-selector-title-compact">Icono de la Pestaña de Inicio</span>
                        <span className="general-selector-description-compact">Personaliza el icono que aparece en la pestaña de inicio</span>
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
                        <span className="general-selector-title-compact">Icono de Grupos de Pestañas</span>
                        <span className="general-selector-description-compact">Elige el icono para la pestaña de grupos</span>
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
        </TabPanel>
        <TabPanel header="Seguridad" leftIcon="pi pi-shield">
          <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: '1rem 1.5rem 1.5rem 1.5rem' }}>
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
                                  strokeWidth="0.6"/>
                            {/* Llave maestra estilizada */}
                            <g transform="translate(12, 11)">
                              {/* Anillo de la llave */}
                              <circle cx="0" cy="-1" r="2.2" 
                                      fill="none" 
                                      stroke="url(#keyGradient)" 
                                      strokeWidth="1.4" 
                                      opacity="0.98"/>
                              {/* Cuerpo de la llave */}
                              <rect x="-1.8" y="0.5" width="3.6" height="5.5" rx="1.2" 
                                    fill="url(#keyGradient)" 
                                    opacity="0.98"
                                    stroke="rgba(102, 126, 234, 0.25)" 
                                    strokeWidth="0.4"/>
                              {/* Dientes de la llave (patrón de seguridad) */}
                              <rect x="-1" y="3.5" width="2" height="2.5" rx="0.5" 
                                    fill="url(#keyGradient)" 
                                    opacity="0.98"/>
                              <rect x="-0.4" y="5" width="0.8" height="1.2" rx="0.2" 
                                    fill="rgba(102, 126, 234, 0.5)"/>
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
                                      strokeWidth="0.5"/>
                                {/* Check de verificación */}
                                <path d="M9 12l2 2 4-4" 
                                      stroke="#ffffff" 
                                      strokeWidth="2.5" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round" 
                                      fill="none"/>
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
                                      strokeWidth="0.5"/>
                                {/* Signo de exclamación */}
                                <circle cx="12" cy="9" r="1.2" fill="#ffffff"/>
                                <rect x="11" y="11.5" width="2" height="4" rx="1" fill="#ffffff"/>
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
                                  onChange={(e) => {
                                    if (e.checked) {
                                      localStorage.setItem('nodeterm_remember_password', 'true');
                                      showToast('success', 'Configurado', 'La contraseña se recordará en este dispositivo');
                                    } else {
                                      localStorage.removeItem('nodeterm_remember_password');
                                      showToast('info', 'Configurado', 'Se pedirá la contraseña al iniciar la app');
                                    }
                                  }}
                                />
                                <label htmlFor="remember-password-settings" className="security-checkbox-label">
                                  Recordar contraseña en este dispositivo
                                </label>
                              </div>
                              <small className="security-checkbox-hint">
                                Si está activado, no se pedirá la contraseña al iniciar la app
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
                                      strokeWidth="0.6"/>
                                {/* Llave maestra estilizada */}
                                <g transform="translate(12, 11)">
                                  {/* Anillo de la llave */}
                                  <circle cx="0" cy="-1" r="2.2" 
                                          fill="none" 
                                          stroke="url(#formKeyGradientWhite2)" 
                                          strokeWidth="1.4" 
                                          opacity="0.98"/>
                                  {/* Cuerpo de la llave */}
                                  <rect x="-1.8" y="0.5" width="3.6" height="5.5" rx="1.2" 
                                        fill="url(#formKeyGradientWhite2)" 
                                        opacity="0.98"
                                        stroke="rgba(102, 126, 234, 0.25)" 
                                        strokeWidth="0.4"/>
                                  {/* Dientes de la llave (patrón de seguridad) */}
                                  <rect x="-1" y="3.5" width="2" height="2.5" rx="0.5" 
                                        fill="url(#formKeyGradientWhite2)" 
                                        opacity="0.98"/>
                                  <rect x="-0.4" y="5" width="0.8" height="1.2" rx="0.2" 
                                        fill="rgba(102, 126, 234, 0.5)"/>
                                </g>
                              </svg>
                            </span>
                            Configurar Clave Maestra
                          </h4>
                          
                          <div className="security-field">
                            <label htmlFor="master-password" className="security-field-label">
                              <i className="pi pi-key"></i>
                              Nueva Clave Maestra
                            </label>
                            <div className="security-field-input">
                              <Password
                                id="master-password"
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                feedback={false}
                                toggleMask
                                disabled={isLoading}
                              />
                            </div>
                          </div>

                          <div className="security-field">
                            <label htmlFor="confirm-password" className="security-field-label">
                              <i className="pi pi-shield"></i>
                              Confirmar Clave Maestra
                            </label>
                            <div className="security-field-input">
                              <Password
                                id="confirm-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repetir la clave"
                                feedback={false}
                                toggleMask
                                disabled={isLoading}
                              />
                            </div>
                          </div>

                          <Button
                            label={isLoading ? 'Guardando...' : 'Guardar Clave Maestra'}
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
                                      strokeWidth="0.6"/>
                                {/* Llave maestra estilizada */}
                                <g transform="translate(12, 11)">
                                  {/* Anillo de la llave */}
                                  <circle cx="0" cy="-1" r="2.2" 
                                          fill="none" 
                                          stroke="url(#formKeyGradientWhite)" 
                                          strokeWidth="1.4" 
                                          opacity="0.98"/>
                                  {/* Cuerpo de la llave */}
                                  <rect x="-1.8" y="0.5" width="3.6" height="5.5" rx="1.2" 
                                        fill="url(#formKeyGradientWhite)" 
                                        opacity="0.98"
                                        stroke="rgba(102, 126, 234, 0.25)" 
                                        strokeWidth="0.4"/>
                                  {/* Dientes de la llave (patrón de seguridad) */}
                                  <rect x="-1" y="3.5" width="2" height="2.5" rx="0.5" 
                                        fill="url(#formKeyGradientWhite)" 
                                        opacity="0.98"/>
                                  <rect x="-0.4" y="5" width="0.8" height="1.2" rx="0.2" 
                                        fill="rgba(102, 126, 234, 0.5)"/>
                                </g>
                              </svg>
                            </span>
                            Cambiar Clave Maestra
                          </h4>
                          
                          <div className="security-field">
                            <label htmlFor="current-password" className="security-field-label">
                              <i className="pi pi-unlock"></i>
                              Clave Actual
                            </label>
                            <div className="security-field-input">
                              <Password
                                id="current-password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Clave maestra actual"
                                feedback={false}
                                toggleMask
                                disabled={isLoading}
                              />
                            </div>
                          </div>

                          <div className="security-field">
                            <label htmlFor="new-password" className="security-field-label">
                              <i className="pi pi-key"></i>
                              Nueva Clave Maestra
                            </label>
                            <div className="security-field-input">
                              <Password
                                id="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nueva clave (mínimo 6 caracteres)"
                                feedback={false}
                                toggleMask
                                disabled={isLoading}
                              />
                            </div>
                          </div>

                          <div className="security-field">
                            <label htmlFor="confirm-new-password" className="security-field-label">
                              <i className="pi pi-shield"></i>
                              Confirmar Nueva Clave
                            </label>
                            <div className="security-field-input">
                              <Password
                                id="confirm-new-password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="Repetir la nueva clave"
                                feedback={false}
                                toggleMask
                                disabled={isLoading}
                              />
                            </div>
                          </div>

                          <div className="security-actions">
                            <Button
                              label={isLoading ? 'Cambiando...' : 'Cambiar Clave'}
                              icon={isLoading ? 'pi pi-spin pi-spinner' : 'pi pi-sync'}
                              onClick={handleChangeMasterPassword}
                              disabled={!validatePasswordChange() || isLoading}
                              className="security-button security-button-primary"
                            />
                            
                            <Button
                              label="Eliminar"
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
                                  strokeWidth="0.6"/>
                            {/* Icono de video/cámara dentro del escudo */}
                            <g transform="translate(12, 12)">
                              <circle cx="0" cy="0" r="3.5" 
                                      fill="none" 
                                      stroke="url(#shieldGradient)" 
                                      strokeWidth="1.2" 
                                      opacity="0.98"/>
                              <circle cx="0" cy="0" r="1.8" 
                                      fill="url(#shieldGradient)" 
                                      opacity="0.98"/>
                              <path d="M-2.5,-1.5 L2.5,-1.5 L2.5,1.5 L-2.5,1.5 Z" 
                                    fill="url(#auditSettingsGradient)" 
                                    opacity="0.6"/>
                            </g>
                          </svg>
                        </span>
                        <div className="security-header-text">
                          <h3 className="security-header">Configuración de Auditoría</h3>
                          <p className="security-description">Configura el grabado automático de sesiones SSH y la gestión de archivos de auditoría</p>
                        </div>
                      </div>
                    </div>

                    {/* Grid de 2 columnas para las secciones */}
                    <div className="security-layout-grid">
                    {/* Sección de Grabación Automática */}
                    <div className="general-settings-section">
                      <div className="general-section-header">
                        <div className="general-section-icon">
                          <i className="pi pi-video"></i>
                        </div>
                        <h4 className="general-section-title">Grabación Automática de Sesiones SSH</h4>
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
                                Activar grabación automática
                              </label>
                              <p className="general-setting-description">
                                Graba automáticamente todas las sesiones SSH iniciadas
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
                                    <span className="general-selector-title-compact">Calidad de grabación</span>
                                    <span className="general-selector-description-compact">Nivel de detalle capturado en las grabaciones</span>
                                  </div>
                                </div>
                                <div className="general-selector-action-wrapper">
                                  <Dropdown
                                    id="recordingQuality"
                                    value={recordingQuality}
                                    options={[
                                      { label: 'Alta (todos los eventos)', value: 'high' },
                                      { label: 'Media (eventos importantes)', value: 'medium' },
                                      { label: 'Baja (solo comandos)', value: 'low' }
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
                                    Cifrar grabaciones con clave maestra
                                  </label>
                                  <p className="general-setting-description">
                                    Las grabaciones se cifrarán automáticamente si tienes una clave maestra configurada
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
                                      <span className="general-selector-title-compact">Ubicación de grabaciones</span>
                                      <span className="general-selector-description-compact">
                                        {isDefaultPath 
                                          ? 'Ubicación por defecto: AppData/NodeTerm/recordings'
                                          : `Personalizada: ${recordingPath || 'Cargando...'}`
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
                                    placeholder={loadingPath ? 'Cargando...' : 'Ruta de grabaciones'}
                                  />
                                  <Button
                                    icon="pi pi-folder-open"
                                    label="Cambiar"
                                    onClick={async () => {
                                      try {
                                        if (!window?.electron?.dialog?.showOpenDialog) {
                                          toast?.show({
                                            severity: 'warn',
                                            summary: 'No disponible',
                                            detail: 'El selector de directorios requiere la app de escritorio'
                                          });
                                          return;
                                        }
                                        
                                        const result = await window.electron.dialog.showOpenDialog({
                                          properties: ['openDirectory'],
                                          title: 'Seleccionar carpeta para guardar grabaciones'
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
                                              summary: 'Ubicación actualizada',
                                              detail: `Las grabaciones se guardarán en: ${setResult.currentPath}`
                                            });
                                          } else {
                                            toast?.show({
                                              severity: 'error',
                                              summary: 'Error',
                                              detail: setResult?.error || 'No se pudo cambiar la ubicación'
                                            });
                                          }
                                          setLoadingPath(false);
                                        }
                                      } catch (error) {
                                        console.error('Error seleccionando carpeta:', error);
                                        toast?.show({
                                          severity: 'error',
                                          summary: 'Error',
                                          detail: 'No se pudo abrir el selector de carpeta'
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
                                      label="Restaurar"
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
                                              summary: 'Ubicación restaurada',
                                              detail: 'Se usará la ubicación por defecto'
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

                    {/* Sección de Limpieza Automática */}
                    <div className="general-settings-section">
                      <div className="general-section-header">
                        <div className="general-section-icon">
                          <i className="pi pi-trash"></i>
                        </div>
                        <h4 className="general-section-title">Limpieza Automática de Archivos</h4>
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
                                Activar limpieza automática
                              </label>
                              <p className="general-setting-description">
                                Elimina automáticamente archivos de auditoría antiguos según las reglas configuradas
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
                                    <span className="general-selector-title-compact">Días de retención: {retentionDays}</span>
                                    <span className="general-selector-description-compact">Archivos más antiguos serán eliminados automáticamente</span>
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
                                  <span>1 día</span>
                                  <span>365 días</span>
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
                                    <span className="general-selector-title-compact">Tamaño máximo: {maxStorageSize} GB</span>
                                    <span className="general-selector-description-compact">Límite total de espacio para archivos de auditoría</span>
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
                                  <span>0.1 GB</span>
                                  <span>100 GB</span>
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
                                    Ejecutar limpieza al iniciar la aplicación
                                  </label>
                                  <p className="general-setting-description">
                                    Limpia archivos antiguos cada vez que se inicia NodeTerm
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
                                    <span className="general-selector-title-compact">Frecuencia de limpieza automática</span>
                                    <span className="general-selector-description-compact">Con qué frecuencia se ejecutará la limpieza automática</span>
                                  </div>
                                </div>
                                <div className="general-selector-action-wrapper">
                                  <Dropdown
                                    id="cleanupFrequency"
                                    value={cleanupFrequency}
                                    options={[
                                      { label: 'Diaria', value: 'daily' },
                                      { label: 'Semanal', value: 'weekly' },
                                      { label: 'Mensual', value: 'monthly' },
                                      { label: 'Manual únicamente', value: 'manual' }
                                    ]}
                                    onChange={(e) => setCleanupFrequency(e.value)}
                                    style={{ minWidth: '180px' }}
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Estadísticas actuales */}
                        <div style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <i className="pi pi-chart-bar" style={{ color: 'var(--ui-button-primary)', fontSize: '0.875rem' }}></i>
                            <span style={{ color: 'var(--text-color)', fontWeight: '600', fontSize: '0.875rem' }}>
                              Estadísticas Actuales
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>Archivos:</span>
                              <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem' }}>
                                {auditStats?.fileCount || 0}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>Tamaño total:</span>
                              <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem' }}>
                                {formatBytes(auditStats?.totalSize || 0)}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>Más antiguo:</span>
                              <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                {auditStats?.oldestFile ? new Date(auditStats.oldestFile).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>Última limpieza:</span>
                              <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                {auditStats?.lastCleanup ? new Date(auditStats.lastCleanup).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Nunca'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <Button
                            label="Ejecutar Limpieza Ahora"
                            icon="pi pi-trash"
                            onClick={handleManualCleanup}
                            disabled={!autoCleanupEnabled}
                            className="p-button-warning"
                            style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}
                          />
                          <Button
                            label="Ver Archivos"
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

        <TabPanel header="Apariencia" leftIcon="pi pi-palette">
          <div className="apariencia-tab-container">
            {/* Renderizado condicional basado en activeSubTab */}
            {activeSubTab === 'interfaz' && (
              <ThemeSelector showPreview={true} />
            )}
            {activeSubTab === 'terminal' && (
                <div style={{ 
                  padding: '1rem 0', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'flex-start', 
                  alignItems: 'center', 
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                    <i className="pi pi-desktop" style={{ marginRight: '0.5rem' }}></i>
                    Configuración del Terminal SSH
                  </h3>

                  {/* Fuente */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                      Fuente
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label htmlFor="font-family" style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}>
                          Familia de fuente
                        </label>
                        <Dropdown
                          id="font-family"
                          value={fontFamily}
                          options={availableFonts}
                          onChange={handleFontFamilyChange}
                          placeholder="Selecciona una fuente"
                          style={{ width: '100%' }}
                          itemTemplate={option => (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              padding: '4px 0'
                            }}>
                              <span style={{ 
                                fontFamily: option.value,
                                fontSize: '14px',
                                fontWeight: '400'
                              }}>
                                {option.label}
                              </span>
                              <span style={{ 
                                fontSize: '11px',
                                color: 'var(--text-color-secondary)',
                                opacity: 0.7,
                                fontFamily: option.value
                              }}>
                                123
                              </span>
                            </div>
                          )}
                        />
                      </div>

                      <div>
                        <label htmlFor="font-size" style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}>
                          Tamaño (px)
                        </label>
                        <InputNumber
                          id="font-size"
                          value={fontSize}
                          onValueChange={(e) => handleFontSizeChange(e.value)}
                          min={8}
                          max={32}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>

                  <Divider />

                  {/* Tema del Terminal */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                      Tema del Terminal
                    </h4>

                    <div style={{ marginBottom: '1rem' }}>
                      <label htmlFor="terminal-theme" style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        Esquema de colores
                      </label>
                      <Dropdown
                        id="terminal-theme"
                        value={terminalTheme?.name || 'Default Dark'}
                        options={terminalThemeOptions}
                        onChange={handleTerminalThemeChange}
                        placeholder="Selecciona un tema"
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '10px',
                      fontStyle: 'italic'
                    }}>
                      Vista previa del terminal:
                    </div>

                    <TerminalPreview />
                  </div>

                  <Divider />

                  <h3 style={{ margin: '2rem 0 1rem 0', color: 'var(--text-color)' }}>
                    <i className="pi pi-desktop" style={{ marginRight: '0.5rem', color: '#4fc3f7' }}></i>
                    Configuración del Terminal Local
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem', width: '100%' }}>
                    <div>
                      <label htmlFor="local-font-family" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Familia de fuente (local)
                      </label>
                      <Dropdown
                        id="local-font-family"
                        value={localFontFamily}
                        options={availableFonts}
                        onChange={e => setLocalFontFamily(e.value)}
                        placeholder="Selecciona una fuente"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="local-font-size" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        Tamaño (px)
                      </label>
                      <InputNumber
                        id="local-font-size"
                        value={localFontSize}
                        onValueChange={e => setLocalFontSize(e.value)}
                        min={8}
                        max={32}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 4, display: 'block' }}>Tema para PowerShell</label>
                      <Dropdown
                        value={localPowerShellTheme}
                        options={terminalThemeOptions}
                        onChange={handlePowerShellThemeChange}
                        placeholder="Tema para PowerShell"
                        style={{ width: '100%', marginBottom: 12 }}
                      />
                      <label style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 4, display: 'block' }}>Tema para terminales Linux (WSL, Ubuntu, etc.)</label>
                      <Dropdown
                        value={localLinuxTerminalTheme}
                        options={terminalThemeOptions}
                        onChange={handleLinuxTerminalThemeChange}
                        placeholder="Tema para terminales Linux"
                        style={{ width: '100%' }}
                      />
                      <div style={{ marginTop: 16 }}>
                        <label style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 4, display: 'block' }}>Status Bar de PowerShell (tema)</label>
                        <Dropdown
                          value={(typeof window !== 'undefined' && window.localStorage) ? (localStorage.getItem(LOCAL_POWERSHELL_STATUSBAR_THEME_STORAGE_KEY) || (localStorage.getItem('basicapp_statusbar_theme') || 'Default Dark')) : 'Default Dark'}
                          options={Object.keys(statusBarThemes).map(name => ({ label: name, value: name }))}
                          onChange={handlePowerShellStatusBarThemeChange}
                          placeholder="Tema de status bar"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <label style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 4, display: 'block' }}>Status Bar para terminales Linux (WSL/Ubuntu) (tema)</label>
                        <Dropdown
                          value={(typeof window !== 'undefined' && window.localStorage) ? (localStorage.getItem(LOCAL_LINUX_STATUSBAR_THEME_STORAGE_KEY) || (localStorage.getItem('basicapp_statusbar_theme') || 'Default Dark')) : 'Default Dark'}
                          options={Object.keys(statusBarThemes).map(name => ({ label: name, value: name }))}
                          onChange={handleLinuxStatusBarThemeChange}
                          placeholder="Tema de status bar (Linux)"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <label style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 4, display: 'block' }}>Mostrar unidades de red en Status Bar</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Dropdown
                            value={(typeof window !== 'undefined' && window.localStorage) ? ((localStorage.getItem(LOCAL_SHOW_NETWORK_DISKS_STORAGE_KEY) || 'true') === 'true' ? 'show' : 'hide') : 'show'}
                            options={[{ label: 'Mostrar', value: 'show' }, { label: 'Ocultar', value: 'hide' }]}
                            onChange={(e) => handleLocalShowNetworkDisksChange(e.value === 'show')}
                            style={{ width: 180 }}
                          />
                          <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>CIFS/SMB/NFS, UNC y mapeos (Z:, Y:, ...)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            )}
            {activeSubTab === 'status-bar' && (
                <div style={{
                  padding: '1rem 0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <StatusBarThemeSelector
                    currentTheme={statusBarTheme}
                    onThemeChange={setStatusBarTheme}
                  />

                  <Divider style={{ margin: '2rem 0' }} />

                  <StatusBarIconThemeSelector
                    currentTheme={statusBarIconTheme}
                    onThemeChange={setStatusBarIconTheme}
                  />
                  <div style={{ marginTop: 24, width: 320 }}>
                    <label htmlFor="statusbar-height-slider" style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}>
                      Altura de la Status Bar (px)
                    </label>
                    <Slider
                      id="statusbar-height-slider"
                      value={statusBarHeight}
                      onChange={e => setStatusBarHeight(e.value)}
                      min={20}
                      max={64}
                      step={1}
                      style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 4 }}>
                      {statusBarHeight} px (mínimo 20, máximo 64)
                    </div>
                  </div>
                  <div style={{ marginTop: 24, width: 320 }}>
                    <label htmlFor="statusbar-polling-interval" style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}>
                      Intervalo de actualización de la Status Bar (segundos)
                    </label>
                    <InputNumber
                      id="statusbar-polling-interval"
                      value={statusBarPollingInterval}
                      onValueChange={e => setStatusBarPollingInterval(Math.max(1, Math.min(20, e.value || 1)))}
                      min={1}
                      max={20}
                      showButtons
                      buttonLayout="horizontal"
                      style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 4 }}>
                      Puedes elegir entre 1 y 20 segundos. Aplica a todas las conexiones.
                    </div>
                  </div>
                </div>
            )}
            {activeSubTab === 'explorador-sesiones' && (
                <div style={{
                  padding: '1rem 0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                    <i className="pi pi-sitemap" style={{ marginRight: '0.5rem' }}></i>
                    Apariencia del Explorador de Sesiones
                  </h3>
                  <div style={{ marginBottom: '2rem', width: '100%', maxWidth: 400 }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                      Tema de Iconos
                    </h4>
                    <Dropdown
                      id="icon-theme-sidebar"
                      value={iconThemeSidebar}
                      options={Object.entries(iconThemes).map(([key, theme]) => ({ label: theme.name, value: key }))}
                      onChange={e => setIconThemeSidebar(e.value)}
                      placeholder="Selecciona un tema de iconos"
                      style={{ width: '100%' }}
                      itemTemplate={option => (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {iconThemes[option.value]?.icons.folder}
                          {iconThemes[option.value]?.name}
                        </span>
                      )}
                    />
                    <div style={{ marginTop: 12, display: 'flex', gap: 16, justifyContent: 'center' }}>
                      {iconThemes[iconThemeSidebar] && Object.values(iconThemes[iconThemeSidebar].icons).map((icon, idx) => (
                        <span key={idx}>
                          {React.cloneElement(icon, {
                            width: iconSize,
                            height: iconSize,
                            style: { 
                              ...icon.props.style,
                              width: `${iconSize}px`,
                              height: `${iconSize}px`
                            }
                          })}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '2rem', width: '100%', maxWidth: 500 }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                      Tamaño de Iconos
                    </h4>
                    
                    {/* Tamaño de iconos de carpetas */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <label htmlFor="folder-icon-size" style={{
                          display: 'block',
                          fontWeight: 'bold',
                          fontSize: '0.9rem',
                          minWidth: '120px'
                        }}>
                          Carpetas (px)
                        </label>
                        <InputNumber
                          id="folder-icon-size"
                          value={folderIconSize || 20}
                          onValueChange={(e) => setFolderIconSize && setFolderIconSize(e.value)}
                          min={12}
                          max={32}
                          style={{ width: '120px' }}
                        />
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          marginLeft: '1rem'
                        }}>
                          {iconThemes[iconThemeSidebar]?.icons.folder && 
                            React.cloneElement(iconThemes[iconThemeSidebar].icons.folder, {
                              width: folderIconSize,
                              height: folderIconSize,
                              style: { 
                                ...iconThemes[iconThemeSidebar].icons.folder.props.style,
                                width: `${folderIconSize}px`,
                                height: `${folderIconSize}px`
                              }
                            })
                          }
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
                            Vista previa
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tamaño de iconos de conexiones */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <label htmlFor="connection-icon-size" style={{
                          display: 'block',
                          fontWeight: 'bold',
                          fontSize: '0.9rem',
                          minWidth: '120px'
                        }}>
                          Conexiones (px)
                        </label>
                        <InputNumber
                          id="connection-icon-size"
                          value={connectionIconSize || 20}
                          onValueChange={(e) => setConnectionIconSize && setConnectionIconSize(e.value)}
                          min={12}
                          max={32}
                          style={{ width: '120px' }}
                        />
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          marginLeft: '1rem'
                        }}>
                          {iconThemes[iconThemeSidebar]?.icons.ssh && 
                            React.cloneElement(iconThemes[iconThemeSidebar].icons.ssh, {
                              width: connectionIconSize,
                              height: connectionIconSize,
                              style: { 
                                ...iconThemes[iconThemeSidebar].icons.ssh.props.style,
                                width: `${connectionIconSize}px`,
                                height: `${connectionIconSize}px`
                              }
                            })
                          }
                          {iconThemes[iconThemeSidebar]?.icons.rdp && 
                            React.cloneElement(iconThemes[iconThemeSidebar].icons.rdp, {
                              width: connectionIconSize,
                              height: connectionIconSize,
                              style: { 
                                ...iconThemes[iconThemeSidebar].icons.rdp.props.style,
                                width: `${connectionIconSize}px`,
                                height: `${connectionIconSize}px`
                              }
                            })
                          }
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
                            Vista previa
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: '2rem', width: '100%', maxWidth: 400 }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                      Fuente del Explorador de Sesiones
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label htmlFor="sidebar-font" style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}>
                          Familia de fuente
                        </label>
                        <Dropdown
                          id="sidebar-font"
                          value={sidebarFont}
                          options={explorerFonts.map(f => ({ label: f, value: f }))}
                          onChange={e => setSidebarFont(e.value)}
                          placeholder="Selecciona una fuente"
                          style={{ width: '100%' }}
                          itemTemplate={option => (
                            <span style={{ fontFamily: option.value }}>{option.label}</span>
                          )}
                        />
                      </div>

                      <div>
                        <label htmlFor="sidebar-font-size" style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}>
                          Tamaño (px)
                        </label>
                        <InputNumber
                          id="sidebar-font-size"
                          value={sidebarFontSize}
                          onValueChange={(e) => handleSidebarFontSizeChange(e.value)}
                          min={8}
                          max={32}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 12, fontFamily: sidebarFont, fontSize: `${sidebarFontSize}px`, textAlign: 'center' }}>
                      Ejemplo de fuente: <span style={{ fontWeight: 'bold' }}>{sidebarFont}</span>
                    </div>
                  </div>
                </div>
            )}
            {activeSubTab === 'explorador-archivos' && (
                <div style={{
                  padding: '1rem 0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                    <i className="pi pi-folder-open" style={{ marginRight: '0.5rem' }}></i>
                    Apariencia del Explorador
                  </h3>
                  <div style={{ marginBottom: '2rem', width: '100%', maxWidth: 400 }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                      Tema de Iconos
                    </h4>
                    <Dropdown
                      id="icon-theme"
                      value={iconTheme}
                      options={Object.entries(iconThemes).map(([key, theme]) => ({ label: theme.name, value: key }))}
                      onChange={e => setIconTheme(e.value)}
                      placeholder="Selecciona un tema de iconos"
                      style={{ width: '100%' }}
                      itemTemplate={option => (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {iconThemes[option.value]?.icons.folder}
                          {iconThemes[option.value]?.name}
                        </span>
                      )}
                    />
                    <div style={{ marginTop: 12, display: 'flex', gap: 16, justifyContent: 'center' }}>
                      {iconThemes[iconTheme] && Object.values(iconThemes[iconTheme].icons).map((icon, idx) => (
                        <span key={idx}>{icon}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: '2rem', width: '100%', maxWidth: 400 }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                      Fuente del Explorador
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label htmlFor="explorer-font" style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}>
                          Familia de fuente
                        </label>
                        <Dropdown
                          id="explorer-font"
                          value={explorerFont}
                          options={explorerFonts.map(f => ({ label: f, value: f }))}
                          onChange={e => setExplorerFont(e.value)}
                          placeholder="Selecciona una fuente"
                          style={{ width: '100%' }}
                          itemTemplate={option => (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              padding: '4px 0'
                            }}>
                              <span style={{ 
                                fontFamily: option.value,
                                fontSize: '14px',
                                fontWeight: '500'
                              }}>
                                {option.label}
                              </span>
                              <span style={{ 
                                fontSize: '11px',
                                color: 'var(--text-color-secondary)',
                                opacity: 0.7,
                                fontFamily: 'monospace'
                              }}>
                                Aa
                              </span>
                            </div>
                          )}
                        />
                      </div>
                      <div>
                        <label htmlFor="explorer-font-size" style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}>
                          Tamaño (px)
                        </label>
                        <InputNumber
                          id="explorer-font-size"
                          value={explorerFontSize}
                          onValueChange={e => setExplorerFontSize(e.value)}
                          min={8}
                          max={32}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    <FontPreview 
                      fontFamily={explorerFont}
                      fontSize={explorerFontSize}
                      sampleText="Explorador de Sesiones"
                      style={{ marginTop: 16 }}
                    />
                  </div>
                  <div style={{ marginBottom: '2rem', width: '100%', maxWidth: 400 }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                      Tema de Colores
                    </h4>
                    <Dropdown
                      id="explorer-color-theme"
                      value={explorerColorTheme}
                      options={Object.entries(uiThemes).map(([key, theme]) => ({ label: theme.name, value: key }))}
                      onChange={e => setExplorerColorTheme(e.value)}
                      placeholder="Selecciona un tema de colores"
                      style={{ width: '100%' }}
                      itemTemplate={option => (
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '4px 0'
                        }}>
                          <div style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: uiThemes[option.value]?.colors?.buttonPrimary || '#007ad9',
                            border: '1px solid #ddd'
                          }}></div>
                          {option.label}
                        </span>
                      )}
                    />
                    <div style={{
                      marginTop: 12,
                      padding: '8px 12px',
                      borderRadius: '4px',
                      background: uiThemes[explorerColorTheme]?.colors?.contentBackground || '#fff',
                      border: `1px solid ${uiThemes[explorerColorTheme]?.colors?.contentBorder || '#e0e0e0'}`,
                      color: uiThemes[explorerColorTheme]?.colors?.dialogText || '#000',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      Vista previa del tema: <span style={{ fontWeight: 'bold' }}>{uiThemes[explorerColorTheme]?.name}</span>
                    </div>
                  </div>
                </div>
            )}
            {activeSubTab === 'pestanas' && (
                <TabThemeSelector />
            )}
          </div>
        </TabPanel>

        <TabPanel header={<span><i className="pi pi-desktop" style={{ marginRight: 8 }}></i>RDP</span>}>
          <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
            <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              {/* Header */}
              <div className="general-settings-header-wrapper" style={{ flexShrink: 0 }}>
                <div className="general-header-content">
                  <span className="general-header-icon protocol-dialog-header-icon">
                    <i className="pi pi-desktop"></i>
                  </span>
                  <div className="general-header-text">
                    <h3 className="general-header">Configuración RDP</h3>
                    <p className="general-description">Personaliza el comportamiento, conectividad y rendimiento de las sesiones RDP</p>
                  </div>
                </div>
              </div>
              
              {/* Grid de 2 columnas para las secciones */}
              <div className="general-settings-content">
                {/* Sección: Backend Guacamole */}
                <div className="general-settings-section">
                  <div className="general-section-header">
                    <div className="general-section-icon">
                      <i className="pi pi-sitemap"></i>
                    </div>
                    <h4 className="general-section-title">Backend Guacamole</h4>
                  </div>
                  
                  <div className="general-settings-options" style={{ padding: '0.75rem 1.25rem', gap: '0.5rem' }}>
                    <div>
                      <label htmlFor="guacd-preferred-method" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        Método preferido
                      </label>
                      <Dropdown
                        id="guacd-preferred-method"
                        value={guacdPreferredMethod}
                        options={methodOptions}
                        onChange={(e) => setGuacdPreferredMethod(e.value)}
                        style={{ width: '100%' }}
                      />
                      <small style={{ display: 'block', marginTop: 4, color: 'var(--text-color-secondary)', fontSize: '0.75rem' }}>
                        Preferencia → alternativa (Windows: Docker/WSL, Linux: Docker/Nativo)
                      </small>
                    </div>

                    <div style={{
                      marginTop: '0.5rem',
                      border: `1px solid ${guacdStatus.isRunning ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      borderRadius: 6,
                      padding: '0.5rem 0.75rem',
                      background: guacdStatus.isRunning ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          title={guacdStatus.isRunning ? 'Activo' : 'Inactivo'}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: guacdStatus.isRunning ? 'var(--green-500)' : 'var(--red-500)',
                            boxShadow: guacdStatus.isRunning ? '0 0 0 2px rgba(34,197,94,0.2)' : '0 0 0 2px rgba(239,68,68,0.2)',
                            flexShrink: 0
                          }}
                        ></span>
                        <strong style={{ color: guacdStatus.isRunning ? 'var(--green-500)' : 'var(--red-500)', fontSize: '0.75rem', fontWeight: 600 }}>Guacd</strong>
                        <span style={{ color: guacdStatus.isRunning ? 'var(--green-500)' : 'var(--red-500)', fontSize: '0.7rem', fontWeight: 500 }}>
                          {guacdStatus.isRunning ? '● Activo' : '● Inactivo'}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-color-secondary)', fontSize: '0.7rem', textAlign: 'right' }}>
                        <div style={{ textTransform: 'uppercase', fontWeight: 500, fontSize: '0.65rem' }}>{guacdStatus.method || '—'}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.6rem' }}>{guacdStatus.host}:{guacdStatus.port}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección: RDP Settings (todas juntas) */}
                <div className="general-settings-section">
                  <div className="general-section-header">
                    <div className="general-section-icon">
                      <i className="pi pi-cog"></i>
                    </div>
                    <h4 className="general-section-title">RDP Settings</h4>
                  </div>
                  
                  <div className="general-settings-options" style={{ padding: '0.5rem 1.25rem', gap: '0.5rem' }}>
                    {/* Actividad de sesión */}
                    <div>
                      <label htmlFor="rdp-session-activity-min" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        Umbral de actividad de sesión (min)
                      </label>
                      <small style={{ display: 'block', marginBottom: 4, color: 'var(--text-color-secondary)', fontSize: '0.7rem' }}>
                        Si no hay actividad, puede intentarse reconexión automática
                      </small>
                      <InputNumber
                        id="rdp-session-activity-min"
                        value={rdpSessionActivityMinutes}
                        onValueChange={e => setRdpSessionActivityMinutes(Math.max(1, Math.min(1440, e.value || 1)))}
                        min={1}
                        max={1440}
                        showButtons
                        buttonLayout="horizontal"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                        inputStyle={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                      />
                    </div>

                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <label htmlFor="rdp-resize-debounce" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        Debounce del resize (ms)
                      </label>
                      <small style={{ display: 'block', marginBottom: 4, color: 'var(--text-color-secondary)', fontSize: '0.7rem' }}>
                        Retardo del envío final tras parar de arrastrar la ventana
                      </small>
                      <InputNumber
                        id="rdp-resize-debounce"
                        value={rdpResizeDebounceMs}
                        onValueChange={e => setRdpResizeDebounceMs(Math.max(100, Math.min(2000, e.value || 300)))}
                        min={100}
                        max={2000}
                        showButtons
                        buttonLayout="horizontal"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                        inputStyle={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                      />
                    </div>

                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <label htmlFor="rdp-idle-min" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        Umbral de inactividad (min)
                      </label>
                      <small style={{ display: 'block', marginBottom: 4, color: 'var(--text-color-secondary)', fontSize: '0.7rem' }}>
                        Sin actividad (teclado/ratón), el siguiente resize ejecutará warm-up o reconexión
                      </small>
                      <InputNumber
                        id="rdp-idle-min"
                        value={rdpIdleMinutes}
                        onValueChange={e => setRdpIdleMinutes(Math.max(1, Math.min(1440, e.value || 1)))}
                        min={1}
                        max={1440}
                        showButtons
                        buttonLayout="horizontal"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                        inputStyle={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                      />
                    </div>

                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <label htmlFor="rdp-resize-ack-timeout" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        Timeout de ACK de resize (ms)
                      </label>
                      <small style={{ display: 'block', marginBottom: 4, color: 'var(--text-color-secondary)', fontSize: '0.7rem' }}>
                        Tiempo máximo esperando respuesta del display antes de permitir otro resize
                      </small>
                      <InputNumber
                        id="rdp-resize-ack-timeout"
                        value={rdpResizeAckTimeoutMs}
                        onValueChange={e => setRdpResizeAckTimeoutMs(Math.max(600, Math.min(5000, e.value || 1500)))}
                        min={600}
                        max={5000}
                        showButtons
                        buttonLayout="horizontal"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                        inputStyle={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                      />
                    </div>

                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <label htmlFor="rdp-guacd-inactivity-min" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        Watchdog de inactividad de Guacd (min)
                      </label>
                      <small style={{ display: 'block', marginBottom: 4, color: 'var(--text-color-secondary)', fontSize: '0.7rem' }}>
                        0 para desactivar. Cierre por inactividad entre guacamole-lite y guacd
                      </small>
                      <InputNumber
                        id="rdp-guacd-inactivity-min"
                        value={Math.floor((rdpGuacdInactivityMs || 0) / 60000)}
                        onValueChange={e => handleGuacdInactivityChange(Math.max(0, Math.min(1440, Number(e.value || 0))) * 60000)}
                        min={0}
                        max={1440}
                        showButtons
                        buttonLayout="horizontal"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                        inputStyle={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Clientes de IA" leftIcon="pi pi-comments">
          <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
            <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {/* Header */}
            <div className="general-settings-header-wrapper" style={{ flexShrink: 0 }}>
              <div className="general-header-content">
                <span className="general-header-icon protocol-dialog-header-icon">
                  <i className="pi pi-comments"></i>
                </span>
                <div className="general-header-text">
                  <h3 className="general-header">Clientes de IA</h3>
                  <p className="general-description">Configura tus clientes de IA y modelos locales para el procesamiento inteligente</p>
                </div>
              </div>
            </div>
            
            {/* Contenido - sin general-settings-content para permitir grid responsivo */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
              <AIClientsTab themeColors={{ primary: 'var(--primary-color)' }} />
            </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Actualizaciones" leftIcon="pi pi-refresh">
          <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
            <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              {/* Header */}
              <div className="general-settings-header-wrapper" style={{ flexShrink: 0 }}>
                <div className="general-header-content">
                  <span className="general-header-icon protocol-dialog-header-icon">
                    <i className="pi pi-refresh"></i>
                  </span>
                  <div className="general-header-text">
                    <h3 className="general-header">Actualizaciones</h3>
                    <p className="general-description">Gestiona las actualizaciones automáticas y el canal de versiones de NodeTerm</p>
                  </div>
                </div>
              </div>
              
              {/* Grid de 2 columnas para las secciones */}
              <div className="general-settings-content">
                {/* Card 1: Buscar Actualizaciones e Información */}
                <div className="general-settings-section">
                  <div className="general-section-header">
                    <div className="general-section-icon">
                      <i className="pi pi-search"></i>
                    </div>
                    <h4 className="general-section-title">Buscar Actualizaciones</h4>
                  </div>
                  
                  <div className="general-settings-options">
                    {/* Card principal de actualizaciones */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(var(--primary-color-rgb, 33, 150, 243), 0.08) 0%, rgba(var(--primary-color-rgb, 33, 150, 243), 0.03) 100%)',
                      border: '1px solid rgba(var(--primary-color-rgb, 33, 150, 243), 0.2)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      marginBottom: '0.5rem',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}>
                      {/* Decoración de fondo sutil */}
                      <div style={{
                        position: 'absolute',
                        top: '-40%',
                        right: '-15%',
                        width: '120px',
                        height: '120px',
                        background: 'radial-gradient(circle, rgba(var(--primary-color-rgb, 33, 150, 243), 0.08) 0%, transparent 70%)',
                        borderRadius: '50%',
                        pointerEvents: 'none'
                      }}></div>
                      
                      {/* Versión actual destacada */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1rem',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '0.6875rem',
                            fontWeight: '600',
                            color: 'var(--text-color-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '0.375rem'
                          }}>
                            Versión Actual
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem'
                          }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-color-rgb, 33, 150, 243), 0.8) 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 3px 10px rgba(var(--primary-color-rgb, 33, 150, 243), 0.25)',
                              flexShrink: 0
                            }}>
                              <i className="pi pi-check-circle" style={{ fontSize: '1.25rem', color: '#ffffff' }}></i>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '1.375rem',
                                fontWeight: '700',
                                color: 'var(--ui-dialog-text)',
                                lineHeight: '1.2',
                                letterSpacing: '-0.3px',
                                marginBottom: '0.125rem'
                              }}>
                                v1.6.1
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-color-secondary)',
                                lineHeight: '1.3'
                              }}>
                                Instalada y actualizada
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Botón de verificación */}
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <Button
                          label={isCheckingUpdates ? "Buscando actualizaciones..." : "Verificar Ahora"}
                          icon={isCheckingUpdates ? "pi pi-spin pi-spinner" : "pi pi-search"}
                          onClick={checkForUpdates}
                          disabled={isCheckingUpdates}
                          className="p-button-primary"
                          style={{
                            width: '100%',
                            height: '42px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            borderRadius: '10px',
                            boxShadow: '0 3px 10px rgba(var(--primary-color-rgb, 33, 150, 243), 0.2)',
                            transition: 'all 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Estados de actualización */}
                    {updateStatus === 'downloading' && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.12) 0%, rgba(33, 150, 243, 0.05) 100%)',
                        border: '1px solid rgba(33, 150, 243, 0.3)',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        marginBottom: '1.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(33, 150, 243, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.125rem', color: 'var(--primary-color)' }}></i>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--ui-dialog-text)', marginBottom: '0.125rem' }}>
                              Descargando actualización
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                              {downloadProgress.toFixed(1)}% completado
                            </div>
                          </div>
                        </div>
                        <div style={{
                          height: '6px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--primary-color) 0%, rgba(var(--primary-color-rgb, 33, 150, 243), 0.8) 100%)',
                            width: `${downloadProgress}%`,
                            transition: 'width 0.3s ease',
                            borderRadius: '3px',
                            boxShadow: '0 0 6px rgba(var(--primary-color-rgb, 33, 150, 243), 0.4)'
                          }}></div>
                        </div>
                      </div>
                    )}
                    
                    {updateStatus === 'available' && updateInfo && !isDownloading && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.05) 100%)',
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        marginBottom: '1.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(76, 175, 80, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <i className="pi pi-check-circle" style={{ fontSize: '1.125rem', color: 'var(--green-500)' }}></i>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--green-500)', marginBottom: '0.375rem' }}>
                              Nueva versión disponible
                            </div>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              padding: '0.25rem 0.625rem',
                              background: 'rgba(76, 175, 80, 0.15)',
                              borderRadius: '6px',
                              fontSize: '0.8125rem',
                              fontWeight: '600',
                              color: 'var(--green-600)',
                              marginBottom: '0.5rem'
                            }}>
                              <i className="pi pi-arrow-up" style={{ fontSize: '0.6875rem' }}></i>
                              <span>v{updateInfo.version || 'desconocida'}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', lineHeight: '1.4' }}>
                              Hay una nueva versión disponible para descargar e instalar.
                            </div>
                          </div>
                        </div>
                        {!autoDownloadEnabled && (
                          <Button
                            label="Descargar Actualización"
                            icon="pi pi-download"
                            onClick={downloadUpdate}
                            disabled={isDownloading}
                            className="p-button-success"
                            style={{
                              width: '100%',
                              height: '40px',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              borderRadius: '10px',
                              boxShadow: '0 3px 10px rgba(76, 175, 80, 0.2)'
                            }}
                          />
                        )}
                      </div>
                    )}
                    
                    {updateStatus === 'downloaded' && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.05) 100%)',
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        marginBottom: '1.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(76, 175, 80, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <i className="pi pi-check-circle" style={{ fontSize: '1.125rem', color: 'var(--green-500)' }}></i>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--green-500)', marginBottom: '0.375rem' }}>
                              Actualización lista para instalar
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', lineHeight: '1.4' }}>
                              La actualización se ha descargado correctamente. Haz clic en el botón para instalar y reiniciar la aplicación.
                            </div>
                          </div>
                        </div>
                        <Button
                          label="Instalar y Reiniciar"
                          icon="pi pi-check"
                          onClick={installUpdate}
                          disabled={isInstalling}
                          className="p-button-success"
                          style={{
                            width: '100%',
                            height: '40px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            borderRadius: '10px',
                            boxShadow: '0 3px 10px rgba(76, 175, 80, 0.2)'
                          }}
                        />
                      </div>
                    )}
                    
                    {updateStatus === 'error' && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.12) 0%, rgba(244, 67, 54, 0.05) 100%)',
                        border: '1px solid rgba(244, 67, 54, 0.3)',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        marginBottom: '1.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(244, 67, 54, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <i className="pi pi-times-circle" style={{ fontSize: '1.125rem', color: 'var(--red-500)' }}></i>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--red-500)', marginBottom: '0.375rem' }}>
                              Error al buscar actualizaciones
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', lineHeight: '1.4' }}>
                              No se pudo conectar con el servidor de actualizaciones. Verifica tu conexión a internet e intenta nuevamente.
                            </div>
                          </div>
                        </div>
                        <Button
                          label="Reintentar"
                          icon="pi pi-refresh"
                          onClick={checkForUpdates}
                          className="p-button-outlined"
                          style={{
                            width: '100%',
                            height: '40px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            borderRadius: '10px'
                          }}
                        />
                      </div>
                    )}

                    {/* Sección: Información */}
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '1rem',
                      background: 'rgba(var(--primary-color-rgb, 33, 150, 243), 0.04)',
                      borderRadius: '10px',
                      border: '1px solid rgba(var(--primary-color-rgb, 33, 150, 243), 0.12)'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '1rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.625rem'
                        }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(76, 175, 80, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <i className="pi pi-shield" style={{ fontSize: '0.875rem', color: 'var(--green-500)' }}></i>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.8125rem',
                              fontWeight: '600',
                              color: 'var(--ui-dialog-text)',
                              marginBottom: '0.25rem'
                            }}>
                              Seguridad
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-color-secondary)',
                              lineHeight: '1.4'
                            }}>
                              Actualizaciones firmadas y verificadas
                            </div>
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.625rem'
                        }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(33, 150, 243, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <i className="pi pi-server" style={{ fontSize: '0.875rem', color: 'var(--primary-color)' }}></i>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.8125rem',
                              fontWeight: '600',
                              color: 'var(--ui-dialog-text)',
                              marginBottom: '0.25rem'
                            }}>
                              Distribución
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-color-secondary)',
                              lineHeight: '1.4'
                            }}>
                              GitHub Releases
                            </div>
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.625rem'
                        }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(255, 193, 7, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <i className="pi pi-bell" style={{ fontSize: '0.875rem', color: 'var(--yellow-500)' }}></i>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.8125rem',
                              fontWeight: '600',
                              color: 'var(--ui-dialog-text)',
                              marginBottom: '0.25rem'
                            }}>
                              Notificaciones
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-color-secondary)',
                              lineHeight: '1.4'
                            }}>
                              Alertas automáticas de seguridad
                            </div>
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.625rem'
                        }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(156, 39, 176, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <i className="pi pi-cog" style={{ fontSize: '0.875rem', color: 'var(--purple-500)' }}></i>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.8125rem',
                              fontWeight: '600',
                              color: 'var(--ui-dialog-text)',
                              marginBottom: '0.25rem'
                            }}>
                              Configuración
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-color-secondary)',
                              lineHeight: '1.4'
                            }}>
                              Personaliza búsqueda y descarga
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Configuración de Actualizaciones (Canal + Búsqueda Automática) */}
                <div className="general-settings-section">
                  <div className="general-section-header">
                    <div className="general-section-icon">
                      <i className="pi pi-cog"></i>
                    </div>
                    <h4 className="general-section-title">Configuración de Actualizaciones</h4>
                  </div>
                  
                  <div className="general-settings-options">
                    {/* Subsección: Búsqueda Automática */}
                    <div style={{
                      marginBottom: '1rem',
                      padding: '1rem',
                      background: 'rgba(var(--primary-color-rgb, 33, 150, 243), 0.04)',
                      borderRadius: '10px',
                      border: '1px solid rgba(var(--primary-color-rgb, 33, 150, 243), 0.12)'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--text-color-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <i className="pi pi-clock" style={{ fontSize: '0.875rem' }}></i>
                        <span>Búsqueda Automática</span>
                      </div>
                      <div className="general-setting-card" onClick={() => handleAutoCheckChange(!autoCheckEnabled)}>
                        <div className="general-setting-content">
                          <div className="general-setting-icon lock">
                            <i className="pi pi-check"></i>
                          </div>
                          <div className="general-setting-info">
                            <label className="general-setting-label">
                              Buscar automáticamente
                            </label>
                            <p className="general-setting-description">
                              Cada 24 horas
                            </p>
                          </div>
                          <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={autoCheckEnabled}
                              onChange={(e) => handleAutoCheckChange(e.checked)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="general-setting-card" onClick={() => handleAutoDownloadChange(!autoDownloadEnabled)}>
                        <div className="general-setting-content">
                          <div className="general-setting-icon bolt">
                            <i className="pi pi-download"></i>
                          </div>
                          <div className="general-setting-info">
                            <label className="general-setting-label">
                              Descargar automáticamente
                            </label>
                            <p className="general-setting-description">
                              En segundo plano
                            </p>
                          </div>
                          <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={autoDownloadEnabled}
                              onChange={(e) => handleAutoDownloadChange(e.checked)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subsección: Canal */}
                    <div style={{
                      padding: '1rem',
                      background: 'rgba(var(--primary-color-rgb, 33, 150, 243), 0.04)',
                      borderRadius: '10px',
                      border: '1px solid rgba(var(--primary-color-rgb, 33, 150, 243), 0.12)'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--text-color-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <i className="pi pi-sitemap" style={{ fontSize: '0.875rem' }}></i>
                        <span>Canal</span>
                      </div>
                      <div className="general-setting-card" onClick={() => handleChannelChange('latest')}>
                        <div className="general-setting-content">
                          <div className="general-setting-icon lock">
                            <i className="pi pi-shield"></i>
                          </div>
                          <div className="general-setting-info">
                            <label className="general-setting-label">
                              Estable (Recomendado)
                            </label>
                            <p className="general-setting-description">
                              Versiones probadas y seguras
                            </p>
                          </div>
                          <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={updateChannel === 'latest'}
                              onChange={() => handleChannelChange('latest')}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="general-setting-card" onClick={() => handleChannelChange('beta')}>
                        <div className="general-setting-content">
                          <div className="general-setting-icon bolt">
                            <i className="pi pi-flask"></i>
                          </div>
                          <div className="general-setting-info">
                            <label className="general-setting-label">
                              Beta
                            </label>
                            <p className="general-setting-description">
                              Nuevas características (puede contener bugs)
                            </p>
                          </div>
                          <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={updateChannel === 'beta'}
                              onChange={() => handleChannelChange('beta')}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Sincronización" leftIcon="pi pi-cloud">
          <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
            <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {/* Header */}
            <div className="general-settings-header-wrapper">
              <div className="general-header-content">
                <span className="general-header-icon protocol-dialog-header-icon">
                  <i className="pi pi-cloud"></i>
                </span>
                <div className="general-header-text">
                  <h3 className="general-header">Sincronización</h3>
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
                  Sincronización en la Nube
                </h3>
                <p style={{
                  margin: '0 0 2rem 0',
                  color: 'var(--text-color-secondary)',
                  fontSize: '1rem',
                  textAlign: 'center'
                }}>
                  Sincroniza tu configuración personal entre todos tus dispositivos usando Nextcloud.
                  Nunca pierdas tus temas, fuentes y configuraciones personalizadas.
                </p>
              </div>

              <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                <Button
                  label="Configurar Sincronización"
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

        <TabPanel header="Información" leftIcon="pi pi-info-circle">
          <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
            <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              {/* Header */}
              <div className="general-settings-header-wrapper">
                <div className="general-header-content">
                  <span className="general-header-icon protocol-dialog-header-icon">
                    <i className="pi pi-info-circle"></i>
                  </span>
                  <div className="general-header-text">
                    <h3 className="general-header">Información de NodeTerm</h3>
                    <p className="general-description">Versión, detalles técnicos y características de tu aplicación</p>
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
                    <h4 className="general-section-title">Versión de la Aplicación</h4>
                  </div>
                  
                  <div className="general-settings-options">
                    <div style={{ padding: '0.75rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.9375rem', margin: '0' }}>
                          NodeTerm
                        </label>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-color-secondary)', fontSize: '0.8125rem' }}>
                          Terminal SSH multiplataforma
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
                        {versionInfo.appVersion ? `v${versionInfo.appVersion}` : 'v1.3.1'}
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
                    <h4 className="general-section-title">Información Técnica</h4>
                  </div>
                  
                  <div className="general-settings-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                        Electron
                      </label>
                      <p style={{ margin: '0', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                        {versionInfo.electronVersion || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                        Node.js
                      </label>
                      <p style={{ margin: '0', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                        {versionInfo.nodeVersion || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                        Chromium
                      </label>
                      <p style={{ margin: '0', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                        {versionInfo.chromeVersion || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                        Compilación
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
    </Dialog>
  );
};

export default SettingsDialog; 