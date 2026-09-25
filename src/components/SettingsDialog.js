import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { Toast } from 'primereact/toast';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { useDialogResize } from '../hooks/useDialogResize';
import SettingsSidebarNav from './SettingsSidebarNav';
import { STORAGE_KEYS } from '../utils/constants';
import {
  buildDefaultTerminalOptions,
  getPlatformDefaultTerminalType,
  sanitizeAndPersistDefaultTerminal
} from '../utils/defaultLocalTerminal';
import { persistSyncedSetting } from '../utils/persistSyncedSetting';

// Tabs
import GeneralSettingsTab from './settings/tabs/GeneralSettingsTab';
import SecuritySettingsTab from './settings/tabs/SecuritySettingsTab';
import UsersSettingsTab from './UsersSettingsTab';
import AppearanceSettingsTab from './settings/tabs/AppearanceSettingsTab';
import AppsTab from './AppsTab';
import UpdatesSettingsTab from './settings/tabs/UpdatesSettingsTab';
import SyncSettingsTab from './settings/tabs/SyncSettingsTab';
import ImportExportSettingsTab from './settings/tabs/ImportExportSettingsTab';
import IntegrationsSettingsTab from './settings/tabs/IntegrationsSettingsTab';
import InfoSettingsTab from './settings/tabs/InfoSettingsTab';

import '../styles/components/settings-sidebar.css';
import '../styles/components/tree-themes.css';

