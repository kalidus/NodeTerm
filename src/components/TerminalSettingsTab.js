import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Checkbox } from 'primereact/checkbox';
import { themes } from '../themes';
import { statusBarThemes } from '../themes/status-bar-themes';
import '../styles/components/terminal-settings.css';

// Storage keys
const STORAGE_KEYS = {
  CURSOR_STYLE: 'nodeterm_cursor_style',
  CURSOR_BLINK: 'nodeterm_cursor_blink',
  SCROLLBACK_LINES: 'nodeterm_scrollback_lines',
  LOCAL_FONT_FAMILY: 'basicapp_local_terminal_font_family',
  LOCAL_FONT_SIZE: 'basicapp_local_terminal_font_size',
  POWERSHELL_THEME: 'localPowerShellTheme',
  LINUX_THEME: 'localLinuxTerminalTheme',
  DOCKER_THEME: 'localDockerTerminalTheme',
  POWERSHELL_STATUSBAR: 'localPowerShellStatusBarTheme',
  LINUX_STATUSBAR: 'localLinuxStatusBarTheme',
  SHOW_NETWORK_DISKS: 'localShowNetworkDisks'
};

// Cursor styles
const CURSOR_STYLES = [
  { id: 'bar', label: 'Barra', icon: 'cursor-bar' },
  { id: 'block', label: 'Bloque', icon: 'cursor-block' },
  { id: 'underline', label: 'Subrayado', icon: 'cursor-underline' }
];

// Terminal types for themes
const TERMINAL_TYPES = [
  { id: 'ssh', name: 'SSH', icon: 'pi pi-server', iconClass: 'ssh', description: 'Conexiones remotas SSH' },
  { id: 'powershell', name: 'PowerShell', icon: 'pi pi-microsoft', iconClass: 'powershell', description: 'Terminal de Windows' },
  { id: 'linux', name: 'Linux / WSL', icon: 'pi pi-desktop', iconClass: 'linux', description: 'WSL, Ubuntu, etc.' },
  { id: 'docker', name: 'Docker', icon: 'pi pi-box', iconClass: 'docker', description: 'Contenedores Docker' }
];

// Preview tabs
const PREVIEW_TABS = [
  { id: 'ssh', label: 'SSH', icon: 'pi pi-server' },
  { id: 'powershell', label: 'PowerShell', icon: 'pi pi-microsoft' },
  { id: 'linux', label: 'Linux', icon: 'pi pi-desktop' },
  { id: 'docker', label: 'Docker', icon: 'pi pi-box' }
];

