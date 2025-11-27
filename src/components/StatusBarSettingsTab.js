import React, { useState, useMemo, useCallback } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Checkbox } from 'primereact/checkbox';
import { Slider } from 'primereact/slider';
import { statusBarThemes } from '../themes/status-bar-themes';
import { statusBarIconThemes } from '../themes/statusbar-icon-themes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrochip, faMemory, faHdd, faClock, faArrowDown, faArrowUp, faServer } from '@fortawesome/free-solid-svg-icons';
import '../styles/components/status-bar-settings.css';

// Storage keys
const STORAGE_KEYS = {
  // Global
  HEIGHT: 'basicapp_statusbar_height',
  POLLING_INTERVAL: 'statusBarPollingInterval',
  SHOW_NETWORK_DISKS: 'localShowNetworkDisks',
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
  DOCKER_ICON_THEME: 'basicapp_docker_statusbar_icon_theme'
};

// Terminal types for Status Bar
const TERMINAL_TYPES = [
  { id: 'ssh', name: 'SSH', icon: 'pi pi-server', iconClass: 'ssh' },
  { id: 'powershell', name: 'PowerShell', icon: 'pi pi-microsoft', iconClass: 'powershell' },
  { id: 'linux', name: 'Linux / WSL', icon: 'pi pi-desktop', iconClass: 'linux' },
  { id: 'docker', name: 'Docker', icon: 'pi pi-box', iconClass: 'docker' }
];

// Preview tabs
const PREVIEW_TABS = [
  { id: 'ssh', label: 'SSH', icon: 'pi pi-server' },
  { id: 'powershell', label: 'PS', icon: 'pi pi-microsoft' },
  { id: 'linux', label: 'Linux', icon: 'pi pi-desktop' },
  { id: 'docker', label: 'Docker', icon: 'pi pi-box' }
];

