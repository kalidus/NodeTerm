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
  onToggleTerminalVisibility
}) => {
  // Estados para terminales detectados dinámicamente
  const [wslDistributions, setWSLDistributions] = useState([]);
  const [cygwinAvailable, setCygwinAvailable] = useState(false);
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
    
    checkTransitionState();
    
    // Verificar cada 100ms durante la transición
    const interval = setInterval(() => {
      checkTransitionState();
    }, 100);
    
    return () => clearInterval(interval);
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
  }, [wslDistributions, cygwinAvailable]);

  // Configurar acciones principales
  useEffect(() => {
    // Obtener el color primario del tema actual
    const primaryColor = currentTheme.colors?.buttonPrimary || currentTheme.colors?.primaryColor || '#2196f3';
    
    const actions = [
      {
        label: 'Configuración',
        icon: 'pi pi-cog',
        color: primaryColor,
        description: 'Ajustes y preferencias',
        action: onOpenSettings,
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
        label: 'Gestor de Contraseñas',
        icon: 'pi pi-key',
        color: primaryColor,
        description: 'Ver y gestionar passwords',
        action: handleOpenPasswords,
        badge: null
      },
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
        label: 'Favoritos',
        icon: 'pi pi-star',
        color: primaryColor,
        description: 'Acceso rápido',
        action: () => {},
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
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: `linear-gradient(135deg, 
            ${action.color}25 0%, 
            ${action.color}15 50%, 
            ${action.color}08 100%)`,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: `1.5px solid ${themeColors.cardBorder}`,
          position: 'relative',
          width: '100%',
          height: '44px',
          borderRadius: '9px',
          boxShadow: `0 4px 16px ${action.color}20, 
                      0 2px 8px rgba(0,0,0,0.1),
                      inset 0 1px 0 rgba(255,255,255,0.1)`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
          e.currentTarget.style.boxShadow = `0 6px 18px ${action.color}35, 
                                              0 2px 6px rgba(0,0,0,0.2),
                                              inset 0 1px 0 rgba(255,255,255,0.2)`;
          e.currentTarget.style.borderColor = `${themeColors.primaryColor}70`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = `0 3px 12px ${action.color}20, 
                                              0 1px 4px rgba(0,0,0,0.1),
                                              inset 0 1px 0 rgba(255,255,255,0.1)`;
          e.currentTarget.style.borderColor = `${themeColors.cardBorder}`;
        }}
        onClick={action.action}
      >
        {/* Icono de acción */}
        <div style={{ 
          width: '26px',
          height: '26px',
          borderRadius: '7px',
          background: `linear-gradient(145deg, 
            ${action.color}ee 0%, 
            ${action.color}cc 30%,
            ${action.color}aa 70%,
            ${action.color} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 3px 12px ${action.color}50, 
                      0 1px 4px ${action.color}30,
                      inset 0 1px 0 rgba(255,255,255,0.4),
                      inset 0 -1px 0 rgba(0,0,0,0.3),
                      inset 1px 0 0 rgba(255,255,255,0.2),
                      inset -1px 0 0 rgba(0,0,0,0.1)`,
          border: `1px solid ${action.color}aa`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <i 
            className={action.icon}
            style={{ 
              fontSize: '0.9rem',
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))',
              position: 'relative',
              zIndex: 1
            }}
          />
          
          {/* Efecto de resplandor */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${action.color}40 0%, transparent 70%)`,
            filter: 'blur(1px)',
            opacity: '0.8'
          }} />
        </div>
      </div>
    );
  };

  // Renderizar botón de terminal
  const renderTerminalButton = (terminal, index) => {
    return (
      <div
        key={index}
        title={terminal.label}
        style={{
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: `linear-gradient(135deg, 
            ${terminal.color}25 0%, 
            ${terminal.color}15 50%, 
            ${terminal.color}08 100%)`,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: `1.5px solid ${terminal.color}40`,
          position: 'relative',
          width: '100%',
          height: '44px',
          borderRadius: '9px',
          boxShadow: `0 4px 16px ${terminal.color}20, 
                      0 2px 8px rgba(0,0,0,0.1),
                      inset 0 1px 0 rgba(255,255,255,0.1)`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.boxShadow = `0 8px 24px ${terminal.color}35, 
                                              0 4px 12px rgba(0,0,0,0.2),
                                              inset 0 1px 0 rgba(255,255,255,0.2)`;
          e.currentTarget.style.borderColor = `${terminal.color}70`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = `0 4px 16px ${terminal.color}20, 
                                              0 2px 8px rgba(0,0,0,0.1),
                                              inset 0 1px 0 rgba(255,255,255,0.1)`;
          e.currentTarget.style.borderColor = `${terminal.color}40`;
        }}
        onClick={terminal.action}
      >
        {/* Icono mejorado */}
        <div style={{ 
          width: '26px',
          height: '26px',
          borderRadius: '7px',
          background: `linear-gradient(145deg, 
            ${terminal.color}ee 0%, 
            ${terminal.color}cc 30%,
            ${terminal.color}aa 70%,
            ${terminal.color} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 3px 12px ${terminal.color}50, 
                      0 1px 4px ${terminal.color}30,
                      inset 0 1px 0 rgba(255,255,255,0.4),
                      inset 0 -1px 0 rgba(0,0,0,0.3),
                      inset 1px 0 0 rgba(255,255,255,0.2),
                      inset -1px 0 0 rgba(0,0,0,0.1)`,
          border: `1px solid ${terminal.color}aa`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Efecto de brillo en el icono */}
          <div style={{
            position: 'absolute',
            top: '1px',
            left: '1px',
            right: '1px',
            height: '1px',
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '7px',
            filter: 'blur(1px)'
          }} />
          
          <i 
            className={terminal.icon}
            style={{ 
              fontSize: '0.9rem',
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))',
              position: 'relative',
              zIndex: 1
            }}
          />
          
          {/* Efecto de resplandor */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${terminal.color}40 0%, transparent 70%)`,
            filter: 'blur(1px)',
            opacity: '0.8'
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
        height: 'calc(100% - 120px)',
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
        boxSizing: 'border-box'
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
      
      {/* Botón de Terminal Local - mismo tamaño/estilo que los botones de terminal */}
      <div
        title={'Mostrar/ocultar terminal local'}
        style={{
          cursor: isToggling ? 'wait' : 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: isToggling 
            ? `linear-gradient(135deg, rgba(0,188,212,0.35) 0%, rgba(0,188,212,0.25) 50%, rgba(0,188,212,0.15) 100%)`
            : `linear-gradient(135deg, rgba(0,188,212,0.25) 0%, rgba(0,188,212,0.15) 50%, rgba(0,188,212,0.08) 100%)`,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: isToggling 
            ? '1.5px solid rgba(0,188,212,0.60)'
            : '1.5px solid rgba(0,188,212,0.40)',
          position: 'relative',
          width: '100%',
          height: '44px',
          minHeight: '44px',
          maxHeight: '44px',
          borderRadius: '9px',
          boxShadow: isToggling 
            ? '0 6px 20px rgba(0,188,212,0.30), 0 3px 10px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 4px 16px rgba(0,188,212,0.20), 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem',
          marginBottom: '0.25rem',
          flexShrink: 0,
          boxSizing: 'border-box',
          opacity: isToggling ? 0.8 : 1,
          transform: isToggling ? 'scale(0.98)' : 'scale(1)'
        }}
        onMouseEnter={(e) => {
          if (!isToggling) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,188,212,0.35), 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)';
            e.currentTarget.style.borderColor = 'rgba(0,188,212,0.70)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isToggling) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,188,212,0.20), 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(0,188,212,0.40)';
          }
        }}
        onClick={handleToggleTerminalVisibility}
      >
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '7px',
          background: 'linear-gradient(145deg, rgba(0,188,212,0.93) 0%, rgba(0,188,212,0.80) 30%, rgba(0,188,212,0.67) 70%, rgba(0,188,212,1) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 12px rgba(0,188,212,0.5), 0 1px 4px rgba(0,188,212,0.3), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.3), inset 1px 0 0 rgba(255,255,255,0.2), inset -1px 0 0 rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,188,212,0.67)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Icono con indicador de carga */}
          {isToggling ? (
            <i
              className="pi pi-spin pi-spinner"
              style={{
                fontSize: '0.9rem',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
                filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))',
                position: 'relative',
                zIndex: 1
              }}
            />
          ) : (
            <i
              className="pi pi-desktop"
              style={{
                fontSize: '0.9rem',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
                filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))',
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
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,188,212,0.40) 0%, transparent 70%)',
            filter: 'blur(1px)',
            opacity: '0.8'
          }} />
        </div>
      </div>

      {/* Separador debajo del botón de Terminal Local */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        margin: '0.4rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '100%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.3) 80%, transparent 100%)',
          borderRadius: '1px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }} />
      </div>

      {/* Terminales */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          position: 'relative',
          zIndex: 2,
          marginBottom: '0.3rem'
        }}>
        {availableTerminals.map((terminal, index) => 
          renderTerminalButton(terminal, index)
        )}
      </div>

      {/* Separador */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        margin: '0.4rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '100%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.3) 80%, transparent 100%)',
          borderRadius: '1px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }} />
      </div>

      {/* Acciones principales */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
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