const SettingsContent = ({
  isEmbedded = false,
  initialMainTab = null,
  initialSubTab = null,
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
  uiFont,
  setUiFont,
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
  const [wizardInitialSource, setWizardInitialSource] = useState(null);
  const [wizardInitialStep, setWizardInitialStep] = useState(0);

  // Hook para internacionalización
  const { t } = useTranslation('settings');

  // Estados para navegación con sidebar vertical
  const [activeMainTab, setActiveMainTab] = useState(initialMainTab || propMainTab || 'general');
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab || propSubTab || null);

  // Sincronizar sección activa desde props si está embebido o initialTab provisto
  useEffect(() => {
    const main = propMainTab || initialMainTab;
    const sub = propSubTab || initialSubTab;
    if (main) {
      if (main === 'rdp') {
        setActiveMainTab('apps');
        setActiveSubTab('rdp');
      } else if (main === 'clientes-ia') {
        setActiveMainTab('apps');
        setActiveSubTab('ai');
      } else {
        setActiveMainTab(main);
        setActiveSubTab(sub || null);
      }
    }
  }, [isEmbedded, propMainTab, propSubTab, initialMainTab, initialSubTab]);

  // Función para convertir el tab seleccionado al índice del TabView PRINCIPAL
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
      'integraciones': 8,
      'informacion': 9
    };
    return mainTabMap[mainTab] || 0;
  };

  // Función para obtener el índice del TabPanel anidado DENTRO de su padre
  const getSubTabIndexFromTab = (mainTab, subTab) => {
    if (!subTab) return null;
    const subTabMap = {
      // Dentro de Seguridad (índice 1)
      'clave-maestra': { parent: 'seguridad', index: 0 },
      'auditoria': { parent: 'seguridad', index: 1 },
      'nueva-pestana': { parent: 'seguridad', index: 2 },
      // Dentro de Apariencia (índice 3)
      'interfaz': { parent: 'apariencia', index: 0 },
      'layouts': { parent: 'apariencia', index: 1 },
      'pestanas': { parent: 'apariencia', index: 2 },
      'pagina-inicio': { parent: 'apariencia', index: 3 },
      'terminal': { parent: 'apariencia', index: 4 },
      'status-bar': { parent: 'apariencia', index: 5 },
      'explorador-sesiones': { parent: 'apariencia', index: 6 },
      'explorador-archivos': { parent: 'apariencia', index: 7 },
      'presets': { parent: 'apariencia', index: 8 },
      // Dentro de Actualizaciones (índice 5)
      'nodeterm': { parent: 'actualizaciones', index: 0 },
      'servidores-docker': { parent: 'actualizaciones', index: 1 },
      // Dentro de Integraciones (índice 8)
      'mcp': { parent: 'integraciones', index: 0 }
    };
    return subTabMap[subTab];
  };

  // Actualizar activeIndex cuando cambia el tab seleccionado
  useEffect(() => {
    const mainIndex = getMainTabIndexFromTab(activeMainTab);
    setActiveIndex(mainIndex);
  }, [activeMainTab, activeSubTab]);

  // Escuchar evento para abrir pestañas específicas desde otros componentes
  useEffect(() => {
    const handleOpenSettingsTab = (e) => {
      const { tab, subTab } = e.detail || {};
      if (!tab) return;

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
        'apps': 'apps',
        'cygwin': 'apps',
        'import-export': 'importar-exportar',
        'import': 'importar-exportar',
        'export': 'importar-exportar',
        'importar-exportar': 'importar-exportar',
        'integrations': 'integraciones',
        'integraciones': 'integraciones'
      };

      const targetTab = tabMap[tab] || tab;
      setActiveMainTab(targetTab);

      if (tab === 'cygwin' && !subTab) {
        setActiveSubTab('cygwin');
      } else if (subTab) {
        setActiveSubTab(subTab);
      }

      if (targetTab === 'importar-exportar') {
        if (subTab === 'wizard') {
          setWizardInitialSource(null);
          setWizardInitialStep(0);
        } else if (subTab === 'import') {
          setWizardInitialSource('nodeterm');
          setWizardInitialStep(1);
        } else if (subTab === 'export') {
          setWizardInitialSource('export_nodeterm');
          setWizardInitialStep(1);
        }
      }
    };

    window.addEventListener('open-settings-tab', handleOpenSettingsTab);
    return () => window.removeEventListener('open-settings-tab', handleOpenSettingsTab);
  }, []);

  // Estados para terminal por defecto y detección de entorno
  const [defaultLocalTerminal, setDefaultLocalTerminal] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEFAULT_LOCAL_TERMINAL);
    if (saved) return saved;
    return getPlatformDefaultTerminalType();
  });

  const [wslDistributions, setWslDistributions] = useState([]);
  const [wslDistributionsLoaded, setWslDistributionsLoaded] = useState(() => {
    const p = window.electron?.platform || 'unknown';
    return p !== 'win32';
  });
  const [cygwinDetectionDone, setCygwinDetectionDone] = useState(() => {
    const p = window.electron?.platform || 'unknown';
    return p !== 'win32';
  });
  const [cygwinAvailable, setCygwinAvailable] = useState(false);
  const [platform, setPlatform] = useState(() => window.electron?.platform || 'unknown');

  const [cygwinClientEnabled, setCygwinClientEnabled] = useState(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
      return cfg.cygwin === true;
    } catch {
      return false;
    }
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

  useEffect(() => {
    if (window.electron?.platform) {
      setPlatform(window.electron.platform);
    }
  }, []);

  useEffect(() => {
    setWslDistributionsLoaded(platform !== 'win32');
    const detectWSLDistributions = async () => {
      try {
        if (platform === 'win32' && window.electron && window.electron.ipcRenderer) {
          const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
          setWslDistributions(Array.isArray(distributions) ? distributions : []);
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

  useEffect(() => {
    setCygwinDetectionDone(platform !== 'win32');
    const detectCygwin = async () => {
      try {
        if (platform === 'win32' && window.electronAPI) {
          const result = await window.electronAPI.invoke('cygwin:detect');
          setCygwinAvailable(result && typeof result.available === 'boolean' ? result.available : false);
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

  useEffect(() => {
    const onAiClientsConfigChanged = () => {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        setCygwinClientEnabled(cfg.cygwin === true);
        setClaudeClientEnabled(cfg.claude === true);
        setOpenCodeClientEnabled(cfg.opencode === true);
        setCodexCliClientEnabled(cfg.codexcli === true);
        setAntigravityCliClientEnabled(cfg.antigravitycli === true);
        setHermesCliClientEnabled(cfg.hermescli === true);
      } catch { }
    };
    const onStorage = (e) => {
      if (e.key === 'ai_clients_enabled') onAiClientsConfigChanged();
    };

    window.addEventListener('ai-clients-config-changed', onAiClientsConfigChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('ai-clients-config-changed', onAiClientsConfigChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const aiClientsEnabledForDefault = useMemo(() => ({
    cygwin: cygwinClientEnabled,
    claude: claudeClientEnabled,
    opencode: openCodeClientEnabled,
    codexcli: codexCliClientEnabled,
    antigravitycli: antigravityCliClientEnabled,
    hermescli: hermesCliClientEnabled
  }), [cygwinClientEnabled, claudeClientEnabled, openCodeClientEnabled, codexCliClientEnabled, antigravityCliClientEnabled, hermesCliClientEnabled]);

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

  const handleDefaultTerminalChange = useCallback((terminalType) => {
    if (!terminalType || typeof terminalType !== 'string') return;
    setDefaultLocalTerminal(terminalType);
    persistSyncedSetting(STORAGE_KEYS.DEFAULT_LOCAL_TERMINAL, terminalType, { immediate: true });
    window.dispatchEvent(new CustomEvent('default-terminal-changed', {
      detail: { terminalType }
    }));
  }, []);

  // Hook para redimensionamiento del diálogo
  const { dialogRef, size, startResize } = useDialogResize(
    null,
    { width: 1400, height: 900 },
    { minWidth: 800, minHeight: 500, maxWidth: window.innerWidth - 40, maxHeight: window.innerHeight - 40 },
    visible,
    true
  );

  const localToastRef = useRef(null);
  const toastRef = toast || localToastRef;

  // Calcular altura del contenido dinámicamente
  const [contentHeight, setContentHeight] = useState(() => size.height - 60);

  const getDialogElement = useCallback(() => {
    if (dialogRef.current) {
      if (dialogRef.current instanceof Element || dialogRef.current instanceof HTMLElement) {
        if (typeof dialogRef.current.closest === 'function') {
          try {
            const found = dialogRef.current.closest('.p-dialog');
            if (found) return found;
          } catch (e) { }
        }
      }
    }
    try {
      const dialogs = document.querySelectorAll('.settings-dialog.p-dialog');
      if (dialogs.length > 0) return dialogs[dialogs.length - 1];
    } catch (e) { }
    return null;
  }, [dialogRef]);

  const recalculateContentHeight = useCallback(() => {
    if (!visible) return;
    const dialogElement = getDialogElement();
    if (dialogElement) {
      const headerElement = dialogElement.querySelector('.p-dialog-header');
      const navElement = dialogElement.querySelector('.p-tabview-nav-container');
      const headerHeight = headerElement ? headerElement.offsetHeight : 60;
      const navHeight = navElement ? navElement.offsetHeight : 0;
      const dialogHeight = dialogElement.offsetHeight || size.height;
      setContentHeight(dialogHeight - headerHeight - navHeight);
    } else {
      setContentHeight(size.height - 60);
    }
  }, [visible, getDialogElement, size.height]);

  useEffect(() => {
    if (!visible) return;
    const timeoutId = setTimeout(() => recalculateContentHeight(), 0);
    return () => clearTimeout(timeoutId);
  }, [size.height, size.width, visible, recalculateContentHeight]);

  useEffect(() => {
    if (!visible) return;
    let lastWindowWidth = window.innerWidth;
    let lastWindowHeight = window.innerHeight;

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const isMaximize = Math.abs(currentWidth - lastWindowWidth) > 200 || Math.abs(currentHeight - lastWindowHeight) > 200;
      setTimeout(() => recalculateContentHeight(), isMaximize ? 200 : 50);
      lastWindowWidth = currentWidth;
      lastWindowHeight = currentHeight;
    };

    window.addEventListener('resize', handleResize);
    const checkInterval = setInterval(() => {
      const dialogElement = getDialogElement();
      if (dialogElement && Math.abs(dialogElement.offsetHeight - size.height) > 50) {
        recalculateContentHeight();
      }
    }, 500);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(checkInterval);
    };
  }, [visible, getDialogElement, recalculateContentHeight, size.height]);

  useEffect(() => {
    if (!visible) return;
    const timeoutId = setTimeout(() => {
      const dialogElement = getDialogElement();
      if (dialogElement) {
        dialogElement.style.setProperty('--content-height', `${contentHeight}px`);
      }
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

      {/* Handles de redimensionamiento */}
      {!isEmbedded && (
        <>
          <div className="resize-handle resize-handle-right" onMouseDown={(e) => startResize(e, 'right')} style={{ position: 'absolute', right: '-5px', top: 0, bottom: 0, width: '10px', cursor: 'ew-resize', zIndex: 1002, backgroundColor: 'transparent' }} />
          <div className="resize-handle resize-handle-left" onMouseDown={(e) => startResize(e, 'left')} style={{ position: 'absolute', left: '-5px', top: 0, bottom: 0, width: '10px', cursor: 'ew-resize', zIndex: 1002, backgroundColor: 'transparent' }} />
          <div className="resize-handle resize-handle-bottom" onMouseDown={(e) => startResize(e, 'bottom')} style={{ position: 'absolute', bottom: '-5px', left: 0, right: 0, height: '10px', cursor: 'ns-resize', zIndex: 1002, backgroundColor: 'transparent' }} />
          <div className="resize-handle resize-handle-top" onMouseDown={(e) => startResize(e, 'top')} style={{ position: 'absolute', top: '-5px', left: 0, right: 0, height: '10px', cursor: 'ns-resize', zIndex: 1002, backgroundColor: 'transparent' }} />
          <div className="resize-handle resize-handle-bottom-right" onMouseDown={(e) => startResize(e, 'bottom-right')} style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '15px', height: '15px', cursor: 'se-resize', zIndex: 1003, backgroundColor: 'transparent' }} />
          <div className="resize-handle resize-handle-bottom-left" onMouseDown={(e) => startResize(e, 'bottom-left')} style={{ position: 'absolute', bottom: '-5px', left: '-5px', width: '15px', height: '15px', cursor: 'sw-resize', zIndex: 1003, backgroundColor: 'transparent' }} />
          <div className="resize-handle resize-handle-top-right" onMouseDown={(e) => startResize(e, 'top-right')} style={{ position: 'absolute', top: '-5px', right: '-5px', width: '15px', height: '15px', cursor: 'ne-resize', zIndex: 1003, backgroundColor: 'transparent' }} />
          <div className="resize-handle resize-handle-top-left" onMouseDown={(e) => startResize(e, 'top-left')} style={{ position: 'absolute', top: '-5px', left: '-5px', width: '15px', height: '15px', cursor: 'nw-resize', zIndex: 1003, backgroundColor: 'transparent' }} />
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
            {/* Tab 0: General */}
            <TabPanel header={t('tabs.general')} leftIcon="pi pi-sliders-h" style={{ '--content-height': `${contentHeight}px` }}>
              <div className="settings-tab-outer-wrapper" style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <GeneralSettingsTab
                  contentHeight={contentHeight}
                  defaultLocalTerminal={defaultLocalTerminal}
                  defaultTerminalOptions={defaultTerminalOptions}
                  terminalOptionsReady={terminalOptionsReady}
                  onDefaultTerminalChange={handleDefaultTerminalChange}
                />
              </div>
            </TabPanel>

            {/* Tab 1: Seguridad */}
            <TabPanel
              header={
                <span>
                  <i className="pi pi-shield" style={{ marginRight: 8 }}></i>
                  {t('sidebar.security') || 'Seguridad'}
                </span>
              }
              style={{ '--content-height': `${contentHeight}px` }}
            >
              <div style={{
                height: `${contentHeight}px`,
                maxHeight: `${contentHeight}px`,
                minHeight: `${contentHeight}px`,
                overflow: 'hidden',
                position: 'relative'
              }}>
                <SecuritySettingsTab
                  contentHeight={contentHeight}
                  activeSubTab={activeSubTab}
                  toastRef={toastRef}
                  onHide={onHide}
                  isVisible={visible}
                  onMasterPasswordConfigured={onMasterPasswordConfigured}
                  onMasterPasswordChanged={onMasterPasswordChanged}
                />
              </div>
            </TabPanel>

            {/* Tab 2: Usuarios */}
            <TabPanel header="Usuarios" leftIcon="pi pi-users" style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <UsersSettingsTab
                  nodes={nodes}
                  onUpdatePassword={onUpdateUserPassword}
                  onEditConnection={onEditConnection}
                  masterKey={masterKey}
                />
              </div>
            </TabPanel>

            {/* Tab 3: Apariencia */}
            <TabPanel header={t('tabs.appearance')} leftIcon="pi pi-palette" style={{ '--content-height': `${contentHeight}px` }}>
              <AppearanceSettingsTab
                activeSubTab={activeSubTab}
                toastRef={toastRef}
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
                dockerFontFamily={dockerFontFamily}
                setDockerFontFamily={setDockerFontFamily}
                dockerFontSize={dockerFontSize}
                setDockerFontSize={setDockerFontSize}
                defaultLocalTerminal={defaultLocalTerminal}
                defaultTerminalOptions={defaultTerminalOptions}
                onDefaultTerminalChange={handleDefaultTerminalChange}
                statusBarTheme={statusBarTheme}
                setStatusBarTheme={setStatusBarTheme}
                statusBarIconTheme={statusBarIconTheme}
                setStatusBarIconTheme={setStatusBarIconTheme}
                statusBarPollingInterval={statusBarPollingInterval}
                setStatusBarPollingInterval={setStatusBarPollingInterval}
                statusBarLayout={statusBarLayout}
                setStatusBarLayout={setStatusBarLayout}
                treeTheme={treeTheme}
                setTreeTheme={setTreeTheme}
                iconThemeSidebar={iconThemeSidebar}
                setIconThemeSidebar={setIconThemeSidebar}
                sessionActionIconTheme={sessionActionIconTheme}
                setSessionActionIconTheme={setSessionActionIconTheme}
                sidebarFont={sidebarFont}
                setSidebarFont={setSidebarFont}
                uiFont={uiFont}
                setUiFont={setUiFont}
                sidebarFontSize={sidebarFontSize}
                setSidebarFontSize={setSidebarFontSize}
                sidebarFontColor={sidebarFontColor}
                setSidebarFontColor={setSidebarFontColor}
                folderIconSize={folderIconSize}
                setFolderIconSize={setFolderIconSize}
                connectionIconSize={connectionIconSize}
                setConnectionIconSize={setConnectionIconSize}
                explorerFont={explorerFont}
                setExplorerFont={setExplorerFont}
                explorerFontSize={explorerFontSize}
                setExplorerFontSize={setExplorerFontSize}
                explorerColorTheme={explorerColorTheme}
                setExplorerColorTheme={setExplorerColorTheme}
                iconTheme={iconTheme}
                setIconTheme={setIconTheme}
              />
            </TabPanel>

            {/* Tab 4: Apps */}
            <TabPanel header={<span><i className="pi pi-th-large" style={{ marginRight: 8 }}></i>{t('sidebar.apps') || 'Apps'}</span>} style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <AppsTab
                  themeColors={{ primary: 'var(--primary-color)' }}
                  activeSubTab={activeSubTab}
                  isActive={visible && activeMainTab === 'apps'}
                />
              </div>
            </TabPanel>

            {/* Tab 5: Actualizaciones */}
            <TabPanel header={t('updateChannels.updatesTitle')} leftIcon="pi pi-refresh" style={{ '--content-height': `${contentHeight}px` }}>
              <UpdatesSettingsTab
                contentHeight={contentHeight}
                toastRef={toastRef}
                activeMainTab={activeMainTab}
              />
            </TabPanel>

            {/* Tab 6: Sincronización */}
            <TabPanel header={t('sync.title')} leftIcon="pi pi-cloud" style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <SyncSettingsTab
                  exportTreeToJson={exportTreeToJson}
                  importTreeFromJson={importTreeFromJson}
                  sessionManager={sessionManager}
                />
              </div>
            </TabPanel>

            {/* Tab 7: Importar / Exportar */}
            <TabPanel header={t('sidebar.importExport') || 'Importar / Exportar'} leftIcon="pi pi-arrow-right-arrow-left" style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <ImportExportSettingsTab
                  wizardInitialSource={wizardInitialSource}
                  setWizardInitialSource={setWizardInitialSource}
                  wizardInitialStep={wizardInitialStep}
                  setWizardInitialStep={setWizardInitialStep}
                  handleImportComplete={handleImportComplete}
                  toast={toastRef}
                  nodes={nodes}
                />
              </div>
            </TabPanel>

            {/* Tab 8: Integraciones */}
            <TabPanel header={t('sidebar.integrations') || 'Integraciones'} leftIcon="pi pi-link" style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <IntegrationsSettingsTab toastRef={toastRef} />
              </div>
            </TabPanel>

            {/* Tab 9: Información */}
            <TabPanel header={t('info.title')} leftIcon="pi pi-info-circle" style={{ '--content-height': `${contentHeight}px` }}>
              <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
                <InfoSettingsTab />
              </div>
            </TabPanel>
          </TabView>
        </div>
      </div>
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
      className="app-dialog settings-dialog"
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