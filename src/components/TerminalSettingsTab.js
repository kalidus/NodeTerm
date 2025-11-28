import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Checkbox } from 'primereact/checkbox';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { Slider } from 'primereact/slider';
import { themes } from '../themes';
import '../styles/components/terminal-settings.css';

// Storage keys
const STORAGE_KEYS = {
  CURSOR_STYLE: 'nodeterm_cursor_style',
  CURSOR_BLINK: 'nodeterm_cursor_blink',
  SCROLLBACK_LINES: 'nodeterm_scrollback_lines',
  // SSH
  SSH_FONT_FAMILY: 'basicapp_terminal_font_family',
  SSH_FONT_SIZE: 'basicapp_terminal_font_size',
  SSH_THEME: 'basicapp_terminal_theme',
  // PowerShell
  POWERSHELL_FONT_FAMILY: 'basicapp_local_terminal_font_family',
  POWERSHELL_FONT_SIZE: 'basicapp_local_terminal_font_size',
  POWERSHELL_THEME: 'localPowerShellTheme',
  POWERSHELL_STATUSBAR: 'localPowerShellStatusBarTheme',
  // Linux
  LINUX_FONT_FAMILY: 'nodeterm_linux_font_family',
  LINUX_FONT_SIZE: 'nodeterm_linux_font_size',
  LINUX_THEME: 'localLinuxTerminalTheme',
  LINUX_STATUSBAR: 'localLinuxStatusBarTheme',
  // Docker
  DOCKER_FONT_FAMILY: 'nodeterm_docker_font_family',
  DOCKER_FONT_SIZE: 'nodeterm_docker_font_size',
  DOCKER_THEME: 'localDockerTerminalTheme',
  // Misc
  SHOW_NETWORK_DISKS: 'localShowNetworkDisks'
};

// Cursor styles
const CURSOR_STYLES = [
  { id: 'bar', label: 'Barra', icon: 'cursor-bar' },
  { id: 'block', label: 'Bloque', icon: 'cursor-block' },
  { id: 'underline', label: 'Subrayado', icon: 'cursor-underline' }
];

// Terminal types
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