const TerminalSettingsTab = ({
  // SSH Terminal props
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  terminalTheme,
  setTerminalTheme,
  availableFonts,
  // Local Terminal props
  localFontFamily,
  setLocalFontFamily,
  localFontSize,
  setLocalFontSize,
  localPowerShellTheme,
  setLocalPowerShellTheme,
  localLinuxTerminalTheme,
  setLocalLinuxTerminalTheme
}) => {
  // Estados locales
  const [cursorStyle, setCursorStyle] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.CURSOR_STYLE) || 'bar';
  });
  
  const [cursorBlink, setCursorBlink] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURSOR_BLINK);
    return saved !== null ? saved === 'true' : true;
  });
  
  const [scrollbackLines, setScrollbackLines] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SCROLLBACK_LINES);
    return saved ? parseInt(saved, 10) : 1000;
  });
  
  const [dockerTheme, setDockerTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.DOCKER_THEME) || 'Default Dark';
  });
  
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState('ssh');
  
  // Status bar themes para avanzado
  const [powerShellStatusBar, setPowerShellStatusBar] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.POWERSHELL_STATUSBAR) || 'Default Dark';
  });
  
  const [linuxStatusBar, setLinuxStatusBar] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.LINUX_STATUSBAR) || 'Default Dark';
  });
  
  const [showNetworkDisks, setShowNetworkDisks] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHOW_NETWORK_DISKS);
    return saved ? JSON.parse(saved) : true;
  });

  // Opciones de temas
  const terminalThemeOptions = useMemo(() => {
    return Object.keys(themes).map(name => ({ label: name, value: name }));
  }, []);
  
  const statusBarThemeOptions = useMemo(() => {
    return Object.keys(statusBarThemes).map(name => ({ label: name, value: name }));
  }, []);

  // Handlers
  const handleCursorStyleChange = useCallback((style) => {
    setCursorStyle(style);
    localStorage.setItem(STORAGE_KEYS.CURSOR_STYLE, style);
    // Dispatch event for terminals to update
    window.dispatchEvent(new CustomEvent('terminal-settings-changed', { 
      detail: { cursorStyle: style } 
    }));
  }, []);

  const handleCursorBlinkChange = useCallback((value) => {
    setCursorBlink(value);
    localStorage.setItem(STORAGE_KEYS.CURSOR_BLINK, value.toString());
    window.dispatchEvent(new CustomEvent('terminal-settings-changed', { 
      detail: { cursorBlink: value } 
    }));
  }, []);

  const handleScrollbackChange = useCallback((value) => {
    if (value >= 100 && value <= 10000) {
      setScrollbackLines(value);
      localStorage.setItem(STORAGE_KEYS.SCROLLBACK_LINES, value.toString());
      window.dispatchEvent(new CustomEvent('terminal-settings-changed', { 
        detail: { scrollbackLines: value } 
      }));
    }
  }, []);

  const handleFontFamilyChange = useCallback((e) => {
    setFontFamily(e.value);
    // También actualizar local font por defecto si no hay override
    if (localFontFamily === fontFamily) {
      setLocalFontFamily(e.value);
      localStorage.setItem(STORAGE_KEYS.LOCAL_FONT_FAMILY, e.value);
    }
  }, [setFontFamily, localFontFamily, fontFamily, setLocalFontFamily]);

  const handleFontSizeChange = useCallback((value) => {
    if (value >= 8 && value <= 32) {
      setFontSize(value);
      // También actualizar local font size por defecto
      if (localFontSize === fontSize) {
        setLocalFontSize(value);
        localStorage.setItem(STORAGE_KEYS.LOCAL_FONT_SIZE, value.toString());
      }
    }
  }, [setFontSize, localFontSize, fontSize, setLocalFontSize]);

  const handleTerminalThemeChange = useCallback((themeId, themeName) => {
    const theme = themes[themeName];
    if (!theme) return;
    
    switch (themeId) {
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
        break;
      default:
        break;
    }
  }, [setTerminalTheme, setLocalPowerShellTheme, setLocalLinuxTerminalTheme]);

  const handleStatusBarThemeChange = useCallback((type, themeName) => {
    if (type === 'powershell') {
      setPowerShellStatusBar(themeName);
      localStorage.setItem(STORAGE_KEYS.POWERSHELL_STATUSBAR, themeName);
      window.dispatchEvent(new StorageEvent('storage', { 
        key: STORAGE_KEYS.POWERSHELL_STATUSBAR, 
        newValue: themeName 
      }));
    } else if (type === 'linux') {
      setLinuxStatusBar(themeName);
      localStorage.setItem(STORAGE_KEYS.LINUX_STATUSBAR, themeName);
      window.dispatchEvent(new StorageEvent('storage', { 
        key: STORAGE_KEYS.LINUX_STATUSBAR, 
        newValue: themeName 
      }));
    }
  }, []);

  const handleShowNetworkDisksChange = useCallback((value) => {
    setShowNetworkDisks(value);
    localStorage.setItem(STORAGE_KEYS.SHOW_NETWORK_DISKS, JSON.stringify(value));
    window.dispatchEvent(new StorageEvent('storage', { 
      key: STORAGE_KEYS.SHOW_NETWORK_DISKS, 
      newValue: JSON.stringify(value) 
    }));
  }, []);

  // Get current theme for each terminal type
  const getThemeForType = useCallback((type) => {
    switch (type) {
      case 'ssh':
        return terminalTheme?.name || 'Default Dark';
      case 'powershell':
        return localPowerShellTheme || 'Default Dark';
      case 'linux':
        return localLinuxTerminalTheme || 'Default Dark';
      case 'docker':
        return dockerTheme || 'Default Dark';
      default:
        return 'Default Dark';
    }
  }, [terminalTheme, localPowerShellTheme, localLinuxTerminalTheme, dockerTheme]);

  // Get theme colors for preview
  const getPreviewTheme = useCallback((type) => {
    const themeName = getThemeForType(type);
    const theme = themes[themeName];
    return theme?.theme || themes['Default Dark'].theme;
  }, [getThemeForType]);

  // Preview content by terminal type
  const getPreviewContent = useCallback((type) => {
    switch (type) {
      case 'ssh':
        return {
          prompt: 'user@hostname:~/project$',
          command: 'ls -la',
          output: [
            'total 24',
            'drwxr-xr-x  3 user user 4096 Dec 25 10:30 .',
            '-rw-r--r--  1 user user  256 Dec 25 10:30 README.md',
            '-rwxr-xr-x  1 user user 1024 Dec 25 10:28 script.sh'
          ]
        };
      case 'powershell':
        return {
          prompt: 'PS C:\\Users\\Admin>',
          command: 'Get-Process | Select -First 3',
          output: [
            'Handles  NPM(K)    PM(K)     WS(K)   CPU(s)     Id',
            '-------  ------    -----     -----   ------     --',
            '    234      12    15432     18920     1.23   1234'
          ]
        };
      case 'linux':
        return {
          prompt: 'ubuntu@wsl:~$',
          command: 'uname -a',
          output: [
            'Linux wsl 5.15.90-microsoft-standard-WSL2',
            '#1 SMP x86_64 GNU/Linux'
          ]
        };
      case 'docker':
        return {
          prompt: 'root@container:/#',
          command: 'docker ps',
          output: [
            'CONTAINER ID   IMAGE          STATUS',
            'a1b2c3d4e5f6   nginx:latest   Up 2 hours',
            'f6e5d4c3b2a1   redis:alpine   Up 5 hours'
          ]
        };
      default:
        return { prompt: '$', command: '', output: [] };
    }
  }, []);

  return (
    <div className="terminal-settings-container">
      {/* Sección 1: Configuración Base */}
      <div className="terminal-settings-section">
        <div className="terminal-section-header">
          <div className="terminal-section-icon">
            <i className="pi pi-cog"></i>
          </div>
          <div className="terminal-section-info">
            <h3 className="terminal-section-title">Configuración Base</h3>
            <p className="terminal-section-description">
              Estas opciones se aplican a todos los tipos de terminal
            </p>
          </div>
        </div>
        
        <div className="terminal-section-content">
          <div className="terminal-base-grid">
            {/* Fuente */}
            <div className="terminal-config-group">
              <label className="terminal-config-label">
                <i className="pi pi-pencil"></i>
                Familia de fuente
              </label>
              <Dropdown
                value={fontFamily}
                options={availableFonts}
                onChange={handleFontFamilyChange}
                placeholder="Selecciona una fuente"
                style={{ width: '100%' }}
                itemTemplate={(option) => (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    fontFamily: option.value 
                  }}>
                    <span>{option.label}</span>
                    <span style={{ opacity: 0.5, fontSize: '12px' }}>Aa123</span>
                  </div>
                )}
              />
              <span className="terminal-config-hint">
                Se recomienda usar fuentes monoespaciadas con ligaduras
              </span>
            </div>

            {/* Tamaño */}
            <div className="terminal-config-group">
              <label className="terminal-config-label">
                <i className="pi pi-text-size"></i>
                Tamaño de fuente
              </label>
              <InputNumber
                value={fontSize}
                onValueChange={(e) => handleFontSizeChange(e.value)}
                min={8}
                max={32}
                suffix=" px"
                showButtons
                buttonLayout="horizontal"
                style={{ width: '100%' }}
              />
              <span className="terminal-config-hint">
                Valor recomendado: 14px
              </span>
            </div>

            {/* Estilo de cursor */}
            <div className="terminal-config-group">
              <label className="terminal-config-label">
                <i className="pi pi-arrow-right"></i>
                Estilo del cursor
              </label>
              <div className="terminal-cursor-selector">
                {CURSOR_STYLES.map((style) => (
                  <div
                    key={style.id}
                    className={`terminal-cursor-option ${cursorStyle === style.id ? 'active' : ''}`}
                    onClick={() => handleCursorStyleChange(style.id)}
                  >
                    <div className="terminal-cursor-preview">
                      <div className={style.icon}></div>
                    </div>
                    <span className="terminal-cursor-label">{style.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Parpadeo y Scrollback */}
            <div className="terminal-config-group">
              <div className="terminal-config-row">
                <div className="terminal-config-group">
                  <label className="terminal-config-label">
                    <i className="pi pi-bolt"></i>
                    Parpadeo del cursor
                  </label>
                  <div 
                    className={`terminal-toggle-switch ${cursorBlink ? 'active' : ''}`}
                    onClick={() => handleCursorBlinkChange(!cursorBlink)}
                    role="switch"
                    aria-checked={cursorBlink}
                  />
                </div>
                <div className="terminal-config-group">
                  <label className="terminal-config-label">
                    <i className="pi pi-history"></i>
                    Historial (líneas)
                  </label>
                  <InputNumber
                    value={scrollbackLines}
                    onValueChange={(e) => handleScrollbackChange(e.value)}
                    min={100}
                    max={10000}
                    step={100}
                    showButtons
                    buttonLayout="horizontal"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección 2: Temas por Tipo de Terminal */}
      <div className="terminal-settings-section">
        <div className="terminal-section-header">
          <div className="terminal-section-icon">
            <i className="pi pi-palette"></i>
          </div>
          <div className="terminal-section-info">
            <h3 className="terminal-section-title">Temas por Tipo de Terminal</h3>
            <p className="terminal-section-description">
              Usa temas diferentes para identificar fácilmente cada tipo de terminal
            </p>
          </div>
        </div>
        
        <div className="terminal-section-content">
          <div className="terminal-themes-grid">
            {TERMINAL_TYPES.map((type) => (
              <div key={type.id} className="terminal-theme-card">
                <div className={`terminal-theme-icon ${type.iconClass}`}>
                  <i className={type.icon}></i>
                </div>
                <div className="terminal-theme-info">
                  <div className="terminal-theme-name">{type.name}</div>
                  <div className="terminal-theme-type">{type.description}</div>
                </div>
                <div className="terminal-theme-selector">
                  <Dropdown
                    value={getThemeForType(type.id)}
                    options={terminalThemeOptions}
                    onChange={(e) => handleTerminalThemeChange(type.id, e.value)}
                    placeholder="Seleccionar tema"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sección 3: Personalización Avanzada */}
      <div className="terminal-settings-section">
        <div 
          className={`terminal-advanced-toggle ${advancedExpanded ? 'expanded' : ''}`}
          onClick={() => setAdvancedExpanded(!advancedExpanded)}
        >
          <div className="terminal-advanced-toggle-info">
            <div className="terminal-advanced-toggle-icon">
              <i className="pi pi-sliders-h"></i>
            </div>
            <div className="terminal-advanced-toggle-text">
              <span className="terminal-advanced-toggle-title">Personalización Avanzada</span>
              <span className="terminal-advanced-toggle-description">
                Status bar, fuentes locales y opciones adicionales
              </span>
            </div>
          </div>
          <i className={`pi pi-chevron-down terminal-advanced-chevron`}></i>
        </div>
        
        <div className={`terminal-advanced-content ${advancedExpanded ? 'expanded' : ''}`}>
          <div className="terminal-advanced-inner">
            {/* Override fuente local */}
            <div className="terminal-override-card">
              <div className="terminal-override-info">
                <div className="terminal-override-icon">
                  <i className="pi pi-pencil"></i>
                </div>
                <div>
                  <div className="terminal-override-label">Fuente para Terminal Local</div>
                  <div className="terminal-override-hint">Sobrescribir la fuente base para terminales locales</div>
                </div>
              </div>
              <div className="terminal-override-control">
                <Dropdown
                  value={localFontFamily}
                  options={availableFonts}
                  onChange={(e) => {
                    setLocalFontFamily(e.value);
                    localStorage.setItem(STORAGE_KEYS.LOCAL_FONT_FAMILY, e.value);
                  }}
                  style={{ width: '200px' }}
                />
                <InputNumber
                  value={localFontSize}
                  onValueChange={(e) => {
                    setLocalFontSize(e.value);
                    localStorage.setItem(STORAGE_KEYS.LOCAL_FONT_SIZE, e.value.toString());
                  }}
                  min={8}
                  max={32}
                  suffix=" px"
                  style={{ width: '100px' }}
                />
              </div>
            </div>

            {/* Status Bar PowerShell */}
            <div className="terminal-override-card">
              <div className="terminal-override-info">
                <div className="terminal-override-icon">
                  <i className="pi pi-chart-bar"></i>
                </div>
                <div>
                  <div className="terminal-override-label">Status Bar - PowerShell</div>
                  <div className="terminal-override-hint">Tema de la barra de estado para PowerShell</div>
                </div>
              </div>
              <div className="terminal-override-control">
                <Dropdown
                  value={powerShellStatusBar}
                  options={statusBarThemeOptions}
                  onChange={(e) => handleStatusBarThemeChange('powershell', e.value)}
                  style={{ width: '200px' }}
                />
              </div>
            </div>

            {/* Status Bar Linux */}
            <div className="terminal-override-card">
              <div className="terminal-override-info">
                <div className="terminal-override-icon">
                  <i className="pi pi-chart-bar"></i>
                </div>
                <div>
                  <div className="terminal-override-label">Status Bar - Linux / WSL</div>
                  <div className="terminal-override-hint">Tema de la barra de estado para terminales Linux</div>
                </div>
              </div>
              <div className="terminal-override-control">
                <Dropdown
                  value={linuxStatusBar}
                  options={statusBarThemeOptions}
                  onChange={(e) => handleStatusBarThemeChange('linux', e.value)}
                  style={{ width: '200px' }}
                />
              </div>
            </div>

            {/* Mostrar discos de red */}
            <div className="terminal-override-card">
              <div className="terminal-override-info">
                <div className="terminal-override-icon">
                  <i className="pi pi-folder"></i>
                </div>
                <div>
                  <div className="terminal-override-label">Mostrar Discos de Red</div>
                  <div className="terminal-override-hint">CIFS/SMB/NFS, UNC y mapeos (Z:, Y:, ...)</div>
                </div>
              </div>
              <div className="terminal-override-control">
                <Checkbox
                  checked={showNetworkDisks}
                  onChange={(e) => handleShowNetworkDisksChange(e.checked)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección 4: Vista Previa */}
      <div className="terminal-settings-section terminal-preview-section">
        <div className="terminal-section-header">
          <div className="terminal-section-icon">
            <i className="pi pi-eye"></i>
          </div>
          <div className="terminal-section-info">
            <h3 className="terminal-section-title">Vista Previa</h3>
            <p className="terminal-section-description">
              Previsualiza cómo se verá cada tipo de terminal
            </p>
          </div>
        </div>
        
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
            const cursorElement = cursorStyle === 'bar' 
              ? <span className="terminal-preview-cursor" style={{ width: '2px', background: theme.cursor || theme.foreground }} />
              : cursorStyle === 'block'
                ? <span className="terminal-preview-cursor" style={{ width: '10px', background: theme.cursor || theme.foreground, opacity: 0.7 }} />
                : <span className="terminal-preview-cursor" style={{ width: '10px', height: '2px', marginTop: '14px', background: theme.cursor || theme.foreground }} />;
            
            return (
              <div 
                className="terminal-preview-window"
                style={{
                  background: theme.background,
                  fontFamily: fontFamily || 'Consolas, Monaco, monospace',
                  fontSize: `${fontSize || 14}px`
                }}
              >
                <div className="terminal-preview-line">
                  <span className="terminal-preview-prompt" style={{ color: theme.green || '#22c55e' }}>
                    {content.prompt}
                  </span>
                  <span className="terminal-preview-command" style={{ color: theme.foreground }}>
                    {' '}{content.command}
                  </span>
                </div>
                {content.output.map((line, idx) => (
                  <div key={idx} className="terminal-preview-line">
                    <span className="terminal-preview-output" style={{ color: theme.foreground, opacity: 0.85 }}>
                      {line}
                    </span>
                  </div>
                ))}
                <div className="terminal-preview-line">
                  <span className="terminal-preview-prompt" style={{ color: theme.green || '#22c55e' }}>
                    {content.prompt}
                  </span>
                  {cursorBlink ? cursorElement : React.cloneElement(cursorElement, { 
                    style: { ...cursorElement.props.style, animation: 'none' } 
                  })}
                </div>
              </div>
            );
          })()}
          
          <div className="terminal-preview-info">
            <div className="terminal-preview-theme-name">
              <i className="pi pi-palette"></i>
              {getThemeForType(activePreviewTab)}
            </div>
            <div className="terminal-preview-font-info">
              {fontFamily || 'Consolas'} • {fontSize || 14}px
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalSettingsTab;

