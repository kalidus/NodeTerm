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
  const [toast, setToast] = useState(null);

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
  const HomeIconSelectorGrid = useMemo(() => {
    return function HomeIconSelectorGrid({ selected, onSelect }) {
      const opRef = useRef(null);
      const groups = getHomeTabIconGroups();
      const [activeTab, setActiveTab] = useState(0);
      const openPanel = (e) => opRef.current?.toggle(e);
      return (
        <div className="home-icon-selector">
          <Button
            type="button"
            label="Elegir icono"
            icon="pi pi-chevron-down"
            iconPos="right"
            onClick={openPanel}
            className="p-button-outlined home-icon-trigger"
          />
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

      return (
        <div className="group-icon-selector">
          <Button
            type="button"
            label="Elegir icono"
            icon="pi pi-chevron-down"
            iconPos="right"
            onClick={openPanel}
            className="p-button-outlined group-icon-trigger"
          />
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

  return (
    <Dialog
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="pi pi-cog" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}></i>
          <span>Configuración</span>
        </div>
      }
      visible={visible}
      className="settings-dialog"
      style={{
        maxWidth: '98vw',
        maxHeight: '98vh',
        minWidth: '1000px',
        minHeight: '500px'
      }}
      contentStyle={{
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)'
      }}
      headerStyle={{
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)',
        borderBottom: '1px solid var(--ui-dialog-border)'
      }}
      onHide={onHide}
      modal
      maximizable
      footer={
        <div style={{
          background: 'var(--ui-dialog-bg)',
          color: 'var(--ui-dialog-text)',
          borderTop: '1px solid var(--ui-dialog-border)'
        }}>
          <Button
            label="Cerrar"
            icon="pi pi-times"
            onClick={onHide}
            className="p-button-text"
          />
        </div>
      }
    >
      <Toast ref={setToast} />
      <TabView
        activeIndex={activeIndex}
        onTabChange={(e) => setActiveIndex(e.index)}
        className="settings-dialog-tabview"
      >
        <TabPanel header="General" leftIcon="pi pi-cog">
          <div className="general-settings-container">
            {/* Header con descripción */}
            <div className="settings-header">
              <div className="header-content">
                <h3 className="settings-title">
                  <i className="pi pi-cog header-icon"></i>
                  Configuración General
                </h3>
                <p className="settings-description">
                  Personaliza el comportamiento y la apariencia básica de NodeTerm
                </p>
              </div>
            </div>
            
            {/* Sección de Comportamiento */}
            <div className="settings-section">
              <div className="section-header">
                <i className="pi pi-sliders-h section-icon"></i>
                <h4 className="section-title">Comportamiento de la Aplicación</h4>
              </div>
              
              <div className="settings-options">
                <div className="setting-card">
                  <div className="setting-content">
                    <div className="setting-icon">
                      <i className="pi pi-lock"></i>
                    </div>
                    <div className="setting-info">
                      <label htmlFor="lock-home-button" className="setting-label">
                        Bloquear Botón de Inicio
                      </label>
                      <p className="setting-description">
                        Previene que el botón de inicio se pueda cerrar o mover accidentalmente
                      </p>
                    </div>
                    <div className="setting-control">
                      <Checkbox
                        id="lock-home-button"
                        checked={lockHomeButton}
                        onChange={(e) => setLockHomeButton(e.checked)}
                        className="modern-checkbox"
                      />
                    </div>
                  </div>
                </div>

                <div className="setting-card">
                  <div className="setting-content">
                    <div className="setting-icon">
                      <i className="pi pi-bolt"></i>
                    </div>
                    <div className="setting-info">
                      <label htmlFor="interactive-icon" className="setting-label">
                        Icono NodeTerm Interactivo
                      </label>
                      <p className="setting-description">
                        Hace que el cursor "_" en el título parpadee como un terminal real
                      </p>
                    </div>
                    <div className="setting-control">
                      <Checkbox
                        id="interactive-icon"
                        checked={interactiveIcon}
                        onChange={(e) => setInteractiveIcon(e.checked)}
                        className="modern-checkbox"
                      />
                    </div>
                  </div>
                </div>

                <div className="setting-card">
                  <div className="setting-content">
                    <div className="setting-icon">
                      <i className="pi pi-angle-left"></i>
                    </div>
                    <div className="setting-info">
                      <label htmlFor="sidebar-start-collapsed" className="setting-label">
                        Iniciar con Sidebar Colapsada
                      </label>
                      <p className="setting-description">
                        La barra lateral se iniciará colapsada por defecto al abrir la aplicación
                      </p>
                    </div>
                    <div className="setting-control">
                      <Checkbox
                        id="sidebar-start-collapsed"
                        checked={sidebarStartCollapsed}
                        onChange={(e) => setSidebarStartCollapsed(e.checked)}
                        className="modern-checkbox"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección de Personalización Visual */}
            <div className="settings-section">
              <div className="section-header">
                <i className="pi pi-palette section-icon"></i>
                <h4 className="section-title">Personalización Visual</h4>
              </div>
              
              {/* Selector de Icono de Pestaña de Inicio */}
              <div className="icon-selector-section">
                <div className="selector-header">
                  <div className="selector-title">
                    <i className="pi pi-home selector-icon"></i>
                    <span>Icono de la Pestaña de Inicio</span>
                  </div>
                  <p className="selector-description">
                    Personaliza el icono que aparece en la pestaña de inicio
                  </p>
                </div>

                <div className="current-selection">
                  <div className="current-label">Selección actual:</div>
                  <div className="current-icon-display">
                    {homeTabIcons[selectedHomeIcon]?.icon(18)}
                    <span className="icon-name">{homeTabIcons[selectedHomeIcon]?.name}</span>
                  </div>
                </div>

                <div className="icon-selector-container">
                  <HomeIconSelectorGrid
                    selected={selectedHomeIcon}
                    onSelect={setSelectedHomeIcon}
                  />
                </div>
              </div>

              {/* Selector de Icono de Grupos */}
              <div className="icon-selector-section">
                <div className="selector-header">
                  <div className="selector-title">
                    <i className="pi pi-th-large selector-icon"></i>
                    <span>Icono de Grupos de Pestañas</span>
                  </div>
                  <p className="selector-description">
                    Elige el icono para la pestaña de grupos
                  </p>
                </div>

                <div className="current-selection">
                  <div className="current-label">Selección actual:</div>
                  <div className="current-icon-display">
                    {groupTabIcons[selectedGroupIcon]?.icon(18)}
                    <span className="icon-name">{groupTabIcons[selectedGroupIcon]?.name}</span>
                  </div>
                </div>

                <div className="icon-selector-container">
                  <GroupIconSelectorGrid
                    selected={selectedGroupIcon}
                    onSelect={setSelectedGroupIcon}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabPanel>
        <TabPanel header="Seguridad" leftIcon="pi pi-shield">
          <div style={{ marginTop: 0, padding: 0, width: '100%' }}>
            <TabView className="settings-dialog-subtabview" style={{ marginTop: 0, width: '100%', overflow: 'visible' }}>
              <TabPanel header={<span><i className="pi pi-key" style={{ marginRight: 8 }}></i>Clave Maestra</span>}>
                <div className="security-settings-container">
                  <div className="security-settings-content">
                    <h3 className="security-header">
                      <span className="security-header-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                      Gestión de Clave Maestra
                    </h3>

                    <p className="security-description">
                      La clave maestra protege tus credenciales de sesión con cifrado AES-256. 
                      Se requiere para sincronizar sesiones de forma segura.
                    </p>

                    {/* Layout de 2 columnas */}
                    <div className="security-layout-grid">
                      {/* Columna izquierda: Estado */}
                      <div className="security-status-card">
                        <div className="security-status-header">
                          <i className={`pi ${hasMasterKey ? 'pi-check-circle' : 'pi-exclamation-triangle'} security-status-icon ${hasMasterKey ? 'success' : 'warning'}`}></i>
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
                            <i className="pi pi-key"></i>
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
                            <i className="pi pi-key"></i>
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
              </TabPanel>
              <TabPanel header={<span><i className="pi pi-shield-alt" style={{ marginRight: 8 }}></i>Auditoría</span>}>
                <div style={{
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minHeight: '50vh',
                  width: '100%'
                }}>
                  <div style={{
                    maxWidth: '600px',
                    width: '100%',
                    textAlign: 'left'
                  }}>
                    <h3 style={{ 
                      margin: '0 0 1.5rem 0', 
                      color: 'var(--text-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <i className="pi pi-shield-alt" style={{ color: 'var(--primary-color)' }}></i>
                      Configuración de Auditoría
                    </h3>

                    <p style={{
                      marginBottom: '2rem',
                      color: 'var(--text-color-secondary)',
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }}>
                      Configura el grabado automático de sesiones SSH y la gestión de archivos de auditoría.
                    </p>

                    {/* Grabación Automática */}
                    <div style={{
                      background: 'var(--surface-card)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      marginBottom: '2rem'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 1rem 0', 
                        color: 'var(--text-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <i className="pi pi-video" style={{ color: '#4fc3f7' }}></i>
                        Grabación Automática de Sesiones SSH
                      </h4>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                          <Checkbox
                            inputId="autoRecording"
                            checked={autoRecordingEnabled}
                            onChange={(e) => setAutoRecordingEnabled(e.checked)}
                          />
                          <label htmlFor="autoRecording" style={{ 
                            color: 'var(--text-color)',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}>
                            Activar grabación automática de todas las sesiones SSH
                          </label>
                        </div>
                        
                        {autoRecordingEnabled && (
                          <>
                            <div style={{ marginBottom: '1rem' }}>
                              <label htmlFor="recordingQuality" style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'var(--text-color)',
                                fontWeight: '500'
                              }}>
                                Calidad de grabación
                              </label>
                              <Dropdown
                                id="recordingQuality"
                                value={recordingQuality}
                                options={[
                                  { label: 'Alta (todos los eventos)', value: 'high' },
                                  { label: 'Media (eventos importantes)', value: 'medium' },
                                  { label: 'Baja (solo comandos)', value: 'low' }
                                ]}
                                onChange={(e) => setRecordingQuality(e.value)}
                                style={{ width: '100%' }}
                              />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <Checkbox
                                  inputId="encryptRecordings"
                                  checked={encryptRecordings}
                                  onChange={(e) => setEncryptRecordings(e.checked)}
                                />
                                <label htmlFor="encryptRecordings" style={{ 
                                  color: 'var(--text-color)',
                                  cursor: 'pointer',
                                  userSelect: 'none'
                                }}>
                                  Cifrar grabaciones con clave maestra
                                </label>
                              </div>
                              <small style={{ color: 'var(--text-color-secondary)', marginLeft: '2rem' }}>
                                Las grabaciones se cifrarán automáticamente si tienes una clave maestra configurada
                              </small>
                            </div>

                            {/* Ubicación de grabaciones */}
                            <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                              <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'var(--text-color)',
                                fontWeight: '500'
                              }}>
                                Ubicación de grabaciones
                              </label>
                              <div style={{
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                                marginBottom: '0.5rem'
                              }}>
                                <InputText
                                  value={recordingPath || ''}
                                  readOnly
                                  style={{
                                    flex: 1,
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem'
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
                              <small style={{ color: 'var(--text-color-secondary)' }}>
                                {isDefaultPath 
                                  ? 'Usando ubicación por defecto: AppData/NodeTerm/recordings'
                                  : `Ubicación personalizada: ${recordingPath}`
                                }
                              </small>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Limpieza de Archivos */}
                    <div style={{
                      background: 'var(--surface-card)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: '8px',
                      padding: '1.5rem'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 1rem 0', 
                        color: 'var(--text-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <i className="pi pi-trash" style={{ color: '#ff9800' }}></i>
                        Limpieza Automática de Archivos
                      </h4>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                          <Checkbox
                            inputId="autoCleanup"
                            checked={autoCleanupEnabled}
                            onChange={(e) => setAutoCleanupEnabled(e.checked)}
                          />
                          <label htmlFor="autoCleanup" style={{ 
                            color: 'var(--text-color)',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}>
                            Activar limpieza automática de archivos antiguos
                          </label>
                        </div>
                        
                        {autoCleanupEnabled && (
                          <>
                            <div style={{ marginBottom: '1rem' }}>
                              <label htmlFor="retentionDays" style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'var(--text-color)',
                                fontWeight: '500'
                              }}>
                                Días de retención: {retentionDays}
                              </label>
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
                                fontSize: '0.8rem', 
                                color: 'var(--text-color-secondary)',
                                marginTop: '0.25rem'
                              }}>
                                <span>1 día</span>
                                <span>365 días</span>
                              </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                              <label htmlFor="maxStorageSize" style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'var(--text-color)',
                                fontWeight: '500'
                              }}>
                                Tamaño máximo de almacenamiento (GB): {maxStorageSize}
                              </label>
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
                                fontSize: '0.8rem', 
                                color: 'var(--text-color-secondary)',
                                marginTop: '0.25rem'
                              }}>
                                <span>0.1 GB</span>
                                <span>100 GB</span>
                              </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <Checkbox
                                  inputId="cleanupOnStartup"
                                  checked={cleanupOnStartup}
                                  onChange={(e) => setCleanupOnStartup(e.checked)}
                                />
                                <label htmlFor="cleanupOnStartup" style={{ 
                                  color: 'var(--text-color)',
                                  cursor: 'pointer',
                                  userSelect: 'none'
                                }}>
                                  Ejecutar limpieza al iniciar la aplicación
                                </label>
                              </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                              <label htmlFor="cleanupFrequency" style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'var(--text-color)',
                                fontWeight: '500'
                              }}>
                                Frecuencia de limpieza automática
                              </label>
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
                                style={{ width: '100%' }}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Estadísticas actuales */}
                      <div style={{
                        background: 'var(--surface-ground)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: '6px',
                        padding: '1rem',
                        marginTop: '1rem'
                      }}>
                        <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-color)' }}>
                          <i className="pi pi-chart-bar" style={{ marginRight: '0.5rem' }}></i>
                          Estadísticas Actuales
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-color-secondary)' }}>Archivos de auditoría:</span>
                            <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem' }}>
                              {auditStats?.fileCount || 0}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-color-secondary)' }}>Tamaño total:</span>
                            <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem' }}>
                              {formatBytes(auditStats?.totalSize || 0)}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-color-secondary)' }}>Archivo más antiguo:</span>
                            <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem' }}>
                              {auditStats?.oldestFile ? new Date(auditStats.oldestFile).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-color-secondary)' }}>Última limpieza:</span>
                            <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem' }}>
                              {auditStats?.lastCleanup ? new Date(auditStats.lastCleanup).toLocaleDateString() : 'Nunca'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botón de limpieza manual */}
                      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                        <Button
                          label="Ejecutar Limpieza Ahora"
                          icon="pi pi-trash"
                          onClick={handleManualCleanup}
                          disabled={!autoCleanupEnabled}
                          className="p-button-warning"
                          style={{ flex: 1 }}
                        />
                        <Button
                          label="Ver Archivos"
                          icon="pi pi-folder-open"
                          onClick={handleViewAuditFiles}
                          className="p-button-secondary"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanel>
            </TabView>
          </div>
        </TabPanel>

        <TabPanel header="Apariencia" leftIcon="pi pi-palette">
          <div style={{ marginTop: 0, padding: 0, width: '100%' }}>
            <TabView className="settings-dialog-subtabview" style={{ marginTop: 0, width: '100%', overflow: 'visible' }}>
              <TabPanel header={<span><i className="pi pi-eye" style={{ marginRight: 8 }}></i>Interfaz</span>}>
                <div style={{
                  padding: '1rem 0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '50vh',
                  width: '100%'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                    <i className="pi pi-eye" style={{ marginRight: '0.5rem' }}></i>
                    Tema de la Interfaz
                  </h3>
                  <p style={{
                    marginBottom: '1rem',
                    color: 'var(--text-color-secondary)',
                    fontSize: '0.9rem'
                  }}>
                    Personaliza los colores de la interfaz de usuario (sidebar, menús, pestañas, etc.)
                  </p>
                  <ThemeSelector showPreview={true} />
                </div>
              </TabPanel>
              <TabPanel header={<span><i className="pi pi-desktop" style={{ marginRight: 8 }}></i>Terminal</span>}>
                <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', width: '100%' }}>
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
              </TabPanel>
              <TabPanel header={<span><i className="pi pi-sliders-h" style={{ marginRight: 8 }}></i>Status Bar</span>}>
                <div style={{
                  padding: '1rem 0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '50vh',
                  width: '100%'
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
              </TabPanel>
              <TabPanel header={<span><i className="pi pi-sitemap" style={{ marginRight: 8 }}></i>Explorador de Sesiones</span>}>
                <div style={{
                  padding: '1rem 0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '50vh',
                  width: '100%'
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
              </TabPanel>
              <TabPanel header={<span><i className="pi pi-folder-open" style={{ marginRight: 8 }}></i>Explorador de Archivos</span>}>
                <div style={{
                  padding: '1rem 0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '50vh',
                  width: '100%'
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
              </TabPanel>
              <TabPanel header={<span><i className="pi pi-palette" style={{ marginRight: 8 }}></i>Pestañas</span>}>
                <TabThemeSelector />
              </TabPanel>
            </TabView>
          </div>
        </TabPanel>

        <TabPanel header={<span><i className="pi pi-desktop" style={{ marginRight: 8 }}></i>RDP</span>}>
          <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '40vh', width: '100%' }}>
            {/* Backend RDP (Guacamole) */}
            <div style={{ width: '100%', maxWidth: 520, marginBottom: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-color)' }}>
                <i className="pi pi-sitemap" style={{ marginRight: '0.5rem', color: '#4fc3f7' }}></i>
                Backend para RDP (Guacamole)
              </h3>
              <label htmlFor="guacd-preferred-method" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                Método preferido
              </label>
              <Dropdown
                id="guacd-preferred-method"
                value={guacdPreferredMethod}
                options={methodOptions}
                onChange={(e) => setGuacdPreferredMethod(e.value)}
                style={{ width: '100%' }}
              />
              <small style={{ display: 'block', marginTop: 8, color: 'var(--text-color-secondary)' }}>
                El orden será: tu preferencia → alternativa. En Windows: Docker/WSL. En Linux: Docker/Nativo.
              </small>
            </div>

            <div style={{
              width: '100%',
              maxWidth: 520,
              marginTop: '0.5rem',
              border: '1px solid var(--surface-border)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              background: 'var(--surface-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  title={guacdStatus.isRunning ? 'Activo' : 'Inactivo'}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: guacdStatus.isRunning ? 'var(--green-500)' : 'var(--red-500)',
                    boxShadow: guacdStatus.isRunning ? '0 0 0 3px rgba(34,197,94,0.15)' : '0 0 0 3px rgba(239,68,68,0.15)'
                  }}
                ></span>
                <strong style={{ color: 'var(--text-color)' }}>Servidor Guacd</strong>
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>
                  {guacdStatus.isRunning ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem', textAlign: 'right' }}>
                <div style={{ textTransform: 'uppercase' }}>{guacdStatus.method || '—'}</div>
                <div style={{ fontFamily: 'monospace' }}>{guacdStatus.host}:{guacdStatus.port}</div>
              </div>
            </div>
            {/* General */}
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>
              <i className="pi pi-cog" style={{ marginRight: '0.5rem', color: '#4fc3f7' }}></i>
              General
            </h3>
            <div style={{ width: '100%', maxWidth: 520, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label htmlFor="rdp-session-activity-min" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Umbral de actividad de la sesión (minutos)
                </label>
                <small style={{ display: 'block', marginBottom: 8, color: 'var(--text-color-secondary)' }}>
                  Si no hay actividad durante este tiempo, puede intentarse una reconexión automática.
                </small>
                <InputNumber
                  id="rdp-session-activity-min"
                  value={rdpSessionActivityMinutes}
                  onValueChange={e => setRdpSessionActivityMinutes(Math.max(1, Math.min(1440, e.value || 1)))}
                  min={1}
                  max={1440}
                  showButtons
                  buttonLayout="horizontal"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 28 }}>
                  {rdpSessionActivityMinutes} min (mín. 1)
                </div>
              </div>
            </div>

            {/* Configuración Resize */}
            <h3 style={{ margin: '0.5rem 0 0.5rem 0', color: 'var(--text-color)' }}>
              <i className="pi pi-sliders-h" style={{ marginRight: '0.5rem', color: '#4fc3f7' }}></i>
              Configuración Resize
            </h3>
            <div style={{ width: '100%', maxWidth: 520, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label htmlFor="rdp-resize-debounce" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Debounce del resize (ms)
                </label>
                <small style={{ display: 'block', marginBottom: 8, color: 'var(--text-color-secondary)' }}>
                  Solo se envía el tamaño final tras parar de arrastrar. Ajusta el retardo del envío final.
                </small>
                <InputNumber
                  id="rdp-resize-debounce"
                  value={rdpResizeDebounceMs}
                  onValueChange={e => setRdpResizeDebounceMs(Math.max(100, Math.min(2000, e.value || 300)))}
                  min={100}
                  max={2000}
                  showButtons
                  buttonLayout="horizontal"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 28 }}>
                  {rdpResizeDebounceMs} ms (100–2000)
                </div>
              </div>

              <div>
                <label htmlFor="rdp-idle-min" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Umbral de inactividad (minutos)
                </label>
                <small style={{ display: 'block', marginBottom: 8, color: 'var(--text-color-secondary)' }}>
                  Tras superar este tiempo sin actividad (teclado/ratón/sync), el siguiente resize hará un warm‑up o reconexión.
                </small>
                <InputNumber
                  id="rdp-idle-min"
                  value={rdpIdleMinutes}
                  onValueChange={e => setRdpIdleMinutes(Math.max(1, Math.min(1440, e.value || 1)))}
                  min={1}
                  max={1440}
                  showButtons
                  buttonLayout="horizontal"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 28 }}>
                  {rdpIdleMinutes} min (mín. 1)
                </div>
              </div>

              <div>
                <label htmlFor="rdp-resize-ack-timeout" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Timeout de ACK de resize (ms)
                </label>
                <small style={{ display: 'block', marginBottom: 8, color: 'var(--text-color-secondary)' }}>
                  Tiempo máximo esperando respuesta del display tras enviar un tamaño, antes de permitir otro envío.
                </small>
                <InputNumber
                  id="rdp-resize-ack-timeout"
                  value={rdpResizeAckTimeoutMs}
                  onValueChange={e => setRdpResizeAckTimeoutMs(Math.max(600, Math.min(5000, e.value || 1500)))}
                  min={600}
                  max={5000}
                  showButtons
                  buttonLayout="horizontal"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 28 }}>
                  {rdpResizeAckTimeoutMs} ms (600–5000)
                </div>
              </div>
            </div>

            {/* Configuración Guacamole */}
            <h3 style={{ margin: '0.5rem 0 0.5rem 0', color: 'var(--text-color)' }}>
              <i className="pi pi-sitemap" style={{ marginRight: '0.5rem', color: '#4fc3f7' }}></i>
              Configuración Guacamole
            </h3>
            <div style={{ width: '100%', maxWidth: 520, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label htmlFor="rdp-guacd-inactivity-min" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Watchdog de inactividad del servidor guacd (minutos)
                </label>
                <small style={{ display: 'block', marginBottom: 8, color: 'var(--text-color-secondary)' }}>
                  0 para desactivarlo. Controla el cierre por inactividad entre guacamole‑lite y guacd (backend).
                </small>
                <InputNumber
                  id="rdp-guacd-inactivity-min"
                  value={Math.floor((rdpGuacdInactivityMs || 0) / 60000)}
                  onValueChange={e => handleGuacdInactivityChange(Math.max(0, Math.min(1440, Number(e.value || 0))) * 60000)}
                  min={0}
                  max={1440}
                  showButtons
                  buttonLayout="horizontal"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 28 }}>
                  {Math.floor((rdpGuacdInactivityMs || 0) / 60000)} min {rdpGuacdInactivityMs === 0 ? '(desactivado)' : ''}
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Clientes de IA" leftIcon="pi pi-comments">
          <AIClientsTab themeColors={{ primary: 'var(--primary-color)' }} />
        </TabPanel>

        <TabPanel header="Actualizaciones" leftIcon="pi pi-refresh">
          <UpdatePanel />
        </TabPanel>

        <TabPanel header="Sincronización" leftIcon="pi pi-cloud">
          <div style={{
            padding: '2rem 0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            width: '100%'
          }}>
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <i className="pi pi-cloud" style={{
                fontSize: '4rem',
                color: 'var(--primary-color)',
                marginBottom: '1rem',
                display: 'block'
              }}></i>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                Sincronización en la Nube
              </h3>
              <p style={{
                margin: '0 0 2rem 0',
                color: 'var(--text-color-secondary)',
                fontSize: '1rem',
                maxWidth: '600px'
              }}>
                Sincroniza tu configuración personal entre todos tus dispositivos usando Nextcloud.
                Nunca pierdas tus temas, fuentes y configuraciones personalizadas.
              </p>
            </div>

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

            <div style={{ marginTop: '3rem', maxWidth: '800px', width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', textAlign: 'center' }}>
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
        </TabPanel>

        <TabPanel header="Información" leftIcon="pi pi-info-circle">
          <div style={{
            padding: '1rem 0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            width: '100%'
          }}>
            {/* Logo o Icono de la App */}
            <div style={{ marginBottom: '1rem' }}>
              <i
                className="pi pi-desktop"
                style={{
                  fontSize: '4rem',
                  color: 'var(--primary-color)',
                  background: 'var(--surface-100)',
                  padding: '1rem',
                  borderRadius: '50%',
                  width: '6rem',
                  height: '6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}
              ></i>
            </div>

            {/* Información Principal */}
            <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>
              NodeTerm
            </h2>
            <p style={{
              margin: '0 0 1rem 0',
              color: 'var(--text-color-secondary)',
              fontSize: '0.9rem'
            }}>
              Terminal SSH multiplataforma con gestión avanzada de pestañas
            </p>

            {/* Versión Principal */}
            <div style={{
              background: 'var(--primary-color)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              display: 'inline-block',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              marginBottom: '1.5rem'
            }}>
              {versionInfo.appVersion ? `v${versionInfo.appVersion}` : 'v1.3.1'}
            </div>

            <Divider />

            {/* Información Técnica */}
            <div style={{ textAlign: 'left', marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                <i className="pi pi-cog" style={{ marginRight: '0.5rem' }}></i>
                Información Técnica
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div>
                  <strong>Electron:</strong>
                  <br />
                  <span style={{ color: 'var(--text-color-secondary)' }}>
                    {versionInfo.electronVersion || 'N/A'}
                  </span>
                </div>
                <div>
                  <strong>Node.js:</strong>
                  <br />
                  <span style={{ color: 'var(--text-color-secondary)' }}>
                    {versionInfo.nodeVersion || 'N/A'}
                  </span>
                </div>
                <div>
                  <strong>Chromium:</strong>
                  <br />
                  <span style={{ color: 'var(--text-color-secondary)' }}>
                    {versionInfo.chromeVersion || 'N/A'}
                  </span>
                </div>
                <div>
                  <strong>Compilación:</strong>
                  <br />
                  <span style={{ color: 'var(--text-color-secondary)' }}>
                    {versionInfo.buildDate || new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <Divider />

            {/* Funcionalidades */}
            <div style={{ textAlign: 'left', marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                <i className="pi pi-star" style={{ marginRight: '0.5rem' }}></i>
                Características Principales
              </h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
                  Conexiones SSH múltiples con pestañas
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
                  Explorador de archivos remoto integrado
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
                  Drag & drop para organización de pestañas
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
                  Iconos automáticos por distribución Linux
                </div>
                <div>
                  <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
                  Sistema de overflow inteligente para pestañas
                </div>
              </div>
            </div>

            <Divider />

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
              <p style={{ margin: '0' }}>
                © 2025 NodeTerm - Desarrollado con ❤️ usando Electron y React
              </p>
            </div>
          </div>
        </TabPanel>
      </TabView>

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