const StatusBarSettingsTab = ({
  statusBarTheme,
  setStatusBarTheme,
  statusBarIconTheme,
  setStatusBarIconTheme,
  statusBarPollingInterval,
  setStatusBarPollingInterval
}) => {
  // Global settings
  const [statusBarHeight, setStatusBarHeight] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HEIGHT);
    return saved ? parseInt(saved, 10) : 32;
  });
  const [showNetworkDisks, setShowNetworkDisks] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHOW_NETWORK_DISKS);
    return saved ? JSON.parse(saved) : true;
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

  const handleShowNetworkDisksChange = useCallback((checked) => {
    setShowNetworkDisks(checked);
    localStorage.setItem(STORAGE_KEYS.SHOW_NETWORK_DISKS, JSON.stringify(checked));
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.SHOW_NETWORK_DISKS,
      newValue: JSON.stringify(checked)
    }));
  }, []);

  // Get/Set theme for each terminal type
  const getThemeForType = useCallback((type) => {
    switch (type) {
      case 'ssh': return sshTheme;
      case 'powershell': return powershellTheme;
      case 'linux': return linuxTheme;
      case 'docker': return dockerTheme;
      default: return 'Default Dark';
    }
  }, [sshTheme, powershellTheme, linuxTheme, dockerTheme]);

  const getIconThemeForType = useCallback((type) => {
    switch (type) {
      case 'ssh': return sshIconTheme;
      case 'powershell': return powershellIconTheme;
      case 'linux': return linuxIconTheme;
      case 'docker': return dockerIconTheme;
      default: return 'classic';
    }
  }, [sshIconTheme, powershellIconTheme, linuxIconTheme, dockerIconTheme]);

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

  // Status Bar Preview Component
  const StatusBarPreview = ({ type }) => {
    const theme = getPreviewTheme(type);
    const iconTheme = getPreviewIconTheme(type);
    if (!theme || !theme.colors) return null;
    const colors = theme.colors;

    const hostnames = {
      ssh: 'server-01',
      powershell: 'DESKTOP-PC',
      linux: 'ubuntu@wsl',
      docker: 'container-01'
    };

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
        {/* Hostname */}
        <div className="statusbar-preview-item">
          <span style={{ color: colors.iconColor }}>🐧</span>
          <span>{hostnames[type]}</span>
        </div>

        {/* CPU */}
        <div className="statusbar-preview-item">
          <span style={{ color: iconTheme.colors.cpu }}>{iconTheme.icons.cpu}</span>
          <span>45%</span>
          <div 
            className="statusbar-preview-gauge"
            style={{
              background: `linear-gradient(to right, ${colors.cpuBarColor} 45%, ${colors.border} 45%)`
            }}
          />
        </div>

        {/* Memory */}
        <div className="statusbar-preview-item">
          <span style={{ color: iconTheme.colors.memory }}>{iconTheme.icons.memory}</span>
          <span>2.1GB / 8GB</span>
        </div>

        {/* Network */}
        <div className="statusbar-preview-item">
          <FontAwesomeIcon icon={faArrowDown} style={{ color: colors.networkDownColor, fontSize: '9px' }} />
          <span>1.2MB/s</span>
          <FontAwesomeIcon icon={faArrowUp} style={{ color: colors.networkUpColor, fontSize: '9px' }} />
          <span>256KB/s</span>
        </div>

        {/* Disk */}
        <div className="statusbar-preview-item">
          <span style={{ color: iconTheme.colors.disk }}>{iconTheme.icons.disk}</span>
          <span>/: 67%</span>
        </div>

        {/* Uptime */}
        <div className="statusbar-preview-item">
          <FontAwesomeIcon icon={faClock} style={{ color: colors.iconColor, fontSize: '10px' }} />
          <span>3d 12h</span>
        </div>

        {/* IP */}
        <div className="statusbar-preview-item">
          <FontAwesomeIcon icon={faServer} style={{ color: colors.iconColor, fontSize: '10px' }} />
          <span>192.168.1.100</span>
        </div>
      </div>
    );
  };

  return (
    <div className="statusbar-settings-container">
      {/* Sección 1: Configuración Global */}
      <div className="statusbar-settings-section">
        <div className="statusbar-section-header">
          <div className="statusbar-section-icon">
            <i className="pi pi-cog"></i>
          </div>
          <div className="statusbar-section-info">
            <h3 className="statusbar-section-title">Configuración Global</h3>
          </div>
        </div>
        <div className="statusbar-section-content">
          <div className="statusbar-global-row">
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
              <InputNumber
                value={statusBarPollingInterval}
                onValueChange={(e) => handlePollingIntervalChange(e.value)}
                min={1}
                max={20}
                suffix="s"
                showButtons
                buttonLayout="horizontal"
                className="statusbar-interval-input"
              />
            </div>
            <div className="statusbar-setting-group">
              <span className="statusbar-mini-label">Discos de Red</span>
              <div 
                className={`statusbar-toggle-switch ${showNetworkDisks ? 'active' : ''}`}
                onClick={() => handleShowNetworkDisksChange(!showNetworkDisks)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sección 2: Configuración por Tipo de Terminal */}
      <div className="statusbar-settings-section">
        <div className="statusbar-section-header">
          <div className="statusbar-section-icon">
            <i className="pi pi-palette"></i>
          </div>
          <div className="statusbar-section-info">
            <h3 className="statusbar-section-title">Tema por Tipo de Terminal</h3>
          </div>
        </div>
        <div className="statusbar-section-content">
          <div className="statusbar-themes-grid">
            {TERMINAL_TYPES.map((type) => (
              <div key={type.id} className={`statusbar-theme-card ${type.iconClass}`}>
                <div className="statusbar-theme-card-header">
                  <div className={`statusbar-theme-icon ${type.iconClass}`}>
                    <i className={type.icon}></i>
                  </div>
                  <span className="statusbar-theme-name">{type.name}</span>
                </div>
                <div className="statusbar-theme-controls">
                  <div className="statusbar-theme-controls-row">
                    <div className="statusbar-theme-selector color-selector">
                      <span className="statusbar-selector-label">Colores</span>
                      <Dropdown
                        value={getThemeForType(type.id)}
                        options={themeOptions}
                        onChange={(e) => handleThemeChange(type.id, e.value)}
                        placeholder="Tema"
                      />
                      <ColorPaletteMini themeName={getThemeForType(type.id)} />
                    </div>
                    <div className="statusbar-theme-selector icon-selector">
                      <span className="statusbar-selector-label">Iconos</span>
                      <Dropdown
                        value={getIconThemeForType(type.id)}
                        options={iconThemeOptions}
                        onChange={(e) => handleIconThemeChange(type.id, e.value)}
                        placeholder="Iconos"
                      />
                      <IconThemeMini iconThemeName={getIconThemeForType(type.id)} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sección 3: Vista Previa */}
      <div className="statusbar-settings-section statusbar-preview-section">
        <div className="statusbar-section-header">
          <div className="statusbar-section-icon">
            <i className="pi pi-eye"></i>
          </div>
          <div className="statusbar-section-info">
            <h3 className="statusbar-section-title">Vista Previa</h3>
          </div>
        </div>
        <div className="statusbar-section-content">
          <div className="statusbar-preview-tabs">
            {PREVIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`statusbar-preview-tab ${activePreviewTab === tab.id ? 'active' : ''}`}
                onClick={() => setActivePreviewTab(tab.id)}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="statusbar-preview-content">
            <StatusBarPreview type={activePreviewTab} />
            <div className="statusbar-preview-info">
              <div className="statusbar-preview-info-left">
                <span>
                  <i className="pi pi-palette"></i>
                  {getThemeForType(activePreviewTab)}
                </span>
                <span>
                  <i className="pi pi-star"></i>
                  {statusBarIconThemes[getIconThemeForType(activePreviewTab)]?.name || 'Clásico'}
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
  );
};

export default StatusBarSettingsTab;

