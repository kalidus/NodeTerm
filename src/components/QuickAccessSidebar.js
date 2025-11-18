import React, { useState, useEffect, useCallback } from 'react';
import { uiThemes } from '../themes/ui-themes';
import { themeManager } from '../utils/themeManager';

const QuickAccessSidebar = ({ 
  onCreateSSHConnection, 
  onCreateFolder,
  onOpenFileExplorer,
  onOpenSettings,
  sshConnectionsCount = 0,
  foldersCount = 0,
  onToggleTerminalVisibility,
  onToggleAIChat,
  onToggleStatusBar,
  showAIChat = false,
  statusBarVisible = true
}) => {
  // Estados para terminales detectados dinámicamente
  const [wslDistributions, setWSLDistributions] = useState([]);
  const [cygwinAvailable, setCygwinAvailable] = useState(false);
  const [dockerContainers, setDockerContainers] = useState([]);
  const [availableTerminals, setAvailableTerminals] = useState([]);
  const [quickActionItems, setQuickActionItems] = useState([]);
  
  // Estado para el tema
  const [themeVersion, setThemeVersion] = useState(0);
  
  // Estado para manejar la transición del botón
  const [isToggling, setIsToggling] = useState(false);
  
  // Estado para mantener los datos durante la transición
  const [cachedQuickActions, setCachedQuickActions] = useState([]);
  
  // Estado global de transición para evitar re-renders
  const [isGlobalTransition, setIsGlobalTransition] = useState(false);

  // Escuchar cambios en el tema
  useEffect(() => {
    const onThemeChanged = () => {
      setThemeVersion(v => v + 1); // Forzar re-render
    };
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  // Detectar estado de transición desde localStorage
  useEffect(() => {
    const checkTransitionState = () => {
      const isTransitioning = localStorage.getItem('quickaccess_transition') === 'true';
      setIsGlobalTransition(isTransitioning);
    };
    
    // Limpiar estado de transición al montar (por si quedó atascado)
    localStorage.removeItem('quickaccess_transition');
    setIsGlobalTransition(false);
    setIsToggling(false);
    
    checkTransitionState();
    
    // Verificar cada 100ms durante la transición
    const interval = setInterval(() => {
      checkTransitionState();
    }, 100);
    
    // Cleanup al desmontar
    return () => {
      clearInterval(interval);
      localStorage.removeItem('quickaccess_transition');
      setIsGlobalTransition(false);
      setIsToggling(false);
    };
  }, []);

  // Obtener el tema actual y colores
  const currentTheme = React.useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [themeVersion]);

  const themeColors = React.useMemo(() => {
    return {
      cardBorder: currentTheme.colors?.dialogBorder || currentTheme.colors?.contentBorder || 'rgba(255,255,255,0.1)',
      primaryColor: currentTheme.colors?.primaryColor || '#2196f3'
    };
  }, [currentTheme]);

  // Handlers for actions that don't come from props
  const handleOpenPasswords = () => {
    try {
      // Expandir la sidebar si está colapsada
      const expandSidebarEvent = new CustomEvent('expand-sidebar');
      window.dispatchEvent(expandSidebarEvent);
      
      // Abrir el gestor de contraseñas
      window.dispatchEvent(new CustomEvent('open-password-manager'));
    } catch (e) { /* noop */ }
  };

  const handleOpenAuditGlobal = async () => {
    try {
      if (window?.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('recording:list', {});
        if (result && result.success && Array.isArray(result.recordings) && result.recordings.length > 0) {
          const auditTabId = `audit_global_${Date.now()}`;
          window.dispatchEvent(new CustomEvent('create-audit-tab', {
            detail: {
              tabId: auditTabId,
              title: 'Auditoría Global',
              recordings: result.recordings
            }
          }));
        }
      }
    } catch (e) { /* noop */ }
  };

  const handleToggleTerminalVisibility = useCallback(async () => {
    try {
      if (isToggling || isGlobalTransition) return; // Evitar múltiples clicks
      
      setIsToggling(true);
      setIsGlobalTransition(true);
      
      // Guardar estado actual en localStorage
      localStorage.setItem('quickaccess_transition', 'true');
      
      // Usar requestAnimationFrame para una transición más suave
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      if (onToggleTerminalVisibility) {
        onToggleTerminalVisibility();
      }
      
      // Transición más larga para dar tiempo a que se estabilice el estado
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setIsToggling(false);
      setIsGlobalTransition(false);
      localStorage.removeItem('quickaccess_transition');
    } catch (e) { 
      setIsToggling(false);
      setIsGlobalTransition(false);
      localStorage.removeItem('quickaccess_transition');
    }
  }, [onToggleTerminalVisibility, isToggling, isGlobalTransition]);

  // Handler genérico para abrir terminales
  const handleOpenTerminal = (terminalType, distroInfo = null) => {
    try {
      window.dispatchEvent(new CustomEvent('create-terminal-tab', {
        detail: { 
          type: terminalType,
          distroInfo: distroInfo
        }
      }));
    } catch (e) { /* noop */ }
  };

  // Detectar distribuciones WSL
  useEffect(() => {
    const detectWSLDistributions = async () => {
      try {
        if (window.electron && window.electron.ipcRenderer) {
          const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
          if (Array.isArray(distributions)) {
            setWSLDistributions(distributions);
          } else {
            setWSLDistributions([]);
          }
        } else {
          setWSLDistributions([]);
        }
      } catch (error) {
        console.error('Error en detección de distribuciones WSL:', error);
        setWSLDistributions([]);
      }
    };
    
    detectWSLDistributions();
  }, []);

  // Detectar disponibilidad de Cygwin
  useEffect(() => {
    const detectCygwin = async () => {
      if (window.electron && window.electron.platform === 'win32') {
        try {
          const result = await window.electronAPI.invoke('cygwin:detect');
          if (result && typeof result.available === 'boolean') {
            setCygwinAvailable(result.available);
          } else {
            setCygwinAvailable(false);
          }
        } catch (error) {
          console.error('Error detectando Cygwin:', error);
          setCygwinAvailable(false);
        }
      } else {
        setCygwinAvailable(false);
      }
    };
    
    detectCygwin();
  }, []);

  // Detectar contenedores Docker disponibles (UNA SOLA VEZ al montar)
  useEffect(() => {
    let mounted = true;
    
    const detectDocker = async () => {
      try {
        if (window.electron && window.electronAPI && mounted) {
          const result = await window.electronAPI.invoke('docker:list');
          if (mounted && result && result.success && Array.isArray(result.containers)) {
            console.log(`🐳 Docker detectado: ${result.containers.length} contenedor(es)`);
            setDockerContainers(result.containers);
          } else {
            setDockerContainers([]);
          }
        }
      } catch (error) {
        console.error('❌ Error detectando Docker:', error);
        setDockerContainers([]);
      }
    };
    
    detectDocker();
    
    // Cleanup
    return () => {
      mounted = false;
    };
  }, []); // Solo ejecutar UNA VEZ al montar

  // Generar lista de terminales disponibles
  useEffect(() => {
    const platform = window.electron?.platform || 'unknown';
    const terminals = [];

    if (platform === 'win32') {
      // PowerShell siempre disponible en Windows
      terminals.push({
        label: 'PowerShell',
        value: 'powershell',
        icon: 'pi pi-microsoft',
        color: '#0078D4',
        action: () => handleOpenTerminal('powershell')
      });

      // WSL genérico
      terminals.push({
        label: 'WSL',
        value: 'wsl',
        icon: 'pi pi-server',
        color: '#4fc3f7',
        action: () => handleOpenTerminal('wsl')
      });

      // Cygwin si está disponible
      terminals.push({
        label: cygwinAvailable ? 'Cygwin' : 'Cygwin',
        value: 'cygwin',
        icon: 'pi pi-code',
        color: '#00FF00',
        action: () => handleOpenTerminal('cygwin')
      });
      
      // Agregar distribuciones WSL detectadas (sin duplicar las básicas)
      wslDistributions.forEach(distro => {
        // Evitar duplicados de Ubuntu y Debian básicos
        const isBasicUbuntu = distro.name === 'ubuntu' && !distro.label.includes('24.04');
        const isBasicDebian = distro.name === 'debian';
        
        if (!isBasicUbuntu && !isBasicDebian) {
          terminals.push({
            label: distro.label,
            value: `wsl-${distro.name}`,
            icon: distro.icon,
            color: getColorForCategory(distro.category),
            action: () => handleOpenTerminal(`wsl-${distro.name}`, distro),
            distroInfo: distro
          });
        }
      });

      // Agregar contenedores Docker si están disponibles
      if (dockerContainers.length > 0) {
        dockerContainers.forEach(container => {
          terminals.push({
            label: `Docker: ${container.name}`,
            value: `docker-${container.name}`,
            icon: 'pi pi-box',
            color: '#2496ED',
            action: () => handleOpenTerminal(`docker-${container.name}`, { dockerContainer: container }),
            dockerContainer: container,
            category: 'docker'
          });
        });
      }
    } else if (platform === 'linux' || platform === 'darwin') {
      terminals.push({
        label: 'Terminal',
        value: 'linux-terminal',
        icon: 'pi pi-desktop',
        color: '#4fc3f7',
        action: () => handleOpenTerminal('linux-terminal')
      });
    } else {
      terminals.push({
        label: 'Terminal',
        value: 'powershell',
        icon: 'pi pi-desktop',
        color: '#4fc3f7',
        action: () => handleOpenTerminal('powershell')
      });
    }

    setAvailableTerminals(terminals);
  }, [wslDistributions, cygwinAvailable, dockerContainers]);

  // Configurar acciones principales
  useEffect(() => {
    // Obtener el color primario del tema actual
    const primaryColor = currentTheme.colors?.buttonPrimary || currentTheme.colors?.primaryColor || '#2196f3';
    
    const actions = [
      {
        label: 'Historial',
        icon: 'pi pi-list',
        color: primaryColor,
        description: 'Ver y gestionar sesiones',
        action: () => {
          // Expandir la sidebar si está colapsada
          const expandSidebarEvent = new CustomEvent('expand-sidebar');
          window.dispatchEvent(expandSidebarEvent);
          
          // Cambiar a vista de conexiones si está en vista de passwords
          const switchToConnectionsEvent = new CustomEvent('switch-to-connections');
          window.dispatchEvent(switchToConnectionsEvent);
        },
        badge: null
      },
      {
        label: 'Gestor de Contraseñas',
        icon: 'pi pi-key',
        color: primaryColor,
        description: 'Ver y gestionar passwords',
        action: handleOpenPasswords,
        badge: null
      },
      {
        label: 'Auditoría Global',
        icon: 'pi pi-video',
        color: primaryColor,
        description: 'Ver grabaciones y auditoría',
        action: handleOpenAuditGlobal,
        badge: null
      },
      {
        label: 'Configuración',
        icon: 'pi pi-cog',
        color: primaryColor,
        description: 'Ajustes y preferencias',
        action: onOpenSettings,
        badge: null
      }
    ];

    setQuickActionItems(actions);
    setCachedQuickActions(actions);
  }, [onOpenSettings, handleToggleTerminalVisibility, currentTheme]);

  // Función para obtener colores según la categoría
  const getColorForCategory = (category) => {
    const colorMap = {
      'ubuntu': '#E95420',
      'debian': '#A81D33',
      'kali': '#557C94',
      'alpine': '#0D597F',
      'opensuse': '#73BA25',
      'fedora': '#294172',
      'centos': '#262577',
      'default': '#8ae234'
    };
    return colorMap[category] || colorMap.default;
  };

  // Renderizar botón de acción principal
  const renderActionButton = (action, index) => {
    return (
      <div
        key={index}
        title={action.description || action.label}
        style={{
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          background: `linear-gradient(135deg, 
            rgba(255,255,255,0.08) 0%, 
            rgba(255,255,255,0.04) 50%, 
            rgba(255,255,255,0.02) 100%)`,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: `1px solid rgba(255,255,255,0.12)`,
          position: 'relative',
          width: '100%',
          height: '48px',
          borderRadius: '12px',
          boxShadow: `0 2px 8px rgba(0,0,0,0.08), 
                      0 1px 3px rgba(0,0,0,0.12),
                      inset 0 1px 0 rgba(255,255,255,0.15)`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem',
          marginBottom: '0.125rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.background = `linear-gradient(135deg, 
            rgba(255,255,255,0.12) 0%, 
            rgba(255,255,255,0.08) 50%, 
            rgba(255,255,255,0.04) 100%)`;
          e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.12), 
                                              0 2px 8px rgba(0,0,0,0.16),
                                              inset 0 1px 0 rgba(255,255,255,0.2)`;
          e.currentTarget.style.borderColor = `rgba(255,255,255,0.18)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.background = `linear-gradient(135deg, 
            rgba(255,255,255,0.08) 0%, 
            rgba(255,255,255,0.04) 50%, 
            rgba(255,255,255,0.02) 100%)`;
          e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.08), 
                                              0 1px 3px rgba(0,0,0,0.12),
                                              inset 0 1px 0 rgba(255,255,255,0.15)`;
          e.currentTarget.style.borderColor = `rgba(255,255,255,0.12)`;
        }}
        onClick={action.action}
      >
        {/* Icono de acción con diseño más sutil */}
        <div style={{ 
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: `linear-gradient(135deg, 
            ${action.color} 0%, 
            ${action.color}dd 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 2px 8px ${action.color}30, 
                      0 1px 3px ${action.color}20,
                      inset 0 1px 0 rgba(255,255,255,0.25)`,
          border: `1px solid ${action.color}aa`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <i 
            className={action.icon}
            style={{ 
              fontSize: '1rem',
              color: 'white',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
              position: 'relative',
              zIndex: 1
            }}
          />
          
          {/* Efecto de resplandor más sutil */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${action.color}30 0%, transparent 60%)`,
            filter: 'blur(1px)',
            opacity: '0.6'
          }} />
        </div>
      </div>
    );
  };

  // Renderizar botón de terminal
  const renderTerminalButton = (terminal, index) => {
    // Si es un encabezado de categoría, renderizarlo diferente
    if (terminal.isHeader) {
      return (
        <div
          key={index}
          style={{
            padding: '0.75rem 0.5rem',
            color: '#666666',
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginTop: '0.5rem',
            marginBottom: '0.25rem',
            textAlign: 'left',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {terminal.label}
        </div>
      );
    }
    
    return (
      <div
        key={index}
        title={terminal.label}
        style={{
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          background: `linear-gradient(135deg, 
            rgba(255,255,255,0.06) 0%, 
            rgba(255,255,255,0.03) 50%, 
            rgba(255,255,255,0.01) 100%)`,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: `1px solid rgba(255,255,255,0.1)`,
          position: 'relative',
          width: '100%',
          height: '48px',
          borderRadius: '12px',
          boxShadow: `0 2px 8px rgba(0,0,0,0.06), 
                      0 1px 3px rgba(0,0,0,0.1),
                      inset 0 1px 0 rgba(255,255,255,0.12)`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem',
          marginBottom: '0.125rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.background = `linear-gradient(135deg, 
            rgba(255,255,255,0.1) 0%, 
            rgba(255,255,255,0.06) 50%, 
            rgba(255,255,255,0.03) 100%)`;
          e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.1), 
                                              0 2px 8px rgba(0,0,0,0.14),
                                              inset 0 1px 0 rgba(255,255,255,0.18)`;
          e.currentTarget.style.borderColor = `rgba(255,255,255,0.15)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.background = `linear-gradient(135deg, 
            rgba(255,255,255,0.06) 0%, 
            rgba(255,255,255,0.03) 50%, 
            rgba(255,255,255,0.01) 100%)`;
          e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.06), 
                                              0 1px 3px rgba(0,0,0,0.1),
                                              inset 0 1px 0 rgba(255,255,255,0.12)`;
          e.currentTarget.style.borderColor = `rgba(255,255,255,0.1)`;
        }}
        onClick={terminal.action}
      >
        {/* Icono con diseño más sutil */}
        <div style={{ 
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: `linear-gradient(135deg, 
            ${terminal.color} 0%, 
            ${terminal.color}dd 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 2px 8px ${terminal.color}25, 
                      0 1px 3px ${terminal.color}15,
                      inset 0 1px 0 rgba(255,255,255,0.25)`,
          border: `1px solid ${terminal.color}aa`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <i 
            className={terminal.icon}
            style={{ 
              fontSize: '1rem',
              color: 'white',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
              position: 'relative',
              zIndex: 1
            }}
          />
          
          {/* Efecto de resplandor más sutil */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${terminal.color}25 0%, transparent 60%)`,
            filter: 'blur(1px)',
            opacity: '0.6'
          }} />
        </div>
      </div>
    );
  };

  return (
      <>
        {/* Estilos para la animación del spinner */}
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={{
        width: '60px',
        height: 'auto',
        maxHeight: 'calc(100% - 120px)',
        minHeight: '200px',
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0.5rem 0.3rem',
        gap: '0.25rem',
        position: 'relative',
        overflow: 'hidden',
        margin: '10px 6px 10px 10px',
        boxSizing: 'border-box',
        alignSelf: 'flex-start'
      }}>
      {/* Overlay sutil para el efecto glassmorphism */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.1) 100%)',
        pointerEvents: 'none',
        borderRadius: '14px'
      }} />
      
      {/* Botón de Terminal Local - diseño moderno */}
      <div
        title={'Mostrar/ocultar terminal local'}
        style={{
          cursor: isToggling ? 'wait' : 'pointer',
          transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          background: isToggling 
            ? `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%)`,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: isToggling 
            ? '1px solid rgba(0,188,212,0.4)'
            : '1px solid rgba(255,255,255,0.12)',
          position: 'relative',
          width: '100%',
          height: '48px',
          minHeight: '48px',
          maxHeight: '48px',
          borderRadius: '12px',
          boxShadow: isToggling 
            ? '0 4px 16px rgba(0,188,212,0.2), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem',
          marginBottom: '0.125rem',
          flexShrink: 0,
          boxSizing: 'border-box',
          opacity: isToggling ? 0.9 : 1,
          transform: isToggling ? 'scale(0.99)' : 'scale(1)'
        }}
        onMouseEnter={(e) => {
          if (!isToggling) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.background = `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)`;
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.2)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isToggling) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%)`;
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }
        }}
        onClick={handleToggleTerminalVisibility}
      >
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #00BCD4 0%, #00BCD4dd 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,188,212,0.3), 0 1px 3px rgba(0,188,212,0.2), inset 0 1px 0 rgba(255,255,255,0.25)',
          border: '1px solid rgba(0,188,212,0.7)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Icono con indicador de carga */}
          {isToggling ? (
            <i
              className="pi pi-spin pi-spinner"
              style={{
                fontSize: '1rem',
                color: 'white',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                position: 'relative',
                zIndex: 1
              }}
            />
          ) : (
            <i
              className="pi pi-desktop"
              style={{
                fontSize: '1rem',
                color: 'white',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                position: 'relative',
                zIndex: 1
              }}
            />
          )}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,188,212,0.3) 0%, transparent 60%)',
            filter: 'blur(1px)',
            opacity: '0.6'
          }} />
        </div>
      </div>

      {/* Botón de Status Bar */}
      <div
        title={statusBarVisible ? 'Ocultar status bar' : 'Mostrar status bar'}
        style={{
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          background: statusBarVisible
            ? `linear-gradient(135deg, rgba(79, 195, 247, 0.3) 0%, rgba(79, 195, 247, 0.2) 50%, rgba(79, 195, 247, 0.1) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%)`,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: statusBarVisible
            ? '1px solid rgba(79, 195, 247, 0.5)'
            : '1px solid rgba(255,255,255,0.12)',
          position: 'relative',
          width: '100%',
          height: '48px',
          minHeight: '48px',
          maxHeight: '48px',
          borderRadius: '12px',
          boxShadow: statusBarVisible
            ? '0 4px 16px rgba(79, 195, 247, 0.3), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem',
          marginBottom: '0.125rem',
          flexShrink: 0,
          boxSizing: 'border-box',
          opacity: 1,
          transform: 'scale(1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.background = statusBarVisible
            ? `linear-gradient(135deg, rgba(79, 195, 247, 0.4) 0%, rgba(79, 195, 247, 0.3) 50%, rgba(79, 195, 247, 0.2) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)`;
          e.currentTarget.style.boxShadow = statusBarVisible
            ? '0 6px 20px rgba(79, 195, 247, 0.4), 0 3px 10px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.25)'
            : '0 4px 16px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.2)';
          e.currentTarget.style.borderColor = statusBarVisible ? 'rgba(79, 195, 247, 0.6)' : 'rgba(255,255,255,0.18)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.background = statusBarVisible
            ? `linear-gradient(135deg, rgba(79, 195, 247, 0.3) 0%, rgba(79, 195, 247, 0.2) 50%, rgba(79, 195, 247, 0.1) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%)`;
          e.currentTarget.style.boxShadow = statusBarVisible
            ? '0 4px 16px rgba(79, 195, 247, 0.3), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)';
          e.currentTarget.style.borderColor = statusBarVisible ? 'rgba(79, 195, 247, 0.5)' : 'rgba(255,255,255,0.12)';
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onToggleStatusBar) {
            onToggleStatusBar();
          }
        }}
      >
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #4fc3f7 0%, #4fc3f7dd 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(79, 195, 247, 0.4), 0 1px 3px rgba(79, 195, 247, 0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
          border: '1px solid rgba(79, 195, 247, 0.7)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <i
            className={statusBarVisible ? 'pi pi-eye' : 'pi pi-eye-slash'}
            style={{
              fontSize: '1rem',
              color: 'white',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
              position: 'relative',
              zIndex: 1
            }}
          />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79, 195, 247, 0.4) 0%, transparent 60%)',
            filter: 'blur(1px)',
            opacity: '0.6'
          }} />
        </div>
      </div>

      {/* Botón de Chat de IA */}
      <div
        title={showAIChat ? 'Ocultar chat de IA' : 'Mostrar chat de IA'}
        style={{
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          background: showAIChat
            ? `linear-gradient(135deg, rgba(138, 43, 226, 0.3) 0%, rgba(138, 43, 226, 0.2) 50%, rgba(138, 43, 226, 0.1) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%)`,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: showAIChat
            ? '1px solid rgba(138, 43, 226, 0.5)'
            : '1px solid rgba(255,255,255,0.12)',
          position: 'relative',
          width: '100%',
          height: '48px',
          minHeight: '48px',
          maxHeight: '48px',
          borderRadius: '12px',
          boxShadow: showAIChat
            ? '0 4px 16px rgba(138, 43, 226, 0.3), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem',
          marginBottom: '0.125rem',
          flexShrink: 0,
          boxSizing: 'border-box',
          opacity: 1,
          transform: 'scale(1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.background = showAIChat
            ? `linear-gradient(135deg, rgba(138, 43, 226, 0.4) 0%, rgba(138, 43, 226, 0.3) 50%, rgba(138, 43, 226, 0.2) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)`;
          e.currentTarget.style.boxShadow = showAIChat
            ? '0 6px 20px rgba(138, 43, 226, 0.4), 0 3px 10px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.25)'
            : '0 4px 16px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.2)';
          e.currentTarget.style.borderColor = showAIChat ? 'rgba(138, 43, 226, 0.6)' : 'rgba(255,255,255,0.18)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.background = showAIChat
            ? `linear-gradient(135deg, rgba(138, 43, 226, 0.3) 0%, rgba(138, 43, 226, 0.2) 50%, rgba(138, 43, 226, 0.1) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%)`;
          e.currentTarget.style.boxShadow = showAIChat
            ? '0 4px 16px rgba(138, 43, 226, 0.3), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)';
          e.currentTarget.style.borderColor = showAIChat ? 'rgba(138, 43, 226, 0.5)' : 'rgba(255,255,255,0.12)';
        }}
        onClick={onToggleAIChat}
      >
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #8A2BE2 0%, #8A2BE2dd 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(138, 43, 226, 0.4), 0 1px 3px rgba(138, 43, 226, 0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
          border: '1px solid rgba(138, 43, 226, 0.7)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <i
            className={showAIChat ? 'pi pi-times' : 'pi pi-comments'}
            style={{
              fontSize: '1rem',
              color: 'white',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
              position: 'relative',
              zIndex: 1
            }}
          />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(138, 43, 226, 0.4) 0%, transparent 60%)',
            filter: 'blur(1px)',
            opacity: '0.6'
          }} />
        </div>
      </div>

      {/* Separador */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        margin: '0.5rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '70%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 70%, transparent 100%)',
          borderRadius: '1px'
        }} />
      </div>

      {/* Terminales */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '0.125rem',
          position: 'relative',
          zIndex: 2,
          marginBottom: '0.25rem'
        }}>
        {availableTerminals.map((terminal, index) => 
          renderTerminalButton(terminal, index)
        )}
      </div>

      {/* Separador */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        margin: '0.5rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '70%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 70%, transparent 100%)',
          borderRadius: '1px'
        }} />
      </div>

      {/* Acciones principales */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '0.125rem',
        position: 'relative',
        zIndex: 2,
        opacity: (isToggling || isGlobalTransition) ? 0.7 : 1,
        transition: 'opacity 0.3s ease'
      }}>
        {((isToggling || isGlobalTransition) && cachedQuickActions.length > 0 ? cachedQuickActions : quickActionItems).map((action, index) => 
          renderActionButton(action, index)
        )}
        
        {/* Overlay de carga durante la transición */}
        {(isToggling || isGlobalTransition) && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            zIndex: 10
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '3px solid rgba(255,255,255,0.3)',
              borderTop: '3px solid #00BCD4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        )}
      </div>
    </div>
      </>
  );
};

export default QuickAccessSidebar;
