import React, { useState, useMemo, useCallback } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Slider } from 'primereact/slider';
import { statusBarThemes } from '../themes/status-bar-themes';
import { statusBarIconThemes } from '../themes/statusbar-icon-themes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faArrowDown, faArrowUp, faServer } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from '../i18n/hooks/useTranslation';
import {
  STATUSBAR_CONFIGURABLE_ITEMS,
  getVisibleStatusBarOrder,
  DEFAULT_STATUSBAR_LAYOUT
} from '../config/statusBarItems';
import '../styles/components/status-bar-settings.css';

// Storage keys
const STORAGE_KEYS = {
  // Global
  HEIGHT: 'basicapp_statusbar_height',
  POLLING_INTERVAL: 'statusBarPollingInterval',
  STATUSBAR_VISIBLE: 'homeTab_statusBarVisible',
  // SSH
  SSH_THEME: 'basicapp_statusbar_theme',
  SSH_ICON_THEME: 'basicapp_ssh_statusbar_icon_theme',
  // PowerShell
  POWERSHELL_THEME: 'localPowerShellStatusBarTheme',
  POWERSHELL_ICON_THEME: 'basicapp_powershell_statusbar_icon_theme',
  // Linux
  LINUX_THEME: 'localLinuxStatusBarTheme',
  LINUX_ICON_THEME: 'basicapp_linux_statusbar_icon_theme',
  // Docker
  DOCKER_THEME: 'localDockerStatusBarTheme',
  DOCKER_ICON_THEME: 'basicapp_docker_statusbar_icon_theme',
  // Cygwin
  CYGWIN_THEME: 'localCygwinStatusBarTheme',
  CYGWIN_ICON_THEME: 'basicapp_cygwin_statusbar_icon_theme'
};

// Terminal types for Status Bar
const TERMINAL_TYPES = [
  { id: 'ssh', name: 'SSH', icon: 'pi pi-server', iconClass: 'ssh' },
  { id: 'powershell', name: 'PowerShell', icon: 'pi pi-microsoft', iconClass: 'powershell' },
  { id: 'linux', name: 'Linux / WSL', icon: 'pi pi-desktop', iconClass: 'linux' },
  { id: 'docker', name: 'Docker', icon: 'pi pi-box', iconClass: 'docker' },
  { id: 'cygwin', name: 'Cygwin', icon: 'pi pi-desktop', iconClass: 'cygwin' }
];

// Preview tabs
const PREVIEW_TABS = [
  { id: 'ssh', label: 'SSH', icon: 'pi pi-server' },
  { id: 'powershell', label: 'PS', icon: 'pi pi-microsoft' },
  { id: 'linux', label: 'Linux', icon: 'pi pi-desktop' },
  { id: 'docker', label: 'Docker', icon: 'pi pi-box' },
  { id: 'cygwin', label: 'Cygwin', icon: 'pi pi-desktop' }
];

