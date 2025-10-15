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
      const options = [
        { label: 'PowerShell', value: 'powershell', icon: 'pi pi-desktop', color: '#9C27B0' },
        { label: 'WSP', value: 'wsl', icon: 'pi pi-server', color: '#4fc3f7' },
        { label: 'Ubuntu', value: 'wsl-ubuntu', icon: 'pi pi-circle', color: '#E95420' },
        { label: 'Debian', value: 'wsl-debian', icon: 'pi pi-circle', color: '#A81D33' },
        { 
          label: cygwinAvailable ? 'Cygwin' : 'Cygwin', 
          value: 'cygwin', 
          icon: 'pi pi-code',
          color: '#00FF00'
        },
      ];
      
      // Agregar distribuciones WSL detectadas
      options.push(...wslDistributions.map(distro => ({
        label: distro.label,
        value: `wsl-${distro.name}`,
        icon: distro.icon,
        color: getColorForCategory(distro.category),
        distroInfo: distro
      })));
      
      options.forEach(option => {
        terminals.push({
          label: option.label,
          value: option.value,
          icon: option.icon,
          color: option.color,
          action: () => handleOpenTerminal(option.value, option.distroInfo),
          distroInfo: option.distroInfo
        });
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
          height: '60px',
          borderRadius: '12px',
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
        {/* Icono */}
        <div style={{ 
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          background: `linear-gradient(135deg, 
            ${terminal.color}dd 0%, 
            ${terminal.color} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 12px ${terminal.color}50, 
                      inset 0 1px 0 rgba(255,255,255,0.3),
                      inset 0 -1px 0 rgba(0,0,0,0.2)`,
          border: `1px solid ${terminal.color}80`
        }}>
          <i 
            className={terminal.icon}
            style={{ 
              fontSize: '1.2rem',
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
            }}
          />
        </div>
        
        {/* Texto */}
        <span style={{ 
          color: 'var(--text-color)',
          fontSize: '0.6rem',
          fontWeight: '600',
          textAlign: 'center',
          lineHeight: '1.2',
          letterSpacing: '0.02rem',
          textShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }}>
          {terminal.label}
        </span>
      </div>
    );
  };

  return (
    <div style={{ 
      width: '120px',
      height: '100%',
      background: 'rgba(16, 20, 28, 0.8)',
      backdropFilter: 'blur(10px) saturate(140%)',
      borderRight: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem 0.75rem',
      gap: '0.5rem'
    }}>
      {/* Título */}
      <div style={{
        textAlign: 'center',
        marginBottom: '0.5rem'
      }}>
        <h3 style={{ 
          margin: 0,
          color: 'var(--text-color)',
          fontSize: '0.7rem',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.05rem'
        }}>
          Accesos Rápidos
        </h3>
      </div>

      {/* Espacio vacío superior */}
      <div style={{ 
        height: '40px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed rgba(255,255,255,0.1)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-color-secondary)',
        fontSize: '0.5rem'
      }}>
        {/* Placeholder vacío */}
      </div>

      {/* Terminales */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        flex: 1
      }}>
        {availableTerminals.slice(0, 5).map((terminal, index) => 
          renderTerminalButton(terminal, index)
        )}
      </div>
    </div>
  );
};

export default QuickAccessSidebar;
