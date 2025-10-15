import React, { useState, useEffect } from 'react';

const QuickAccessSidebar = ({ 
  onCreateSSHConnection, 
  onCreateFolder,
  onOpenFileExplorer,
  onOpenSettings,
  sshConnectionsCount = 0,
  foldersCount = 0 
}) => {
  // Estados para terminales detectados dinámicamente
  const [wslDistributions, setWSLDistributions] = useState([]);
  const [cygwinAvailable, setCygwinAvailable] = useState(false);
  const [availableTerminals, setAvailableTerminals] = useState([]);
  const [quickActionItems, setQuickActionItems] = useState([]);

  // Handlers for actions that don't come from props
  const handleOpenPasswords = () => {
    try {
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
        icon: 'pi pi-desktop',
        color: '#9C27B0',
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
    const actions = [
      {
        label: 'Configuración',
        icon: 'pi pi-cog',
        color: '#9C27B0',
        description: 'Ajustes y preferencias',
        action: onOpenSettings,
        badge: null
      },
      {
        label: 'Auditoría Global',
        icon: 'pi pi-video',
        color: '#EF5350',
        description: 'Ver grabaciones y auditoría',
        action: handleOpenAuditGlobal,
        badge: null
      },
      {
        label: 'Gestor de Contraseñas',
        icon: 'pi pi-key',
        color: '#FFC107',
        description: 'Ver y gestionar passwords',
        action: handleOpenPasswords,
        badge: null
      },
      {
        label: 'Historial',
        icon: 'pi pi-history',
        color: '#795548',
        description: 'Conexiones recientes',
        action: () => {},
        badge: null
      },
      {
        label: 'Favoritos',
        icon: 'pi pi-star',
        color: '#FFD700',
        description: 'Acceso rápido',
        action: () => {},
        badge: null
      }
    ];

    setQuickActionItems(actions);
  }, [onOpenSettings]);

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
        style={{
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: `linear-gradient(135deg, 
            ${action.color}25 0%, 
            ${action.color}15 50%, 
            ${action.color}08 100%)`,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: `1.5px solid ${action.color}40`,
          position: 'relative',
          width: '100%',
          height: '40px',
          borderRadius: '8px',
          boxShadow: `0 3px 12px ${action.color}20, 
                      0 1px 4px rgba(0,0,0,0.1),
                      inset 0 1px 0 rgba(255,255,255,0.1)`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.2rem',
          padding: '0.4rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
          e.currentTarget.style.boxShadow = `0 6px 18px ${action.color}35, 
                                              0 2px 6px rgba(0,0,0,0.2),
                                              inset 0 1px 0 rgba(255,255,255,0.2)`;
          e.currentTarget.style.borderColor = `${action.color}70`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = `0 3px 12px ${action.color}20, 
                                              0 1px 4px rgba(0,0,0,0.1),
                                              inset 0 1px 0 rgba(255,255,255,0.1)`;
          e.currentTarget.style.borderColor = `${action.color}40`;
        }}
        onClick={action.action}
      >
        {/* Icono de acción */}
        <div style={{ 
          width: '20px',
          height: '20px',
          borderRadius: '5px',
          background: `linear-gradient(145deg, 
            ${action.color}ee 0%, 
            ${action.color}cc 30%,
            ${action.color}aa 70%,
            ${action.color} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 2px 8px ${action.color}50, 
                      0 1px 2px ${action.color}30,
                      inset 0 1px 0 rgba(255,255,255,0.4),
                      inset 0 -1px 0 rgba(0,0,0,0.3)`,
          border: `1px solid ${action.color}aa`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <i 
            className={action.icon}
            style={{ 
              fontSize: '0.7rem',
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
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
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${action.color}40 0%, transparent 70%)`,
            filter: 'blur(1px)',
            opacity: '0.8'
          }} />
        </div>
        
        {/* Texto de acción */}
        <span style={{ 
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: '0.35rem',
          fontWeight: '600',
          textAlign: 'center',
          lineHeight: '1.0',
          letterSpacing: '0.005rem',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)'
        }}>
          {action.label}
        </span>
      </div>
    );
  };

  // Renderizar botón de terminal
  const renderTerminalButton = (terminal, index) => {
    return (
      <div
        key={index}
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.25rem',
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
        
        {/* Texto mejorado */}
        <span style={{ 
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: '0.45rem',
          fontWeight: '600',
          textAlign: 'center',
          lineHeight: '1.0',
          letterSpacing: '0.005rem',
          textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)'
        }}>
          {terminal.label}
        </span>
      </div>
    );
  };

  return (
      <div style={{
        width: '60px',
        height: '100%',
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
      
      {/* Icono de título */}
      <div style={{
        textAlign: 'center',
        marginBottom: '0.3rem',
        position: 'relative',
        zIndex: 2,
        padding: '6px',
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <i 
          className="pi pi-bolt"
          style={{ 
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.9)',
            textShadow: '0 2px 4px rgba(0,0,0,0.4)',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
          }}
        />
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
        zIndex: 2
      }}>
        {quickActionItems.map((action, index) => 
          renderActionButton(action, index)
        )}
      </div>
    </div>
  );
};

export default QuickAccessSidebar;
