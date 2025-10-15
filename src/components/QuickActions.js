import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';

const QuickActions = ({ 
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

  // Detectar distribuciones WSL usando el backend (EXACTA MISMA LÓGICA QUE TabbedTerminal.js)
  useEffect(() => {
    const detectWSLDistributions = async () => {
      try {
        if (window.electron && window.electron.ipcRenderer) {
          const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
          console.log('✅ Distribuciones WSL detectadas:', distributions);
          
          // Verificar que recibimos un array válido
          if (Array.isArray(distributions)) {
            setWSLDistributions(distributions);
            distributions.forEach(distro => console.log(`  - ${distro.label} (${distro.category})`));
          } else {
            console.log('⚠️ Respuesta no es un array, fallback a array vacío');
            setWSLDistributions([]);
          }
        } else {
          console.log('❌ No hay acceso a electron IPC');
          setWSLDistributions([]);
        }
      } catch (error) {
        console.error('❌ Error en detección de distribuciones WSL:', error);
        setWSLDistributions([]);
      }
    };
    
    detectWSLDistributions();
  }, []);

  // Detectar disponibilidad de Cygwin embebido (EXACTA MISMA LÓGICA QUE TabbedTerminal.js)
  useEffect(() => {
    const detectCygwin = async () => {
      if (window.electron && window.electron.platform === 'win32') {
        try {
          // Usar window.electronAPI.invoke que definimos en preload.js
          const result = await window.electronAPI.invoke('cygwin:detect');
          if (result && typeof result.available === 'boolean') {
            setCygwinAvailable(result.available);
            console.log('✅ Cygwin detectado:', result.available);
          } else {
            console.warn('⚠️ Cygwin: Respuesta inválida');
            setCygwinAvailable(false);
          }
        } catch (error) {
          console.error('❌ Error detectando Cygwin:', error);
          setCygwinAvailable(false);
        }
      } else {
        setCygwinAvailable(false);
      }
    };
    
    detectCygwin();
  }, []);

  // Generar lista de terminales disponibles (EXACTA MISMA LÓGICA QUE TabbedTerminal.js)
  useEffect(() => {
    const platform = window.electron?.platform || 'unknown';
    const terminals = [];

    console.log('🔧 Generando terminales para plataforma:', platform);
    console.log('🔧 WSL Distributions:', wslDistributions);
    console.log('🔧 Cygwin available:', cygwinAvailable);

    if (platform === 'win32') {
      // En Windows: mostrar PowerShell, WSL, Cygwin y cada distribución WSL detectada
      const options = [
        { label: 'PowerShell', value: 'powershell', icon: 'pi pi-desktop' },
        { label: 'WSL', value: 'wsl', icon: 'pi pi-server' },
        // Cygwin siempre visible en Windows (se instalará bajo demanda si no existe)
        { 
          label: cygwinAvailable ? 'Cygwin' : 'Cygwin (instalar)', 
          value: 'cygwin', 
          icon: 'pi pi-code',
          color: '#00FF00'
        },
      ];
      
      // Agregar cada distribución WSL como opción separada
      options.push(...wslDistributions.map(distro => ({
        label: distro.label,
        value: `wsl-${distro.name}`,
        icon: distro.icon,
        executable: distro.executable,
        category: distro.category,
        distroName: distro.name,
        distroInfo: distro
      })));
      
      // Convertir a formato de terminales para QuickActions
      options.forEach(option => {
        terminals.push({
          label: option.label,
          value: option.value,
          icon: option.icon,
          color: getColorForCategory(option.category) || '#4fc3f7',
          action: () => handleOpenTerminal(option.value, option.distroInfo),
          distroInfo: option.distroInfo
        });
      });
    } else if (platform === 'linux' || platform === 'darwin') {
      // En Linux/macOS: mostrar terminal nativo
      terminals.push({
        label: 'Terminal',
        value: 'linux-terminal',
        icon: 'pi pi-desktop',
        color: '#4fc3f7',
        action: () => handleOpenTerminal('linux-terminal')
      });
    } else {
      // Fallback para otros sistemas
      terminals.push({
        label: 'Terminal',
        value: 'powershell',
        icon: 'pi pi-desktop',
        color: '#4fc3f7',
        action: () => handleOpenTerminal('powershell')
      });
    }

    console.log('🎯 Lista final de terminales:', terminals);
    setAvailableTerminals(terminals);
  }, [wslDistributions, cygwinAvailable]);

  // Función para obtener colores según la categoría de distribución
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

  // Segunda fila: Acciones principales
  const quickActionItems = [
    {
      label: 'Nueva Conexión SSH',
      icon: 'pi pi-plus',
      color: '#2196F3',
      description: 'Crear nueva conexión SSH',
      action: onCreateSSHConnection,
      badge: null
    },
    {
      label: 'Nueva Carpeta',
      icon: 'pi pi-folder-plus',
      color: '#4CAF50',
      description: 'Organizar conexiones',
      action: onCreateFolder,
      badge: foldersCount
    },
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

  if (onOpenFileExplorer) {
    quickActionItems.splice(2, 0, {
      label: 'Explorador',
      icon: 'pi pi-folder-open',
      color: '#FF9800',
      description: 'Explorar archivos',
      action: onOpenFileExplorer,
      badge: null
    });
  }

  // Función helper para renderizar cards de TERMINALES (Glassmorphism)
  const renderTerminalCard = (item, index) => {
    const heights = ['55px', '58px', '60px', '57px', '59px'];
    const randomHeight = heights[index % heights.length];
    
    return (
      <div
        key={index}
        style={{ 
          cursor: 'pointer',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          background: `linear-gradient(135deg, 
            ${item.color}25 0%, 
            ${item.color}15 50%, 
            ${item.color}08 100%)`,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: `1.5px solid ${item.color}40`,
          position: 'relative',
          minHeight: randomHeight,
          width: '100%',
          borderRadius: '16px',
          boxShadow: `0 8px 32px ${item.color}20, 
                      0 2px 8px rgba(0,0,0,0.1),
                      inset 0 1px 0 rgba(255,255,255,0.1)`,
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px) scale(1.03)';
          e.currentTarget.style.boxShadow = `0 15px 45px ${item.color}35, 
                                              0 5px 15px rgba(0,0,0,0.2),
                                              inset 0 1px 0 rgba(255,255,255,0.2)`;
          e.currentTarget.style.borderColor = `${item.color}70`;
          e.currentTarget.style.background = `linear-gradient(135deg, 
            ${item.color}35 0%, 
            ${item.color}25 50%, 
            ${item.color}15 100%)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = `0 8px 32px ${item.color}20, 
                                              0 2px 8px rgba(0,0,0,0.1),
                                              inset 0 1px 0 rgba(255,255,255,0.1)`;
          e.currentTarget.style.borderColor = `${item.color}40`;
          e.currentTarget.style.background = `linear-gradient(135deg, 
            ${item.color}25 0%, 
            ${item.color}15 50%, 
            ${item.color}08 100%)`;
        }}
        onClick={item.action}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '2px',
          background: `linear-gradient(90deg, 
            transparent, 
            rgba(255,255,255,0.6), 
            transparent)`,
          filter: 'blur(1px)'
        }} />
        
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${item.color}20, transparent)`,
          filter: 'blur(10px)'
        }} />
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.5rem 0.3rem',
          height: '100%',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ 
            width: '28px',
            height: '28px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, 
              ${item.color}dd 0%, 
              ${item.color} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.15rem',
            boxShadow: `0 4px 15px ${item.color}50, 
                        inset 0 1px 0 rgba(255,255,255,0.3),
                        inset 0 -1px 0 rgba(0,0,0,0.2)`,
            position: 'relative',
            border: `1px solid ${item.color}80`
          }}>
            <i 
              className={item.icon}
              style={{ 
                fontSize: '1rem',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
              }}
            />
            <div style={{
              position: 'absolute',
              top: '3px',
              left: '3px',
              right: '3px',
              height: '2px',
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '10px',
              filter: 'blur(1px)'
            }} />
          </div>
          
          <h4 style={{ 
            margin: 0,
            color: 'var(--text-color)',
            fontSize: '0.5rem',
            fontWeight: '600',
            textAlign: 'center',
            lineHeight: '1.2',
            letterSpacing: '0.03rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%',
            textShadow: '0 1px 3px rgba(0,0,0,0.2)',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
          }}>
            {item.label}
          </h4>
        </div>
        
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at center, ${item.color}15, transparent)`,
          opacity: 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none'
        }} 
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0';
        }}
        />
      </div>
    );
  };

  // Función helper para renderizar cards de ACCIONES PRINCIPALES (Estilo diferente)
  const renderActionCard = (item, index) => {
    return (
      <div
        key={index}
        style={{ 
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: `linear-gradient(145deg, 
            rgba(255,255,255,0.05) 0%, 
            rgba(255,255,255,0.02) 100%)`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid rgba(255,255,255,0.1)`,
          position: 'relative',
          minHeight: '70px',
          width: '100%',
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = `0 8px 24px ${item.color}25, 0 4px 12px rgba(0,0,0,0.3)`;
          e.currentTarget.style.borderColor = `${item.color}50`;
          e.currentTarget.style.background = `linear-gradient(145deg, 
            ${item.color}15 0%, 
            ${item.color}08 100%)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.background = `linear-gradient(145deg, 
            rgba(255,255,255,0.05) 0%, 
            rgba(255,255,255,0.02) 100%)`;
        }}
        onClick={item.action}
      >
        {/* Badge si existe */}
        {item.badge !== null && (
          <Badge 
            value={item.badge} 
            style={{ 
              position: 'absolute',
              top: '0.4rem',
              right: '0.4rem',
              fontSize: '0.5rem',
              minWidth: '0.9rem',
              height: '0.9rem',
              lineHeight: '0.9rem',
              background: `linear-gradient(135deg, ${item.color}, ${item.color}dd)`,
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: `0 2px 8px ${item.color}40`,
              fontWeight: '700'
            }}
          />
        )}
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.6rem 0.4rem',
          height: '100%',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Icono estilo flat con sombra */}
          <div style={{ 
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: `${item.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.1rem',
            boxShadow: `0 4px 12px ${item.color}40, 0 2px 4px rgba(0,0,0,0.2)`,
            position: 'relative'
          }}>
            <i 
              className={item.icon}
              style={{ 
                fontSize: '1.1rem',
                color: 'white',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)'
              }}
            />
          </div>
          
          <h4 style={{ 
            margin: 0,
            color: 'var(--text-color)',
            fontSize: '0.5rem',
            fontWeight: '600',
            textAlign: 'center',
            lineHeight: '1.2',
            letterSpacing: '0.02rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            {item.label}
          </h4>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '20px',
      padding: '20px',
      height: '100%',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      minHeight: '400px',
      margin: '0',
      width: '100%'
    }}>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        marginBottom: '10px'
      }}>
        <i className="pi pi-bolt" style={{ color: '#FFD700', fontSize: '1.2rem' }} />
        <h3 style={{ 
          margin: 0, 
          color: 'white', 
          fontSize: '1rem',
          fontWeight: '600'
        }}>
          ACCESOS RÁPIDOS
        </h3>
      </div>
      
      {/* Terminales locales */}
      <div>
        <h4 style={{ 
          margin: '0 0 10px 0', 
          color: 'white',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '500'
        }}>
          <i className="pi pi-terminal" style={{ color: '#4fc3f7' }} />
          Terminales Locales
        </h4>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px',
          width: '100%'
        }}>
          {availableTerminals.map((item, index) => renderTerminalCard(item, index))}
        </div>
      </div>

      {/* Acciones principales */}
      <div>
        <h4 style={{ 
          margin: '0 0 10px 0', 
          color: 'white',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '500'
        }}>
          <i className="pi pi-cog" style={{ color: '#9c27b0' }} />
          Acciones Principales
        </h4>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px',
          width: '100%'
        }}>
          {quickActionItems.map((item, index) => renderActionCard(item, index))}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;