const StatusBarSettingsTab = ({
  statusBarTheme,
  setStatusBarTheme,
  statusBarIconTheme,
  setStatusBarIconTheme,
  statusBarPollingInterval,
  setStatusBarPollingInterval,
  statusBarLayout = DEFAULT_STATUSBAR_LAYOUT,
  setStatusBarLayout
}) => {
  const { t } = useTranslation('settings');

  // Global settings
  const [statusBarHeight, setStatusBarHeight] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HEIGHT);
    return saved ? parseInt(saved, 10) : 32;
  });
  const [statusBarVisible, setStatusBarVisible] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STATUSBAR_VISIBLE);
    return saved !== null ? saved === 'true' : true;
  });

  // Theme per terminal type (colors)
  const [sshTheme, setSshTheme] = useState(() => statusBarTheme || 'Default Dark');
  const [powershellTheme, setPowershellTheme] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.POWERSHELL_THEME) || 'Monokai'
  );
  const [linuxTheme, setLinuxTheme] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.LINUX_THEME) || 'Dracula'
  );
  const [dockerTheme, setDockerTheme] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.DOCKER_THEME) || 'One Dark'
  );
  const [cygwinTheme, setCygwinTheme] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.CYGWIN_THEME) || 'Default Dark'
  );

  // Icon theme per terminal type
  const [sshIconTheme, setSshIconTheme] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.SSH_ICON_THEME) || statusBarIconTheme || 'classic'
  );
  const [powershellIconTheme, setPowershellIconTheme] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.POWERSHELL_ICON_THEME) || 'classic'
  );
  const [linuxIconTheme, setLinuxIconTheme] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.LINUX_ICON_THEME) || 'classic'
  );
  const [dockerIconTheme, setDockerIconTheme] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.DOCKER_ICON_THEME) || 'classic'
  );
  const [cygwinIconTheme, setCygwinIconTheme] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.CYGWIN_ICON_THEME) || 'classic'
  );

  // Preview state
  const [activePreviewTab, setActivePreviewTab] = useState('ssh');

  // Options
  const themeOptions = useMemo(() =>
    Object.keys(statusBarThemes).map(name => ({ label: name, value: name })), []
  );
  const iconThemeOptions = useMemo(() =>
    Object.entries(statusBarIconThemes).map(([key, theme]) => ({
      label: theme.name,
      value: key
    })), []
  );

  // Handlers for global settings
  const handleHeightChange = useCallback((value) => {
    setStatusBarHeight(value);
    localStorage.setItem(STORAGE_KEYS.HEIGHT, value.toString());
    document.documentElement.style.setProperty('--statusbar-height', `${value}px`);
  }, []);

  const handlePollingIntervalChange = useCallback((value) => {
    const clampedValue = Math.max(1, Math.min(20, value || 1));
    setStatusBarPollingInterval(clampedValue);
    localStorage.setItem(STORAGE_KEYS.POLLING_INTERVAL, clampedValue.toString());
  }, [setStatusBarPollingInterval]);

  const hiddenSet = useMemo(() => new Set(statusBarLayout.hidden || []), [statusBarLayout.hidden]);

  const handleToggleStatusBarItem = useCallback((itemId) => {
    if (!setStatusBarLayout) return;
    setStatusBarLayout((prev) => {
      const hidden = new Set(prev.hidden || []);
      if (hidden.has(itemId)) {
        hidden.delete(itemId);
      } else {
        hidden.add(itemId);
      }
      return { ...prev, hidden: [...hidden] };
    });
  }, [setStatusBarLayout]);

  const handleMoveStatusBarItem = useCallback((itemId, direction) => {
    if (!setStatusBarLayout) return;
    setStatusBarLayout((prev) => {
      const order = [...(prev.order || DEFAULT_STATUSBAR_LAYOUT.order)];
      const index = order.indexOf(itemId);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return prev;
      [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
      return { ...prev, order };
    });
  }, [setStatusBarLayout]);

  const handleResetStatusBarLayout = useCallback(() => {
    if (!setStatusBarLayout) return;
    setStatusBarLayout({ ...DEFAULT_STATUSBAR_LAYOUT });
  }, [setStatusBarLayout]);

  const handleStatusBarVisibleChange = useCallback((checked) => {
    setStatusBarVisible(checked);
    localStorage.setItem(STORAGE_KEYS.STATUSBAR_VISIBLE, checked.toString());
    // Disparar evento personalizado para que HomeTab lo detecte
    window.dispatchEvent(new CustomEvent('statusbar-visibility-changed', {
      detail: { visible: checked }
    }));
    // También disparar StorageEvent para compatibilidad con otras ventanas
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.STATUSBAR_VISIBLE,
      newValue: checked.toString()
    }));
  }, []);

  // Get/Set theme for each terminal type
  const getThemeForType = useCallback((type) => {
    switch (type) {
      case 'ssh': return sshTheme;
      case 'powershell': return powershellTheme;
      case 'linux': return linuxTheme;
      case 'docker': return dockerTheme;
      case 'cygwin': return cygwinTheme;
      default: return 'Default Dark';
    }
  }, [sshTheme, powershellTheme, linuxTheme, dockerTheme, cygwinTheme]);

  const getIconThemeForType = useCallback((type) => {
    switch (type) {
      case 'ssh': return sshIconTheme;
      case 'powershell': return powershellIconTheme;
      case 'linux': return linuxIconTheme;
      case 'docker': return dockerIconTheme;
      case 'cygwin': return cygwinIconTheme;
      default: return 'classic';
    }
  }, [sshIconTheme, powershellIconTheme, linuxIconTheme, dockerIconTheme, cygwinIconTheme]);

  const handleThemeChange = useCallback((type, themeName) => {
    switch (type) {
      case 'ssh':
        setSshTheme(themeName);
        setStatusBarTheme(themeName);
        localStorage.setItem(STORAGE_KEYS.SSH_THEME, themeName);
        break;
      case 'powershell':
        setPowershellTheme(themeName);
        localStorage.setItem(STORAGE_KEYS.POWERSHELL_THEME, themeName);
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEYS.POWERSHELL_THEME,
          newValue: themeName
        }));
        break;
      case 'linux':
        setLinuxTheme(themeName);
        localStorage.setItem(STORAGE_KEYS.LINUX_THEME, themeName);
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEYS.LINUX_THEME,
          newValue: themeName
        }));
        break;
      case 'docker':
        setDockerTheme(themeName);
        localStorage.setItem(STORAGE_KEYS.DOCKER_THEME, themeName);
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEYS.DOCKER_THEME,
          newValue: themeName
        }));
        break;
      case 'cygwin':
        setCygwinTheme(themeName);
        localStorage.setItem(STORAGE_KEYS.CYGWIN_THEME, themeName);
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEYS.CYGWIN_THEME,
          newValue: themeName
        }));
        break;
      default: break;
    }
  }, [setStatusBarTheme]);

  const handleIconThemeChange = useCallback((type, iconThemeName) => {
    switch (type) {
      case 'ssh':
        setSshIconTheme(iconThemeName);
        setStatusBarIconTheme(iconThemeName);
        localStorage.setItem(STORAGE_KEYS.SSH_ICON_THEME, iconThemeName);
        // Also update global for backwards compatibility
        localStorage.setItem('basicapp_statusbar_icon_theme', iconThemeName);
        break;
      case 'powershell':
        setPowershellIconTheme(iconThemeName);
        localStorage.setItem(STORAGE_KEYS.POWERSHELL_ICON_THEME, iconThemeName);
        break;
      case 'linux':
        setLinuxIconTheme(iconThemeName);
        localStorage.setItem(STORAGE_KEYS.LINUX_ICON_THEME, iconThemeName);
        break;
      case 'docker':
        setDockerIconTheme(iconThemeName);
        localStorage.setItem(STORAGE_KEYS.DOCKER_ICON_THEME, iconThemeName);
        break;
      case 'cygwin':
        setCygwinIconTheme(iconThemeName);
        localStorage.setItem(STORAGE_KEYS.CYGWIN_ICON_THEME, iconThemeName);
        break;
      default: break;
    }
  }, [setStatusBarIconTheme]);

  // Get preview data
  const getPreviewTheme = useCallback((type) => {
    const themeName = getThemeForType(type);
    return statusBarThemes[themeName] || statusBarThemes['Default Dark'];
  }, [getThemeForType]);

  const getPreviewIconTheme = useCallback((type) => {
    const iconThemeName = getIconThemeForType(type);
    return statusBarIconThemes[iconThemeName] || statusBarIconThemes.classic;
  }, [getIconThemeForType]);

  // Mini color palette preview
  const ColorPaletteMini = ({ themeName }) => {
    const theme = statusBarThemes[themeName];
    if (!theme) return null;
    const colors = theme.colors;
    const paletteColors = [
      colors.cpuBarColor,
      colors.memoryBarColor,
      colors.diskBarColor,
      colors.networkDownColor,
      colors.networkUpColor
    ];
    return (
      <div className="statusbar-palette-mini">
        {paletteColors.map((color, idx) => (
          <div
            key={idx}
            className="statusbar-palette-dot"
            style={{ background: color }}
            title={color}
          />
        ))}
      </div>
    );
  };

  // Icon theme preview mini
  const IconThemeMini = ({ iconThemeName }) => {
    const theme = statusBarIconThemes[iconThemeName];
    if (!theme) return null;
    return (
      <div className="statusbar-icons-mini">
        <span style={{ color: theme.colors.cpu }}>{theme.icons.cpu}</span>
        <span style={{ color: theme.colors.memory }}>{theme.icons.memory}</span>
        <span style={{ color: theme.colors.disk }}>{theme.icons.disk}</span>
      </div>
    );
  };

  const previewVisibleOrder = useMemo(
    () => getVisibleStatusBarOrder(statusBarLayout),
    [statusBarLayout]
  );

  const renderPreviewItem = useCallback((itemId, type, colors, iconTheme) => {
    const hostnames = {
      ssh: 'server-01',
      powershell: 'DESKTOP-PC',
      linux: 'ubuntu@wsl',
      docker: 'container-01',
      cygwin: 'cygwin@win'
    };
    switch (itemId) {
      case 'host':
        return (
          <div key="host" className="statusbar-preview-item">
            <span style={{ color: colors.iconColor }}>🐧</span>
            <span>{hostnames[type]}</span>
          </div>
        );
      case 'cpu':
        return (
          <div key="cpu" className="statusbar-preview-item">
            <span style={{ color: iconTheme.colors.cpu }}>{iconTheme.icons.cpu}</span>
            <span>45%</span>
            <div
              className="statusbar-preview-gauge"
              style={{ background: `linear-gradient(to right, ${colors.cpuBarColor} 45%, ${colors.border} 45%)` }}
            />
          </div>
        );
      case 'memory':
        return (
          <div key="memory" className="statusbar-preview-item">
            <span style={{ color: iconTheme.colors.memory }}>{iconTheme.icons.memory}</span>
            <span>2.1GB / 8GB</span>
          </div>
        );
      case 'gpu':
        return (
          <div key="gpu" className="statusbar-preview-item">
            <span style={{ color: iconTheme.colors.memory }}>GPU</span>
            <span>4GB / 8GB</span>
          </div>
        );
      case 'network':
        return (
          <div key="network" className="statusbar-preview-item">
            <FontAwesomeIcon icon={faArrowDown} style={{ color: colors.networkDownColor, fontSize: '9px' }} />
            <span>1.2MB/s</span>
            <FontAwesomeIcon icon={faArrowUp} style={{ color: colors.networkUpColor, fontSize: '9px' }} />
            <span>256KB/s</span>
          </div>
        );
      case 'diskLocal':
        return (
          <div key="diskLocal" className="statusbar-preview-item">
            <span style={{ color: iconTheme.colors.disk }}>{iconTheme.icons.disk}</span>
            <span>Local 67%</span>
          </div>
        );
      case 'diskNetwork':
        return (
          <div key="diskNetwork" className="statusbar-preview-item">
            <span style={{ color: iconTheme.colors.disk }}>{iconTheme.icons.disk}</span>
            <span>Red 42%</span>
          </div>
        );
      case 'uptime':
        return (
          <div key="uptime" className="statusbar-preview-item">
            <FontAwesomeIcon icon={faClock} style={{ color: colors.iconColor, fontSize: '10px' }} />
            <span>3d 12h</span>
          </div>
        );
      case 'ip':
        return (
          <div key="ip" className="statusbar-preview-item">
            <FontAwesomeIcon icon={faServer} style={{ color: colors.iconColor, fontSize: '10px' }} />
            <span>192.168.1.100</span>
          </div>
        );
      case 'version':
        return (
          <div key="version" className="statusbar-preview-item">
            <span>v1.0.0</span>
          </div>
        );
      default:
        return null;
    }
  }, []);

  const StatusBarPreview = ({ type }) => {
    const theme = getPreviewTheme(type);
    const iconTheme = getPreviewIconTheme(type);
    if (!theme || !theme.colors) return null;
    const colors = theme.colors;

    return (
      <div
        className="statusbar-preview-bar"
        style={{
          background: colors.background,
          color: colors.text,
          borderColor: colors.border,
          height: `${statusBarHeight}px`
        }}
      >
        {previewVisibleOrder.map((itemId) => renderPreviewItem(itemId, type, colors, iconTheme))}
      </div>
    );
  };

  return (
    <div className="statusbar-settings-container">
      <div className="statusbar-settings-section statusbar-unified-section">
        <div className="statusbar-section-header statusbar-section-header-compact">
          <div className="statusbar-section-icon">
            <i className="pi pi-sliders-h"></i>
          </div>
          <div className="statusbar-section-info">
            <h3 className="statusbar-section-title">Barra de estado</h3>
          </div>
        </div>
        <div className="statusbar-section-content statusbar-section-content-integrated">
          <div className="statusbar-global-row statusbar-global-row-inline">
            <div className="statusbar-setting-group">
              <span className="statusbar-mini-label">Altura</span>
              <div className="statusbar-height-control">
                <Slider
                  value={statusBarHeight}
                  onChange={(e) => handleHeightChange(e.value)}
                  min={20}
                  max={48}
                  step={2}
                  className="statusbar-height-slider"
                />
                <span className="statusbar-height-value">{statusBarHeight}px</span>
              </div>
            </div>
            <div className="statusbar-setting-group">
              <span className="statusbar-mini-label">Actualización</span>
              <div className="statusbar-update-control">
                <Dropdown
                  value={statusBarPollingInterval}
                  options={[
                    { label: '1s', value: 1 },
                    { label: '2s', value: 2 },
                    { label: '3s', value: 3 },
                    { label: '4s', value: 4 },
                    { label: '5s', value: 5 },
                    { label: '6s', value: 6 },
                    { label: '8s', value: 8 },
                    { label: '10s', value: 10 },
                    { label: '15s', value: 15 },
                    { label: '20s', value: 20 }
                  ]}
                  onChange={(e) => handlePollingIntervalChange(e.value)}
                  className="statusbar-update-dropdown"
                  placeholder="Seleccionar"
                />
              </div>
            </div>
            <div className="statusbar-setting-group statusbar-toggle-group">
              <span className="statusbar-mini-label statusbar-label-normal">Visible en inicio</span>
              <div className="statusbar-network-disks-control">
                <div
                  className={`statusbar-toggle-switch ${statusBarVisible ? 'active' : ''}`}
                  onClick={() => handleStatusBarVisibleChange(!statusBarVisible)}
                  title={statusBarVisible ? 'Ocultar barra de estado' : 'Mostrar barra de estado'}
                />
              </div>
            </div>
          </div>

          <div className="statusbar-integrated-panel">
          {/* Selector de Pestañas de Terminales */}
          <div className="statusbar-preview-tabs">
            {TERMINAL_TYPES.map((tab) => (
              <button
                key={tab.id}
                className={`statusbar-preview-tab ${activePreviewTab === tab.id ? 'active' : ''}`}
                onClick={() => setActivePreviewTab(tab.id)}
              >
                <i className={tab.icon}></i>
                {tab.name}
              </button>
            ))}
          </div>

          <div className="statusbar-preview-content">
            <StatusBarPreview type={activePreviewTab} />

            <div className="statusbar-items-editor">
              <div className="statusbar-items-editor-head">
                <span className="statusbar-items-editor-title">{t('statusBar.itemsSectionTitle')}</span>
                <span className="statusbar-items-editor-hint">{t('statusBar.itemsSectionHint')}</span>
                {setStatusBarLayout && (
                  <button
                    type="button"
                    className="statusbar-items-reset-btn"
                    onClick={handleResetStatusBarLayout}
                    title={t('statusBar.resetLayout')}
                  >
                    <i className="pi pi-refresh" />
                    {t('statusBar.resetLayout')}
                  </button>
                )}
              </div>
              <div className="statusbar-items-chips" role="list">
                {(statusBarLayout.order || DEFAULT_STATUSBAR_LAYOUT.order).map((itemId, index, orderArr) => {
                  const meta = STATUSBAR_CONFIGURABLE_ITEMS.find((item) => item.id === itemId);
                  if (!meta) return null;
                  const isVisible = !hiddenSet.has(itemId);
                  const shortKey = meta.shortLabelKey || meta.labelKey;
                  return (
                    <div
                      key={itemId}
                      className={`statusbar-item-chip ${isVisible ? 'is-on' : 'is-off'}`}
                      role="listitem"
                      title={t(meta.labelKey)}
                    >
                      <button
                        type="button"
                        className="statusbar-item-chip-nudge"
                        disabled={index === 0}
                        onClick={() => handleMoveStatusBarItem(itemId, 'up')}
                        aria-label={t('statusBar.moveUp')}
                      >
                        <i className="pi pi-chevron-left" />
                      </button>
                      <button
                        type="button"
                        className="statusbar-item-chip-label"
                        onClick={() => handleToggleStatusBarItem(itemId)}
                        aria-pressed={isVisible}
                      >
                        {t(shortKey)}
                      </button>
                      <button
                        type="button"
                        className="statusbar-item-chip-nudge"
                        disabled={index === orderArr.length - 1}
                        onClick={() => handleMoveStatusBarItem(itemId, 'down')}
                        aria-label={t('statusBar.moveDown')}
                      >
                        <i className="pi pi-chevron-right" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controles de Configuración del Terminal Activo */}
            <div className="statusbar-active-config-row">
              <div className="statusbar-theme-selector color-selector">
                <span className="statusbar-selector-label">Paleta de Colores</span>
                <Dropdown
                  value={getThemeForType(activePreviewTab)}
                  options={themeOptions}
                  onChange={(e) => handleThemeChange(activePreviewTab, e.value)}
                  placeholder="Seleccionar Tema"
                  className="statusbar-dropdown-compact"
                />
                <ColorPaletteMini themeName={getThemeForType(activePreviewTab)} />
              </div>

              <div className="statusbar-theme-selector icon-selector">
                <span className="statusbar-selector-label">Estilo de Iconos</span>
                <Dropdown
                  value={getIconThemeForType(activePreviewTab)}
                  options={iconThemeOptions}
                  onChange={(e) => handleIconThemeChange(activePreviewTab, e.value)}
                  placeholder="Seleccionar Iconos"
                  className="statusbar-dropdown-compact"
                />
                <IconThemeMini iconThemeName={getIconThemeForType(activePreviewTab)} />
              </div>
            </div>

            {/* Detalle de Colores de la Paleta */}
            <div className="statusbar-preview-info">
              <div className="statusbar-preview-info-left">
                <span>
                  <i className="pi pi-palette"></i>
                  Tema: {getThemeForType(activePreviewTab)}
                </span>
                <span>
                  <i className="pi pi-star"></i>
                  Iconos: {statusBarIconThemes[getIconThemeForType(activePreviewTab)]?.name || 'Clásico'}
                </span>
              </div>
              <div className="statusbar-preview-palette">
                {(() => {
                  const theme = getPreviewTheme(activePreviewTab);
                  if (!theme?.colors) return null;
                  const colors = theme.colors;
                  const paletteColors = [
                    { name: 'Fondo', color: colors.background },
                    { name: 'Texto', color: colors.text },
                    { name: 'CPU', color: colors.cpuBarColor },
                    { name: 'Memoria', color: colors.memoryBarColor },
                    { name: 'Disco', color: colors.diskBarColor },
                    { name: 'Red ↓', color: colors.networkDownColor },
                    { name: 'Red ↑', color: colors.networkUpColor },
                    { name: 'Iconos', color: colors.iconColor }
                  ];
                  return paletteColors.map((item, idx) => (
                    <div
                      key={idx}
                      className="statusbar-palette-item"
                      title={`${item.name}: ${item.color}`}
                      style={{ background: item.color }}
                    />
                  ));
                })()}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBarSettingsTab;

