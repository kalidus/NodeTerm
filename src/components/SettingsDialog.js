import React, { useState, useEffect } from 'react';
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
import ThemeSelector from './ThemeSelector';
import StatusBarThemeSelector from './StatusBarThemeSelector';
import StatusBarIconThemeSelector from './StatusBarIconThemeSelector';
import SyncSettingsDialog from './SyncSettingsDialog';
import { themes } from '../themes';
import { getVersionInfo } from '../version-info';
import { iconThemes } from '../themes/icon-themes';
import { explorerFonts } from '../themes';
import { uiThemes } from '../themes/ui-themes';
import SecureStorage from '../services/SecureStorage';

const STATUSBAR_HEIGHT_STORAGE_KEY = 'basicapp_statusbar_height';
const LOCAL_FONT_FAMILY_STORAGE_KEY = 'basicapp_local_terminal_font_family';
const LOCAL_FONT_SIZE_STORAGE_KEY = 'basicapp_local_terminal_font_size';
const LOCAL_POWERSHELL_THEME_STORAGE_KEY = 'basicapp_local_powershell_theme';
const LOCAL_LINUX_TERMINAL_THEME_STORAGE_KEY = 'basicapp_local_linux_terminal_theme';

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
  sessionManager
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [versionInfo, setVersionInfo] = useState({ appVersion: '' });
  const [syncDialogVisible, setSyncDialogVisible] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(() => {
    const saved = localStorage.getItem(STATUSBAR_HEIGHT_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 24;
  });

  // RDP settings (persisted in localStorage)
  const [rdpIdleSeconds, setRdpIdleSeconds] = useState(() => {
    const v = parseInt(localStorage.getItem('rdp_idle_threshold_ms') || '60000', 10);
    return Math.max(5, Math.floor(v / 1000));
  });
  const [rdpFreezeSeconds, setRdpFreezeSeconds] = useState(() => {
    const v = parseInt(localStorage.getItem('rdp_freeze_timeout_ms') || '3600000', 10);
    return Math.max(30, Math.floor(v / 1000));
  });
  const [rdpResizeDebounceMs, setRdpResizeDebounceMs] = useState(() => {
    const v = parseInt(localStorage.getItem('rdp_resize_debounce_ms') || '300', 10);
    return Math.max(100, Math.min(2000, v));
  });
  const [rdpResizeAckTimeoutMs, setRdpResizeAckTimeoutMs] = useState(() => {
    const v = parseInt(localStorage.getItem('rdp_resize_ack_timeout_ms') || '1500', 10);
    return Math.max(600, Math.min(5000, v));
  });

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

  useEffect(() => {
    // Obtener la versión real de la app
    const info = getVersionInfo();
    setVersionInfo(info);
  }, []);

  useEffect(() => {
    // Verificar si hay clave maestra guardada
    setHasMasterKey(secureStorage.hasSavedMasterKey());
  }, [secureStorage]);

  // Persist RDP settings
  useEffect(() => {
    const ms = Math.max(5000, (rdpIdleSeconds || 0) * 1000);
    localStorage.setItem('rdp_idle_threshold_ms', String(ms));
  }, [rdpIdleSeconds]);
  useEffect(() => {
    const ms = Math.max(30000, (rdpFreezeSeconds || 0) * 1000);
    localStorage.setItem('rdp_freeze_timeout_ms', String(ms));
  }, [rdpFreezeSeconds]);
  useEffect(() => {
    localStorage.setItem('rdp_resize_debounce_ms', String(Math.max(100, Math.min(2000, rdpResizeDebounceMs || 300))));
  }, [rdpResizeDebounceMs]);
  useEffect(() => {
    localStorage.setItem('rdp_resize_ack_timeout_ms', String(Math.max(600, Math.min(5000, rdpResizeAckTimeoutMs || 1500))));
  }, [rdpResizeAckTimeoutMs]);

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

  const TerminalPreview = () => {
    if (!terminalTheme || !terminalTheme.theme) return null;

    const colors = terminalTheme.theme;

    return (
      <div style={{
        padding: '12px',
        border: '1px solid #ccc',
        borderRadius: '6px',
        marginTop: '10px',
        fontFamily: localFontFamily,
        fontSize: `${localFontSize}px`
      }}>
        <div style={{
          background: (themes[localTerminalTheme]?.theme?.background) || '#000',
          color: (themes[localTerminalTheme]?.theme?.foreground) || '#fff',
          padding: '12px',
          borderRadius: '4px',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: '1.4'
        }}>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: colors.green || '#00ff00' }}>user@hostname</span>
            <span style={{ color: colors.white || '#ffffff' }}>:</span>
            <span style={{ color: colors.blue || '#0000ff' }}>~/project</span>
            <span style={{ color: colors.white || '#ffffff' }}>$ </span>
            <span style={{ color: colors.yellow || '#ffff00' }}>ls -la</span>
          </div>
          <div style={{ color: colors.cyan || '#00ffff', marginBottom: '2px' }}>
            total 24
          </div>
          <div style={{ color: colors.blue || '#0000ff', marginBottom: '2px' }}>
            drwxr-xr-x 3 user user 4096 Dec 25 10:30 .
          </div>
          <div style={{ color: colors.blue || '#0000ff', marginBottom: '2px' }}>
            drwxr-xr-x 5 user user 4096 Dec 25 10:25 ..
          </div>
          <div style={{ color: colors.green || '#00ff00', marginBottom: '2px' }}>
            -rw-r--r-- 1 user user  256 Dec 25 10:30 README.md
          </div>
          <div style={{ color: colors.red || '#ff0000', marginBottom: '4px' }}>
            -rwxr-xr-x 1 user user 1024 Dec 25 10:28 script.sh
          </div>
          <div>
            <span style={{ color: colors.green || '#00ff00' }}>user@hostname</span>
            <span style={{ color: colors.white || '#ffffff' }}>:</span>
            <span style={{ color: colors.blue || '#0000ff' }}>~/project</span>
            <span style={{ color: colors.white || '#ffffff' }}>$ </span>
            <span
              style={{
                background: colors.cursor || colors.foreground || '#ffffff',
                color: colors.background || '#000000',
                animation: 'blink 1s infinite'
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
        minWidth: '600px',
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
        <TabPanel header="Seguridad" leftIcon="pi pi-shield">
          <div style={{ marginTop: 0, padding: 0, width: '100%' }}>
            <TabView className="settings-dialog-subtabview" style={{ marginTop: 0, width: '100%', overflow: 'visible' }}>
              <TabPanel header={<span><i className="pi pi-key" style={{ marginRight: 8 }}></i>Clave Maestra</span>}>
                <div style={{
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minHeight: '50vh',
                  width: '100%'
                }}>
                  <div style={{
                    maxWidth: '500px',
                    width: '100%',
                    textAlign: 'center'
                  }}>
                    <h3 style={{ 
                      margin: '0 0 1rem 0', 
                      color: 'var(--text-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}>
                      <i className="pi pi-shield" style={{ color: 'var(--primary-color)' }}></i>
                      Gestión de Clave Maestra
                    </h3>

                    <p style={{
                      marginBottom: '2rem',
                      color: 'var(--text-color-secondary)',
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }}>
                      La clave maestra protege tus credenciales de sesión con cifrado AES-256. 
                      Se requiere para sincronizar sesiones de forma segura.
                    </p>

                    {/* Estado actual */}
                    <div style={{
                      background: 'var(--surface-card)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      marginBottom: '2rem',
                      textAlign: 'left'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <i className={`pi ${hasMasterKey ? 'pi-check-circle' : 'pi-exclamation-triangle'}`} 
                           style={{ color: hasMasterKey ? '#22c55e' : '#f59e0b' }}></i>
                        <strong>Estado:</strong>
                        <Badge 
                          value={hasMasterKey ? 'Configurada' : 'No configurada'} 
                          severity={hasMasterKey ? 'success' : 'warning'}
                        />
                      </div>
                      
                      {hasMasterKey && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)' }}>
                          <i className="pi pi-info-circle" style={{ marginRight: '0.5rem' }}></i>
                          Las sesiones se cifran automáticamente antes del almacenamiento
                        </div>
                      )}
                    </div>

                    {!hasMasterKey ? (
                      /* Configurar nueva clave maestra */
                      <div style={{ textAlign: 'left' }}>
                        <h4 style={{ color: 'var(--text-color)', marginBottom: '1rem' }}>
                          Configurar Clave Maestra
                        </h4>
                        
                        <div style={{ marginBottom: '1rem' }}>
                          <label htmlFor="master-password" style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'var(--text-color)',
                            fontWeight: '500'
                          }}>
                            Nueva Clave Maestra
                          </label>
                          <Password
                            id="master-password"
                            value={masterPassword}
                            onChange={(e) => setMasterPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            style={{ width: '100%' }}
                            feedback={false}
                            toggleMask
                            disabled={isLoading}
                          />
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                          <label htmlFor="confirm-password" style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'var(--text-color)',
                            fontWeight: '500'
                          }}>
                            Confirmar Clave Maestra
                          </label>
                          <Password
                            id="confirm-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repetir la clave"
                            style={{ width: '100%' }}
                            feedback={false}
                            toggleMask
                            disabled={isLoading}
                          />
                        </div>

                        <Button
                          label={isLoading ? 'Guardando...' : 'Guardar Clave Maestra'}
                          icon={isLoading ? 'pi pi-spin pi-spinner' : 'pi pi-save'}
                          onClick={handleSaveMasterPassword}
                          disabled={!validateMasterPassword() || isLoading}
                          style={{ width: '100%' }}
                          className="p-button-success"
                        />
                      </div>
                    ) : (
                      /* Cambiar clave maestra existente */
                      <div style={{ textAlign: 'left' }}>
                        <h4 style={{ color: 'var(--text-color)', marginBottom: '1rem' }}>
                          Cambiar Clave Maestra
                        </h4>
                        
                        <div style={{ marginBottom: '1rem' }}>
                          <label htmlFor="current-password" style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'var(--text-color)',
                            fontWeight: '500'
                          }}>
                            Clave Actual
                          </label>
                          <Password
                            id="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Clave maestra actual"
                            style={{ width: '100%' }}
                            feedback={false}
                            toggleMask
                            disabled={isLoading}
                          />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                          <label htmlFor="new-password" style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'var(--text-color)',
                            fontWeight: '500'
                          }}>
                            Nueva Clave Maestra
                          </label>
                          <Password
                            id="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nueva clave (mínimo 6 caracteres)"
                            style={{ width: '100%' }}
                            feedback={false}
                            toggleMask
                            disabled={isLoading}
                          />
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                          <label htmlFor="confirm-new-password" style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'var(--text-color)',
                            fontWeight: '500'
                          }}>
                            Confirmar Nueva Clave
                          </label>
                          <Password
                            id="confirm-new-password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="Repetir la nueva clave"
                            style={{ width: '100%' }}
                            feedback={false}
                            toggleMask
                            disabled={isLoading}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <Button
                            label={isLoading ? 'Cambiando...' : 'Cambiar Clave'}
                            icon={isLoading ? 'pi pi-spin pi-spinner' : 'pi pi-key'}
                            onClick={handleChangeMasterPassword}
                            disabled={!validatePasswordChange() || isLoading}
                            style={{ flex: 1 }}
                            className="p-button-warning"
                          />
                          
                          <Button
                            label="Eliminar"
                            icon="pi pi-trash"
                            onClick={handleRemoveMasterKey}
                            disabled={isLoading}
                            className="p-button-danger p-button-outlined"
                          />
                        </div>
                      </div>
                    )}
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
                      max={40}
                      step={1}
                      style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 4 }}>
                      {statusBarHeight} px (mínimo 20, máximo 40)
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
                        <span key={idx}>{icon}</span>
                      ))}
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
                            <span style={{ fontFamily: option.value }}>{option.label}</span>
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
                    <div style={{ marginTop: 12, fontFamily: explorerFont, fontSize: `${explorerFontSize}px`, textAlign: 'center' }}>
                      Ejemplo de fuente: <span style={{ fontWeight: 'bold' }}>{explorerFont}</span>
                    </div>
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
            </TabView>
          </div>
        </TabPanel>

        <TabPanel header={<span><i className="pi pi-desktop" style={{ marginRight: 8 }}></i>RDP</span>}>
          <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '40vh', width: '100%' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
              <i className="pi pi-sliders-h" style={{ marginRight: '0.5rem', color: '#4fc3f7' }}></i>
              Umbrales de actividad y reactivación
            </h3>

            <div style={{ width: '100%', maxWidth: 520, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label htmlFor="rdp-idle-seconds" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Umbral de inactividad (segundos)
                </label>
                <small style={{ display: 'block', marginBottom: 8, color: 'var(--text-color-secondary)' }}>
                  Tras superar este tiempo sin actividad (teclado/ratón/sync), el siguiente resize hará un warm‑up o reconexión.
                </small>
                <InputNumber
                  id="rdp-idle-seconds"
                  value={rdpIdleSeconds}
                  onValueChange={e => setRdpIdleSeconds(Math.max(5, Math.min(7200, e.value || 5)))}
                  min={5}
                  max={7200}
                  showButtons
                  buttonLayout="horizontal"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 28 }}>
                  {rdpIdleSeconds} s (mín. 5)
                </div>
              </div>

              <div>
                <label htmlFor="rdp-freeze-seconds" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Umbral de actividad de la sesión (segundos)
                </label>
                <small style={{ display: 'block', marginBottom: 8, color: 'var(--text-color-secondary)' }}>
                  Si no hay actividad durante este tiempo, puede intentarse una reconexión automática.
                </small>
                <InputNumber
                  id="rdp-freeze-seconds"
                  value={rdpFreezeSeconds}
                  onValueChange={e => setRdpFreezeSeconds(Math.max(30, Math.min(86400, e.value || 30)))}
                  min={30}
                  max={86400}
                  showButtons
                  buttonLayout="horizontal"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 28 }}>
                  {rdpFreezeSeconds} s (mín. 30)
                </div>
              </div>

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
          </div>
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
                  <span style={{ color: 'var(--text-color-secondary)' }}>v25.x</span>
                </div>
                <div>
                  <strong>Node.js:</strong>
                  <br />
                  <span style={{ color: 'var(--text-color-secondary)' }}>v20.x</span>
                </div>
                <div>
                  <strong>Chromium:</strong>
                  <br />
                  <span style={{ color: 'var(--text-color-secondary)' }}>v114.x</span>
                </div>
                <div>
                  <strong>Compilación:</strong>
                  <br />
                  <span style={{ color: 'var(--text-color-secondary)' }}>jun 2024</span>
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