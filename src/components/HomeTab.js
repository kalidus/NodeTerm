import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { Divider } from 'primereact/divider';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Slider } from 'primereact/slider';
import { getVersionInfo } from '../version-info';
import TabbedTerminal from './TabbedTerminal';
import ConnectionHistory from './ConnectionHistory';
import NodeTermStatus from './NodeTermStatus';
import AIChatWithHistory from './AIChatWithHistory';
import StandaloneStatusBar from './StandaloneStatusBar';
import { uiThemes } from '../themes/ui-themes';
import { themeManager } from '../utils/themeManager';
import { themes } from '../themes';
import { getRecents, onUpdate, getRecentPasswords, subscribeRecents } from '../utils/connectionStore';
import { STORAGE_KEYS } from '../utils/constants';

const HomeTab = ({
  isActiveTab = true,
  onCreateSSHConnection,
  onCreateFolder,
  onOpenFileExplorer,
  onOpenSettings,
  sshConnectionsCount = 0,
  foldersCount = 0,
  rdpConnectionsCount = 0,
  localFontFamily,
  localFontSize,
  localPowerShellTheme,
  setLocalPowerShellTheme,
  localLinuxTerminalTheme,
  setLocalLinuxTerminalTheme,
  onCreateRdpConnection,
  onCreateVncConnection,
  onEditConnection,
  onLoadGroup,
  onOpenSSHTunnel,
  sidebarNodes = null,
  setShowCreateGroupDialog,
  activeIds = new Set(),
  masterKey = null,
  secureStorage = null,
  isMinimalMode = false
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [terminalState, setTerminalState] = useState('normal'); // Estado normal para tama\u00F1o correcto
  const [terminalHidden, setTerminalHidden] = useState(true);

  const [terminalFrameStyle, setTerminalFrameStyle] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.TERMINAL_FRAME_STYLE) || 'macos';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TERMINAL_FRAME_STYLE, terminalFrameStyle);
    } catch {
      // Ignorar errores de persistencia
    }

    try {
      window.dispatchEvent(new CustomEvent('terminal-frame-style-changed', {
        detail: { style: terminalFrameStyle }
      }));
    } catch {
      // Ignorar errores al despachar el evento
    }
  }, [terminalFrameStyle]);

  const [rndSize, setRndSize] = useState({ width: '80%', height: 400 });
  const [rndPosition, setRndPosition] = useState({ x: 50, y: 50 });
  const [isRndInitialized, setIsRndInitialized] = useState(false);
  const [favType, setFavType] = useState('all'); // Nuevo estado para filtros
  const [recentConnections, setRecentConnections] = useState([]); // Estado para conexiones recientes
  const [recentPasswords, setRecentPasswords] = useState([]); // Estado para passwords recientes
  const [showAIChat, setShowAIChat] = useState(false); // Estado para mostrar/ocultar chat de IA
  const [iconThemeKey, setIconThemeKey] = useState(0); // Para forzar re-render cuando cambia el tema de iconos
  const [statusBarVisible, setStatusBarVisible] = useState(() => {
    // Cargar preferencia desde localStorage, por defecto visible
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  }); // Estado para mostrar/ocultar status bar
  const [terminalTitle, setTerminalTitle] = useState('Terminal Local');
  const [showLocalTerminalTabs, setShowLocalTerminalTabs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_TABS_VISIBLE);
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const [rightColumnCollapsed, setRightColumnCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });
  const [rightColumnVisible, setRightColumnVisible] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_VISIBLE);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [homeCardVisible, setHomeCardVisible] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_CARD_VISIBLE);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [terminalOpacity, setTerminalOpacity] = useState(() => {
    try {
      const saved = localStorage.getItem('nodeterm_terminal_opacity');
      return saved !== null ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  useEffect(() => {
    localStorage.setItem('nodeterm_terminal_opacity', terminalOpacity.toString());
  }, [terminalOpacity]);

  // Sincronizar opacidad cuando se cambia desde fuera (ej: preset o di??logo de ajustes)
  useEffect(() => {
    const syncOpacity = () => {
      try {
        const saved = localStorage.getItem('nodeterm_terminal_opacity');
        if (saved !== null) {
          const val = parseFloat(saved);
          if (!isNaN(val) && Math.abs(val - terminalOpacity) > 0.001) {
            setTerminalOpacity(val);
          }
        } else if (terminalOpacity !== 1.0) {
          // Si se elimina de localStorage (ej: por otro preset), volver al valor por defecto
          setTerminalOpacity(1.0);
        }
      } catch (err) { }
    };

    window.addEventListener('settings-updated', syncOpacity);
    window.addEventListener('storage', syncOpacity);
    return () => {
      window.removeEventListener('settings-updated', syncOpacity);
      window.removeEventListener('storage', syncOpacity);
    };
  }, [terminalOpacity]);

  // Configuraci\u00F3n de tipograf\u00EDa de HomeTab
  const [homeTabFont, setHomeTabFont] = useState(() => {
    try {
      return localStorage.getItem('homeTabFont') || localStorage.getItem('sidebarFont') || '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
    } catch {
      return '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
    }
  });
  const [homeTabFontSize, setHomeTabFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem('homeTabFontSize');
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  const versionInfo = getVersionInfo();
  const tabbedTerminalRef = useRef();
  const embeddedTabbedTerminalRef = useRef();
  const embeddedTerminalInitialized = useRef(false); // evitar crear tabs nuevas al cambiar de vista
  const containerRef = useRef(null);
  const mainAreaRef = useRef(null);


  const homeOptionsOverlayRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(window.innerHeight - 100);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth - 100);
  const [hasUserMovedTerminal, setHasUserMovedTerminal] = useState(false);

  // Estado para el terminal embebido como vista integrada (por defecto visible)
  const [terminalView, setTerminalView] = useState(true);
  const [embeddedTerminalHeight, setEmbeddedTerminalHeight] = useState(360);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_TABS_VISIBLE,
        showLocalTerminalTabs.toString()
      );
      window.dispatchEvent(new CustomEvent('home-tab-local-terminal-tabs-visibility-changed', {
        detail: { visible: showLocalTerminalTabs }
      }));
    } catch {
      // Ignorar errores de persistencia
    }
  }, [showLocalTerminalTabs]);

  // Auto-inicializar terminal embebido al montar el componente si est\u00E1 visible por defecto
  useEffect(() => {
    if (terminalView && !embeddedTerminalInitialized.current) {
      const terminalType = localStorage.getItem('nodeterm_default_local_terminal') || 'powershell';
      embeddedTerminalInitialized.current = true;

      setTimeout(() => {
        try {
          if (embeddedTabbedTerminalRef.current?.addTerminalTab) {
            embeddedTabbedTerminalRef.current.addTerminalTab(terminalType);
          }
        } catch (err) {
          console.warn('[HomeTab] embedded auto init:', err);
        }
        window.dispatchEvent(new Event('resize'));
      }, 500); // Retraso ligeramente mayor al montar inicialmente para asegurar render DOM
    }
  }, []);

  // Medir el tama??o real del contenedor
  useEffect(() => {
    const updateSize = () => {
      if (mainAreaRef.current) {
        setContainerHeight(mainAreaRef.current.offsetHeight);
        setContainerWidth(mainAreaRef.current.offsetWidth);
      }
    };

    updateSize(); // Medici??n inicial

    const observer = new ResizeObserver(updateSize);
    if (mainAreaRef.current) observer.observe(mainAreaRef.current);

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      observer.disconnect();
    };
  }, []);

  // Funci??n para centrar y dimensionar el terminal
  const centerAndSizeTerminal = () => {
    if (mainAreaRef.current) {
      const parentWidth = mainAreaRef.current.offsetWidth;
      const parentHeight = mainAreaRef.current.offsetHeight;

      // Usar dimensiones m??nimas si el padre a??n no est?? listo
      if (parentWidth <= 0 || parentHeight <= 0) return;

      const initialWidth = Math.min(parentWidth * 0.8, 1200);
      const initialHeight = Math.min(parentHeight * 0.7, 600);

      setRndSize({ width: initialWidth, height: initialHeight });
      setRndPosition({
        x: (parentWidth - initialWidth) / 2,
        y: (parentHeight - initialHeight) / 2
      });
      setIsRndInitialized(true);
    }
  };

  // Inicializar/Recalcular Rnd position
  useEffect(() => {
    if (!isRndInitialized || !hasUserMovedTerminal) {
      centerAndSizeTerminal();
    }
  }, [containerHeight, containerWidth, isRndInitialized, hasUserMovedTerminal]);

  // Asegurar que se centra si se muestra tras estar oculto o cambia tama??o
  useEffect(() => {
    if (!terminalHidden && isRndInitialized && mainAreaRef.current) {
      const parentWidth = mainAreaRef.current.offsetWidth;
      const parentHeight = mainAreaRef.current.offsetHeight;

      // Recalcular si est?? sustancialmente fuera de l??mites
      if (typeof rndPosition.y === 'number' && (rndPosition.y > parentHeight - 50 || rndPosition.y < 0)) {
        centerAndSizeTerminal();
      } else if (typeof rndPosition.x === 'number' && (rndPosition.x > parentWidth - 50 || rndPosition.x + 100 < 0)) {
        centerAndSizeTerminal();
      }
    }
  }, [terminalHidden]);



  // Estado para forzar re-render al cambiar el tema
  const [themeVersion, setThemeVersion] = useState(0);

  // Escuchar cambios en el tema (evento global 'theme-changed')
  useEffect(() => {
    const onThemeChanged = () => {
      setThemeVersion(v => v + 1); // Forzar re-render
    };
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  // Escuchar cambios en el tema de iconos de la Sidebar
  useEffect(() => {
    const handleIconThemeChange = () => {
      // Forzar re-render cuando cambia el tema de iconos
      setIconThemeKey(prev => prev + 1);
    };

    window.addEventListener('storage', handleIconThemeChange);
    window.addEventListener('icon-theme-changed', handleIconThemeChange);

    return () => {
      window.removeEventListener('storage', handleIconThemeChange);
      window.removeEventListener('icon-theme-changed', handleIconThemeChange);
    };
  }, []);

  // Escuchar cambios en la fuente de HomeTab
  useEffect(() => {
    const handleHomeTabFontChange = () => {
      try {
        const newFont = localStorage.getItem('homeTabFont') || localStorage.getItem('sidebarFont') || '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
        const newSize = localStorage.getItem('homeTabFontSize');
        const parsedSize = newSize ? parseInt(newSize, 10) : null;
        setHomeTabFont(newFont);
        setHomeTabFontSize(parsedSize);
      } catch { }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'homeTabFont' || e.key === 'homeTabFontSize' || e.key === 'sidebarFont') {
        handleHomeTabFontChange();
      }
    };

    // Escuchar evento personalizado y cambios en localStorage
    window.addEventListener('home-tab-font-changed', handleHomeTabFontChange);
    window.addEventListener('sidebar-font-changed', handleHomeTabFontChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('home-tab-font-changed', handleHomeTabFontChange);
      window.removeEventListener('sidebar-font-changed', handleHomeTabFontChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Escuchar cambios en la visibilidad del terminal local
  useEffect(() => {
    const handleTerminalVisibilityChange = (e) => {
      // Solo actuar si el cambio es específicamente para la visibilidad del terminal 
      // o si es el evento personalizado. Ignorar eventos de storage genéricos (como cambios de tema)
      if (e && e.type === 'storage') {
        if (e.key !== STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE) {
          return;
        }
      }

      try {
        const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE);
        const isVisible = saved !== null ? saved === 'true' : false; // Por defecto false (oculto)
        setTerminalHidden(!isVisible);
      } catch {
        setTerminalHidden(true); // Por defecto oculto en caso de error
      }
    };

    window.addEventListener('home-tab-local-terminal-visibility-changed', handleTerminalVisibilityChange);
    window.addEventListener('storage', handleTerminalVisibilityChange);

    return () => {
      window.removeEventListener('home-tab-local-terminal-visibility-changed', handleTerminalVisibilityChange);
      window.removeEventListener('storage', handleTerminalVisibilityChange);
    };
  }, []);

  // Determinar el t\u00EDtulo del terminal basado en la terminal por defecto
  useEffect(() => {
    const updateTerminalTitle = () => {
      try {
        const defaultTerminal = localStorage.getItem('nodeterm_default_local_terminal');
        const platform = window.electron?.platform || 'unknown';

        if (defaultTerminal) {
          const terminalTitles = {
            'powershell': 'Windows PowerShell',
            'claude': 'Claude Code',
            'opencode': 'OpenCode',
            'wsl': 'WSL',
            'cygwin': 'Cygwin',
            'linux-terminal': platform === 'darwin' ? 'Terminal macOS' : 'Terminal Linux'
          };

          if (defaultTerminal.startsWith('docker-')) {
            setTerminalTitle(`\uD83D\uDC33 ${defaultTerminal.replace('docker-', '')}`);
          } else if (terminalTitles[defaultTerminal]) {
            setTerminalTitle(terminalTitles[defaultTerminal]);
          } else {
            setTerminalTitle(defaultTerminal);
          }
        } else {
          // Fallback por defecto seg\u00FAn plataforma
          if (platform === 'linux') setTerminalTitle('Terminal Linux');
          else if (platform === 'darwin') setTerminalTitle('Terminal macOS');
          else setTerminalTitle('Windows PowerShell');
        }
      } catch (err) {
        setTerminalTitle('Terminal Local');
      }
    };

    updateTerminalTitle();
    window.addEventListener('storage', updateTerminalTitle);
    return () => window.removeEventListener('storage', updateTerminalTitle);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ai-chat-home-visibility', {
      detail: { visible: showAIChat }
    }));
  }, [showAIChat]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('ai-chat-home-visibility', {
        detail: { visible: false }
      }));
    };
  }, []);

  // Evita que el panel de opciones quede visible al cambiar de vista/layout.
  useEffect(() => {
    try {
      homeOptionsOverlayRef.current?.hide();
    } catch {
      // Ignorar fallos del overlay al desmontar o en cambios rápidos de vista
    }
  }, [terminalView, showAIChat, terminalHidden, homeCardVisible, rightColumnVisible]);

  const RECENTS_LIMIT = 50;

  const loadRecentConnections = React.useCallback(() => {
    try {
      const recents = getRecents(RECENTS_LIMIT);
      setRecentConnections(recents);
    } catch (error) {
      console.error('Error cargando conexiones recientes:', error);
    }
  }, []);

  const loadRecentPasswords = React.useCallback(() => {
    try {
      const passwords = getRecentPasswords(5); // Limitar a 5 passwords recientes
      setRecentPasswords(passwords);
    } catch (error) {
      console.error('Error cargando passwords recientes:', error);
    }
  }, []);

  // Cargar conexiones recientes y passwords recientes + escuchar cambios
  useEffect(() => {
    loadRecentConnections();
    loadRecentPasswords();
    const off1 = onUpdate(() => {
      loadRecentConnections();
      loadRecentPasswords();
    });
    // Respaldo: suscripci\u00F3n directa que se ejecuta en el mismo tick que recordRecent (por si el evento falla en Electron)
    const off2 = subscribeRecents(() => {
      loadRecentConnections();
      loadRecentPasswords();
    });
    return () => {
      off1 && off1();
      off2 && off2();
    };
  }, [loadRecentConnections, loadRecentPasswords]);

  // Refrescar recientes al volver a la pesta\u00F1a Inicio (por si se perdi\u00F3 un evento o se conect\u00F3 desde otro grupo)
  useEffect(() => {
    if (isActiveTab) {
      loadRecentConnections();
      loadRecentPasswords();
    }
  }, [isActiveTab, loadRecentConnections, loadRecentPasswords]);

  // Funciones auxiliares para tipos de passwords
  const getPasswordTypeIcon = (type) => {
    // Si no hay tipo definido, intentar inferirlo del nombre o usar icono por defecto
    if (!type) return 'pi pi-key';

    switch (type.toLowerCase()) {
      case 'web':
      case 'website':
      case 'site':
        return 'pi pi-globe';
      case 'dev':
      case 'development':
      case 'github':
      case 'gitlab':
      case 'bitbucket':
        return 'pi pi-code';
      case 'cloud':
      case 'aws':
      case 'azure':
      case 'gcp':
        return 'pi pi-cloud';
      case 'db':
      case 'database':
      case 'mysql':
      case 'postgresql':
      case 'mongodb':
        return 'pi pi-database';
      case 'email':
      case 'gmail':
      case 'outlook':
        return 'pi pi-envelope';
      case 'social':
      case 'facebook':
      case 'twitter':
      case 'instagram':
        return 'pi pi-users';
      case 'server':
      case 'ssh':
        return 'pi pi-server';
      case 'admin':
      case 'administrator':
        return 'pi pi-shield';
      default:
        return 'pi pi-key';
    }
  };

  const getPasswordTypeColor = (type) => {
    // Si no hay tipo definido, usar color por defecto
    if (!type) return '#9E9E9E';

    switch (type.toLowerCase()) {
      case 'web':
      case 'website':
      case 'site':
        return '#4fc3f7';
      case 'dev':
      case 'development':
      case 'github':
      case 'gitlab':
      case 'bitbucket':
        return '#66bb6a';
      case 'cloud':
      case 'aws':
      case 'azure':
      case 'gcp':
        return '#ff7043';
      case 'db':
      case 'database':
      case 'mysql':
      case 'postgresql':
      case 'mongodb':
        return '#ab47bc';
      case 'email':
      case 'gmail':
      case 'outlook':
        return '#ff9800';
      case 'social':
      case 'facebook':
      case 'twitter':
      case 'instagram':
        return '#e91e63';
      case 'server':
      case 'ssh':
        return '#607d8b';
      case 'admin':
      case 'administrator':
        return '#795548';
      default:
        return '#9E9E9E';
    }
  };

  const copyToClipboard = async (text, fieldName) => {
    try {
      if (window.electron?.clipboard?.writeText) {
        await window.electron.clipboard.writeText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }

      // Mostrar notificaci\u00F3n si est\u00E1 disponible
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Copiado',
          detail: `${fieldName} copiado al portapapeles`,
          life: 1500
        });
      }
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
    }
  };

  const openPasswordTab = (passwordData) => {
    try {
      // Crear el evento para abrir la pesta\u00F1a de password
      const event = new CustomEvent('open-password-tab', {
        detail: {
          key: passwordData.id,
          label: passwordData.name,
          data: {
            username: passwordData.username,
            password: passwordData.password,
            url: passwordData.url,
            group: passwordData.group,
            notes: passwordData.notes,
            type: passwordData.type,
            icon: passwordData.icon
          }
        }
      });

      // Dispatch del evento
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error abriendo pesta\u00F1a de password:', err);
    }
  };

  // Helper para ajustar la opacidad de los colores (Hex o RGBA)
  const adjustOpacity = (color, opacity) => {
    if (!color) return `rgba(0,0,0,${opacity})`;
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/g, `${opacity})`);
    }
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };

  // Helper para obtener un fondo con contraste basado en el brillo (ideal para temas planos como Nord)
  const getContrastBg = (color, opacity = 0.8) => {
    if (!color) return `rgba(255,255,255,${opacity * 0.1})`;

    // Si es un gradiente, intentar extraer el primer color o devolver un fallback
    if (color.includes('gradient')) {
      const match = color.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
      if (match) color = match[0];
      else return `rgba(255,255,255,0.1)`;
    }

    let r, g, b;
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.substring(0, 2), 16) || 0;
        g = parseInt(hex.substring(2, 4), 16) || 0;
        b = parseInt(hex.substring(4, 6), 16) || 0;
      }
    } else if (color.startsWith('rgba') || color.startsWith('rgb')) {
      const parts = color.match(/\d+/g);
      if (!parts || parts.length < 3) return adjustOpacity(color, opacity);
      r = parseInt(parts[0]);
      g = parseInt(parts[1]);
      b = parseInt(parts[2]);
    } else {
      // Intentar una aproximaci\u00F3n para colores con nombre o desconocidos
      return adjustOpacity(color, opacity);
    }

    // Calcular brillo (YIQ)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Si es oscuro, aclarar significativamente. Si es claro, oscurecer.
    if (brightness < 128) {
      // Modo oscuro: aclarar para resaltar
      return `rgba(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 55, 255)}, ${opacity})`;
    } else {
      // Modo claro: oscurecer para resaltar
      return `rgba(${Math.max(r - 30, 0)}, ${Math.max(g - 30, 0)}, ${Math.max(b - 40, 0)}, ${opacity})`;
    }
  };

  // Obtener el color de fondo del tema actual
  const currentTheme = React.useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [themeVersion]);

  const dashboardBg = React.useMemo(() => {
    return currentTheme.colors?.sidebarBackground || currentTheme.colors?.contentBackground || '#fafafa';
  }, [currentTheme]);

  // Colores del tema para elementos de la lista
  const themeColors = React.useMemo(() => {
    // Special handling for Nord theme to ensure visible hover effects
    const isNordTheme = currentTheme.name === 'Nord';

    return {
      textPrimary: currentTheme.colors?.sidebarText || currentTheme.colors?.tabText || '#ffffff',
      textSecondary: currentTheme.colors?.sidebarText || '#9E9E9E',
      borderColor: currentTheme.colors?.sidebarBorder || currentTheme.colors?.contentBorder || 'rgba(255,255,255,0.1)',
      hoverBackground: isNordTheme ? '#4c566a' : (currentTheme.colors?.sidebarHover || 'rgba(255,255,255,0.1)'),
      itemBackground: currentTheme.colors?.tabBackground || 'rgba(255,255,255,0.05)',
      cardBorder: currentTheme.colors?.dialogBorder || currentTheme.colors?.contentBorder || 'rgba(255,255,255,0.1)',
      cardBackground: currentTheme.colors?.dialogBackground || 'rgba(16, 20, 28, 0.6)',
      sidebarBackground: currentTheme.colors?.sidebarBackground || currentTheme.colors?.contentBackground || '#1e1e1e',
      primaryColor: currentTheme.colors?.buttonPrimary || currentTheme.colors?.primaryColor || '#2196f3',
      // Colores espec\u00EDficos para el buscador para asegurar que resalte en todos los temas
      searchBackground: getContrastBg(currentTheme.colors?.contentBackground || '#1e1e1e', 0.85),
      searchBorder: adjustOpacity(currentTheme.colors?.primaryColor || '#2196f3', 0.5),
      searchFocusBorder: currentTheme.colors?.primaryColor || '#2196f3',
      heroGradientColor: (() => {
        const bg = currentTheme.colors?.contentBackground || '#1e1e1e';
        let r = 30, g = 30, b = 30;
        if (bg.startsWith('#')) {
          const hex = bg.replace('#', '');
          r = parseInt(hex.substring(0, 2), 16) || 0;
          g = parseInt(hex.substring(2, 4), 16) || 0;
          b = parseInt(hex.substring(4, 6), 16) || 0;
        }
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128
          ? adjustOpacity(currentTheme.colors?.primaryColor || '#2196f3', 0.15)
          : adjustOpacity(currentTheme.colors?.primaryColor || '#2196f3', 0.1);
      })()
    };
  }, [currentTheme]);

  const localTerminalBg = React.useMemo(() => {
    const baseColor = themes[localLinuxTerminalTheme]?.theme?.background || themes[localPowerShellTheme]?.theme?.background || '#222';
    return adjustOpacity(baseColor, terminalOpacity);
  }, [localLinuxTerminalTheme, localPowerShellTheme, terminalOpacity]);

  const localTerminalTheme = React.useMemo(() => {
    const t = themes[localLinuxTerminalTheme]?.theme || themes[localPowerShellTheme]?.theme || {};
    return {
      background: t.background || '#0d1117',
      foreground: t.foreground || '#c9d1d9',
      green: t.green || t.brightGreen || '#3fb950',
      cyan: t.cyan || t.brightCyan || '#58a6ff',
      brightBlack: t.brightBlack || '#6e7681',
      selectionBackground: t.selectionBackground || 'rgba(255,255,255,0.08)',
    };
  }, [localLinuxTerminalTheme, localPowerShellTheme]);

  const handleConnectToHistory = (connection) => {
    // console.log('Conectando a:', connection);
    if (connection.type === 'group') {
      // Manejar grupos - cargar todas las sesiones del grupo
      handleLoadGroup(connection);
    } else if (connection.type === 'rdp-guacamole' || connection.type === 'rdp') {
      // Manejar conexiones RDP-Guacamole y RDP
      handleCreateRdpConnection(connection);
    } else if (connection.type === 'vnc-guacamole' || connection.type === 'vnc') {
      // Manejar conexiones VNC-Guacamole y VNC
      handleCreateVncConnection(connection);
    } else if (connection.type === 'ssh-tunnel') {
      // Manejar t\u00FAneles SSH
      if (onOpenSSHTunnel) {
        onOpenSSHTunnel(connection);
      }
    } else if (onCreateSSHConnection) {
      // Manejar conexiones SSH tradicionales
      onCreateSSHConnection(connection);
    }
  };

  const handleLoadGroup = (groupConnection) => {
    if (onLoadGroup) {
      onLoadGroup(groupConnection);
    }
  };

  const handleCreateRdpConnection = (connectionData) => {
    if (onCreateRdpConnection) {
      onCreateRdpConnection(connectionData);
    }
  };

  const handleCreateVncConnection = (connectionData) => {
    if (onCreateVncConnection) {
      onCreateVncConnection(connectionData);
    }
  };

  // Funciones para controlar el estado del terminal
  const handleMinimizeTerminal = React.useCallback(() => {
    setTerminalState(prevState => {
      return prevState === 'minimized' ? 'normal' : 'minimized';
    });
  }, []);

  const handleMaximizeTerminal = React.useCallback(() => {
    setTerminalState(prevState => {
      return prevState === 'maximized' ? 'normal' : 'maximized';
    });
  }, []);


  // Funci\u00F3n para cerrar el terminal y guardar el estado
  const handleCloseTerminal = () => {
    setTerminalHidden(true);
    setTerminalView(true); // Mostrar integrada al cerrar la flotante
    try {
      localStorage.setItem(STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE, 'false');
      // Despachar evento para sincronizar con otros componentes (como SettingsDialog)
      window.dispatchEvent(new CustomEvent('home-tab-local-terminal-visibility-changed'));
    } catch (e) {
      console.error('Error guardando visibilidad del terminal:', e);
    }
  };

  // Funci\u00F3n para toggle de visibilidad del terminal
  const handleToggleTerminalVisibility = () => {
    setTerminalHidden(prev => {
      const newHidden = !prev;
      // Guardar preferencia en localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE, (!newHidden).toString());
        // Despachar evento para sincronizar
        window.dispatchEvent(new CustomEvent('home-tab-local-terminal-visibility-changed'));
      } catch (e) {
        console.error('Error guardando visibilidad del terminal:', e);
      }
      // Mantener exclusividad entre terminal flotante e integrado
      if (!newHidden) {
        setTerminalState('normal');
        setTerminalView(false); // Ocultar integrada si se muestra flotante
      } else {
        setTerminalView(true); // Mostrar integrada si se oculta flotante
      }
      return newHidden;
    });
  };

  // Funci\u00F3n para toggle del chat de IA
  const handleToggleAIChat = () => {
    setShowAIChat(prev => !prev);
  };

  // Funci\u00F3n para toggle de la status bar
  const handleToggleStatusBar = () => {
    setStatusBarVisible(prev => {
      const newValue = !prev;
      // Guardar preferencia en localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE, newValue.toString());
      } catch (e) {
        console.error('Error guardando preferencia de status bar:', e);
      }
      return newValue;
    });
  };

  const handleToggleRightColumn = () => {
    setRightColumnCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_COLLAPSED, next.toString());
      } catch (e) { }
      return next;
    });
  };

  const handleToggleRightColumnVisibility = () => {
    setRightColumnVisible(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_VISIBLE, next.toString());
      } catch (e) { }
      return next;
    });
  };

  const handleToggleHomeCardVisibility = () => {
    setHomeCardVisible(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.HOME_TAB_CARD_VISIBLE, next.toString());
      } catch (e) { }
      return next;
    });
  };

  useEffect(() => {
    const handleExternalToggle = () => {
      if (!showAIChat) return;
      handleToggleTerminalVisibility();
    };
    window.addEventListener('ai-chat-home-toggle-terminal', handleExternalToggle);
    return () => {
      window.removeEventListener('ai-chat-home-toggle-terminal', handleExternalToggle);
    };
  }, [showAIChat, handleToggleTerminalVisibility]);

  // Escuchar cambios de storage para statusBarVisible desde SettingsDialog
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE) {
        const newValue = e.newValue === 'true';
        setStatusBarVisible(newValue);
      }
    };
    const handleCustomEvent = (e) => {
      if (e.detail && typeof e.detail.visible === 'boolean') {
        setStatusBarVisible(e.detail.visible);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('statusbar-visibility-changed', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('statusbar-visibility-changed', handleCustomEvent);
    };
  }, []);

  // Escuchar evento para a\u00F1adir terminal al TabbedTerminal desde la columna derecha
  useEffect(() => {
    const handleAddTerminal = (e) => {
      const { terminalType, distroInfo } = e?.detail || {};
      if (!terminalType) return;
      if (terminalHidden) {
        setTerminalHidden(false);
      }
      setTimeout(() => {
        try {
          tabbedTerminalRef.current?.addTerminalTab?.(terminalType, distroInfo);
        } catch (err) {
          console.warn('[HomeTab] addTerminalTab:', err);
        }
      }, terminalHidden ? 120 : 50);
    };
    window.addEventListener('home-tab-add-terminal', handleAddTerminal);
    return () => window.removeEventListener('home-tab-add-terminal', handleAddTerminal);
  }, [terminalHidden]);

  // Callback para toggling del terminal embebido (llamado por ConnectionHistory via prop)
  const handleTerminalToggle = React.useCallback((show, terminalType, addNewTab = false) => {
    if (show) {
      setTerminalView(true);
      // Ocultar terminal flotante para evitar duplicidad si el integrado se muestra
      setTerminalHidden(true);
      try {
        localStorage.setItem(STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE, 'false');
      } catch (e) { }

      if (addNewTab && embeddedTabbedTerminalRef.current?.addTerminalTab) {
        embeddedTabbedTerminalRef.current.addTerminalTab(terminalType);
      } else if (!embeddedTerminalInitialized.current && terminalType) {
        embeddedTerminalInitialized.current = true;
        // Solo para el terminal embebido, le agregamos el tab expl??cito si es la primera vez
        setTimeout(() => {
          try {
            if (embeddedTabbedTerminalRef.current?.addTerminalTab) {
              embeddedTabbedTerminalRef.current.addTerminalTab(terminalType);
            }
          } catch (err) {
            console.warn('[HomeTab] embedded addTerminalTab:', err);
          }
          window.dispatchEvent(new Event('resize'));
        }, 150); // Dar algo m??s de tiempo para que se monte correctamente en el viewport antes de crear xterm
      } else {
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      }
    } else {
      setTerminalView(false);
    }
  }, []);





  // Panel superior: Nuevo layout con 3 columnas (basado en redesigned pero con ConnectionHistory)
  const topPanel = (
    <>
      {/* Estilos para la animaci\u00F3n del spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* GNOME Style */
          .gnome-dot {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.1);
            color: #fff;
            font-size: 10px;
            cursor: pointer;
            transition: background 0.2s;
          }
          .gnome-dot:hover { background: #e81123; }
          .gnome-controls { display: flex; align-items: center; }

          /* KDE Style */
          .kde-controls { display: flex; align-items: center; gap: 4px; }
          .kde-dot {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${themeColors?.textPrimary || '#fff'};
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s;
          }
          .kde-dot:hover { background: rgba(255,255,255,0.1); }
          .kde-dot.close:hover { background: #e81123; color: #fff !important; }

          /* Custom Thin Icons */
          .custom-icon {
            width: 10px;
            height: 10px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.8;
          }
          .kde-dot:hover .custom-icon, .win-dot:hover .custom-icon { opacity: 1; }
          .icon-min::after {
            content: '';
            width: 10px;
            height: 1px;
            background: currentColor;
          }
          .icon-max::after {
            content: '';
            width: 8px;
            height: 8px;
            border: 1px solid currentColor;
          }
          .icon-close::before, .icon-close::after {
            content: '';
            position: absolute;
            width: 11px;
            height: 1px;
            background: currentColor;
          }
          .icon-close::before { transform: rotate(45deg); }
          .icon-close::after { transform: rotate(-45deg); }

          /* Windows Style */
          .windows-controls { display: flex; align-items: center; }
          .win-dot {
            width: 32px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${themeColors?.textPrimary || '#fff'};
            cursor: pointer;
            transition: all 0.15s;
          }
          .win-dot:hover { background: rgba(255,255,255,0.1); }
          .win-dot.close:hover { background: #e81123; color: #fff !important; }

          /* Futuristic Style */
          .bottom-terminal-frame.futuristic {
            border: 1px solid #00f2ff !important;
            box-shadow: 0 0 20px rgba(0, 242, 255, 0.4) !important;
            clip-path: polygon(0 0, 98% 0, 100% 8%, 100% 100%, 8% 100%, 0 92%);
            background: rgba(10, 15, 25, 0.95) !important;
            padding: 1px;
          }
          .futuristic-controls { display: flex; gap: 10px; }
          .cyber-dot {
            width: 22px; height: 22px;
            border: 1px solid #00f2ff;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; color: #00f2ff; cursor: pointer;
            text-shadow: 0 0 5px #00f2ff;
            transform: skew(-15deg);
            transition: all 0.2s;
          }
          .cyber-dot:hover { background: #00f2ff; color: #000; box-shadow: 0 0 10px #00f2ff; }

          /* Modern Glass Style */
          .bottom-terminal-frame.modern {
            border: 1px solid rgba(255,255,255,0.2) !important;
            backdrop-filter: blur(30px) saturate(180%) !important;
            background: rgba(255, 255, 255, 0.08) !important;
            border-radius: 20px !important;
            overflow: hidden;
          }
          .modern-controls { display: flex; gap: 8px; }
          .glass-dot {
            width: 30px; height: 30px;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.1);
            color: #fff; cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .glass-dot:hover { background: rgba(255,255,255,0.2); transform: translateY(-1px); }

          /* Retro CRT Style */
          .bottom-terminal-frame.retro {
            border: 12px solid #333 !important;
            border-radius: 24px !important;
            box-shadow: inset 0 0 30px rgba(0,0,0,0.9), 0 10px 40px rgba(0,0,0,0.6) !important;
            background: #000 !important;
          }
          .retro-controls { display: flex; gap: 10px; }
          .retro-switch {
            width: 28px; height: 14px;
            background: #444; border: 2px solid #555;
            position: relative; cursor: pointer;
          }
          .retro-switch::after {
            content: ''; position: absolute; left: 2px; top: 2px;
            width: 10px; height: 6px; background: #666;
          }
          .retro-switch.on::after { left: auto; right: 2px; background: #0f0; box-shadow: 0 0 5px #0f0; }

          /* Removed WhiteSur as requested */

          /* Orchis Style */
          .bottom-terminal-frame.orchis {
            border-radius: 24px !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
          }
          .orchis-controls { display: flex; gap: 6px; }
          .orchis-dot {
            width: 24px; height: 24px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            background: rgba(255,255,255,0.05); color: #fff;
            font-size: 10px; cursor: pointer; transition: all 0.2s;
          }
          .orchis-dot:hover { background: rgba(255,255,255,0.1); }

          /* Fluent Style */
          .bottom-terminal-frame.fluent {
            border-radius: 8px !important;
            backdrop-filter: blur(20px) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
          }
          .fluent-controls { display: flex; }
          .fluent-dot {
            width: 36px; height: 32px;
            display: flex; align-items: center; justify-content: center;
            color: #fff; font-size: 10px; cursor: pointer;
            transition: background 0.1s;
          }
          .fluent-dot:hover { background: rgba(255,255,255,0.1); }

          /* Matcha Style */
          .bottom-terminal-frame.matcha {
            border-top: 3px solid #2eb398 !important;
            border-radius: 4px !important;
          }
          .matcha-controls { display: flex; gap: 4px; }
          .matcha-dot {
            width: 26px; height: 26px;
            display: flex; align-items: center; justify-content: center;
            color: #aaa; cursor: pointer;
          }
          .matcha-dot:hover { color: #fff; background: rgba(255,255,255,0.1); }

          /* Force Opacity for all frame styles */
          .bottom-terminal-frame,
          .bottom-terminal-frame.macos, .bottom-terminal-frame.gnome,
          .bottom-terminal-frame.kde, .bottom-terminal-frame.windows,
          .bottom-terminal-frame.matcha, .bottom-terminal-frame.futuristic,
          .bottom-terminal-frame.modern, .bottom-terminal-frame.retro {
            background-color: ${localTerminalBg} !important;
            background: ${localTerminalBg} !important;
          }
        `}
      </style>
      <div style={{
        height: '100%',
        overflow: 'hidden',
        background: dashboardBg,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        opacity: terminalState === 'maximized' ? 0 : 1,
        visibility: terminalState === 'maximized' ? 'hidden' : 'visible',
        transition: 'opacity 0.1s ease, visibility 0.1s ease'
      }}>
        <OverlayPanel ref={homeOptionsOverlayRef} style={{ width: '260px', background: themeColors.cardBackground || '#1e1e1e' }}>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: themeColors.textPrimary || '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Opacidad</span>
                <span style={{ color: themeColors.textSecondary || '#aaa', fontSize: '0.8rem' }}>{Math.round(terminalOpacity * 100)}%</span>
              </div>
              <Slider
                value={terminalOpacity * 100}
                onChange={(e) => setTerminalOpacity(e.value / 100)}
                min={5}
                max={100}
                step={1}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: themeColors.textPrimary || '#fff', fontSize: '0.86rem' }}>Pestañas</span>
              <button
                type="button"
                onClick={() => setShowLocalTerminalTabs(prev => !prev)}
                style={{
                  border: `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.2)'}`,
                  background: showLocalTerminalTabs
                    ? (themeColors.primaryColor || '#2196f3')
                    : 'rgba(120,120,120,0.25)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '0.2rem 0.65rem',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
              >
                {showLocalTerminalTabs ? 'Visible' : 'Oculta'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: themeColors.textPrimary || '#fff', fontSize: '0.86rem' }}>Status bar terminal local</span>
              <button
                type="button"
                onClick={handleToggleStatusBar}
                style={{
                  border: `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.2)'}`,
                  background: statusBarVisible
                    ? (themeColors.primaryColor || '#2196f3')
                    : 'rgba(120,120,120,0.25)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '0.2rem 0.65rem',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
              >
                {statusBarVisible ? 'Visible' : 'Oculta'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: themeColors.textPrimary || '#fff', fontSize: '0.86rem' }}>Barra derecha (accesos rápidos)</span>
              <button
                type="button"
                onClick={handleToggleRightColumnVisibility}
                style={{
                  border: `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.2)'}`,
                  background: rightColumnVisible
                    ? (themeColors.primaryColor || '#2196f3')
                    : 'rgba(120,120,120,0.25)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '0.2rem 0.65rem',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
              >
                {rightColumnVisible ? 'Visible' : 'Oculta'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: themeColors.textPrimary || '#fff', fontSize: '0.86rem' }}>Tarjeta Home (Buscador/Acciones)</span>
              <button
                type="button"
                onClick={handleToggleHomeCardVisibility}
                style={{
                  border: `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.2)'}`,
                  background: homeCardVisible
                    ? (themeColors.primaryColor || '#2196f3')
                    : 'rgba(120,120,120,0.25)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '0.2rem 0.65rem',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
              >
                {homeCardVisible ? 'Visible' : 'Oculta'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: themeColors.textPrimary || '#fff', fontSize: '0.86rem' }}>Modo Minimalista Absoluto</span>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.dispatchEvent(new CustomEvent('toggle-minimal-mode'));
                  } catch (e) { /* noop */ }
                }}
                style={{
                  border: `1px solid ${isMinimalMode ? (themeColors.primaryColor || '#2196f3') : (themeColors.borderColor || 'rgba(255,255,255,0.2)')}`,
                  background: isMinimalMode
                    ? (themeColors.primaryColor || '#2196f3')
                    : 'rgba(120,120,120,0.25)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '0.2rem 0.65rem',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
              >
                {isMinimalMode ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          </div>
        </OverlayPanel>
        <div className="home-page-scroll" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Layout principal: \u00E1rea central + columna derecha */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            height: '100%'
          }}>
            {/* \u00C1reas central */}
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Mostrar Chat de IA o contenido normal */}
              {showAIChat ? (
                // Panel de Chat de IA
                <div style={{
                  flex: 1,
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    flex: 1,
                    background: `linear-gradient(135deg,
                  rgba(16, 20, 28, 0.6) 0%,
                  rgba(16, 20, 28, 0.4) 100%)`,
                    backdropFilter: 'blur(8px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                    border: `1px solid ${themeColors.cardBorder}`,
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                    overflow: 'hidden'
                  }}>
                    <AIChatWithHistory />
                  </div>
                </div>
              ) : (
                // Contenido normal: ConnectionHistory maneja todo, incluido el terminal si terminalView
                <ConnectionHistory
                  onConnectToHistory={handleConnectToHistory}
                  recentConnections={recentConnections}
                  activeIds={activeIds}
                  onEdit={onEditConnection}
                  themeColors={themeColors}
                  sidebarNodes={sidebarNodes}
                  masterKey={masterKey}
                  secureStorage={secureStorage}
                  terminalView={terminalView}
                  onTerminalToggle={handleTerminalToggle}
                  terminalTheme={themes[localLinuxTerminalTheme]?.theme || themes['Nord']?.theme || {}}
                  localLinuxTerminalTheme={localLinuxTerminalTheme}
                  setLocalLinuxTerminalTheme={setLocalLinuxTerminalTheme}
                  terminalTitle={`/local \u00B7 ${terminalTitle}`}
                  onOpenSettings={onOpenSettings}
                  onToggleTerminalVisibility={handleToggleTerminalVisibility}
                  terminalFrameStyle={terminalFrameStyle}
                  setTerminalFrameStyle={setTerminalFrameStyle}
                  terminalOpacity={terminalOpacity}
                  onTerminalOpacityChange={setTerminalOpacity}
                  onOpenHomeOptions={(e) => homeOptionsOverlayRef.current?.toggle(e)}
                  homeCardVisible={homeCardVisible}
                  statusBarVisible={statusBarVisible}
                  onSwitchTerminal={(type, info) => {
                    if (showLocalTerminalTabs && embeddedTabbedTerminalRef.current?.addTerminalTab) {
                      embeddedTabbedTerminalRef.current.addTerminalTab(type, info);
                    } else if (embeddedTabbedTerminalRef.current?.replaceActiveTabWithTerminal) {
                      embeddedTabbedTerminalRef.current.replaceActiveTabWithTerminal(type, info);
                    }
                  }}
                >
                  {/* Terminal body - always mounted to preserve state */}
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
                    <TabbedTerminal
                      ref={embeddedTabbedTerminalRef}
                      terminalState="normal"
                      localFontFamily={localFontFamily}
                      localFontSize={localFontSize}
                      localPowerShellTheme={localPowerShellTheme}
                      localLinuxTerminalTheme={localLinuxTerminalTheme}
                      hideStatusBar={true}
                      hideTabs={!showLocalTerminalTabs}
                      isIntegrated={true}
                      persistenceKey={STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_WORKSPACE}
                      onTabChange={(tab) => setTerminalTitle(tab.title)}
                    />
                  </div>
                </ConnectionHistory>
              )}
            </div>
          </div>
        </div >
      </div >
    </>
  );

  // Panel inferior: Terminal con pesta\u00F1as flotante
  const bottomPanel = (
    <div
      className={`bottom-terminal-frame ${terminalFrameStyle}`}
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: localTerminalBg,
        borderRadius: terminalState === 'maximized' ? '0' : (terminalFrameStyle === 'modern' ? '20px' : (terminalFrameStyle === 'retro' ? '24px' : '8px')),
        boxShadow: terminalState === 'maximized' ? 'none' : '0 10px 30px rgba(0,0,0,0.5)',
        border: terminalState === 'maximized' ? 'none' : (['futuristic', 'modern', 'retro', 'matcha'].includes(terminalFrameStyle) ? 'none' : `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.1)'}`)
      }}
    >
      {/* Universal header wrapper */}
      <div
        className="terminal-drag-handle"
        style={{
          height: '36px',
          background: themeColors.cardBackground || 'rgba(255, 255, 255, 0.03)',
          borderBottom: ['futuristic', 'modern', 'retro', 'matcha'].includes(terminalFrameStyle) ? 'none' : `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.1)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          cursor: terminalState === 'maximized' ? 'default' : 'grab',
          flexShrink: 0,
          position: 'relative',
          borderTopLeftRadius: terminalState === 'maximized' ? '0' : (terminalFrameStyle === 'modern' ? '20px' : (terminalFrameStyle === 'retro' ? '24px' : (terminalFrameStyle === 'orchis' ? '24px' : '8px'))),
          borderTopRightRadius: terminalState === 'maximized' ? '0' : (terminalFrameStyle === 'modern' ? '20px' : (terminalFrameStyle === 'retro' ? '24px' : (terminalFrameStyle === 'orchis' ? '24px' : '8px'))),
        }}
        onMouseDown={(e) => { if (terminalState !== 'maximized') e.currentTarget.style.cursor = 'grabbing'; }}
        onMouseUp={(e) => { if (terminalState !== 'maximized') e.currentTarget.style.cursor = 'grab'; }}
        onMouseLeave={(e) => { if (terminalState !== 'maximized') e.currentTarget.style.cursor = 'grab'; }}
        onDoubleClick={handleMaximizeTerminal}
      >
        <div style={{ display: 'flex', gap: '8px', zIndex: 10 }}>
          {terminalFrameStyle === 'macos' ? (
            <>
              <div
                className="no-drag"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleCloseTerminal}
                style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56', cursor: 'pointer', border: '1px solid #e0443e' }}
                title="Cerrar" />
              <div
                className="no-drag"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleMinimizeTerminal}
                style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e', cursor: 'pointer', border: '1px solid #dea123' }}
                title="Minimizar" />
              <div
                className="no-drag"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleMaximizeTerminal}
                style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f', cursor: 'pointer', border: '1px solid #1aab29' }}
                title="Maximizar" />
            </>
          ) : terminalFrameStyle === 'gnome' ? (
            <div className="gnome-controls no-drag" onMouseDown={(e) => e.stopPropagation()}>
              <div className="gnome-dot minimize" title="Minimizar" onClick={handleMinimizeTerminal}>
                <i className="pi pi-minus" style={{ fontSize: '8px' }} />
              </div>
              <div className="gnome-dot maximize" title="Maximizar" onClick={handleMaximizeTerminal}>
                <i className="pi pi-stop" style={{ fontSize: '8px' }} />
              </div>
              <div className="gnome-dot close" title="Cerrar" onClick={handleCloseTerminal}>
                <i className="pi pi-times" />
              </div>
            </div>
          ) : terminalFrameStyle === 'kde' ? (
            <div className="kde-controls no-drag" onMouseDown={(e) => e.stopPropagation()}>
              <div className="kde-dot minimize" title="Minimizar" onClick={handleMinimizeTerminal}><div className="custom-icon icon-min" /></div>
              <div className="kde-dot maximize" title="Maximizar" onClick={handleMaximizeTerminal}><div className="custom-icon icon-max" /></div>
              <div className="kde-dot close" title="Cerrar" onClick={handleCloseTerminal}><div className="custom-icon icon-close" /></div>
            </div>
          ) : terminalFrameStyle === 'windows' ? (
            <div className="windows-controls no-drag" onMouseDown={(e) => e.stopPropagation()}>
              <div className="win-dot minimize" title="Minimizar" onClick={handleMinimizeTerminal}><div className="custom-icon icon-min" /></div>
              <div className="win-dot maximize" title="Maximizar" onClick={handleMaximizeTerminal}><div className="custom-icon icon-max" /></div>
              <div className="win-dot close" title="Cerrar" onClick={handleCloseTerminal}><div className="custom-icon icon-close" /></div>
            </div>
          ) : terminalFrameStyle === 'matcha' ? (
            <div className="matcha-controls no-drag" onMouseDown={(e) => e.stopPropagation()}>
              <div className="matcha-dot" onClick={handleMinimizeTerminal} title="Minimizar"><i className="pi pi-minus" style={{ fontSize: '10px' }} /></div>
              <div className="matcha-dot" onClick={handleMaximizeTerminal} title="Maximizar"><i className="pi pi-stop" style={{ fontSize: '10px' }} /></div>
              <div className="matcha-dot" onClick={handleCloseTerminal} title="Cerrar"><i className="pi pi-times" /></div>
            </div>
          ) : terminalFrameStyle === 'futuristic' ? (
            <div className="futuristic-controls no-drag" onMouseDown={(e) => e.stopPropagation()}>
              <div className="cyber-dot minimize" title="Minimizar" onClick={handleMinimizeTerminal}>MIN</div>
              <div className="cyber-dot maximize" title="Maximizar" onClick={handleMaximizeTerminal}>MAX</div>
              <div className="cyber-dot close" title="Cerrar Terminal" onClick={handleCloseTerminal}>EXE</div>
            </div>
          ) : terminalFrameStyle === 'modern' ? (
            <div className="modern-controls no-drag" onMouseDown={(e) => e.stopPropagation()}>
              <div className="glass-dot minimize" title="Minimizar" onClick={handleMinimizeTerminal}><i className="pi pi-minus" style={{ fontSize: '10px' }} /></div>
              <div className="glass-dot maximize" title="Maximizar" onClick={handleMaximizeTerminal}><i className="pi pi-stop" style={{ fontSize: '10px' }} /></div>
              <div className="glass-dot close" title="Ocultar" onClick={handleCloseTerminal}><i className="pi pi-times" /></div>
            </div>
          ) : terminalFrameStyle === 'minimal' ? (
            <div className="minimal-controls no-drag" onMouseDown={(e) => e.stopPropagation()}>
              <div className="win-dot minimize" title="Minimizar" onClick={handleMinimizeTerminal}><div className="custom-icon icon-min" /></div>
              <div className="win-dot maximize" title="Maximizar" onClick={handleMaximizeTerminal}><div className="custom-icon icon-max" /></div>
              <div className="win-dot close" title="Cerrar" onClick={handleCloseTerminal}><div className="custom-icon icon-close" /></div>
            </div>
          ) : (
            <div className="retro-controls no-drag" onMouseDown={(e) => e.stopPropagation()}>
              <div className="retro-switch minimize" title="MIN" onClick={handleMinimizeTerminal} />
              <div className="retro-switch maximize" title="MAX" onClick={handleMaximizeTerminal} />
              <div className="retro-switch on" title="OFF" onClick={handleCloseTerminal} />
            </div>
          )}
        </div>

        <div style={{
          position: 'absolute', left: 0, right: 0, textAlign: 'center',
          color: terminalFrameStyle === 'futuristic' ? '#00f2ff' : (terminalFrameStyle === 'retro' ? '#0f0' : themeColors.textSecondary),
          fontSize: terminalFrameStyle === 'retro' ? '12px' : '11px',
          userSelect: 'none', pointerEvents: 'none', fontWeight: 500,
          textShadow: terminalFrameStyle === 'futuristic' ? '0 0 8px #00f2ff' : (terminalFrameStyle === 'retro' ? '0 0 5px #0f0' : 'none'),
          fontFamily: terminalFrameStyle === 'retro' ? '"Courier New", monospace' : 'inherit'
        }}>
          {terminalTitle}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>

          {/* Opacity toggle hidden for floating terminal since it is now opaque */}

          <div style={{ width: '12px' }}></div>
        </div>
      </div>




      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: terminalState === 'minimized' ? 'none' : 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        <TabbedTerminal
          ref={tabbedTerminalRef}
          onMinimize={handleMinimizeTerminal}
          onMaximize={handleMaximizeTerminal}
          terminalState={terminalState}
          localFontFamily={localFontFamily}
          localFontSize={localFontSize}
          localPowerShellTheme={localPowerShellTheme}
          localLinuxTerminalTheme={localLinuxTerminalTheme}
          hideStatusBar={true}
          isIntegrated={false}
          onTabChange={(tab) => setTerminalTitle(tab.title)}
        />
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        background: dashboardBg,
        overflow: 'hidden'
      }}>
      <div
        style={{
          height: (statusBarVisible && !terminalView) ? 'calc(100% - 40px)' : '100%',
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}
        data-split-container-wrapper="true"
      >
        <div style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden'
        }}>
          {/* Main area with Dashboard and Terminal */}
          <div
            ref={mainAreaRef}
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {topPanel}

            {!terminalHidden && isRndInitialized && (
              <Rnd
                size={
                  terminalState === 'maximized'
                    ? { width: '100%', height: '100%' }
                    : (terminalState === 'minimized' ? { height: 32, width: rndSize.width } : rndSize)
                }
                position={
                  terminalState === 'maximized'
                    ? { x: 0, y: 0 }
                    : rndPosition
                }
                onDragStop={(e, d) => {
                  if (terminalState !== 'maximized') {
                    setRndPosition({ x: d.x, y: d.y });
                    setHasUserMovedTerminal(true);
                  }
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  if (terminalState !== 'maximized' && terminalState !== 'minimized') {
                    setRndSize({ width: ref.style.width, height: ref.style.height });
                    setRndPosition(position);
                    setHasUserMovedTerminal(true);
                  }
                }}
                minWidth={300}
                minHeight={terminalState === 'minimized' ? 32 : 200}
                bounds="parent"
                dragHandleClassName="terminal-drag-handle"
                cancel=".no-drag"
                style={{
                  zIndex: 100,
                  display: 'flex',
                  position: 'absolute'
                }}
                disableDragging={terminalState === 'maximized'}
                enableResizing={terminalState !== 'maximized' && terminalState !== 'minimized' ? {
                  bottom: true, bottomLeft: true, bottomRight: true,
                  left: true, right: true,
                  top: true, topLeft: true, topRight: true
                } : false}
              >
                {bottomPanel}
              </Rnd>
            )}
          </div>

          {/* Sidebar Area - Outside the vertical split to remain at full height */}
          {rightColumnVisible && (
            <NodeTermStatus
              variant="rightColumn"
              collapsed={rightColumnCollapsed}
              sshConnectionsCount={sshConnectionsCount}
              foldersCount={foldersCount}
              rdpConnectionsCount={rdpConnectionsCount}
              themeColors={themeColors}
              onOpenSettings={onOpenSettings}
              onToggleTerminalVisibility={handleToggleTerminalVisibility}
              onToggleAIChat={handleToggleAIChat}
              onToggleStatusBar={handleToggleStatusBar}
              onCollapse={handleToggleRightColumn}
              showAIChat={showAIChat}
              statusBarVisible={statusBarVisible}
              setShowCreateGroupDialog={setShowCreateGroupDialog}
            />
          )}
        </div>
      </div>
      <StandaloneStatusBar visible={statusBarVisible && !terminalView} />
    </div>
  );
};

export default HomeTab;