const TerminalSettingsTab = ({
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  terminalTheme,
  setTerminalTheme,
  availableFonts,
  localFontFamily,
  setLocalFontFamily,
  localFontSize,
  setLocalFontSize,
  localPowerShellTheme,
  setLocalPowerShellTheme,
  localLinuxTerminalTheme,
  setLocalLinuxTerminalTheme
}) => {
  // Cursor settings
  const [cursorStyle, setCursorStyle] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.CURSOR_STYLE) || 'bar'
  );
  const [cursorBlink, setCursorBlink] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURSOR_BLINK);
    return saved !== null ? saved === 'true' : true;
  });
  const [scrollbackLines, setScrollbackLines] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SCROLLBACK_LINES);
    return saved ? parseInt(saved, 10) : 1000;
  });

  // Font settings per terminal type
  const [linuxFontFamily, setLinuxFontFamily] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.LINUX_FONT_FAMILY) || localFontFamily || 'Consolas'
  );
  const [linuxFontSize, setLinuxFontSize] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LINUX_FONT_SIZE);
    return saved ? parseInt(saved, 10) : localFontSize || 14;
  });
  const [dockerFontFamily, setDockerFontFamily] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.DOCKER_FONT_FAMILY) || localFontFamily || 'Consolas'
  );
  const [dockerFontSize, setDockerFontSize] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DOCKER_FONT_SIZE);
    return saved ? parseInt(saved, 10) : localFontSize || 14;
  });
  const [dockerTheme, setDockerTheme] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.DOCKER_THEME) || 'Default Dark'
  );

  // Preview settings
  const [activePreviewTab, setActivePreviewTab] = useState('ssh');

  // Overlay panels refs for font/size configuration
  const overlayRefs = useRef({});

  // Options
  const terminalThemeOptions = useMemo(() => 
    Object.keys(themes).map(name => ({ label: name, value: name })), []
  );

  // Handlers
  const handleCursorStyleChange = useCallback((style) => {
    setCursorStyle(style);
    localStorage.setItem(STORAGE_KEYS.CURSOR_STYLE, style);
    window.dispatchEvent(new CustomEvent('terminal-settings-changed', { detail: { cursorStyle: style } }));
  }, []);

  const handleCursorBlinkChange = useCallback((value) => {
    setCursorBlink(value);
    localStorage.setItem(STORAGE_KEYS.CURSOR_BLINK, value.toString());
  }, []);

  const handleScrollbackChange = useCallback((value) => {
    if (value >= 100 && value <= 10000) {
      setScrollbackLines(value);
      localStorage.setItem(STORAGE_KEYS.SCROLLBACK_LINES, value.toString());
    }
  }, []);

  // Get/Set font for each terminal type
  const getFontForType = useCallback((type) => {
    switch (type) {
      case 'ssh': return fontFamily || 'Consolas';
      case 'powershell': return localFontFamily || 'Consolas';
      case 'linux': return linuxFontFamily;
      case 'docker': return dockerFontFamily;
      default: return 'Consolas';
    }
  }, [fontFamily, localFontFamily, linuxFontFamily, dockerFontFamily]);

  const getFontSizeForType = useCallback((type) => {
    switch (type) {
      case 'ssh': return fontSize || 14;
      case 'powershell': return localFontSize || 14;
      case 'linux': return linuxFontSize;
      case 'docker': return dockerFontSize;
      default: return 14;
    }
  }, [fontSize, localFontSize, linuxFontSize, dockerFontSize]);

  const handleFontChange = useCallback((type, font) => {
    switch (type) {
      case 'ssh':
        setFontFamily(font);
        break;
      case 'powershell':
        setLocalFontFamily(font);
        localStorage.setItem(STORAGE_KEYS.POWERSHELL_FONT_FAMILY, font);
        break;
      case 'linux':
        setLinuxFontFamily(font);
        localStorage.setItem(STORAGE_KEYS.LINUX_FONT_FAMILY, font);
        break;
      case 'docker':
        setDockerFontFamily(font);
        localStorage.setItem(STORAGE_KEYS.DOCKER_FONT_FAMILY, font);
        // Dispatch custom event to notify App.js
        window.dispatchEvent(new CustomEvent('localStorageChange', {
          detail: { key: 'nodeterm_docker_font_family', value: font }
        }));
        // Also dispatch storage event for cross-tab sync
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'nodeterm_docker_font_family',
          newValue: font
        }));
        break;
      default: break;
    }
  }, [setFontFamily, setLocalFontFamily]);

  const handleFontSizeChange = useCallback((type, size) => {
    if (size < 8 || size > 32) return;
    switch (type) {
      case 'ssh':
        setFontSize(size);
        break;
      case 'powershell':
        setLocalFontSize(size);
        localStorage.setItem(STORAGE_KEYS.POWERSHELL_FONT_SIZE, size.toString());
        break;
      case 'linux':
        setLinuxFontSize(size);
        localStorage.setItem(STORAGE_KEYS.LINUX_FONT_SIZE, size.toString());
        break;
      case 'docker':
        setDockerFontSize(size);
        localStorage.setItem(STORAGE_KEYS.DOCKER_FONT_SIZE, size.toString());
        // Dispatch custom event to notify App.js
        window.dispatchEvent(new CustomEvent('localStorageChange', {
          detail: { key: 'nodeterm_docker_font_size', value: size.toString() }
        }));
        // Also dispatch storage event for cross-tab sync
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'nodeterm_docker_font_size',
          newValue: size.toString()
        }));
        break;
      default: break;
    }
  }, [setFontSize, setLocalFontSize]);

  // Get/Set theme for each terminal type
  const getThemeForType = useCallback((type) => {
    switch (type) {
      case 'ssh': return terminalTheme?.name || 'Default Dark';
      case 'powershell': return localPowerShellTheme || 'Default Dark';
      case 'linux': return localLinuxTerminalTheme || 'Default Dark';
      case 'docker': return dockerTheme;
      default: return 'Default Dark';
    }
  }, [terminalTheme, localPowerShellTheme, localLinuxTerminalTheme, dockerTheme]);

  const handleThemeChange = useCallback((type, themeName) => {
    const theme = themes[themeName];
    if (!theme) return;
    switch (type) {
      case 'ssh':
        setTerminalTheme(theme);
        break;
      case 'powershell':
        setLocalPowerShellTheme(themeName);
        localStorage.setItem(STORAGE_KEYS.POWERSHELL_THEME, themeName);
        break;
      case 'linux':
        setLocalLinuxTerminalTheme(themeName);
        localStorage.setItem(STORAGE_KEYS.LINUX_THEME, themeName);
        break;
      case 'docker':
        setDockerTheme(themeName);
        localStorage.setItem(STORAGE_KEYS.DOCKER_THEME, themeName);
        // Dispatch custom event to notify App.js
        window.dispatchEvent(new CustomEvent('localStorageChange', {
          detail: { key: 'localDockerTerminalTheme', value: themeName }
        }));
        // Also dispatch storage event for cross-tab sync
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'localDockerTerminalTheme',
          newValue: themeName
        }));
        break;
      default: break;
    }
  }, [setTerminalTheme, setLocalPowerShellTheme, setLocalLinuxTerminalTheme]);


  // Preview helpers
  const getPreviewTheme = useCallback((type) => {
    const themeName = getThemeForType(type);
    return themes[themeName]?.theme || themes['Default Dark'].theme;
  }, [getThemeForType]);

  const getPreviewContent = useCallback((type) => {
    const contents = {
      ssh: { 
        prompt: 'user@host:~$', 
        cmd: 'ls -la', 
        out: [
          'total 24',
          'drwxr-xr-x  3 user user 4096 Dec 25 .',
          'drwxr-xr-x 18 user user 4096 Dec 24 ..',
          '-rw-r--r--  1 user user  220 Dec 25 .bashrc'
        ] 
      },
      powershell: { 
        prompt: 'PS C:\\Users\\admin>', 
        cmd: 'Get-Process | Select -First 3', 
        out: [
          'Handles  NPM(K)    PM(K)  CPU(s)   Id  ProcessName',
          '-------  ------    -----  ------   --  -----------',
          '    234      12    15432    2.53  1234 chrome',
          '    156       8     8234    0.31  5678 explorer'
        ] 
      },
      linux: { 
        prompt: 'ubuntu@wsl:~$', 
        cmd: 'neofetch --stdout | head -5', 
        out: [
          'OS: Ubuntu 22.04.3 LTS x86_64',
          'Host: Windows Subsystem for Linux',
          'Kernel: 5.15.90-microsoft-WSL2',
          'Shell: bash 5.1.16'
        ] 
      },
      docker: { 
        prompt: 'root@container:/#', 
        cmd: 'docker ps --format "table {{.Names}}\t{{.Status}}"', 
        out: [
          'NAMES          STATUS',
          'nginx-proxy    Up 2 hours',
          'postgres-db    Up 2 hours',
          'redis-cache    Up 2 hours'
        ] 
      }
    };
    return contents[type] || contents.ssh;
  }, []);

  // Overlay handlers
  const handleOpenFontSizePanel = useCallback((type, event) => {
    if (overlayRefs.current[type]) {
      overlayRefs.current[type].toggle(event);
    }
  }, []);

  return (
    <div className="terminal-settings-container">
      {/* Sección 1: Cursor y Scrollback (compacto en una fila) */}
      <div className="terminal-settings-section">
        <div className="terminal-section-header">
          <div className="terminal-section-icon">
            <i className="pi pi-cog"></i>
          </div>
          <div className="terminal-section-info">
            <h3 className="terminal-section-title">Configuración Global</h3>
          </div>
        </div>
        <div className="terminal-section-content">
          <div className="terminal-global-row">
            <div className="terminal-cursor-group">
              <span className="terminal-mini-label">Cursor</span>
              <div className="terminal-cursor-selector">
                {CURSOR_STYLES.map((style) => (
                  <div
                    key={style.id}
                    className={`terminal-cursor-option ${cursorStyle === style.id ? 'active' : ''}`}
                    onClick={() => handleCursorStyleChange(style.id)}
                    title={style.label}
                  >
                    <div className="terminal-cursor-preview">
                      <div className={style.icon}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="terminal-blink-group">
              <span className="terminal-mini-label">Parpadeo</span>
              <div 
                className={`terminal-toggle-switch ${cursorBlink ? 'active' : ''}`}
                onClick={() => handleCursorBlinkChange(!cursorBlink)}
              />
            </div>
            <div className="terminal-scrollback-group">
              <span className="terminal-mini-label">Historial</span>
              <InputNumber
                value={scrollbackLines}
                onValueChange={(e) => handleScrollbackChange(e.value)}
                min={100}
                max={10000}
                step={100}
                style={{ width: '100px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sección 2: Configuración por Tipo de Terminal */}
      <div className="terminal-settings-section">
        <div className="terminal-section-header">
          <div className="terminal-section-icon">
            <i className="pi pi-palette"></i>
          </div>
          <div className="terminal-section-info">
            <h3 className="terminal-section-title">Configuración por Tipo de Terminal</h3>
          </div>
        </div>
        <div className="terminal-section-content">
          <div className="terminal-themes-grid">
            {TERMINAL_TYPES.map((type) => (
              <div key={type.id} className={`terminal-theme-card ${type.iconClass}`}>
                <div className="terminal-theme-card-header">
                  <div className={`terminal-theme-icon ${type.iconClass}`}>
                    <i className={type.icon}></i>
                  </div>
                  <span className="terminal-theme-name">{type.name}</span>
                </div>
                <div className="terminal-theme-controls">
                  <div className="terminal-theme-controls-row">
                    <div className="terminal-theme-selector theme-selector" style={{ flex: 1 }}>
                      <span className="terminal-selector-label">Tema</span>
                      <Dropdown
                        value={getThemeForType(type.id)}
                        options={terminalThemeOptions}
                        onChange={(e) => handleThemeChange(type.id, e.value)}
                        placeholder="Tema"
                      />
                    </div>
                    <Button
                      icon="pi pi-cog"
                      label="Configurar"
                      className="p-button-text p-button-sm"
                      onClick={(e) => handleOpenFontSizePanel(type.id, e)}
                      style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.75rem',
                        padding: '0.375rem 0.75rem',
                        minWidth: 'auto'
                      }}
                      tooltip="Configurar fuente y tamaño"
                      tooltipOptions={{ position: 'top' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sección 3: Vista Previa */}
      <div className="terminal-settings-section terminal-preview-section">
        <div className="terminal-section-header">
          <div className="terminal-section-icon">
            <i className="pi pi-eye"></i>
          </div>
          <div className="terminal-section-info">
            <h3 className="terminal-section-title">Vista Previa</h3>
          </div>
        </div>
        <div className="terminal-section-content">
          <div className="terminal-preview-tabs">
            {PREVIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`terminal-preview-tab ${activePreviewTab === tab.id ? 'active' : ''}`}
                onClick={() => setActivePreviewTab(tab.id)}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="terminal-preview-content">
            {(() => {
              const theme = getPreviewTheme(activePreviewTab);
              const content = getPreviewContent(activePreviewTab);
              const previewFont = getFontForType(activePreviewTab);
              const previewSize = getFontSizeForType(activePreviewTab);
              return (
                <div className="terminal-preview-window" style={{
                  background: theme.background,
                  fontFamily: `"${previewFont}", monospace`,
                  fontSize: `${previewSize}px`
                }}>
                  <div className="terminal-preview-line">
                    <span style={{ color: theme.green || '#22c55e' }}>{content.prompt}</span>
                    <span style={{ color: theme.foreground }}> {content.cmd}</span>
                  </div>
                  {content.out.map((line, idx) => (
                    <div key={idx} className="terminal-preview-line">
                      <span style={{ color: theme.foreground, opacity: 0.85 }}>{line}</span>
                    </div>
                  ))}
                  <div className="terminal-preview-line">
                    <span style={{ color: theme.green || '#22c55e' }}>{content.prompt}</span>
                    <span className="terminal-preview-cursor" style={{ 
                      background: theme.cursor || theme.foreground,
                      width: cursorStyle === 'bar' ? '2px' : '10px',
                      height: cursorStyle === 'underline' ? '3px' : '18px',
                      marginTop: cursorStyle === 'underline' ? '15px' : '0',
                      animation: cursorBlink ? 'cursor-blink 1s step-end infinite' : 'none'
                    }} />
                  </div>
                </div>
              );
            })()}
            <div className="terminal-preview-info">
              <span>
                <i className="pi pi-palette"></i> 
                {getThemeForType(activePreviewTab)}
              </span>
              <span className="terminal-font-info">
                "{getFontForType(activePreviewTab)}", monospace • {getFontSizeForType(activePreviewTab)}px
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* OverlayPanels para configurar fuente y tamaño por cada tipo de terminal */}
      {TERMINAL_TYPES.map((type) => {
        const currentFont = getFontForType(type.id);
        const currentFontSize = getFontSizeForType(type.id);
        const currentTheme = getPreviewTheme(type.id);
        const previewContent = {
          ssh: 'user@host:~$ ls -la',
          powershell: 'PS C:\\Users\\admin> Get-Process',
          linux: 'ubuntu@wsl:~$ neofetch',
          docker: 'root@container:/# docker ps'
        };

        return (
          <OverlayPanel
            key={type.id}
            ref={(el) => (overlayRefs.current[type.id] = el)}
            style={{ width: '380px' }}
            className="font-size-overlay"
          >
            <div style={{ padding: '0.5rem 0' }}>
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: `1px solid ${currentTheme.foreground}20`
              }}>
                <i className={`pi ${type.icon}`} style={{ color: currentTheme.green || currentTheme.foreground }}></i>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: currentTheme.foreground }}>
                  {type.name}
                </span>
              </div>

              {/* Fuente */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: currentTheme.foreground
                }}>
                  Fuente
                </label>
                <Dropdown
                  value={currentFont}
                  options={availableFonts}
                  onChange={(e) => handleFontChange(type.id, e.value)}
                  placeholder="Selecciona una fuente"
                  style={{ width: '100%' }}
                  itemTemplate={option => (
                    <span style={{ fontFamily: option.value || option }}>{option.label || option}</span>
                  )}
                />
              </div>

              {/* Tamaño */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: currentTheme.foreground
                }}>
                  Tamaño: {currentFontSize}px
                </label>
                <Slider
                  value={currentFontSize}
                  onChange={(e) => handleFontSizeChange(type.id, e.value)}
                  min={8}
                  max={32}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Vista previa */}
              <div style={{
                background: currentTheme.background,
                borderRadius: '6px',
                padding: '0.875rem',
                border: `1px solid ${currentTheme.foreground}20`
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  color: currentTheme.foreground,
                  opacity: 0.7,
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Vista previa:
                </div>
                <div style={{
                  fontFamily: `"${currentFont}", monospace`,
                  fontSize: `${currentFontSize}px`,
                  color: currentTheme.foreground,
                  background: currentTheme.background,
                  padding: '0.625rem',
                  borderRadius: '4px',
                  border: `1px solid ${currentTheme.foreground}15`,
                  minHeight: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4'
                }}>
                  <span style={{ color: currentTheme.green || currentTheme.cyan || currentTheme.foreground }}>
                    {previewContent[type.id].split(' ')[0]}
                  </span>
                  <span style={{ color: currentTheme.foreground }}>
                    {' ' + previewContent[type.id].split(' ').slice(1).join(' ')}
                  </span>
                </div>
              </div>
            </div>
          </OverlayPanel>
        );
      })}
    </div>
  );
};

export default TerminalSettingsTab;
